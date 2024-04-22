# One App Performance testing

The One App performance test suite can be used to run some basic performance tests against
the [prod-sample](../prod-sample/readme.md) or a chosen one-app server.

## Used Tools

* [k6](https://k6.io/docs/) - Runs the performance test scripts contained in `__performance__/scripts`
* [influxdb](https://www.influxdata.com/products/influxdb-overview/) - Time series database used to report k6 metrics
* [prometheus](https://prometheus.io/docs/introduction/overview/) - Monitoring toolkit, scrapes metrics exposed by one-app
* [Grafana](https://grafana.com/docs/grafana/latest/) - Visualization and analytics software used to monitor the performance tests, visualizes metrics from influxdb and prometheus.

## Available Tests

Each type of performance test has a single corresponding file, sharing the same name, which is used by k6 to run the test.

### Smoke

```sh
npm run perf -- test --type=smoke
```

> Smoke test is a regular load test, configured for minimal load. You want to run a smoke test as a sanity check every time you write a new script or modify an existing script. - [k6](https://k6.io/docs/test-types/smoke-testing)

`--target` is used to set the absolute test path.

### Load

```sh
npm run perf -- test --type=load
```

> Load Testing is primarily concerned with assessing the current performance of your system in terms of concurrent users or requests per second. - [k6](https://k6.io/docs/test-types/load-testing)

`--target` is used to set the absolute test path.

### Soak

```sh
npm run perf -- test --type=soak
```

> Soak testing is concerned with reliability over a long time. [k6](https://k6.io/docs/test-types/soak-testing)

`--target` is used to set the absolute test path.

### Stress

```sh
npm run perf -- test --type=stress
```

> The purpose of stress testing is to assess the availability and stability of the system under heavy load. - [k6](https://k6.io/docs/test-types/stress-testing)

`--target` is used to set the base test path. It is recommended to only run this against test environments which use the `prod-sample` modules.

The following paths will be expected to be available:

* /success
* /healthy-frank
* /demo/ssr-frank
* /demo/ssr-frank
* /demo/needy-frank?api=<https://fast.api.frank/posts>
* /demo/needy-frank?api=<https://slow.api.frank/posts>

### Spike

```sh
npm run perf -- test --type=spike
```

> Spike test is a variation of a stress test, but it does not gradually increase the load, instead it spikes to extreme load over a very short window of time. While a stress test allows the SUT (System Under Test) to gradually scale up its infrastructure, a spike test does not. [k6](https://k6.io/docs/test-types/stress-testing#spike-testing)

`--target` is used to set the base test path. It is recommended to only run this against test environments which use the `prod-sample` modules.

The following paths will be expected to be available:

* /success
* /healthy-frank
* /demo/ssr-frank
* /demo/ssr-frank
* /demo/needy-frank?api=<https://fast.api.frank/posts>
* /demo/needy-frank?api=<https://slow.api.frank/posts>

## Running against prod-sample

### Setup

From within the one-app directory first start the one-app prod-sample:

```bash
npm run start:prod-sample
```

Wait for `🌎 One App server listening on port 8443` to appear in the logs to indicate the one-app server has successfully started.

> `npm run start:prod-sample` creates the `prod-sample_one-app-at-test-network` network which is required for the performance tools to start when running against prod-sample.

After prod-sample has successfully started you will need to start the performance test suite infrastructure in a new terminal window, navigate to `one-app` and run the following:

```bash
npm run perf -- monitor
```

You can now view the [Grafana metrics on localhost:3030](http://localhost:3030/d/tDGvrq7Mz/one-app-performance)

> `npm run perf -- monitor` will also allow you to monitor the development build of one-app.

### Run the smoke test

In another new window run the following:

```bash
npm run perf -- test --type=smoke
```

Each file under `__performance__/scripts` correlates to a different test:

Smoke - `/scripts/smoke.js`
Stress - `/scripts/stress.js`
Load - `/scripts/load.js`
Soak - `/scripts/soak.js`

To run a test other than the smoke test replace `smoke` with the corresponding
desired type outlined above.

Once the test has finished running you can use Grafana to share a snapshot

## Running against another one-app server

### Setup

If you want to run against a remote server you will need to include the target host when running monitoring services.

```bash
npm run perf -- monitor --target=my-one-app-domain:3005
```

You can now view the [Grafana metrics on localhost:3030](http://localhost:3030/d/tDGvrq7Mz/one-app-performance)

### Run the smoke test

In another new window from within `one-app/__performance__` run the following:

```bash
npm run perf -- test --type=smoke --target=http://my-one-app-domain/success
```

Replace the `--target` value with your intended target URL.
Replace `smoke` with your chosen performance test script.
