# Peer Review: HASTE — High-speed Assessment and Satellite Tracking for Emergencies (Rapid Post-Disaster Building Damage Assessment)

**Status:** Current review of record. This document supersedes the full referee report of 22 July 2026 and the copyediting review of 30 July 2026, both of which are now closed. Their findings are carried below with what was done about each. The superseded documents remain in this repository's git history.

**Reviewed as:** Referee and copy editor for a plain-language research report prepared under the Ethical Tech CoLab (NYU Center for Global Affairs). The software is Microsoft's and out of scope; what is under review is the report's exposition, framing, and intellectual honesty.

**Text of record:** `src/content/publications/haste.ts` in `Ethical-Tech-CoLab/website`, which is the source of truth for the report. `HASTE-Paper.md` in this repository is generated from it via `npm run export:haste-paper`.

**Last updated:** 31 July 2026

**Overall assessment:** Both rounds of findings have been applied. The report is materially more honest than it was in draft (it now names the provenance of its evidence, defines its headline metric, and positions itself against the right literature) and roughly a fifth shorter, with the repetition that diluted it removed. It is publishable as it stands. What remains is a short list of open items, none of which blocks publication, and one of which is a verification the author must do rather than the reviewer.

---

## Summary of the text

A non-technical exposition of HASTE, an open-source rapid post-disaster building damage assessment platform built by the Microsoft AI for Good Lab. Fifteen numbered sections take the reader from the humanitarian problem (§00 to §02), through the two-route workflow (§04), a parameter-by-parameter account of every adjustable and hardcoded setting (§05), how to read the outputs (§06), the data the platform depends on (§07), the developer-reported evidence (§08), governance (§09), limitations (§10), deployment, audience, an application to the CoLab's own Mariupol work (§13), and the conclusion (§14).

Its argument is that HASTE's contribution is a reallocation of labour rather than a modelling advance, and that its ceiling is set by imagery resolution and building-outline coverage rather than by the software.

## Strengths, which the revisions preserved

1. **The explanatory idiom survived the compression, which was the risk.** "An embedding is a compact list of numbers that describes what the imagery around that building looks like: its texture, its colour, its edges." (§04) The de-duplication pass kept the best-written instance of each repeated claim rather than the first, so nothing of this quality was lost to the cuts.

2. **Concrete nouns over abstraction.** "Which roads lead to places that no longer exist?" (§00). "It is taught not to claim to see through weather." (§05). "Debris and scorch marks sit there rather than on the roof." (§05).

3. **§05 remains the report's centrepiece** and is now better organised: three settings that were buried inside other entries have their own labelled leads, and two colliding entry names have been separated.

4. **The house style holds throughout.** No em dashes, no dash ranges, no inline bold outside the lead-ins, British spelling. The added §13 follows it too.

---

## Round one: full referee report (22 July 2026). All four major issues closed.

**1. The headline metric was never defined. [§08, stat band] — APPLIED.** "Discrimination score" now carries a full gloss: it is named as area under the receiver operating characteristic curve, defined in plain terms ("the probability that the model ranks a randomly chosen damaged building above a randomly chosen intact one"), given its range and chance baseline, and paired with the caveat that ranking well says nothing about where a threshold should sit. The stat band label was cut back to "area under the ROC curve at one per cent of labels, against 0.88 fully supervised (§08)".

**2. §08 mixed validated accuracy with deployment counts, and the stat band spun a deficit as parity. [§08] — APPLIED.** §08 is now split under "Validated accuracy" and "Deployment record", the latter opening with the statement that the figures which follow are evidence of adoption rather than correctness. The prose no longer says a handful of labels can "match" a conventionally trained model; it states the 0.84-against-0.88 result as a modest deficit and locates parity at ten per cent.

**3. The gap was framed against only two comparators. [§02] — APPLIED.** §02 now names the xView2 challenge and the automated damage-classification literature built on xBD as the nearer comparator, and states the honest claim: not that nothing existed, but that existing approaches assume a globally pretrained model where HASTE trades that for a disposable per-event one.

**4. The report never named its strongest structural limitation. [§08, §10] — APPLIED.** §08 opens with "Everything in this section is the developer's own account," and §10 carries the matching limitation. Both were briefly present at full length, which round two flagged as duplication; §10 is now a cross-reference.

