# HASTE: High-speed Assessment and Satellite Tracking for Emergencies

### A Research Report on an Open-Source Platform for Rapid Post-Disaster Building Damage Assessment

*Prepared as a plain-language review of the HASTE research platform*
*based on the software and documentation contained in this repository*

---

## Foreword

In the hours after an earthquake, a hurricane, or a wildfire, the single most
useful thing a relief coordinator can hold is a map of which buildings are
still standing. Where should search teams go first? Which neighbourhoods need
shelter, and how many people are likely to need it? Which roads lead to places
that no longer exist? Those questions have to be answered before anyone on the
ground has been able to walk the affected area, and often before the affected
area is safe to walk at all.

The traditional answers are slow. Teams fly helicopters over the damage,
photograph it, and interpret the photographs by hand. Official mapping services
task a satellite, wait for a cloud-free pass, and publish a product days later.
Both are careful and both are valuable, but neither reliably delivers inside
the first seventy-two hours, which is the window in which decisions about
people, supplies, and attention are actually being made.

HASTE, which stands for High-speed Assessment and Satellite Tracking for
Emergencies, is an open-source research platform built to shorten that gap. It
lets a trained analyst who is not a machine-learning engineer take fresh
satellite or aerial imagery of a disaster zone, mark a small number of examples
by hand, and have a computer extend those examples across the whole affected
area to produce a building-by-building damage estimate. This report explains,
in non-technical language, what HASTE does, how it does it, what each of its
settings means, and what it cannot be trusted to do.

---

## 1. Executive Summary

1.1 HASTE is a web-based platform that turns post-disaster satellite imagery
into an estimate of which individual buildings have been damaged. It was
developed by the Microsoft AI for Good Lab and released as open-source software
under the MIT licence. The version reviewed here is the copy held in the
Ethical Tech CoLab repository, which is a fork of the original project at
`microsoft/haste`.

1.2 The platform's central design choice is to train a fresh model for each
disaster rather than maintain one global model that tries to recognise damage
everywhere. A hurricane in Jamaica and an earthquake in Türkiye leave visually
different traces on visually different building stock, and a model tuned to one
is not expected to work on the other. HASTE accepts that limitation
deliberately in exchange for speed: a model fitted to one event, from one
analyst's labels, can be ready in minutes.

1.3 A human being is required at every stage. A person chooses the imagery,
marks the training examples, inspects the predictions, checks a random sample
of them against their own eyes, and decides whether the result is fit to be
shared. There is no automatic mode, and the project documentation states
repeatedly that outputs are preliminary signals requiring expert validation
rather than authoritative damage assessments.

1.4 HASTE offers two routes from imagery to an answer. The faster route,
Rapid Building Assessment, computes a numerical fingerprint for every building
in the area, asks the analyst to label a handful of them, and trains a very
small classifier inside the web browser that scores all the rest in seconds.
The slower route, Damage Mapping, asks the analyst to draw damaged and
undamaged areas by hand and trains a full image-segmentation model on a
graphics processor, producing a continuous, pixel-level damage map.

1.5 Both routes end at the same place: a per-building damage figure, a set of
accuracy measures computed against a human-labelled validation sample, and an
estimate of the total number of damaged buildings with a stated margin of
error.

1.6 The platform depends on outside data it does not produce. Imagery comes
from commercial and public providers such as Planet, Maxar, Airbus, the
European Union's Copernicus programme, and the United States National Oceanic
and Atmospheric Administration. Building outlines come from the Overture Maps
Foundation, which itself draws heavily on OpenStreetMap and on machine-derived
building datasets. Where those outlines are missing or wrong, HASTE has nothing
to attach its predictions to.

1.7 According to the research paper published alongside the platform, HASTE
has been used in more than thirty disaster responses since early 2023, and its
outputs have been released openly through the Humanitarian Data Exchange.

---

## 2. Background and Rationale

2.1 The problem. Rapid damage assessment is a timing problem before it is a
technical one. Imagery of a disaster zone often becomes available within a day.
An interpretation of that imagery detailed enough to direct a response team to
a particular neighbourhood usually does not. The interval between the two is
where humanitarian decisions are made with the least information and the
greatest consequences.

2.2 The gap. Established products have real strengths and known constraints.
Copernicus Emergency Management Service Rapid Mapping, the European Union's
free on-demand crisis mapping service, delivers standardised map products
within hours to days of an activation, but must be formally activated by an
authorised user and covers only large-scale emergencies. Manual aerial surveys
are accurate but limited in geographic reach and slow to process. Neither
easily absorbs the specific situational context that a particular responding
organisation cares about, such as one parish, one road corridor, or one
category of structure.

2.3 The response. HASTE was built around two propositions that emerged from
earlier in-browser damage-assessment research at the same laboratory. The first
is to train per event rather than for the world, accepting narrow, disposable
models in exchange for speed and local fit. The second is that human oversight
should be structural rather than advisory: the operator is not reviewing a
machine's conclusion after the fact, the operator is the source of everything
the machine knows about this event.

