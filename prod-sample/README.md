# Sample One App Production Setup

As a recommended best practice, One App should fetch its module map, Holocron Modules,
and app statics from a separately hosted [Content Delivery Network (CDN)](https://en.wikipedia.org/wiki/Content_delivery_network)
server in production.

Contained in this directory is a sample setup you can run locally that mimics the ideal One App environment. The intent of this sample is to be used for [integration](../__tests__/integration/README.md) and performance tests as well as to aid in local development.

## Sample Architecture

The sample architecture is as follows:

One App → nginx (mimics a CDN server and hosts the module map, module bundles, and One App statics).

## Running Locally

> Note [Docker](https://docs.docker.com/install/) is required in order to run this sample
setup as [docker-compose](https://docs.docker.com/compose/) is internally used
to orchestrate the building and starting up of One App and the nginx server.

Running `npm run start:prod-sample` builds and starts a production One App Docker container that will use
the provided sample modules hosted from a local server acting as the CDN server.

In order to access it, you must use the [vnc](https://en.wikipedia.org/wiki/Virtual_Network_Computing)
server that is running on port `5901` as part of this setup:

On Mac OS, you can do so natively:

- In Finder, choose "Go" > "Connect to Server..."
- Enter `vnc://localhost:5901` for the server address
- Use password `secret` when prompted

Click connect and a window will appear with Google Chrome open. This is
where you can access One App at `https://one-app:8443`!

If you wish to run with node debug mode: `npm run start:prod-sample:debug`.

### Options

The entire setup invoked by `npm run start:prod-sample` can take ~10 minutes and is often unnecessary
if no changes have been made to the One App source code or the sample modules contained in
`prod-sample/sample-modules` since the last time `npm run start:prod-sample` was ran. For these cases
you can use the `ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD` and/or
`ONE_DANGEROUSLY_SKIP_SAMPLE_MODULES_BUILD` environment variables to opt out of
rebuilding the One App Docker image and/or sample modules respectively.

Use these environment variables with caution as they can result in you running a version of One App and/or
the sample modules that do not reflect your source code.

## Adding/Modifying Sample Modules

New sample Modules can be added to `./sample-modules/`, sorted into folders by
semantic version (e.g. `./sample-modules/some-module/0.0.0/`), so that next time
`npm run start:prod-sample` is ran, they will be built and served by the nginx
local CDN server.

Similarly, the source code to any
existing Modules inside the `sample-modules` directory can be modified to then be built
and bundled from source when `npm run start:prod-sample` is run.
