![HASTE banner](assets/banner.png)

# H A S T E

**High-speed Assessment and Satellite Tracking for Emergencies**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docs](https://img.shields.io/badge/docs-github%20pages-blue)](https://microsoft.github.io/haste)

HASTE is an AI-driven framework for rapid disaster assessment using satellite and remote sensing data. It automates geospatial analysis with machine learning to produce accurate disaster maps, and provides a user-friendly web interface so that non-technical users can generate critical insights alongside disaster experts.

## Quick Start

The fastest way to run HASTE locally is with Docker Compose, which starts the full stack — API, queue workers, tile server, storage emulator, and UI — with no Azure subscription required.

> **Prefer to let an AI agent do it?** [QUICKSTART.md](QUICKSTART.md) is a phased, verify-gated runbook written for coding agents. Point Claude Code or GitHub Copilot at it with a prompt like *"Using QUICKSTART.md, stand up and start a local instance of HASTE"* and it will run the steps, handle platform quirks (e.g. Apple Silicon), and stop at each health-check gate.

**Prerequisites:** [Docker](https://www.docker.com/products/docker-desktop) and [Docker Compose](https://docs.docker.com/compose/install/)

```bash
git clone https://github.com/microsoft/haste.git
cd haste
docker compose -f docker/docker-compose.yml up
```

| Service | URL |
|---------|-----|
| UI | http://localhost:4280 |
| REST API | http://localhost:7071/api/ |
| TiTiler tile server | http://localhost:8000 |
| Azurite storage emulator | http://localhost:10000 |

> **Note:** The Docker Compose stack is for local development and evaluation only. It uses development defaults (in-memory storage emulator, disabled auth, wildcard CORS) that are not suitable for production. See [docs/deployment.md](docs/deployment.md) for production deployment.

> For Azure-connected development and production deployment, see [Project Setup](#project-setup) below and the [full documentation](https://microsoft.github.io/haste).

### See it in action

<p align="center">
  <video src="assets/haste-animation.mp4" autoplay loop muted playsinline width="100%">
    Your browser does not support embedded video. <a href="assets/haste-animation.mp4">Watch the HASTE demo</a>.
  </video>
</p>

## Documentation

Full documentation is published at **[https://microsoft.github.io/haste](https://microsoft.github.io/haste)** and covers:

- [Getting Started](https://microsoft.github.io/haste/getting-started.html)
- [Architecture](https://microsoft.github.io/haste/architecture.html)
- [API Reference](https://microsoft.github.io/haste/api/modules.html)
- [Deployment Guide](https://microsoft.github.io/haste/deployment.html)
- [Secure Configuration Guidance](https://microsoft.github.io/haste/security-configuration.html)

Source for the docs lives in [`docs/`](docs/) and is built with [Jupyter Book](https://jupyterbook.org/).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React UI (Vite)                          │
│  Projects · Labeling Tool · Visualizer · Admin · Model Catalog   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────┐
│               Azure Static Web Apps / SWA CLI                    │
└──────┬────────────────────────────────────────────┬─────────────┘
       │ /api/*                                     │ tile requests
┌──────▼──────────────┐                    ┌────────▼─────────────┐
│   hastefuncapi       │                    │   titilerfuncapi     │
│   (28 HTTP routes)   │                    │   (TiTiler/FastAPI)  │
│   Azure Functions    │                    │   COG tile serving   │
└──────┬──────────────┘                    └──────────────────────┘
       │ Queue messages
┌──────▼──────────────┐
│   hastefuncqueues    │
│   (6 queue triggers) │
│   Azure Functions    │
└──────┬──────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                    haste core library                             │
│  Config · Models · Processors · Data Layers · Runners · Utils    │
└──────┬───────────┬───────────┬───────────┬──────────────────────┘
       │           │           │           │
  ┌────▼───┐  ┌───▼────┐  ┌──▼───┐  ┌───▼──────────┐
  │ Blob   │  │ Cosmos │  │ Data │  │ Azure Batch  │
  │ Storage│  │ DB     │  │ Lake │  │ (GPU pools)  │
  └────────┘  └────────┘  └──────┘  └──────────────┘
```


## Components

| Component | Technology | Description |
|-----------|-----------|-------------|
| **UI** | React + Vite | Single-page app for project management, labeling, and visualization |
| **REST API** (`hastefuncapi`) | Python Azure Functions | HTTP endpoints for CRUD operations |
| **Queue Workers** (`hastefuncqueues`) | Python Azure Functions | Queue-triggered functions for async processing |
| **Tile Server** (`titilerfuncapi`) | TiTiler + FastAPI | Cloud Optimized GeoTIFF tile serving |
| **Core Library** (`haste`) | Python package | Shared models, processors, data layers, and utilities |

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, the pull request process, and the Contributor License Agreement requirement.

- [Open an issue](../../issues) to report a bug or request a feature
- [Start a discussion](../../discussions) for questions or ideas
- [Read the security policy](SECURITY.md) before reporting vulnerabilities

## License

This project is licensed under the MIT License — see [LICENSE.txt](LICENSE.txt) for details.

## Third-Party Software

This project includes third-party components. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for details.
