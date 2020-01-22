[👈 Return to README](../../README.md)

# 🎛️ API

## Overview

### Modules

**Holocron Modules** or "Modules" are self contained Web Experiences that consist of React Components with Redux-compatible Reducers and Actions. In practice, Modules are developed, bundled, and operate in isolation to one another. The One App Server uses a [Module Map](../../README.md#building-and-deploying-a-holocron-module-map) containing URLs to Module bundles (e.g. `my-module.browser.js`) to load and serve bundles upon request. When the Server receives an HTTP request, it renders one or more Modules on the Server. Similar to React Components, Modules are composable (e.g. Modules may load other Modules). The first or entrypoint Module is called the "Root Module". The Root Module loads other "Child Modules". Overall, this development pattern in One App may be characterized as the [Micro Front End](https://martinfowler.com/articles/micro-frontends.html) pattern.

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
* [Loading Modules](./modules/Loading-Modules.md)
* [Loading Data](./modules/Loading-Data.md)
* [Routing](./modules/Routing.md)
* [State Management](./modules/State-Management.md)
* [App Configuration](./modules/App-Configuration.md)

---

### Server

Documentation Forthcoming

**API**
* [Documentation Forthcoming](#)

[☝️ Return To Top](#%EF%B8%8F-api)