2.4 The design also reflects a practical constraint on who does this work.
The people who understand what damage looks like in a given country are rarely
the people who can write machine-learning code. HASTE is presented as a no-code
platform so that the person supplying the expert judgment and the person
operating the model can be the same person.

---

## 3. Objectives

The platform is designed to:

3.1 Produce a building-level damage estimate from post-disaster imagery
quickly enough to be useful inside the first days of a response.

3.2 Allow a non-programmer to fit a model to a specific event using only a
map interface, a mouse, and their own visual judgment.

3.3 Keep a human in control of every consequential step, including the
decision to release a result at all.

3.4 Express uncertainty honestly, by measuring the model against a separate
human-labelled sample and reporting a margin of error on the headline damage
figure rather than a single confident number.

3.5 Produce outputs in standard geographic file formats so that they can be
opened in the mapping software humanitarian organisations already use, and
published openly where appropriate.

3.6 Remain deployable by others. The platform can be run on a laptop for
evaluation or installed on an organisation's own cloud infrastructure, in which
case that organisation, and not Microsoft, controls the imagery and the
outputs.

---

## 4. How HASTE Works

The workflow has a shared beginning, then splits into two routes, then rejoins
for validation and reporting.

### 4.1 The shared beginning: a project, an image layer, and building outlines

4.1.1 An analyst first creates a project, which is simply a container for one
disaster event. It records a name, a description, the date of the event, and
the affected countries. The date and the countries are stored for reference and
do not affect any calculation.

4.1.2 Into that project the analyst adds an image layer, which is the imagery
being assessed. HASTE accepts GeoTIFF files, a standard image format that
carries the geographic coordinates of every pixel alongside the picture itself.
Several files covering the same area can be uploaded together and are merged
into a single mosaic. Imagery from before the event is optional and is used for
visual comparison, not for the calculation.

4.1.3 HASTE then obtains the outlines of every building in the area covered by
the imagery. By default it downloads them automatically from Overture Maps, an
open dataset maintained by the Overture Maps Foundation under the Linux
Foundation, which combines OpenStreetMap with machine-derived building datasets
from Microsoft and Google and covers roughly 2.3 billion buildings worldwide.
An analyst who has better local data can upload their own outlines instead, as
a GeoPackage file of up to 500 megabytes; HASTE converts it to the standard
global coordinate system and trims it to the imagery area.

4.1.4 When the layer is created the analyst chooses a workflow, Building or
Standard, which determines which of the two routes below is available.

### 4.2 Route A: Rapid Building Assessment

4.2.1 This route is available when building outlines exist and produces an
answer in minutes with no separate training job.

4.2.2 First, HASTE computes an embedding for every building. An embedding is a
compact list of numbers that describes what the imagery around that building
looks like: its texture, its colour, its edges. Two buildings that look alike
receive similar lists of numbers. Nothing in the embedding knows anything about
damage; it is simply a numerical description of appearance.

4.2.3 The analyst then opens a map, clicks buildings, and assigns each one to
one of three categories: Intact, Damaged, or Cloudy, the last meaning that
cloud or shadow makes the building impossible to judge. A left click labels a
building, a right click removes the label, and holding the control key while
dragging labels many at once.

4.2.4 Once at least three buildings have been labelled across at least two
categories, a very small statistical model called a logistic regression trains
automatically in the browser and immediately predicts a category for every
other building in view. The analyst can flip between what they labelled and
what the model predicted, see where it is wrong, label a few more examples, and
watch the prediction improve. This loop takes seconds, which is what makes the
route fast.

4.2.5 When satisfied, the analyst runs a final pass that scores every building
in the layer and saves the result as a geographic data file.

### 4.3 Route B: Damage Mapping with a trained model

4.3.1 This route does not require building outlines and produces a continuous
damage picture across every pixel of the imagery rather than a verdict per
building.

4.3.2 The analyst draws polygons, rectangles, or circles over a small part of
the image and assigns each shape a class. The default classes are Background,
Building, and Damaged Building; additional classes of No Damage and Flood
Extent are offered for particular event types. The project documentation
advises drawing at least five to ten shapes per class, considers seventy to one
hundred a good training set, and states that more than roughly one hundred and
fifty is unnecessary.

4.3.3 Those shapes train an image-segmentation model, which is a model that
assigns a class to every individual pixel rather than to a whole picture. The
architecture used is a U-Net with a ResNeXt-50 encoder, a standard and
well-understood design in satellite image analysis, started from weights
pre-trained on ordinary photographs and then fitted to the analyst's labels.
Training runs on a graphics processor, either locally in a container or on
cloud computing capacity.

4.3.4 The trained model is then run across the entire image layer, producing a
per-pixel damage prediction that can be viewed alongside the imagery and
downloaded.

### 4.4 Turning pixels into buildings

