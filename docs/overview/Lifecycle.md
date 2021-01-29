<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# One App Life Cycles

In this guide, we'll break down what happens when One App starts up,
renders a Holocron module and how you can configure the behavior of
One App (and it's life cycles) via configuration.

## 📖 Table of Contents
* [One App Server](#one-app-server)
  * [Server Settings](#server-settings)
  * [Holocron Runtime](#holocron-runtime)
* [Server Side Rendering](#server-side-rendering)
  * [Render Path](#render-path)
  * [Partial Renders](#partial-renders)

## One App Server

When the One App server first boots up, there are a series of steps
undertaken.

### Server Settings

This section will cover the main environment variables used by One App.
The first step One App takes is configuration, which can be done via
command line arguments and environment variables.

**Core Configuration**

One App behaves differently depending on which node environment it is
running under, thus whenever One App is ran, `NODE_ENV` must be defined
with either `development` or `production`.

>  * [`NODE_ENV`](../api/server/environment-variables#node_env) ⚠️

One App has a uniform value used to indicate which environment the app is
running in. `ONE_CONFIG_ENV` is used internally as well as usable in our
modules (to render per environment).

>  * [`ONE_CONFIG_ENV`](../api/server/environment-variables#one_config_env) ⚠️

The One App micro-frontend architecture utilizes an entry point to render
the entire app. This entry point is our root Holocron module and its name
can be set with `ONE_CLIENT_ROOT_MODULE_NAME`. Without this value, One App
would not know which module to load and render from the module map (discussed below).

>  * [`ONE_CLIENT_ROOT_MODULE_NAME`](../api/server/environment-variables#one_client_root_module_name) ⚠️

**Development Environment**

In development mode, One App spins up a development CDN and API
server that run on `localhost` which `@americanexpress/one-app-runner`
also utilizes. We can configure the ports to use for the
development CDN and proxy servers ran alongside One App. By
default, One App is ran on port `3000`, the development CDN
is ran on port `3001` and the development proxy is on port `3002`.
To modify any of the three ports (`NODE_ENV === development`):

>  * [`HTTP_PORT`](../api/server/environment-variables#http_port)
>  * [`HTTP_ONE_APP_DEV_CDN_PORT`](../api/server/environment-variables#http_one_app_dev_cdn_port)
>  * [`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`](../api/server/environment-variables#http_one_app_dev_proxy_server_port)

There is a metrics server that runs in development and production,
which tracks certain activities happening internally and reports the
metrics on demand (during local development `http://localhost:3005/metrics`).
The metrics server runs on port `3005` by default, to change the port:

>  * [`HTTP_METRICS_PORT`](../api/server/environment-variables#http_metrics_port)

**Production Environment**

There are mandatory environment variables that need to be supplied to run One App
and there are others to configure aspects of the One App runtime such as reporting
URLs for errors and CSP violations that occurred on the client. You will need to
include the environment variables below to run One App in production mode
(`NODE_ENV === production`):

>  * [`ONE_CLIENT_CDN_URL`](../api/server/environment-variables#one_client_cdn_url) ⚠️
>  * [`ONE_CLIENT_REPORTING_URL`](../api/server/environment-variables#one_client_reporting_url) ⚠️
>  * [`ONE_CLIENT_CSP_REPORTING_URL`](../api/server/environment-variables#one_client_csp_reporting_url) ⚠️

While `HOLOCRON_MODULE_MAP_URL` is a required environment variable in `production`,
we will go into greater depths on this variable [in the next section on Holocron runtime.](#holocron-runtime)

>  * [`HOLOCRON_MODULE_MAP_URL`](../api/server/environment-variables#holocron_module_map_url) ⚠️

As we get to production, we can configure a certificate for One App
to use and the HTTPS `port` provided (no defaults) for One App. In addition,
the IP address can be set as well (defaults to `0.0.0.0` during production):

>  * [`IP_ADDRESS`](../api/server/environment-variables#ip_address)
>  * [`HTTPS_PORT`](../api/server/environment-variables#https_port) ⚠️
>  * [`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`](../api/server/environment-variables#https_private_key_pass_file_path) ⚠️
>  * [`HTTPS_PRIVATE_KEY_PATH`](../api/server/environment-variables#https_private_key_path) ⚠️
>  * [`HTTPS_PUBLIC_CERT_CHAIN_PATH`](../api/server/environment-variables#https_public_cert_chain_path) ⚠️
>  * [`HTTPS_TRUSTED_CA_PATH`](../api/server/environment-variables#https_trusted_ca_path) ⚠️

### Holocron Runtime

Before One App can start rendering HTML documents from the server, the app will
preload every Holocron module defined in the Holocron module map. This module map
is comprised of every module to be used by One App, including the root module which
serves as our entry point.

[link module map schema]

One App uses the environment variable `HOLOCRON_MODULE_MAP_URL` to configure from where
the module map is loaded (as `JSON`). In `development`, there is a local CDN ran alongside One App
to serve local modules and the module map - please note that when running One App directly
(repository or Docker image) or using `one-app-runner` will automatically configure this for you.
When in `production` mode, this variable is required.

>  * [`HOLOCRON_MODULE_MAP_URL`](../api/server/environment-variables#holocron_module_map_url) ⚠️

You can further configure the behavior of Holocron with the Server Settings below:

>  * [`HOLOCRON_SERVER_MAX_MODULES_RETRY`](../api/server/environment-variables#holocron_server_max_modules_retry)
>  * [`HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`](../api/server/environment-variables#holocron_server_max_sim_modules_fetch)
>  * [`ONE_MAP_POLLING_MAX`](../api/server/environment-variables#one_map_polling_max)
>  * [`ONE_MAP_POLLING_MIN`](../api/server/environment-variables#one_map_polling_min)

One App will first fetch the Holocron module map using the provided URL
and proceeds to load every module defined in the module map into memory.
If a module failed to load for any reason or when validating, One App will
log the error and recover gracefully, adding the module to a `block` list until
updated. Holocron modules are reloaded whenever the module map is polled and does
not match what is on the server.

After the modules are loaded and validated, One App can start accepting requests.
Once One App becomes operational, it begins to periodically poll the module map
URL supplied by the user to observe for any changes. If a Holocron module is added,
updated or removed from the module map, changed modules will be re-installed into
memory.

**Runtime App Configuration**

As we discussed in the [Getting Started Guide](../Getting-Started.md), each
Holocron module can supply an [`appConfig`](../api/modules/App-Configuration.md)
that is executed on and configures the server.

An example `Module.appConfig`:

```jsx
import React from 'react';

export default function RootModule({ children }) {
  return children;
}

if (!global.BROWSER) {
  RootModule.appConfig = {
    csp: 'default-src \'self\'',
  };
}
```

You can use this additional configuration interface to further tweak
One App to your needs. The only requirement is that the root module
needs to be configured with a valid CSP.

## Server Side Rendering

When One App has loaded all of our modules and started the `express` server,
the app becomes ready to render our Holocron modules. There are a few ways that
One App can render your Holocron modules:

- default render path, using the request URL to render the modules that match
- partial renders, renders only the selected Holocron module in isolation

We will cover both rendering modes and step through what happens when One App
gets a request. We will also use `Module.appConfig` to configure many aspects
of One App; from how Holocron modules loads data or render, we can tweak One App
to fit our use cases.

### Render Path

Once a request reaches the One App server, the app creates a Holocron Redux store per request
then matches the request URL to determine which modules to render. The route is matched using
`@americanexpress/one-app-router` and composed later on using the `Router`.

`loadModuleData` is ran for all the Holocron modules that matched the request URL
before any rendering is done server side. We can use the `loadModuleData` for
updating the store with a response from an API:

```jsx
import { composeModules, RenderModule } from 'holocron';

export default function MyModule() {
  return <RenderModule moduleName="my-other-module" />
}

export async function loadModuleData({ store, fetchClient, ownProps }) {
  const { dispatch, getState } = store;
  const config = getState().getIn(['config', 'my-url'])
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

> `Module.appConfig.extendSafeRequestRestrictedAttributes` allows you to include cookies and headers
> from the request, this will allow `loadModuleData` calls to have credentials if calling an API

Do note, the `ownProps` will vary between server and browser. The browser will receive
the expected props, however on the server side, the `route` prop will contain the `props`:

```jsx
async function loadModuleData({ ownProps }) {
  const { route: props } = ownProps;
}
```

After loading the module data, the root module and the child modules that matched
the request URL are composed and rendered according to their `path`. This will
generate the HTML body that will be sent to the server.

If we want to update the `<head />` of the HTML document,
React Helmet is bundled with One App and integrated into the
server side rendering. We can set up our meta tags, social cards,
SEO or add styles inside with `Helmet` and it will reflect in the
rendered markup:

```jsx
import React from 'react';
import Helmet from 'react-helmet';

export default function RootModule({ children }) {
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

Some of the headers you can expect from the SSR HTML document:

> * `Content-Security-Policy`: set from `Module.appConfig.csp`
> * `Cache-Control` & `Pragma`: preset caching by One App
> * `One-App-Version`: current One App version used
> * `helmet`: security headers provided by `helmet`

### Partials Renders

One App can be configured to statically render Holocron modules as an independent
entry point when rendered as a partial, regardless of URL path structures
defined with `Module.childRoutes` and `ModuleRoute` - this is made possible by
the micro-frontend driven architecture baked into One App, and can be utilized
to render modules individually. Partial renders gives us the ability to generate
emails, templates or any static HTML rendered by a Holocron module.

Both the standard and partial rendering follow the same lifecycle,
with the key difference being the designated entry module being rendered.
While the root module will wrap the designated entry module, the designated
module being rendered as a partial acts as an entry module during a partial
render and its child routes will be rendered in the React tree.

Passing props to our partial module when rendering can be carried out in a few ways.
To enable rendering modules using `POST` requests to supply props, we can
include the environment variable `ONE_ENABLE_POST_TO_MODULE_ROUTES` when
running One App.

>  * [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/environment-variables#one_enable_post_to_module_routes)

There is a [Partial Rendering Recipe](../recipes/Partial-Rendering.md) that goes into
depth on how to implement this render mode in a few ways (which includes
and example with `ONE_ENABLE_POST_TO_MODULE_ROUTES`).
