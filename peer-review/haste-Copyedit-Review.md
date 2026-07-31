# Peer Review: HASTE — High-speed Assessment and Satellite Tracking for Emergencies (Rapid Post-Disaster Building Damage Assessment)

**Reviewed as:** Copyediting and line-editing pass on a plain-language research report prepared under the Ethical Tech CoLab. Text reviewed: `src/content/publications/haste.ts` in the ETC website repository, the rendered source of the published report. Scope as requested: sentence-level editing and the removal of duplicated and repeated content. Argument, evidence, and framing are out of scope here and were treated as settled by the earlier full review.

**Mode:** Copyediting, with an emphasis on de-duplication.

**Overall assessment:** The prose is already strong: concrete, unhurried, and unusually disciplined about defining its terms. It does not need rewriting. What it needs is compression. The report says several of its best things three and four times, in slightly different words each time, and the repetition is now doing active harm: it dilutes the passages where the point is made best, and it makes a report that could read as tight and authoritative read as circling. I count roughly 900 to 1,100 words of removable duplication, most of it concentrated in five recurring claims. Cutting them, plus a routine pass on throat-clearing, would shorten the report by around a fifth with no loss of content.

**Recommendation:** Ready to publish after a compression pass. Nothing here blocks it.

---

## Summary of the text

A non-technical exposition of HASTE, an open-source rapid post-disaster building damage assessment platform built by the Microsoft AI for Good Lab. Fourteen numbered sections take the reader from the humanitarian problem (§00 to §02), through the two-route workflow (§04), a parameter-by-parameter account of every adjustable and hardcoded setting (§05), how to read the outputs (§06), the data the platform depends on (§07), the developer-reported evidence (§08), governance (§09), limitations (§10), and deployment, audience, and conclusion (§11 to §13). Its argument is that HASTE's contribution is a reallocation of labour rather than a modelling advance, and that its ceiling is set by imagery resolution and building-outline coverage rather than by the software.

## Strengths worth protecting in the edit

1. **The explanatory idiom is genuinely good and should not be flattened by compression.** "An embedding is a compact list of numbers that describes what the imagery around that building looks like: its texture, its colour, its edges. Two buildings that look alike receive similar lists of numbers." (§04) That is two sentences doing the work of a page. Same for the AUROC gloss in §08 and the finite-population correction in §05 ("if you have checked half of all the buildings by hand, your uncertainty about the other half should be smaller"). When you cut duplicates, keep the instance with the best sentences, not the first one.

2. **Concrete nouns over abstraction, consistently.** "Which roads lead to places that no longer exist?" (§00). "It is taught not to claim to see through weather." (§05, cloud penalty). "Debris and scorch marks sit there rather than on the roof." (§05, context padding). These are the sentences readers will quote.

3. **The house style holds.** No em dashes, no dash ranges, no inline bold, British spelling, spelled-out numbers where they read better. I found no violations. Numerals and words are handled sensibly (figures for parameters, words for prose quantities).

4. **§05 is the report's real asset and is the least repetitive section in it.** Almost everything I flag below is elsewhere. Protect §05's density.

---

## Major issue: duplication

Five claims are each stated three or more times at near-full length. In every case the report has one best version; the others should be cut to a clause or deleted.

### D1. The thesis paragraph is the Foreword, re-typed. [`thesis` field vs §00, all three paragraphs]

This is the largest single duplication and the most visible, because the two sit within a screen of each other on the published page.

> **thesis:** "In the hours after an earthquake, a hurricane, or a wildfire, the single most useful thing a relief coordinator can hold is a map of which buildings are still standing. The traditional answers are slow, and neither reliably delivers inside the first days, which is the window in which decisions about people, supplies, and attention are actually being made. HASTE lets a trained analyst who is not a machine-learning engineer take fresh imagery … This report explains what it does, what each of its settings means, and what it cannot be trusted to do."

