// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Sub-row for a building-embedding model (building labeling workflow).
// Mirrors ModelRow's column layout but exposes an "Interactive Label" action
// (drops into the Azure Maps labeler) and, once predictions have been saved
// (model.gpkgUrl set), the same Validation/Assessment reports as ModelRow.
import {
  DefaultButton,
  IconButton,
  PrimaryButton,
  Text,
  TooltipHost,
} from "@fluentui/react";
import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { apiDelete } from "../../util/api";
import { AppContext } from "../../AppContext";
import StatusIndicator from "../OtherComponents/StatusIndicator";
import ValidationReportModal from "../BuildingValidation/ValidationReportModal";
import AssessmentReportModal from "../BuildingValidation/AssessmentReportModal";
import { limitTextLength } from "../../util/conversion";

// Friendly per-row label for the embedding backbone column. The Model schema
// stores ``embeddingModel`` as the raw backbone name passed to the workflow
// (e.g. "mosaiks", "dinov2_vits14"); these display strings keep the parameter
// dim visible inline so users can tell at a glance which row produced 1024-dim
// features vs DINOv2's 768-dim.
//
// Keep in sync with EMBEDDING_MODEL_OPTIONS in CreateEditEmbeddingModal.jsx
// and build_embedding_model() in hastelib/src/hastegeo/workflows/embed_buildings.py.
const EMBEDDING_MODEL_LABELS = {
  mosaiks: "MOSAIKS",
  dinov2_vits14: "DINOv2 ViT-S/14",
  dinov2_vitb14: "DINOv2 ViT-B/14",
  dinov2_vitl14: "DINOv2 ViT-L/14",
};

function formatEmbeddingModel(model) {
  const name = model.embeddingModel || "mosaiks";
  const label = EMBEDDING_MODEL_LABELS[name] || name;
  // MOSAIKS exposes a configurable output dim — surface it (and resize factor
  // since the two together fully describe the run). DINOv2 dim is fixed per
  // variant and already implied by the label, so just keep it clean.
  if (name === "mosaiks") {
    const parts = [];
    if (model.numFeatures) parts.push(`${model.numFeatures} feats`);
    if (model.resizeFactor) parts.push(`${model.resizeFactor}x resize`);
    return parts.length ? `${label} (${parts.join(", ")})` : label;
  }
  return label;
}

const EmbeddingModelRow = ({
  model,
  projectId,
  imageLayerId,
  index,
  fetchProjectDetails,
}) => {
  EmbeddingModelRow.propTypes = {
    model: PropTypes.object.isRequired,
    projectId: PropTypes.string.isRequired,
    imageLayerId: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    fetchProjectDetails: PropTypes.func.isRequired,
  };

  const { setDialog, setIsLoading } = useContext(AppContext);
  const navigate = useNavigate();
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [showAssessmentReport, setShowAssessmentReport] = useState(false);

  const isProcessed = model.status === "Processed";
  const hasPredictions = !!model.gpkgUrl;
  const createdDate = model.creationDate
    ? `${model.creationDate.substring(0, 10)} ${model.creationDate.substring(
        11,
        19
      )}`
    : "";

  async function handleDeletion() {
    setDialog();
    setIsLoading(true, "Removing Embedding...");
    try {
      await apiDelete(
        `DeleteModel?projectId=${projectId}&modelId=${model.modelId}`
      );
      fetchProjectDetails();
    } catch (error) {
      console.error("Error removing embedding:", error);
      setDialog("Error", "There was an error removing the embedding.");
    }
    setIsLoading(false);
  }

  const reportsMenu = {
    items: [
      {
        key: "validationReport",
        text: "Validation Report",
        iconProps: { iconName: "ReportDocument" },
        disabled: !hasPredictions,
        onClick: () => setShowValidationReport(true),
      },
      {
        key: "assessmentReport",
        text: "Assessment Report",
        iconProps: { iconName: "AnalyticsReport" },
        disabled: !hasPredictions,
        onClick: () => setShowAssessmentReport(true),
      },
    ],
  };

  const moreMenuOptions = {
    items: [
      {
        key: "remove",
        text: "Remove",
        iconProps: { iconName: "Delete" },
        onClick: () => {
          setDialog("Important", `Do you want to remove this embedding?`, [
            {
              type: "primary",
              key: "yes",
              text: "Yes",
              onClick: handleDeletion,
            },
            {
              type: "default",
              key: "no",
              text: "No",
              onClick: () => setDialog(),
            },
          ]);
        },
      },
    ],
  };

  return (
    <tr>
      <td className="pe-3 custom-text-no-wrap">
        <TooltipHost content={model.name} delay={2}>
          <Text variant="small">
            <span>{limitTextLength(model.name, false, 59)}</span>
          </Text>
        </TooltipHost>
      </td>
      <td className="pe-3 custom-text-no-wrap d-none d-xxl-table-cell">
        <Text variant="small">
          <span className="fw-semibold">Embedded:</span> {createdDate}
        </Text>
      </td>
      <td className="pe-3 custom-text-no-wrap d-none d-xxl-table-cell">
        <Text variant="small">
          <span className="fw-semibold">User: </span>
          {limitTextLength(model.userId, false, 35)}
        </Text>
      </td>
      <td className="pe-3 custom-text-no-wrap">
        <TooltipHost
          content={`Backbone: ${model.embeddingModel || "mosaiks"}`}
          delay={2}
        >
          <Text variant="medium">{formatEmbeddingModel(model)}</Text>
        </TooltipHost>
      </td>
      <td className="pe-3 custom-text-no-wrap d-flex align-items-center">
        <StatusIndicator
          currentStep={model.currentStep}
          totalSteps={model.totalSteps}
          progressPct={model.progressPct}
          status={model.status}
          statusMessage={model.statusMessage}
          id={`singleEmbeddingStatus${index}`}
          prefix={formatEmbeddingModel(model)}
        />
      </td>
      <td className="pe-3 custom-text-no-wrap">
        <div className="d-flex align-items-center pt-1 pb-1">
          <DefaultButton
            id={"interactiveLabel" + index}
            className="dashboard-button"
            onClick={() =>
              navigate(
                `/interactive-label/${projectId}/${imageLayerId}/${model.modelId}`
              )
            }
            disabled={!isProcessed}
          >
            Interactive Label
          </DefaultButton>{" "}
          <PrimaryButton
            id={"embeddingReports" + index}
            text="Reports"
            menuProps={reportsMenu}
            allowDisabledFocus
            className="dashboard-button ms-2"
            disabled={!hasPredictions}
          />
        </div>
      </td>
      <td>
        <IconButton
          id={`singleEmbeddingMoreOptions${index}`}
          className="no-dropdown-icon"
          menuProps={moreMenuOptions}
          iconProps={{ iconName: "more" }}
          title="Menu"
          ariaLabel="Menu"
        />
      </td>
      {showValidationReport && (
        <ValidationReportModal
          projectId={projectId}
          imageLayerId={imageLayerId}
          modelId={model.modelId}
          modelName={model.name}
          onDismiss={() => setShowValidationReport(false)}
        />
      )}
      {showAssessmentReport && (
        <AssessmentReportModal
          projectId={projectId}
          imageLayerId={imageLayerId}
          modelId={model.modelId}
          modelName={model.name}
          onDismiss={() => setShowAssessmentReport(false)}
        />
      )}
    </tr>
  );
};

export default EmbeddingModelRow;
