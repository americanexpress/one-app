<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Publishing Modules

## 📖 Table of Contents
* [Overview](#overview)
* [Creating a Module Map](#creating-a-module-map)
* [Update Module Map Script](#update-module-map-script)
* [Deploying to Vercel with GitHub Actions](#deploying-to-vercel-with-github-actions)
* [Updating the Content Security Policy](#updating-the-content-security-policy)

## Overview

Publishing Holocron modules consists on two steps:

1. Upload the contents of the `build` folder to your CDN of choice. This publishes your module's static assets similar to when you release an npm dependency.
2. Update the [module map](../api/server/Module-Map-Schema.md) to point to the newly published static assets. This will tell One App to consume that published/released module version.

In the following example, we will use Vercel to publish a holocron module and a manual script to deploy the module map.

### Creating a Module Map

If you don't have an existing module map, you can create a `module-map.json` file locally that looks something like this:

```json
{
  "modules": {

  }
}
```

Then, you can upload it to Vercel using the [Vercel CLI](https://vercel.com/docs/cli#commands/overview/basic-usage) by running `vercel` within the directory that you created the `module-map.json` in. You can now view it at the production URL that `vercel` prints out, you will need that URL for the following steps for the `moduleMapUrl` variable.

> Note: Your One App instance and all your module deployment jobs need to point at the same module map URL. One App requires that URL to be set in the [`HOLOCRON_MODULE_MAP_URL`](../api/server/Environment-Variables.md#holocron_module_map_url) environment variable.

### Update Module Map Script

You can place this script wherever you would like. However, the following step expects it to be in the `scripts/updateModuleMap.js` folder of your module. If you put it in a different location, make sure you update it in the following step.

> Note: The manual script presented below is just an example on how to update the module map by downloading your current module map, updating it to include the new deployed assets and re-uploading it, however, this approach doesn't handle concurrency.
There could be a case where two deployments running on different pipelines try to update the module map at the same time and a race condition might occur where the last deployment will override the contents of the first. If you want to avoid concurrency issues, we recommend to adopt
a "locking" mechanism as part of your CI to prevent the module map from being updated while another deployment is already in progress.

```javascript
const fs = require('fs-extra');
const fetch = require('node-fetch');
const { name, version } = require('../package.json');

// This is created during the build process within the deploy action
const bundleIntegrity = require('../bundle.integrity.manifest.json');

const moduleMapUrl = 'YOUR MODULE MAP URL'; // This is the module map URL you got in the previous step i.e. https://example-module-map.vercel.app

const STATIC_ASSETS_URL = 'URL TO WHERE YOUR MODULE IS DEPLOYED'; // example 'https://my-module.vercel.app'

const updateModuleMap = async () => {
  try {
    const response = await fetch(moduleMapUrl); // download the current module map

    const moduleMapContent = await response.json();
    const dir = 'module_map';

    moduleMapContent.modules[name] = {
      browser: {
        url: `${STATIC_ASSETS_URL}/${version}/${name}.browser.js`,
        integrity: bundleIntegrity.browser,
      },
      legacyBrowser: {
        url: `${STATIC_ASSETS_URL}/${version}/${name}.legacy.browser.js`,
        integrity: bundleIntegrity.legacyBrowser,
      },
      node: {
        url: `${STATIC_ASSETS_URL}/${version}/${name}.node.js`,
        integrity: bundleIntegrity.node,
      },
    };

    await fs.ensureDir(dir);
    // write the updated module map to a temporary folder
    // so it can be re-uploaded by the deploy action
    await fs.writeFile(
      './module_map/module-map.json', JSON.stringify(moduleMapContent, null, 2)
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

updateModuleMap().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
```
>Note: Vercel only allows you to upload a single folder per project, this means that every holocron module will have its own URL and project name. Other CDNs like Cloudfront / Amazon S3 allow you to upload multiple folders.
>In that case, you can adjust the script above to include module name as the folder that contains the static assets for each holocron module.

## Deploying to Vercel with GitHub Actions

[Vercel](https://vercel.com/home) allows you to publish statics assets such as your modules. We will accomplish this by using [GitHub Actions](https://github.com/features/actions).

This deploy action uses the `vercel-cli` so you will need a create [token with Vercel](https://vercel.com/account/tokens) and then add a new variable called `VERCEL_TOKEN` to the `Secrets` section of your repository on Github.

The below action runs whenever a release is created or a push to main occurs. You do not need to install or add `vercel-cli` to your `package.json` as the `vercel` command is available within GitHub actions.

Create a new `.github/workflows/deploy.yml` file in the root folder of your module

```yml
name: Deploy

on:
  release:
    types: [created]
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js 16.x
      uses: actions/setup-node@v1
      with:
        node-version: '16.x'
    - name: Cache NPM Dependencies
      uses: actions/cache@v1
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-
    - name: Install Dependencies
      run: npm install
      env:
        NODE_ENV: development
    - name: Build Module
      run: npm run build
      env:
        NODE_ENV: production
    - name: 'Deploy'
      run: vercel build --prod --confirm -t $VERCEL_TOKEN --name [YOUR REPO NAME]
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    - name: 'Update Module Map'
      run: |
        node ./scripts/updateModuleMap.js
        vercel module_map --prod --confirm -t $VERCEL_TOKEN --name [NAME OF YOUR MODULE MAP]
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```
> Note: It is very important to set your `NODE_ENV=production` before running the `npm run build` command so the code is bundled and minified for production.

The `deploy` stage on this action will publish the contents of the `build` folder to Vercel. The `Update Module Map` stage will run the script we created in `./scripts/updateModuleMap.js` and upload the updated module map placed in the temporary `module_map` folder to Vercel.

If you view the action running, during the `Deploy` step, you should see something like:

```bash
Run vercel build --prod --confirm -t $VERCEL_TOKEN --name [NAME OF YOUR MODULE]
Vercel CLI 20.1.0
The "--name" option is deprecated (https://vercel.link/name-flag)
- Setting up project
Linked to [YOUR NOW USERNAME]/[YOUR REPO NAME](created .vercel and added it to .gitignore)
Inspect: https://vercel.com/[YOUR NOW USERNAME]/[YOUR REPO NAME] [1s]
- Queued
- Building
Production: https://[YOUR REPO NAME].vercel.app [6s]
```

You can inspect the contents of your module map deployed to Vercel to verify that it contains the links to the deployed assets of your modules.

The running One App instance that points to your updated module map will automatically pull the newly deployed modules and update your application without the need for a server restart.

## Updating the Content Security Policy

One App enforces the [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) by default. You must add to the CSP the URL where your module's statics are loaded from, otherwise you will get a CSP violation and your modules will fail to load in Production.

For example, to add Vercel to the Content Security Policy, add the `*.vercel.app` domain to the `connectSrc` and `scriptSrc` directives in your Root Module's `appConfig.js` file under the csp section:
```javascript
export default contentSecurityPolicyBuilder({
  directives: {
    reportUri: process.env.ONE_CLIENT_CSP_REPORTING_URL,
    defaultSrc: [
      "'self'",
    ],
    scriptSrc: [
      "'self'",
      '*.vercel.app',
    ],
    imgSrc: [
      "'self'",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
    ],
    connectSrc: [
      "'self'",
      '*.vercel.app',
    ],
  },
});
```
For more information on how to configure One App and the CSP please refer to this section: [App Configuration](../api/modules/App-Configuration.md#csp)
