[👈 Return to Overview](../API.md)

# Loading Data

When [Holocron Modules](#modules) are composed and loaded on the Server and Client, the `loadModuleData` Module Lifecycle Hook is called to load any async requests. On the Server only, the `fetchClient` injected into the `loadModuleData` Hook may be customized using [`createSsrFetch`](#createssrfetch).

**Contents**
- [loadModuleData](#loadmoduledata)
- [createSsrFetch](#createssrfetch)

## `loadModuleData`

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
* Example: [SSR Frank](../../../prod-sample/sample-modules/ssr-frank/0.0.0/src/components/SsrFrank.jsx)
* Customize SSR Fetch Client: [`createSsrFetch`](#createssrfetch)
* Docs: [Redux Store](https://redux.js.org/api/store)
* Docs: [ES6 Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

## `createSsrFetch`

Please see [`createSsrFetch`](./App-Configuration.md#createssrfetch) in the [App Configuration](./App-Configuration.md) section.

[☝️ Return To Top](#loading-data)