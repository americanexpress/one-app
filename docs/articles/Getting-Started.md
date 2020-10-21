Getting Started
---------------

One App is a web application that combines together multiple experiences into a single,
cohesive runtime. These experiences, or Holocron modules as we call them empower teams
to craft a rich user experience that can be used to compose parts of a web page or as
route destinations all on their own. One App was built from the ground up with Holocron
and its micro frontend architecture, allowing engineers to seamlessly update each module
independently and collaborate across teams working together to create a product. While
One App comes with a security standard in practice, progressive web app capability and
many other features, its feature set can be configured by Holocron modules to your
exact specification.

This guide will get us started with One App and will go over some of the
fundamental concepts of the framework. We will start from the beginning
by creating our first Holocron module, then we will go through a few
One App essentials to get up and running quickly.

## 📖 Table of Contents
* [Generating a Module](#generating-a-module)
* [Running One App](#running-one-app)
* [Adding CSS Styles](#adding-css-styles)
* [Creating Routes](#creating-routes)
* [Module State & Data](#module-state-&-data)
* [Configuring One App](#configuring-one-app)
* [Development](#development)

### Generating a Module

The first step to get started with One App is to generate a Holocron module.
There are two different Holocron module types, root and child module. Let us
start by creating a root Holocron module, the entry point to our micro frontend.

```bash
export NODE_ENV=development

npx -p yo -p @americanexpress/generator-one-app-module \\
-- yo @americanexpress/one-app-module
```

Once the command is executed, you will be prompted to fill out a few questions
about your new module before it is generated. Starting off, we will want to name
our module and make sure that it is a root module; feel free to answer as you
wish for the other questions. Once the root module is generated we will be able
to start developing with One App.

> #### More Info
>
> [One App](https://github.com/americanexpress/one-app)
>
> ##### Packages
>
> [`react`](https://reactjs.org/)
>
> [`react-dom`](https://reactjs.org/docs/react-dom.html)
>
> [`holocron`](https://github.com/americanexpress/holocron/tree/main/packages/holocron)

### Running One App

Every Holocron module that is generated comes with pre-installed scripts that can
be run afterwards. One of these scripts is the `npm start` script that starts up
`one-app-runner`, which is our primary tool for local development.

```bash
npm start
```

When `one-app-runner` is fully loaded and running, we can navigate to `http://localhost:3000`
and view our Holocron module in the browser. In another terminal window you can run

```bash
npm run watch:build
```

and this will watch for any changes made to your module, then update `one-app-runner`
with the rebuilt module bundle. The command above uses `one-app-bundler` which can
also be used to bundle our Holocron module.

```bash
npm run build
```

When ready to publish to production, make sure to set `NODE_ENV=production` before building.

**Local Configuration**

Inside the `package.json` of your Holocron module, you can
include a `"one-amex": {}` property to configure some of the
tools in our ecosystem.

```json
{
  "name": "my-module",
  "one-amex": {
    "bundler": {
      "webpackConfigPath": "webpack.config.js"
    },
    "runner": {
      "rootModuleName": "my-module",
      "modules": [
        ".",
        "../my-adjacent-child-module"
      ]
    }
  }
}
```

When you start using child modules, `one-app-runner` can include
multiple local modules when it's configured to accept them.
`one-app-bundler` can have it's `webpack` config extended along
with other options.

> #### More Info
>
> **Recipes**
>
> [Run One App Locally](../recipes/running-one-app-locally)
>
> [Running In Production](../recipes/running-in-production)
>
> [Publishing Modules](../recipes/publishing-modules)
>
> ##### Packages
>
> [`@americanexpress/one-app-runner`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner)
>
> [`@americanexpress/one-app-bundler`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-bundler)

### Adding CSS Styles

Styling a Holocron module with `CSS` or `SCSS` can be accomplished by creating a
separate file that is used with the markup we write in our module.

`src/components/styles.scss`

```css
.myButton {
  background-color: green;

  &:active,
  &:focus,
  &:hover {
    background-color: blue;
  }
}
```

We can import the stylesheet into our module and use CSS modules to access the class name
for each selector by its name. The class names are unique when they are generated which
avoids unwanted cascading of styles in our document.

`src/components/MyModule.jsx`

```jsx
import React from 'react';
import styles from './styles.scss';

export default function MyModule() {
  return (
    <div>
      <button type="button" className={styles.myButton}>
        Click Me
      </button>
    </div>
  );
}
```

> #### More Info
>
> **Recipes**
>
> [Adding Styles Recipe](../recipes/adding-styles)

### Creating Routes

One App has built in dynamic routing that uses each Holocron module to
build out the router. There is a special property that we can assign to
our module `Module.childRoutes` which would allow us to add routes to
One App. `childRoutes` should be assigned a function that is given
the Redux `store` used by the app, which can be useful when using
route hooks like `onEnter`.

`src/components/MyModule.jsx`

```jsx
import React from 'react';
import { Route } from '@americanexpress/one-app-router';
import ModuleRoute from 'holocron-module-route';

export default function MyModule({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}

MyModule.childRoutes = () => [
  <ModuleRoute path="home" moduleName="home-module" />,
  <Route
    path="about"
    component={() => (
      <p>
        About Page
      </p>
    )}
  />,
];
```

> #### More Info
>
> **API**
>
> [Routing](../api/modules/routing)
>
> [Loading Modules](../api/modules/loading-modules)
>
> **Recipes**
>
> [Code Splitting Using Holocron](../recipes/code-splitting-using-holocron)
>
> ##### Packages
>
> [`@americanexpress/one-app-router`](https://github.com/americanexpress/one-app-router/tree/master)
>
> [`holocron-module-route`](https://github.com/americanexpress/holocron/tree/main/packages/holocron-module-route)

### Module State & Data

Holocron modules have another special property `Module.holocron` we can be added to allow us
to configure the module. Within `holocron`, we can set keys like `reducer` to include a module
reducer with the Redux `store` used by One App. There is also `loadModuleData` that is called
during server side render and when a Holocron module is loaded by One App. When we combine the
two, we can asynchronously load all the data needed for a module and add it to the `store` when
a `reducer` is supplied to the `holocron` configuration.

`src/components/MyModule.jsx`

```jsx
import React from 'react';
import { fromJS } from 'immutable';

function DataVisualizer({ data, loaded }) {
  return (
    <div>
      {/* do something with the data when it loads */}
    </div>
  );
}

export default function MyModule({ moduleState = {}, moduleLoadStatus = 'loading' }) {
  return (
    <DataVisualizer data={moduleState} loaded={moduleLoadStatus === 'loaded'} />
  );
}

MyModule.holocron = {
  name: 'my-module',
  reducer: (moduleState = fromJS({}), action) => {
    if (action.type === 'my-action') return fromJS(action.data);
    return moduleState;
  },
  loadModuleData: async ({ store: { dispatch }, fetchClient }) => {
    const response = await fetchClient('url/to/data.json');
    const data = await response.json();
    dispatch({ type: 'my-action', data });
  },
};
```

Both `moduleState` and `moduleLoadStatus` are props given to each Holocron module.
All state is `immutable` and the `reducer` provided will be expected to return
Immutable compliant types (which includes JavaScript primitives). `loadModuleData`
is passed the Redux `store`, along with the `fetchClient`, `ownProps` and the
`module` itself. `fetchClient` can be configured with `appConfig` which will
learn about in the next section.

> #### More Info
>
> **API**
>
> [Loading Data](../api/modules/loading-data)
>
> [State Management](../api/modules/state-management)
>
> **Recipes**
>
> [Enabling Server Side Render](../recipes/enabling-serverside-rendering)
>
> [Internationalization](../recipes/internationalizing-your-module)
>
> ##### Packages
>
> [`immutable`](https://immutable-js.github.io/immutable-js/)
>
> [`redux`](https://redux.js.org/)
>
> [`react-redux`](https://react-redux.js.org/)
>
> [`reselect`](https://github.com/reduxjs/reselect)

### Configuring One App

When One App first starts up on the server, it loads in all the modules
and looks for `Module.appConfig` in each module to configure the app runtime.
The root module is used to configure many aspects of One App, including the
state configuration that is available for every module to use when rendering.

`src/appConfig.js`

```js
export default {
  csp: "default-src 'self';",
  providedStateConfig: {
    theme: {
      client: 'my-theme-name',
      server: 'my-theme-name',
    },
  },
};
```

The `appConfig` property is meant strictly for the server side,
take advantage of `global.BROWSER` to ensure that the `appConfig`
is only bundled with the server side build.

`src/components/MyModule.jsx`

```jsx
import React from 'react';
import { useSelector } from 'react-redux';

export default function MyModule() {
  const { theme } = useSelector(
    (state) => state.get('config'),
    (state) => state.toJS()
  );

  return (
    <p>
      Theme Configuration:
      {theme}
    </p>
  );
}

if (!global.BROWSER) {
  // eslint-disable-next-line global-require
  MyModule.appConfig = require('../appConfig.js');
}
```

> #### More Info
>
> **API**
>
> [App Configuration](../api/modules/app-configuration)
>
> [Environment Variables](../api/server/environment-variables)
>
> [Module Map Schema](../api/server/module-map-schema)
>
> **Recipes**
>
> [Partial Rendering](../recipes/partial-rendering)
>
> [Progressive Web App](../recipes/PWA.md)
>
> ##### Packages
>
> [`@americanexpress/one-app-ducks`](https://github.com/americanexpress/one-app-ducks)
>
> [`@americanexpress/one-service-worker`](https://github.com/americanexpress/one-service-worker)

### Development

**Recipes**

* [Mocking API Calls](../recipes/mocking-api-calls)

**API**

* [CLI Commands](../api/server/cli-commands)