> **§00 ¶1:** "In the hours after an earthquake, a hurricane, or a wildfire, the single most useful thing a relief coordinator can hold is a map of which buildings are still standing."
> **§00 ¶2:** "The traditional answers are slow. … but neither reliably delivers inside the first days, which is the window in which decisions about people, supplies, and attention are actually being made."
> **§00 ¶3:** "It lets a trained analyst who is not a machine-learning engineer take fresh satellite or aerial imagery of a disaster zone, mark a small number of examples by hand … This report explains, in non-technical language, what HASTE does, how it does it, what each of its settings means, and what it cannot be trusted to do."

The thesis is not a summary of the Foreword. It is the Foreword with the connective tissue removed. The reader who scrolls past the thesis into §00 immediately reads the same four sentences again, expanded, and learns that the report repeats itself before reaching §01.

*Fix:* keep §00 exactly as written and rewrite the thesis so it does a different job. A thesis field should state the finding, not restage the setup. Suggested replacement, drawn from §13 so it is already in the author's voice:

> **Before:** "In the hours after an earthquake, a hurricane, or a wildfire, the single most useful thing a relief coordinator can hold is a map of which buildings are still standing. The traditional answers are slow, and neither reliably delivers … what it cannot be trusted to do."
>
> **After:** "HASTE is an open-source platform that lets a trained analyst, working without code, fit a disposable machine-learning model to a single disaster and produce a building-by-building damage estimate within hours. Its contribution is not a modelling advance but a reallocation of labour: it moves the engineering out of the way so that scarce expert judgment goes to choosing the imagery, marking the examples, and checking the answer. Its ceiling is set by imagery resolution and building-outline coverage, both weakest where humanitarian need is greatest."

Saves about 110 words and gives the top of the page something the Foreword does not already say.

### D2. "The evidence is all developer-supplied" is made twice at full length, in adjacent sections. [§08 opening lead-in vs §10 first limitation]

> **§08:** "Everything in this section is the developer's own account. The benchmark results, the deployment record, and the field precision and recall figures all originate from the Microsoft paper and repository. None of them has been independently reproduced or externally validated, here or elsewhere …"

> **§10:** "Every performance figure in this report is developer-supplied. … The xBD benchmark results, the deployment record, and the field precision and recall figures all come from the Microsoft paper and repository. Nothing has been independently reproduced, here or elsewhere."

The middle sentence is the same sentence. This one is a special case, because the duplication was almost certainly deliberate: the earlier review asked for the caveat in "§08 or as a bullet in §10," and it landed in both. One is enough, and §08 is the better home, because that is where the reader is looking at the numbers.

*Fix:* keep §08 in full. Replace the §10 entry with a cross-reference of one sentence:

> **After (§10):** "**Every performance figure in this report is developer-supplied.** As §08 sets out, none of the reported results has been independently reproduced. The rest of this report reads the source code first-hand; the performance evidence does not have that standing, and the two should not be given the same weight."

Saves about 70 words and keeps the point where a limitations-skimmer will still meet it.

### D3. The cloud-exclusion rule appears five times. [§04, §05 ×2, §06, §13]

- §04 "Turning pixels into buildings": "records what proportion of each building was obscured by cloud, so that unreadable buildings can be set aside rather than silently counted as undamaged."
- §05 label classes: "cloudy buildings are excluded from the damage statistics rather than counted as intact, which would otherwise bias the result downward …"
- §05 "Cloud exclusion": "Any building with a cloud fraction above zero is excluded from the damage count entirely."
- §06 assessment report: "how many were excluded as cloud-covered"
- §13: "by setting cloud-obscured buildings aside instead of counting them as intact"

Only two of these carry information the others do not: §05 "Cloud exclusion" states the actual rule (any fraction above zero, strict not proportional), and §05's label-class paragraph states the bias argument. The §04 and §13 versions restate the bias argument in full a third and fourth time.

*Fix:* cut the trailing clause in §04 to a bare mechanical statement ("The same step also records what proportion of each building was obscured by cloud."). In §13, cut "by setting cloud-obscured buildings aside instead of counting them as intact," from the list of design choices; the sentence already carries three other items and reads faster with three. Leave §06 alone, it is a one-phrase inventory item. Saves about 45 words and, more usefully, stops the report from arguing a point it already won.

### D4. "A human is required at every step, there is no automatic mode" is made five times. [§01 ¶3, §02 "The response", §09 ¶1, §12 ¶2, §13 ¶1]

