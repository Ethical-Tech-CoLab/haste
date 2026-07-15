// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Text } from "@fluentui/react";

const AboutPage = () => {
  return (
    <div className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="app-form p-4 p-md-5">
            <h2 className="mb-3">About HASTE</h2>
            <Text variant="large">
              HASTE helps emergency response teams quickly assess building damage
              from satellite imagery using AI-assisted workflows.
            </Text>
            <div className="mt-4">
              <h5 className="mb-2">What you can do here</h5>
              <ul>
                <li>Start and manage assessment projects</li>
                <li>Review imagery layers and labeling work</li>
                <li>Coordinate model-driven damage evaluations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
