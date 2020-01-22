[👈 Return to Overview](../API.md)

# State Management

[Holocron Modules](../API.md#modules) rely on one Store provided by [Redux](https://redux.js.org/) used primarily to cache the results of loaded data and Modules. Every Module may add their own [Reducers](https://redux.js.org/basics/reducers/) to the shared Store (through [`holocronModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocronmodule)) and may dispatch actions to transform the Store. Redux provides a simple way to store data on the Server and [preload the store](https://redux.js.org/recipes/server-rendering#inject-initial-component-html-and-state) used by the Browser. This is commonly referred to as [Server Side Rendering](https://redux.js.org/recipes/server-rendering). One App employs the [Ducks Specification](https://github.com/erikras/ducks-modular-redux) design pattern for logical grouping Reducers, Action Creators, and Selectors (e.g. the `error` ducks contains reducers, actions, and selectors for storing error data in the Redux Store).

**Contents**
* [Globals](#globals)
* [Higher Order Components](#higher-order-components)
* [Shared Ducks](#shared-ducks)

## Globals

### `global.BROWSER`

**Runs On**
* ✅ Server
* ✅ Browser

**Shape**

```js
global.BROWSER; // Boolean
```

The `global.BROWSER` is provided in the Server and Browser environments to determine if the code is currently being executed on the Server or the Browser.

## Higher Order Components

## Shared Ducks

One App uses a default set of shared Redux [Ducks](https://github.com/erikras/ducks-modular-redux) (e.g. a design pattern for logical groupings of Reducers, Actions, and Selectors that depend on each other) to manage the state of core features (e.g. Loading Language Packs or Holocron Modules) on the Server and Browser environments.

The following is an overview of the shape One App provides:

```
{
  config,
  errorReporting,
  modules,
  error,
  browser,
  rendering,
  redirection,
  holocron,
  intl
}
```

The following API definitions describe the Ducks responsible for the state shape described above.

**Contents**
* [`config`](#config-duck)
* [`errorReporting`](#errorreporting-duck)
* [`error`](#error-duck)
* [`browser`](#browser-duck)
* [`rendering`](#rendering-duck)
* [`redirection`](#redirection-duck)
* [`holocron`](#holocron-duck)
* [`intl`](#intl-duck)

### `config`
The `config` Duck lists a subset of the environment variables set on the Server.

#### State Shape

| Reducer Object Property | Description                                                                                                              |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `reportingUrl`          | URL where the Browser sends client side errors to. (See [`ONE_CLIENT_REPORTING_URL`](#)).                                |
| `cdnUrl`                | URL where the One App static assets are located. (See [`ONE_CLIENT_CDN_URL`](#))                                         |
| `localeFilename`        | The exact filename for the locale file used in the Browser. (See [`ONE_CLIENT_LOCALE_FILENAME`](#))                      |
| `rootModuleName`        | Name of the Holocron Module that serves as the entry point to your application. (See [`ONE_CLIENT_ROOT_MODULE_NAME`](#)) |


#### Selectors

*No Selectors Available*

#### Action Creators

`setConfig(config)`

| Argument | Type     | Description                                                |
|----------|----------|------------------------------------------------------------|
| `config` | `Object` | An object with the properties listed in the Reducer below. |

This `config` passed to `setConfig` replaces the contents of the `config` state object in the Redux Store.

**📘 More Information**
* Server API Docs: [Environment Variables](../API.md)

### `errorReporting` Duck

Please see the [`errorReporting` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

### `error` Duck

Please see the [`error` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

### `browser` Duck

Please see the [`browser` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

### `rendering` Duck

Please see the [`rendering` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

### `redirection` Duck

Please see the [`redirection` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

### `holocron` Duck

Please see the [`holocron` Duck](https://github.com/americanexpress/holocron/blob/master/packages/holocron/src/ducks/load.js) in the Holocron API.

### `intl` Duck

Please see the [`intl` Duck](https://github.com/americanexpress/one-app-ducks#reducers) in the One App Ducks API.

[☝️ Return To Top](#state-management)