> **§01 ¶3:** "A human being is required at every stage. A person chooses the imagery, marks the training examples, inspects the predictions, checks a random sample of them against their own eyes, and decides whether the result is fit to be shared. There is no automatic mode …"

> **§09 ¶1:** "The project documentation is unusually direct that human oversight is structural rather than procedural. There is no autonomous mode. A person selects the imagery, provides every label the model learns from, reviews the predictions, validates a sample, and decides whether to distribute the result."

These two are the same five-item list in the same order, with synonyms substituted. §02's "The response" makes the same claim a third time in its second proposition ("human oversight should be structural rather than advisory"), and §13 a fourth.

*Fix:* the §01 version is the better-written one, but §09 is the section titled "Human Oversight and Governance," so the full account belongs there. Compress §01 to a single sentence and let §09 do the work:

> **After (§01 ¶3):** "A human being is required at every stage, and there is no automatic mode. The project documentation states repeatedly that outputs are preliminary signals requiring expert validation rather than authoritative damage assessments (§09)."

Then cut §09's opening clause "is unusually direct that human oversight is structural rather than procedural" down, since §02 has already made the structural-versus-advisory point and made it better. Saves about 60 words across the two.

### D5. "The model is per-event and does not generalise" is made four times. [§01 ¶2, §02 "The response", §10, §13 ¶1]

§01 ¶2 gives the full argument with the Jamaica-versus-Türkiye example. §02's first proposition restates it as "train per event rather than for the world, accepting narrow, disposable models in exchange for speed and local fit." §10 restates it again with the same two countries: "A model fitted to a Caribbean hurricane is not expected to work on an earthquake in Türkiye." §13 restates it a fourth time ("small, disposable, and fitted to one event").

*Fix:* §01 keeps the full version with the example. §02's first proposition can go entirely, since the paragraph's real content is the second proposition about human oversight, and the sentence that follows it in §02 ("The design also reflects a practical constraint on who does this work") is the fresh material. In §10, cut the Türkiye example and keep only the consequence, which is the part that is new there: "**The model does not generalise, by design.** A model fitted to one event is not expected to transfer to another, which also means HASTE cannot be operated as a standing monitoring system." Saves about 55 words.

### D6. Smaller repeats, each a single-clause cut

| Repeated claim | Locations | Keep |
|---|---|---|
| Flood extent is intersected with buildings but water depth is never estimated | §05 "No Damage and Flood Extent"; §10 "No contextual data" | §10 (where it sits among the other absences). Cut the last sentence of the §05 entry. |
| Building outlines come from Overture, which combines OpenStreetMap with machine-derived footprints | §01 ¶6; §04; §07 "Building outlines" | §04 (fullest, has the 2.3 billion figure). Cut §01 ¶6 to "Building outlines come from the Overture Maps Foundation." §07 keeps only the parts §04 lacks: the anonymous public store, the February 2026 fallback, polygons only. |
| Everything is converted to the standard global coordinate system | §04; §07 | §04. Cut from §07. |
| Only GeoTIFF files are accepted | §04; §07 "Imagery" | §07. Cut from §04, which is already the longest paragraph in the section. |
| The 50 square metre minimum removes small informal structures from the headline count | §05 "Minimum footprint area"; §10 "Building-outline coverage" | §05 (states the rule and the reasoning). In §10, the trailing clause "and the 50 square metre minimum area removes further small structures from the headline figure" can stay, as it is one clause and lands a different point. Borderline; author's call. |
| Outlines and imagery are misaligned by several metres, worst in dense cities and after earthquakes | §05 "Buffer distances"; §10 "Spatial misalignment is routine" | §05 (gives the reason the three buffers exist). The §10 entry is a one-sentence restatement with no new content and can be deleted outright. |
| Outputs are not authoritative and should not be relied on alone | §01 ¶3; §09 ¶2; §10 last entry; §12 ¶3 | §10 and §12 (one is the limitation, one is the scope statement). §01 already trimmed under D4; §09 ¶2 is about the public-distribution notices specifically and can stay if the framing clause is cut. |
| The 0.84-versus-0.88 reading and the 31-deployments caveat | `stats` band labels; §08 | The stat labels are currently miniature essays: "area under the ROC curve from one per cent of labels, against 0.88 fully supervised. Parity arrives at ten per cent, where it reaches 0.91" and "a record of adoption rather than of accuracy, and reported by the platform's own developers." Both restate §08's careful prose in a display element. Cut to "AUROC at one per cent of labels, against 0.88 fully supervised" and "field deployments since early 2023, developer-reported." The nuance survives in §08, which is where an argument belongs. |

