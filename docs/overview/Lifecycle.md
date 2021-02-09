<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

[one-app-runner]: https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner
[one-app-router]: https://github.com/americanexpress/one-app-router
[one-app-router-route]: https://github.com/americanexpress/one-app-router/blob/main/docs/API.md#route
[one-app-router-router]: https://github.com/americanexpress/one-app-router/blob/main/docs/API.md#router
[one-app-ducks]: https://github.com/americanexpress/one-app-ducks
[render-partial-only]: https://github.com/americanexpress/one-app-ducks#setrenderpartialonly
[render-text-only]: https://github.com/americanexpress/one-app-ducks#setrendertextonly
[holocron-module-route]: https://github.com/americanexpress/holocron/tree/main/packages/holocron-module-route#moduleroute
[create-holocron-store]: https://github.com/americanexpress/holocron/tree/main/packages/holocron/docs/api#createholocronstore
[render-module]: https://github.com/americanexpress/holocron/tree/main/packages/holocron/docs/api#rendermodule
[react-helmet]: https://github.com/nfl/react-helmet
[helmet]: https://github.com/helmetjs/helmet

# One App Life Cycles

In this guide, we'll break down what happens when One App starts up,
renders a Holocron module and how we can configure the behavior of
One App (and it's life cycles) via configuration.

## 📖 Table of Contents
* [One App Server](#one-app-server)
* [Holocron Runtime](#holocron-runtime)
* [Server Side Rendering](#server-side-rendering)
  * [Render Life Cycle](#render-life-cycle)
    * [Routing](#routing)
    * [Data Loading](#data-loading)
    * [Rendering](#rendering)
    * [Response](#response)
  * [Partials Rendering](#partials-rendering)
  * [Text Rendering](#text-rendering)

## One App Server

When the One App server first boots up, there are a series of steps
undertaken before the server becomes operational - configuring One App
based on environment settings is the first step, followed by pre-loading
all the Holocron modules onto the server.

## Holocron Runtime

Before One App can start rendering HTML documents from the server, the app will
preload every Holocron module defined in the Holocron module map. This module map
is comprised of every module to be used by One App, including the root module which
serves as our entry point.
[You can read more about the module map and how it is structured.](../api/server/Module-Map-Schema.md)

One App uses the environment variable `HOLOCRON_MODULE_MAP_URL` to configure from where
the module map is loaded (as `JSON`). In `development`, there is a local CDN ran alongside One App
to serve local modules and the module map - please note that when running One App directly
(repository or Docker image) or using [`one-app-runner`](one-app-runner) will automatically configure
this for us. When in `production` mode, this variable has no default and is required.

>  * [`HOLOCRON_MODULE_MAP_URL`](../api/server/environment-variables#holocron_module_map_url) ⚠️

You can further configure the behavior of Holocron with the Server Settings below:

>  * [`HOLOCRON_SERVER_MAX_MODULES_RETRY`](../api/server/environment-variables#holocron_server_max_modules_retry)
>  * [`HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`](../api/server/environment-variables#holocron_server_max_sim_modules_fetch)
>  * [`ONE_MAP_POLLING_MAX`](../api/server/environment-variables#one_map_polling_max)
>  * [`ONE_MAP_POLLING_MIN`](../api/server/environment-variables#one_map_polling_min)

One App will first fetch the Holocron module map using the provided URL
and proceeds to load every module defined in the module map into memory.
If a module failed to load on start, One App will also fail to load.

**Post Setup**

After the modules are loaded and validated, One App can start accepting requests.
Once One App becomes operational, it begins to periodically poll the module map
URL supplied by the user to observe for any changes. If a Holocron module is added,
updated or removed from the module map, changed modules will be re-installed into
memory.

If a module failed to load for any reason or when validating, One App will
log the error and recover gracefully, adding the module to a `block` list until
updated. Holocron modules are reloaded whenever the module map is polled and does
not match what is on the server.

> Holocron modules will not be added to the `block` list when in development

## Server Side Rendering

When One App has loaded all of our modules and started the `express` server,
the app becomes ready to render our Holocron modules. There are a few ways that
One App can render our Holocron modules:

- default render path, using the request URL to render the modules that match
- partial renders, renders a module as static HTML
- text renders, renders a module as plain text

We will step through what happens when One App gets a request and cover each
rendering mode listed. We can use `Module.appConfig` to configure key aspects
for server side rendering (SSR) in One App to fit our use cases.

### Render Life Cycle

Once a request reaches the One App server, the app begins the render cycle
by assigning various headers to the response before the HTML is rendered.

#### **Routing**

One App [creates a Holocron Redux store](create-holocron-store) per request
then matches the request URL to determine which modules to render. The route is matched using
[`@americanexpress/one-app-router`][one-app-router] and composes all the [`ModuleRoute`s](holocron-module-route) and
[`Route`s](one-app-router-route) as render props for the [`Router`](one-app-router-router).

```jsx
import React from 'react';
import ModuleRoute from 'holocron-module-route';

export default function MyModule({ children }) {
  return children;
}

MyModule.holocron = {
  name: 'my-module',
};

MyModule.childRoutes = () => [
  <ModuleRoute moduleName="my-module">
    <ModuleRoute moduleName="my-layout-module">
      <ModuleRoute moduleName="landing-page-module" path="/" />
    </ModuleRoute>
  </ModuleRoute>,
];
```

#### **Data Loading**

`loadModuleData` is ran for all the Holocron modules that matched the request URL
before any rendering is done server side. We can use the `loadModuleData` for
updating the store with a response from an API:

```jsx
import React from 'react';
import { composeModules, RenderModule } from 'holocron';

export default function MyModule() {
  return <RenderModule moduleName="my-other-module" />;
}

export async function loadModuleData({ store, fetchClient, ownProps }) {
  const { dispatch, getState } = store;
  const config = getState().getIn(['config', 'my-url']);
  // we can preload Holocron modules
  await dispatch(composeModules([{ name: 'my-other-module', props: ownProps }]));
  // update the store based on API
  dispatch(
    myAction(
      await (await fetchClient(config.url)).json()
    )
  );
}

MyModule.holocron = {
  name: 'my-module',
  loadModuleData,
};
```

There's a few `Module.appConfig`s that we can utilize to cater to our use cases:

> `Module.appConfig.provideStateConfig` sets the configuration for modules on the server and client

> `Module.appConfig.createSsrFetch` can be used to compose a `fetchClient` that is provided to
> the `loadModuleData` function

> `Module.appConfig.extendSafeRequestRestrictedAttributes` allows us to include cookies and headers
> from the request, this will allow `loadModuleData` calls to have credentials if calling an API

Do note, the `ownProps` will vary between server and browser. The browser will receive
the expected props, however on the server side, the `route` prop will contain the `props`:

```jsx
async function loadModuleData({ ownProps }) {
  const { route: props } = ownProps;
}
```

#### **Rendering**

After loading the module data, the root module and the child modules that matched
the request URL are composed and rendered according to their `path`. This will
generate the HTML body that will be sent to the server.

If we want to update the `<head />` of the HTML document,
[`react-helmet`](react-helmet) is bundled with One App and integrated into the
server side rendering. We can set up our title, meta tags, link styles to the
document using `Helmet`:

```jsx
import React from 'react';
import Helmet from 'react-helmet';

export default function MyModule({ children }) {
  return (
    <React.Fragment>
      <Helmet>
        <link rel="stylesheet" href="..." />
        <script src="..." />
      </Helmet>
      {children}
    </React.Fragment>
  );
}
```

#### **Response**

These are some of the headers we can expect from the
server-side rendered HTML document:

> * `Content-Security-Policy`: set from `Module.appConfig.csp`
> * `Cache-Control` & `Pragma`: preset caching by One App
> * `One-App-Version`: current One App version used
> * [`helmet`](helmet): security headers provided by `helmet`

### Partials Rendering

Partial renders gives us the ability to generate emails, templates
or any static HTML rendered by a Holocron module. One App can be
configured to statically render Holocron modules (via `ReactDOMServer.renderToStaticMarkup`).

Configuring a module to be rendered as static HTML can be done using
[`setRenderPartialOnly`](render-partial-only) from [`@americanexpress/one-app-ducks`](one-app-ducks)
in the modules `loadModuleData` Holocron config.

```jsx
import React from 'react';
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

export default function MyModule({ children }) {
  return children;
}

export function loadModuleData({ store, fetchClient, ownProps }) {
  store.dispatch(setRenderPartialOnly(true));
}

MyModule.holocron = {
  name: 'my-module',
  loadModuleData,
};
```

Passing props to our partial module when rendering can be carried out in a few ways.
To enable rendering modules using `POST` requests to supply props, we can
include the environment variable `ONE_ENABLE_POST_TO_MODULE_ROUTES` when
running One App.

>  * [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/environment-variables#one_enable_post_to_module_routes)

There is a [Partial Rendering Recipe](../recipes/Partial-Rendering.md) that goes into
depth on how to implement this render mode in a few ways (which includes
and example with `ONE_ENABLE_POST_TO_MODULE_ROUTES`).

### Text Rendering

Text rendering provides One App with a means to render static textual context like
`robots.txt` or other plain text assets the same way we render our modules.

Configuring a module to be rendered as static text can be done using
[`setRenderTextOnly`](render-text-only) from [`@americanexpress/one-app-ducks`](one-app-ducks)
in the modules `loadModuleData` Holocron config.

```jsx
import React from 'react';
import { setRenderTextOnly } from '@americanexpress/one-app-ducks';

export default function MyModule({ children }) {
  return 'plain text module';
}

export function loadModuleData({ store, fetchClient, ownProps }) {
  store.dispatch(setRenderTextOnly(true));
}

MyModule.holocron = {
  name: 'my-module',
  loadModuleData,
};
```

Text rendering can be combined with `ONE_ENABLE_POST_TO_MODULE_ROUTES` to
allow for dynamic results based on a `POST` request to One App.

> ### More Info
>
> **Guides**
>
> [Partial Rendering](../guides/partial-rendering)
>
> #### Packages
>
> [`@americanexpress/one-app-ducks`](https://github.com/americanexpress/one-app-ducks)


<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#one-app-life-cycles)
<!--ONE-DOCS-HIDE end-->
