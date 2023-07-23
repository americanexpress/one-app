<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](../README.md)
<!--ONE-DOCS-HIDE end-->

# Environment Variables

One App can be configured via Environment Variables:

## 📖 Table of Contents

**By Topic**
* Network & Protocol Settings
  * [`HTTPS_PORT`](#https_port)
  * [`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`](#https_private_key_pass_file_path)
  * [`HTTPS_PRIVATE_KEY_PATH`](#https_private_key_path)
  * [`HTTPS_PUBLIC_CERT_CHAIN_PATH`](#https_public_cert_chain_path)
  * [`HTTPS_TRUSTED_CA_PATH`](#https_trusted_ca_path)
  * [`HTTP_PORT`](#http_port)
  * [`HTTP_METRICS_PORT`](#http_metrics_port)
  * [`HTTP_ONE_APP_DEV_CDN_PORT`](#http_one_app_dev_cdn_port)
  * [`HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`](#http_one_app_dev_proxy_server_port)
  * [`IP_ADDRESS`](#ip_address)
* Running in Production
  * [`HOLOCRON_MODULE_MAP_URL`](#holocron_module_map_url) ⚠️
  * [`NODE_ENV`](#node_env) ⚠️
  * [`ONE_CLIENT_LOCALE_FILENAME`](#one_client_locale_filename)
  * [`ONE_CLIENT_REPORTING_URL`](#one_client_reporting_url) ⚠️
  * [`ONE_CLIENT_CSP_REPORTING_URL`](#one_client_csp_reporting_url) ⚠️
  * [`ONE_CLIENT_ROOT_MODULE_NAME`](#one_client_root_module_name) ⚠️
  * [`ONE_CLIENT_CDN_URL`](#one_client_cdn_url) ⚠️
  * [`ONE_CONFIG_ENV`](#one_config_env) ⚠️
* Running in Development
  * [`NODE_ENV`](#node_env) ⚠️
  * [`ONE_CLIENT_ROOT_MODULE_NAME`](#one_client_root_module_name) ⚠️
  * [`ONE_CONFIG_ENV`](#one_config_env) ⚠️
  * [`ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS`](#ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS)
  * [`ONE_CSP_ALLOW_INLINE_SCRIPTS`](#ONE_CSP_ALLOW_INLINE_SCRIPTS)
  * [`ONE_DANGEROUSLY_DISABLE_CSP`](#ONE_DANGEROUSLY_DISABLE_CSP)
* Server Settings
  * [`HOLOCRON_SERVER_MAX_MODULES_RETRY`](#holocron_server_max_modules_retry)
  * [`HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`](#holocron_server_max_sim_modules_fetch)
  * [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](#one_enable_post_to_module_routes)
  * [`ONE_MAX_POST_REQUEST_PAYLOAD`](#one_max_post_request_payload)
  * [`ONE_MAP_POLLING_MAX`](#one_map_polling_max)
  * [`ONE_MAP_POLLING_MIN`](#one_map_polling_min)
  * [`ONE_REFERRER_POLICY_OVERRIDE`](#one_referrer_policy_override)
  * [`ONE_SERVICE_WORKER`](#one_service_worker)
* OpenTelemetry
  * [`OTEL_LOG_COLLECTOR_URL`](#otel_log_collector_url)
  * [`OTEL_SERVICE_NAME`](#otel_service_name)
  * [`OTEL_SERVICE_NAMESPACE`](#otel_service_namespace)
  * [`OTEL_RESOURCE_ATTRIBUTES`](#ote;_resource_attributes)

<details>
  <summary>Alphabetical Contents</summary>

  * [`HOLOCRON_MODULE_MAP_URL`](#holocron_module_map_url) ⚠️
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
  * [`NODE_ENV`](#node_env) ⚠️
  * [`ONE_CLIENT_CDN_URL`](#one_client_cdn_url)
  * [`ONE_CLIENT_CSP_REPORTING_URL`](#one_client_csp_reporting_url) ⚠️
  * [`ONE_CLIENT_LOCALE_FILENAME`](#one_client_locale_filename)
  * [`ONE_CLIENT_REPORTING_URL`](#one_client_reporting_url) ⚠️
  * [`ONE_CLIENT_ROOT_MODULE_NAME`](#one_client_root_module_name) ⚠️
  * [`ONE_CONFIG_ENV`](#one_config_env) ⚠️
  * [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](#one_enable_post_to_module_routes)
  * [`ONE_MAP_POLLING_MAX`](#one_map_polling_max)
  * [`ONE_MAP_POLLING_MIN`](#one_map_polling_min)
  * [`ONE_MAX_POST_REQUEST_PAYLOAD`](#one_max_post_request_payload)
  * [`ONE_REFERRER_POLICY_OVERRIDE`](#one_referrer_policy_override)
  * [`ONE_SERVICE_WORKER`](#one_service_worker)
  * [`OTEL_LOG_COLLECTOR_URL`](#otel_log_collector_url)
  * [`OTEL_RESOURCE_ATTRIBUTES`](#ote;_resource_attributes)
  * [`OTEL_SERVICE_NAME`](#otel_service_name)
  * [`OTEL_SERVICE_NAMESPACE`](#otel_service_namespace)

</details>

> ⚠️ = Required

## `HOLOCRON_MODULE_MAP_URL`

⚠️ Required In Production

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

**Default Value**
```bash
# if NODE_ENV=development
HOLOCRON_MODULE_MAP_URL=http://localhost:3001/static/module-map.json
# else
HOLOCRON_MODULE_MAP_URL=undefined
```

## `HOLOCRON_SERVER_MAX_MODULES_RETRY`

**Runs In**
* ✅ Production
* ✅ Development

Maximum amount of times One App should retry on failed module fetches.

**Shape**
```bash
HOLOCRON_SERVER_MAX_MODULES_RETRY=Number
```

**Default Value**
```bash
HOLOCRON_SERVER_MAX_MODULES_RETRY=3
```

## `HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH`

**Runs In**
* ✅ Production
* ✅ Development

Maximum number of [Holocron Modules] One App will try to load at a time when new Modules are found in [Module Map].

Useful to configure in case of a large module map and/or a bad network connection.

**Shape**
```bash
HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH=Number
```

**Default Value**
```bash
HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH=30
```

## `HTTPS_PORT`

> ⚠️ Requires [`HTTPS_PRIVATE_KEY_PATH`] and [`HTTPS_PUBLIC_CERT_CHAIN_PATH`] to be set.

**Runs In**
* ✅ Production
* ✅ Development

Sets the port on which One App will listen for requests.

**Shape**
```bash
HTTPS_PORT=Number
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

> ⚠️ Required by [`HTTPS_PORT`]

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

> ⚠️ Required by [`HTTPS_PORT`]

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

Sets the port on which One App's metrics server (e.g. [Prometheus](https://prometheus.io/)) will listen for requests.

**Shape**
```bash
HTTP_METRICS_PORT=Number
```

**Default Value**
```bash
HTTP_METRICS_PORT=3005
```

## `HTTP_ONE_APP_DEV_CDN_PORT`

**Runs In**
* 🚫 Production
* ✅ Development

Sets the port on which the [One App Dev CDN] server will listen for requests. It defaults to `3001` if `NODE_ENV`
is `development`, otherwise it is `undefined` as it is only used for local development.

**Shape**
```bash
HTTP_ONE_APP_DEV_CDN_PORT=Number
```

**Default Value**
```bash
# if NODE_ENV=development
HTTP_ONE_APP_DEV_CDN_PORT=3001
# else
HTTP_ONE_APP_DEV_CDN_PORT=undefined
```

## `HTTP_ONE_APP_DEV_PROXY_SERVER_PORT`

**Runs In**
* 🚫 Production
* ✅ Development

Sets the port on which the [One App Dev Proxy] server will listen for requests. It defaults to `3002` if `NODE_ENV`
is `development`, otherwise it is undefined as it is only used for local development.

**Shape**
```bash
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=Number
```

**Default Value**
```bash
# if NODE_ENV=development
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=3002
# else
HTTP_ONE_APP_DEV_PROXY_SERVER_PORT=undefined
```

## `HTTP_PORT`

**Runs In**
* ✅ Production
* ✅ Development

Sets the port on which One App will listen for requests.

**Shape**
```bash
HTTP_PORT=Number
```

**Default Value**
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

**Example**
```bash
NODE_ENV=production
```

## `ONE_CLIENT_CDN_URL`

⚠️ Required In Production

**Runs In**
* ✅ Production
* ✅ Development

Fully qualified base path URL where the Module Bundle folders are located (See [Module Map]).

**Shape**
```bash
ONE_CLIENT_CDN_URL=String
```

**Example**
```bash
ONE_CLIENT_CDN_URL=https://app-cdn.com/statics/
```

**Default Value**
```bash
# if NODE_ENV=development
ONE_CLIENT_CDN_URL=/_/static/
# else
ONE_CLIENT_CDN_URL=undefined
```

## `ONE_CLIENT_LOCALE_FILENAME`

**Runs In**
* ✅ Production
* ✅ Development

Locale file name for module language packs. Modifying this per environment allows for modules to have
different language packs in different environments.

Must be one of `integration`, `qa`, or be `undefined` (for production). It is `undefined` by default.

**Shape**
```bash
ONE_CLIENT_LOCALE_FILENAME=String
```

**Example**
```bash
ONE_CLIENT_LOCALE_FILENAME=integration
```

**Default Value**
```bash
ONE_CLIENT_LOCALE_FILENAME=undefined
```

## `ONE_CLIENT_REPORTING_URL`

⚠️ Required In Production

**Runs In**
* ✅ Production
* ✅ Development

URL where browser should send client side errors to. Defaults to `/_/report/errors` if `NODE_ENV` is set to
`development` and is undefined otherwise.

**Shape**
```bash
ONE_CLIENT_REPORTING_URL=String
```

**Example**
```bash
ONE_CLIENT_REPORTING_URL=https://my-app-errors.com/client
```

**Default Value**
```bash
# if NODE_ENV=development
ONE_CLIENT_REPORTING_URL=/_/report/errors
# else
ONE_CLIENT_REPORTING_URL=undefined
```

## `ONE_CLIENT_CSP_REPORTING_URL`

⚠️ Required In Production

**Runs In**
* ✅ Production
* ✅ Development

URL where browser should send [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) errors to. Defaults to `/_/report/security/csp-violation` if `NODE_ENV` is set to
`development` and is undefined otherwise.

**Shape**
```bash
ONE_CLIENT_CSP_REPORTING_URL=String
```

**Example**
```bash
ONE_CLIENT_CSP_REPORTING_URL=https://my-app-csp-violations.example.com/client
```

**Default Value**
```bash
# if NODE_ENV=development
ONE_CLIENT_CSP_REPORTING_URL=/_/report/security/csp-violation
# else
ONE_CLIENT_CSP_REPORTING_URL=undefined


## `ONE_CLIENT_ROOT_MODULE_NAME`

⚠️ Required In Production & Development

**Runs In**
* ✅ Production
* ✅ Development

Name of the module that serves as the entry point to your application. In local development this is
not necessary as you can pass the [`--root-module-name` argument to `npm start`](./Cli-Commands.md#start-commands) instead.

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

**Default Value**
```bash
ONE_CONFIG_ENV=undefined
```

## `ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS`

**Runs In**
* ✅ Production
* ✅ Development

If set to `true`, one-app will not throw an error when externals provided by the root module and externals required by child modules have conflicting semver ranges.
This flag is meant to ease the transition to newer versions of externals. It should not be kept on for long as mismatching versions of packages can cause unexpected issues.

**Shape**
```bash
ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS=true
```

**Example**
```bash
ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS=true
```

**Default Value**
```bash
ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS=undefined
```

## `ONE_CSP_ALLOW_INLINE_SCRIPTS`

**Runs In**
* 🚫 Production
* ✅ Development

If set to `true`, one-app will not prepend a script nonce to the `script-src` CSP. This will allow inline scripts to be executed in development - for example, to allow browser devtools to inject content scripts in some browsers that otherwise restrict this.

**Shape**
```bash
ONE_CSP_ALLOW_INLINE_SCRIPTS=true
```

**Example**
```bash
ONE_CSP_ALLOW_INLINE_SCRIPTS=true
```

**Default Value**
```bash
ONE_CSP_ALLOW_INLINE_SCRIPTS=undefined
```

## `ONE_DANGEROUSLY_DISABLE_CSP`

**Runs In**
* 🚫 Production
* ✅ Development

If set to `true`, one-app will not throw an error when a valid Content Security Policy (CSP) is not present. This flag is meant to allow any module to be ran as a root module and to allow root modules to bypass the CSP requirement so long as `NODE_ENV` is `development`. When `NODE_ENV` is `development` and `ONE_DANGEROUSLY_DISABLE_CSP` is `true` a CSP header will not be set. 

**Shape**
```bash
ONE_DANGEROUSLY_DISABLE_CSP=Boolean
```

**Example**
```bash
ONE_DANGEROUSLY_DISABLE_CSP=true
```

**Default Value**
```bash
ONE_DANGEROUSLY_DISABLE_CSP=false
```

## `ONE_ENABLE_POST_TO_MODULE_ROUTES`

**Runs In**
* ✅ Production
* ✅ Development

Set to true if One App should respond to POST requests.

**Shape**
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=Boolean
```

**Example**
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=true
```

**Default Value**
```bash
ONE_ENABLE_POST_TO_MODULE_ROUTES=false
```

## `ONE_MAX_POST_REQUEST_PAYLOAD`

**Runs In**
* ✅ Production
* ✅ Development

Maximum payload allowed in POST requests. Has no effect unless `ONE_ENABLE_POST_TO_MODULE_ROUTES` is set to true.

**Shape**
```bash
ONE_MAX_POST_REQUEST_PAYLOAD=String
```

**Example**
```bash
ONE_MAX_POST_REQUEST_PAYLOAD=100kb
```

**Default Value**
```bash
ONE_MAX_POST_REQUEST_PAYLOAD=15kb
```

## `ONE_MAP_POLLING_MAX`

**Runs In**
* ✅ Production
* ✅ Development

Maximum time allowed between module map polls for new modules from One App (in seconds).

**Shape**
```bash
ONE_MAP_POLLING_MAX=Number
```

**Default Value**
```bash
ONE_MAP_POLLING_MAX=300
```

## `ONE_MAP_POLLING_MIN`

**Runs In**
* ✅ Production
* ✅ Development

Minimum time allowed between [Module Map] polls for new modules from One App (in
seconds).

**Shape**
```bash
ONE_MAP_POLLING_MIN=Number
```

**Default Value**
```bash
ONE_MAP_POLLING_MIN=0
```

## `ONE_REFERRER_POLICY_OVERRIDE`

**Runs In**
* ✅ Production
* ✅ Development

Overrides the [`Referrer-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy) header.

Must be one of: `no-referrer`, `no-referrer-when-downgrade`, `same-origin` or `strict-origin`.

**Shape**
```bash
ONE_REFERRER_POLICY_OVERRIDE=String
```

**Example**
```bash
ONE_REFERRER_POLICY_OVERRIDE=no-referrer
```

**Default Value**
```bash
ONE_REFERRER_POLICY_OVERRIDE=same-origin
```

## `ONE_SERVICE_WORKER`

**Runs In**
* ✅ Production
* ✅ Development

Feature flag to enable service worker and PWA feature, defaults to false.

**Shape**
```bash
ONE_SERVICE_WORKER=Boolean
```
**Example**
```bash
ONE_SERVICE_WORKER=true
```

**Default Value**
```bash
ONE_SERVICE_WORKER=false
```

## `OTEL_LOG_COLLECTOR_URL`

**Runs In**
* ✅ Production
* ✅ Development

When set, One App will emit OpenTelemetry logs over GRPC to the configured endpoint.

**Shape**
```bash
OTEL_LOG_COLLECTOR_URL=String
```

**Example**
```bash
OTEL_LOG_COLLECTOR_URL=http://localhost:4318/v1/logs
```

## `OTEL_SERVICE_NAME`

> ⚠️ Requires [`OTEL_LOG_COLLECTOR_URL`] to be set.

**Runs In**
* ✅ Production
* ✅ Development

Service name for OpenTelemtry resource.
See [OTel Environment Variable Specification] for more details

**Shape**
```bash
OTEL_SERVICE_NAME=String
```

**Example**
```bash
OTEL_SERVICE_NAME=MyApplication
```

**Default Value**
```bash
OTEL_SERVICE_NAME="One App"
```

## `OTEL_SERVICE_NAMESPACE`

> ⚠️ Requires [`OTEL_LOG_COLLECTOR_URL`] to be set.

**Runs In**
* ✅ Production
* ✅ Development

Service namespace for OpenTelemtry resource.

**Shape**
```bash
OTEL_SERVICE_NAMESPACE=String
```

**Example**
```bash
OTEL_SERVICE_NAMESPACE=MyApplicationNamespace
```

## `OTEL_RESOURCE_ATTRIBUTES`

> ⚠️ Requires [`OTEL_LOG_COLLECTOR_URL`] to be set.

**Runs In**
* ✅ Production
* ✅ Development

Additional OpenTelemetry resource attributes in [W3C Baggage format](https://w3c.github.io/baggage).
See OTel Environment Variable Specification] & [OTel Resource SDK documentation] for more details.

**Shape**
```bash
OTEL_RESOURCE_ATTRIBUTES=String
```

**Example**
```bash
OTEL_RESOURCE_ATTRIBUTES="foo=bar;baz=qux"
```

**📘 More Information**
* Useful NodeJS Env Variables: [Node CLI Docs](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file)
* [Development Tools Documentation](./Development-Tools.md)
* [CLI Commands Documentation](./Cli-Commands.md)
* [Module Map Documentation](./Module-Map-Schema.md)

[☝️ Return To Top](#environment-variables)

[One App Dev Proxy]: https://github.com/americanexpress/one-app-dev-proxy
[One App Dev CDN]: https://github.com/americanexpress/one-app-dev-cdn
[Holocron Module]: ../README.md#modules
[Holocron Modules]: ../README.md#modules
[Module Map]: ./Module-Map-Schema.md
[`HTTPS_PRIVATE_KEY_PATH`]: #https_private_key_path
[`HTTPS_PUBLIC_CERT_CHAIN_PATH`]: #https_public_cert_chain_path
[`HTTPS_TRUSTED_CA_PATH`]: #https_trusted_ca_path
[`HTTPS_PRIVATE_KEY_PASS_FILE_PATH`]: #https_private_key_pass_file_path
[`HTTPS_PORT`]: #https_port
[OTel Environment Variable Specification]: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
[OTel Resource SDK documentation]: https://opentelemetry.io/docs/specs/otel/resource/sdk/#specifying-resource-information-via-an-environment-variable