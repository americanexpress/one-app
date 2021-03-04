[one-app-bundler]: https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-bundler
[react]: http://reactjs.org/

<h1 align="center">
  <img src='https://github.com/americanexpress/one-app/raw/main/one-app.png' alt="One App - One Amex" width='50%'/>
</h1>

![One App Docker Release](https://github.com/americanexpress/one-app/workflows/One%20App%20Docker%20Release/badge.svg)
![One App Integration Tests](https://github.com/americanexpress/one-app/workflows/One%20App%20Integration%20Tests/badge.svg)
![One App Unit and Lint Tests](https://github.com/americanexpress/one-app/workflows/One%20App%20Unit%20and%20Lint%20Tests/badge.svg)

One App is a fresh take on web application development. It consists of a
[Node.js](https://nodejs.org) server that serves up a single page app built using [React] components
and makes use of [Holocron](https://github.com/americanexpress/holocron) to allow for code splitting
via independently developed, tested, and deployed **Holocron Modules**.

Our goal is to provide a web application framework for building fast, scalable, secure, and modular
experiences. Leave the tooling to us and focus on what matters - delivering performant, maintainable
experiences to your users.

> While American Express has been using One App in production since 2016, this open source iteration
> of the framework is in a soft launch state. There will be a full documentation site forthcoming.

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app`?

> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [License](#%EF%B8%8F-license)
- [Code Of Conduct](#%EF%B8%8F-code-of-conduct)
- [Community](#community)
- [Contributing](#-contributing)

## ✨ Features

- Modular design allowing for groups of UI components to be independently developed, tested, and
  deployed.
- Easy configuration management.
- Server side rendering as a first class citizen.
- Built-in internationalization.
- Built-in dynamic routing.

For a breakdown on these features and an architectural overview, take a look at our
[overview documentation](./docs/overview/README.md)

## 🚀‍ Quick Start

### Create a Module with [generator-one-app-module](https://github.com/americanexpress/one-app-cli/tree/main/packages/generator-one-app-module)

The easiest way to do this is via
[`npx`](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) (comes with
`npm` versions 5.2.0 and above). This will use the
[One App Module Generator](https://github.com/americanexpress/one-app-cli/tree/main/packages/generator-one-app-module)
to generate a basic One App module.

Run the following command in the directory you want your module to live:

```bash
export NODE_ENV=development
npx -p yo -p @americanexpress/generator-one-app-module -- yo @americanexpress/one-app-module
```

Select the `root module` option when asked.

> [Docker](https://www.docker.com/) is required for this next step

When the generator has finished:

```bash
cd ./[your-module-name]
npm start
```

Visit `localhost:3000`

Please follow the [Getting Started](./docs/Getting-Started.md) guide for more information.

### Clone and Install One App Locally

> When you want to work on One App directly or are unable to use
> [One App Runner](./docs/guides/One-App-Runner.md)

```bash
export NODE_ENV=development
git clone https://github.com/americanexpress/one-app.git
cd one-app
npm ci --no-optional
```

### Serve local Module's to One App

> When you are directly running the One App server locally and would like to load a local Module

At the root of your `one-app` repo, run:

```bash
npm run serve-module <path-to-local-module>
# e.g. npm run serve-module ../my-first-module
```

The `serve-module` command generates a `static` folder in the `one-app` root directory, containing a
`module-map.json` and a `modules` folder with your bundled module code:

```
one-app/static
├── module-map.json
└── modules
    └── my-first-module
        └── 1.0.0
            ├── my-first-module.browser.js
            ├── my-first-module.browser.js.map
            ├── my-first-module.legacy.browser.js
            ├── my-first-module.legacy.browser.js.map
            ├── my-first-module.node.js
            └── my-first-module.node.js.map
```

Paired with the built-in [one-app-dev-cdn](https://github.com/americanexpress/one-app-dev-cdn)
library, you're able to utilize the [Holocron Module Map](./docs/api/server/Module-Map-Schema.md)
while running your entire One App instance locally. No need to deploy and fetch remote assets from a
CDN at this step.

### The Root Module

The root module serves as the entry point for one-app to load an application.

```
          | ------ your application ------- |
* one-app -> root-module -> [other modules] |
          | ------------------------------- |
```

It is possible for your application to consist of only the root module, however most application
will want to take advantage of code splitting using
[Holocron](https://github.com/americanexpress/holocron) and have the root module load other modules.
More on this in the [Routing](./docs/api/modules/Routing.md) section in the API docs.

For a module to act as the root module the only requirements are:

- Returns a React component bundled with
  [one-app-bundler](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-bundler).
- Provides a valid [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
  though the [appConfig](./docs/api/modules/App-Configuration.md) static.

### Declaring a module as your Root Module and start One App:

Start up One App and declare your new module as the [Root Module](#the-root-module):

```bash
npm start -- --root-module-name=<module-name>
# e.g. npm start -- --root-module-name=my-first-module
```

This starts One App and makes it available at http://localhost:3000/ where you can see it in action!

Open another terminal window, run `npm run watch:build` in your module's directory and make some
edits to the module. One App will pick up these changes and update the module bundles accordingly.
When you reload your browser window, One App will be displaying your updated module.

## 📜 Documentation

- [One App Overview](./docs/overview/README.md)
- [Getting Started](./docs/overview/Getting-Started.md)
- [Guides](./docs/guides/README.md)
- [API](./docs/api/README.md)
- [Troubleshooting](./docs/troubleshooting/README.md)

## Community

The One App community can be found on
[GitHub Discussions](https://github.com/americanexpress/one-app/discussions), where you can ask
questions, voice ideas, and share your projects.

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github. Any Contributor to
any Open Source Project managed by the American Express Open Source Community must accept and sign
an Agreement indicating agreement to the terms below. Except for the rights granted in this
Agreement to American Express and to recipients of software distributed by American Express, You
reserve all right, title, and interest, if any, in and to Your Contributions. Please
[fill out the Agreement](https://cla-assistant.io/americanexpress/one-app).

Please see our [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🗝️ License

Any contributions made under this project will be governed by the
[Apache License 2.0](./LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md). By
participating, you are expected to honor these guidelines.
