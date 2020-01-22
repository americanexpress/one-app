[👈 Return to Overview](../API.md)

# Loading Modules

In either the Server or the Browser, there are two methods to select and load specific [Holocron Modules](../API.md#modules): 1) Use Routes defined in the [child routes configuration](./Routing.md#routing) to match a URL path to a Holocron Module. 2) Or use dispatch-able methods in the [Holocron API](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md) to load Holocron Modules and render their contents with a React Component.

Both methods are described in the following.

**Contents**
* Route Component
  * [`ModuleRoute`](#moduleroute)
* Load and Render
  * [`RenderModule`](#rendermodule)
  * [`holocronModule`](#holocronmodule)
  * [`composeModules`](#composemodules)

## Route Component

> 👍 Most commonly used method to load Holocron Modules

A parent Module may add the `ModuleRoute` routing component to the [`childRoutes` Module Lifecycle Hook](#routing) to load a child Module dynamically on the server or browser when matching a route path. Once the Module is loaded, it is injected as a JSX element into the `children` prop of the parent Module.

### `ModuleRoute`

Please see [`ModuleRoute`](https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route#-usage) in the Holocron Module Route API.

## Dispatch and Render

We may use the `holocronModule` Higher Order Component to dispatch Holocron Redux Actions. Using the `load` argument in `holocronModule` we dispatch `composeModules` to retrieve a child Module bundle (e.g. `mymodule.browser.js`) and pass React `props` to it. Once loaded, a parent Module may add the `RenderModule` React Component into their JSX to render loaded Holocron Modules.

### `RenderModule`

Please see [`RenderModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#rendermodule) in the Holocron API.

### `holocronModule`

Please see [`holocronModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocronmodule) in the Holocron API.

### `composeModules`

Please see [`composeModules`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#composemodules) in the Holocron API.

[☝️ Return To Top](#loading-modules)