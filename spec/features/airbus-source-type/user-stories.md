# User Stories: Add Airbus as Imagery Source Type

## Personas

| Persona | Description | Key Goals |
|---|---|---|
| Disaster Analyst | Domain expert who interprets satellite imagery and produces damage maps | Accurate, fast assessment results using Airbus imagery |
| ML Engineer | Builds and trains models for imagery classification | Efficient training with correct Airbus normalization defaults |
| Admin | Configures system settings, manages base models and source types | System configuration for new Airbus source type |

---

## Stories

### US-001: Select Airbus as Source Type in Image Layer Creation

**As a** Disaster Analyst,
**I want to** select "Airbus" from the source type dropdown when creating an image layer,
**So that** the system correctly processes my Airbus satellite imagery for disaster assessment.

**Priority:** P0
**Component(s):** `ui/src/Components/CreateEditImageLayerHelper.js`, `ui/src/Components/CreateEditImageLayerForm.jsx`

**Acceptance Criteria:**

```gherkin
Given I am creating a new image layer for a project
When I open the "Source type" dropdown for pre-event or post-event imagery
Then I see "Airbus" as a selectable option in the list
```

```gherkin
Given I have selected "Airbus" as the source type
When I submit the image layer creation form
Then the image layer is created with sourceTypePreEvent or sourceTypePostEvent set to "airbus"
```

**Notes:** The dropdown uses `showInDropdown: true` to control visibility. Airbus should be visible.

---

### US-002: Convert Airbus 4-Band Imagery to RGB COG

**As a** Disaster Analyst,
**I want** the system to automatically convert my 4-band Airbus imagery to a 3-band RGB Cloud Optimized GeoTIFF,
**So that** I can visualize the imagery correctly in the HASTE map viewer.

**Priority:** P0
**Component(s):** `hastelib/src/hastegeo/core/utils/imagery.py`, `hastelib/src/hastegeo/workflows/prepare_imagery.py`

**Acceptance Criteria:**

```gherkin
Given a 4-band Airbus GeoTIFF with bands ordered as [Blue, Green, Red, NIR]
When the imagery processing pipeline runs with source type "airbus"
Then the output COG contains only 3 bands reordered to (Red, Green, Blue)
And the 4th band (NIR) is dropped
```

```gherkin
Given a 4-band Airbus GeoTIFF with pixel values in [0, 5000] range
When the imagery is converted to RGB COG with source type "airbus"
Then each RGB band is scaled from [0, 5000] to [0, 255]
And the output data type is Byte (uint8)
```

```gherkin
Given a 3-band Airbus GeoTIFF (already RGB)
When the imagery processing pipeline runs with source type "airbus"
Then the output COG contains 3 bands (Red, Green, Blue) using default band order [1, 2, 3]
```

**Notes:** Band order for 4-band: [B, G, R, NIR] (same as Maxar/PlanetScope — confirmed by Airbus product specifications for Pléiades and SPOT). The `get_rgb_band_indexes()` function returns `[3, 2, 1]` to reorder bands to R,G,B output. Scale params are hardcoded [0, 5000, 0, 255] per band, similar to SkySat's hardcoded [0, 600, 0, 255].

---

### US-003: Compute Normalization for Airbus Imagery Using Existing Pipeline

**As an** ML Engineer,
**I want** the system to compute normalization values for Airbus imagery using the existing per-band computation,
**So that** my damage assessment models train correctly on Airbus imagery without special-casing.

**Priority:** P0
**Component(s):** `hastelib/src/hastegeo/core/utils/imagery.py`

**Acceptance Criteria:**

```gherkin
Given an image layer with source type "airbus"
When normalization means are computed for training
Then the means are computed using the existing logic (all zeros per band)
And no Airbus-specific hardcoded values are introduced
```

```gherkin
Given an image layer with source type "airbus"
When normalization standard deviations are computed for training
Then the stdevs are computed using the existing 98th-percentile-per-band logic
And no Airbus-specific hardcoded values are introduced
```

```gherkin
Given an image layer with source type "maxar" or any other existing type
When normalization means and stdevs are computed
Then the existing behavior is unchanged
```

**Notes:** Decision: keep computed-from-file behavior for normalization rather than hardcoding Airbus-specific values. This avoids introducing a second code path and maintains consistency across all providers. If training results with Airbus imagery are poor, revisit this decision — the requester's reference values (means=[0,0,0,65535], stdevs=[5000,5000,5000,1]) are documented in design.md for comparison.

---

### US-004: Configure Airbus in Admin Settings

**As an** Admin,
**I want** Airbus to be included in the admin source types configuration,
**So that** the system recognizes Airbus as a valid imagery provider.

**Priority:** P1
**Component(s):** `setup/config_admin_settings.json`, `hastelib/src/hastegeo/core/models/admin.py`

**Acceptance Criteria:**

```gherkin
Given the admin settings configuration
When the system is initialized or settings are viewed
Then Airbus appears in the list of configured source types with a valid source type ID
```

**Notes:** The `config_admin_settings.json` already has entries for Maxar, Planet, NASA ISERV, etc. Add Airbus with the next available `sourceTypeId`.

---

## Agent Assignment Map

### Available Agents

| Agent | Scope | Touches Code? |
|---|---|---|
| `backend-dev` | Python backend, API, processors, data layers, runners | Yes |
| `gis` | Satellite imagery, GDAL/rasterio, provider adapters, damage assessment | Yes |
| `ui` | React/FluentUI/Azure Maps/MSAL, frontend only | Yes |
| `backend-validation` | Validates backend code against specs, conventions, tests | No (validates only) |
| `ui-validation` | Validates frontend changes against expected behavior | No (validates only) |

### Story → Agent Mapping

| Story | Implementing Agent(s) | Validating Agent(s) | Notes |
|---|---|---|---|
| US-001 | `ui` | `ui-validation` | UI dropdown change only |
| US-002 | `gis` | `backend-validation` | Core imagery processing — GDAL band mapping and scaling |
| US-003 | `gis` | `backend-validation` | Normalization stats for training pipeline |
| US-004 | `backend-dev` | `backend-validation` | Admin config JSON update |

### Agent Workflow Per Phase

| Phase | Lead Agent | Supporting Agents | Validation |
|---|---|---|---|
| Phase 1 — Core Library | `gis` | `backend-dev` | `backend-validation` |
| Phase 2 — Config & Admin | `backend-dev` | — | `backend-validation` |
| Phase 3 — UI | `ui` | — | `ui-validation` |

## Story Map

| Priority | Story | Phase | Implementing Agent | Component |
|---|---|---|---|---|
| P0 | US-002 | Phase 1 — Core Library | `gis` | `hastelib` |
| P0 | US-003 | Phase 1 — Core Library | `gis` | `hastelib` |
| P1 | US-004 | Phase 2 — Config & Admin | `backend-dev` | `setup/` |
| P0 | US-001 | Phase 3 — UI | `ui` | `ui/src/Components/` |

## Out of Scope

- Adding support for Airbus multi-spectral bands beyond 4 bands (e.g., 8-band Pléiades Neo)
- Automatic detection of Airbus imagery format without user selection
- Airbus API integration for direct imagery download
- Tile server (`titilerfuncapi`) changes — COG tiles are served generically regardless of source type
