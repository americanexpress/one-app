<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Developing with One App Runner

[one-app-runner](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner) allows you to work locally on your Holocron Module without having to clone the One App Server.

It works by pulling a Docker image for One App and mounting your module to it as a volume.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) Installed and running on your machine.

Modules created with the [One App Module Generator](https://github.com/americanexpress/one-app-cli/tree/main/packages/generator-one-app-module), will include `@americanexpress/one-app-runner` as a `devDependency` and the basic scripts required for One App Runner to work. You can create a new module using the following command:

```bash
export NODE_ENV=development
npx -p yo -p @americanexpress/generator-one-app-module -- yo @americanexpress/one-app-module
```

## Minimum Required Configuration:

The `dockerImage` and `rootModuleName` options are required for One App Runner to start.

`package.json`

```json
"one-amex": {
  "runner": {
    "modules": ["."],
    "rootModuleName": "frank-lloyd-root",
    "dockerImage": "oneamex/one-app-dev:5.x.x",
  }
}
```
Additionally, your **Root Module** needs to be loaded by either adding it to the [`modules`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner#modules-optional) array, or loading it from a remote module map using the [`moduleMapUrl`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner#module-map-url) option.

## Serving other Modules

One App Runner allows you to load other modules as well as your entire application locally by passing the [`moduleMapUrl`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner#module-map-url) option to point to your [deployed module map](../guides/Running-In-Production.md#building-and-deploying-a-holocron-module-map).

If you haven't deployed any modules to a CDN yet or you want to load additional modules locally, you can use the [`modules array`](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-runner#modules-optional) option to add the relative paths of modules that you wish to load from your machine.
```json
"one-amex": {
  "runner": {
    "modules": [
      ".",
      "../frank-lloyd-root"
    ],
    "rootModuleName": "frank-lloyd-root",
    "moduleMapUrl": "https://example.com/cdn/module-map.json",
    "dockerImage": "oneamex/one-app-dev:5.x.x",
  }
}
```
> Note: If both the `moduleMapUrl` and the `modules` options are set, One App Runner will combine and serve local and remote modules. Local modules will take precedence over remote ones.


## Start One App Runner

Use the `npm start` command to start `one-app-runner`. If this is the first time running this command, it might take a couple of minutes to download the One App Docker Image.

Once `one-app-runner` has started and you can see the module map poll message on your terminal, you application will be available on [http://localhost:3000/](http://localhost:3000/).

Open another terminal window, `run npm run watch:build` in your module's directory and make some edits to the module. One App will pick up these changes and update the module bundles accordingly. When you reload your browser window, One App will be displaying your updated module.

## Making API Calls to Localhost

While developing with One App Runner, during Server Side Rendering `localhost` will not be available from inside the docker container that is running One App. If you wish to call APIs running on `localhost` on your machine, you can either:

- Use `docker.host.internal` instead of `localhost` to contact your API i.e., `http://host.docker.internal:8080`).
- Use your machine's internal IP address to connect to your API running locally i.e, `http://192.168.0.100:8080`. If you are using the IP address for client side calls, you also need to add it to the [Content Security Policy](https://github.com/americanexpress/one-app/blob/main/docs/api/modules/App-Configuration.md#csp) configuration of your root module.

## Troubleshooting

If you receive the following error message when running `npm start`

```bash
   Bind for 0.0.0.0:3005 failed: port is already allocated
```
One App Runner could be already started in the background, run `docker kill $(docker ps -q)` to kill all running docker containers or `docker ps` and then `docker kill <containerId>`.

[☝️ Return To Top](#developing-with-one-app-runner)
