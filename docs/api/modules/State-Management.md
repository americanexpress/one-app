[👈 Return to Overview](../API.md)

# State Management

[Holocron Modules](../API.md#modules) rely on one Store provided by [Redux](https://redux.js.org/) used primarily to cache the results of loaded data and Modules. Every Module may add their own [Reducers](https://redux.js.org/basics/reducers/) to the shared Store (through [Holocron Module Configuration]) and may dispatch actions to transform the Store. Redux provides a simple way to store data on the Server and [preload the store](https://redux.js.org/recipes/server-rendering#inject-initial-component-html-and-state) used by the Browser. This is commonly referred to as [Server Side Rendering](https://redux.js.org/recipes/server-rendering). One App employs the [Ducks Specification](https://github.com/erikras/ducks-modular-redux) design pattern for the logical grouping of Reducers, Action Creators, and Selectors (e.g. the `error` duck contains reducers, actions, and selectors for storing error data in the Redux Store).

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

`global.BROWSER` is provided in the Server and Browser environments to determine if the code is currently being executed on the Server or the Browser.

## Higher Order Components

[Holocron Modules](../API.md#modules) use [Higher Order Components (HOC)](https://reactjs.org/docs/higher-order-components.html) to add behaviors regarding when a Module loads, connecting a Module with its [Reducer(s)](https://redux.js.org/basics/reducers/) to a Redux Store (similar to [Redux `connect`](https://react-redux.js.org/api/connect)) and adding runtime validations for a Module.

**Contents**
* [`holocronModule`](#holocronmodule)

### `holocronModule`

> ☠ `holocronModule` has been deprecated and will be removed in the next major version of Holocron. Please see [Holocron Module Configuration].

Please see [`holocronModule`](https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocronmodule) in the Holocron API.

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

### `config` Duck
The `config` Duck lists a subset of the environment variables set on the Server as well as all values set by
[`provideStateConfig`](./App-Configuration.md#providestateconfig) from the [App Configuration API](./App-Configuration.md).

**Contents:**
* [State Shape](#state-shape)
* Action Creators
  * [`setConfig`](#setconfig)

#### State Shape

```js
const state = new Map({
  config: new Map({
    // URL where the Browser sends client side errors to.
    reportingUrl: String,
    // URL where the One App static assets are located.
    cdnUrl: String,
    // The exact filename for the locale file used in the Browser.
    localeFilename: String,
    // Name of the Holocron Module that serves as the entry point to your application.
    rootModuleName: String,
    // ... Settings from provideStateConfig key values will land here.
    [provideStateConfigSettingName]: String,
  }),
  // ... Rest of Redux State
});
```

**📘 More Information**
* Adding values to `config` state with [`provideStateConfig`](./App-Configuration.md#providestateconfig) from [App Configuration API](./App-Configuration.md).
* Learn more about [Environment Variables](#):
  * [`ONE_CLIENT_REPORTING_URL`](#),
  * [`ONE_CLIENT_CDN_URL`](#),
  * [`ONE_CLIENT_LOCALE_FILENAME`](#),
  * [`ONE_CLIENT_ROOT_MODULE_NAME`](#)

#### Action Creators

##### `setConfig`

> ⚠️ For Internal Use by One App. Modules need not dispatch this action creator.

**Shape**

```js
dispatch(setConfig(config));
```

**Arguments**

| Argument | Type     | Description                                                |
|----------|----------|------------------------------------------------------------|
| `config` | `Object` | An object with the properties listed in the Reducer below. |

This `config` passed to `setConfig` replaces the contents of the `config` state object in the Redux Store.

### `errorReporting` Duck

Please see the [`errorReporting` Duck](https://github.com/americanexpress/one-app-ducks#errorreporting-duck) in the One App Ducks API.

### `error` Duck

Please see the [`error` Duck](https://github.com/americanexpress/one-app-ducks#error-duck) in the One App Ducks API.

### `browser` Duck

Please see the [`browser` Duck](https://github.com/americanexpress/one-app-ducks#browser-duck) in the One App Ducks API.

### `rendering` Duck

Please see the [`rendering` Duck](https://github.com/americanexpress/one-app-ducks#rendering-duck) in the One App Ducks API.

### `redirection` Duck

Please see the [`redirection` Duck](https://github.com/americanexpress/one-app-ducks#redirection-duck) in the One App Ducks API.

### `holocron` Duck

Please see the [`holocron` Duck](https://github.com/americanexpress/holocron/blob/master/packages/holocron/src/ducks/load.js) in the Holocron API.

### `intl` Duck

Please see the [`intl` Duck](https://github.com/americanexpress/one-app-ducks#intl-duck) in the One App Ducks API.

[☝️ Return To Top](#state-management)

[Holocron Module Configuration]: https://github.com/americanexpress/holocron/blob/master/packages/holocron/API.md#holocron-module-configuration