4.4.1 A per-pixel damage map is not directly useful to a responder, who needs
to know about buildings. HASTE therefore overlays the building outlines onto
the pixel predictions and, for each building, counts what proportion of the
classified pixels inside that outline were called damaged. That proportion,
between zero and one, is the building's damage fraction. It is the number that
drives everything downstream.

4.4.2 The same step also records what proportion of each building was obscured
by cloud, so that unreadable buildings can be set aside rather than silently
counted as undamaged.

### 4.5 Validation

4.5.1 Both routes end with the same discipline. The analyst opens a validation
tool that presents a random sample of roughly two hundred building outlines
over the post-event imagery and asks them to judge each one independently as
Damaged, Not Damaged, or Unknown. These human judgments are treated as the
ground truth against which the model's predictions are scored. Buildings marked
Unknown are excluded from the scoring entirely rather than being guessed at.

---

## 5. The Variables, Explained Simply

This section is the heart of the report. Every number an analyst can adjust,
and every number fixed inside the code, is described below in ordinary terms:
what it represents, why it is set where it is, and what it changes about the
answer.

### 5.1 The label classes

5.1.1 Background, Building, Damaged Building. These are the three default
categories an analyst draws with. They are stored internally as class values 1,
2, and 3. The reason Background exists as a class in its own right is
important: the model is only taught by the pixels the analyst actually marked,
so if a damaged roof is labelled without the ground around it, the model is
never told what the ground is, and can produce a blurry, spreading prediction
without ever being penalised for it. Labelling a building together with its
surroundings is what forces the model to learn a boundary.

5.1.2 Cloud. A fourth class, used to mark areas where the imagery cannot be
read. Cloudy buildings are excluded from the damage statistics rather than
counted as intact, which would otherwise bias the result downward in exactly
the wet, storm-affected conditions where damage assessment matters most.

5.1.3 No Damage and Flood Extent. Two additional classes offered for
earthquake, fire, and flood event types respectively. Flood Extent lets the
analyst mark standing water, which HASTE can intersect with building outlines
to say which buildings are in water. It does not estimate how deep that water
is.

### 5.2 The imagery variables

5.2.1 Number of channels, set to 3 for ordinary colour imagery. This tells the
software how many bands of information each pixel carries: red, green, and
blue.

5.2.2 Normalisation means and standard deviations. Image pixels are stored as
whole numbers, but models learn more stably from values between 0 and 1, so
each channel is rescaled by subtracting a mean and dividing by a standard
deviation. In the worked example shipped with the platform these are set to 0
and 255, which is a plain rescaling of ordinary 8-bit imagery. When an image
layer is prepared automatically, HASTE instead sets every mean to zero and sets
each channel's divisor to the brightness value at that channel's 98th
percentile, so that the brightest two per cent of pixels are treated as glare
and clipped rather than being allowed to compress everything else into a narrow
band. This matters because imagery from different sensors arrives on different
numeric scales, and a wrong divisor makes the picture unrecognisable to the
model.

5.2.3 Ground resolution. It is worth stating plainly that HASTE never checks,
records, or standardises how many metres of ground each pixel covers. It works
on whatever grid the supplied imagery has. Several settings described below are
expressed in pixels rather than metres as a result, and the physical area
covered by a training tile therefore varies with the imagery source.

### 5.3 The training variables in Route B

5.3.1 Learning rate, default 0.0001. How large a correction the model makes
each time it discovers it was wrong. Too large and it lurches past the right
answer; too small and it never gets there within the time available. The
default is a conservative value appropriate to fine-tuning a model that already
carries useful pre-trained weights.

5.3.2 Batch size, default 32 for training. How many image tiles the model
examines before making one correction. Larger batches give a steadier, less
noisy signal about which direction to move in, but require proportionally more
memory on the graphics processor.

5.3.3 Maximum epochs. One epoch is one complete pass through the training data.
A small number is intended here, for a clear reason: the model is being fitted
to a few dozen hand-drawn shapes from a single event, and training it longer
would mainly teach it to memorise those particular shapes rather than the
general appearance of damage. The repository is inconsistent about the actual
figure. The worked example specifies 10, the form in the web interface offers 3,
and the server falls back to 1 when nothing is supplied, while the training
script separately imposes a hardcoded minimum of 10. An analyst who selects 3
in the interface is therefore asking for a maximum below the enforced minimum.
This is worth flagging to anyone reproducing a result.

5.3.4 Training chip size, 256 pixels. The model does not see the whole scene at
once. It is shown small square cut-outs 256 pixels on a side, drawn at random
from the labelled area, and it is shown 1,024 batches of them per epoch. The
model's whole view of the disaster is assembled from these fragments.

5.3.5 Buffer, nominally 3 metres, applied to the Building class using the
Background class. When a person traces a building, the traced line is never
exactly on the wall. This setting draws a narrow band around each building
polygon and treats it as Background, which stops the imprecision of human
tracing from teaching the model that the pavement is part of the structure. The
setting is written in metres but is applied by counting pixels, so it means
three metres only when a pixel happens to represent one metre of ground. The
script's own documentation notes this.

