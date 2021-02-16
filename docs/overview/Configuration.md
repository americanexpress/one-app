<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

[one-app-dev-cdn]: https://github.com/americanexpress/one-app-dev-cdn
[one-app-dev-proxy]: https://github.com/americanexpress/one-app-dev-proxy
[one-app-runner]: https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner
[one-app-router]: https://github.com/americanexpress/one-app-router
[one-service-worker]: https://github.com/americanexpress/one-service-worker

# One App Configuration

## 📖 Table of Contents
* [One App Server](#one-app-server)
  * [Metrics Server](#metrics-server)
* [One App Runtime Configuration](#one-app-runtime-configuration)

## One App Server

This section will cover the main environment variables used by One App,
and the how each can alter the way One App is ran.

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

**Production Environment**

There are mandatory environment variables that need to be supplied to run One App
and there are others to configure aspects of the One App runtime such as reporting
URLs for errors and CSP violations that occurred on the client. You will need to
include the environment variables below to run One App in production mode:

>  * [`ONE_CLIENT_CDN_URL`](../api/server/environment-variables#one_client_cdn_url) ⚠️
>  * [`ONE_CLIENT_REPORTING_URL`](../api/server/environment-variables#one_client_reporting_url) ⚠️
>  * [`ONE_CLIENT_CSP_REPORTING_URL`](../api/server/environment-variables#one_client_csp_reporting_url) ⚠️

> During development, there will be defaults set for these three environment variables.

While `HOLOCRON_MODULE_MAP_URL` is a required environment variable in `production`,
we will go into greater depths on this variable [in the next section on Holocron runtime.](./lifecycle#holocron-runtime)

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

**Metrics Server**

There is a metrics server that runs in development and production,
which tracks certain activities happening internally and reports the
metrics on demand (during local development `http://localhost:3005/metrics`).
The metrics server runs on port `3005` by default, to change the port:

>  * [`HTTP_METRICS_PORT`](../api/server/environment-variables#http_metrics_port)

**Development Environment**

In development mode, One App spins up a development CDN and API
server that run on `localhost` which [`@americanexpress/one-app-runner`](one-app-runner)
also utilizes. We can configure the ports to use for the
development CDN and proxy servers ran alongside One App. By
default, One App is ran on port `3000`, the [`@americanexpress/one-app-dev-cdn`](one-app-dev-cdn) development CDN
is ran on port `3001` and the development proxy server [`@americanexpress/one-app-dev-proxy`](one-app-dev-proxy)
is ran on port `3002`. To modify any of the three ports:

>  * [`HTTP_PORT`](../api/server/environment-variables#http_port)
>  * [`HTTP_ONE_APP_DEV_CDN_PORT`](../api/server/environment-variables#http_one_app_dev_cdn_port)
>  * [`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`](../api/server/environment-variables#http_one_app_dev_proxy_server_port)

> ### More Info
>
> **API**
>
> [Environment Variables](../api/server/environment-variables)
>
> [Module Map Schema](../api/server/module-map-schema)
>
> **Guides**
>
> [Monitoring One App](../guides/monitoring-one-app)
>
> [Post Request To Modules](../guides/post-to-modules)

## One App Runtime Configuration

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
  const theme = useSelector((state) => state.getIn(['config', 'theme']));

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

> ### More Info
>
> **API**
>
> [App Configuration](../api/modules/app-configuration)
>
> **Guides**
>
> [Progressive One App](../guides/progressive-one-app.md)
>
> #### Packages
>
> [`@americanexpress/one-service-worker`](one-service-worker)

___

**Up Next**

Check out the [Life Cycle guide](./lifecycle) to get into the
intricacies of what happens when One App starts up, when it
is rendering and how we can configure One App further to influence
how One App is ran.

<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#one-app-configuration)
<!--ONE-DOCS-HIDE end-->
