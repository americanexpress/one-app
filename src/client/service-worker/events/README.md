# Service Worker Events

### `install`

Initializes the service worker and [skips waiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting)
during service worker installation.

### `activate`

[Claims all the open window clients](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim)
when the service worker is activated.

### `fetch`

Supports caching One App and Holocron module resources in tandem to supporting
offline navigation.

There are two pseudo environment variables used in One App service worker fetch
handler, accessed via `process.env`:

- `process.env.ONE_APP_BUILD_VERSION`
- `process.env.HOLOCRON_MODULE_MAP`

These values are valid to use in node/testing environment as is, however during
build and runtime, these values are textually replaced. `ONE_APP_BUILD_VERSION`
is replaced with One App version during build time, after the app is built. For
`HOLOCRON_MODULE_MAP`, the value is injected into the service worker in the
[service worker middleware](../../../server/middleware/pwa/service-worker.js)
with the most current Holocron module map that was loaded/polled.
