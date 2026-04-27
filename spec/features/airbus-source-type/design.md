# Technical Design: Add Airbus as Imagery Source Type

## Overview

Add Airbus as a new imagery source type by extending the existing provider-specific logic in `hastegeo` core utilities and the React UI dropdown. This follows the same pattern used by Maxar, PlanetScope, and SkySat — adding source-type-specific cases to band mapping, scaling, and normalization functions. No new components, API endpoints, or data model changes are needed.

## Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐
│   React UI       │────▶│   hastefuncapi     │────▶│  Cosmos DB   │
│ (sourceType      │     │ (passes sourceType │     │ (ImageLayer  │
│  dropdown)       │     │  through to queue) │     │  document)   │
└──────────────────┘     └────────┬───────────┘     └──────────────┘
                                  │ queue msg with sourceType
                         ┌────────▼───────────┐     ┌──────────────┐
                         │   hastefuncqueues   │────▶│  Blob Storage│
                         │ (ImageryPostProc.)  │     │  (RGB COGs)  │
                         └────────┬───────────┘     └──────────────┘
                                  │
                         ┌────────▼───────────┐
                         │   hastegeo core     │
                         │   ImageryUtils:     │
                         │   - get_rgb_band_   │
                         │     indexes()       │
                         │   - get_scale_      │
                         │     imagery_params() │
                         │   - get_norm_means()│
                         │   - get_norm_stds() │
                         └─────────────────────┘
```

### New Components

None — all changes are additions to existing components.

### Modified Components

| Component | Path | Change Description |
|---|---|---|
| Imagery Utils | `hastelib/src/hastegeo/core/utils/imagery.py` | Add `"airbus"` case to 4 static methods |
| Prepare Imagery Workflow | `hastelib/src/hastegeo/workflows/prepare_imagery.py` | Add `"airbus"` to `_determine_scale_rgb_params()` |
| UI Source Type Options | `ui/src/Components/CreateEditImageLayerHelper.js` | Add Airbus entry to `sourceTypeOptions` array |
| Admin Settings Config | `setup/config_admin_settings.json` | Add Airbus source type entry |

## API Design

No new API endpoints. The existing image layer creation/update endpoints already accept any string for `sourceTypePreEvent`/`sourceTypePostEvent`. The source type value flows unchanged through:

1. UI form → `hastefuncapi` (HTTP) → Cosmos DB
2. Cosmos DB → `hastefuncqueues` (queue trigger) → `hastegeo` processors
3. `hastegeo` processors use source type to select provider-specific logic

## Internal Interfaces (hastegeo)

### 1. `ImageryUtils.get_rgb_band_indexes()` — Band Mapping

**File:** `hastelib/src/hastegeo/core/utils/imagery.py` (line ~262)

**Current behavior:** Handles `planet_scope`, `planet_skysat`, `maxar`, `mercy_corps`, `sentinel_2`.

**Add Airbus case:**

```python
elif source_type == "airbus":
    if num_bands == 4:
        # Airbus 4-band order: Blue, Green, Red, NIR (same as Maxar/PlanetScope)
        mapping = map_bands(["blue", "green", "red", "nir"])
        return [mapping["red"], mapping["green"], mapping["blue"]]
    elif num_bands == 3:
        # Already RGB
        mapping = map_bands(["red", "green", "blue"])
        return [mapping["red"], mapping["green"], mapping["blue"]]
```

**Band order:** All Airbus 4-band products (Pléiades 1A/1B, SPOT 6/7) use B,G,R,NIR order — the same as Maxar and PlanetScope 4-band. Band indexes `[3, 2, 1]` reorder to R,G,B for output. Confirmed by Airbus DIMAP metadata format and product specification sheets.

### 2. `ImageryUtils.get_scale_imagery_params()` — Scale Parameters

**File:** `hastelib/src/hastegeo/core/utils/imagery.py` (line ~589)

**Current behavior:**
- `planet_skysat` → hardcoded `[0, 600, 0, 255]`
- `mercy_corps` → 1st/99th percentile
- Others → 2nd/98th percentile

**Add Airbus case:**

```python
if source_type == "airbus":
    scale_params.append([0, 5000, 0, 255])
    continue