---

## Round two: copyediting and de-duplication (30 July 2026). All findings closed.

Roughly 900 words of duplication removed, plus a pass on sentence-level tics. The file went from 8,856 to 8,576 words before §13 was added, and the cut was entirely repetition.

### Duplication

| # | Finding | Resolution |
|---|---|---|
| D1 | The `thesis` field was the Foreword re-typed, four sentences repeated within a screen of each other | Replaced. The thesis now states what the report does (reads the source code, sets out the settings, tests what the figures establish) rather than restaging §00. Deliberately worded to avoid echoing §13's "reallocation of labour" line either. |
| D2 | "All evidence is developer-supplied" made twice at full length, with one sentence verbatim identical, in §08 and §10 | §08 keeps the full statement; §10 reduced to a cross-reference. |
| D3 | Cloud exclusion stated five times (§04, §05 twice, §06, §13) | §04's bias clause and the §13 list item cut. §05 keeps the rule and the reasoning; §06 keeps its one-phrase inventory item. |
| D4 | Human-in-the-loop stated five times, with §01 and §09 giving the same five-item list in the same order | §01 compressed to one sentence pointing at §09; §09's framing clause cut; §02's duplicate proposition removed. |
| D5 | Per-event non-generalisation stated four times, twice with the same Jamaica-Türkiye example | §01 keeps the full version with the example; §02's first proposition removed; §10 cut to the consequence. |
| D6 | Eight smaller repeats: flood depth, Overture, coordinate system, GeoTIFF, the 50 square metre minimum, spatial misalignment, the not-authoritative caveat, and the stat-band labels | All resolved as recommended. The §10 "Spatial misalignment is routine" entry was deleted outright as a restatement with no new content; the stat-band labels were cut from miniature essays to figures with section pointers. The 50 square metre clause was kept in both places as the borderline case it was flagged to be. |

### Line editing

- **Throat-clearing (L1):** all seven instances removed, including "This section is the heart of the report", "It is worth stating plainly", "These numbers deserve to be read carefully", and "It is worth knowing that".
- **Colliding entry names (L2):** "Buffer, nominally 3 metres" and "Buffer distances, 0, 10, and 20 metres" are now "Label buffer" and "Measurement rings", with an explicit note not to confuse them.
- **Buried variables (L3, L4):** batch size and the 192-pixel crop cap were smuggled into the tails of other entries in a section organised entirely by labelled leads. Both now have their own entries.
- **Overlong sentences (L4):** §02's "The gap" restructured so it no longer argues with an earlier draft in public; §07's four-clause band-order sentence split.
- **Wording (L5):** dangling relative clause in §01, "the calculation" without an antecedent in §04, the trailing "The code comments say so explicitly" in §05, the negative opening of "The final estimate", "interfaces that the interface calls" in §11, and §12's four-item negative list converted to bullets.
- **Passives (L6):** three reversed, including "several files can be uploaded" to "the analyst can upload several files". The normalisation passive was left alone, as flagged.
- **Tables:** numbered Table 1 and Table 2, and §08 now refers to Table 1 by number rather than "the table below".
- **Cross-references:** added to §01, §07, §10, and the stat band, which is what made several of the de-duplications possible.

### Internal inconsistencies

1. **Cloud strictness stated two ways (§04 implied a readability judgment, §05 stated an absolute rule) — RESOLVED** by cutting §04's clause.
2. **§08 said only Rolling Fork carried field ground truth, while the Melissa table was captioned "Validated results" — RESOLVED PROVISIONALLY.** The caption now reads "Table 2. Two of the areas assessed during the Hurricane Melissa response," which removes the contradiction without asserting anything unverified. See open item 1.

---

## Since the reviews: what changed in the report

**§13, "Application: the Mariupol Corridor Severity Model", was added** at the author's request, and the Conclusion renumbered to §14. It describes how HASTE bears on the CoLab's Mariupol Corridor Severity Model, whose infrastructure-damage component interpolates a straight line between five UNOSAT anchor points across a seventy-seven-day siege.