5.3.6 Patch size, default 2048, and padding, default 64, used when running the
finished model across the full image. Satellite scenes are far too large to
process in one piece, so they are cut into square tiles. Predictions are least
reliable at the very edge of a tile, where the model can see no context, so
each tile is processed with 64 pixels of overlap that are then discarded. This
is what stops a visible grid pattern from appearing across the finished damage
map.

5.3.7 Initial weights, default none, meaning the model starts from weights
learned on ordinary photographs. An analyst can instead start from a previously
trained HASTE model held in the model catalogue, which is offered only where
the event type and imagery source match, since a model fitted to wildfire
imagery is not a sensible starting point for flood imagery.

5.3.8 The cloud penalty. An optional setting, switched off by default, changes
how the model is corrected in areas the analyst marked as Cloud. Rather than
being told what class those pixels really are, which nobody knows, the model is
penalised whenever it predicts damage beneath a cloud. In plain terms it is
taught not to claim to see through weather.

### 5.4 The embedding variables in Route A

5.4.1 Embedding backbone. The method used to convert the appearance of a
building into numbers. The lightweight default is MOSAIKS, an approach
published in Nature Communications in 2021 that passes the image through a
large set of randomly generated filters rather than learned ones. The
counter-intuitive finding of that work is that random filters, applied at
sufficient scale, describe an image well enough for a simple linear model to
make accurate predictions from them, at a tiny fraction of the computational
cost. The alternative offered is DINOv2, a family of vision models released by
Meta AI in 2023 that learned general visual features from 142 million unlabelled
images, available in small and base sizes.

5.4.2 Output dimensions, default 1024, applicable to MOSAIKS only. How many
numbers describe each building. More numbers capture more nuance and cost more
time and memory. When DINOv2 is used this setting is ignored, because the size
of the description is fixed by the model itself: 384 numbers for the small
version, 768 for the base version, 1024 for the large one.

5.4.3 Kernel size, default 7. The width in pixels of each random filter. Small
filters respond to fine texture such as roof material and rubble; larger ones
respond to coarser structure. Seven pixels is a middle setting suited to
detecting the change in surface texture that collapse produces.

5.4.4 Resize factor, default 4. How much the small image crop around each
building is enlarged before being described. In moderate-resolution satellite
imagery a single house may span only a handful of pixels, too few for the
filters to find anything. Enlarging the crop fourfold gives them something to
work with. This is a real trade-off and not a free gain: enlarging an image
does not create detail that the sensor never recorded, it only makes the
recorded detail large enough to be measured. Choosing DINOv2 forces this
setting back to 1, because that model brings its own fixed way of dividing an
image into pieces.

5.4.5 Context padding, 8 pixels. Each building crop reaches a little beyond the
traced outline, so that the description includes some of the ground
immediately around the structure. Debris and scorch marks sit there rather than
on the roof.

5.4.6 What is actually described. The crop is divided into a grid of small
tiles, each tile is described separately, and only those tiles falling inside
the building's outline are averaged together to produce the building's final
list of numbers. Buildings that fall outside the imagery keep their place in
the file with an empty entry rather than being dropped, because everything
downstream matches buildings to predictions by position in the file rather than
by name. That design decision is efficient and fragile in equal measure.

5.4.7 Batch size, default 16. How many buildings are described at once. A
memory-management setting with no effect on the result.

5.4.8 Crop cap, fixed at 192 source pixels. A single very large building, such
as a warehouse or a stadium, would otherwise generate an enormous image crop
and exhaust the available memory. Oversized footprints are cropped from the
centre instead.

### 5.5 The in-browser classifier variables in Route A

5.5.1 The model that turns a handful of labelled buildings into predictions for
all of them is a logistic regression, one of the oldest and simplest
classifiers in statistics. It fits a straight-line boundary through the space
of building descriptions and reports, for each building, how far onto the
damaged side of that boundary it falls.

5.5.2 Learning rate, 0.1, and number of steps, 500. The model adjusts itself
five hundred times, moving a tenth of the way toward the correction each time.
These values are fixed in the code rather than exposed to the analyst, and are
chosen to complete in well under a second so that the label-and-see loop stays
interactive.

5.5.3 Regularisation strength, 0.01. A deliberate penalty that discourages the
model from placing heavy reliance on any single one of the thousand-odd numbers
describing each building. Without it, a model trained on three examples would
seize on whatever coincidental feature happened to separate those three, and
would fail on the fourth. This single small number is the main defence against
overfitting in a workflow explicitly built around very few labels.

5.5.4 Minimum labels, three buildings across at least two classes. Below this
the model has nothing to distinguish, so it does not run.

