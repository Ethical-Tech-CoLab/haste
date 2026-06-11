// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
  Checkbox,
  ActionButton,
  Text,
  Slider,
} from "@fluentui/react";

import { useState, useContext } from "react";
import PropType from "prop-types";
import { AppContext } from "../../AppContext";

const InfoPanel = ({
  togglePredictedDamageLayerVisibility,
  resetMapPosition,
  visualizerResults,
  buildingFootprintsOverlay,
  toggleBuildingFootprintsVisibility,
  updateBuildingFootprintsOpacity,
}) => {
  const [panelVisibility, setPanelVisibility] = useState("");
  const { appParams } = useContext(AppContext);

  const togglePanelVisibility = () => {
    if (panelVisibility === "d-none") {
      setPanelVisibility("");
    } else {
      setPanelVisibility("d-none");
    }
  }

  return (
    <>
      <div
        className="absolute-labels info-panel col-12"
      >
        <ActionButton
          iconProps={{ iconName: panelVisibility === "" ? "chevronDown" : "chevronUp" }}
          onClick={() => {
            togglePanelVisibility();
          }}
        >
          <span className="ms-2 fw-semibold">{appParams.bootstrapBreakpoint > 0 ? "Map Settings" : "Legend"}</span>
        </ActionButton>

        <div className={panelVisibility + " ps-3 pe-3"}>


          <div className="d-flex flex-column">
            <Text variant="small" className="fw-bold mt-3 mb-3 d-none">
              Select Imagery Layers
            </Text>
            <div
              className="mt-3 info-panel-checkboxes-wrapper d-none d-xl-flex flex-column"
            >
              <Checkbox
                defaultChecked={true}
                label="Predicted building damage layer"
                onChange={(e, checked) =>
                  togglePredictedDamageLayerVisibility(
                    "predictedDamageLayer",
                    checked
                  )
                }
              />
              <Checkbox
                className="mt-2"
                defaultChecked={false}
                label="Predictions layer (raw)"
                onChange={(e, checked) =>
                  togglePredictedDamageLayerVisibility(
                    "predictionsLayer",
                    checked
                  )
                }
              />
              {buildingFootprintsOverlay?.available && (
                <div className="mt-2">
                  <Checkbox
                    defaultChecked={true}
                    label={
                      buildingFootprintsOverlay.name || "Building footprints"
                    }
                    onChange={(e, checked) =>
                      toggleBuildingFootprintsVisibility(checked)
                    }
                  />
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={
                      (buildingFootprintsOverlay.opacity ?? 0.25) * 100
                    }
                    showValue={false}
                    onChange={(value) =>
                      updateBuildingFootprintsOpacity(value / 100)
                    }
                    styles={{ root: { marginLeft: "22px", maxWidth: "150px" } }}
                  />
                  {buildingFootprintsOverlay.attribution && (
                    <Text
                      variant="tiny"
                      className="d-block"
                      style={{
                        marginLeft: "22px",
                        color: "#666",
                        marginTop: "2px",
                      }}
                    >
                      {buildingFootprintsOverlay.attribution}
                    </Text>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="d-flex flex-column">
            <Text variant="small" className="fw-bold mt-2 d-none d-xl-block">
              Legend
            </Text>

            <img
              src="../../../assets/img/visualizerLegend.png"
              alt="legend"
              className="map-legend mb-3 mt-3"
            />

            <ActionButton
              iconProps={{ iconName: "MapPin" }}
              className="d-none d-xl-block"
              onClick={() => {
                resetMapPosition(visualizerResults.studyArea);
              }}
            >
              Reset map position
            </ActionButton>

          </div>
        </div>
      </div>
    </>
  );
};

InfoPanel.propTypes = {
  togglePredictedDamageLayerVisibility: PropType.func.isRequired,
  resetMapPosition: PropType.func.isRequired,
  visualizerResults: PropType.object.isRequired,
  buildingFootprintsOverlay: PropType.object,
  toggleBuildingFootprintsVisibility: PropType.func.isRequired,
  updateBuildingFootprintsOpacity: PropType.func.isRequired,
};

export default InfoPanel;
