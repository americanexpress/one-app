[👈 Return to Overview](../API.md)

# Routing

One App uses **[@americanexpress/one-app-router](https://github.com/americanexpress/one-app-router)**, a fork of **[`react-router@3`](https://github.com/ReactTraining/react-router/tree/v3)**
uplifted to work with React@^17, for its client and server side routing.

**Contents**
* [`Router`](#router)
* [`Route`](#route)
* [`childRoutes`](#childroutes)
* [`Link`](#link)
* [`onEnterRouteHook`](#onenterroutehook)

**📘 More Information**
* Loading Holocron Module via Route: [`ModuleRoute`](./Loading-Modules.md#moduleroute)

## `Router`

The primary component of One App Router. It keeps the UI and URL in sync.
This is used internally within One App and should **not** be used within One App modules.

Please see One App Router's [API docs](https://github.com/americanexpress/one-app-router/blob/master/docs/API.md#router) for more information.

## `Route`

`<Route>` is used to define the mapping between a path and component. For use with One App this must be defined
within `childRoutes` defined on a module.

Please see One App Router's [Route API docs](https://github.com/americanexpress/one-app-router/blob/master/docs/API.md#route) for more information.

## `childRoutes`

Enables components and modules to define their own child routes. `childRoutes` can be either a single
route, array of routes or a function which accepts the Redux store as the sole argument and returns
a single route or array of routes.

One App requires the Root Module to have at least one child route defined. This can be either `<Route>` or `<ModuleRoute>` with a `path`.

```js
const MyModule = () => { /* jsx */ };
MyModule.childRoutes = <ModuleRoute path="/" />;
```

Please see [One App Router](https://github.com/americanexpress/one-app-router/blob/master/docs/API.md#childroutes) for more information.

## `Link`

`<Link>` enables users to navigate around your application.

Please see One App Router's [Link API docs](https://github.com/americanexpress/one-app-router/blob/master/docs/API.md#link) for more information.

## `onEnter`

Both `Route` and `ModuleRoute` accept an `onEnter` hook which is called before the component or module gets
rendered.

Please see One App Router's [`onEnter` API](https://github.com/americanexpress/one-app-router/blob/master/docs/API.md#onenternextstate-replace-callback)  for more information.

## `onEnterRouteHook`

`onEnterRouteHook` is similar to the `onEnter` hook however it is defined by the module rather than on
`Route` or `ModuleRoute`.

```js
MyModule.onEnterRouteHook = (nextState, replace, callback) => {
  if (!authorized) {
    replace('/login');
  }
  callback();
};
```

Please see the [Holocron Module Route docs](https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route#onenterroutehook) for information.

## ModuleRoute

Please see [ModuleRoute](./Loading-Modules.md#moduleroute) for more information.

**📘 More Information**
* For an root module implementation example see [`FrankLloydRoot`](../../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/src/components/FrankLloydRoot.jsx)

[☝️ Return To Top](#routing)