---

## Line-level edits

### L1. Throat-clearing before the point

The report has a recurring tic: announcing that something is worth noticing before noticing it. Each instance costs a beat and slightly patronises the reader, who was going to notice anyway.

| Location | Before | After |
|---|---|---|
| §05 ¶1 | "This section is the heart of the report. Every number an analyst can adjust …" | "Every number an analyst can adjust …" (Let the section prove it.) |
| §05 "Ground resolution" | "It is worth stating plainly that HASTE never checks, records, or standardises …" | "HASTE never checks, records, or standardises …" |
| §05 "Maximum epochs" | "… below the enforced minimum. This is worth flagging to anyone reproducing a result." | "… below the enforced minimum, which anyone reproducing a result should know." |
| §05 "Minimum footprint area" | "Note the consequence, which the platform does not hide: small informal structures are absent …" | "The consequence, which the platform does not hide, is that small informal structures are absent …" |
| §08 ¶ after table | "It is worth knowing that this measure says nothing about where the threshold should sit …" | "The measure says nothing about where the threshold should sit …" |
| §08 last ¶ | "These numbers deserve to be read carefully. The variation between Black River and Montego Bay …" | "The variation between Black River and Montego Bay …" |
| §08 "The practical claim" ¶ | "It should be read precisely, because the headline figure is a modest deficit rather than a match: at one per cent …" | "The headline figure is a modest deficit rather than a match: at one per cent …" |

Roughly 60 words, and every one of these sentences gets faster.

### L2. Two different settings are both called "Buffer" in §05

"Buffer, nominally 3 metres" (the tracing-imprecision band applied during training) and "Buffer distances, 0, 10, and 20 metres" (the concentric rings for computing damage fraction) are unrelated mechanisms with near-identical labels, six entries apart. A reader who meets the second will assume it elaborates the first.

*Fix:* rename the leads to break the collision. "Label buffer, nominally 3 metres." and "Measurement rings, 0, 10, and 20 metres." Then open the second with "Not to be confused with the label buffer above." if you want belt and braces, though the renaming alone probably does it.

### L3. The "Learning rate" entry silently contains a second variable

> **§05:** "**Learning rate, default 0.0001.** How large a correction the model makes … The default is a conservative value appropriate to fine-tuning … **Batch size, default 32 for training,** sets how many image tiles the model examines before making one correction."

In a section whose whole organising promise is one labelled entry per variable, batch size is smuggled into the tail of another entry and loses its label. A reader scanning the bold leads for "batch size" will not find it.

*Fix:* split into two entries, "Learning rate, default 0.0001." and "Batch size, default 32 for training." No rewording needed; just break the paragraph.

### L4. Sentences carrying more clauses than they can hold

**§05, "What is actually described"** runs four distinct ideas (tile-grid averaging, empty entries for out-of-frame buildings, position-based matching, the 192-pixel crop cap) through one paragraph, with the editorial verdict "efficient and fragile in equal measure" wedged in the middle. The crop cap has nothing to do with the rest.

> **After:** "**What is actually described.** The crop is divided into a grid of small tiles, each tile is described separately, and only those tiles falling inside the building's outline are averaged together to produce the building's final list of numbers. Buildings that fall outside the imagery keep their place in the file with an empty entry rather than being dropped, because everything downstream matches buildings to predictions by position rather than by name. That design decision is efficient and fragile in equal measure.
>
> **The crop cap, 192 source pixels.** A limit that stops a single very large building, such as a warehouse or a stadium, from generating an enormous crop and exhausting the available memory. Oversized footprints are cropped from the centre instead."

