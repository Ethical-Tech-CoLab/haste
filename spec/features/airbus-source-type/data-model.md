# Data Model: Add Airbus as Imagery Source Type

## Cosmos DB Changes

### New Containers

None.

### Modified Containers

None. The `sourceTypePreEvent` and `sourceTypePostEvent` fields on `ImageLayer` documents are free-form strings. Adding `"airbus"` as a new value requires no schema changes.

### Existing Document Schema (Unchanged)

**Container:** Projects container
**Document type:** `ImageLayer`

The following fields are relevant to source type handling:

```json
{
  "sourceType": "string — DEPRECATED, use sourceTypePreEvent/sourceTypePostEvent",
  "sourceTypePreEvent": "string — e.g. 'maxar', 'planet_scope', 'airbus'",
  "sourceTypePostEvent": "string — e.g. 'maxar', 'planet_scope', 'airbus'",
  "normalizationMeans": "[int] — per-band mean values for training normalization",
  "normalizationStds": "[int] — per-band stdev values for training normalization"
}
```

No migration needed — `"airbus"` is simply a new valid value for existing string fields.

---

## Blob Storage Changes

None. Processed COGs for Airbus imagery follow the same storage path conventions as all other source types.

---

## Data Lake Changes

None.

---

## Queue Storage Changes

None. The `ImageLayer` JSON message already carries source type fields. No message schema changes needed.

---

## Azure Batch Changes

None. Imagery processing uses the same Docker images regardless of source type.

---

## Admin Settings Changes

### `setup/config_admin_settings.json`

**Add Airbus source type entry:**

```json
{
  "sourceTypeId": 7,
  "name": "Airbus",
  "baseURL": "https://www.intelligence-airbusds.com/",
  "creationDate": "2026-04-27 12:00:00PM"
}
```

This follows the `SourceType` Pydantic model defined in `hastelib/src/hastegeo/core/models/admin.py`:

```python
class SourceType(BaseModel):
    sourceTypeId: int = Field(default=0)
    name: str = Field(default=None)
    baseURL: str = Field(default=None)
    creationDate: str = Field(default=None)
```

**Existing entries:** Maxar (1), Planet (2), NASA ISERV (3), OpenArialMap (4), AWS S3 (5), Azure Blob (6).

---

## Data Flow

No changes to data flow. Airbus imagery follows the same path as all other source types:

### Write Path

```
UI (sourceType="airbus") → hastefuncapi → Cosmos DB (ImageLayer document)
                                        → Queue Storage (ImageLayer JSON message)
                                        → hastefuncqueues → ImageryPostProcessor
                                                          → ImageryWorkflow
                                                          → ImageryUtils (Airbus-specific logic)
                                                          → Blob Storage (RGB COG)
```

### Read Path

```
UI → hastefuncapi → Cosmos DB (ImageLayer metadata)
UI → titilerfuncapi → Blob Storage (COG tiles — source-type-agnostic)
```

## Migration Plan

No migration needed. All changes are additive:
- New dropdown option in UI
- New `elif` branches in Python utility functions
- New entry in admin settings JSON

Existing `ImageLayer` documents with other source types are completely unaffected.

## Data Volume Estimates

No change to data volume. Airbus imagery produces similar-sized RGB COGs as other 4-band providers.

## Caching Strategy

No changes to caching. Source type has no impact on caching behavior.
