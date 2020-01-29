[👈 Return to Overview](./Recipes.md)

# Mocking your API calls for Local Development

<!-- TODO: expand on this section -->

The `set-middleware` command links your module's custom dev middleware file to One App:

```bash
$ npm run set-middleware ../[module-name]/dev.middleware.js
```

This allows you to use your [Parrot](https://github.com/americanexpress/parrot) mocks when developing your module with One App.

The `set-dev-endpoints` command links your module's dev endpoints file to One App.

A `dev.endpoints.js` file contains all the information One App needs to configure [one-app-dev-proxy](https://github.com/americanexpress/one-app-dev-proxy)
(our reverse proxy and mocking server that runs during development) and can be used to set remote endpoints
for your Module to use during local development.

```bash
$ npm run set-dev-endpoints ../[module-name]/dev.endpoints.js
```

A `dev.endpoints.js` file looks like:

```js
module.exports = () => [
  {
    envVarName: 'ONE_CLIENT_APP_API_URL',
    oneAppDevProxyPath: 'api',
    destination: 'https://api.com',
  },
];
```

[☝️ Return To Top](#mocking-your-api-calls-for-local-development)