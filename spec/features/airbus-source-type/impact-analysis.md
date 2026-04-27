# Impact Analysis: Add Airbus as Imagery Source Type

## Scope of Change

### HASTE Components Affected

| Component | Path | Type of Change | Severity |
|---|---|---|---|
| Core library | `hastelib/src/hastegeo/core/utils/imagery.py` | modified | low |
| Core library | `hastelib/src/hastegeo/workflows/prepare_imagery.py` | modified | low |
| React UI | `ui/src/Components/CreateEditImageLayerHelper.js` | modified | low |
| Admin config | `setup/config_admin_settings.json` | modified | low |

## Azure Service Impact

No Azure service changes. Airbus imagery flows through the same pipeline as all other source types:
- Cosmos DB: No schema changes — `sourceType` is an existing free-form string field
- Blob Storage: No container changes — processed COGs use the same storage paths
- Queue Storage: No message format changes — `ImageLayer` JSON already carries source type
- Azure Batch: No pool config changes — imagery processing uses the same Docker images

## Dependency Analysis

### Upstream Dependencies (things this feature needs)

| Dependency | Type | Status | Risk if Unavailable |
|---|---|---|---|
| `hastegeo` core module | library | available | None — modifying existing code |
| GDAL/rasterio | library | available | None — already installed |
| Sample Airbus GeoTIFF | test data | needed | Cannot verify correct band mapping without it |

### Downstream Impact (things affected by this feature)

| Consumer | How Affected | Breaking? | Migration Needed? |
|---|---|---|---|
| `hastefuncapi` callers | New valid value for sourceType fields | no | no |
| React UI components | New dropdown option | no | no |
| Docker Compose stack | No changes | no | no |
| Existing Cosmos documents | Unaffected — only new image layers use "airbus" | no | no |
| Existing source types | Unaffected — all changes are additive `elif` branches | no | no |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Airbus band order differs across products | Medium | Medium | Document assumed band order [R,G,B,NIR]; confirm with requester | `gis` |
| Hardcoded scaling [0,5000] clips bright pixels | Low | Low | Same approach as SkySat [0,600]; GDAL Translate handles clipping | `gis` |
| Normalization defaults incorrect for some Airbus products | Low | Medium | Values provided by requester (Caleb Robinson); can be adjusted per-project | `gis` |
| Regression in existing source types | Very Low | High | Unit tests cover existing providers; all changes are additive | `backend-validation` |

## Performance Impact

- **API latency:** No change — source type is passed through as a string
- **Queue throughput:** No change — same processing pipeline
- **Tile serving:** No change — COGs are served generically by TiTiler
- **Batch compute:** No change — same Docker images and GPU pools
- **Storage I/O:** Slight improvement for Airbus — hardcoded scale params skip percentile computation (one fewer band read per file)

## Security Impact

- [x] New API endpoints exposed? **No** — no new endpoints
- [x] New data classification handled? **No** — satellite imagery same as existing
- [x] MSAL/Entra ID auth changes? **No**
- [x] New secrets or connection strings required? **No**
- [x] CORS configuration changes in SWA? **No**
- [x] New federated credentials needed? **No**

## Compliance & Data Impact

- [x] Geospatial data sovereignty concerns? **No** — Airbus imagery is processed the same as other providers
- [x] Partner data sharing agreements affected? **No**
- [x] New data retention requirements? **No**
- [x] Audit logging for new operations? **No** — existing logging covers all source types
- [x] Component Governance scan implications? **No** — no new Python/npm dependencies

## Rollback Assessment

- **Reversibility:** Fully reversible
- **Cosmos data:** No migration needed. Image layers created with `sourceType: "airbus"` would still exist but would fall through to GDAL default handling (may produce suboptimal but not broken results)
- **Blob data:** No special cleanup — processed COGs are normal GeoTIFFs
- **API:** Fully backward-compatible — removing "airbus" from UI just hides the option
- **Estimated rollback time:** Immediate (revert PR)