As reviewer I note that the section is written as scoping rather than as a completed integration, and that this is the correct call on the evidence available: HASTE appears nowhere in `Mariupol-Severity-Model-Paper.md` or in the `mariupol-evacuation-model` repository, and the only public claim is the July newsletter's "we are prototyping". A report whose §08 and §10 criticise the developers for not marking the provenance of their evidence cannot itself present prospective work as done. The section states plainly that no HASTE-derived figure currently enters the model, lists five preconditions before one could, and names the risk that a denser damage curve reads as better evidenced than it is. A note in the file header instructs future editors not to upgrade its tense without a result to point at.

**The paper and the published report were reconciled.** `HASTE-Paper.md` in this repository was still the original draft, carrying none of the round-one revisions and none of round two. It has been regenerated from the content module, with all 272 content strings verified present, and an `npm run export:haste-paper` script now renders one from the other so the two cannot silently drift again.

---

## Open items

None of these blocks publication. The first is the only one that requires the author rather than an editor.

1. **[Verification Required] Confirm how the Hurricane Melissa precision and recall figures were validated.** §08 states that only the Rolling Fork assessment carries an accuracy measurement against field ground truth, so the Melissa figures presumably come from HASTE's own human validation sample. If that is right, saying so explicitly in the Table 2 caption is better than the neutral wording now standing in. Check against arXiv:2607.11838.

2. **[Verification Required] "Carried over from earlier in-browser damage-assessment research at the same laboratory" (§02).** The original "emerged from" was vague and was sharpened, but whether the propositions are stated in that earlier work or are the author's reading of it was never confirmed.

3. **§13's tense, when there is a result.** If the prototyping produces assessed dates, sourced imagery, or a validation sample, the section should be rewritten around the actual work, and the note in the file header removed.

4. **Reading-time or length signal.** Absent on a report of this size aimed at practitioners reading under time pressure. Minor.

5. **A source line under the stat band.** The four figures now carry section pointers in their labels, which mostly covers the original suggestion; a single "Figures from §05 and §08" note under the band would finish it.

6. **Paragraph numbering in the generated paper.** Regenerating `HASTE-Paper.md` from the content module replaced the old `5.1.1` and `8.2` style numbering with the published report's structure. Content matches exactly; the numbering convention is gone. Restore it in the generator if it mattered.

---

## What to take forward

**The duplication had a single cause, and naming it is the durable lesson.** Every claim repeated three or four times in the draft was a claim the author cared about: the cloud-exclusion rule, the human in the loop, the per-event model, the provenance of the evidence. Writing each conviction into every section where it could plausibly belong is a generous instinct that backfires in a document read linearly, because emphasis by repetition reads as insecurity about whether the first statement landed. Pick the one section where each conviction is load-bearing, make the full case there, and use a clause and a cross-reference everywhere else.

**Section-independence is a false requirement.** Much of the repetition existed because each section was written to stand alone. Readers of a numbered report do not need that, and cross-references are cheaper than re-explanation. The revised report demonstrates this: adding six cross-references is what allowed several hundred words to come out.

**Trust the reader's attention.** The throat-clearing pattern was the sentence-level version of the same anxiety. The report's sentences are good enough that they do not need to be introduced.

**One habit worth keeping, visible in how round one was handled.** The instruction to add the provenance caveat to "§08 or §10" produced it in both, at full length, which round two then had to remove. When a fix names alternative locations, choose one.

---

## References

1. Microsoft AI for Good Lab. *HASTE: A Platform for Rapid Post-Disaster Building Damage Assessment.* arXiv:2607.11838. **[Verification Required]** — cited from the report under review; the identifier was not independently confirmed.
2. Rolf, Esther, et al. "A Generalizable and Accessible Approach to Machine Learning with Global Satellite Imagery." *Nature Communications*, vol. 12, 2021.
3. Oquab, Maxime, et al. "DINOv2: Learning Robust Visual Features without Supervision." Meta AI, 2023.
4. Gupta, Ritwik, et al. "xBD: A Dataset for Assessing Building Damage from Satellite Imagery." 2019.
5. Ethical Tech CoLab. *Mariupol Corridor Severity Model.* github.com/Ethical-Tech-CoLab/mariupol-evacuation-model.

*Note on format: real Word footnotes are not available through the tooling used to produce this document, so references appear here rather than at the foot of the page.*
