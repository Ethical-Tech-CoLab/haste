# Decision-model recommendation: metadata triage, not damage inference

Date: 2026-10-11. Public-source proposal.
Reviewed [README](https://github.com/Ethical-Tech-CoLab/haste/blob/0018619816db7a70ce8e1ed70d3f411cec85c184/README.md).
Scope: this public fork's research workflow, not upstream deployment or a
scientific validation of remote-sensing models.

## Bounded use

Consider text-only source/metadata relevance review for an already-retrieved
scene or assessment report: is it relevant to the named event, area and time,
or is evidence insufficient? Keep exact spatial intersections, date arithmetic,
sensor constraints and image processing deterministic/purpose-built.

Jev, Microsoft-Decision-1 and Sage are not substitutes for the project's
remote-sensing inference or pixel-level damage validation. Do not convert
metadata relevance into damage probability, emergency route safety or an
authoritative disaster map.

## Evaluation

Compare exact metadata filters and manual review with a licensed local
classifier and approved hosted bounded models. Jev's
[reranking recipe](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md)
is a design reference only.

Split by event, scene and sensor/source family. Include pre-event images,
cloud/coverage limitations, wrong geography and unverified report claims.
Measure missed relevant evidence, false selection, calibration, analyst effort
and full query cost. Respect image/report licensing and processing boundaries.

## Gate

No imagery interpretation, production access, deployment settings or local
development security defaults change. Start offline using public metadata.
Preserve upstream attribution and separate experimental annotations from model
outputs. Exact proprietary decision checkpoints are not local models; no
measured saving or operational qualification is claimed.
