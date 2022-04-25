<!--ONE-DOCS-HIDE start-->
[👈 Return to Documentation](../../README.md#-documentation)
<!--ONE-DOCS-HIDE end-->

[one-app]: https://github.com/americanexpress/one-app
[holocron]: https://github.com/americanexpress/holocron/tree/main/packages/holocron
[one-app-runner]: https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner
[one-app-bundler]: https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-bundler
[one-app-router]: https://github.com/americanexpress/one-app-router
[holocron-module-route]: https://github.com/americanexpress/holocron/tree/main/packages/holocron-module-route
[parrot-middleware]: https://github.com/americanexpress/parrot/tree/main/packages/parrot-middleware

[react]: https://reactjs.org/
[react-dom]: https://reactjs.org/docs/react-dom.html
[redux]: https://redux.js.org/
[react-redux]: https://react-redux.js.org/
[immutable-js]: https://immutable-js.github.io/immutable-js/
[reselect]: https://github.com/reduxjs/reselect

# Getting Started With One App

One App is a web application that combines together a micro frontend of Holocron components
into a single, cohesive runtime. Holocron modules empower teams to craft a rich user
experience that can be used to compose parts of a web page or as route destinations all
on their own. One App was built from the ground up with Holocron and its micro frontend
architecture, allowing engineers to seamlessly update each module independently and
collaborate across teams working together to create a product. While One App comes with
a security standard in practice, progressive web app capability and many other features,
its feature set can be configured by Holocron modules to your exact specification.

This guide will get us started with One App and will go over some of the
fundamental concepts of the framework. We will start from the beginning
by creating our first Holocron module, then we will go through a few
One App essentials to get up and running quickly.

## 📖 Table of Contents
* [Generating a Module](#generating-a-module)
* [Running One App](#running-one-app)
* [Adding CSS Styles](#adding-css-styles)
* [Creating Routes](#creating-routes)
* [Module State and Data](#module-state-and-data)
* [Configuring One App](#configuring-one-app)
* [Development Setup](#development-setup)

### Generating a Module

The first step to get started with One App is to generate a Holocron module.
There are two different Holocron module types, root and child module. Let us
start by creating a root Holocron module, the entry point to our micro frontend.

```bash
export NODE_ENV=development
npx -p yo -p @americanexpress/generator-one-app-module -- yo @americanexpress/one-app-module
```

Once the command is executed, you will be prompted to fill out a few questions
about your new module before it is generated.

- Choose a name for your module
- Select "root module"
- Select "yes" for `parrot-middleware`
- Select "yes" for `internationalization`

> Read more about [`parrot-middleware`](parrot-middleware)
> and [`internationalization`](../guides/Internationalizing-Your-Module.md)

Once the root module is generated we will be able to start developing with One App.
As we continue, we will eventually create a child Holocron module for us to use -
the main difference between a root module and child module is that the root module
is the entry point of the micro frontend and as we will learn more on, it plays
a significant role in configuring One App.

> #### More Info
>
> [One App](one-app)
>
> ##### Packages
>
> [`react`](react)
>
> [`react-dom`](react-dom)
>
> [`holocron`](holocron)

### Running One App

Every Holocron module that is generated comes with pre-installed scripts.
One of these scripts is `npm start` which starts up `one-app-runner`.

> `one-app-runner` aids in local development by pulling a `one-app` docker image
> and running it with a set configuration provided in your modules `package.json`.

```bash
npm start
```

When `one-app-runner` is fully loaded and running, we can navigate to `http://localhost:3000`
and view our Holocron module in the browser.

> It can take a few minutes when `one-app-runner` starts for the first time.

In a new terminal window you can run:

```bash
npm run watch:build
```

`npm run watch:build` will watch for any changes made to your module,
and rebuild the module bundle. When we're ready to publish our Holocron
module, we can build and bundle your Holocron module by running:

```bash
npm run build
```

> When ready to publish to production, make sure to set `NODE_ENV=production`
> before building. This will ensure a production ready Holocron module and turn
> on key security mechanisms like SRI for Holocron module scripts.

**Local Configuration**

Inside the `package.json` of your Holocron module, you can
include a `"one-amex": {}` property to configure some of the
tools in our ecosystem.

```json
{
  "name": "my-module",
  "one-amex": {
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

> #### More Info
>
> **Guides**
>
> **Development**
>
> [Run One App Locally](../guides/Running-One-App-Locally.md)
>
> [Mocking API Calls](../guides/Mocking-Api-Calls.md)
>
> **Production**
>
> [Running In Production](../guides/Running-In-Production.md)
>
> [Publishing Modules](../guides/Publishing-Modules.md)
>
> ##### Packages
>
> [`@americanexpress/one-app-runner`](one-app-runner)
>
> [`@americanexpress/one-app-bundler`](one-app-bundler)

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
avoids unwanted cascading of styles in our document and DOM selector collisions.

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
> **Guides**
>
> [Adding Styles Recipe](../guides/Adding-Styles.md)

### Creating Routes

One App has built in dynamic routing that uses each Holocron module to
build out the router. There is a special property that we can assign to
our module `Module.childRoutes` which would allow us to add routes to
One App.

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
  <ModuleRoute key="home" path="home" moduleName="home-module" />,
  <Route
    key="about"
    path="about"
    component={() => (
      <p>
        About Page
      </p>
    )}
  />,
];
```

`childRoutes` can be assigned a function that is given
the Redux `store` used by the app, which can be useful when using
route hooks like `onEnter`. If the Redux store is not needed, `childRoutes`
can be an `array` of `Route`s and `ModuleRoute`s or a single `Route`
if that is all that's needed.

> #### More Info
>
> **API**
>
> [Routing](../api/modules/Routing.md)
>
> [Loading Modules](../api/modules/Loading-Modules.md)
>
> **Guides**
>
> [Module Composition](../guides/Module-Composition.md)
>
> [Code Splitting Using Holocron](../guides/Code-Splitting-Using-Holocron.md)
>
> ##### Packages
>
> [`@americanexpress/one-app-router`](one-app-router)
>
> [`holocron-module-route`](holocron-module-route)

### Module State and Data

Holocron modules have a special property called `Module.holocron` that allows us
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

export default function MyModule({ moduleState = {} }) {
  return (
    <DataVisualizer data={moduleState} loaded={!!moduleState} />
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
> [Loading Data](../api/modules/Loading-Data.md)
>
> [State Management](../api/modules/State-Management.md)
>
> **Guides**
>
> [Making An API Call](../guides/Making-An-Api-Call.md)
>
> [Enabling Server Side Render](../guides/Enabling-Serverside-Rendering.md)
>
> [Internationalization](../guides/Internationalizing-Your-Module.md)
>
> ##### Packages
>
> [`immutable`](immutable-js)
>
> [`redux`](redux)
>
> [`react-redux`](react-redux)
>
> [`reselect`](reselect)

___

**Up Next**

Check out the [Configuration guide](./Configuration.md) to grasp
how we can use environment variables and Holocron module app
configuration to cater to our needs as well as utilize features
in One App.

<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#-getting-started-with-one-app)
<!--ONE-DOCS-HIDE end-->
