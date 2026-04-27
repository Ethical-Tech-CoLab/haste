# Test Plan: Add Airbus as Imagery Source Type

## Test Strategy

| Level | Scope | Tool/Framework | Coverage Target |
|---|---|---|---|
| Unit | `hastegeo` core imagery utils | pytest (`hastelib/tests/`) | 100% of new Airbus code paths |
| Unit | `hastegeo` prepare_imagery workflow | pytest (`hastelib/tests/`) | Scale determination function |
| UI | Source type dropdown rendering | Manual / Playwright | Dropdown shows Airbus option |

## Test Scenarios

### Unit Tests (`hastelib/tests/`)

#### Band Mapping Tests

| ID | Module | Scenario | Input | Expected Output | Story Ref |
|---|---|---|---|---|---|
| UT-001 | `core/utils/imagery.py` | Airbus 4-band → RGB band indexes | 4-band GeoTIFF, source_type="airbus" | `[3, 2, 1]` (B,G,R,NIR → R,G,B) | US-002 |
| UT-002 | `core/utils/imagery.py` | Airbus 3-band → RGB band indexes | 3-band GeoTIFF, source_type="airbus" | `[1, 2, 3]` | US-002 |
| UT-003 | `core/utils/imagery.py` | Airbus 1-band → fallback | 1-band GeoTIFF, source_type="airbus" | GDAL color interpretation fallback | US-002 |

#### Scale Parameter Tests

| ID | Module | Scenario | Input | Expected Output | Story Ref |
|---|---|---|---|---|---|
| UT-004 | `core/utils/imagery.py` | Airbus scale params | 4-band GeoTIFF, source_type="airbus" | `[[0, 5000, 0, 255], [0, 5000, 0, 255], [0, 5000, 0, 255]]` | US-002 |
| UT-005 | `workflows/prepare_imagery.py` | Airbus needs scaling | source_type="airbus" | `True` | US-002 |

#### Normalization Tests

| ID | Module | Scenario | Input | Expected Output | Story Ref |
|---|---|---|---|---|---|
| UT-006 | `core/utils/imagery.py` | Airbus normalization means (computed) | 4-band Airbus file, source_type="airbus" | `[0, 0, 0, 0]` (all zeros, same as all providers) | US-003 |
| UT-007 | `core/utils/imagery.py` | Airbus normalization stdevs (computed) | 4-band Airbus file, source_type="airbus" | 98th percentile per band (same as all providers) | US-003 |

#### Regression Tests (existing providers unchanged)

| ID | Module | Scenario | Input | Expected Output | Story Ref |
|---|---|---|---|---|---|
| UT-008 | `core/utils/imagery.py` | Maxar 4-band unchanged | 4-band GeoTIFF, source_type="maxar" | `[3, 2, 1]` (B,G,R,NIR → R,G,B) | Regression |
| UT-009 | `core/utils/imagery.py` | PlanetScope 4-band unchanged | 4-band GeoTIFF, source_type="planet_scope" | `[3, 2, 1]` (B,G,R,NIR → R,G,B) | Regression |
| UT-010 | `core/utils/imagery.py` | SkySat scale params unchanged | 4-band GeoTIFF, source_type="planet_skysat" | `[[0, 600, 0, 255], ...]` | Regression |
| UT-011 | `core/utils/imagery.py` | Default normalization means unchanged | Any file, source_type="maxar" | `[0, 0, 0, ...]` (all zeros) | Regression |
| UT-012 | `core/utils/imagery.py` | Default normalization stdevs unchanged | Any file, source_type="maxar" | 98th percentile per band | Regression |
| UT-013 | `workflows/prepare_imagery.py` | Non-Airbus scale determination unchanged | source_type="maxar" | `False` | Regression |

#### End-to-End Conversion Test

| ID | Module | Scenario | Input | Expected Output | Story Ref |
|---|---|---|---|---|---|
| UT-014 | `core/utils/imagery.py` | Airbus 4-band → RGB COG conversion | Synthetic 4-band GeoTIFF with values in [0, 5000] | 3-band RGB COG with values in [0, 255] | US-002 |

### UI Component Tests

| ID | Component | Scenario | User Action | Expected Behavior | Story Ref |
|---|---|---|---|---|---|
| UI-001 | `CreateEditImageLayerForm` | Airbus in dropdown | Open source type dropdown | "Airbus" appears in the list | US-001 |
| UI-002 | `CreateEditImageLayerForm` | Select Airbus | Click "Airbus" option | `sourceTypePostEvent` set to `"airbus"` | US-001 |

### Edge Case & Negative Tests

| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| EDGE-001 | Airbus with pixel values > 5000 | GeoTIFF with max value 10000 | Clipped to 255 by GDT_Byte output type |
| EDGE-002 | Airbus with pixel values = 0 | GeoTIFF with all-zero band | Scaled to 0 (black) — valid output |
| EDGE-003 | Unknown source type falls through | source_type="unknown_provider" | Falls to GDAL color interpretation fallback |

## Test Data Requirements

| Dataset | Description | Source | Sensitive? |
|---|---|---|---|
| Synthetic 4-band GeoTIFF | 4-band [R,G,B,NIR] with values in [0, 5000] | Generated programmatically with rasterio | no |
| Synthetic 3-band GeoTIFF | 3-band [R,G,B] with values in [0, 5000] | Generated programmatically with rasterio | no |
| Synthetic 1-band GeoTIFF | 1-band panchromatic | Generated programmatically with rasterio | no |

**Test data generation approach:**

```python
import numpy as np
import rasterio
from rasterio.transform import from_bounds

def create_synthetic_airbus_tif(path, num_bands=4, width=64, height=64):
    """Create a synthetic Airbus-like GeoTIFF for testing."""
    data = np.random.randint(0, 5000, (num_bands, height, width), dtype=np.uint16)
    transform = from_bounds(-122.5, 37.5, -122.4, 37.6, width, height)
    with rasterio.open(
        path, 'w', driver='GTiff', height=height, width=width,
        count=num_bands, dtype='uint16', crs='EPSG:4326', transform=transform,
    ) as dst:
        dst.write(data)
```

## Coverage Matrix

| User Story | Unit | UI | E2E |
|---|---|---|---|
| US-001 | — | UI-001, UI-002 | — |
| US-002 | UT-001, UT-002, UT-003, UT-004, UT-005, UT-014 | — | — |
| US-003 | UT-006, UT-007 | — | — |
| US-004 | — | — | — |

## Environment Requirements

| Environment | Purpose | Config |
|---|---|---|
| Local (pytest) | Unit tests | `hatch run test:pytest` in `hastelib/` |
| Local (UI dev) | Manual UI testing | `swa start` with `npm run dev` |

## Sign-off Criteria

- [ ] All P0 stories have unit test coverage
- [ ] All Airbus-specific logic paths tested
- [ ] Existing source type tests continue to pass (regression)
- [ ] `hatch run test:pytest` passes in `hastelib/`
- [ ] `npm run lint` passes in `ui/`
- [ ] No P0/P1 bugs open
