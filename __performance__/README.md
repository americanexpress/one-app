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

> Smoke test is a regular load test, configured for minimal load. You want to run a smoke test as a sanity check every time you write a new script or modify an existing script. - [k6](https://k6.io/docs/test-types/smoke-testing)

TARGET_URL is used to set the absolute test path.

### Load

> Load Testing is primarily concerned with assessing the current performance of your system in terms of concurrent users or requests per second. - [k6](https://k6.io/docs/test-types/load-testing)

TARGET_URL is used to set the absolute test path.

### Soak

> Soak testing is concerned with reliability over a long time. [k6](https://k6.io/docs/test-types/soak-testing)

TARGET_URL is used to set the absolute test path.

### Stress

> The purpose of stress testing is to assess the availability and stability of the system under heavy load. - [k6](https://k6.io/docs/test-types/stress-testing)

`TARGET_BASE_URL` is used to set the base test path. It is recommended to only run this against test environments which use the `prod-sample` modules.

The following paths will be expected to be available:
- /success
- /healthy-frank
- /demo/ssr-frank
- /demo/ssr-frank
- /demo/needy-frank?api=https://fast.api.frank/posts
- /demo/needy-frank?api=https://slow.api.frank/posts

### Spike

> Spike test is a variation of a stress test, but it does not gradually increase the load, instead it spikes to extreme load over a very short window of time. While a stress test allows the SUT (System Under Test) to gradually scale up its infrastructure, a spike test does not. [k6](https://k6.io/docs/test-types/stress-testing#spike-testing)


`TARGET_BASE_URL` is used to set the base test path. It is recommended to only run this against test environments which use the `prod-sample` modules.

The following paths will be expected to be available:
- /success
- /healthy-frank
- /demo/ssr-frank
- /demo/ssr-frank
- /demo/needy-frank?api=https://fast.api.frank/posts
- /demo/needy-frank?api=https://slow.api.frank/posts


## Running against prod-sample

### Setup

From within the one-app directory first start the one-app prod-sample:

```bash
npm run start:prod-sample
```

> `npn run start:prod-sample` creates the `prod-sample_one-app-at-test-network` network which is required for the performance tools to start when running against prod-sample.

After prod-sample has successfully started you will need to start the performance test suite infrastructure in a new terminal window, navigate to `one-app/__performance__` and run the following:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod-sample.yml up --abort-on-container-exit influxdb grafana prometheus
```

You can now view the [Grafana metrics on localhost:3030](http://localhost:3030/d/tDGvrq7Mz/one-app-performance)

### Run the smoke test

In another new window from within `one-app/__performance__` run the following:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod-sample.yml run k6 run --insecure-skip-tls-verify /scripts/smoke.js
```

Each file under `__perforamance__/scripts` correlates to a different test:

Smoke - `/scripts/smoke.js`
Stress - `/scripts/stress.js`
Load - `/scripts/load.js`
Soak - `/scripts/soak.js`

To run a test other than the smoke test replace `/scripts/smoke.js` with the corresponding
file path outlined above.

Once the test has finished running you can use Grafana to share a snapshot

## Running against another one-app server

### Setup

If you want to run against a remote server you will need to update `targets` within  `__performance__/prometheus/targets.json` to point to where the one-app metrics are exposed. If you are running against a locally running version you should not need to change this.

```json
[
  {
    "targets": ["my-one-app-domain:3005"],
    "labels": {
      "group": "one-app-metrics"
    }
  }
]
```

Next you can start the performance test suite infrastructure, navigate to `one-app/__performance__` and run the following:

```bash
docker-compose up --abort-on-container-exit influxdb grafana prometheus
```

You can now view the [Grafana metrics on localhost:3030](http://localhost:3030/d/tDGvrq7Mz/one-app-performance)

### Run the smoke test

In another new window from within `one-app/__performance__` run the following:

```bash
docker-compose run -e TARGET_URL=http://host.docker.internal:3000/success k6 run /scripts/smoke.js
```

Replace the `TARGET_URL` value with your intended target domain.
Replace `/scripts/smoke.js` with your chosen performance test script.
For the spike and stress tests set `TARGET_BASE_URL` instead of `TARGET_URL`.