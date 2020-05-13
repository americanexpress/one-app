[👈 Return to Overview](../README.md)

# Module Map Schema

[**Holocron Modules**](../README.md#modules) may be developed and versioned in isolation as if they were their own frontend applications. The `one-app` Server relies on a `module-map.json` configuration file to orchestrate all these versioned web experiences together to form a single application. A Module Map contains an object of the following information:
* Holocron Module Name
* URLs to Holocron Module Bundles
* [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) Hash to verify contents of the Holocron Module Bundle

**Contents**
* [Shape](#shape)
* [Example](#example)
* [Field Annotations](#field-annotations)
  * [`clientCacheRevision` Field](#clientcacherevision-field)
  * [`[moduleName]` Field](#moduleName-field)
  * [`browser` Field](#browser-field)
  * [`legacyBrowser` Field](#legacyBrowser-field)
  * [`node` Field](#node-field)
  * [`url` Field](#url-field)
  * [`integrity` Field](#integrity-field)

## Shape

```js
({
  clientCacheRevision: String, // optional
  modules: {
    [moduleName]: { // required
      browser: {
        url: String, // required
        integrity: String, // SRI String required
      },
      legacyBrowser: {
        url: String, // required
        integrity: String, // SRI String required
      },
      node: {
        url: String, // required
        integrity: String, // SRI String required
      },
    },
    // ... more module entries allowed
  },
});
```

## Example
```json
{
  "clientCacheRevision": "<any-string>",
  "modules": {
    "cultured-frankie": {
      "browser": {
        "url": "https://one-app-statics.surge.sh/modules/f16a872/cultured-frankie/0.0.0/cultured-frankie.browser.js",
        "integrity": "sha256-CGgTIe7x19CK+Z7G7YAjwPMstd/gpWNd4FRce7csbNA= sha384-8QStyVD+275LwFA2Zlgyh3fnt5chqPMpJjD9Yn8AF1dybM297+lFid40gZ+JCBqY"
      },
      "legacyBrowser": {
        "url": "https://one-app-statics.surge.sh/modules/f16a872/cultured-frankie/0.0.0/cultured-frankie.legacy.browser.js",
        "integrity": "sha256-7xmKAgHKfrK4WVdRDW5i2NHauPd79NWa/XJ5yKiKhpo= sha384-MsQDrDBAK3KfG/svpk7C3wHy+Ht7G6D99NbjZjBcfxdhPbZFeIQgsBtKkCVXzR1P"
      },
      "node": {
        "url": "https://one-app-statics.surge.sh/modules/f16a872/cultured-frankie/0.0.0/cultured-frankie.node.js",
        "integrity": "sha256-fQT5PYOExfnv/b6tMAoWdp8lyJK1XPHloKfjNQUfySk= sha384-LhjPddGOg6KcGbs2IhVWvZRnyNrEasr01aVhOPXmwlTzg3n2QQqxJHdx93aucRby"
      }
    }
  }
}
```

## Field Annotations

### `clientCacheRevision` Field

This optional value is used to bust the client-side caching of Modules in the [Holocron Module Registry].

### `[moduleName]` Field

By convention, the `moduleName` is the key mapping where Holocron Module bundles are stored in the [Holocron Module Registry].

### `browser` Field

Includes an object of `url` and `integrity` pointing to the location of the modern `browser` bundle (e.g. last two major versions of currently used browsers) for a [Holocron Module].

### `legacyBrowser` Field

Includes an object of `url` and `integrity` pointing to the `legacyBrowser` bundle (e.g. more transpilation for older browsers like Internet Explorer) for a [Holocron Module].

### `node` Field

Includes an object of `url` and `integrity` pointing to the location of the `node` bundle (e.g. Serverside compatible) for a [Holocron Module].

### `url` Field

Contains a fully qualified `url` to a [Holocron Module] bundle location.

### `integrity` Field

Contains a hash [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) `integrity` string to validate the contents of a [Holocron Module] bundle.

**📘 More Information**
* Library: [One App Bundler](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler)
* CLI Command: [npm start](./Cli-Commands.md#start-usage)
* [Environment Variables](./Environment-Variables.md)
* [Development Tools](./Development-Tools.md)

[☝️ Return To Top](#module-map-schema)

[Holocron Module Registry]: https://github.com/americanexpress/holocron/blob/master/packages/holocron/docs/api/README.md#module-registry
[Holocron Module]: ../README.md#modules
