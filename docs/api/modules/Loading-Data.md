[👈 Return to Overview](../README.md)

# Loading Data

When [Holocron Modules](#modules) are composed and loaded on the Server and Client, the `loadModuleData` Module Lifecycle Hook is called to load any async requests. On the Server only, the `fetchClient` injected into the `loadModuleData` Hook may be customized using [`createSsrFetch`](#createssrfetch).

**Contents**
- [Loading Data](#loading-data)
  - [`Module.loadModuleData`](#moduleloadmoduledata)
  - [`Module.appConfig.createSsrFetch`](#moduleappconfigcreatessrfetch)
  - [Holocron Module Configuration](#holocron-module-configuration)
    - [`Module.holocron.loadModuleData`](#moduleholocronloadmoduledata)

## `Module.loadModuleData`

> ☠ `Module.loadModuleData` has been relocated to [`Module.holocron.loadModuleData`](#moduleholocronloadmoduledata)

<!--ONE-DOCS path="https://cdn.jsdelivr.net/gh/americanexpress/one-app@master/docs/api/modules/App-Configuration.md" id="createSsrFetch" parentHeaderLevel="1" start-->

## `Module.appConfig.createSsrFetch`

Please see [`createSsrFetch`](./App-Configuration.md#createssrfetch) in the [App Configuration](./App-Configuration.md) section.

<!--ONE-DOCS end-->

## Holocron Module Configuration

Please see the [Holocron Module Configuration](https://github.com/americanexpress/holocron/blob/master/packages/holocron/docs/api/README.md#holocron-module-configuration) from the Holocron API Docs for more information about other properties.

### `Module.holocron.loadModuleData`

**Runs On**
* ✅ Server
* ✅ Browser

**Shape**
```js
HelloWorldModule.holocron = {
  loadModuleData: async ({
    store, fetchClient, ownProps, module,
  }) => {},
};
```

**Arguments**

| Argument | Type     | Description                     |
|----------|----------|---------------------------------|
| `store`   | [`Redux Store`](https://redux.js.org/api/store/) | Redux store containing `getState`, `dispatch` and [other methods](https://redux.js.org/api/store/). |
| `fetchClient`   | [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) | [ES6 Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) Compatible Client. |
| `ownProps`   | [React Props](https://reactjs.org/docs/react-component.html#props) | [React Props](https://reactjs.org/docs/react-component.html#props) for the Holocron Module. |
| `module`  | Module | The instantiated Holocron Module. |

The `loadModuleData` Module Lifecycle Hook, is executed on the Server and Browser when a Module is loaded in either environment. This method is executed and resolved before any React Components are rendered inside a Holocron Module.

In practice, we may [`dispatch`](https://redux.js.org/api/store/#dispatchaction) Redux actions and make [`async/await`](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) requests to populate our Module's reducers before any React Components are rendered:

```js
// Runs on both Server and Browser
HelloWorldModule.holocron = {
  loadModuleData: async ({ store, fetchClient, ownProps }) => {
    store.dispatch({ type: 'LOADING_API' });
    const response = await fetchClient('https://api.example.com', ownProps.options);
    const data = await response.json();
    store.dispatch({ type: 'LOADED_API', data });
  },
};
```

**📘 More Information**
* Example: [SSR Frank](../../../prod-sample/sample-modules/ssr-frank/0.0.0/src/components/SsrFrank.jsx)
* Customize SSR Fetch Client: [`Module.appConfig.createSsrFetch`](#moduleappconfigcreatessrfetch)
* Docs: [Redux Store](https://redux.js.org/api/store)
* Docs: [ES6 Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

[☝️ Return To Top](#loading-data)
