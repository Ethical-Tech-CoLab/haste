<!-- SOURCE OF TRUTH: This page duplicates the in-app Help Docs
     (ui/src/Components/HelpDocs/HelpDocsImageLayers.jsx). Keep the two in sync
     until the content is consolidated to a single source. -->

# Image Layers

## What is an Image Layer?

An image layer is the object upon which labeling, training, and predictions are
performed. An image layer can be a single TIFF file, or multiple TIFF files for the same
geographical Area of Interest.

If you have multiple satellite image files for a geographical area of interest, you can
upload them all together and HASTE will combine them into a single mosaic.

### Sources

There are multiple providers of satellite imagery for damage assessment, including but
not limited to the following:

- Maxar Open Data Program — <https://www.maxar.com/>
- Planet Scope — <https://developers.planet.com/docs/data/planetscope>
- Planet Skysat — <https://developers.planet.com/docs/data/skysat>

### Formats

At the moment, HASTE only accepts TIFF (`.tif`) files as valid imagery formats.

## Create a New Image Layer

To create an Image Layer, you must first create a project. Once this is done, select the
desired project from the list of projects. The project details will be displayed, which
includes a button called **Create Image Layer**. Clicking this will take you to the
Image Layer creation form.

Add imagery files by providing publicly accessible URLs or uploading files from a local
directory that show the Area of Interest (AOI). You can also combine files from both a
URL and a local directory. If multiple files are provided in a section, they will be
merged into a single GeoTIFF image; therefore, all files in each section must correspond
to the same AOI. All files must be valid GeoTIFF (`.tif`) files.

<video controls width="100%" src="../_static/usage/imageLayers/image-layers-create-a-new-layer.mp4">
Your browser does not support the video tag.
</video>

## Edit an Image Layer

You can update the name and description for an image layer after it was created from the
Projects page.

<video controls width="100%" src="../_static/usage/imageLayers/image-layers-edit-a-layer.mp4">
Your browser does not support the video tag.
</video>

## Delete an Image Layer

You can delete an image layer using the ellipsis menu on the Projects page.

Deleting an image layer also deletes all its artifacts such as labels, model training
checkpoints, and predictions.

<video controls width="100%" src="../_static/usage/imageLayers/image-layers-delete-a-layer.mp4">
Your browser does not support the video tag.
</video>
