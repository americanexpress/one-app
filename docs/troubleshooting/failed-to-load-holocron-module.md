# Failed to Load Holocron Module

#### Why This Error Occurred

When serving your modules locally, `one-app-runner` was unable to find the `node.js` file.

```bash
log: Failed to load Holocron module (http://localhost:3001/static/modules/[module-name]/[module-version]/[module-name].node.js)
```

#### Possible Ways to Fix It

Make sure that you run `npm run build` or `npm run watch:build` before including it into the `one-amex` section of your module's `package.json`. After you have built the module, restart `one-app-runner`.
