[👈 Return to Overview](../README.md)

# CLI Commands

`one-app` Server consists of [NPM Script Commands](https://docs.npmjs.com/misc/scripts) that determine its runtime configuration and behaviors. 

```sh
npm run <one-app-npm-command> [--] [--some-flag]
# e.g. npm run test:unit -- --watch
```

We describe each command and a description of its usage below.

**Contents**
* Install Commands
  * [`preinstall`](#install-commands)
  * [`postinstall`](#install-commands)
* Development Commands
  * [`serve-module`](#test-commands)
  * [`drop-module`](#test-commands)
  * [`set-middleware`](#test-commands)
  * [`set-dev-endpoints`](#test-commands)
* Start Commands
  * [`start`](#start-commands)
  * [`start:watch`](#start-commands)
  * [`prestart:prod-sample`](#start-commands)
  * [`start:prod-sample`](#start-commands)
* Build Commands
  * [`build`](#build-commands)
  * [`build:server`](#build-commands)
  * [`build:bundle`](#build-commands)
  * [`build:artifacts:statics`](#build-commands)
  * [`build:prod-sample`](#build-commands)
  * [`build:sample-modules`](#build-commands)
* Clean Commands
  * [`clean`](#clean-commands)
  * [`clean:build`](#clean-commands)
  * [`clean:test`](#clean-commands)
* Test Commands
  * [`test`](#test-commands)
  * [`test:unit`](#test-commands)
  * [`test:lint`](#test-commands)
  * [`pretest:integration`](#test-commands)
  * [`test:integration`](#test-commands)
  * [`test:danger`](#test-commands)
  * [`test:git-history`](#test-commands)
  * [`test:lockfile`](#test-commands)

## Install Commands

| Command       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `preinstall`  | Runs `check-engines` package to ensure a compatible Node version is used before `npm install`. |
| `postinstall` | Runs a [`build`](#build-commands) after `npm install`.                                         |

## Development Commands

> 💬 These commands are for Development only

| Command | Description |
|------|-------------|
| `serve-module` | Accepts a path to a [Holocron Module] and adds it to the local [development CDN]. *See [`serve-module` Arguments](#serve-module-arguments).*  |
| `drop-module` | Accepts a [Holocron Module] name and removes the Module from the local [development CDN]. *See [`drop-module` Arguments](#drop-module-arguments).* |
| `set-middleware` | Accepts a file path to JS file that defines custom [Express Middleware](http://expressjs.com/en/guide/writing-middleware.html#writing-middleware-for-use-in-express-apps) for the [development proxy]. *See [`set-middleware` Arguments](#set-middleware-arguments).* |
| `set-dev-endpoints`| Accepts a Node file containing development endpoints for the [development proxy]. *See [`set-dev-endpoints` Arguments](#set-dev-endpoints-arguments).* |

### `serve-module` Arguments

```sh
npm run serve-module <path-to-module-folder>...
# e.g. npm run serve-module ../../my-module
```

### `drop-module` Arguments

```sh
npm run drop-module <module-name>...
# e.g. npm run drop-module my-module
```

### `set-middleware` Arguments

```sh
npm run set-middleware <path-to-middleware-js>
# e.g. npm run set-middleware ../dev.middleware.js
```

The contents of the [Express Middleware] JS file should match the following shape:

**Shape**

```js
// (app: ExpressApp) => (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => undefined
module.exports = (app) => (req, res, next) => {
  next();
};
```

### `set-dev-endpoints` Arguments

```sh
npm run set-dev-endpoints <path-to-endpoints-js>...
# e.g. npm run set-dev-endpoints ../dev.endpoints.js
```

The contents of the endpoints JS file should match the following shape:

**Shape**

```js
module.exports = {
  someIdReference: {
    devProxyPath: String, // String local URL path
    destination: String, // String of Destination Hostname
  },
  // ... More entries of the same shape
};
```

## Start Commands

| Command       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `start`  | Runs `one-app` Server and accepts the [flags listed below](#start-usage). |
| `start:watch` | Executes `one-app` Server and watches Server source files with [`nodemon`](https://nodemon.io/). When source changes, `one-app` reloads with the `npm start`. This command [accepts all the flags as `start`](#start-usage). |
| `prestart:prod-sample` | Runs [`build:sample-modules`](#build-commands) before `start:prod-sample`. |
| `start:prod-sample` | Runs a [Docker Compose](https://docs.docker.com/compose/compose-file/) file to start up the [Integration Test Suite] containers. |


## Build Commands

| Command       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `build` | Using the [`concurrently`] package, runs `build:server` and `build:bundle`. |
| `build:server` | Executes [Babel] to transpile ES6 Server source files |
| `build:bundle` | Executes [One App Bundler] to build Browser assets |
| `build:artifacts:statics` | Runs [Static Assets Script](../../../scripts/build-static-assets-artifact.js) for [Integration Tests] |
| `build:prod-sample` | Runs `build:sample-modules` and runs the [Build One App Docker Setup Script](../../../scripts/build-one-app-docker-setup.js) for [Integration Tests] |
| `build:sample-modules` | Builds the [Holocron Modules] in [`prod-sample/sample-modules`] folder for [Integration Tests]. *See [`build:sample-modules` Usage](#buildsample-modules-usage).* |

### `build:sample-modules` Usage

```sh
npm run build:sample-modules [--] [--archive-built-artifacts]
# e.g. npm run build:sample-modules -- --archive-built-artifacts
```

#### Flags

| Flag       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `--archive-built-artifacts`  | Runs `tar` and `gzip` on the the built sample [Holocron Modules] bundles. *Used in [Integration Test Suite]* |


### Start Usage

```sh
[ONE_CONFIG_ENV=<runtime-level>] npm run start (--) (--root-module-name=<root-module-name>) [--module-map-url=<module-map-url>] [--use-middleware]
# e.g. ONE_CONFIG_ENV=development npm run start -- --root-module-name=my-root-module
```

#### Flags

| Flag       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `--root-module-name`  | Name of the [Holocron Module] that serves as the entry point to your application. |
| `--module-map-url`  | Remote Module Map URL for [`one-app-dev-cdn`] to proxy. *For Development.* |
| `--use-middleware` | Apply a custom middleware configuration for [`one-app-dev-proxy`]. *For Development.* |
| `--use-host` | Use `req.headers.host` instead of `localhost`. Passed as true or false to [`one-app-dev-cdn`]. *For Development.* |

#### Environment Variables

Please see the [Environment Variables](./Environment-Variables.md) API docs.

## Clean Commands

| Command       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `clean`  | Executes `clean:build` and `clean:test`. |
| `clean:build` | Removes folders and files related to [Babel] and [Webpack] builds. |
| `clean:test` | Removes [Jest] Integration Test Report folder. |

## Test Commands

| Command       | Description                                                                                    |
|---------------|------------------------------------------------------------------------------------------------|
| `test` | Runs all `test:*` scripts. |
| `test:unit` | Runs all [Jest] Unit Tests. Accepts Jest flags. |
| `test:lint` | Runs [ESLint] [rules](https://github.com/americanexpress/eslint-config-amex) against source. |
| `pretest:integration` | Using [`concurrently`], runs `build:prod-sample` and pulls Docker containers to prepare the [Integration Test Suite]. |
| `test:integration` | Executes the [Integration Test Suite] using [Jest]. |
| `test:danger` | Runs the [DangerJS tool](https://danger.systems/js/) that returns bundle size stats and a preflight checklist for PRs. |
| `test:git-history` | Validates the Git commit message format using the [`commitlint`](https://github.com/conventional-changelog/commitlint) tool. |
| `test:lockfile` | Validates that the `package-lock.json` file contains valid NPM registry URLs using the [`lockfile-lint`](https://github.com/lirantal/lockfile-lint) tool. |

**📘 More Information**
* Library: [`one-app-dev-cdn`]
* Library: [`one-app-dev-proxy`]
* [Development Tools API Docs](./Development-Tools.md)

[☝️ Return To Top](#Cli-Commands)

[`concurrently`]: https://www.npmjs.com/package/concurrently
[Babel]: https://babeljs.io/
[One App Bundler]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler
[Webpack]: https://webpack.js.org/
[`prod-sample/sample-modules`]: ../../../prod-sample/sample-modules
[Integration Tests]: #test-commands
[`one-app-dev-proxy`]: https://github.com/americanexpress/one-app-dev-proxy
[development proxy]: https://github.com/americanexpress/one-app-dev-proxy
[`one-app-dev-cdn`]: https://github.com/americanexpress/one-app-dev-cdn
[development CDN]: https://github.com/americanexpress/one-app-dev-cdn
[Holocron Module]: ../README.md#modules
[Holocron Modules]: ../README.md#modules
[Jest]: https://jestjs.io/
[ESLint]: https://eslint.org/
[Integration Test Suite]: ../../../__tests__/integration/README.md
[Express Middleware]: http://expressjs.com/en/guide/writing-middleware.html#writing-middleware-for-use-in-express-apps
