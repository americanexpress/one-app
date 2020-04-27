[👈 Return to Overview](../API.md)

# Loading Modules

In either the Server or the Browser, there are two methods to select and load specific [Holocron Modules](../API.md#modules):
* Use Routes defined in the [child routes configuration](./Routing.md#routing) to match a URL path to a Holocron Module.
* Use dispatch-able methods in the [Holocron API](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md) to load Holocron Modules and render their contents with a React Component.

Both methods are described in the following.

**Contents**
* Route Component
  * [`ModuleRoute`](#moduleroute)
* Load and Render
  * [`RenderModule`](#rendermodule)
  * [`Module.holocron`](#moduleholocron)
  * [`composeModules`](#composemodules)

## Route Component

> 👍 Most commonly used method to load Holocron Modules

A parent Module may add the `ModuleRoute` routing component to the [`childRoutes` Module Lifecycle Hook](./Routing.md) to load a child Module dynamically on the server or browser when matching a route path. Once the Module is loaded, it is injected as a JSX element into the `children` prop of the parent Module.

<!--ONE-DOCS path="https://cdn.jsdelivr.net/gh/americanexpress/holocron@master/packages/holocron-module-route/README.md" id="ModuleRoute" parentHeadingLevel="2" start-->

### `ModuleRoute`

Similar to One App Router's `<Route>` with an additional prop, `moduleName`, [`ModuleRoute`](https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route#moduleroute) loads
a Holocron Module when the URL matches the given path.

```js
<ModuleRoute path="/home" module-name="my-module" />;
```

Please see [`ModuleRoute`](https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route#-usage) in the Holocron Module Route API.

<!--ONE-DOCS end-->

## Dispatch and Render

We may use the [Holocron Module Configuration] to dispatch Holocron Redux Actions. Using the `loadModuleData` function  we dispatch `composeModules` to retrieve a child Module bundle (e.g. `mymodule.browser.js`) and pass React `props` to it. Once loaded, a parent Module may add the `RenderModule` React Component into their JSX to render loaded Holocron Modules.

<!--ONE-DOCS path="https://cdn.jsdelivr.net/gh/americanexpress/holocron@master/packages/holocron/API.md" id="RenderModule" parentHeadingLevel="2" start-->

### `RenderModule`

Please see [`RenderModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#rendermodule) in the Holocron API.

<!--ONE-DOCS end-->

<!--ONE-DOCS path="https://cdn.jsdelivr.net/gh/americanexpress/holocron@master/packages/holocron/API.md" id="Module.holocron" parentHeaderLevel="2" start-->

### `Module.holocron`

Please see [Holocron Module Configuration] in the Holocron API.

<!--ONE-DOCS end-->

<!--ONE-DOCS path="https://cdn.jsdelivr.net/gh/americanexpress/holocron@master/packages/holocron/API.md" id="composeModules" parentHeadingLevel="2" start-->

### `composeModules`

Please see [`composeModules`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#composemodules) in the Holocron API.

<!--ONE-DOCS end-->

[☝️ Return To Top](#loading-modules)

[Holocron Module Configuration]: https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocron-module-configuration