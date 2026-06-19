// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Azure Maps rebuild of ~/interactive-building-labeler/index.html for the
// building labeling workflow. Loads the per-building MOSAIKS embeddings
// (footprints + f_* features) for an embedding model, lets the user click
// buildings to label them (Intact / Damaged / Cloudy), trains an in-browser
// model on the labeled features, and predicts damage for every building.
//
// On Save it persists BOTH the manual labels (PutBuildingValidation) and the
// model's per-building predictions (PutBuildingPredictions) so the existing
// Validation and Assessment reports work unchanged.
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChoiceGroup,
  DefaultButton,
  PrimaryButton,
  Text,
  Toggle,
} from "@fluentui/react";
import { Protocol } from "pmtiles";
import { apiGet, apiPut } from "../../util/api";
import {
  getAzureMapsAuthOptions,
  isAzureMapsPlaceholder,
} from "../../util/azureMapsAuth";
import { AppContext } from "../../AppContext.jsx";
import { loadImagery } from "../LabelingTool/LabelingToolHelper.js";
import {
  CLASS_CLOUDY,
  CLASS_DAMAGED,
  CLASS_INTACT,
  detectFeatureKeys,
  extractFeatureVector,
  holdoutMetricsDamaged,
  isValidVector,
  predictClasses,
  trainAndPredictBatched,
} from "./interactiveModel.js";
import { getGpu } from "./gpuLogreg.js";

// Register the pmtiles protocol once at module load. After this, any
// VectorTileSource configured with `tiles: ["pmtiles://<url>/{z}/{x}/{y}"]`
// will route through pmtiles' byte-range-aware reader. Atlas v3 exposes the
// Mapbox-GL-style `atlas.addProtocol` hook, so we don't need a server-side
// tile proxy.
if (typeof window !== "undefined" && window.atlas) {
  const _pmtilesProtocol = new Protocol();
  // Idempotent — re-registering the same protocol name is a no-op in atlas.
  window.atlas.addProtocol("pmtiles", _pmtilesProtocol.tile.bind(_pmtilesProtocol));
}

// PMTiles layer name as emitted by tippecanoe (see embed_buildings.py:557
// `-l buildings`). VectorTileSource queries reference this string.
const PMTILES_SOURCE_LAYER = "buildings";

// Class colors (match index.html). Index = class number.
const CLASS_COLORS = ["#107C10", "#C50F1F", "#5B5FC7"]; // intact, damaged, cloudy
const UNLABELED_COLOR = "#BDBDBD";

// In-browser class -> validation-report vocabulary (Damaged/NotDamaged/Unknown).
const CLASS_TO_VALIDATION = {
  [CLASS_INTACT]: "NotDamaged",
  [CLASS_DAMAGED]: "Damaged",
  [CLASS_CLOUDY]: "Unknown",
};
const VALIDATION_TO_CLASS = {
  NotDamaged: CLASS_INTACT,
  Damaged: CLASS_DAMAGED,
  Unknown: CLASS_CLOUDY,
};

const CLASS_OPTIONS = [
  { key: String(CLASS_INTACT), text: "Intact" },
  { key: String(CLASS_DAMAGED), text: "Damaged" },
  { key: String(CLASS_CLOUDY), text: "Cloudy" },
];

const MIN_PER_CLASS = 3;

