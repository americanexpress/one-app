# Configuration

One App can be configured via environment variable:

**`NODE_ENV`**

Can be set to either `production` or `development`. When set to `development` additional tooling
such as `one-app-dev-cdn` and `one-app-dev-proxy` is provided to help with local development. It is undefined
by default.

Setting this to `development` will set a lot of the other environment variables for you to provide
sane development time defaults.

Example:
```bash
NODE_ENV=production
```

**`HTTP_PORT`**

Sets the port on which One App will listen for requests. It defaults to `3000` if not defined.

Example:
```bash
# PORT can be used an an alias for this variable `PORT=3000`
HTTP_PORT=3000
```

**`HTTP_ONE_APP_DEV_CDN_PORT`**

Sets the port on which the One App Dev CDN server will listen for requests. It defaults to `3001` if `NODE_ENV`
is `development`, otherwise it is not not defined as it is only used for local development.

Example:
```bash
HTTP_ONE_APP_DEV_CDN_PORT=3001
```

**`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`**

Sets the port on which the One App Dev Proxy server will listen for requests. It defaults to `3002` if `NODE_ENV`
is `development`, otherwise it is not not defined as it is only used for local development.

Example:
```bash
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=3002
```

**`ONE_CLIENT_LOCALE_FILENAME`**

Locale file name for module language packs. Modifying this per environment allows for modules to have
different language packs in different environments.

Must be one of `integration`, `qa`, or be undefined (for production). It is undefined by default.

Example:
```bash
ONE_CLIENT_LOCALE_FILENAME=integration
```

**`ONE_CLIENT_ROOT_MODULE_NAME`**

Name of the module that serves as the entry point to your application. In local development this is 
not necessary as you can pass the `--root-module-name` argument to `npm start` instead.

Example:
```bash
ONE_CLIENT_ROOT_MODULE_NAME=frank-lloyd-root
```

**`ONE_ENABLE_POST_TO_MODULE_ROUTES`**

Set if One App should respond to POST requests. It is undefined by default.

Example:
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=true
```

**`ONE_MAP_POLLING_MIN`**

Minimum time allowed between module map polls for new modules from One App (In seconds). Defaults
to `0`.

Example:
```bash
ONE_MAP_POLLING_MIN=5
```

**`ONE_MAP_POLLING_MAX`**

Maximum time allowed between module map polls for new modules from One App (In seconds). Defaults
to `300`.

Example:
```bash
ONE_MAP_POLLING_MAX=10
```

**`HOLOCRON_SERVER_MAX_MODULES_RETRY`**

Maximum amount of times One App should retry on failed module fetches. Defaults to `3`.

Example:
```bash
HOLOCRON_SERVER_MAX_MODULES_RETRY=5
```

**`HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`**

Maximum number of Modules One App will try to load at a time when new modules are found in module map.

Useful to configure in case of a large module map and/or a bad network connection. Defaults to `30`.

Example:
```bash
HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH=10
```

**`HTTP_METRICS_PORT`**

Sets the port on which One App's metrics server (Prometheus) will listen for requests. Defaults to `3005`.

Example:
```bash
HTTP_METRICS_PORT=3005
```

**`HOLOCRON_MODULE_MAP_URL`**

URL where the module map is hosted.
Defaults to `http://localhost:3001/static/module-map.json` if `NODE_ENV` is set to `development` so that `one-app-dev-cdn`
can be leveraged for local development.

Example:
```bash
HOLOCRON_MODULE_MAP_URL=https://my-cdn.com/module-map.json
```

**`ONE_CLIENT_REPORTING_URL`**

URL where browser should send client side errors to. Defaults to `/_` if `NODE_ENV` is set to
`development`, is undefined otherwise.

Example:
```bash
ONE_CLIENT_REPORTING_URL=https://my-app-errors.com/client
```

**`ONE_CLIENT_CDN_URL`**

URL where One App statics are located. Defaults to `/_/static/`.

Example:
```bash
ONE_CLIENT_CDN_URL=https://app-cdn.com/statics/
```

Additionally the following environment variables are available in order to fine tune your production
set up:

** `ONE_CONFIG_ENV`**

String key that is used to look up values provided by a root module to provide state configuration
for its children modules.

Example:
```bash
ONE_CONFIG_ENV=production
```

**`HTTPS_PORT`**

**`IP_ADDRESS`**

**`HTTPS_PRIVATE_KEY_PATH`**

**`HTTPS_PUBLIC_CERT_CHAIN_PATH`**

**`HTTPS_TRUSTED_CA_PATH`**

**`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`**

**`NODE_HEAPDUMP_OPTIONS`**
