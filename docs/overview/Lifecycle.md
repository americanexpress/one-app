<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# One App Life Cycles

In this guide, we'll break down what happens when One App starts up,
renders a Holocron module and how you can configure the behavior of
One App (and it's life cycles) via configuration.

## 📖 Table of Contents
* [One App Server](#one-app-server)
  * [Holocron Runtime](#holocron-runtime)
  * [Advanced Settings](#advanced-settings)
* [Rendering](#rendering)

## One App Server

When the One App `node.js` server first boots up, there are a series of steps
undertaken. The first step One App takes is configuration, which can be done via
command line arguments and environment variables.

**Configuration**

Whenever One App is ran `NODE_ENV` must be defined with either
`development` or `production`. One App behaves differently depending
on which node environment it is running under. In development mode,
One App spins up a development CDN and API server that run on
`localhost` which `@americanexpress/one-app-runner` also utilizes.

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

Similar to `ONE_CONFIG_ENV`, you can specify which language pack
environment name you wish to use using `ONE_CLIENT_LOCALE_FILENAME`:

>  * [`ONE_CLIENT_LOCALE_FILENAME`](../api/server/environment-variables#one_client_locale_filename)

**Production Environment**

There are mandatory environment variables that need to be supplied to run One App
and there are others to configure aspects of the One App runtime such as reporting
URLs for errors and CSP violations that occurred on the client. You will need to
include the environment variables below to run One App in production mode
(`NODE_ENV === production`).

>  * [`HOLOCRON_MODULE_MAP_URL`](../api/server/environment-variables#holocron_module_map_url) ⚠️
>  * [`ONE_CLIENT_CDN_URL`](../api/server/environment-variables#one_client_cdn_url) ⚠️
>  * [`ONE_CLIENT_REPORTING_URL`](../api/server/environment-variables#one_client_reporting_url) ⚠️
>  * [`ONE_CLIENT_CSP_REPORTING_URL`](../api/server/environment-variables#one_client_csp_reporting_url) ⚠️

### Holocron Runtime

Before One App can start rendering HTML documents from the server, the app will
preload every Holocron module defined in the Holocron module map. This module map
is comprised of every module to be used by One App, including the root module which
serves as our entry point.

```json
{
  "modules": {
    "my-module": {
      "baseUrl": "/modules/my-module",
      "browser": {
        "url": "/modules/my-module/build/<version>/my-module.browser.js",
        "integrity": "sha256 ... sha318 ..."
      }
    }
  }
}
```

One App uses the environment variable `HOLOCRON_MODULE_MAP_URL` to configure where
the module map is loaded. In `development`, there is a local CDN ran alongside One App
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

**Runtime Configuration**

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

### Advanced Settings

If you want complete control over the advanced and network settings, you can
use the environment variables below:

>  * [`HTTPS_PORT`](../api/server/environment-variables#https_port)
>  * [`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`](../api/server/environment-variables#https_private_key_pass_file_path)
>  * [`HTTPS_PRIVATE_KEY_PATH`](../api/server/environment-variables#https_private_key_path)
>  * [`HTTPS_PUBLIC_CERT_CHAIN_PATH`](../api/server/environment-variables#https_public_cert_chain_path)
>  * [`HTTPS_TRUSTED_CA_PATH`](../api/server/environment-variables#https_trusted_ca_path)
>  * [`HTTP_PORT`](../api/server/environment-variables#http_port)
>  * [`HTTP_METRICS_PORT`](../api/server/environment-variables#http_metrics_port)
>  * [`HTTP_ONE_APP_DEV_CDN_PORT`](../api/server/environment-variables#http_one_app_dev_cdn_port)
>  * [`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`](../api/server/environment-variables#http_one_app_dev_proxy_server_port)
>  * [`IP_ADDRESS`](../api/server/environment-variables#ip_address)

## Rendering

Coming Soon
