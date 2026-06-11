# Lessons Learned

Practical gotchas encountered while developing in this repository. Add new
entries at the top of the relevant section. Cite file paths so the lesson
can be re-derived if it ever stops applying.

## Docker / local dev stack

### `data-init` must widen perms on the host `data/` bind mount
`hastefuncapi`/`hastefuncqueues` mount `../data:/app/data` and run as the
non-root `appuser` (UID 999), but the host `data/` directory is created
root-owned (mode 755) by docker the first time the compose stack comes
up. Without intervention, the very first chunked upload fails with
`PermissionError: '/app/data/<projectId>'` because `appuser` cannot
`mkdir` under it. The fix lives in the `data-init` service: it bind-mounts
`../data:/shared/app-data` and runs `chmod -R 777 /shared/app-data`
alongside the existing chmod of `/shared/azurite`, before `hastefuncapi`
starts. Re-run `docker compose up -d --force-recreate data-init` after
checking out a fresh worktree where this directory may have been recreated
root-only.

### Restart `api-proxy` after recreating `hastefuncapi`
`docker/nginx.conf` declares the backend with a bare `upstream
functions_backend { server hastefuncapi:8080; }` directive, which makes
nginx resolve the hostname **once at config-load**. After
`docker compose up -d --force-recreate hastefuncapi` (or any rebuild that
re-creates the container) the proxy will keep returning HTTP 404 against
`/api/*` until you also run `docker compose restart api-proxy`.

### `haste-imageryprep` workdir must be appuser-writable
`hastelib/src/hastegeo/workflows/prepare_imagery.py` creates `./logs` at
import time, so anywhere the imageryprep image runs the Python module
the CWD must be writable by `appuser`. The runner-issued command does
`mkdir -p $WORKDIR && cd $WORKDIR && prepare-imagery ...` (see
`hastelib/src/hastegeo/core/processors/imagery.py` `_execute_image_preprocess`)
which provides a fresh, writable scratch dir. Running `python -m ...`
straight from `WORKDIR /app` fails because `/app` is root-owned. If you
need to probe the image, run `python` with the entrypoint overridden and
chdir somewhere writable first:

```
docker run --rm --entrypoint python haste-imageryprep:latest \
  -c "import os; os.chdir('/tmp'); from hastegeo.workflows.prepare_imagery import ImageryWorkflow"
```

### Two worktrees share the docker-compose project name
Default project name is the directory name of the compose file's parent,
which is always `docker/`. If you run `docker compose` from two haste
worktrees (e.g. `/mnt/code/haste/docker/` and
`/mnt/code/haste-custom-footprints/docker/`) the second one clobbers the
first's containers/images. The Azurite blob volume is shared (good — test
data persists), but the running code is whichever worktree most recently
ran `up`. If you need to keep both stacks alive, pass an explicit
`-p <name>` to one of them.

### `docker/.env` must set `DOCKER_GID` for LocalRunner access
`docker/docker-compose.yml` `hastefuncapi`/`hastefuncqueues` use
`group_add: "${DOCKER_GID:-1001}"` for `/var/run/docker.sock`. Set
`DOCKER_GID` in `docker/.env` to `stat -c %g /var/run/docker.sock` on the
host (currently 125 on the dev VM). A new worktree's `docker/.env` is
git-ignored — copy it from a sibling worktree before bringing the stack
up.

### Disk-space budgets for builds
`docker/training/Dockerfile` is a two-stage conda-pack image that
produces a ~22 GB final image and peaks at ~50 GB free space during the
tar→export→load pipeline. `docker/imageryprep/Dockerfile` is ~3 GB.
`docker info | grep "Docker Root Dir"` to confirm the data root —
on this VM it lives on `/mnt` (1.2 TB), not `/` (40 GB). Builds on the
root volume will run out of space without careful pruning.

## hastelib (hastegeo) build & test

### Always pass `HASTE_SKIP_VERSION_BUMP=1` to hatch
`hastelib/haste_build.py`'s `finalize()` hook bumps `__about__.py` and
attempts to upload the wheel to
`researchlabwuopendata.blob.core.windows.net/haste-binaries`. Both fail
under pip-driven or local builds. Set `HASTE_SKIP_VERSION_BUMP=1` in
every invocation:

```
cd hastelib && HASTE_SKIP_VERSION_BUMP=1 \
  /anaconda/envs/haste_build/bin/hatch run test:pytest
```

This is also baked into `api/hastefunc{api,queues}/Dockerfile` and
`docker/imageryprep/Dockerfile` for the in-image pip install.

### The test env requires `hatch-conda` plugin and Azurite
`hastelib/pyproject.toml` declares `type=conda` for the test env, so
`hatch run test:*` needs `hatch-conda` installed in whichever Python
runs hatch (`/anaconda/envs/haste_build` on this VM —
`pip install hatch-conda --quiet`). Most tests are pure-Python, but a
few hit Azurite — keep `docker-azurite-1` running while testing.

### Directory is `hastelib/` but the package is `hastegeo`
Always import as `from hastegeo.core...`. The directory name is a legacy
artefact (see `hastelib/pyproject.toml:9` → `name = "hastegeo"`).

## Pre-commit / linting

### Hooks only run on a subset of paths
`.pre-commit-config.yaml` scopes black/isort/flake8 to
`^(api/|hastelib/|docker/training/code/).*\.py$` with line length 79.
Other Python paths (notably `scripts/`, `notebooks/`) are not
auto-formatted, so don't be surprised if pre-commit passes but a CI lint
that runs over the entire tree fails on those.

### UI lint is broken on Node-modern envs (pre-existing)
`ui/package.json` has `"lint": "eslint . ..."` but the project still
uses ESLint v8 config format (`.eslintrc.*`) while the installed eslint
is v9, which requires `eslint.config.js`. Running `npm run lint` exits
non-zero with a config-file error; this is not a regression introduced
by any change — only `npm run build` is meaningful for verifying UI
changes locally.
