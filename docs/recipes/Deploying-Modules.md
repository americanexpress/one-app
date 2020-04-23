[👈 Return to Overview](./Recipes.md)

# Deploying Modules

## 📖 Table of Contents

* [Deploying to Now with GitHub Actions](#deploying-to-now-with-github-actions)
  * [Creating your Deploy Action](#creating-your-deploy-action)
* [Create and Update Your Module Map](#create-and-update-your-module-map)
  * [Creating a Module Map in Now.sh](#creating-a-module-map-in-nowsh)
  * [Create an Update Module Script](#create-an-update-module-script)
  * [Update your Deploy Action to Update your Module Map](#update-your-deploy-action-to-update-your-module-map)

## Deploying to Now with GitHub Actions

[Now.sh](https://zeit.co/home) allows you to deploy statics such as your modules. We will accomplish this by using [GitHub Actions](https://github.com/features/actions).

### Creating your Deploy Action

This deploy action uses Zeit's `now-cli` so you will need a create [token with Now](https://zeit.co/account/tokens). The below action runs whenever a release is created or a push to master occurs. You do not need to install or add `now-cli` to your `package.json` as the `now` command is available within GitHub actions, .

```yml
name: Deploy

on:
  release:
    types: [created]
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js 12.x
      uses: actions/setup-node@v1
      with:
        node-version: '12.x'
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
      run: now build --prod --confirm -t $NOW_TOKEN
      env:
        NOW_TOKEN: ${{ secrets.NOW_TOKEN }}
```

If you view the action running, during the `Deploy` step, you should see something like

```bash
Run now build --prod --confirm -t $NOW_TOKEN
Now CLI 17.1.1
- Setting up project
Linked to [YOUR NOW USERNAME]/[YOUR-REPO-NAME] (created .now and added it to .gitignore)
Inspect: https://zeit.co/[YOUR NOW USERNAME]/[YOUR-REPO-NAME]/
- Building
- Completing
Production: https://[YOUR-REPO-NAME].now.sh
https://[YOUR-REPO-NAME]-[HASH].now.sh
```

## Create and Update Your Module Map

You will now need to add the module you just deployed to your module map.

### Creating a Module Map in Now.sh

To create a module map in Now, you can create a module-map.json locally that looks something like this:

```json
{
  "modules": {

  }
}
```

You can deploy this by running the [now](https://zeit.co/docs/now-cli#commands/now/basic-usage) command within the directory that you created the `module-map.json` in. You can now view it at the production URL that `now` prints out, you will need that URL for the following steps for the `moduleMapUrl` variable.

### Create an Update Module Script

You can place this script wherever you would like. However, the following step expects it to be in `scripts/updateModuleMap.js`. If you put it in a different location, make sure you update it in the following step.

```javascript
const fs = require('fs-extra');
const fetch = require('node-fetch');
const { name, version } = require('../package.json');

// This is created during the build process within the deploy action
const bundleIntegrity = require('../bundle.integrity.manifest.json');

const moduleMapUrl = 'YOUR MODULE MAP URL'; // This is the module map URL you got in the previous step

const STATIC_ASSETS_URL = 'URL TO WHERE YOUR MODULE IS DEPLOYED'; // example 'https://my-module.now.sh'

const updateModuleMap = async () => {
  try {
    const response = await fetch(moduleMapUrl);

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
    await fs.writeFile(
      './module_map/module-map.json', JSON.stringify(moduleMapContent, null, 2)
    );
  } catch (error) {
    console.log(error);
  }
};

updateModuleMap().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});
```

### Update your Deploy Action to Update your Module Map

At the bottom of your deploy action, you will want to add the following:

```yml
 - name: 'Update Module Map'
      run: |
        node ./scripts/updateModuleMap.js
        now module_map --prod --confirm -t $NOW_TOKEN --name [NAME OF YOUR MODULE MAP]
      env:
        NOW_TOKEN: ${{ secrets.NOW_TOKEN }}
```
