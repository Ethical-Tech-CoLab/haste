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
  buildModel,
  crossValidateDamaged,
  detectFeatureKeys,
  extractFeatureVector,
  isValidVector,
} from "./interactiveModel.js";

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
  const datasourceRef = useRef(null);
  const fillLayerRef = useRef(null);
  const preImageryRef = useRef(null);
  const postImageryRef = useRef(null);
  const featureKeysRef = useRef(null);
  // labeledMap: id -> { label, features }; predictionsMap: id -> class.
  const labeledMapRef = useRef({});
  const predictionsMapRef = useRef({});
  const featuresRef = useRef([]);

  const boxRef = useRef(null); // box-select rectangle div
  const boxCleanupRef = useRef(null); // detaches document-level drag listeners

  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedClass, setSelectedClass] = useState(CLASS_DAMAGED);
  const [viewMode, setViewMode] = useState("label"); // "label" | "predict"
  const [counts, setCounts] = useState({ 0: 0, 1: 0, 2: 0 });
  const [predictedCount, setPredictedCount] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [mapInfo, setMapInfo] = useState({ lat: 0, lon: 0, zoom: 0 });
  const [buildingCount, setBuildingCount] = useState(0);

  // selectedClass is read inside the (once-bound) map click handler.
  const selectedClassRef = useRef(selectedClass);
  useEffect(() => {
    selectedClassRef.current = selectedClass;
  }, [selectedClass]);
  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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

    const embeddingsGeoJSON = await apiGet(
      `GetBuildingEmbeddingsGeoJSON?projectId=${projectId}&imageLayerId=${imageLayerId}&modelId=${modelId}`
    );

    const featuresArr = (embeddingsGeoJSON?.features || []).map((f) => ({
      ...f,
      // Give each GeoJSON feature a stable top-level id so the Azure Maps
      // DataSource can address individual shapes by building row index.
      id: f.properties?.id,
    }));
    featuresRef.current = featuresArr;
    if (featuresArr.length > 0 && featuresArr[0].properties) {
      featureKeysRef.current = detectFeatureKeys(featuresArr[0].properties);
    }

    // Restore this model's previously-saved interactive labels (separate from
    // the Building Validation store) so reopening the labeler resumes work.
    try {
      const saved = await apiGet(
        `GetInteractiveLabels?projectId=${projectId}&modelId=${modelId}`
      );
      const savedLabels = saved?.labels || {};
      if (Object.keys(savedLabels).length > 0) {
        for (const f of featuresArr) {
          const overtureId = f.properties?.overture_id ?? f.properties?.id;
          const entry = savedLabels[overtureId];
          if (!entry) continue;
          const cls = VALIDATION_TO_CLASS[entry.label];
          if (cls == null) continue;
          const vec = extractFeatureVector(
            f.properties,
            featureKeysRef.current
          );
          labeledMapRef.current[f.properties.id] = { label: cls, features: vec };
        }
        refreshCounts();
      }
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

      const datasource = new window.atlas.source.DataSource();
      map.sources.add(datasource);
      datasourceRef.current = datasource;

      if (featuresArr.length > 0) {
        // Only geometry + id + render state go on the map; the heavy f_*
        // feature columns stay in featuresRef for the in-browser model.
        datasource.add(buildRenderCollection());

        const fillLayer = new window.atlas.layer.PolygonLayer(
          datasource,
          "embeddingFill",
          {
            fillColor: labelFillColorExpr(),
            fillOpacity: 0.5,
          }
        );
        map.layers.add(fillLayer);
        fillLayerRef.current = fillLayer;

        map.layers.add(
          new window.atlas.layer.LineLayer(datasource, "embeddingOutline", {
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
        setBuildingCount(featuresArr.length);
        setupBoxSelect(map);

        const c = extractCentroid(featuresArr[0]);
        if (c) map.setCamera({ center: c, zoom: 17, duration: 0 });
      }

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
      for (const f of featuresRef.current) {
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
  function labelFillColorExpr() {
    return [
      "case",
      ["==", ["get", "_label"], CLASS_INTACT], CLASS_COLORS[CLASS_INTACT],
      ["==", ["get", "_label"], CLASS_DAMAGED], CLASS_COLORS[CLASS_DAMAGED],
      ["==", ["get", "_label"], CLASS_CLOUDY], CLASS_COLORS[CLASS_CLOUDY],
      UNLABELED_COLOR,
    ];
  }
  function predictFillColorExpr() {
    return [
      "case",
      ["==", ["get", "_pred"], CLASS_INTACT], CLASS_COLORS[CLASS_INTACT],
      ["==", ["get", "_pred"], CLASS_DAMAGED], CLASS_COLORS[CLASS_DAMAGED],
      ["==", ["get", "_pred"], CLASS_CLOUDY], CLASS_COLORS[CLASS_CLOUDY],
      UNLABELED_COLOR,
    ];
  }

  // Re-apply the fill paint for the current view mode.
  useEffect(() => {
    if (!fillLayerRef.current) return;
    fillLayerRef.current.setOptions({
      fillColor:
        viewMode === "predict" ? predictFillColorExpr() : labelFillColorExpr(),
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

  // Lightweight render features: geometry + id + render state only (the heavy
  // f_* columns live in featuresRef, never on the map).
  function buildRenderCollection() {
    return {
      type: "FeatureCollection",
      features: featuresRef.current.map((f) => {
        const id = f.properties?.id;
        const labeled = labeledMapRef.current[id];
        const pred = predictionsMapRef.current[id];
        return {
          type: "Feature",
          id,
          geometry: f.geometry,
          properties: {
            id,
            _label: labeled ? labeled.label : -1,
            _pred: pred != null ? pred : -1,
          },
        };
      }),
    };
  }

  function setShapeProp(id, key, value) {
    const ds = datasourceRef.current;
    if (!ds) return;
    const shape = ds.getShapeById(id);
    if (shape) {
      shape.setProperties({ ...shape.getProperties(), [key]: value });
    } else {
      // Fallback if the shape can't be addressed by id — re-sync the whole
      // (lightweight) collection from the label/prediction maps.
      rebuildDatasource();
    }
  }

  function recordLabel(id, cls) {
    const feature = featuresRef.current.find((f) => f.properties?.id === id);
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
    setShapeProp(id, "_label", cls);
    refreshCounts();
    if (viewModeRef.current === "predict") maybeTrainAndPredict();
  }

  // Batch label (Ctrl+drag box-select): record all, then one rebuild.
  function labelBuildings(ids, cls) {
    let n = 0;
    for (const id of ids) {
      if (id != null && recordLabel(id, cls)) n++;
    }
    if (n === 0) return;
    rebuildDatasource();
    refreshCounts();
    setStatus(`Labeled ${n} buildings.`);
    if (viewModeRef.current === "predict") maybeTrainAndPredict();
  }

  function clearLabel(id) {
    delete labeledMapRef.current[id];
    setShapeProp(id, "_label", -1);
    refreshCounts();
  }

  function refreshCounts() {
    const next = { 0: 0, 1: 0, 2: 0 };
    Object.values(labeledMapRef.current).forEach((e) => {
      next[e.label] = (next[e.label] || 0) + 1;
    });
    setCounts(next);
  }

  // ── Train + predict (client-side) ─────────────────────────────────────────
  function maybeTrainAndPredict() {
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

    setStatus("Training…");
    // Cross-validated precision/recall/F1 for the Damaged class.
    const cv = crossValidateDamaged(entries, 5, CLASS_DAMAGED);
    if (cv) setMetrics(cv);

    const model = buildModel(entries);

    // Predict for every building with a valid feature vector.
    const ids = [];
    const matrix = [];
    for (const f of featuresRef.current) {
      const vec = extractFeatureVector(f.properties, featureKeysRef.current);
      if (!isValidVector(vec)) continue;
      ids.push(f.properties.id);
      matrix.push(vec);
    }
    if (matrix.length === 0) return;
    const preds = model.predict(matrix);
    const predMap = {};
    for (let i = 0; i < ids.length; i++) predMap[ids[i]] = preds[i];
    predictionsMapRef.current = predMap;
    // One bulk datasource rebuild (instead of N per-shape updates) — bakes
    // both the manual labels and the fresh predictions into properties.
    rebuildDatasource();
    setPredictedCount(ids.length);
    setStatus(`Predicted ${ids.length} buildings (${entries.length} labels).`);
  }

  // Re-add all features with current _label / _pred baked in. Used after a
  // bulk prediction; single-building label clicks use setShapeProp instead.
  function rebuildDatasource() {
    const ds = datasourceRef.current;
    if (!ds) return;
    ds.clear();
    ds.add(buildRenderCollection());
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

  // ── Save: labels + predictions ────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true);
    setIsLoading(true, "Saving predictions…");
    try {
      // 1. Manual labels -> model-scoped interactive-labeler store (keyed by
      // Overture id). This is SEPARATE from the layer-scoped Building
      // Validation store, so the two workflows don't overwrite each other.
      const labels = {};
      for (const f of featuresRef.current) {
        const entry = labeledMapRef.current[f.properties?.id];
        if (!entry) continue;
        const overtureId = f.properties?.overture_id ?? f.properties?.id;
        labels[overtureId] = {
          id: overtureId,
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

      // 2. Per-building predictions -> gpkg on the model (row-index id).
      const predictions = featuresRef.current.map((f) => {
        const id = f.properties?.id;
        const cls = predictionsMapRef.current[id];
        return {
          id,
          damaged: cls === CLASS_DAMAGED ? 1 : 0,
          unknown: cls === CLASS_CLOUDY ? 1.0 : 0.0,
        };
      });
      await apiPut("PutBuildingPredictions", {
        projectId,
        imageLayerId,
        modelId,
        predictions,
      });

      setDialog("Saved", "Labels and predictions saved successfully.", [
        {
          type: "primary",
          key: "close",
          text: "Close",
          onClick: () => setDialog(),
        },
      ]);
    } catch (e) {
      console.error("Error saving predictions:", e);
      setDialog("Error", "Failed to save labels and predictions.");
    } finally {
      setIsSaving(false);
      setIsLoading(false);
    }
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
          <Text variant="large" block style={{ marginBottom: 8 }}>
            Interactive Labeler
          </Text>

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
                Damaged class ({metrics.folds}-fold CV)
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
            text={isSaving ? "Saving…" : "Save Predictions"}
            disabled={isSaving || predictedCount === 0}
            onClick={handleSave}
            style={{ marginTop: 16, width: "100%" }}
          />
          <DefaultButton
            text="Train / Predict"
            onClick={maybeTrainAndPredict}
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
    </div>
  );
};

export default InteractiveLabeler;