**§02, "The gap"** is now the longest lead-in entry in the report and does three jobs: describe Copernicus and aerial surveys, retract them as the right comparators, and install xBD/xView2 instead. The retraction ("Those two are not the nearest neighbours, though, and describing the field by them alone would make the platform look more novel than it is") reads as the author arguing with an earlier draft in public.

> **After:** "… Neither easily absorbs the specific situational context that a particular responding organisation cares about, such as one parish, one road corridor, or one category of structure.
>
> The nearer comparator is the automated damage-classification literature that grew out of the xView2 challenge, on whose xBD dataset HASTE is itself benchmarked. Against that work the claim is not that nothing existed. It is that existing machine-learning approaches assume a globally pretrained model applied to a new disaster, and HASTE trades that for a disposable per-event model an analyst fits by hand, in a browser, without writing code."

Same content, one fewer authorial gear-change, about 25 words shorter.

**§07 ¶3 (band orders)** is a single 60-word sentence with four coordinate clauses. Split after "colour picture.": "Where the source is unknown, HASTE falls back to the labels embedded in the file, and failing that assumes the first three bands are red, green, and blue."

### L5. Minor wording

- §01 ¶4: "trains a very small classifier inside the web browser that scores all the rest in seconds" — the relative clause has drifted from "classifier" to look like it modifies "browser." Recast: "trains a very small classifier inside the web browser, which scores all the rest in seconds."
- §02 "The response": "two propositions that emerged from earlier in-browser damage-assessment research at the same laboratory" — "emerged from" is vague where the rest of the report is precise. If the propositions are stated in that earlier work, say "carried over from"; if they are the author's reading of it, say so. **[Verification Required]** — I could not check the earlier in-browser work from the text supplied.
- §04 ¶2: "Imagery from before the event is optional and is used for visual comparison, not for the calculation." Good sentence, but "the calculation" has no antecedent this early. "not for any calculation" fixes it.
- §05 "Holdout fraction": "The code comments say so explicitly." Trailing and slightly triumphant. Fold it in: "so the displayed figures jump around from click to click, as the code comments acknowledge."
- §05 "The final estimate": "HASTE does not simply count the buildings its model called damaged and publish that number." The negative opening is doing rhetorical work the section does not need. "HASTE does not publish a raw count of the buildings its model called damaged." is shorter and lands the same contrast.
- §11 ¶1: "a set of programming interfaces that the interface calls" — "interfaces … interface" in six words. "a set of programming interfaces that the browser front end calls."
- §12 ¶3: "It is explicitly not intended as …" followed by four "as" phrases is a long list held together by a thin stem. Consider a bulleted list, which the report uses elsewhere for exactly this kind of scannable material.
- §10 "The confidence interval understates real uncertainty." The entry is one sentence and duplicates §05's much better closing paragraph ("What the interval means in plain terms"). Either cut it or make it a pointer.

### L6. Passive constructions worth reversing

The report is mostly active. Four places where the passive hides an actor the reader wants:

- §04: "Several files covering the same area can be uploaded together and are merged into a single mosaic." → "The analyst can upload several files covering the same area, and HASTE merges them into a single mosaic."
- §05 "Normalisation": "each channel is rescaled by subtracting a mean and dividing by a standard deviation" → keep, this one is fine; the actor is the software and it is obvious.
- §05 "Training chip size": "it is shown 1,024 batches of them per epoch" → "the training run feeds it 1,024 batches per epoch."
- §09 ¶2: "Outputs distributed publicly … carry notices warning against over-reliance" → fine as is, but the four participial phrases that follow ("encouraging …, framing …, and naming …") make a 60-word sentence. Split after "cross-validation against ground reports and other imagery."

---

## What is missing (copyediting scope only)

1. **No figure or table numbers.** Three tables carry captions but no numbers, so nothing in the prose can refer to them. "the table below" (§08) is the only pointer and it breaks if the layout reflows on a narrow screen. Number them Table 1 to Table 3 and refer by number.

2. **Section cross-references are absent throughout.** Several of the de-duplications above become easy once the report is willing to say "see §05." At present each section is written as though the reader might have arrived cold, which is exactly why the same explanations recur. Adding six or seven cross-references would let you delete several hundred words.

