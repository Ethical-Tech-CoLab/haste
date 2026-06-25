# Execution Plan: Infrastructure as Code Migration (Bicep + azd)

## Phases

### Phase 0: Spec & ADR — done

**Goal:** Lock the approach.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| ADR-0003 (Bicep + azd decision) | `backend-dev` | — | — | completed |
| Feature spec (README, design, user-stories, plan) | `backend-dev` | ADR | — | completed |

**Exit Criteria:**
- [x] ADR recorded in `spec/architecture/decisions/`
- [x] Feature spec drafted

---

### Phase 1: Bicep modules reproducing current state — TBD

**Goal:** Stand up `infra/` Bicep that mirrors the resources created by
`setup_infra.sh`, validated with `what-if` against a live environment.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| **As-built inventory** of live env (RG resources + sub-scope custom roles/assignments incl. ACS and the SWA invitation role) | `backend-dev` | Phase 0 | US-001, US-002 | completed |
| `infra/main.bicep` (subscription scope, RG + module wiring) | `backend-dev` | Inventory | US-001, US-002 | completed |
| `infra/main.bicepparam` (typed params, flags, shared refs) | `backend-dev` | main.bicep | US-002 | completed |
| `modules/identity.bicep` (UMI + built-in role assignments) | `backend-dev` | main.bicep | US-002 | completed |
| `modules/roles.bicep` (custom SWA invitation role + assignment to function identity) | `backend-dev` | identity, frontend | US-006 | completed |
| `modules/network.bicep` (vnet, subnets, nsg, endpoints) | `backend-dev` | main.bicep | US-002 | completed |
| `modules/storage.bicep` (func storage + premium file share + rules) | `backend-dev` | identity, network | US-002 | completed |
| `modules/monitoring.bicep` (Log Analytics + App Insights) | `backend-dev` | main.bicep | US-002 | completed |
| `modules/communication.bicep` (ACS + email service + sender domain) | `backend-dev` | main.bicep | US-002, US-004 | completed |
| `modules/apim.bicep` (service + apis + backends + policies) | `backend-dev` | identity, network | US-002 | completed |
| `modules/functions.bicep` (3 Flex Consumption apps) | `backend-dev` | storage, monitoring | US-002 | completed |
| `modules/batch.bicep` (dual create-vs-BYO account; pool autoscale + container config; pool can be created on an existing shared account via cross-RG scope) | `backend-dev` | identity, network | US-002 | completed |
| `modules/frontend.bicep` (SWA + Maps) | `backend-dev` | main.bicep | US-002 | completed |
| `modules/frontdoor.bicep` (feature-flagged Front Door + WAF) | `backend-dev` | frontend | US-002 | completed |
| Validate `az bicep build` + `what-if` vs live RG | `backend-validation` | All above | US-001 | in-progress |

**Exit Criteria:**
- [x] All modules compile (`az bicep build`)
- [ ] `what-if` against a live environment reports parity (no unexpected deletes), reviewed against the env RG **and** `sharedResourceGroup` when creating a pool on a shared Batch account

---

### Phase 2: azd orchestration + app deploy — TBD

**Goal:** Wire `azure.yaml` so `azd up` provisions and deploys.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| `azure.yaml` (api, titiler, queues, web services) | `backend-dev` | Phase 1 | US-001 | not-started |
| Map Bicep outputs → azd service targets | `backend-dev` | azure.yaml | US-001 | not-started |
| `azd provision` + `azd deploy` end-to-end test | `backend-validation` | azure.yaml | US-001 | not-started |

**Exit Criteria:**
- [ ] `azd up` provisions and deploys a working environment cross-platform
- [ ] Function Apps and SWA reachable

---

### Phase 3: Imperative hooks + email domain — TBD

