// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Text } from "@fluentui/react";

const ResourcesPage = () => {
  return (
    <div className="container py-4 py-md-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="app-form p-4 p-md-5">
            <h2 className="mb-3">Resources</h2>
            <Text variant="large">
              Use this page as a quick launch pad for supporting materials and
              next steps for your assessment workflow.
            </Text>
            <div className="mt-4">
              <h5 className="mb-2">Helpful links</h5>
              <ul>
                <li>Project dashboard</li>
                <li>Documentation</li>
                <li>Administration tools</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;
