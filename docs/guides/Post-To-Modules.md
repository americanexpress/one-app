<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# POST To Module Routes

To enable post set [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#ONE_ENABLE_POST_TO_MODULE_ROUTES) environment variable.
Request body must be either a JSON object or FormData of less than 15KB in size and will be passed via the request object to the `buildInitialState` method.

Supported media types:
- `application/json`
- `application/x-www-form-urlencoded`


[☝️ Return To Top](#POST)
