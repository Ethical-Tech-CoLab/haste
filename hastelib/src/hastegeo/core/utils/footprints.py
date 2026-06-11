# Copyright (c) 2024 Overture Maps
# Licensed under the MIT License.
# Code from: https://github.com/OvertureMaps/overturemaps-py/blob/0fad53bceb955b14ac069ef321cbc2486996d5c7/overturemaps/core.py
# Modified to read from Azure Blob Storage instead of S3

"""Overture Maps client + a high-level building-footprint downloader.

This module is the single source of truth for fetching building footprints
inside HASTE. It is consumed by both the imageryprep workflow (where
footprints are cached per image layer) and historically by the inference
workflow (now slated to consume the cached gpkg).
"""

from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from typing import List, Optional, Tuple

import fsspec
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as fs

logger = logging.getLogger(__name__)

OVERTURE_ACCOUNT_NAME = "overturemapswestus2"
FALLBACK_RELEASE = "2026-02-18.0"
DEFAULT_FOOTPRINT_GEOJSON_SAMPLE_SIZE = 200
# Matches the cap PR #25's GetBuildingFootprintsGeoJSON endpoint set
# deliberately to bound response size and server-side memory. Keep this
# in sync with the Pydantic default on BuildingFootprintsOverlay so the
# frontend never asks for more than the endpoint will serve.
MAX_FOOTPRINT_GEOJSON_FEATURES = 2000
# Matches Overture release names like "2026-02-18.0"
_RELEASE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}\.\d+$")

# Allows for optional import of additional dependencies
try:
    import geopandas as gpd
    from geopandas import GeoDataFrame

    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False
    GeoDataFrame = None


type_theme_map = {
    "address": "addresses",
    "bathymetry": "base",
    "building": "buildings",
    "building_part": "buildings",
    "division": "divisions",
    "division_area": "divisions",
    "division_boundary": "divisions",
    "place": "places",
    "segment": "transportation",
    "connector": "transportation",
    "infrastructure": "base",
    "land": "base",
    "land_cover": "base",
    "land_use": "base",
    "water": "base",
}


def get_all_overture_types() -> List[str]:
    return list(type_theme_map.keys())


def record_batch_reader(
    overture_type, bbox=None
) -> Optional[pa.RecordBatchReader]:
    """Return a pyarrow RecordBatchReader for the desired bounding box and Azure path."""
    path = _dataset_path(overture_type)

    if bbox:
        xmin, ymin, xmax, ymax = bbox
        filter = (
            (pc.field("bbox", "xmin") < xmax)
            & (pc.field("bbox", "xmax") > xmin)
            & (pc.field("bbox", "ymin") < ymax)
            & (pc.field("bbox", "ymax") > ymin)
        )
    else:
        filter = None

    # Temporarily clear Azure storage env vars to prevent adlfs from using
    # local Azurite config when connecting to public Overture Maps blob storage
    saved_conn_str = os.environ.pop("AZURE_STORAGE_CONNECTION_STRING", None)
    saved_account = os.environ.pop("AZURE_STORAGE_ACCOUNT", None)

    try:
        t_fs = fsspec.filesystem(
            "az", account_name=OVERTURE_ACCOUNT_NAME, anon=True
        )
        pa_fs = fs.PyFileSystem(fs.FSSpecHandler(t_fs))

        dataset = ds.dataset(path, filesystem=pa_fs)
    finally:
        if saved_conn_str:
            os.environ["AZURE_STORAGE_CONNECTION_STRING"] = saved_conn_str
        if saved_account:
            os.environ["AZURE_STORAGE_ACCOUNT"] = saved_account

    batches = dataset.to_batches(filter=filter)

    # to_batches() can yield many empty batches; downstream consumers like
    # ParquetWriter emit a row group per batch which bloats output files.
    non_empty_batches = (b for b in batches if b.num_rows > 0)

    geoarrow_schema = geoarrow_schema_adapter(dataset.schema)
    return pa.RecordBatchReader.from_batches(
        geoarrow_schema, non_empty_batches
    )


