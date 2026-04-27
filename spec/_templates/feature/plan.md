# Execution Plan: [Feature Title]

## Phases

### Phase 1: Core Library — [target date]

**Goal:** Implement core logic in `hastelib/src/hastegeo/`.

| Task | Owner | Estimate | Dependencies | Status |
|---|---|---|---|---|
| Add/modify data models in `hastegeo/core/models/` | | | | not-started |
| Implement processors in `hastegeo/core/processors/` | | | | not-started |
| Add data layer access in `hastegeo/core/data_layer/` | | | | not-started |
| Write unit tests in `hastelib/tests/` | | | | not-started |

**Exit Criteria:**
- [ ] All unit tests pass
- [ ] Core logic works independently of API layer

### Phase 2: API Layer — [target date]

**Goal:** Expose feature via `hastefuncapi` HTTP routes and/or `hastefuncqueues` triggers.

| Task | Owner | Estimate | Dependencies | Status |
|---|---|---|---|---|
| Add HTTP endpoints to `api/hastefuncapi/function_app.py` | | | Phase 1 | not-started |
| Add queue triggers to `api/hastefuncqueues/function_app.py` (if async) | | | Phase 1 | not-started |
| Update `requirements.txt` if new dependencies | | | | not-started |
| Update Docker images if needed (`docker/api/`, `Dockerfile`) | | | | not-started |

**Exit Criteria:**
- [ ] Endpoints callable via REST
- [ ] Queue processing works end-to-end
- [ ] Works in Docker Compose local stack

### Phase 3: UI — [target date]

**Goal:** Surface feature in React UI.

| Task | Owner | Estimate | Dependencies | Status |
|---|---|---|---|---|
| Add/modify React components in `ui/src/Components/` | | | Phase 2 | not-started |
| Wire API calls via `AppHelper.js` or new util | | | Phase 2 | not-started |
| Update navigation / routing if new page | | | | not-started |

**Exit Criteria:**
- [ ] Feature accessible from UI
- [ ] Works with SWA CLI local dev (`swa start`)

### Phase 4: Integration & Deployment — [target date]

**Goal:** Validate end-to-end and deploy.

| Task | Owner | Estimate | Dependencies | Status |
|---|---|---|---|---|
| End-to-end testing with Docker Compose | | | Phase 3 | not-started |
| Update `docker-compose.yml` if new services | | | | not-started |
| Update GitHub Actions workflows if needed | | | | not-started |
| Update docs in `docs/` | | | | not-started |

**Exit Criteria:**
- [ ] `docker-compose up` starts clean with feature working
- [ ] CI pipeline passes (secret-scan, deploy-apps)
- [ ] Docs updated

## Milestones

| Milestone | Date | Deliverable |
|---|---|---|
| Spec approved | | Signed-off design docs |
| Core library done | | `hastelib` changes merged |
| API layer done | | Endpoints/queues functional |
| UI done | | Feature visible in React app |
| Release | | Deployed to production SWA |

## Resource Requirements

- **People:** [roles needed]
- **Azure services:** [any new services: Batch pools, storage containers, Cosmos collections]
- **GPU compute:** [if model training/inference is involved — specify pool size, VM SKU]
- **External data:** [imagery sources, partner APIs]

## Open Questions

- [ ] Unresolved planning items.
