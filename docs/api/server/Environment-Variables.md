[👈 Return to Overview](../API.md)

# Environment Variables

One App can be configured via Environment Variables:

**Contents**
* [`HOLOCRON_MODULE_MAP_URL`](#holocron_module_map_url)
* [`HOLOCRON_SERVER_MAX_MODULES_RETRY`](#holocron_server_max_modules_retry)
* [`HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`](#holocron_server_max_sim_modules_fetch)
* [`HTTPS_PORT`](#https_port)
* [`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`](#https_private_key_pass_file_path)
* [`HTTPS_PRIVATE_KEY_PATH`](#https_private_key_path)
* [`HTTPS_PUBLIC_CERT_CHAIN_PATH`](#https_public_cert_chain_path)
* [`HTTPS_TRUSTED_CA_PATH`](#https_trusted_ca_path)
* [`HTTP_METRICS_PORT`](#http_metrics_port)
* [`HTTP_ONE_APP_DEV_CDN_PORT`](#http_one_app_dev_cdn_port)
* [`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`](#http_one_app_dev_proxy_server_port)
* [`HTTP_PORT`](#http_port)
* [`IP_ADDRESS`](#ip_address)
* [`NODE_ENV`](#node_env)
* [`ONE_CLIENT_CDN_URL`](#one_client_cdn_url)
* [`ONE_CLIENT_LOCALE_FILENAME`](#one_client_locale_filename)
* [`ONE_CLIENT_REPORTING_URL`](#one_client_reporting_url)
* [`ONE_CLIENT_ROOT_MODULE_NAME`](#one_client_root_module_name)
* [`ONE_CONFIG_ENV`](#one_config_env)
* [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](#one_enable_post_to_module_routes)
* [`ONE_MAP_POLLING_MAX`](#one_map_polling_max)
* [`ONE_MAP_POLLING_MIN`](#one_map_polling_min)

## `HOLOCRON_MODULE_MAP_URL`

**Runs In**
* ✅ Production
* ✅ Development

URL where the [Module Map] is hosted.

Defaults to `http://localhost:3001/static/module-map.json` if `NODE_ENV` is set to `development` so that [One App Dev CDN] can be leveraged for local development.

**Shape**
```bash
HOLOCRON_MODULE_MAP_URL=String
```

**Example**
```bash
HOLOCRON_MODULE_MAP_URL=https://my-cdn.com/module-map.json
```

## `HOLOCRON_SERVER_MAX_MODULES_RETRY`

**Runs In**
* ✅ Production
* ✅ Development

Maximum amount of times One App should retry on failed module fetches. Defaults to `3`.

**Shape**
```bash
HOLOCRON_SERVER_MAX_MODULES_RETRY=Integer
```

**Example**
```bash
HOLOCRON_SERVER_MAX_MODULES_RETRY=10
```

## `HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`

**Runs In**
* ✅ Production
* ✅ Development

Maximum number of [Holocron Modules] One App will try to load at a time when new Modules are found in [Module Map].

Useful to configure in case of a large module map and/or a bad network connection. Defaults to `30`.

**Shape**
```bash
HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH=Integer
```

**Example**
```bash
HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH=10
```

## `HTTPS_PORT`

> ⚠️ Requires [`HTTPS_PRIVATE_KEY_PATH`] and [`HTTPS_PUBLIC_CERT_CHAIN_PATH`] to be set.

**Runs In**
* ✅ Production 
* ✅ Development

Sets the port on which One App will listen for requests. It defaults to undefined.

**Shape**
```bash
HTTPS_PORT=Integer
```

**Example**
```bash
HTTPS_PORT=443
```

## `HTTPS_PRIVATE_KEY_PASS_FILE_PATH`

**Runs In**
* ✅ Production 
* ✅ Development

The file path to a file containing a shared passphrase for single private key (See [Node documentation on `passphrase` for `tls.createSecureContext`](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)). 

**Shape**
```bash
HTTPS_PRIVATE_KEY_PASS_FILE_PATH=String
```

**Example**
```bash
HTTPS_PRIVATE_KEY_PASS_FILE_PATH=./some-extra-certs.pem
```

## `HTTPS_PRIVATE_KEY_PATH`

**Runs In**
* ✅ Production 
* ✅ Development

The file path to the private key of an SSL Certificate.

**Shape**
```bash
HTTPS_PRIVATE_KEY_PATH=String
```

**Example**
```bash
HTTPS_PRIVATE_KEY_PATH=./some-private-key.pem
```

## `HTTPS_PUBLIC_CERT_CHAIN_PATH`

**Runs In**
* ✅ Production 
* ✅ Development

The file path to the public key of an SSL Certificate.

**Shape**
```bash
HTTPS_PUBLIC_CERT_CHAIN_PATH=String
```

**Example**
```bash
HTTPS_PUBLIC_CERT_CHAIN_PATH=./some-cert.pem
```

## `HTTPS_TRUSTED_CA_PATH`

**Runs In**
* ✅ Production 
* ✅ Development

The file path to a file containing one or more certs to trust over the system default. See [Node documentation on `ca` option in `tls.createSecureContext`](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).

**Shape**
```bash
HTTPS_TRUSTED_CA_PATH=String
```

**Example**
```bash
HTTPS_TRUSTED_CA_PATH=./some-extra-certs.pem
```

## `HTTP_METRICS_PORT`

**Runs In**
* ✅ Production
* ✅ Development

Sets the port on which One App's metrics server (e.g. [Prometheus](https://prometheus.io/)) will listen for requests. Defaults to `3005`.

**Shape**
```bash
HTTP_METRICS_PORT=Integer
```

**Example**
```bash
HTTP_METRICS_PORT=3005
```


## `HTTP_ONE_APP_DEV_CDN_PORT`

**Runs In**
* 🚫 Production
* ✅ Development

Sets the port on which the [One App Dev CDN] server will listen for requests. It defaults to `3001` if `NODE_ENV`
is `development`, otherwise it is undefined as it is only used for local development.

**Shape**
```bash
HTTP_ONE_APP_DEV_CDN_PORT=Integer
```

**Example**
```bash
HTTP_ONE_APP_DEV_CDN_PORT=3001
```

## `HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`

**Runs In**
* 🚫 Production
* ✅ Development

Sets the port on which the [One App Dev Proxy] server will listen for requests. It defaults to `3002` if `NODE_ENV`
is `development`, otherwise it is undefined as it is only used for local development.

**Shape**
```bash
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=Integer
```

**Example**
```bash
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=3002
```

## `HTTP_PORT`

**Runs In**
* ✅ Production 
* ✅ Development

Sets the port on which One App will listen for requests. It defaults to `3000` if not defined.

**Shape**
```bash
HTTP_ONE_APP_DEV_CDN_PORT=Integer
```

**Example**
```bash
HTTP_PORT=3000
```

## `IP_ADDRESS`

**Runs In**
* ✅ Production 
* ✅ Development

Specify a specific IP Address for One App to bind to.

**Shape**
```bash
IP_ADDRESS=String
```

**Example**
```bash
IP_ADDRESS=192.168.1.1
```

## `NODE_ENV`

**Runs In**
* ✅ Production 
* ✅ Development

May be set to either `production` or `development`. When set to `development` additional tooling
such as `one-app-dev-cdn` and `one-app-dev-proxy` is provided to help with local development. It is undefined
by default.

Setting this to `development` will set a lot of the other environment variables for you to provide
sane development time defaults.

Example:
```bash
NODE_ENV=production
```

## `ONE_CLIENT_CDN_URL`

**Runs In**
* ✅ Production
* ✅ Development

Fully qualified base path URL where the Module Bundle folders are located (See [Module Map]). Defaults to `/_/static/`.

**Shape**
```bash
ONE_CLIENT_CDN_URL=String
```

**Example**
```bash
ONE_CLIENT_CDN_URL=https://app-cdn.com/statics/
```

## `ONE_CLIENT_LOCALE_FILENAME`

**Runs In**
* ✅ Production
* ✅ Development

Locale file name for module language packs. Modifying this per environment allows for modules to have
different language packs in different environments.

Must be one of `integration`, `qa`, or be undefined (for production). It is undefined by default.

**Shape**
```bash
ONE_CLIENT_LOCALE_FILENAME=String
```

**Example**
```bash
ONE_CLIENT_LOCALE_FILENAME=integration
```

## `ONE_CLIENT_REPORTING_URL`

**Runs In**
* ✅ Production
* ✅ Development

URL where browser should send client side errors to. Defaults to `/_` if `NODE_ENV` is set to
`development` and is undefined otherwise.

**Shape**
```bash
ONE_CLIENT_REPORTING_URL=String
```

**Example**
```bash
ONE_CLIENT_REPORTING_URL=https://my-app-errors.com/client
```

## `ONE_CLIENT_ROOT_MODULE_NAME`

⚠️ Required In Production

**Runs In**
* ✅ Production
* ✅ Development

Name of the module that serves as the entry point to your application. In local development this is 
not necessary as you can pass the [`--root-module-name` argument to `npm start`](./CLI-Commands.md#start-commands) instead.

**Shape**
```bash
ONE_CLIENT_ROOT_MODULE_NAME=String
```

**Example**
```bash
ONE_CLIENT_ROOT_MODULE_NAME=frank-lloyd-root
```

## `ONE_CONFIG_ENV`

**Runs In**
* ✅ Production
* ✅ Development

An arbitrary String key that is used to look up values provided in [App Configuration's `provideStateConfig`](../modules/App-Configuration.md#provideStateConfig) for its children modules.

**Shape**
```bash
ONE_CONFIG_ENV=String
```

**Example**
```bash
ONE_CONFIG_ENV=staging
```

## `ONE_ENABLE_POST_TO_MODULE_ROUTES`

**Runs In**
* ✅ Production
* ✅ Development

Set if One App should respond to POST requests. It is undefined by default.

**Shape**
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=Boolean
```

**Example**
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=true
```

## `ONE_MAP_POLLING_MAX`

**Runs In**
* ✅ Production
* ✅ Development

Maximum time allowed between module map polls for new modules from One App (in seconds). Defaults
to `300`.

**Shape**
```bash
ONE_MAP_POLLING_MAX=Integer
```

**Example**
```bash
ONE_MAP_POLLING_MAX=10
```

## `ONE_MAP_POLLING_MIN`

**Runs In**
* ✅ Production
* ✅ Development

Minimum time allowed between [Module Map] polls for new modules from One App (in seconds). Defaults
to `0`.

**Shape**
```bash
ONE_MAP_POLLING_MIN=Integer
```

**Example**
```bash
ONE_MAP_POLLING_MIN=5
```

**📘 More Information**
* Useful NodeJS Env Variables: [Node CLI Docs](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file)
* [Development Tools Documentation](./Development-Tools.md)
* [CLI Commands Documentation](./CLI-Commands.md)
* [Module Map Documentation](./Module-Map-Schema.md)

[☝️ Return To Top](#environment-variables)

[One App Dev Proxy]: https://github.com/americanexpress/one-app-dev-proxy
[One App Dev CDN]: https://github.com/americanexpress/one-app-dev-cdn
[Holocron Module]: ../API.md#modules
[Holocron Modules]: ../API.md#modules
[Module Map]: ./Module-Map-Schema.md
[`HTTPS_PRIVATE_KEY_PATH`]: #https_private_key_path
[`HTTPS_PUBLIC_CERT_CHAIN_PATH`]: #https_public_cert_chain_path
[`HTTPS_TRUSTED_CA_PATH`]: #https_trusted_ca_path
[`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`]: #https_private_key_pass_file_path
[`HTTPS_PORT`]: #https_port