5.5.5 Holdout fraction, 0.2 in practice. One fifth of the analyst's labels are
held back from training and used only to score the model, which is what
produces the live precision, recall, and F1 figures shown for the Damaged class
in the side panel. Because those numbers come from labels the model was never
shown, they are an honest indication of quality rather than a report of how
well the model memorised its own training data. Two weaknesses are worth
naming. The sample is tiny: with twenty labels the holdout is four buildings,
and four buildings cannot tell you much. And the split is drawn afresh every
time a label is added, so the displayed figures jump around from click to
click. The code comments say so explicitly.

5.5.6 The three prediction categories are stored as 0 for Intact, 1 for
Damaged, and 2 for Cloudy.

### 5.6 The aggregation variables: from pixels to a verdict

5.6.1 Buffer distances, 0, 10, and 20 metres. HASTE calculates each building's
damage fraction three times: once inside the traced outline, once inside a ring
extending ten metres beyond it, and once at twenty metres. There are two
reasons. Building outlines and satellite imagery are frequently misaligned by
several metres, particularly in dense cities and where the ground itself has
moved, so the strict outline may sit over the neighbouring plot. And some kinds
of damage, notably debris fields and burn scars, appear around a structure
rather than on it. The wider measurements are recorded so that this can be
examined rather than assumed.

5.6.2 Damage fraction. For a given buffer, the number of pixels classified as
Damaged Building divided by the number of classified pixels of any kind inside
that shape. Unclassified pixels, recorded as zero, are excluded from both the
top and the bottom of that division, so a building half outside the imagery is
judged on the half that was actually seen. The result is capped at 1.

5.6.3 Damage threshold, default 0.1. The proportion of damaged pixels above
which a building is declared damaged. This is the most consequential single
number in the entire platform, and it is set low on purpose. A tenth of a
building's visible area showing damage indicators is treated as enough,
reflecting a judgment that in the first days of a response, missing a damaged
building is a worse error than flagging one that turns out to be intact. It
also compensates for partial visibility: a structure photographed from
overhead shows mainly its roof, and serious structural damage may present as
only a modest patch of altered texture there. Because the threshold is a
setting rather than a fixed rule, and because the platform also publishes a
full precision-and-recall curve across all possible thresholds, an analyst who
disagrees with this trade-off can see exactly what a different choice would
cost.

5.6.3.1 There is a wrinkle here that a careful reader should know about. The
exported data file also carries a simple yes-or-no damaged column, and that
column is set whenever a building contains even one damaged pixel, with no
threshold at all. The validation report reads that column; the assessment
report applies the tenth-part threshold. The same model and the same human
labels will therefore yield slightly different accuracy figures in the two
reports. Nothing in the documentation flags this, and it is the kind of
discrepancy that could confuse a reader comparing the two.

5.6.4 Minimum footprint area, default 50 square metres. Buildings smaller than
this are excluded from the population used for the final headline estimate. The
stated reasoning is that these are structures a human reviewer could not
realistically have judged in the validation step, so including them in an
extrapolation built from human judgments would be unsound. Note the
consequence, which the platform does not hide: small informal structures are
absent from the headline count, and those structures are common in precisely
the settlements most exposed to disaster.

5.6.5 Cloud exclusion. Any building with a cloud fraction above zero is
excluded from the damage count entirely. This is a strict rule, not a
proportional one; a building need only be slightly obscured to be set aside.

### 5.7 The statistical variables in the final estimate

5.7.1 HASTE does not simply count the buildings its model called damaged and
publish that number. It uses the human-validated sample to estimate the true
damage rate and scales that rate up to the full population of buildings. The
arithmetic is a standard finite-population survey estimate.

5.7.2 The sample proportion, written as p-hat, is the number of buildings a
human confirmed as damaged divided by the number of buildings the human judged
either way. Buildings marked Unknown are excluded from both figures.

5.7.3 The population, written as N, is the count of building outlines larger
than the minimum area. The estimated number of damaged buildings is simply N
multiplied by p-hat.

5.7.4 The sampling fraction, written as f, is the size of the validated sample
divided by the population. It enters the calculation through what statisticians
call a finite-population correction, the term (1 minus f) in the variance. Its
effect is intuitive: if you have checked half of all the buildings by hand,
your uncertainty about the other half should be smaller than if you had checked
one per cent of them. Standard survey formulas assume an infinite population
and would overstate the uncertainty here.

5.7.5 The critical value z, fixed at 1.959963984540054. This is the constant
that turns a standard error into a 95 per cent confidence interval, and it is
written out as a literal number in the code specifically so that the platform
does not have to load a heavy statistical library to obtain it. The reported
interval runs from N times (p-hat minus z times the standard error) to N times
(p-hat plus z times the standard error).

5.7.6 What the interval means in plain terms: if the same sampling exercise
were repeated many times, an interval calculated this way would contain the
true number of damaged buildings in about nineteen cases out of twenty. It
accounts for the fact that a sample was taken. It does not account for a
mislabelled sample, misaligned building outlines, or a model that is wrong in a
consistent direction, and it should not be read as expressing total uncertainty
about the figure.

