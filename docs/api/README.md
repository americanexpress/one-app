[👈 Return to README](../../README.md)

# 🎛️ API

## Overview

### Modules

**Holocron Modules** or "Modules" are self contained Web Experiences that consist of [React Components](https://reactjs.org/docs/components-and-props.html), [Redux](https://redux.js.org/) Reducers and Actions as well as [Routes](https://github.com/americanexpress/one-app-router). In practice, Modules are developed, bundled, and operate in isolation to one another. The One App Server uses a [Module Map](../../README.md#building-and-deploying-a-holocron-module-map) containing URLs to Module bundles (e.g. `my-module.browser.js`) to load and serve bundles upon request. When the Server receives an HTTP request, it renders one or more Modules on the Server. Similar to React Components, Modules are composable (e.g. Modules may load other Modules). The first or entrypoint Module is called the "Root Module". The Root Module loads other "Child Modules". Overall, this development pattern in One App may be characterized as the [Micro Front End](https://martinfowler.com/articles/micro-frontends.html) pattern.

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
HelloWorldModule.holocron = {
  loadModuleData: async ({
    store, fetchClient, ownProps, module,
  }) => {
    // Async Requests on Module Load
  },
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
* [Loading Modules](./modules/Loading-Modules.md)
* [Loading Data](./modules/Loading-Data.md)
* [Routing](./modules/Routing.md)
* [State Management](./modules/State-Management.md)
* [App Configuration](./modules/App-Configuration.md)
* [Internationalization](./modules/Internationalization.md)

---

### Server

The One App Server, `one-app`, provides a runtime for serving an HTML document with asset tags (Style tags, Script tags etc.) and [preloaded Redux state](https://redux.js.org/recipes/server-rendering#inject-initial-component-html-and-state) required to bootstrap a [Holocron Module](#modules) driven [Single Page Application (SPA)](https://developer.mozilla.org/en-US/docs/Glossary/SPA). The `one-app` server enables a full development environment locally as well as an efficient production environment able to be deployed and scaled on cloud infrastructure.

**Contents**
* [CLI Commands](./server/Cli-Commands.md)
* [Module Map Schema](./server/Module-Map-Schema.md)
* [Environment Variables](./server/Environment-Variables.md)
* [Development Tools](./server/Development-Tools.md)

[☝️ Return To Top](#%EF%B8%8F-api)