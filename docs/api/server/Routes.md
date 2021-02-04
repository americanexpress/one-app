<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](../README.md)
<!--ONE-DOCS-HIDE end-->

# Server Routes

Useful `one-app` specific server routes:

* **GET** `/_/status`: Basic health check for the `one-app` server, always returns `200`.

* **POST** `/_/report/security/csp-violation`: Can be provided to the `report-uri` directive to have [CSP violations](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#Enabling_reporting) reported back to the `one-app` server. Do not hard code this,instead use the [ONE_CLIENT_CSP_REPORTING_URL](https://github.com/americanexpress/one-app/blob/main/docs/api/server/Environment-Variables.md#one_client_reporting_url) environment variable. While this is helpful during development we recommended that you report to another server to reduce load on the `one-app` server when running in production.

* **POST** `/_/report/errors`: Can be used to [report client errors](../../guides/Reporting-Client-Errors.md) to the `one-app` server.  Do not hard code this, instead use the [`ONE_CLIENT_REPORTING_URL`](https://github.com/americanexpress/one-app/blob/main/docs/api/server/Environment-Variables.md#one_client_reporting_url) environment variable. While this is helpful during development we recommended that you report to another server to reduce load on the `one-app` server when running in production.