---

## 6. Reading the Results

6.1 The visualiser. The pre-event and post-event imagery are shown side by
side with a swipe control between them, the predicted damage layer overlaid on
both, and the raw per-pixel predictions available as an optional toggle.
Opacity, contrast, hue, and saturation sliders help make damage visible in
imagery that was captured in poor light.

6.1.1 On the map, each building is shaded according to its damage fraction in
five bands, cut at one fifth, two fifths, three fifths, and four fifths, running
from white through pale peach and orange to red and dark red. This is a
presentational scale only. It should not be read as a severity classification
in the sense used by structural engineers, because the model was never taught
degrees of damage. It only ever learned to separate damaged from intact, and
the shading reflects how much of a roof it flagged rather than how badly the
building was hurt.

6.2 The validation report. This compares the model's predictions against the
analyst's own validation labels and reports overall accuracy, precision,
recall, and F1 for each class, a macro-averaged F1, and a confusion matrix.
Precision answers the question: of the buildings the model called damaged, what
share really were? Recall answers the opposite: of the buildings that really
were damaged, what share did the model find? These two errors have different
humanitarian costs, and the report deliberately does not merge them into a
single figure.

6.3 The assessment report. This summarises the whole layer: the total number
of building outlines, how many were excluded as cloud-covered, how many of the
remainder were predicted damaged and what percentage that represents, the
accuracy metrics at the chosen threshold, a precision-and-recall curve across
all thresholds, and the estimated total of damaged buildings with its 95 per
cent confidence interval. Where no validation labels exist, the report still
shows the prediction counts but withholds the accuracy metrics and the estimate
rather than presenting an unvalidated number.

6.4 Downloads. Results can be exported as a GeoPackage, an open standard file
that opens in common mapping software, along with the training artefacts and
the building outlines used. This matters for accountability: a partner
receiving a HASTE layer can inspect it independently rather than taking a
summary figure on trust.

---

## 7. Data Sources

7.1 Imagery. HASTE holds no imagery of its own; the analyst supplies it. The
documentation records that in past activations imagery has come from Planet, a
commercial operator of a large constellation of small satellites that publishes
disaster imagery openly; Maxar, now Vantor, a commercial provider of
high-resolution imagery with its own open data programme for disasters; the
Airbus Foundation; Sentinel-1 and Sentinel-2, the radar and optical satellites
of the European Union's Copernicus programme, whose data is free to all;
products from the Copernicus Emergency Management Service; and aerial imagery
from the United States National Oceanic and Atmospheric Administration. Only
GeoTIFF files are accepted.

7.1.1 The software itself has no live connection to any of these providers.
Placeholder functions for fetching imagery directly from Maxar and Planet exist
in the code but are empty. In practice the analyst supplies a link to a file,
and for security reasons those links may point only at Azure Blob Storage or
Amazon S3, the two hosting services on the platform's permitted list. Public
disaster imagery from the major providers is generally published on one of
those, which is why the restriction is workable.

7.1.2 HASTE does adjust for the provider in one respect. Different satellites
record their colour bands in different orders, and some record bands the human
eye cannot see, so the platform holds a lookup table of band orders for Planet
Scope, Planet Skysat, Maxar, Sentinel-2, and one partner-specific format, and
uses it to assemble a correct colour picture. Where the source is unknown it
falls back to reading the labels embedded in the file, and failing that assumes
the first three bands are red, green, and blue.

7.2 Building outlines. Overture Maps by default, with OpenStreetMap and
Microsoft Building Footprints as the underlying open datasets, and
analyst-supplied outlines where better local data exists. HASTE reads the
Overture data anonymously from a public store, taking the most recent release
available and falling back to a fixed February 2026 release if it cannot
determine one. Only polygons are kept, and everything is converted to the
standard global coordinate system.

7.3 What HASTE does not use. The platform draws on imagery and building
outlines and nothing else. It does not read ground reports, weather data,
sensor networks, social media, or population figures. Its picture of a disaster
is strictly what a camera in orbit could see, which is a narrower thing than
what happened.

7.4 Personal data. The platform is not designed to identify people, does not
ingest or output personal data, and does not treat person-scale features in
imagery as signal.

---

## 8. Evidence of Performance

8.1 The research paper published alongside the platform, "HASTE: A Platform
for Rapid Post-Disaster Building Damage Assessment" (arXiv:2607.11838), reports
experiments on xBD, a public benchmark dataset of paired pre-event and
post-event satellite imagery with expert damage annotations. The team collapsed
the benchmark's minor, major, and destroyed categories into a single damaged
category and measured how well each embedding method performed as the number of
labels was varied.

8.2 The reported finding is that with as little as one per cent of the
available labels, the strongest embedding reached a discrimination score of
0.84, rising to 0.91 at ten per cent, against 0.88 for a fully supervised
ResNet-50 model trained on all of the labels. The practical claim, that a
handful of labels plus a good general-purpose image description can match a
conventionally trained model, is what makes the fast route viable.

