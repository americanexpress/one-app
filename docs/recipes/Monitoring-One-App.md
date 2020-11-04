<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Monitoring One App

One App includes a metrics server which exposes a set of metrics using the [prom-client](https://github.com/siimon/prom-client)
which can be easily scraped by a service such as [Prometheus](https://prometheus.io/docs/introduction/overview/).
Metrics will be exposed on the port configured by the environment variable `HTTP_METRICS_PORT`.
They can collected from the `/metrics` path, for example `http://localhost:3005/metrics`.

> HTTP_METRICS_PORT defaults to `3005`.

One App makes the following metrics available:

- One App Version
- Circuit breaker, performance including open, close events,
- Module Map, updates, restarts and errors
- CPU
- Memory
- Garbage collection
- Eventloop lag


## Grafana

If you wish to use [Grafana](https://grafana.com/grafana/) the [one-app-classic](../../__performance__/grafana/dashboards/one-app-classic.json)
dashboard can provide you with a good starting point.

## Monitoring Locally

It possible to run Prometheus and Grafana against a locally running build of one-app.
While not an ideal performance indicator you could use it to gauge the impact your module might have.

Run the following inside of One App to start the performance monitoring locally:

`npm run monitor:performance`

> Performance monitoring will not run with one-app runner.

More details for running performance monitoring can be found in the [performance readme](../../__performance__/README.md)/


[☝️ Return To Top](#adding-styles)
