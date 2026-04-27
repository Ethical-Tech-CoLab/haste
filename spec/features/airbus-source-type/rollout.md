# Rollout Plan: Add Airbus as Imagery Source Type

## Rollout Strategy

**Type:** big-bang
**Rationale:** Low-risk additive change. No data migration, no feature flags needed. All changes are backward-compatible.

## Deployment Targets

| Component | Deployment Method | Target |
|---|---|---|
| `hastelib` | pip install / Docker rebuild | All Function Apps |
| React UI | GitHub Actions `deploy-apps.yml` | Azure Static Web Apps |

## Feature Flags

None needed. The change is purely additive:
- New dropdown option in UI (existing options unaffected)
- New `elif` branches in Python (existing code paths unaffected)

## Rollout Phases

### Phase 1: Dev1 Environment

- **Target:** SWA `dev1` environment
- **Deployment:**
  1. Merge PR to `main` (triggers `deploy-apps.yml`)
  2. Verify in dev1 SWA
- **Success criteria:**
  - [ ] "Airbus" appears in source type dropdown
  - [ ] Creating an image layer with "Airbus" source type succeeds
  - [ ] Processing 4-band Airbus imagery produces correct RGB COG
  - [ ] Existing source types (Maxar, PlanetScope, SkySat) continue to work
- **Rollback trigger:** Any regression in existing source type processing

### Phase 2: Testing Environment

- **Target:** SWA `testing` environment
- **Success criteria:**
  - [ ] End-to-end test with real Airbus imagery (if available)
  - [ ] Normalization values correct in training config output
  - [ ] No Cosmos data corruption
- **Rollback trigger:** Incorrect band mapping or scaling with real Airbus data

### Phase 3: Production

- **Target:** Production SWA + Function Apps
- **Federated credentials:** `fed-cred-main.json` (GitHub Actions OIDC)
- **Success criteria:**
  - [ ] All health checks green
  - [ ] Error rate stable
  - [ ] Users can successfully process Airbus imagery

## Rollback Plan

| Step | Action | ETA |
|---|---|---|
| 1 | Revert PR / deploy previous commit | <15 min |
| 2 | Verify existing source types work | <5 min |

**Cosmos data rollback required?** No — no schema changes
**Blob artifacts cleanup needed?** No — processed COGs are normal GeoTIFFs

## Monitoring & Alerting

No new alerts needed. Existing Azure Functions monitoring covers Airbus processing through the same pipeline as all other source types.

### Key Metrics to Watch

| Metric | Source | Baseline | Alert Threshold |
|---|---|---|---|
| API error rate | Azure Functions metrics | Current baseline | No change expected |
| Queue processing failures | Azure Queue Storage metrics | Current baseline | Any new failures |
| Imagery processing errors | `hastegeo` logs | Current baseline | New error patterns |

## Communication Plan

| Audience | Channel | When | Message |
|---|---|---|---|
| Engineering team | GitHub PR | Pre-deploy | PR description with changes |
| Requester (Caleb Robinson) | GitHub issue | Post-deploy | Feature available, usage instructions |
| Disaster analysts | Teams / docs | At GA | "Airbus" now available as source type |

## Post-Rollout Checklist

- [ ] GitHub issue closed
- [ ] `CHANGELOG.md` updated
- [ ] Spec status updated to `released`
