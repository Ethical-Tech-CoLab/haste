# Feature: Add Airbus as Imagery Source Type

**Status:** draft
**Author:** Copilot
**Date:** 2026-04-27
**Priority:** P1
**Work Item:** [issue-airbus.md](../../../issue-airbus.md)

## Summary

Add Airbus as a new imagery source type option in the HASTE image layer processing pipeline. Airbus imagery arrives as 4-band GeoTIFF (R, G, B, NIR). The processing pipeline should map the first 3 bands from [0, 5000] to [0, 255] for RGB visualization and drop the fourth band. For training on raw Airbus imagery, use provider-specific normalization defaults: means=[0, 0, 0, 65535] and stdevs=[5000, 5000, 5000, 1].

## Motivation

- **Problem:** Disaster response teams working with Airbus satellite imagery (Pléiades, SPOT) cannot process it through HASTE because Airbus is not a recognized source type. They must manually preprocess imagery or select an incorrect source type, leading to incorrect band mapping and poor visualization.
- **Requester:** Caleb Robinson
- **If not built:** Teams receiving Airbus imagery must use external tools to preprocess data before ingesting into HASTE, slowing disaster assessment workflows.

## Success Criteria

- [ ] "Airbus" appears as a selectable source type in the image layer creation form
- [ ] 4-band Airbus imagery is correctly converted to 3-band RGB COG with [0, 5000] → [0, 255] scaling
- [ ] Training on Airbus imagery uses correct normalization defaults (means=[0,0,0,65535], stdevs=[5000,5000,5000,1])
- [ ] Existing source types (Maxar, PlanetScope, SkySat) continue to work unchanged
- [ ] Unit tests cover all Airbus-specific logic paths

## HASTE Components Affected

| Component | Impact |
|---|---|
| `hastelib/src/hastegeo/core/utils/imagery.py` | Add Airbus cases to 4 static methods |
| `hastelib/src/hastegeo/workflows/prepare_imagery.py` | Add `"airbus"` to scale determination |
| `ui/src/Components/CreateEditImageLayerHelper.js` | Add Airbus entry to `sourceTypeOptions` |
| `setup/config_admin_settings.json` | Add Airbus to admin source types |

## Related Specs

None — this is a self-contained imagery provider addition following the established pattern.

## Document Index

| Document | Purpose | Status |
|---|---|---|
| [plan.md](plan.md) | Execution plan, milestones, phases | draft |
| [impact-analysis.md](impact-analysis.md) | Risk, dependencies, blast radius | draft |
| [user-stories.md](user-stories.md) | User stories & acceptance criteria | draft |
| [design.md](design.md) | Technical design & API contracts | draft |
| [data-model.md](data-model.md) | Admin settings schema changes | draft |
| [test-plan.md](test-plan.md) | Test strategy & coverage matrix | draft |
| [rollout.md](rollout.md) | Rollout strategy, flags, rollback | draft |

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-27 | Use key `"airbus"` (lowercase, no underscore) | Consistent with `"maxar"` naming; Airbus is a single word |
| 2026-04-27 | Hardcode scale params [0, 5000, 0, 255] | Follows SkySat pattern of hardcoded scaling rather than percentile-based |
| 2026-04-27 | Add provider-specific normalization means/stds | **REVERSED** — see next row |
| 2026-04-27 | Do NOT hardcode normalization means/stds for Airbus | Keep using computed-from-file behavior (means=all zeros, stdevs=98th percentile) for consistency with all other providers. Avoids introducing a second code path in these functions. If training results are poor with Airbus imagery, revisit this decision — the requester's reference values (means=[0,0,0,65535], stdevs=[5000,5000,5000,1]) are documented in design.md for comparison. |