8.3 The same paper reports thirty-one field deployments since early 2023,
including four cities assessed within three days of the February 2023 Türkiye
earthquakes, a tornado assessment in Rolling Fork delivered in under two hours
at 0.86 precision and 0.80 recall against field ground truth, and the August
2023 Maui wildfire, where imagery available at nine in the morning yielded an
assessment by one in the afternoon identifying roughly 1,700 damaged buildings.

8.4 For Hurricane Melissa in Jamaica in late 2025, four areas covering about
2,300 square kilometres were assessed. In Black River, some 110,000 building
outlines were examined, of which around 65,000 were obscured by cloud; the
validated result was 96 per cent recall at 82 per cent precision, with an
estimated 31,000 damaged buildings. In Montego Bay the corresponding figures
were 86 per cent recall and 71 per cent precision.

8.5 These numbers deserve to be read carefully. The variation between Black
River and Montego Bay, on the same event with the same team days apart, is
substantial, and the very large share of cloud-obscured buildings in Black
River is a reminder that a headline damage estimate can rest on a minority of
the buildings actually present.

---

## 9. Human Oversight and Governance

9.1 The project documentation is unusually direct that human oversight is
structural rather than procedural. There is no autonomous mode. A person
selects the imagery, provides every label the model learns from, reviews the
predictions, validates a sample, and decides whether to distribute the result.

9.2 Outputs distributed publicly, including through the Humanitarian Data
Exchange and partner mapping systems, carry notices warning against
over-reliance, encouraging cross-validation against ground reports and other
imagery, framing the output as exploratory rather than definitive, and naming
HASTE, the imagery provider, and the building-outline dataset so that a
downstream user can assess provenance for themselves.

9.3 The documentation states that where a widespread inaccuracy or pattern of
misuse is identified, the laboratory may publish guidance recommending
temporary suspension or restricted use of the workflow.

9.4 Labels are not reused. Each event's labels belong to that event and are not
accumulated into a global training set, which follows directly from the
train-per-event design and also limits the accumulation of one analyst's
interpretive habits across many responses.

---

## 10. Limitations and Caveats

The repository documents its own weaknesses at length. The most consequential
are these.

10.1 The output depends heavily on who did the labelling. Two competent
analysts working the same event from the same imagery can produce materially
different results. The documentation gives a concrete example from the
Hurricane Melissa response, where an initial set of 153 labels produced
predictions that described buildings as around 20 per cent damaged when they
were in fact totally destroyed; the error was caught by visual inspection and
corrected by adding a further 107 labels and retraining.

10.2 Imagery quality governs everything. Cloud, haze, low light, and imagery
captured at an angle rather than from directly overhead all degrade
performance, sometimes severely. Planet imagery in particular sits below the
roughly 30 centimetre resolution that building-detection models generally
prefer, which is part of why the platform leans on external building outlines
rather than trying to find buildings itself.

10.3 Building-outline coverage is uneven in a way that matters. OpenStreetMap
and Microsoft Building Footprints are weakest in the Global South, in informal
settlements, in conflict-affected areas, and where construction has been rapid
and recent. These are precisely the populations most exposed to disaster. A
building with no outline is invisible to HASTE regardless of how badly it was
damaged, and the 50 square metre minimum area removes further small structures
from the headline figure.

10.4 Spatial misalignment between imagery and outlines is routine, and worst
in dense urban areas and where the ground has deformed, which is to say after
earthquakes.

10.5 The model does not generalise, by design. A model fitted to a Caribbean
hurricane is not expected to work on an earthquake in Türkiye. This also means
HASTE cannot be operated as a standing monitoring system.

10.6 False positives arise from shadows, ordinary construction and demolition
unrelated to the disaster, atmospheric artefacts, and vegetation change. False
negatives arise from subtle structural damage visible only from an angle,
damage hidden by cloud or shadow, and damage at a scale finer than the imagery
can resolve.

10.7 No contextual data is incorporated. There is no ground truth, no weather,
no sensors, no population data. Flood extent is intersected with buildings but
water depth is never estimated, so HASTE can say a building is in water and not
how deep.

10.8 The confidence interval understates real uncertainty. It quantifies the
error introduced by sampling and nothing else.

10.9 Some findings from reading the source code should be added to the
project's own list, since they bear on how much weight an output can carry.

10.9.1 In the trained-model route there is no genuinely held-out validation
data. The measure used to decide which version of the model to keep is computed
on random cut-outs of the same imagery the model was trained on. It is
therefore a measure of fit rather than of generalisation. The independent check
in HASTE comes later, from the human validation sample, which is the number a
reader should rely on.

10.9.2 The meaning of each class is fixed by its position in a list. Damaged
Building is understood downstream as the third class and Cloud as the fourth.
An analyst who reorders the classes when setting up a project will get damage
figures computed from the wrong category, without any error being raised.

