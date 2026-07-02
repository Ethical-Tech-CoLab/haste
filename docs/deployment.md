# Deployment Guide

This guide covers deploying HASTE to various environments.

## Azure Deployment

HASTE is provisioned and deployed with the
[Azure Developer CLI (`azd`)](https://learn.microsoft.com/azure/developer/azure-developer-cli/),
which applies the Bicep in [`infra/`](../infra) and deploys the three Function
Apps and the Static Web App in one command. See
[`setup/README.md`](../setup/README.md) for the full quickstart and
[`configuration.md`](configuration.md) for the configuration matrix.

### Prerequisites

- An Azure subscription and rights to create resources in it.
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) and
  [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd) (`azd`).
- [PowerShell 7+](https://learn.microsoft.com/powershell/scripting/install/installing-powershell) (`pwsh`) — the deploy hooks are cross-platform PowerShell.
- [Node.js](https://nodejs.org/) and the [Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/) (`swa`), plus Python 3.11.

### Provision and deploy

```bash
azd auth login
az login

# Create an environment and set the required configuration.
azd env new dev3
azd env set HASTE_RESOURCE_PREFIX      ai4gl
azd env set HASTE_RANDOM_SUFFIX        dev3
azd env set AZURE_LOCATION             westus2
azd env set HASTE_APIM_PUBLISHER_EMAIL you@example.com

# Provision infrastructure and deploy the apps.
azd up
```

`azd up` provisions all resources, deploys the `api`, `titiler`, and `queues`
Function Apps, then runs the postdeploy hook: it publishes the UI to the Static
Web App, syncs APIM operations and injects the Function host key, seeds default
admin settings and the first admin user, and invites the first admin.

### Configuration

All settings are supplied with `azd env set <NAME> <value>` before `azd up` — no
in-place `<REPLACE_ME>` edits and no manually pasted connection strings (the
email backend is provisioned in-IaC). The full matrix, including Batch
create-vs-bring-your-own, the email sender domain, the Front Door flag,
development mode, and the first-admin seed, is documented in the
[configuration guide](configuration.md).

### Preview changes (what-if)

```bash
azd provision --preview
```

This runs `az deployment sub what-if` and reports what would change against the
live environment without applying anything.

## Local Development

### Docker Compose

Use Docker Compose for local development:

```bash
cd docker
docker-compose up -d
```

The `docker/docker-compose.yml` defines the following services:

| Service | Base Image | Port | Description |
|---------|-----------|------|-------------|
| `training` | Azure ML GPU (CUDA 11.8) | — | Model training with GPU support (20GB shared memory) |
| `api` | Azure Functions Python 3.11 | 7071 | REST API (commented out by default) |
| `ui` | Node.js 20 | 5000 | Production UI build (commented out by default) |
| `emulators` | Azurite | 10000-10002 | Azure Storage emulator (commented out by default) |

Uncomment the services you need in `docker-compose.yml`. The training service mounts `../data/training` for data access.

### Manual Setup

For manual local setup:

1. **Start API services**:

   ```bash
   cd api/hastefuncapi
   func host start
   ```

2. **Start queue processing**:

   ```bash
   cd api/hastefuncqueues
   func host start
   ```

3. **Start UI**:

   ```bash
   cd ui
   npm install
   npm run dev
   ```

## Production Considerations

### Security

For production deployments, follow the [Secure Configuration Guidance](security-configuration.md) — it covers identity and authentication setup, secrets management with managed identity and Key Vault, CORS and HTTP security headers, container hardening, logging and monitoring, and known limitations with operational mitigations. The guide also includes a pre-production checklist.

### Monitoring

- **Enable Application Insights** for monitoring and logging
- **Set up alerts** for critical failures
- **Monitor resource usage** and scale accordingly

### Backup and Recovery

- **Regular backups** of CosmosDB data
- **Blob storage redundancy** for imagery data
- **Disaster recovery plan** for critical systems

## CI/CD Pipeline

### Azure Pipelines

The project uses Azure Pipelines (`azure-pipelines.yml`) for security and compliance scanning on pushes to `master`:

- **CredScan** — Credential scanning
- **VulnerabilityAssessment** — Security vulnerability detection
- **PoliCheck** — Content policy checking
- **ComponentGovernanceComponentDetection** — Dependency scanning (High alert level)

### Docker Image Build & Push

The `build_and_push_images.sh` script builds and pushes Docker images to Azure Container Registry:

```bash
# Build and push training image
./build_and_push_images.sh -t latest -i training

# Build and push imagery prep image
./build_and_push_images.sh -t latest -i imageryprep

# Build and push all images
./build_and_push_images.sh -t v1.0 -i all
```

Images are pushed to your ACR as `hastetraining` and `hasteimageryprep`. Set `ACR_NAME` in `build_and_push_images.sh` to your registry name before running.

## Troubleshooting

### Common Issues

**Function App Cold Start**
: Functions may have slow initial response. Consider using Premium plans for production.

**Storage Connection Issues**
: Verify connection strings and ensure storage account is accessible.

**CORS Errors**
: Configure CORS settings in Function App to allow UI domain.

**Memory Issues**
: Large imagery processing may require Premium or Dedicated plans.

### Logs and Diagnostics

- **Application Insights** for detailed telemetry
- **Function App logs** via Azure Portal or CLI
- **Storage diagnostics** for blob access issues
