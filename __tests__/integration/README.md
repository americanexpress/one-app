# One App Integration Tests

The tests in this directory validate One App functionality against a
[sample production build of One App](../../prod-sample/README.md). They are considered end to end tests in that
they validate various functionality of One App by actually running a production build of One App with
sample modules that make use of the APIs that One App provides and using Selenium to launch One App in
a browser to test these sample modules.

## How To Run

To run tests against a [local instance of One App's production build](../../prod-sample/README.md) run
`npm run test:integration`.

Prior to the integration test execution a fresh build of the One App Docker image as well
as fresh builds of all the sample modules contained in `prod-sample/sample-modules` are created.
This ensures you are running against your source code in its current state and not a previously
built One App Docker image or sample module that may be out of sync with your source code.

If you are sure you have a pre-built One App Docker image that represents what you want to test then
you can use the `ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD` environment variable to opt out of
rebuilding the One App Docker image.

Similarly you can opt out of rebuilding sample modules by setting the
`ONE_DANGEROUSLY_SKIP_SAMPLE_MODULES_BUILD` environment variable.

These environment variables can be helpful when you are only making test changes and have already
generated the One App Docker image and/or sample modules during a previous integration test execution.
Otherwise the entire setup can take ~10 minutes.

These environment variables should **never** be set on a CI server and should be used with caution locally.

### Running the Tests Against A Deployed Instance of One App

In order to run the integration tests against a deployed instance of One App rather than a local One App
Docker setup you can run `npm run test:integration -- --remote-one-app-environment=https://[url-running-one-app-instance]`
where `--remote-one-app-environment` is provided with a domain where a One App instance is running.

Running tests against multiple targets is supported by passing multiple `--remote-one-app-environment` flags:

```bash
npm run test:integration -- --remote-one-app-environment=https://[url-running-one-app-instance] --remote-one-app-environment=https://[another-url-running-one-app-instance]
```

Make sure that all of the sample modules from the `prod-sample` directory are deployed to the environment(s)
you are wanting to run the tests against and that the root module environment variable
(`ONE_CLIENT_ROOT_MODULE_NAME`) is set to `frank-lloyd-root`. This is required since the tests
rely on those modules and the routes defined within them.

If you are behind a corporate proxy the `HTTPS_PROXY` environment variable can be used to provide a
proxy server for requests going to the provided deployed instance of One App
(`--remote-one-app-environment`) to go through.

To make it easier for you to deploy all the sample modules to a remote environment a script is provided
to build and bundle the modules and module map for you:

```bash
npm run build:sample-modules -- --archive-built-artifacts --bundle-statics-origin=https://cdn.example.com
```

This will produce a `sample-module-bundles` directory with all the sample modules and a module map.
The `bundle-statics-origin` allows you to specify the location the module bundles will be published
to so that the generated [module map](../../README.md#building-and-deploying-a-holocron-module-map)
has correct bundle URLs for the sample modules.

Your CI/CD process can publish the contents of that directory to your CDN of choice without it
having to know anything about the sample modules or how to build them.

## Test Structure

Within [one-app.spec.js](./one-app.spec.js) most tests are assumed to be able to run both within the local
Docker setup or on a remote environment. For tests that should only run within the local Docker setup
use the `Tests that can run against either local Docker setup or remote One App environments`
`describe` block.

## Adding or Modifying Sample Modules

If while writing a test you find yourself needing a new Module to validate a scenario, you can
add a module to the `sample-modules` directory, sorted into folders by
semantic version (e.g. `./sample-modules/some-module/0.0.0/`) inside `prod-sample`. Any module placed here will be built
before the integration tests run and included in the local One App Docker instance. For testing against
deployed instances of One App (i.e. using the `--remote-one-app-environment` argument) make sure
that all modules from `prod-sample` are deployed to your environment.

Similarly Modules inside the `sample-modules` directory can be modified.

## Watching Tests as They Run

It can be useful to watch what is happening in the browser as the tests execute in order to debug
issues with the tests. To do so the `selenium-chrome` Docker image provides
[a VNC server](https://en.wikipedia.org/wiki/Virtual_Network_Computing) that can be used to remotely
view the test execution as it runs inside the container:

In order to access it, you must use the [vnc](https://en.wikipedia.org/wiki/Virtual_Network_Computing)
server that is running on port `5901` as part of this setup:

On Mac OS, you can do so natively:

- In Finder, choose "Go" > "Connect to Server..."
- Enter `vnc://localhost:5901` for the server address
- Use password `secret` when prompted

Click connect and a window will appear where you should be able to see Chrome and all the actions
your tests are taking within it!