const InteractiveLabeler = () => {
  const { projectId, imageLayerId, modelId } = useParams();
  const navigate = useNavigate();
  const { setIsLoading, setDialog, setAppHeaderRightButtons } =
    useContext(AppContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const vectorTileSourceRef = useRef(null);
  const fillLayerRef = useRef(null);
  const preImageryRef = useRef(null);
  const postImageryRef = useRef(null);
  const featureKeysRef = useRef(null);
  // labeledMap: id -> { label, features }; predictionsMap: id -> class.
  // Both are model state, NOT render state — they survive a tile unload/
  // reload cycle because they live client-side and get pushed back onto
  // the layer via setFeatureState whenever needed.
  const labeledMapRef = useRef({});
  const predictionsMapRef = useRef({});
  // Features the user has actually loaded by panning/zooming over their
  // tiles. Keyed by building id; values are { properties, geometry }.
  // Hydrated lazily on `moveend` from the VectorTileSource — never
  // evicted within a session, so labels/predictions stay correlatable.
  // Save (handleSave) opens a separate full-coverage path that hydrates
  // the rest from the model's GeoJSON before writing.
  const loadedFeaturesRef = useRef(new Map());
  // Tracks which (z,x,y) tiles we've already hydrated so the moveend
  // listener doesn't redo the same querySourceFeatures+merge work
  // every time the user pans within a single tile.
  const hydratedTilesRef = useRef(new Set());

  const boxRef = useRef(null); // box-select rectangle div
  const boxCleanupRef = useRef(null); // detaches document-level drag listeners
  const trainBusyRef = useRef(false); // a train/predict run is in flight
  const trainPendingRef = useRef(false); // a newer run was requested while busy

  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedClass, setSelectedClass] = useState(CLASS_DAMAGED);
  const [viewMode, setViewMode] = useState("label"); // "label" | "predict"
  const [counts, setCounts] = useState({ 0: 0, 1: 0, 2: 0 });
  const [predictedCount, setPredictedCount] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState("");
  const [mapInfo, setMapInfo] = useState({ lat: 0, lon: 0, zoom: 0 });
  const [buildingCount, setBuildingCount] = useState(0);
  const [backend, setBackend] = useState(null); // "WebGPU" | "CPU"

  // Tracks the active full-coverage Save: phase + current/total counters
  // for the progress UI. Null means no save is in progress.
  const [saveProgress, setSaveProgress] = useState(null);
  // {phase: 'download'|'train'|'predict'|'save'|'done'|'cancelled',
  //  current?: number, total?: number, message?: string}
  const saveAbortRef = useRef({ cancelled: false });
  const selectedClassRef = useRef(selectedClass);
  useEffect(() => {
    selectedClassRef.current = selectedClass;
  }, [selectedClass]);
  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Detect the compute backend up-front so the panel shows WebGPU vs CPU.
  useEffect(() => {
    let alive = true;
    getGpu().then((gpu) => {
      if (alive) setBackend(gpu ? "WebGPU" : "CPU");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!window.atlas) return;
      setIsLoading(true, "Loading Interactive Labeler");
      try {
        await createMap();
        setIsMapReady(true);
      } catch (e) {
        console.error("Error initializing interactive labeler:", e);
        setDialog("Error", "Failed to load the interactive labeler.");
      } finally {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      setAppHeaderRightButtons([]);
      if (boxCleanupRef.current) boxCleanupRef.current();
      if (mapRef.current) {
        mapRef.current.dispose();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createMap() {
    let layerData = null;
    try {
      layerData = await apiGet(
        `GetLayerLabelingToolData?projectId=${projectId}&imageLayerId=${imageLayerId}`
      );
    } catch {
      // Imagery is optional — labeling works without it.
    }

    // Fetch the model to get pmtilesUrl. Models for the layer are returned
    // by GetLayerModelsDetails; pick ours by modelId. The pmtilesUrl is
    // populated by the embedding workflow (embed_buildings.py:550-567).
    let pmtilesUrl = "";
    try {
      const models = await apiGet(
        `GetLayerModelsDetails?projectId=${projectId}&imageLayerId=${imageLayerId}`
      );
      const model = (models || []).find(
        (m) => String(m.modelId) === String(modelId)
      );
      pmtilesUrl = model?.pmtilesUrl || "";
    } catch (e) {
      console.warn("Could not fetch model pmtilesUrl:", e);
    }
    if (!pmtilesUrl) {
      throw new Error(
        "No PMTiles available for this model — embedding workflow has not produced building tiles."
      );
    }

    // Restore this model's previously-saved interactive labels (separate from
    // the Building Validation store) so reopening the labeler resumes work.
    // Note: labels are stored keyed by overture id, but we apply them lazily
    // as tiles load (see hydrateFromVisibleTiles below) — at restore time we
    // only have the label content, not the feature vector that goes with it.
    // We stash the raw label map for the hydrator to consult per-tile.
    let savedLabels = {};
    try {
      const saved = await apiGet(
        `GetInteractiveLabels?projectId=${projectId}&modelId=${modelId}`
      );
      savedLabels = saved?.labels || {};
    } catch {
      // No saved labels yet — start fresh.
    }

    const map = new window.atlas.Map(mapContainerRef.current, {
      center: [0, 0],
      zoom: 3,
      maxPitch: 0,
      pitch: 0,
      style: isAzureMapsPlaceholder ? "blank" : "satellite",
      language: "en-US",
      authOptions: getAzureMapsAuthOptions(),
    });

    map.events.add("ready", () => {
      map.setUserInteraction({
        dragRotateInteraction: false,
        scrollZoomInteraction: true,
        pinchZoomInteraction: true,
        pinchRotateInteraction: false,
      });
      map.controls.add(new window.atlas.control.ZoomControl(), {
        position: "bottom-left",
      });

      if (layerData?.imagery?.preEventTileUrl) {
        loadImagery(
          layerData.imagery.preEventTileUrl,
          map,
          preImageryRef,
          "preEventImageryLayer",
          false
        );
      }
      if (layerData?.imagery?.postEventTileUrl) {
        loadImagery(
          layerData.imagery.postEventTileUrl,
          map,
          postImageryRef,
          "postEventImageryLayer",
          true
        );
      }

      // Building footprints come from a PMTiles archive built by the
      // embedding workflow (see embed_buildings.py:550-567 tippecanoe).
      // f_* feature columns are baked into the tiles — they're read out
      // on demand from the loaded source rather than downloaded as one
      // big GeoJSON. Promote `id` so per-feature setFeatureState calls
      // can address buildings by their stable id.
      const source = new window.atlas.source.VectorTileSource(null, {
        tiles: [`pmtiles://${pmtilesUrl}/{z}/{x}/{y}`],
        promoteId: "id",
        // Max zoom that tippecanoe wrote (we used `-zg` which auto-picks).
        // Atlas overzooms above this so we don't need to set it precisely.
      });
      map.sources.add(source);
      vectorTileSourceRef.current = source;

      const fillLayer = new window.atlas.layer.PolygonLayer(
        source,
        "embeddingFill",
        {
          // The source is the PMTiles archive's named layer ('buildings');
          // we read render state out of feature-state, which is per-id
          // client-side state pushed via setFeatureState.
          sourceLayer: PMTILES_SOURCE_LAYER,
          fillColor: fillColorExpr(viewModeRef.current),
          fillOpacity: 0.5,
        }
      );
      map.layers.add(fillLayer);
      fillLayerRef.current = fillLayer;

      map.layers.add(
        new window.atlas.layer.LineLayer(source, "embeddingOutline", {
          sourceLayer: PMTILES_SOURCE_LAYER,
          strokeColor: "#1a5276",
          strokeWidth: 1,
        })
      );

      map.events.add("click", fillLayer, (e) => {
        // Ctrl/Cmd is the box-select modifier — don't also single-label.
        if (e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
          return;
        }
        const id = clickedBuildingId(e);
        if (id != null) labelBuilding(id, selectedClassRef.current);
      });
      map.events.add("contextmenu", fillLayer, (e) => {
        const id = clickedBuildingId(e);
        if (id != null) clearLabel(id);
        return false;
      });
      map.getCanvasContainer().style.cursor = "pointer";
      setupBoxSelect(map);

      // Hydrate loadedFeaturesRef as the user pans/zooms — this is what
      // makes the in-browser model "see" buildings the user has looked at.
      // Also: pushes any restored labels back as feature-state so they
      // render the moment their tile loads.
      const hydrate = () => hydrateFromVisibleTiles(map, savedLabels);
      map.events.add("moveend", hydrate);
      map.events.add("sourcedata", (e) => {
        // sourcedata fires whenever a tile finishes loading. Atlas may
        // pass an unknown event shape; guard on the source id.
        if (e && e.sourceId && source.getId() === e.sourceId && e.isSourceLoaded) {
          hydrate();
        }
      });

      // Info bar: keep lat/lon/zoom in sync as the camera moves.
      const syncInfo = () => {
        const cam = map.getCamera();
        const center = cam.center || [0, 0];
        setMapInfo({
          lon: center[0],
          lat: center[1],
          zoom: cam.zoom || 0,
        });
      };
      map.events.add("move", syncInfo);
      syncInfo();
    });

    mapRef.current = map;
  }

  // Read currently-rendered features from the PMTiles source, merge new
  // ones into loadedFeaturesRef, and re-apply any restored labels as
  // feature-state so labels show as soon as their tile is on screen.
  function hydrateFromVisibleTiles(map, savedLabels) {
    const source = vectorTileSourceRef.current;
    if (!source) return;
    let features;
    try {
      features = source.getShapes
        ? source.getShapes()
        : map.layers.getRenderedShapes(fillLayerRef.current);
    } catch {
      features = [];
    }
    // Atlas v3 returns either Shape objects or raw GeoJSON features
    // depending on render path; normalize.
    const loaded = loadedFeaturesRef.current;
    const labelMap = labeledMapRef.current;
    let newCount = 0;
    for (const f of features) {
      const props =
        typeof f.getProperties === "function" ? f.getProperties() : f.properties;
      const geom =
        typeof f.getGeometry === "function" ? f.getGeometry() : f.geometry;
      const id = props?.id;
      if (id == null || loaded.has(id)) continue;

      // Lazy detect feature keys on the first hydrated feature.
      if (!featureKeysRef.current) {
        featureKeysRef.current = detectFeatureKeys(props);
      }
      loaded.set(id, { properties: props, geometry: geom });
      newCount++;

      // Restore any saved label for this newly-visible building.
      // Saved labels are keyed by overture id, but the source-of-truth
      // labelMap is keyed by the same id field surfaced on properties.
      const overtureId = props.overture_id ?? id;
      const saved = savedLabels[overtureId];
      if (saved && !labelMap[id]) {
        const cls = VALIDATION_TO_CLASS[saved.label];
        if (cls != null) {
          const vec = extractFeatureVector(props, featureKeysRef.current);
          labelMap[id] = { label: cls, features: vec };
          setFeatureLabel(id, cls);
        }
      }
      // Reapply any in-session label/prediction whose tile just reloaded.
      if (labelMap[id]) setFeatureLabel(id, labelMap[id].label);
      const pred = predictionsMapRef.current[id];
      if (pred != null) setFeaturePred(id, pred);
    }
    if (newCount > 0) {
      setBuildingCount(loaded.size);
      refreshCounts();
    }
  }

  // ── Ctrl+drag box-select labeling ─────────────────────────────────────────
  function setupBoxSelect(map) {
    const canvas = map.getCanvasContainer();
    let origin = null;

    const onDown = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      map.setUserInteraction({ dragPanInteraction: false });
      const rect = canvas.getBoundingClientRect();
      origin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const box = boxRef.current;
      if (box) {
        box.style.display = "block";
        box.style.left = origin.x + "px";
        box.style.top = origin.y + "px";
        box.style.width = "0px";
        box.style.height = "0px";
      }
    };

    const onMove = (e) => {
      if (!origin) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const box = boxRef.current;
      if (box) {
        box.style.left = Math.min(origin.x, x) + "px";
        box.style.top = Math.min(origin.y, y) + "px";
        box.style.width = Math.abs(x - origin.x) + "px";
        box.style.height = Math.abs(y - origin.y) + "px";
      }
    };

    const onUp = (e) => {
      if (!origin) return;
      const rect = canvas.getBoundingClientRect();
      const x1 = Math.min(origin.x, e.clientX - rect.left);
      const y1 = Math.min(origin.y, e.clientY - rect.top);
      const x2 = Math.max(origin.x, e.clientX - rect.left);
      const y2 = Math.max(origin.y, e.clientY - rect.top);
      origin = null;
      if (boxRef.current) boxRef.current.style.display = "none";
      map.setUserInteraction({ dragPanInteraction: true });
      if (x2 - x1 < 4 || y2 - y1 < 4) return;

      // Convert the screen box corners to geographic positions; with rotation
      // disabled the screen-axis box maps to a lng/lat bbox.
      const corners = map.pixelsToPositions([
        [x1, y1],
        [x2, y2],
      ]);
      const lons = corners.map((c) => c[0]);
      const lats = corners.map((c) => c[1]);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      const ids = [];
      for (const f of loadedFeaturesRef.current.values()) {
        const ctr = extractCentroid(f);
        if (!ctr) continue;
        if (
          ctr[0] >= minLon &&
          ctr[0] <= maxLon &&
          ctr[1] >= minLat &&
          ctr[1] <= maxLat
        ) {
          ids.push(f.properties?.id);
        }
      }
      labelBuildings(ids, selectedClassRef.current);
    };

    canvas.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    boxCleanupRef.current = () => {
      canvas.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }

  // ── Paint expressions ─────────────────────────────────────────────────────
  // We render off feature-state (per-id client-side state) rather than off
  // feature properties baked into the tile. setFeatureState lets us flip
  // any building's render state without re-loading or rebuilding the
  // source — exactly the right semantics for an interactive labeler.
  // The expression returns -1 (a sentinel) when no _label/_pred is set
  // for a feature, and the fallback color is used.
  function fillColorExpr(mode) {
    const key = mode === "predict" ? "_pred" : "_label";
    return [
      "case",
      ["==", ["feature-state", key], CLASS_INTACT], CLASS_COLORS[CLASS_INTACT],
      ["==", ["feature-state", key], CLASS_DAMAGED], CLASS_COLORS[CLASS_DAMAGED],
      ["==", ["feature-state", key], CLASS_CLOUDY], CLASS_COLORS[CLASS_CLOUDY],
      UNLABELED_COLOR,
    ];
  }

  // Re-apply the fill paint for the current view mode.
  useEffect(() => {
    if (!fillLayerRef.current) return;
    fillLayerRef.current.setOptions({
      fillColor: fillColorExpr(viewMode),
    });
    if (viewMode === "predict") maybeTrainAndPredict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isMapReady]);

  // ── Labeling ──────────────────────────────────────────────────────────────
  // Atlas v3 click events return Shape (getProperties()) OR raw Feature
  // (.properties) depending on render path — read the id from either.
  function clickedBuildingId(e) {
    if (!e.shapes || e.shapes.length === 0) return null;
    const s = e.shapes[0];
    const props =
      typeof s.getProperties === "function" ? s.getProperties() : s.properties;
    return props ? props.id : null;
  }

  // Push per-building render state into the map via setFeatureState. Atlas
  // v3 (Mapbox-GL fork) supports this on VectorTileSource as long as the
  // source was configured with promoteId. State persists across the
  // session even when the originating tile unloads / reloads.
  function setFeatureLabel(id, label) {
    const map = mapRef.current;
    const source = vectorTileSourceRef.current;
    if (!map || !source || id == null) return;
    map.setFeatureState(
      { source: source.getId(), sourceLayer: PMTILES_SOURCE_LAYER, id },
      { _label: label }
    );
  }
  function setFeaturePred(id, pred) {
    const map = mapRef.current;
    const source = vectorTileSourceRef.current;
    if (!map || !source || id == null) return;
    map.setFeatureState(
      { source: source.getId(), sourceLayer: PMTILES_SOURCE_LAYER, id },
      { _pred: pred }
    );
  }
  function clearFeatureLabel(id) {
    const map = mapRef.current;
    const source = vectorTileSourceRef.current;
    if (!map || !source || id == null) return;
    // Atlas inherits the Mapbox API: removeFeatureState clears the key.
    if (typeof map.removeFeatureState === "function") {
      map.removeFeatureState(
        { source: source.getId(), sourceLayer: PMTILES_SOURCE_LAYER, id },
        "_label"
      );
    } else {
      // Fallback: explicitly set to the sentinel.
      setFeatureLabel(id, -1);
    }
  }

  function recordLabel(id, cls) {
    const feature = loadedFeaturesRef.current.get(id);
    if (!feature) return false;
    const vec = extractFeatureVector(
      feature.properties,
      featureKeysRef.current
    );
    labeledMapRef.current[id] = { label: cls, features: vec };
    return true;
  }

  function labelBuilding(id, cls) {
    if (!recordLabel(id, cls)) return;
    setFeatureLabel(id, cls);
    refreshCounts();
    if (viewModeRef.current === "predict") maybeTrainAndPredict();
  }

  // Batch label (Ctrl+drag box-select): record all, push each to feature-state.
  function labelBuildings(ids, cls) {
    let n = 0;
    for (const id of ids) {
      if (id != null && recordLabel(id, cls)) {
        setFeatureLabel(id, cls);
        n++;
      }
    }
    if (n === 0) return;
    refreshCounts();
    setStatus(`Labeled ${n} buildings.`);
    if (viewModeRef.current === "predict") maybeTrainAndPredict();
  }

  function clearLabel(id) {
    delete labeledMapRef.current[id];
    clearFeatureLabel(id);
    refreshCounts();
  }

  function refreshCounts() {
    const next = { 0: 0, 1: 0, 2: 0 };
    Object.values(labeledMapRef.current).forEach((e) => {
      next[e.label] = (next[e.label] || 0) + 1;
    });
    setCounts(next);
  }

  // ── Train + predict (WebGPU, CPU fallback) ────────────────────────────────
  // Async (WebGPU is async). A busy guard coalesces rapid label clicks: while a
  // run is in flight, the latest request is deferred and run once it finishes.
  async function maybeTrainAndPredict() {
    if (trainBusyRef.current) {
      trainPendingRef.current = true;
      return;
    }
    const entries = Object.values(labeledMapRef.current).filter((e) =>
      isValidVector(e.features)
    );
    const perClass = {};
    entries.forEach((e) => (perClass[e.label] = (perClass[e.label] || 0) + 1));
    const classesReady = Object.values(perClass).filter(
      (n) => n >= MIN_PER_CLASS
    ).length;
    if (classesReady < 2) {
      setStatus(`Need ${MIN_PER_CLASS}+ labels in at least 2 classes to train.`);
      return;
    }

    trainBusyRef.current = true;
    setStatus("Training…");
    try {
      // Single 80/20 holdout for the metrics panel — runs one OvR pass
      // instead of k full passes, so it scales linearly with feature
      // count and stays cheap enough to refresh on every label click.
      const metrics = await holdoutMetricsDamaged(
        entries,
        0.2,
        CLASS_DAMAGED
      );
      if (metrics) setMetrics({ ...metrics, mode: "holdout" });

      // Predict for every loaded building with a valid feature vector.
      // (Viewport-scoped: only buildings whose tiles the user has
      // panned/zoomed over. Save runs the full-coverage pass — see
      // handleSave.)
      const ids = [];
      const matrix = [];
      for (const f of loadedFeaturesRef.current.values()) {
        const vec = extractFeatureVector(
          f.properties,
          featureKeysRef.current
        );
        if (!isValidVector(vec)) continue;
        ids.push(f.properties.id);
        matrix.push(vec);
      }
      if (matrix.length === 0) return;

      const { predictions, backend } = await predictClasses(entries, matrix);
      const predMap = predictionsMapRef.current;
      for (let i = 0; i < ids.length; i++) {
        predMap[ids[i]] = predictions[i];
        // Push each prediction into feature-state so the render updates
        // without rebuilding any source. setFeatureState is per-id and
        // persistent for the session.
        setFeaturePred(ids[i], predictions[i]);
      }
      setBackend(backend);
      setPredictedCount(ids.length);
      setStatus(
        `Predicted ${ids.length} buildings (${entries.length} labels, ${backend}).`
      );
    } finally {
      trainBusyRef.current = false;
      if (trainPendingRef.current) {
        trainPendingRef.current = false;
        maybeTrainAndPredict();
      }
    }
  }

  function extractCentroid(feature) {
    try {
      const geom = feature.geometry;
      if (!geom) return null;
      const coords =
        geom.type === "Polygon"
          ? geom.coordinates[0]
          : geom.type === "MultiPolygon"
          ? geom.coordinates[0][0]
          : null;
      if (!coords || coords.length === 0) return null;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      return [lng, lat];
    } catch {
      return null;
    }
  }

  // ── Keyboard: 1/2/3 set class, T cycles, P toggles view ───────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "1") setSelectedClass(CLASS_INTACT);
      else if (e.key === "2") setSelectedClass(CLASS_DAMAGED);
      else if (e.key === "3") setSelectedClass(CLASS_CLOUDY);
      else if (e.key === "t" || e.key === "T")
        setSelectedClass((c) => (c + 1) % 3);
      else if (e.key === "p" || e.key === "P")
        setViewMode((v) => (v === "label" ? "predict" : "label"));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Save: full-coverage train + predict + persist ─────────────────────────
  //
  // Save is the only place that promises full-coverage output. The
  // interactive Predict toggle is viewport-scoped (only buildings the
  // user has panned over); Save downloads the complete embeddings,
  // trains on all labels, predicts for every building in batches, and
  // writes one complete predictions GPKG. Progress is rendered as a
  // modal overlay with phases (download → train → predict → save) and a
  // cancel button that stops cleanly between batches.
  async function handleSave() {
    if (saveProgress) return; // Don't double-fire.
    const entries = Object.values(labeledMapRef.current).filter((e) =>
      isValidVector(e.features)
    );
    if (entries.length === 0) {
      setDialog(
        "Nothing to save",
        "Label at least one building (with valid features) before saving."
      );
      return;
    }
    saveAbortRef.current = { cancelled: false };

    try {
      // ── Phase 1: download the full embeddings ───────────────────────────
      setSaveProgress({
        phase: "download",
        message: "Downloading embeddings…",
      });
      let allFeatures = [];
      try {
        const geojson = await apiGet(
          `GetBuildingEmbeddingsGeoJSON?projectId=${projectId}&imageLayerId=${imageLayerId}&modelId=${modelId}`
        );
        allFeatures = geojson?.features || [];
      } catch (e) {
        throw new Error(`Failed to download embeddings: ${e.message || e}`);
      }
      if (saveAbortRef.current.cancelled) {
        setSaveProgress({ phase: "cancelled" });
        return;
      }
      if (allFeatures.length === 0) {
        throw new Error(
          "No embeddings available — the embedding workflow has not produced any building features."
        );
      }

      // Lazy feature-key detection from the downloaded set (it's the
      // authoritative source for "every building"). The labeler's
      // featureKeysRef may have been populated lazily from PMTiles
      // already; either source should produce the same key set, but
      // re-detect here so this code path is self-contained.
      const featureKeys = detectFeatureKeys(allFeatures[0].properties);

      // Build the parallel arrays the model expects: per-building id +
      // feature vector. Drop buildings whose vectors are non-finite
      // (the embedding writes NaN placeholders for buildings outside
      // the raster bounds).
      const ids = [];
      const matrix = [];
      const overtureIds = [];
      for (const f of allFeatures) {
        const vec = extractFeatureVector(f.properties, featureKeys);
        if (!isValidVector(vec)) continue;
        ids.push(f.properties?.id);
        overtureIds.push(f.properties?.overture_id ?? f.properties?.id);
        matrix.push(vec);
      }
      if (matrix.length === 0) {
        throw new Error(
          "No buildings with valid feature vectors in the downloaded embeddings."
        );
      }

      // ── Phase 2 + 3: train once, predict in batches ─────────────────────
      const {
        predictions,
        backend,
        aborted,
      } = await trainAndPredictBatched(entries, matrix, {
        batchSize: 5000,
        onProgress: (p) => {
          if (p.phase === "train") {
            setSaveProgress({ phase: "train", message: "Training model…" });
          } else if (p.phase === "predict") {
            setSaveProgress({
              phase: "predict",
              current: p.current,
              total: p.total,
              message: `Predicting ${p.current.toLocaleString()} / ${p.total.toLocaleString()}…`,
            });
          }
        },
        shouldAbort: () => saveAbortRef.current.cancelled,
      });

      if (aborted) {
        setSaveProgress({ phase: "cancelled" });
        return;
      }

      // ── Phase 4: persist ────────────────────────────────────────────────
      setSaveProgress({ phase: "save", message: "Saving…" });

      // 4a. Per-building predictions -> gpkg on the model (row-index id).
      // Predictions array is parallel to ids/matrix, both indexed by the
      // valid-feature subset of the original embeddings file.
      const predictionPayload = predictions.map((cls, i) => ({
        id: ids[i],
        damaged: cls === CLASS_DAMAGED ? 1 : 0,
        unknown: cls === CLASS_CLOUDY ? 1.0 : 0.0,
      }));
      await apiPut("PutBuildingPredictions", {
        projectId,
        imageLayerId,
        modelId,
        predictions: predictionPayload,
      });

      // 4b. Manual labels -> model-scoped interactive-labeler store
      // (keyed by Overture id). Build from labeledMapRef + the overture
      // ids we collected from the downloaded set above.
      const labels = {};
      // Map id -> overture id from the downloaded set; falls back to id
      // itself for buildings without an overture id.
      const overtureById = new Map();
      ids.forEach((id, i) => overtureById.set(id, overtureIds[i]));
      for (const [id, entry] of Object.entries(labeledMapRef.current)) {
        // labeledMapRef may have string-typed keys from Object.entries;
        // both string and number lookups are tried to be safe.
        const ovId =
          overtureById.get(id) ??
          overtureById.get(Number(id)) ??
          id;
        labels[ovId] = {
          id: ovId,
          label: CLASS_TO_VALIDATION[entry.label],
          updatedAt: new Date().toISOString(),
        };
      }
      await apiPut("PutInteractiveLabels", {
        projectId,
        imageLayerId,
        modelId,
        labels,
      });

      // Update local prediction map so the UI's "N predicted" status
      // reflects the full-coverage run that just persisted.
      const predMap = predictionsMapRef.current;
      for (let i = 0; i < ids.length; i++) predMap[ids[i]] = predictions[i];
      // Push every prediction onto currently-loaded features so the map
      // updates without waiting for a tile reload.
      for (const id of ids) {
        if (loadedFeaturesRef.current.has(id) && predMap[id] != null) {
          setFeaturePred(id, predMap[id]);
        }
      }
      setBackend(backend);
      setPredictedCount(ids.length);

      setSaveProgress({
        phase: "done",
        message: `Saved predictions for ${ids.length.toLocaleString()} buildings.`,
      });
    } catch (e) {
      console.error("Error saving predictions:", e);
      setSaveProgress({
        phase: "error",
        message: `Failed to save: ${e.message || e}`,
      });
    }
  }

  // Cancel the in-flight save by flipping the abort ref; the batched
  // predict loop reads it between batches and exits cleanly. The
  // download phase doesn't currently abort mid-stream (browser fetch
  // would need AbortController); the cancel acts on the next phase.
  function cancelSave() {
    saveAbortRef.current.cancelled = true;
  }

  function dismissSaveProgress() {
    setSaveProgress(null);
  }

  const totalLabeled = counts[0] + counts[1] + counts[2];

  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => navigate(`/project/${projectId}`)}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: "6px 14px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        ← Back to Project
      </button>

      <div ref={mapContainerRef} id="interactiveLabelerMap" style={{ flexGrow: 1 }} />

      {isMapReady && (
        <div
          style={{
            width: 280,
            padding: 16,
            background: "#fff",
            borderLeft: "1px solid #e1e1e1",
            overflowY: "auto",
          }}
        >
          <Text variant="large" block style={{ marginBottom: 2 }}>
            Interactive Labeler
          </Text>
          {backend && (
            <div
              style={{
                fontSize: 11,
                color: backend === "WebGPU" ? "#0a7d33" : "#888",
                marginBottom: 8,
              }}
            >
              Compute: {backend}
            </div>
          )}

          <ChoiceGroup
            label="Set class"
            selectedKey={String(selectedClass)}
            options={CLASS_OPTIONS}
            onChange={(e, o) => setSelectedClass(parseInt(o.key, 10))}
          />

          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ color: CLASS_COLORS[CLASS_INTACT] }}>
              Intact: <b>{counts[CLASS_INTACT]}</b>
            </div>
            <div style={{ color: CLASS_COLORS[CLASS_DAMAGED] }}>
              Damaged: <b>{counts[CLASS_DAMAGED]}</b>
            </div>
            <div style={{ color: CLASS_COLORS[CLASS_CLOUDY] }}>
              Cloudy: <b>{counts[CLASS_CLOUDY]}</b>
            </div>
          </div>

          <Toggle
            label="View"
            onText="Predicted"
            offText="Labeled"
            checked={viewMode === "predict"}
            onChange={(e, checked) =>
              setViewMode(checked ? "predict" : "label")
            }
            style={{ marginTop: 12 }}
          />

          {metrics && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#333",
                borderTop: "1px solid #eee",
                paddingTop: 8,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Damaged class (80/20 holdout)
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span>
                  P <b>{(metrics.precision * 100).toFixed(0)}%</b>
                </span>
                <span>
                  R <b>{(metrics.recall * 100).toFixed(0)}%</b>
                </span>
                <span>
                  F1 <b>{(metrics.f1 * 100).toFixed(0)}%</b>
                </span>
              </div>
              <div style={{ color: "#999", marginTop: 2 }}>
                {metrics.nPos} damaged / {metrics.nNeg} other
              </div>
            </div>
          )}

          <div style={{ marginTop: 8, minHeight: 18, fontSize: 12, color: "#888" }}>
            {status}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
            {totalLabeled} labeled · {predictedCount} predicted
          </div>

          <PrimaryButton
            text={saveProgress ? "Saving…" : "Save Predictions"}
            disabled={saveProgress != null || totalLabeled === 0}
            onClick={handleSave}
            style={{ marginTop: 16, width: "100%" }}
          />
          <DefaultButton
            text="Train / Predict"
            onClick={maybeTrainAndPredict}
            disabled={saveProgress != null}
            style={{ marginTop: 8, width: "100%" }}
          />

          <div style={{ marginTop: 12, fontSize: 11, color: "#999" }}>
            Click a building to label it · right-click to clear ·{" "}
            <kbd>Ctrl</kbd>+drag to box-label · <kbd>1</kbd>/<kbd>2</kbd>/
            <kbd>3</kbd> set class · <kbd>P</kbd> toggle view
          </div>
        </div>
      )}

      {/* Box-select rectangle (Ctrl+drag) */}
      <div
        ref={boxRef}
        style={{
          position: "absolute",
          display: "none",
          border: "2px dashed #3388ff",
          background: "rgba(51,136,255,0.15)",
          pointerEvents: "none",
          zIndex: 900,
        }}
      />

      {/* Bottom info bar: lat / lon / zoom / building count */}
      {isMapReady && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)",
            padding: "4px 12px",
            borderRadius: 6,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            zIndex: 900,
            fontSize: 12,
            fontFamily: "monospace",
            color: "#444",
            whiteSpace: "nowrap",
          }}
        >
          Zoom: {mapInfo.zoom.toFixed(2)} | Lat: {mapInfo.lat.toFixed(4)}, Lon:{" "}
          {mapInfo.lon.toFixed(4)} | {buildingCount.toLocaleString()} buildings
        </div>
      )}

      {/* Save progress modal — covers the four phases (download, train,
          predict, save) of a full-coverage Save. Predict is the only one
          with a determinate progress bar (batched, current/total known);
          the others show an indeterminate spinner-like state. The user
          can cancel between predict batches. */}
      {saveProgress && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: 360,
              background: "#fff",
              borderRadius: 6,
              padding: 18,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <Text variant="mediumPlus" block style={{ fontWeight: 600, marginBottom: 8 }}>
              {saveProgress.phase === "done"
                ? "Done"
                : saveProgress.phase === "error"
                ? "Error"
                : saveProgress.phase === "cancelled"
                ? "Cancelled"
                : "Saving predictions"}
            </Text>
            <Text variant="small" block style={{ marginBottom: 12, color: "#555" }}>
              {saveProgress.message ||
                (saveProgress.phase === "download"
                  ? "Downloading embeddings…"
                  : saveProgress.phase === "train"
                  ? "Training model…"
                  : saveProgress.phase === "predict"
                  ? "Predicting…"
                  : saveProgress.phase === "save"
                  ? "Saving…"
                  : "")}
            </Text>
            {saveProgress.phase === "predict" &&
              typeof saveProgress.current === "number" &&
              typeof saveProgress.total === "number" && (
                <div
                  style={{
                    height: 8,
                    background: "#eee",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${
                        (saveProgress.current / Math.max(saveProgress.total, 1)) * 100
                      }%`,
                      height: "100%",
                      background: "#107C10",
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {(saveProgress.phase === "download" ||
                saveProgress.phase === "train" ||
                saveProgress.phase === "predict" ||
                saveProgress.phase === "save") && (
                <DefaultButton text="Cancel" onClick={cancelSave} />
              )}
              {(saveProgress.phase === "done" ||
                saveProgress.phase === "error" ||
                saveProgress.phase === "cancelled") && (
                <PrimaryButton text="Close" onClick={dismissSaveProgress} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveLabeler;