3. **No word count or reading-time signal** on a report of this length. Minor, but the audience is practitioners reading under time pressure.

4. **The `stats` band is undated and unsourced in itself.** Once trimmed per D6, the four figures sit with no indication that they come from §05 and §08. A one-line note under the band ("Figures from §05 and §08") would do it.

---

## Internal inconsistencies

Only two, both small, both introduced by the duplication rather than by error of fact.

1. **The strictness of cloud exclusion is stated two ways.** §04 says the cloud fraction is recorded "so that unreadable buildings can be set aside," implying a judgment about readability. §05 "Cloud exclusion" says the rule is absolute: "Any building with a cloud fraction above zero is excluded … a building need only be slightly obscured to be set aside." A reader who takes §04 at face value will expect a threshold that does not exist. Fix by cutting §04's clause per D3.

2. **§08 and §10 differ on whether the field figures were validated.** §08's "Deployment record" lead says "only the Rolling Fork assessment carries an accuracy measurement against field ground truth," but the Hurricane Melissa table two paragraphs later is captioned "Validated results for two of the areas assessed." Both can be true if Melissa's precision and recall come from HASTE's own human validation sample rather than from field ground truth, which I believe is the case, but the text does not say so and the two statements read as contradictory. *Fix:* amend the caption to "Results for two of the areas assessed during the Hurricane Melissa response, validated against the analyst's own sample rather than field ground truth." **[Verification Required]** — confirm against arXiv:2607.11838 before publishing this wording.

---

## Prioritized next steps

If you do only three things:

1. **Rewrite the `thesis` field so it is not the Foreword (D1).** Highest visibility, lowest effort, about 110 words.
2. **Cut D2 through D5 — the four claims stated three-plus times each.** Roughly 230 words, and it is what will make the report feel tight rather than merely shorter. Work section by section from §13 backwards, keeping the earliest full statement and reducing every later one to a clause or a cross-reference.
3. **Run the throat-clearing list (L1) and split the two "Buffer" entries and the learning-rate entry (L2, L3).** Half an hour, and §05 comes out cleaner as the report's centrepiece.

Then, if there is time: the D6 table of small repeats, the sentence splits in L4, and figure numbering.

---

## What to take forward

**The duplication has a single cause, and it is worth naming because it will recur.** Every repeated claim in this report is a claim the author cares about. The cloud-exclusion rule, the human in the loop, the per-event model, the developer-supplied evidence: these are the report's four convictions, and they were written into every section where they could plausibly belong. That is a generous instinct, and in a document read linearly it backfires, because emphasis by repetition reads as insecurity about whether the first statement landed. The discipline to adopt: pick the one section where each conviction is load-bearing, make the full case there, and everywhere else use a clause and a cross-reference. A claim stated once, well-placed, reads as confident. The same claim stated four times reads as anxious.

**A related habit: section-independence is a false requirement.** Much of the repetition exists because each section was written to stand alone. Readers of a numbered report do not need that, and cross-references are cheaper than re-explanation.

**Finally, trust the reader's attention.** The throat-clearing pattern in L1 ("it is worth knowing that," "these numbers deserve to be read carefully") is the sentence-level version of the same anxiety. The report's actual sentences are good enough that they do not need to be introduced.

---

## References

1. Microsoft AI for Good Lab. *HASTE: A Platform for Rapid Post-Disaster Building Damage Assessment.* arXiv:2607.11838. **[Verification Required]** — cited from the report under review; the arXiv identifier was not independently confirmed in this pass.
2. Rolf, Esther, et al. "A Generalizable and Accessible Approach to Machine Learning with Global Satellite Imagery." *Nature Communications*, vol. 12, 2021.
3. Oquab, Maxime, et al. "DINOv2: Learning Robust Visual Features without Supervision." Meta AI, 2023.
4. Gupta, Ritwik, et al. "xBD: A Dataset for Assessing Building Damage from Satellite Imagery." 2019. (The xView2 challenge dataset referenced in §02 and §08.)

*Note on format: real Word footnotes are not available through the tooling used to produce this document, so references appear here rather than at the foot of the page.*
