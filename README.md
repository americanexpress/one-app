[one-app-bundler]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler
[React]: http://reactjs.org/

<h1 align="center">
  <img src='https://github.com/americanexpress/one-app/raw/master/one-app.png' alt="One App - One Amex" width='50%'/>
</h1>

One App is a fresh take on web application development. It consists of a [Node.js](https://nodejs.org)
server that serves up a single page app built using [React] components and
makes use of [Holocron](https://github.com/americanexpress/holocron) to allow for code splitting
via independently developed, tested, and deployed **Holocron Modules**.

Our goal is to provide a web application framework for building fast, scalable, secure, and modular
experiences. Leave the tooling to us and focus on what matters - delivering performant, maintainable experiences to your users.

> While American Express has been using One App in production since 2016, this open source iteration
> of the framework is in a soft launch state. There will be a full documentation site forthcoming.

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [Recipes](#-recipes)
* [API](#%EF%B8%8F-api)
* [License](#-license)
* [Code Of Conduct](#-code-of-conduct)
* [Contributing](#-contributing)

## ✨ Features

- Modular design allowing for groups of UI components to be independently developed, tested, and deployed.
- Server side rendering as a first class citizen.
- Easy configuration management.
- Built-in internationalization.
- Built-in dynamic routing.

## 🤹‍ Usage

### Quick Start

**Clone and Install One App:**

```bash
export NODE_ENV=development
git clone https://github.com/americanexpress/one-app.git
cd one-app
npm ci --no-optional
```

**Build a Module:**

```bash
cd prod-sample/sample-modules/frank-lloyd-root/0.0.0
npm ci
cd ../../../..
npm run serve-module prod-sample/sample-modules/frank-lloyd-root/0.0.0
# this is used by the frank-lloyd-root module
export ONE_CONFIG_ENV=development
```

**Declare a Root Module and Start One App:**

```bash
npm start -- --root-module-name=frank-lloyd-root
```

This starts One App and makes it available at http://localhost:3000/success where you can see it in action!


### The Root Module

The root module serves as the entry point for one-app to load an application.

```
          | ------ your application ------- |
* one-app -> root-module -> [other modules] |
          | ------------------------------- |
```

It is possible for your application to consist of only the root module, however most application will want to take advantage of code splitting using [Holocron](https://github.com/americanexpress/holocron) and have the root module load other modules.

For a module to act as the root module the only requirements are:

- Returns a React component bundled with [one-app-bundler](https://github.com/americanexpress/one-app-cli).
- Provides a valid [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) though the [appConfig](#-configuration-with-app-config) static.


## 👩‍🍳 Recipes

### Creating a Holocron Module

### Adding Styles

### Making an API call

### Adding a Route

### Code Splitting using Holocron

### Internationalizing your Module

### Enabling Server Side Rendering

### Partial Rendering

Renders static markup from a Holocron module, rather than a complete page. Useful for reusing a One
App Module's markup on a non One App web page. This will only work when dispatched on the server.

```js
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderPartialOnly(true));
```

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for partial requests and by default there are no allowed origins. Add origins in the root module [corsOrigins](#corsorigins) in the [appConfig](#app-configuration)

See the [`Partial` component](./prod-sample/sample-modules/frank-lloyd-root/0.0.2/src/components/Partial.jsx)
in the `frank-lloyd-root` module for an example implementation.

> Note: for the use case of rendering a complete document (like an email), the top-level component
> can be wrapped in a `<dangerously-return-only-doctype />` (instead of a `<div />` for instance)
> which will be removed from the final render.

### Mocking your API calls for Local Development

<!-- TODO: expand on this section -->

The `set-middleware` command links your module's custom dev middleware file to One App:

```bash
$ npm run set-middleware ../[module-name]/dev.middleware.js
```

This allows you to use your [Parrot](https://github.com/americanexpress/parrot) mocks when developing your module with One App.

The `set-dev-endpoints` command links your module's dev endpoints file to One App.

A `dev.endpoints.js` file contains all the information One App needs to configure [one-app-dev-proxy](https://github.com/americanexpress/one-app-dev-proxy)
(our reverse proxy and mocking server that runs during development) and can be used to set remote endpoints
for your Module to use during local development.

```bash
$ npm run set-dev-endpoints ../[module-name]/dev.endpoints.js
```

A `dev.endpoints.js` file looks like:

```js
module.exports = () => [
  {
    envVarName: 'ONE_CLIENT_APP_API_URL',
    oneAppDevProxyPath: 'api',
    destination: 'https://api.com',
  },
];
```

### Running An Existing One App instance Locally

If you are already on your way to building your application using One App or have an already built
application with One App then you can either serve your local modules to One App or have One App
point to a remote module map it can use to fetch modules:

To serve modules to One App:

```bash
npm run serve-module <path/to/your/module> <path/to/another/module>
```

Once you have your modules served to One App you can start One App.

By default when starting One App only your locally served modules will be used. If you have a remote
module map you would like to have One App load use the `module-map-url` flag. Keep in mind that One
App will combine your locally served modules with the remote module map. Locally served modules will
override modules with the same name in the remote module map.

```bash
NODE_ENV=development npm start -- --module-map-url=<your-remote-module-map-url> --root-module-name=<your-root-module-name>
```

#### Useful Local Development Commands / Options

The `drop-module` command allows you to stop serving a module:

```bash
$ npm run drop-module <module-name>
```

The `log-format` option allows you to specify how you would like One App logs presented to you:

```bash
# available formats are `friendly`, `verbose`, and `machine`. Default is `friendly`
NODE_ENV=development npm start -- --log-format=friendly
```

The `log-level` option allows you to specify the lowest level of logs you would like One App to
present to you:

```bash
# available formats are `error`, `warn`, `log`, `info`. Default is `log`
NODE_ENV=development npm start -- --log-level=warn
```

### Running In Production

One App is battle tested as it has been in use in production within American Express with our most highly trafficked customer facing applications since 2016.

It was built with [The Twelve-Factor App](https://12factor.net/) principles in mind and as such is
highly flexible and independent of its runtime.

#### Building And Deploying Holocron Modules

Holocron Modules are [React] components that are bundled by
[one-app-bundler]
and are the pieces that make up a One App application instance.

Running [one-app-bundler] on a module builds and packages the module's source code into static assets
that can to be deployed to a CDN. It expects `./src/index.js` to export a [React] component and
creates a `build` directory as its output.

Input:
```
root
|── src
|   └── index.js
└── package.json
```


Output:
```
build
└── 1.0.0
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    └── en-us
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

`en-us` contains the language packs used for internationalization for the `en-US` locale. As this is
an example only `en-us` is shown but in your module you may have as many or few locales as needed.

`<moduleName>.browser.js` is the [modern browser bundle](https://github.com/americanexpress/babel-preset-amex/blob/master/browserlist.js#L15).

`<moduleName>.legacy.browser.js` is the [legacy browser bundle](https://github.com/americanexpress/babel-preset-amex/blob/master/browserlist.js#L24).

`<moduleName>.node.js` is the server bundle.

These bundles are used in One App depending on the environment your module is running in. For example
if One App detects that your module's bundle is being requested by an older browser then
the `<moduleName>.legacy.browser.js` bundle will be served which includes polyfills and the needed
transpilation for that browser. Otherwise it will serve the potentially leaner `<moduleName>.browser.js`
or the `<moduleName>.node.js` bundle when running on the server.

*Note that if you are making use of code splitting via dynamic imports in your module there may be more chunks in your `build` directory.*

One App has no opinion on where module bundles are deployed to, the only thing to keep in mind is
that all the assets for a given module must be kept together when deployed, i.e. the file structure
generated by [one-app-bundler] must not be modified. This is because the bundles rely on this
structure for knowing where to look for the lang packs.

#### Building and Deploying a Holocron Module Map

In order for One App to use a module two things need to happen:

1. The module's static assets must be deployed to a static server.
2. A Holocron module map must be created / updated with the module's metadata and hosted on a static server.

A Holocron module map is what tells One App what Modules it should load and where to find them.

It is what allows for Holocron modules to be loaded and used by One App without requiring a One App
deployment or restart. When One App is started on a server it reads from the `HOLOCRON_MODULE_MAP_URL`
to find out where it should fetch the module map from and then periodically polls this module
map and adds / removes / updates its internal module registry to match any changes to it.

Ultimately a Holocron Module Map is a JSON object of the following shape:

```json
{
  "key": "123",
  "modules": {
    "<moduleName>": {
      "browser": {
        "integrity": "sha256-ws6s6vTApdkif2pOfsYOGwdfE9LurZ7Bwq4Olvomrf8= sha384-CLKgejOPhJjRFoUKxLRGeuH09z376SvuTfnWw8IhnShureZQmhzf+GoWGQeA++WU",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.browser.js"
      },
      "legacyBrowser": {
        "integrity": "sha256-0wTIJNLsNA9kxoiTPpH0xcseRA+2MezF1r0cdhxx1X0= sha384-jrl8W8VHVqk42r//1LDOYgXG8KIIeBrYMRsEj8bXBEUBNq1X+PUr4XtqGubeoJ36",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.legacy.browser.js"
      },
      "node": {
        "integrity": "sha256-LqwNreqEhpaXBRSmhW8/L1MpxcyBsoMwC4IKj8MSFTE= sha384-QLDAyAeq11y9llJhMXd36WwiGg49uJX23EtgaKsCVV83fUJ0rLrswb8V9IoeRIB2",
        "url": "https://example.com/modules/<moduleName>/0.0.0/<moduleName>.node.js"
      }
    }
  }
}
```

The `key` property is used to cache bust all module bundles. This works because its value is appended
to each module asset request from One App.

The `modules` property contains module objects containing the URL and
[subresource integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
information for each of the module's assets. There are three assets created by
[one-app-bundler] for each module that need to be referenced here for One App to use, `browser`,
`legacyBrowser`, and `node`. The value for the
[`integrity` property](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
is generated by [one-app-bundler] and can be found in the `bundle.integrity.manifest.json` file
within the module's root directory after running [one-app-bundler] on it.

Your CI / CD process can generate the module map and update it as modules are added / updated / removed
and then publish the file to a static server. Just like with module assets One App does not have an
opinion of where the module map is published, it only cares that the module map is accessible shaped
correctly.

#### Building One App

You can build the One App [Docker](https://www.docker.com/) image and run it in your cloud / data center of choice:

```bash
git clone https://github.com/americanexpress/one-app.git
cd one-app
docker build .
```

Or you can build from source which creates your server side assets at `./lib` and your client
side assets to be deployed to a CDN at `./build`.

```bash
git clone https://github.com/americanexpress/one-app.git
cd one-app
NODE_ENV=development npm ci
NODE_ENV=production npm run build
```
#### Configuring One App

One App is configured via [environment variables](./runtime-configuration.md). There are a few
environment variables that are required for One App to start up including the one used to let One App
know where to fetch a module map from as described above.

#### Starting Up One App

One App can be started via docker or if built from source by running `node lib/server/index.js` on your server.

#### Monitoring One App

<!-- TODO talk about prometheus and logging schema here -->

## 🎛️ API

Please visit our [API Docs](./docs/api/API.md)

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/one-app).

Please see our [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](./LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