**Goal:** Port the imperative tail and finish the email sender-domain wiring. No
Key Vault is introduced — derived secrets are deploy-time outputs wired by Bicep.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| `hooks/postprovision.ps1` (APIM operation import) | `backend-dev` | Phase 2 | US-003 | not-started |
| `hooks/postdeploy.ps1` (admin-settings upload + invitation) | `backend-dev` | Phase 2 | US-003 | not-started |
| Wire ACS connection string output → function app settings | `backend-dev` | Phase 1 | US-004 | not-started |
| Custom-domain DNS record hook (only when `emailSenderDomainType=Custom`) | `backend-dev` | Phase 1 | US-004 | not-started |
| Validate hook idempotency + confirm no manual/plain-text secret | `backend-validation`, `security-validation` | hooks | US-003, US-004 | not-started |

**Exit Criteria:**
- [ ] Hooks run idempotently on repeat `azd up`
- [ ] No human-supplied secret; email works with the Azure-managed default

---

### Phase 4: Retire bash + docs — TBD

**Goal:** Remove the legacy scripts and document the azd workflow.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| Remove `setup/setup_infra.sh`, `setup/deploy_apps.sh` | `backend-dev` | Phases 1–3 confirmed | US-005 | not-started |
| Rewrite `setup/README.md` for azd | `backend-dev` | — | US-005 | not-started |
| Update `docs/deployment.md` | `backend-dev` | — | US-005 | not-started |
| Document configuration modes (Batch create-vs-BYO, email sender domain, Front Door flag) in the how-to/configuration guides | `backend-dev` | — | US-005 | not-started |
| Update spec statuses → implemented | `orchestrator` | All | — | not-started |

**Exit Criteria:**
- [ ] Legacy scripts removed
- [ ] Docs describe only the azd workflow

---

### Phase 5 (stretch): CI integration — TBD

**Goal:** Switch the pipeline deploy path to azd.

| Task | Agent | Dependencies | Story Ref | Status |
|---|---|---|---|---|
| Update `.github/workflows/deploy-apps.yml` to `azd provision`/`azd deploy` (retire `.github/scripts/deploy_apps.sh`) | `backend-dev` | Phase 4 | — | not-started |

**Exit Criteria:**
- [ ] Pipeline deploys via azd

---

## Milestones

| Milestone | Date | Deliverable |
|---|---|---|
| Spec approved | TBD | Signed-off design docs + ADR |
| Bicep parity | TBD | `what-if` clean against live env |
| azd up working | TBD | One-command provision + deploy |
| Hooks + email domain | TBD | Imperative tail + ACS sender domain |
| Bash retired | TBD | Legacy scripts removed, docs updated |

## Agent Summary

| Agent | Tasks Owned | Phases |
|---|---|---|
| `backend-dev` | 22 | 0–5 |
| `backend-validation` | 3 | 1, 2, 3 |
| `security-validation` | 1 | 3 |
| `orchestrator` | 1 | 4 |

## Resource Requirements

- **Agents:** `backend-dev`, `backend-validation`, `security-validation`, `orchestrator`.
- **Tools:** Azure CLI, Bicep CLI, Azure Developer CLI (`azd`), PowerShell (`pwsh`).
- **Azure access:** A subscription + a non-production environment for `what-if`
  parity validation.

## Open Questions

- [x] **CI switch — resolved (2026-06-25): separate follow-up.** Kept as Phase 5
      (stretch). Target is `.github/workflows/deploy-apps.yml` (the real deploy
      CI), not `azure-pipelines.yml` (scans only). Cut over as its own PR after
      local `what-if` parity is confirmed.
- [x] **Key Vault — resolved (2026-06-25): dropped.** Provision ACS in-IaC so the
      email connection string is a deploy output, not a stored secret. No Key
      Vault module; managed-identity hardening for ACS + Batch is a follow-up.
- [x] **Resource naming — resolved (2026-06-25): keep `prefix` + `randomSuffix`.**
      Required for `what-if` parity with existing deployments; azd's
      `resourceToken` would rename everything. Suffix may auto-default for new
      envs but stays overridable.
