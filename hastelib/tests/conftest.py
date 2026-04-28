# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

"""Shared test configuration and fixtures.

Sets default environment variables for tests when running outside of hatch
(e.g., via ``uv run --extra test pytest``). Hatch's ``[tool.hatch.envs.test.env-vars]``
sets these automatically, but uv/plain pytest does not.
"""

import os

# Azurite Storage Emulator defaults — only used by integration tests
# that connect to a local Azurite instance.
_TEST_ENV_DEFAULTS = {
    "DATA_PATH": "haste_test_data",
    "TEMP_DATA_PATH": "haste_test_tmp",
    "METADATA_STORAGE_TYPE": "blob",
    "ARTIFACT_STORAGE_TYPE": "blob",
    "BLOB_CONNECTION_STRING": (
        "DefaultEndpointsProtocol=http;"
        "AccountName=devstoreaccount1;"
        "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
        "K1SZFPTOtr/KBHBeksoGMGw==;"
        "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
    ),  # pragma: allowlist secret # gitleaks:allow
    "BLOB_CONTAINER": "haste-unittests",
}

for key, value in _TEST_ENV_DEFAULTS.items():
    os.environ.setdefault(key, value)
