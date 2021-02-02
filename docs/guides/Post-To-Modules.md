<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# POST To Module Routes

To enable post set [`ONE_ENABLE_POST_TO_MODULE_ROUTES`](../api/server/Environment-Variables.md#ONE_ENABLE_POST_TO_MODULE_ROUTES) environment variable.
Request body must be either a JSON object or FormData of less than 15KB in size and is passed as props to your module.

Supported media types:
- `application/json`
- `application/x-www-form-urlencoded`


[☝️ Return To Top](#POST)
