// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// In dev compose, hastefuncapi returns blob URLs with the docker-internal
// hostname `azurite` (e.g. http://azurite:10000/devstoreaccount1/...). That's
// what the function-app code path needs server-side, but the *browser* can't
// resolve `azurite` — it's a docker network DNS name. Azurite is also bound
// to host port 10000 (docker-compose), so the same blob is reachable from the
// browser at http://localhost:10000/... (or 127.0.0.1).
//
// Most blob fetches in the UI go through api-proxy/titiler server-side and
// never hit this. The pmtiles archive used by the Interactive Labeler is the
// exception: pmtiles.js issues HTTP range requests directly from the browser,
// so the URL we hand it must be browser-resolvable.
//
// This helper is a no-op in production (URL has no `azurite` hostname) and in
// non-local dev (UI not running on localhost). It only rewrites the host when
// the UI is on localhost/127.0.0.1 AND the URL points at the docker name.
export function toBrowserBlobUrl(url) {
  if (typeof url !== "string" || !url) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "azurite") return url;
  if (typeof window === "undefined") return url;
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  if (!localHosts.has(window.location.hostname)) return url;
  parsed.hostname = window.location.hostname;
  return parsed.toString();
}
