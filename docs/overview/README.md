<!--ONE-DOCS-HIDE start-->
[👈 Return to README](../README.md)
<!--ONE-DOCS-HIDE end-->

# Welcome to One App

As applications start to scale, and you start adding more developers to the project and new teams are created, it becomes increasingly difficult to release with confidence and to effectively collaborate without requiring large amounts of coordination and communication between teams.

One App helps solve this problem by providing a framework to build quality, modularized web applications. It helps you break the "Frontend Monolith" and split your application via independently developed, tested, and deployed **Micro Frontends** in the form of **Holocron Modules**.

# Benefits

The benefits to using One App include:

- **Micro Frontends:** Powered by Holocron, One App allows for code splitting via independently developed, tested, and deployed Modules.
- **Decoupled Codebases:** The modular approach helps reducing large and overwhelming codebases allowing developers to understand the code better. This also avoids accidental coupling by setting specific boundaries.
- **Security:** Configurable security settings, all pages are protected by a content security policy and all modules are loaded with sub-resource integrity.
- **Flexibility:** An omnichannel solution to UI. Whether you're rendering your pages server-side or client-side; delivering modules as a service to web email or phone/IoT clients. One App covers this for you.
- **Scalability:** Wrapped within an application that scales across 1,000's of engineers and multiple units of an enterprise website.
- **Reusability:** Modules built as independent user experiences can be easily reused by multiple applications.


# Architectural Overview

The One App ecosystem draws a clear line between the App and React components that make up the user interface. It allows for the React component tree to be split up into modular pieces so that they can be developed and deployed independently. We refer to these modular pieces as… **Modules**. It is an overloaded term, but we wanted to really drive home the point that when thinking about how to design your Modules, they should be as independent and self-contained as possible.

## How does it work?

One App is the Node.js server that acts as the orchestrator and stitches all your modules together as well as Server-Side Render your application. One App is also responsible for setting up the global redux store with middleware and reducers that all Modules will have access to, and kicking off the rendering of these Modules.

[Holocron](https://one-amex-docs.americanexpress.com/en-us/holocron/api/) is the integral library that enables One App and Modules to be separate during development and come back together during production.

Holocron maintains an in-memory registry of Modules that can be updated dynamically without requiring a server restart. The idea is that an application can update Holocron’s module registry whenever a new Holocron Module is to be added to the application’s runtime. The end result is an application that can have **React components updated/added to it at runtime**.

## In Production

Holocron modules are bundled and their static assets deployed to a CDN. The One App Server instance polls the module map periodically for updates to the module versions as well as new modules recently deployed.

The module map is a simple JSON file that contains the list of Holocron modules, their versions, and a link to their CDN location. Think of this file as your `package.json`, but instead of a list of dependencies, we have a list of modules.

Modules can be deployed to any location and they don’t even have to be on the same CDN.

<h1 align="center">
  <img src='https://raw.githubusercontent.com/americanexpress/one-app/main/docs/overview/images/oneapp-production.jpg' alt="One App - Production Diagram" />
</h1>

## In Development

Modules are served locally by adding them to the modules array in our `package.json`.

The `npm start` command uses Docker to download and start the One App Server locally; It will also start a CDN server that will host and serve our development module map and local modules.

By Passing the `moduleMapUrl` option in the runner section of `package.json`, the One App Server can download remote modules and serve them alongside the ones you are currently developing on your machine.

> Note: You can also serve modules without Docker by [cloning and starting the One App server locally](https://github.com/americanexpress/one-app#clone-and-install-one-app).

<h1 align="center">
  <img src='https://raw.githubusercontent.com/americanexpress/one-app/main/docs/overview/images/one-app-dev.jpg' alt="One App - Development Diagram" />
</h1>
