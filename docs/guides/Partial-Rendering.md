<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Partial Rendering

## 📖 Table of Contents
* [Overview](#overview)
* [Creating A Partials Route](#creating-a-partials-route)
* [Dynamic Partials Route](#dynamic-partials-route)
* [Rendering HTML Documents From Partial Routes](#rendering-html-documents-from-partial-routes)
* [One App Configuration](#one-app-configuration)
* [Examples](#examples)

## Overview

Partial Rendering creates static markup from a Holocron module, rather than a complete page
targeting the browser.

There are many common use cases that partial rendering solves like rendering HTML templates for
various parts of a document or for rendering a complete HTML document from a module for emails.
It is also useful for reusing a One App Module's markup on a non One App web page.

In this recipe we will show partial rendering of a Holocron Module using One App.

> NOTE: This will only work when dispatched on the server.

**API Reference**

* [`setRenderPartialOnly`](https://github.com/americanexpress/one-app-ducks#setrenderpartialonly) from [`@americanexpress/one-app-ducks`](https://github.com/americanexpress/one-app-ducks)

## Creating A Partials Route

In this example, we will create a greeting partial that takes in a greeting message
provided via `POST` body and renders a partial around the greeting text provided.

**Prerequisites**

For this recipe, One App is expected to be configured with [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#one_enable_post_to_module_routes) enabled and a root Holocron module configured with a partial `childRoute`.

**Sample Root Module**

Starting with our root module, we would only need to make sure that we return `children`
as the first step.

`src/components/RootModule.js`
```js
import React from 'react';
// the below imports will be used later on
import { fromJS, Map as iMap } from 'immutable';
import ModuleRoute from 'holocron-module-route';
import { RenderModule, composeModules } from 'holocron';
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

export default function RootModule({ children }) {
  return children;
}

// ...
```

Since partial rendering is only configurable during server side rendering,
a partial render can source props from the request body via initial state building.
The Holocron config adds a reducer which stores the props from the request body.

```js
// continued RootModule

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
> `ONE_ENABLE_POST_TO_MODULE_ROUTES` needs to be enabled for access to the request body (as seen above)

The final step is adding the partial route to the root Holocron module `childRoutes` property.


```jsx
// continued RootModule

const getPartialRenderProps = (store) => () => store.getState().getIn(['modules', 'root-module', 'postProps'], iMap()).toJS();

function PartialGreetingModuleComponent(props) {
  return (
    <RenderModule
      moduleName="greeting-module"
      props={props}
    />
  );
}

RootModule.childRoutes = (store) => (
  <ModuleRoute
    path="partials/greet"
    component={PartialGreetingModuleComponent}
    onEnter={(routerProps, replace, cb) => {
    // setRenderPartialOnly should only be configured on the server side
      if (!global.BROWSER) {
      // to kick start the partial rendering mode, the setRenderPartialOnly action
      // is dispatched.
        dispatch(setRenderPartialOnly(true));
      }
      // composeModules loads the Holocron module data and lets One App
      // know the module was loaded.
      dispatch(composeModules([{
        name: 'greeting-module',
        props: getPartialRenderProps(store),
      }])).then(() => cb());
    }}
  />
);
```

**Sample Child Module**

If we start One App locally, we can use the url `http://localhost:3000/partials/greet`
and expect the `greeting-module` to respond with its rendered content only.

> If you want to learn more on how to run One App locally, please [view the guide](./Running-One-App-Locally.md)

`greeting-module`
```jsx
import React from 'react';

export default function GreetingModule({ greeting = 'Hello There' }) {
  return (
    <p>
      <span>{greeting}!</span>
    </p>
  );
}

GreetingModule.holocron = {
  name: 'greeting-module',
};
```

**Making The Request**

To see partial rendering in action after we set everything up, we can make a `POST`
request and use the body to render the desired HTML partial.

```js
fetch('http://localhost:3000/partials/greet', {
  method: 'POST',
  body: JSON.stringify({
    greeting: 'Guten Tag',
  }),
}).then((response) => response.text());
```

## Dynamic Partials Route

If we wanted to take the example above and make it more dynamic in which module is rendering,
we can create a partials route that accepts different modules to render based on the URL. This
can be particularly useful for rendering individual modules from our module map.

Based on the example above, we would only need to make a small alteration to the greeting partials
route and replace the `ModuleRoute` in our root module `childRoutes` to a more dynamic component
that accepts `moduleName` from the URL to select which module to render.

In this example, we will use the URL to select a module and a `POST` body
to populate the props that we want passed into that module.

**`src/components/createPartialRoute.jsx`**
```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { fromJS } from 'immutable';
import ModuleRoute from 'holocron-module-route';
import { RenderModule, composeModules } from 'holocron';

import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

function onPartialEnterHook(getPartialRenderProps) {
  return ({ params: { moduleName } }, replace, cb) => {
    if (!global.BROWSER) {
      dispatch(setRenderPartialOnly(true));
    }
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

**`src/components/RootModule.jsx`**
```js
import React from 'react';
import { fromJS, Map as iMap } from 'immutable';

import createPartialRoute from './createPartialRoute';

// RootModule from previous example

RootModule.childRoutes = (store) => [
  // the partials ModuleRoute
  createPartialRoute(getPartialRenderProps(store)),
];
```

## Rendering HTML Documents From Partial Routes

There may be instances where we would want to use a single Holocron module to
render an HTML document, for example if we wanted to render and email. One App
comes with `dangerously-return-only-doctype` to allow us to take a single module
and use it to render a complete HTML document.

For rendering a complete document (like an email), the top-level component
can be wrapped in a `<dangerously-return-only-doctype />` (instead of a
`<div />` for instance) which will be removed from the final render.
Let's kick off this example using [`mjml`](https://github.com/mjmlio/mjml)
and [`mjml-react`](https://github.com/wix-incubator/mjml-react) library to
`render` a sample email that we can provide as output to One App.

`email-child-module/render.js`
```jsx
import React from 'react';
import {
  render,
  Mjml,
  MjmlHead,
  MjmlTitle,
  MjmlPreview,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlButton,
  MjmlImage,
} from 'mjml-react';

export default function EmailPartialsChildModule() {
  const { html, errors } = render((
    <Mjml>
      <MjmlHead>
        <MjmlTitle>Partials Rendered Email</MjmlTitle>
        <MjmlPreview>Partials Rendered Email...</MjmlPreview>
      </MjmlHead>
      <MjmlBody width={500}>
        <MjmlSection fullWidth={true} backgroundColor="#fff">
          <MjmlColumn>
            <MjmlImage src="https://cdn.example.com/images/special-email-banner.jpg" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection>
          <MjmlColumn>
            <MjmlButton
              padding="20px"
              backgroundColor="#b42fe0"
              href="https://example.com/sign-me-up"
            >
              Sign Me Up!
            </MjmlButton>
          </MjmlColumn>
        </MjmlSection>
      </MjmlBody>
    </Mjml>
  ), { validationLevel: 'soft' });

  if (error) {
    throw error;
  }

  return (
    <dangerously-return-only-doctype
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

Do keep in mind that partial rendering is meant to be performed server-side, we should not attempt
this example above in the browser under normal circumstances.

## One App Configuration

To enable rendering of modules on `POST` requests as in our recipe,
[`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#one_enable_post_to_module_routes)
environment variable is required to be set when running One App.

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for partial requests and
by default there are no allowed origins.
Add origins in the root module [corsOrigins](../api/modules/App-Configuration.md#corsorigins) in
the [appConfig](../api/modules/App-Configuration.md).

## Examples

See the [`Partial` component](../../prod-sample/sample-modules/frank-lloyd-root/0.0.2/src/components/Partial.jsx)
in the `frank-lloyd-root` module for an example implementation.

[☝️ Return To Top](#partial-rendering)