def geodataframe(
    overture_type: str, bbox: Tuple[float, float, float, float] = None
) -> "GeoDataFrame":
    """Loads geoparquet for specified type into a geopandas dataframe.

    Args:
        overture_type: type to load (e.g. "building").
        bbox: optional bounding box (xmin, ymin, xmax, ymax) in EPSG:4326.

    Returns:
        GeoDataFrame with the optionally filtered theme data.
    """
    if not HAS_GEOPANDAS:
        raise ImportError("geopandas is required to use this function")

    reader = record_batch_reader(overture_type, bbox)
    return gpd.GeoDataFrame.from_arrow(reader)


def geoarrow_schema_adapter(schema: pa.Schema) -> pa.Schema:
    """Convert a geoarrow-compatible schema to a proper geoarrow schema.

    Assumes there is a single ``geometry`` column with WKB formatting.
    """
    geometry_field_index = schema.get_field_index("geometry")
    geometry_field = schema.field(geometry_field_index)
    geoarrow_geometry_field = geometry_field.with_metadata(
        {b"ARROW:extension:name": b"geoarrow.wkb"}
    )
    return schema.set(geometry_field_index, geoarrow_geometry_field)


@lru_cache(maxsize=1)
def get_latest_release() -> str:
    """Discover the latest Overture Maps release from Azure Blob Storage.

    Lists the ``release/`` prefixes in the overturemapswestus2 container and
    returns the most recent version string (lexicographic sort works because
    release names follow the ``YYYY-MM-DD.N`` convention).

    Falls back to ``FALLBACK_RELEASE`` if the listing fails or returns no
    valid release names.
    """
    saved_conn_str = os.environ.pop("AZURE_STORAGE_CONNECTION_STRING", None)
    saved_account = os.environ.pop("AZURE_STORAGE_ACCOUNT", None)

    try:
        t_fs = fsspec.filesystem(
            "az", account_name=OVERTURE_ACCOUNT_NAME, anon=True
        )
        entries = t_fs.ls("release/")
        release_names = [
            entry.rstrip("/").split("/")[-1]
            for entry in entries
            if _RELEASE_PATTERN.match(entry.rstrip("/").split("/")[-1])
        ]
        if not release_names:
            logger.warning(
                "No valid Overture releases found, falling back to %s",
                FALLBACK_RELEASE,
            )
            return FALLBACK_RELEASE

        release_names.sort(reverse=True)
        latest = release_names[0]
        logger.info("Resolved latest Overture Maps release: %s", latest)
        return latest
    except Exception:
        logger.warning(
            "Failed to list Overture releases, falling back to %s",
            FALLBACK_RELEASE,
            exc_info=True,
        )
        return FALLBACK_RELEASE
    finally:
        if saved_conn_str:
            os.environ["AZURE_STORAGE_CONNECTION_STRING"] = saved_conn_str
        if saved_account:
            os.environ["AZURE_STORAGE_ACCOUNT"] = saved_account


def _dataset_path(overture_type: str, release: str = None) -> str:
    """Returns the Azure blob path of the Overture dataset to use."""
    if release is None:
        release = get_latest_release()
    theme = type_theme_map[overture_type]
    return f"release/{release}/theme={theme}/type={overture_type}/"


def download_building_footprints(
    bbox: Tuple[float, float, float, float],
    output_path: str,
    *,
    overwrite: bool = False,
) -> int:
    """Download Overture Maps building footprints for an AOI to a GeoPackage.

    The output gpkg contains only Polygon/MultiPolygon features in EPSG:4326
    with columns ``id``, ``geometry``, ``subtype``, ``class`` (the columns
    HASTE's downstream merge step expects).

    Args:
        bbox: AOI bounding box (xmin, ymin, xmax, ymax) in EPSG:4326.
        output_path: Destination ``.gpkg`` filename.
        overwrite: If False and the file already exists, raise FileExistsError.

    Returns:
        Number of features written.
    """
    if not output_path.endswith(".gpkg"):
        raise ValueError("output_path must end with .gpkg")
    if os.path.exists(output_path):
        if not overwrite:
            raise FileExistsError(
                f"Output file '{output_path}' already exists "
                "(pass overwrite=True to replace)."
            )
        os.remove(output_path)

    footprints = geodataframe("building", bbox)
    footprints = footprints[["id", "geometry", "subtype", "class"]]
    footprints = footprints[
        footprints.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
    ]
    footprints.set_crs(epsg=4326, inplace=True)
    footprints.to_file(output_path, driver="GPKG")

    logger.info(
        "Wrote %d Overture building footprints to %s",
        footprints.shape[0],
        output_path,
    )
    return int(footprints.shape[0])


