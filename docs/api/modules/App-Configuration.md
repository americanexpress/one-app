[👈 Return to Overview](../API.md)

# App Configuration

The App Configuration API, `appConfig` allows a module to specify a selection of configuration options for [Holocron Modules](../API.md#modules).

```js
// Force tree shaking appConfig away in client bundles
if (!global.BROWSER) {
  MyModule.appConfig = {
    /* Root Module Specific */
    provideStateConfig,
    csp,
    corsOrigins,
    configureRequestLog,
    extendSafeRequestRestrictedAttributes,
    createSsrFetch,
    /* Child Module Specific */
    validateStateConfig,
    requiredSafeRequestRestrictedAttributes,
    /* All Modules */
    appCompatibility,
  };
}
```

In practice, we declare an `appConfig` as a static attached to the parent React
Component in a One App Module. The `appConfig` settings are intended for the
Server only and is invoked and validated on the initial load of the Module on
the Server. For performance and security purposes, we recommend wrapping this
logic in an `if (!global.BROWSER)` block, to only bundle `appConfig` inside the
Node Bundle (e.g.`mymodule.node.js`) rather than the Browser Bundles (e.g.
`mymodule.browser.js` or `mymodule.legacy.js`). This is good practice for
security and bundle size considerations.

**Contents**
- `Module.appConfig`
  - [`provideStateConfig`](#providestateconfig)
  - [`csp`](#csp)
  - [`corsOrigins`](#corsorigins)
  - [`pwa`](#pwa)
  - [`configureRequestLog`](#configurerequestlog)
  - [`extendSafeRequestRestrictedAttributes`](#extendsaferequestrestrictedattributes)
  - [`createSsrFetch`](#createssrfetch)
  - [`validateStateConfig`](#validatestateconfig)
  - [`requiredSafeRequestRestrictedAttributes`](#requiredsaferequestrestrictedattributes)
  - [`appCompatibility`](#appcompatibility)

## `provideStateConfig`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

**Shape**

```js
if (!global.BROWSER) {
  Module.appConfig = {
    provideStateConfig: {
      [settingName]: {
        client: {
          [environmentLevel]: String,
        },
        server: {
          [environmentLevel]: String,
        },
      },
    },
  };
}
```

The `provideStateConfig` directive is useful for supplying string-based key value settings per runtime (e.g. `client` or `server`) and per `environmentLevel` (e.g. QA, Prod, etc). The `environmentLevel` is specified in the [`ONE_CONFIG_ENV` environment variable](../server/Environment-Variables.md#one_config_env) when running the Server.

In practice, the state config supplied by a Root Module may look like this shape:

```js
if (!global.BROWSER) {
  Module.appConfig = {
    provideStateConfig: {
      someApiUrl: {
        client: {
          development: 'https://internet-origin-dev.example.com/some-api/v1',
          qa: 'https://internet-origin-qa.example.com/some-api/v1',
          production: 'https://internet-origin.example.com/some-api/v1',
        },
        server: {
          development: 'https://intranet-origin-dev.example.com/some-api/v1',
          qa: 'https://intranet-origin-qa.example.com/some-api/v1',
          production: 'https://intranet-origin.example.com/some-api/v1',
        },
      },
      someBooleanValue: {
        client: true,
        server: true,
      },
      someNumberValue: {
        client: {
          development: 480000,
          qa: 480000,
          production: 480000,
        },
        server: {
          development: 480000,
          qa: 480000,
          production: 480000,
        },
      },
    },
  };
}
```

Based on `environmentLevel`, the String values are injected into the global [`config` reducer](./State-Management.md#config) in One App's global Redux state. These values may be accessed by Modules using Redux's `mapStateToProps`.

**📘 More Information**
* Example: [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* [`validateStateConfig`](#validatestateconfig)
* Source: [`config` reducer](../../../src/universal/ducks/config.js)

## `csp`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

⚠️ Required Directive

> 👮**Security Feature**: Limits the scripts and assets allowed to load.

**Shape**
```js
if (!global.BROWSER) {
  RootModule.appConfig = {
    csp: String,
  };
}
```

The `csp` static `String` should be a valid [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) for your application which will be passed on to the HTML markup rendered by the Browser.

> We recommend using something like [content-security-policy-builder](https://www.npmjs.com/package/content-security-policy-builder) to create your CSP string. This is set up automatically when you use the [One App module generator](https://github.com/americanexpress/one-app-cli/tree/master/packages/generator-one-app-module).

You'll still want the ability to run One App and serve modules locally without running into CSP errors. When `NODE_ENV=development`, One App will dynamically add both your computer's IP address and `localhost` to the root module's CSP. Please note that the `script-src` and `connect-src` directives must already be defined in your CSP in order for this to work properly.

**📘 More Information**
* Example: [Frank Lloyd Root's CSP](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/csp.js)
* [content-security-policy-builder](https://www.npmjs.com/package/content-security-policy-builder)

## `corsOrigins`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

> 👮**Security Feature**: Limits the reachable origins for fetching data and assets.

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    corsOrigins: [String],
  };
}
```

The `corsOrigins` directive accepts an array of `String` URL origin domains.
This will allow requests from those origins to make POST requests to the server.

In practice, this allows POST requests from given origins to return partially rendered Modules.

**📘 More Information**
* [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* In Practice: [Partial Rendering](../../../README.md#partial-rendering)

## `pwa`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

> ⚠️ The PWA feature is behind a feature flag `ONE_SERVICE_WORKER` that needs to be
> set to "true" during runtime.

The `pwa` directive is how we configure the service worker and various PWA features.
There are three distinct service workers with their given purpose. To use
the standard service worker, we can set the `serviceWorker` to true. If there
was any failure caused by the service worker, we can use the recovery service
worker with `recoveryMode` set to true if we wish to reset browser clients. In
the event we want to purge the service worker and remove any existing service
workers on browser clients, We can use the escape hatch worker by setting
`escapeHatch` to true.

While in normal circumstances we would want to use the standard `serviceWorker`,
`recoveryMode` and `escapeHatch` are there to help the origin that `one-app` is deployed on;
to safely transition their service worker installation on existing clients that have them. If we have
a healthy service worker in place and simply want to start removing our service worker for any
given reason, we would enable the `escapeHatch` to segway clients out of the current service worker
that is registered. In the case that there is a malfunction with the service worker, we can use
`recoveryMode` to reinstall the service worker with a safe alternative to avoid zombie workers
from persisting. Afterwards, we can either opt back in to using the standard service worker,
or the `escapeHatch` to remove it altogether.

There is a precedence to which of the three flags is respected and the order goes:

1. `serviceWorker`
2. `escapeHatch`
3. `recoveryMode`

What this means is, if we set `{ recoveryMode: true, escapeHatch: true }`, `escapeHatch`
will be honored (and enabled) instead of `recoveryMode`. To enable either of these modes,
make sure to omit `{ serviceWorker: true }` when desiring to set either of the two optional
modes since it is applied.

For the variety of service workers available, we have control to set its
`scope` with the desired pathname and assign what url base the service worker
can oversee.

**Shape**
```js
if (!global.BROWSER) {
  RootModule.appConfig = {
    pwa: {
      // having enabled set to true will enable the service worker and will be
      // registered when one-app is loaded in the browser
      serviceWorker: true,
      // in the case we need to reset our clients from a faulty service worker
      // we can use the noop worker to replace the older worker
      recoveryMode: false,
      // if we want to remove the service worker altogether, we can deploy
      // an escape hatch worker to immediately remove itself on install
      escapeHatch: false,
      // we can optionally define a scope to use with the service worker
      scope: '/',
    },
  };
}
```

**📘 More Information**
* Environment Variable: [`ONE_SERVICE_WORKER`](../server/Environment-Variables.md#one_service_worker)
* Example: [Frank Lloyd Root's `pwa` config](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.3/src/pwa.js)

## `configureRequestLog`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    configureRequestLog: ({
      req, // Express req
      log, // One App Log Shape
    }) => ({
      // returns reshaped log object
    }),
  };
}
```

The `configureRequestLog` directive accepts a callback that takes Express's `req` and One App's `log` object. This allows for customizing the `log` object based on `req` parameters to add additional metadata to the logger.

**Log Shape**
```
{
  type: 'request',
  request: {
    direction,
    protocol,
    address: {
      uri,
    },
    metaData: {
      method,
      correlationId,
      host,
      referrer,
      userAgent,
      location,
      forwarded,
      forwardedFor,
      locale,
    },
    timings: {
      // See values in https://www.w3.org/TR/navigation-timing/
    },
    statusCode,
    statusText,
  },
};
```

**📘 More Information**
* Example: [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)

## `extendSafeRequestRestrictedAttributes`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

> 👮**Security Feature**: Limits headers and cookies from being passed to Redux's initial state.

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    extendSafeRequestRestrictedAttributes: {
      headers: [String],
      cookies: [String],
    },
  };
}
```

The `extendSafeRequestRestrictedAttributes` directive accepts a list of cookie names in `cookies` and header identifiers in `headers`. By default all cookies and headers are removed from the Express `req` object as a security precaution. Named cookie and header identifiers may be added to `extendSafeRequestRestrictedAttributes` to allow whitelisted cookies and headers to remain on the Express `req` object. The sanitized `req` object will be passed into the [Vitruvius](https://github.com/americanexpress/vitruvius) method, `buildInitialState` when constructing Redux's initial state on server-side render.

**📘 More Information**
* [`requiredSafeRequestRestrictedAttributes`](#requiredsaferequestrestrictedattributes)
* [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* Library: [Vitruvius](https://github.com/americanexpress/vitruvius)

<!--ONE-DOCS-ID id="createSsrFetch" start-->

## `createSsrFetch`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

**Shape**
```js
if (!global.BROWSER) {
  RootModule.appConfig = {
    createSsrFetch: ({
      req, // Express req
      res, // Express res
    }) => (fetch) => (fetchUrl, fetchOpts) => Promise,
  };
}
```

<!--ONE-DOCS-ID end-->

## `eventLoopDelayThreshold`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    eventLoopDelayThreshold: Number,
  };
}
```

The `eventLoopDelayThreshold` directive accepts a number representing the threshold of the event loop delay (in milliseconds) before opening the circuit. Once the circuit is open, it will remain open for 10 seconds and close at that time pending the event loop delay. The default value is `250`. If you desire to disable the event loop delay potion of the circuit breaker, set this value to `Infinity`. The circuit will also open if the error rate exceeds 10%. In practice, `eventLoopDelayThreshold` allows for tuning server side rendering (SSR) of Modules. We may increase request throughput by temporarily disabling SSR at high load through event loop delay monitoring.

**📘 More Information**
* [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* Library: [Opossum](https://nodeshift.dev/opossum/)

`createSsrFetch` allows for customizing the fetch client used in `one-app` to perform server-side requests.

For example, you may wish to forward cookies or headers from the initial page load request to all the requisite SSR API requests.

**📘 More Information**
* Example: [Frank Lloyd Root's `appConfig`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* Example: [An SSR Fetch Client](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/createFrankLikeFetch.js)
* Using SSR Fetch Client with [`Module.holocron.loadModuleData`](./Loading-Data.md#moduleholocronloadmoduledata)

## `validateStateConfig`
**Module Type**
* 🚫 Root Module
* ✅ Child Module

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    validateStateConfig: {
      server: {
        [settingName]: {
          validate(settingValue) {
            // Throw an error or return undefined
          },
        },
      },
      client: {
        [settingName]: {
          validate(settingValue) {
            // Throw an error or return undefined
          },
        },
      },
    },
  };
}
```

The `validateStateConfig` allows a Child Module to validate settings passed from `provideStateConfig`. Each `settingName` object accepts a `validate(settingValue)` method. The `validate` function may throw an `Error` or return `undefined` depending on validity of the value supplied to the Module on load.

If an `Error` is thrown, the Server will fail to startup or if already running will prevent [Holocron](https://github.com/americanexpress/holocron) from loading the Module dynamically.

**📘 More Information**
* [`provideStateConfig`](#providestateconfig)
* Example: [Picky Frank's `appConfig`](../../../prod-sample/sample-modules/picky-frank/0.0.0/src/components/PickyFrank.jsx)

## `requiredSafeRequestRestrictedAttributes`
**Module Type**
* 🚫 Root Module
* ✅ Child Module

> 👮**Security Feature**: Limits headers and cookies from being passed to Redux's initial state.

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    requiredSafeRequestRestrictedAttributes: {
      headers: [String],
      cookies: [String],
    },
  };
}
```

The `requiredSafeRequestRestrictedAttributes` allows a Child Module to validate settings passed from `extendSafeRequestRestrictedAttributes`. Each whitelisted header in `headers` array and cookie in `cookies` array will be checked against the Root Module's `extendSafeRequestRestrictedAttributes` on the loading of the Child Module. If this does not match entries previously made in Root Module's `extendSafeRequestRestrictedAttributes`, the Child Module will fail to load.

If an `Error` is thrown due to missing required cookies or headers, the Server will either fail to startup or if already running will prevent [Holocron](https://github.com/americanexpress/holocron) from loading the Module dynamically.

**📘 More Information**
* [`extendSafeRequestRestrictedAttributes`](#extendsaferequestrestrictedattributes)
* Example: [Vitruvius Franklin's `appConfig`](../../../prod-sample/sample-modules/vitruvius-franklin/0.0.0/src/components/VitruviusFranklin.jsx)

## `appCompatibility`
**Module Type**
* ✅ Root Module
* ✅ Child Module

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    appCompatibility: String,
  };
}
```

The `appCompatibility` directive accepts a valid [Semantic Version](https://github.com/npm/node-semver) string specifying compatibility with specific One App versions.

For example, we may specify Modules to be compatible with all `v5` releases of One App:

```js
if (!global.BROWSER) {
  Module.appConfig = {
    appCompatibility: '5.x.x',
  };
}
```

If the One App version fails a Module's `appCompatibility` check, the Server will fail to startup or if already running will prevent [Holocron](https://github.com/americanexpress/holocron) from loading the Module dynamically.

**📘 More Information**
* [Node Semver](https://github.com/npm/node-semver)

[☝️ Return To Top](#app-configuration)
