<!-- SOURCE OF TRUTH: This page duplicates the in-app Help Docs
     (ui/src/Components/HelpDocs/HelpDocsOverview.jsx). Keep the two in sync
     until the content is consolidated to a single source. -->

# Overview

**HASTE**, or High-speed Assessment and Satellite Tracking for Emergencies, is an
AI-powered tool designed by the **Microsoft AI for Good Lab** to quickly identify and
evaluate structural damage to buildings after a catastrophe.

Leveraging advanced image analysis and machine learning, it empowers emergency
responders and authorities to prioritize critical areas, accelerate recovery efforts,
and enhance safety assessments.

The basic workflow is to add imagery to a project, label a small area of the imagery
with some classification labels, and use this to train the model. The model will apply
these learnings to generate damage predictions across the entire imagery.

<video controls width="100%" src="../_static/usage/overview/overview-end-to-end-example.mp4">
Your browser does not support the video tag.
</video>

## The workflow at a glance

| Step | What it is |
|------|------------|
| [Projects](projects.md) | A collection of image layers and the damage assessments conducted on them |
| [Image Layers](image-layers.md) | Satellite imagery files for an area of interest |
| [Labeling](labeling.md) | Annotate satellite imagery to train the model |
| [Model Training](model-training.md) | Train a model to predict damage across the entire imagery |
| [Results](results.md) | View the model predictions and download them in various formats |
| [Model Catalog](model-catalog.md) | Reuse trained models as base models for future runs |
