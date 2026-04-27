---
applyTo: "**/*.test.*,**/*.spec.*,**/test_*,**/tests/**"
---

# Testing Instructions

- Write tests that are isolated, deterministic, and well-documented.
- Each test should test one behavior. Use descriptive test names: `test_<what>_<when>_<expected>`.
- Follow the Arrange-Act-Assert (AAA) pattern.
- Python tests: use pytest (via `cd hastelib && hatch run test:pytest`).
- UI tests: use Playwright for E2E validation.
- Mock external dependencies (Azure Blob, Cosmos DB, Azure Batch, queues) — never call real services in unit tests.
- Use Azurite connection string for integration tests (see `pyproject.toml` env vars).
- Include both positive and negative test cases.
- Test edge cases: empty inputs, nulls, boundary values, large GeoTIFF files.
- For geospatial tests, validate CRS preservation, bounds accuracy, and COG compliance.
- Run `cd hastelib && hatch run test:pytest` to validate all Python tests pass.
- Run `cd ui && npm run lint` to validate frontend code quality.