# Expected output schema for a building-footprints GeoPackage. Downstream
# consumers (merge_with_building_footprints, GetBuildingFootprintsGeoJSON,
# the building-validation UI) tolerate missing ``subtype``/``class`` but
# always read by column name, so we synthesize a sentinel when the
# user-supplied input lacks them.
_FOOTPRINT_OUTPUT_COLUMNS = ("id", "geometry", "subtype", "class")


def clip_and_normalize_user_footprints(
    input_path: str,
    aoi_polygon,
    output_path: str,
    *,
    overwrite: bool = False,
):
    """Clip a user-supplied building-footprint GPKG to an AOI polygon.

    Reads ``input_path`` (any GDAL-supported vector format readable by
    geopandas), reprojects to EPSG:4326 if needed, filters to polygonal
    geometries, clips to ``aoi_polygon`` (EPSG:4326), normalizes the
    schema to ``(id, geometry, subtype, class)`` synthesizing any
    missing non-geometry column, and writes a GeoPackage to
    ``output_path``.

    This is the "user-supplied" counterpart to
    :func:`download_building_footprints`: both produce GPKG files with
    the same schema so the rest of HASTE's pipeline can treat them
    interchangeably.

    Args:
        input_path: Path to a local building-footprint GPKG (or any
            geopandas-readable vector file).
        aoi_polygon: ``shapely.geometry.Polygon`` (or any geometry)
            describing the AOI, **in EPSG:4326**. Typically the output
            of :func:`hastegeo.core.utils.aoi.extract_aoi_polygon`.
        output_path: Destination ``.gpkg`` path.
        overwrite: Replace the output if it already exists.

    Returns:
        Number of features written.

    Raises:
        ImportError: If geopandas is not available.
        ValueError: If the input has no CRS, no polygonal geometries, or
            nothing remains after clipping to the AOI.
        FileExistsError: If ``overwrite`` is False and ``output_path``
            already exists.
    """
    if not HAS_GEOPANDAS:
        raise ImportError("geopandas is required to use this function")
    if not output_path.endswith(".gpkg"):
        raise ValueError("output_path must end with .gpkg")
    if os.path.exists(output_path):
        if not overwrite:
            raise FileExistsError(
                f"Output file '{output_path}' already exists "
                "(pass overwrite=True to replace)."
            )
        os.remove(output_path)

    gdf = gpd.read_file(input_path)
    if gdf.crs is None:
        raise ValueError(
            "Input GPKG is missing a CRS; embed one (e.g. EPSG:4326) and retry."
        )

    polygon_mask = gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
    gdf = gdf.loc[polygon_mask].copy()
    if gdf.empty:
        raise ValueError(
            "Input GPKG contains no Polygon/MultiPolygon features."
        )

    if gdf.crs.to_epsg() != 4326:
        logger.info(
            "Reprojecting %d building footprints from %s to EPSG:4326",
            len(gdf),
            gdf.crs,
        )
        gdf = gdf.to_crs(epsg=4326)

    # Repair invalid geometries (self-intersections, etc.) before clip so
    # gpd.clip doesn't drop them or raise. ``buffer(0)`` is the long-standing
    # geopandas/shapely idiom; ``make_valid`` is the post-2.0 native API,
    # which we prefer when available.
    try:
        gdf["geometry"] = gdf.geometry.make_valid()
    except AttributeError:  # pragma: no cover - shapely < 2.0
        gdf["geometry"] = gdf.geometry.buffer(0)

    aoi_gdf = gpd.GeoDataFrame(geometry=[aoi_polygon], crs="EPSG:4326")
    try:
        clipped = gpd.clip(gdf, aoi_gdf, keep_geom_type=True)
    except TypeError:  # pragma: no cover - geopandas < 0.10
        clipped = gpd.clip(gdf, aoi_gdf)
        clipped = clipped[
            clipped.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
        ]
    clipped = clipped[~clipped.geometry.is_empty]
    # ``gpd.clip`` may turn touching boundary-only intersections into
    # Point/LineString features even with ``keep_geom_type=True`` if the
    # input is exotic; re-filter defensively.
    clipped = clipped[
        clipped.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
    ]

    if clipped.empty:
        raise ValueError(
            "No user-supplied building footprints intersected the AOI."
        )

    # Synthesize ``id`` from row index when missing; preserve any
    # existing values otherwise. Missing ``subtype``/``class`` are left
    # as ``None`` (downstream readers gate on column presence).
    if "id" not in clipped.columns:
        clipped = clipped.reset_index(drop=True)
        clipped["id"] = clipped.index.astype(str)
    if "subtype" not in clipped.columns:
        clipped["subtype"] = None
    if "class" not in clipped.columns:
        clipped["class"] = None

    out = clipped[list(_FOOTPRINT_OUTPUT_COLUMNS)].copy()
    out.set_crs(epsg=4326, inplace=True, allow_override=True)
    out.to_file(output_path, driver="GPKG")

    logger.info(
        "Wrote %d user-supplied building footprints (clipped to AOI) to %s",
        out.shape[0],
        output_path,
    )
    return int(out.shape[0])


