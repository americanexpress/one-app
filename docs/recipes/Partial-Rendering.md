<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Partial Rendering

In this recipe, we will go over the setup required to start using partial rendering with One App,
in a root Holocron module. We will use the URL to select a module and a `POST` body to populate
the props that we want passed into that module.

**Overview**

Renders static markup from a Holocron module, rather than a complete page. Useful for reusing a One
App Module's markup on a non One App web page. This will only work when dispatched on the server.

**API Reference**

* [`setRenderPartialOnly`](https://github.com/americanexpress/one-app-ducks#setrenderpartialonly) from [`@americanexpress/one-app-ducks`](https://github.com/americanexpress/one-app-ducks)

**Prerequisites**

For this recipe, One App is expected to be configured with [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#one_enable_post_to_module_routes) enabled and a root Holocron module configured with a partial `childRoute`.

`src/components/createPartialRoute.jsx`
```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { fromJS } from 'immutable';
import ModuleRoute from 'holocron-module-route';
import { RenderModule, composeModules } from 'holocron';

import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

function onPartialEnterHook(getPartialRenderProps) {
  return ({ params: { moduleName } }, replace, cb) => {
    // setRenderPartialOnly should only be configured on the server side
    if (!global.BROWSER) {
      // to kick start the partial rendering mode, the setRenderPartialOnly action
      // is dispatched.
      dispatch(setRenderPartialOnly(true));
    }
    // composeModules loads the Holocron module data and lets One App
    // know the module was loaded.
    dispatch(composeModules([{
      name: moduleName,
      props: getPartialRenderProps(),
    }])).then(() => cb());
  };
}

function PartialRouteComponent(props) {
  const { params: { moduleName } } = props;
  return (
    <RenderModule
      moduleName={moduleName}
      props={props}
    />
  );
}

export default function createPartialRoute(getPartialRenderProps) {
  return (
    <ModuleRoute
      path="partial/:moduleName"
      component={PartialRouteComponent}
      onEnter={onPartialEnterHook(getPartialRenderProps)}
    />
  );
}
```

With the partial ModuleRoute in place, the next step is to add it to the root Holocron module.
The root module would need to return its `children` (for `childRoutes` to be rendered).

`src/components/RootModule.jsx`
```js
import React from 'react';
import { fromJS, Map as iMap } from 'immutable';

import createPartialRoute from './createPartialRoute';

export default function RootModule({ children }) {
  return children;
}

// ...
```

Since partial rendering is configurable only during server side rendering,
a partial render can source props from the request body via initial state building.
The Holocron config adds a reducer which stores the props from the request body.

```js
// ...

const reducer = (state = fromJS({})) => state;

if (!global.BROWSER) {
  reducer.buildInitialState = ({ req } = {}) => {
    if (req && req.body) return fromJS({ postProps: req.body });
    return fromJS({});
  };
}

RootModule.holocron = {
  name: 'root-module',
  reducer,
};

// ...
```
> `ONE_ENABLE_POST_TO_MODULE_ROUTES` needs to be enabled for access to the request body

The final step is adding the partial route to the root Holocron module `childRoutes` property.

```js
// ...

const getPartialRenderProps = (store) => () => store.getState().getIn(['modules', 'root-module', 'postProps'], iMap()).toJS();

RootModule.childRoutes = (store) => [
  // the partials ModuleRoute
  createPartialRoute(getPartialRenderProps(store)),
];
```

**Sample Module**

If we start One App locally, we can use the url `http://localhost:3000/partials/child-module`
and expect the `child-module` to respond with its rendered content only.

> If you want to learn more on how to run One App locally, please [view the guide](./Running-Existing-App-Locally.md)

`child-module`
```jsx
import React from 'react';

export default function ChildModule({ greeting = 'Hello There' }) {
  return (
    <p>
      <span>{greeting}!</span>
    </p>
  );
}
```

**Making The Request**

To see partial rendering in action after we set everything up, we can make a `POST`
request and use the body to render the desired HTML partial.

```js
fetch('http://localhost:3000/partials/child-module', {
  method: 'POST',
  body: JSON.stringify({
    greeting: 'Guten Tag',
  }),
}).then((response) => response.text());
```

## Configuration

To enable rendering of modules on `POST` requests as in our recipe,
[`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#one_enable_post_to_module_routes)
environment variable is required to be set when running One App.

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for partial requests and
by default there are no allowed origins.
Add origins in the root module [corsOrigins](../api/modules/App-Configuration.md#corsorigins) in
the [appConfig](../api/modules/App-Configuration.md).

## Example

See the [`Partial` component](../../prod-sample/sample-modules/frank-lloyd-root/0.0.2/src/components/Partial.jsx)
in the `frank-lloyd-root` module for an example implementation.

> Note: for the use case of rendering a complete document (like an email), the top-level component
> can be wrapped in a `<dangerously-return-only-doctype />` (instead of a `<div />` for instance)
> which will be removed from the final render.

[☝️ Return To Top](#partial-rendering)
