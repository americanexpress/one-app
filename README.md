[one-app-bundler]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler
[React]: http://reactjs.org/

<h1 align="center">
  <img src='https://github.com/americanexpress/one-app/raw/master/one-app.png' alt="One App - One Amex" width='50%'/>
</h1>

One App is a fresh take on web application development. It consists of a [Node.js](https://nodejs.org)
server that serves up a single page app built using [React] components and
makes use of [Holocron](https://github.com/americanexpress/holocron) to allow for code splitting
via independently developed, tested, and deployed **Holocron Modules**.

Our goal is to provide a web application framework for building fast, scalable, secure, and modular
experiences. Leave the tooling to us and focus on what matters - delivering performant, maintainable experiences to your users.

> While American Express has been using One App in production since 2016, this open source iteration
> of the framework is in a soft launch state. There will be a full documentation site forthcoming.

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [Recipes](#-recipes)
* [API](#%EF%B8%8F-api)
* [License](#-license)
* [Code Of Conduct](#-code-of-conduct)
* [Contributing](#-contributing)

## ✨ Features

- Modular design allowing for groups of UI components to be independently developed, tested, and deployed.
- Server side rendering as a first class citizen.
- Easy configuration management.
- Built-in internationalization.
- Built-in dynamic routing.

## 🤹‍ Usage

### Quick Start

#### Build a Module with [generator-one-app-module](https://github.com/americanexpress/one-app-cli/tree/master/packages/generator-one-app-module)

The easiest way to do this is via [`npx`](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) (comes with `npm` versions 5.2.0 and above). Run the following command in the directory you want your module to live:

```bash
npx -p yo -p @americanexpress/generator-one-app-module -- yo one-app-module
```

This will use the [One App Module Generator](https://github.com/americanexpress/one-app-cli/tree/master/packages/generator-one-app-module) to generate a basic One App module.

#### Clone and Install One App

```bash
export NODE_ENV=development
git clone https://github.com/americanexpress/one-app.git
cd one-app
npm ci --no-optional
```

#### Serve your Module to One App

At the root of your `one-app` repo, run:

```bash
npm run serve-module <local-path-to-generated-module>
# e.g. npm run serve-module ../my-first-module
```

The `serve-module` command generates a `static` folder in the `one-app` root directory, containing a `module-map.json` and a `modules` folder with your bundled module code: 
```
one-app/static
├── module-map.json
└── modules
    └── my-first-module
        └── 1.0.0
            ├── my-first-module.browser.js
            ├── my-first-module.browser.js.map
            ├── my-first-module.legacy.browser.js
            ├── my-first-module.legacy.browser.js.map
            ├── my-first-module.node.js
            └── my-first-module.node.js.map
```

Paired with the built-in [one-app-dev-cdn](https://github.com/americanexpress/one-app-dev-cdn) library, you're able to utilize the [Holocron Module Map](#-building-and-deploying-a-holocron-module-map) while running your entire One App instance locally. No need to deploy and fetch remote assets from a CDN at this step.

#### Declare the module as your Root Module and start One App:

Start up One App and declare your new module as the [Root Module](#-the-root-module):

```bash
npm start -- --root-module-name=<module-name>
# e.g. npm start -- --root-module-name=my-first-module
```

This starts One App and makes it available at http://localhost:3000/ where you can see it in action! 

Open another terminal window, run `npm run watch:build` in your module's directory and make some edits to the module. One App will pick up these changes and update the module bundles accordingly. When you reload your browser window, One App will be displaying your updated module.

### The Root Module

The root module serves as the entry point for one-app to load an application.

```
          | ------ your application ------- |
* one-app -> root-module -> [other modules] |
          | ------------------------------- |
```

It is possible for your application to consist of only the root module, however most application will want to take advantage of code splitting using [Holocron](https://github.com/americanexpress/holocron) and have the root module load other modules. More on this in the [Routing](#-routing) section in the API docs.

For a module to act as the root module the only requirements are:

- Returns a React component bundled with [one-app-bundler](https://github.com/americanexpress/one-app-cli).
- Provides a valid [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) though the [appConfig](#-configuration-with-app-config) static.

**📘 More Information**
* Root Module example: [frank-lloyd-root](https://github.com/americanexpress/one-app/blob/master/prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/components/FrankLloydRoot.jsx)
* [App Configuration in your Root Module](#-app-configuration)
* [What are Holocron Modules?](#-modules)
* [Useful Local Development Commands / Options](#-useful-local-development-commands-options)


## 👩‍🍳 Recipes

### Creating a Holocron Module

### Adding Styles

### Making an API call

### Adding a Route

### Code Splitting using Holocron

### Internationalizing your Module

### Enabling Server Side Rendering

### Partial Rendering

Renders static markup from a Holocron module, rather than a complete page. Useful for reusing a One
App Module's markup on a non One App web page. This will only work when dispatched on the server.

```js
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderPartialOnly(true));
```

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for partial requests and by default there are no allowed origins. Add origins in the root module [corsOrigins](#corsorigins) in the [appConfig](#app-configuration)

See the [`Partial` component](./prod-sample/sample-modules/frank-lloyd-root/0.0.2/src/components/Partial.jsx)
in the `frank-lloyd-root` module for an example implementation.

> Note: for the use case of rendering a complete document (like an email), the top-level component
> can be wrapped in a `<dangerously-return-only-doctype />` (instead of a `<div />` for instance)
> which will be removed from the final render.

### Mocking your API calls for Local Development

<!-- TODO: expand on this section -->

The `set-middleware` command links your module's custom dev middleware file to One App:

```bash
$ npm run set-middleware ../[module-name]/dev.middleware.js
```

This allows you to use your [Parrot](https://github.com/americanexpress/parrot) mocks when developing your module with One App.

The `set-dev-endpoints` command links your module's dev endpoints file to One App.

A `dev.endpoints.js` file contains all the information One App needs to configure [one-app-dev-proxy](https://github.com/americanexpress/one-app-dev-proxy)
(our reverse proxy and mocking server that runs during development) and can be used to set remote endpoints
for your Module to use during local development.

```bash
$ npm run set-dev-endpoints ../[module-name]/dev.endpoints.js
```

A `dev.endpoints.js` file looks like:

```js
module.exports = () => [
  {
    envVarName: 'ONE_CLIENT_APP_API_URL',
    oneAppDevProxyPath: 'api',
    destination: 'https://api.com',
  },
];
```

### Running An Existing One App instance Locally

If you are already on your way to building your application using One App or have an already built
application with One App then you can either serve your local modules to One App or have One App
point to a remote module map it can use to fetch modules:

To serve modules to One App:

```bash
npm run serve-module <path/to/your/module> <path/to/another/module>
```

Once you have your modules served to One App you can start One App.

By default when starting One App only your locally served modules will be used. If you have a remote
module map you would like to have One App load use the `module-map-url` flag. Keep in mind that One
App will combine your locally served modules with the remote module map. Locally served modules will
override modules with the same name in the remote module map.

```bash
NODE_ENV=development npm start -- --module-map-url=<your-remote-module-map-url> --root-module-name=<your-root-module-name>
```

#### Useful Local Development Commands / Options

The `drop-module` command allows you to stop serving a module:

```bash
$ npm run drop-module <module-name>
```

The `log-format` option allows you to specify how you would like One App logs presented to you:

```bash
# available formats are `friendly`, `verbose`, and `machine`. Default is `friendly`
NODE_ENV=development npm start -- --log-format=friendly
```

The `log-level` option allows you to specify the lowest level of logs you would like One App to
present to you:

```bash
# available formats are `error`, `warn`, `log`, `info`. Default is `log`
NODE_ENV=development npm start -- --log-level=warn
```

### Running In Production

One App is battle tested as it has been in use in production within American Express with our most highly trafficked customer facing applications since 2016.

It was built with [The Twelve-Factor App](https://12factor.net/) principles in mind and as such is
highly flexible and independent of its runtime.

#### Building And Deploying Holocron Modules

Holocron Modules are [React] components that are bundled by
[one-app-bundler]
and are the pieces that make up a One App application instance.

Running [one-app-bundler] on a module builds and packages the module's source code into static assets
that can to be deployed to a CDN. It expects `./src/index.js` to export a [React] component and
creates a `build` directory as its output.

Input:
```
root
|── src
|   └── index.js
└── package.json
```


Output:
```
build
└── 1.0.0
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    └── en-us
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

`en-us` contains the language packs used for internationalization for the `en-US` locale. As this is
an example only `en-us` is shown but in your module you may have as many or few locales as needed.

`<moduleName>.browser.js` is the [modern browser bundle](https://github.com/americanexpress/babel-preset-amex/blob/master/browserlist.js#L15).

`<moduleName>.legacy.browser.js` is the [legacy browser bundle](https://github.com/americanexpress/babel-preset-amex/blob/master/browserlist.js#L24).

`<moduleName>.node.js` is the server bundle.

These bundles are used in One App depending on the environment your module is running in. For example
if One App detects that your module's bundle is being requested by an older browser then
the `<moduleName>.legacy.browser.js` bundle will be served which includes polyfills and the needed
transpilation for that browser. Otherwise it will serve the potentially leaner `<moduleName>.browser.js`
or the `<moduleName>.node.js` bundle when running on the server.

*Note that if you are making use of code splitting via dynamic imports in your module there may be more chunks in your `build` directory.*

One App has no opinion on where module bundles are deployed to, the only thing to keep in mind is
that all the assets for a given module must be kept together when deployed, i.e. the file structure
generated by [one-app-bundler] must not be modified. This is because the bundles rely on this
structure for knowing where to look for the lang packs.

#### Building and Deploying a Holocron Module Map

In order for One App to use a module two things need to happen:

1. The module's static assets must be deployed to a static server.
2. A Holocron module map must be created / updated with the module's metadata and hosted on a static server.

A Holocron module map is what tells One App what Modules it should load and where to find them.

It is what allows for Holocron modules to be loaded and used by One App without requiring a One App
deployment or restart. When One App is started on a server it reads from the `HOLOCRON_MODULE_MAP_URL`
to find out where it should fetch the module map from and then periodically polls this module
map and adds / removes / updates its internal module registry to match any changes to it.

Ultimately a Holocron Module Map is a JSON object of the following shape:

```json
{
  "key": "123",
  "modules": {
    "<moduleName>": {
      "browser": {
        "integrity": "sha256-ws6s6vTApdkif2pOfsYOGwdfE9LurZ7Bwq4Olvomrf8= sha384-CLKgejOPhJjRFoUKxLRGeuH09z376SvuTfnWw8IhnShureZQmhzf+GoWGQeA++WU",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.browser.js"
      },
      "legacyBrowser": {
        "integrity": "sha256-0wTIJNLsNA9kxoiTPpH0xcseRA+2MezF1r0cdhxx1X0= sha384-jrl8W8VHVqk42r//1LDOYgXG8KIIeBrYMRsEj8bXBEUBNq1X+PUr4XtqGubeoJ36",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.legacy.browser.js"
      },
      "node": {
        "integrity": "sha256-LqwNreqEhpaXBRSmhW8/L1MpxcyBsoMwC4IKj8MSFTE= sha384-QLDAyAeq11y9llJhMXd36WwiGg49uJX23EtgaKsCVV83fUJ0rLrswb8V9IoeRIB2",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.node.js"
      }
    }
  }
}
```

The `key` property is used to cache bust all module bundles. This works because its value is appended
to each module asset request from One App.

The `modules` property contains module objects containing the URL and
[subresource integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
information for each of the module's assets. There are three assets created by
[one-app-bundler] for each module that need to be referenced here for One App to use, `browser`,
`legacyBrowser`, and `node`. The value for the
[`integrity` property](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
is generated by [one-app-bundler] and can be found in the `bundle.integrity.manifest.json` file
within the module's root directory after running [one-app-bundler] on it.

Your CI / CD process can generate the module map and update it as modules are added / updated / removed
and then publish the file to a static server. Just like with module assets One App does not have an
opinion of where the module map is published, it only cares that the module map is accessible shaped
correctly.

#### Building One App

You can build the One App [Docker](https://www.docker.com/) image and run it in your cloud / data center of choice:

```bash
git clone https://github.com/americanexpress/one-app.git
cd one-app
docker build .
```

Or you can build from source which creates your server side assets at `./lib` and your client
side assets to be deployed to a CDN at `./build`.

```bash
git clone https://github.com/americanexpress/one-app.git
cd one-app
NODE_ENV=development npm ci
NODE_ENV=production npm run build
```
#### Configuring One App

One App is configured via [environment variables](./runtime-configuration.md). There are a few
environment variables that are required for One App to start up including the one used to let One App
know where to fetch a module map from as described above.

#### Starting Up One App

One App can be started via docker or if built from source by running `node lib/server/index.js` on your server.

#### Monitoring One App

<!-- TODO talk about prometheus and logging schema here -->

## 🎛️ API

### Overview

#### [Modules](#modules)

**Holocron Modules** or "Modules" are self contained Web Experiences that consist of React Components with Redux-compatible Reducers and Actions. In practice, Modules are developed, bundled, and operate in isolation to one another. The One App Server uses a [Module Map](#building-and-deploying-a-holocron-module-map) containing URLs to Module bundles (e.g. `my-module.browser.js`) to load and serve bundles upon request. When the Server receives an HTTP request, it renders one or more Modules on the Server. Similar to React Components, Modules are composable (e.g. Modules may load other Modules). The first or entrypoint Module is called the "Root Module". The Root Module loads other "Child Modules". Overall, this development pattern in One App may be characterized as the [Micro Front End](https://martinfowler.com/articles/micro-frontends.html) pattern.

Holocron Modules have their own *Module Lifecycle Hooks*:

**Shape**
```js
function HelloWorldModule() {
  return (
    <h1>Hello World</h1>
  );
}

// See "Routing" section
HelloWorldModule.childRoutes = (store) => {
  // return Route Components
};

// See "Loading Data" section
HelloWorldModule.loadModuleData = async ({ store, fetchClient }) => {
  // Async Requests on Module Load
};

// See "App Configuration" section
if (!global.BROWSER) {
  HelloWorldModule.appConfig = {
    // appConfig directives
  };
}

export default HelloWorldModule;
```

**Contents**
* [Loading Modules](#loading-modules)
* [Loading Data](#loading-data)
* [Routing](#routing)
* [State Management](#)
* [App Configuration](#app-configuration)

#### [Server](#-server)

Documentation Forthcoming

**API**
* [Documentation Forthcoming](#)

---

### Modules

#### Loading Modules

In either the Server or the Browser, there are two methods to select and load specific Holocron Modules: 1) Use Routes defined in the [child routes configuration](#routing) to match a URL path to a Holocron Module. 2) Or use dispatch-able methods in the [Holocron API](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md) to load Holocron Modules and render their contents with a React Component.

Both methods are described in the following.

**Contents**
* Route Component
  * [`ModuleRoute`](#moduleroute)
* Load and Render
  * [`RenderModule`](#rendermodule)
  * [`holocronModule`](#holocronmodule)
  * [`composeModules`](#composemodules)

##### Route Component

> 👍 Most commonly used method to load Holocron Modules

A parent Module may add the `ModuleRoute` routing component to the [`childRoutes` Module Lifecycle Hook](#routing) to load a child Module dynamically on the server or browser when matching a route path. Once the Module is loaded, it is injected as a JSX element into the `children` prop of the parent Module.

###### `ModuleRoute`

Please see [`ModuleRoute`](https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route#-usage) in the Holocron Module Route API.

##### Dispatch and Render

We may use the `holocronModule` Higher Order Component to dispatch Holocron Redux Actions. Using the `load` argument in `holocronModule` we dispatch `composeModules` to retrieve a child Module bundle (e.g. `mymodule.browser.js`) and pass React `props` to it. Once loaded, a parent Module may add the `RenderModule` React Component into their JSX to render loaded Holocron Modules.

###### `RenderModule`

Please see [`RenderModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#rendermodule) in the Holocron API.

###### `holocronModule`

Please see [`holocronModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocronmodule) in the Holocron API.

###### `composeModules`

Please see [`composeModules`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#composemodules) in the Holocron API.

#### Loading Data

When [Holocron Modules](#modules) are composed and loaded on the Server and Client, the `loadModuleData` Module Lifecycle Hook is called to load any async requests. On the Server only, the `fetchClient` injected into the `loadModuleData` Hook may be customized using [`createSsrFetch`](#createssrfetch).

**Contents**
* [`loadModuleData`](#loadmoduledata)
* [`createSsrFetch`](#createssrfetch)

##### `loadModuleData`

**Runs On**
* ✅ Server
* ✅ Browser

**Shape**
```js
HelloWorldModule.loadModuleData = async ({ store, fetchClient }) => {};
```

**Arguments**

| Argument | Type     | Description                     |
|----------|----------|---------------------------------|
| `store`   | [`Redux Store`](https://redux.js.org/api/store/) | Redux store containing `getState`, `dispatch` and [other methods](https://redux.js.org/api/store/). |
| `fetchClient`   | [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) | [ES6 Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) Compatible Client. |

The `loadModuleData` Module Lifecycle Hook, is executed on the 1) Server and 2) Browser when a Module is loaded in either environment. This method is executed and resolved before any React Components are rendered inside a Holocron Module.

In practice, we may [`dispatch`](https://redux.js.org/api/store/#dispatchaction) Redux actions and make [`async/await`](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) requests to populate our Module's reducers before any React Components are rendered:

```js
// Runs on both Server and Browser
HelloWorldModule.loadModuleData = async ({ store, fetchClient }) => {
  store.dispatch({ type: 'LOADING_API' });
  const response = await fetchClient('https://api.example.com');
  const data = await response.json();
  store.dispatch({ type: 'LOADED_API', data });
};
```

**📘 More Information**
* Example: [SSR Frank](./prod-sample/sample-modules/ssr-frank/0.0.0/src/components/SsrFrank.jsx)
* Customize SSR Fetch Client: [`createSsrFetch`](#createssrfetch)
* Docs: [Redux Store](https://redux.js.org/api/store)
* Docs: [ES6 Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

##### `createSsrFetch`

Please see [`createSsrFetch`](#createssrfetch-1) in the [App Configuration](#app-configuration) section.

#### Routing

Documentation Forthcoming

#### App Configuration

The App Configuration API, `appConfig` allows a module to specify a selection of configuration options for [Holocron Modules](#modules).

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
* [provideStateConfig](#providestateconfig)
* [csp](#csp)
* [corsOrigins](#corsorigins)
* [configureRequestLog](#configurerequestlog)
* [extendSafeRequestRestrictedAttributes](#extendsaferequestrestrictedattributes)
* [createSsrFetch](#createssrfetch-1)
* [validateStateConfig](#validatestateconfig)
* [requiredSafeRequestRestrictedAttributes](#requiredsaferequestrestrictedattributes)
* [appCompatibility](#appcompatibility)

##### `provideStateConfig`
**Module Type**
* ✅ Root Module
* 🚫 Child Module

**Shape**
```js
if (!global.BROWSER) {
  Module.appConfig = {
    provideStateConfig: {
      server: {
        [settingName]: {
          [environmentLevel]: String,
        },
      },
      client: {
        [settingName]: {
          [environmentLevel]: String,
        },
      },
    },
  };
}
```

The `provideStateConfig` directive is useful for supplying string-based key value settings per runtime (e.g. `client` or `server`) and per `environmentLevel` (e.g. QA, Prod, etc). The `environmentLevel` is specified in the `ONE_CONFIG_ENV` environment variable when running the Server.

In practice, the state config supplied by a Root Module may look like this shape:

```js
if (!global.BROWSER) {
  Module.appConfig = {
    provideStateConfig: {
      server: {
        myApiHostname: {
          development: 'dev.api.intranet.example.com',
          qa: 'qa.api.intranet.example.com',
          production: 'prod.api.intranet.example.com',
        },
      },
      client: {
        myApiHostname: {
          development: 'dev.api.external.example.com',
          qa: 'qa.api.external.example.com',
          production: 'prod.api.external.example.com',
        },
      },
    },
  };
}
```

Based on `environmentLevel`, the String values are injected into the global [`config` reducer](./src/universal/ducks/config.js) in One App's global Redux state. These values may be accessed by Modules using Redux's `mapStateToProps`.

**📘 More Information**
* Example: [Frank Lloyd Root's `appConfig`](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* [`validateStateConfig`](#validatestateconfig)
* Source: [`config` reducer](./src/universal/ducks/config.js)

##### `csp`
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

> We recommend using something like [content-security-policy-builder](https://www.npmjs.com/package/content-security-policy-builder) to create your CSP string.

**📘 More Information**
* Example: [Frank Lloyd Root's CSP](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/csp.js)
* [content-security-policy-builder](https://www.npmjs.com/package/content-security-policy-builder)

##### `corsOrigins`
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
* [Frank Lloyd Root's `appConfig`](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* In Practice: [Partial Rendering](#partial-rendering)

##### `configureRequestLog`
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
* Example: [Frank Lloyd Root's `appConfig`](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)

##### `extendSafeRequestRestrictedAttributes`
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
* [Frank Lloyd Root's `appConfig`](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* Library: [Vitruvius](https://github.com/americanexpress/vitruvius)

##### `createSsrFetch`
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

`createSsrFetch` allows for customizing the fetch client used in `one-app` to perform server-side requests.

For example, you may wish to forward cookies or headers from the initial page load request to all the requisite SSR API requests.

**📘 More Information**
* Example: [Frank Lloyd Root's `appConfig`](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/config.js)
* Example: [An SSR Fetch Client](./prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/createFrankLikeFetch.js)
* Using SSR Fetch Client with [`loadModuleData`](#loadmoduledata)

##### `validateStateConfig`
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
* Example: [Picky Frank's `appConfig`](./prod-sample/sample-modules/picky-frank/0.0.0/src/components/PickyFrank.jsx)

##### `requiredSafeRequestRestrictedAttributes`
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

If an `Error` is thrown due to missing required cookies or headers, the Server will either 1) fail to startup or 2) if already running will prevent [Holocron](https://github.com/americanexpress/holocron) from loading the Module dynamically.

**📘 More Information**
* [`extendSafeRequestRestrictedAttributes`](#extendsaferequestrestrictedattributes)
* Example: [Vitruvius Franklin's `appConfig`](./prod-sample/sample-modules/vitruvius-franklin/0.0.0/src/components/VitruviusFranklin.jsx)

##### `appCompatibility`
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

---

### Server

---

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/one-app).

Please see our [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](./LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