```

**Rationale:** Airbus imagery uses 12-bit dynamic range with values typically in [0, 5000]. Hardcoded scaling (like SkySat) provides consistent visualization without per-image percentile computation.

### 3. `ImageryUtils.get_normalization_means()` — Training Normalization Means

**File:** `hastelib/src/hastegeo/core/utils/imagery.py` (line ~740)

**Current behavior:** Returns `[0, 0, 0, ...]` (all zeros) for all source types. The `source_type` parameter is accepted but unused.

**No Airbus-specific change.** Keep the existing computed-from-file behavior. The function already returns all zeros for every band, which works for Airbus. See decision log in [README.md](README.md#decision-log).

### 4. `ImageryUtils.get_normalization_std_devs()` — Training Normalization Stdevs

**File:** `hastelib/src/hastegeo/core/utils/imagery.py` (line ~775)

**Current behavior:** Reads each band and returns 98th percentile as stdev. The `source_type` parameter is accepted but unused.

**No Airbus-specific change.** Keep the existing computed-from-file behavior (98th percentile per band). See decision log in [README.md](README.md#decision-log).

> **Note:** The issue requester suggested means=[0,0,0,65535] and stdevs=[5000,5000,5000,1] as reference values. If computed-from-file normalization produces poor training results with Airbus imagery, revisit this decision and consider adding Airbus-specific hardcoded values. The reference values are documented here for that purpose.

### 5. `_determine_scale_rgb_params()` — Scale Determination

**File:** `hastelib/src/hastegeo/workflows/prepare_imagery.py` (line ~331)

**Current behavior:** Returns `True` for `planet_scope`, `planet_skysat`, `mercy_corps`.

**Add Airbus:**

```python
if source_type in ["planet_scope", "planet_skysat", "mercy_corps", "airbus"]:
    return True
```

### 6. UI Source Type Options

**File:** `ui/src/Components/CreateEditImageLayerHelper.js` (line ~12)

**Add entry:**

```javascript
{ key: "airbus", text: "Airbus", visualizerText: "Airbus", showInDropdown: true, url: "https://www.intelligence-airbusds.com/" },
```

**Placement:** After `planet_skysat`, before `sentinel_2` (maintaining alphabetical grouping of active providers).

### 7. Admin Settings

**File:** `setup/config_admin_settings.json`

**Add entry:**

```json
{"sourceTypeId": 7, "name": "Airbus", "baseURL": "https://www.intelligence-airbusds.com/", "creationDate": "2026-04-27 12:00:00PM"}
```

## Behavior & Logic

### Core Flow

1. User selects "Airbus" from the source type dropdown in the image layer creation form
2. UI sends `sourceTypePreEvent: "airbus"` and/or `sourceTypePostEvent: "airbus"` to `hastefuncapi`
3. API stores the source type in the ImageLayer Cosmos DB document
4. When imagery processing is triggered, `hastefuncqueues` passes the ImageLayer to `ImageryPostProcessor`
5. The processor calls `ImageryWorkflow` with `source_type_pre_event="airbus"` / `source_type_post_event="airbus"`
6. The workflow calls:
   - `_determine_scale_rgb_params("airbus")` → `True`
   - `ImageryUtils.convert_to_rgb_cog(...)` with `source_type="airbus"` and `scale_rgb_params=True`
   - Inside `convert_to_rgb_cog`:
     - `get_rgb_band_indexes()` → `[1, 2, 3]` (R, G, B from 4-band)
     - `get_scale_imagery_params()` → `[[0, 5000, 0, 255], [0, 5000, 0, 255], [0, 5000, 0, 255]]`
   - `get_normalization_means()` → `[0, 0, 0, 65535]`
   - `get_normalization_std_devs()` → `[5000, 5000, 5000, 1]`
7. The RGB COG and normalization stats are uploaded to Blob Storage

### Edge Cases

| Case | Expected Behavior |
|---|---|
| Airbus 3-band imagery (already RGB) | Process with default band order [1, 2, 3], apply scaling |
| Airbus 1-band panchromatic | Fall through to GDAL color interpretation fallback |
| Pixel values exceeding 5000 | Clipped to 255 by GDAL Translate (`outputType=GDT_Byte`) |
| Non-Airbus imagery selected as Airbus | Incorrect scaling, but no crashes — same risk as any wrong source type selection |

### Error Handling

No new error conditions are introduced. All new code paths follow existing patterns:
- `get_rgb_band_indexes()` returns specific bands or falls through to GDAL fallback
- `get_scale_imagery_params()` returns hardcoded params (no GDAL read needed for Airbus)
- `get_normalization_means/stds()` return static values (no GDAL read needed for Airbus)

## Configuration

No new configuration keys. The source type is stored as a string value in existing fields.

## Observability

No changes to observability. Existing logging in `ImageryUtils` already logs:
- Band order: `f"Band Order Found ---> {band_order}"`
- Scale params: `f"Scale Params Found ---> {scale_params}"`

## Resolved Questions

- [x] **Band order:** Confirmed [B, G, R, NIR] for all Airbus 4-band products (Pléiades 1A/1B, SPOT 6/7). This is consistent across all Airbus optical satellite products and matches the Maxar/PlanetScope pattern.
- [x] **8-band Pléiades Neo:** Deferred to a follow-up iteration. The issue explicitly scopes to "4 band inputs," and normalization constants were only provided for 4 bands. Pléiades Neo 8-band uses a different band ordering (CB, B, G, Y, R, RE, NIR1, NIR2) that requires separate implementation.
