# User Stories: [Feature Title]

## Personas

| Persona | Description | Key Goals |
|---|---|---|
| Disaster Analyst | Domain expert who interprets satellite imagery and produces damage maps | Accurate, fast assessment results |
| ML Engineer | Builds and trains models for imagery classification | Efficient training workflows, model versioning |
| Project Manager | Oversees disaster response projects, manages team access | Project visibility, user management |
| Admin | Configures system settings, manages base models and source types | System configuration, model catalog |
| External Partner | Collaborator with limited access to specific projects | View results, provide labels |

> Keep only personas relevant to this feature.

---

## Stories

### US-001: [Story Title]

**As a** [persona],
**I want to** [action],
**So that** [benefit to disaster assessment workflow].

**Priority:** P0 | P1 | P2 | P3
**Estimate:** [points or t-shirt size]
**Component(s):** `hastefuncapi` / `ui/src/Components/...` / `hastelib` / ...

**Acceptance Criteria:**

```gherkin
Given [precondition — e.g. a project exists with uploaded imagery]
When [action — e.g. I click "Run Inference" on an image layer]
Then [expected result — e.g. a queue message is created and processing starts]
```

```gherkin
Given [error/edge case precondition]
When [action]
Then [expected error handling]
```

**UI Wireframe:** [link or description if applicable]

**Notes:** [edge cases, design references, related Components]

---

### US-002: [Story Title]

**As a** [persona],
**I want to** [action],
**So that** [benefit].

**Priority:** P0 | P1 | P2 | P3
**Estimate:** [points or t-shirt size]
**Component(s):** 

**Acceptance Criteria:**

```gherkin
Given [precondition]
When [action]
Then [expected result]
```

**Notes:**

---

### US-003: [Story Title]

**As a** [persona],
**I want to** [action],
**So that** [benefit].

**Priority:** P0 | P1 | P2 | P3
**Estimate:** [points or t-shirt size]
**Component(s):**

**Acceptance Criteria:**

```gherkin
Given [precondition]
When [action]
Then [expected result]
```

**Notes:**

---

## Story Map

| Priority | Story | Persona | Phase | Component |
|---|---|---|---|---|
| P0 | US-001 | | Phase 1 — Core Library | `hastelib` |
| P1 | US-002 | | Phase 2 — API | `hastefuncapi` |
| P2 | US-003 | | Phase 3 — UI | `ui/src/Components/` |

## Out of Scope

Stories explicitly excluded from this feature:

- [ ] [Description — reason for exclusion]
