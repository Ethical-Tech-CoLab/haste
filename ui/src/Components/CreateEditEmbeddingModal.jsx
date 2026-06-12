// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Modal to customize and launch a building-embedding job (building labeling
// workflow). Mirrors CreateEditModelTrainingModal — collects the MOSAIKS
// parameters and POSTs to PutRunEmbeddingQueueMessage.
import { useContext, useState } from "react";
import { TextField } from "@fluentui/react";
import {
  DefaultButton,
  PrimaryButton,
} from "@fluentui/react/lib/Button";
import proptypes from "prop-types";

import { apiPut } from "../util/api";
import { validateInt } from "../util/validation";
import { AppContext } from "../AppContext";
import SectionModal from "./SectionModal";

const CreateEditEmbeddingModal = ({
  onClose,
  projectId,
  imageLayer,
  fetchProjectDetails,
}) => {
  CreateEditEmbeddingModal.propTypes = {
    onClose: proptypes.func.isRequired,
    projectId: proptypes.string.isRequired,
    imageLayer: proptypes.object.isRequired,
    fetchProjectDetails: proptypes.func,
  };

  const { setDialog, appParams, setIsLoading } = useContext(AppContext);
  const [state, setState] = useState({
    name: "embedding-" + Date.now(),
    nameError: "",
    numFeatures: "1024",
    numFeaturesError: "",
    resizeFactor: "4",
    resizeFactorError: "",
    batchSize: "16",
    batchSizeError: "",
  });

  function onField(value, key) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function submit() {
    const numFeaturesError = validateInt("Number of features", state.numFeatures);
    const resizeFactorError = validateInt("Resize factor", state.resizeFactor);
    const batchSizeError = validateInt("Batch size", state.batchSize);
    if (numFeaturesError || resizeFactorError || batchSizeError) {
      setState((s) => ({
        ...s,
        numFeaturesError,
        resizeFactorError,
        batchSizeError,
      }));
      return;
    }

    setIsLoading(true, "Starting embedding job...");
    try {
      await apiPut("PutRunEmbeddingQueueMessage", {
        projectId,
        imageLayerId: imageLayer.imageLayerId,
        modelType: "embedding",
        name: state.name,
        embeddingModel: "mosaiks",
        numFeatures: parseInt(state.numFeatures, 10),
        resizeFactor: parseInt(state.resizeFactor, 10),
        batchSize: state.batchSize,
        userId: appParams.userId,
      });
      onClose();
      if (fetchProjectDetails) fetchProjectDetails();
      setDialog("Success", "Embedding job started.", [
        {
          type: "primary",
          key: "close",
          text: "Close",
          onClick: () => setDialog(),
        },
      ]);
    } catch (error) {
      console.error("Error starting embedding job:", error);
      setDialog("Error", "Failed to start the embedding job.");
    }
    setIsLoading(false);
  }

  return (
    <SectionModal
      title="New Embedding"
      icon="OpenFolderHorizontal"
      onClose={onClose}
      body={
        <>
          <div className="row mb-2">
            <div className="col-12">
              <TextField
                id="createEmbeddingName"
                label="Name"
                value={state.name}
                onChange={(e, v) => onField(v, "name")}
                errorMessage={state.nameError}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-12">
              <p style={{ fontSize: 12, color: "#666", margin: "8px 0" }}>
                Embeds the imagery around each building footprint with the
                MOSAIKS model and builds the per-building feature table used by
                the interactive labeler.
              </p>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col-12 flex-column flex-md-row d-flex">
              <TextField
                id="createEmbeddingNumFeatures"
                label="Number of features"
                className="me-0 me-md-4 mb-2"
                value={state.numFeatures}
                onChange={(e, v) => onField(v, "numFeatures")}
                errorMessage={state.numFeaturesError}
                required
              />
              <TextField
                id="createEmbeddingResizeFactor"
                label="Resize factor"
                className="me-0 me-md-4 mb-2"
                value={state.resizeFactor}
                onChange={(e, v) => onField(v, "resizeFactor")}
                errorMessage={state.resizeFactorError}
                required
              />
              <TextField
                id="createEmbeddingBatchSize"
                label="Batch size"
                className="mb-2"
                value={state.batchSize}
                onChange={(e, v) => onField(v, "batchSize")}
                errorMessage={state.batchSizeError}
                required
              />
            </div>
          </div>
          <div className="row">
            <div className="col-12 d-flex justify-content-end">
              <PrimaryButton
                className="me-2"
                onClick={submit}
                id="createEmbeddingSubmit"
              >
                Embed
              </PrimaryButton>
              <DefaultButton onClick={onClose}>Cancel</DefaultButton>
            </div>
          </div>
        </>
      }
    />
  );
};

export default CreateEditEmbeddingModal;
