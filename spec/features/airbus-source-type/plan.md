# Execution Plan: Add Airbus as Imagery Source Type

## Phases

### Phase 1: Core Library

**Goal:** Implement Airbus-specific logic in `hastelib/src/hastegeo/`.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| Add `"airbus"` case to `get_rgb_band_indexes()` in `imagery.py` | `gis` | — | US-002 | done |
| Add `"airbus"` case to `get_scale_imagery_params()` in `imagery.py` | `gis` | — | US-002 | done |
| Verify normalization means/stds work correctly for Airbus (no code change — computed-from-file) | `gis` | — | US-003 | done |
| Add `"airbus"` to `_determine_scale_rgb_params()` in `prepare_imagery.py` | `gis` | — | US-002 | done |
| Write unit tests for all Airbus-specific logic in `hastelib/tests/` | `gis` | All above | US-002, US-003 | done |

**Exit Criteria:**
- [x] All unit tests pass (15/15 via Docker test runner)
- [x] Existing source type tests continue to pass
- [x] Core logic works independently of API layer

### Phase 2: Config & Admin

**Goal:** Register Airbus in admin configuration.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| Add Airbus entry to `setup/config_admin_settings.json` | `backend-dev` | — | US-004 | done |

**Exit Criteria:**
- [x] Admin settings include Airbus with valid `sourceTypeId` (7)

### Phase 3: UI

**Goal:** Surface Airbus option in the image layer creation form.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| Add `"airbus"` entry to `sourceTypeOptions` in `CreateEditImageLayerHelper.js` | `ui` | Phase 1 | US-001 | done |

**Exit Criteria:**
- [x] "Airbus" appears in source type dropdown
- [x] `npm run lint` passes
- [x] `npm run build` succeeds

## Milestones

| Milestone | Deliverable |
|---|---|
| Spec approved | Signed-off design docs |
| Core library done | `hastelib` changes merged with tests |
| Config done | Admin settings updated |
| UI done | Airbus visible in dropdown |
| Release | Deployed to production SWA |

## Agent Summary

| Agent | Tasks Owned | Phases |
|---|---|---|
| `gis` | 5 | 1 |
| `backend-dev` | 1 | 2 |
| `ui` | 1 | 3 |

## Resource Requirements

- **Agents:** `gis`, `backend-dev`, `ui`, `backend-validation`, `ui-validation`
- **Azure services:** No new services required
- **GPU compute:** Not needed for this feature
- **External data:** Sample 4-band Airbus GeoTIFF for testing

## Resolved Questions

- [x] Obtain a sample Airbus 4-band GeoTIFF for integration testing — synthetic test data used via mock GDAL datasets; real data testing deferred to deployment validation