def building_footprints_to_geojson(
    input_path: str,
    *,
    sample_size: int = DEFAULT_FOOTPRINT_GEOJSON_SAMPLE_SIZE,
    random_state: int = 42,
) -> str:
    """Convert cached building footprints to GeoJSON for map overlays.

    The cached input must be a GeoPackage produced by HASTE's imageryprep
    workflow. The returned FeatureCollection is polygon-only, EPSG:4326, and
    limited to ``sample_size`` features with deterministic sampling.
    """
    if not HAS_GEOPANDAS:
        raise ImportError("geopandas is required to use this function")
    if sample_size < 1:
        raise ValueError("sample_size must be at least 1")

    gdf = gpd.read_file(input_path)
    if gdf.empty:
        return json.dumps({"type": "FeatureCollection", "features": []})
    if gdf.crs is None:
        raise ValueError(
            f"Building footprints GeoPackage has no CRS: {input_path}"
        )

    gdf = gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
    if gdf.empty:
        return json.dumps({"type": "FeatureCollection", "features": []})

    if gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    if len(gdf) > sample_size:
        gdf = gdf.sample(n=sample_size, random_state=random_state)

    if "id" not in gdf.columns:
        gdf = gdf.reset_index(drop=True)
        gdf["id"] = gdf.index.astype(str)

    keep_cols = [
        col
        for col in ["id", "subtype", "class", "geometry"]
        if col in gdf.columns
    ]
    return gdf[keep_cols].to_json()


def _main():
    """Argparse entry point so the workflow can call this in a subprocess.

    See ``ImageryWorkflow.download_building_footprints`` in
    ``hastegeo.workflows.prepare_imagery`` — it spawns
    ``python -m hastegeo.core.utils.footprints`` so a crash in pyarrow's
    native code (or a stuck Overture query) is contained to a subprocess and
    doesn't bring down the parent imageryprep workflow.
    """
    import argparse
    import sys

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bbox",
        required=True,
        help="AOI bounding box in EPSG:4326 as 'xmin,ymin,xmax,ymax'",
    )
    parser.add_argument(
        "--output-path",
        required=True,
        help="Destination .gpkg filename",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace the output file if it already exists",
    )
    args = parser.parse_args()

    try:
        xmin, ymin, xmax, ymax = (float(v) for v in args.bbox.split(","))
    except ValueError as e:
        parser.error(f"--bbox must be 'xmin,ymin,xmax,ymax': {e}")

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    count = download_building_footprints(
        bbox=(xmin, ymin, xmax, ymax),
        output_path=args.output_path,
        overwrite=args.overwrite,
    )
    sys.stdout.write(f"{count}\n")
    sys.stdout.flush()


if __name__ == "__main__":
    _main()