10.9.3 Several defaults disagree between the worked example, the web form, and
the server, most visibly for the number of training passes. Two analysts
following the documentation by different routes may not be running the same
configuration.

10.9.4 Predictions are matched to buildings by their position in a file rather
than by an identifier. This is fast, and it means that anything which reorders
or filters the building list between steps would silently misattribute damage.
The developers are evidently aware of the risk, since the code goes to some
trouble to preserve row positions even for buildings it cannot assess.

10.10 The platform has not been designed, tested, or validated for production
deployment or autonomous decision-making, and its outputs are not authoritative
damage assessments. The documentation states plainly that users should not rely
solely on HASTE outputs for decisions affecting safety, property, or human
life, and should not use them to trigger public alerts or resource deployments
without independent verification.

---

## 11. Practical Nature of the Platform

11.1 HASTE is a full web application rather than a single page or a script. It
consists of a browser interface, a set of programming interfaces that the
interface calls, background workers that handle long jobs such as preparing
imagery and training models, a tile server that streams large satellite images
into the map view, and a shared Python library holding the analysis logic.

11.2 It can be run in two ways. A complete local instance can be started on one
machine using Docker, a tool that packages software with everything it needs to
run, which requires no cloud account and is intended for evaluation. A
production instance is deployed to Microsoft Azure with a single command, and
the deploying organisation controls it entirely.

11.3 The local configuration is explicitly flagged as unsuitable for
production, since it disables authentication and uses an in-memory storage
emulator. A separate hardening checklist is provided for real deployments.

11.4 The repository shows active and careful security practice, including
automated code scanning and secret scanning, and documented handling of known
vulnerabilities in the underlying geospatial libraries where a patched version
was not available. Sample data from Hurricane Melissa and the Lahaina wildfire
is published so that the platform can be tried without sourcing imagery first.

---

## 12. Intended Audience and Use

12.1 HASTE is aimed at trained humanitarian and disaster-response
practitioners working with post-event imagery, and at researchers studying
rapid damage-assessment methods. The documentation names non-governmental
organisations, United Nations agencies, and government users as the intended
downstream consumers of its outputs.

12.2 Its stated purpose is to contribute information to preliminary damage
assessment in the first hours and days, supplementing rather than replacing
expert assessment, and to indicate where damage may be concentrated so that
attention can be directed.

12.3 It is explicitly not intended as an authoritative damage register, as
ground truth for insurance, governmental, or public-reporting purposes, as the
sole basis for search-and-rescue tasking or resource allocation, or as any kind
of automated alerting system.

---

## 13. Conclusion

13.1 HASTE's most useful contribution is not a modelling advance but a
reallocation of labour. It moves the machine-learning work out of the way so
that the scarce resource, the judgment of someone who can look at an image and
know what damage looks like in that country, is applied where it counts: to
choosing the imagery, marking the examples, and checking the answer. The model
is small, disposable, and fitted to one event, and the platform treats it as
such.

13.2 The reporting design is equally deliberate. By requiring an independent
human validation sample before it will publish an accuracy figure, by
separating precision from recall rather than averaging them away, by setting
cloud-obscured buildings aside instead of counting them as intact, and by
attaching a confidence interval to its headline number, the platform makes it
harder to mistake a fast estimate for a survey.

13.3 The honest reading is that HASTE is fast, transparent about its
assumptions, and constrained by things it does not control. Its ceiling is set
by the resolution of the imagery available and the completeness of the building
outlines beneath it, and both of those are weakest in the places where
humanitarian need is greatest. That is not a flaw in the software so much as a
statement about the wider data landscape, but it means the platform's value in
any given response depends on conditions decided long before the disaster
occurred. Read alongside its own documented limitations, it is a credible
example of a machine-learning tool built to assist expert judgment rather than
to displace it.

---

## Attribution

HASTE was developed by the Microsoft AI for Good Lab and released as open-source
software under the MIT Licence. The contributors recorded in this repository's
commit history are Meygha Machado, Caleb Robinson, Joaquín Rivero, Cameron
Birge, Marcelo Duarte, and Anthony Cintron Roman. The accompanying research
paper, "HASTE: A Platform for Rapid Post-Disaster Building Damage Assessment"
(arXiv:2607.11838), additionally credits Anthony Ortiz, Simone Fobi Nsutezo,
Kevin White, Inbal Becker-Reshef, and Juan M. Lavista Ferres.

This plain-language report was prepared under the Ethical Tech CoLab at the
NYU Center for Global Affairs as part of masters research (2026), on the fork
of the project held at `Ethical-Tech-CoLab/haste`.


> Note: This report is a plain-language summary of an applied research
> platform. HASTE outputs are preliminary and exploratory, are not
> authoritative damage assessments, and are not a substitute for field survey,
> ground-truth reporting, or assessment by qualified humanitarian and
> geospatial professionals.
