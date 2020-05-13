[👈 Return to Overview](./README.md)

# Running Existing App Locally

If you are already on your way to building your application using One App or have an already built
application with One App then you can either serve your local modules to One App or have One App
point to a remote module map it can use to fetch modules:

To serve modules to One App:

```bash
npm run serve-module <path/to/your/module> <path/to/another/module>
```

Once you have your modules served to One App you can start One App.

By default when starting One App only your locally served modules will be used. If you have a remote
module map you would like to have One App load use the `module-map-url` flag. Keep in mind that One
App will combine your locally served modules with the remote module map. Locally served modules will
override modules with the same name in the remote module map.

```bash
NODE_ENV=development npm start -- --module-map-url=<your-remote-module-map-url> --root-module-name=<your-root-module-name>
```

## Useful Local Development Commands / Options

The `drop-module` command allows you to stop serving a module:

```bash
$ npm run drop-module <module-name>
```

The `log-format` option allows you to specify how you would like One App logs presented to you:

```bash
# available formats are `friendly`, `verbose`, and `machine`. Default is `friendly`
NODE_ENV=development npm start -- --log-format=friendly
```

The `log-level` option allows you to specify the lowest level of logs you would like One App to
present to you:

```bash
# available formats are `error`, `warn`, `log`, `info`. Default is `log`
NODE_ENV=development npm start -- --log-level=warn
```

[☝️ Return To Top](#running-existing-app-locally)