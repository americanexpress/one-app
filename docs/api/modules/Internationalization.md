[👈 Return to Overview](../README.md)

# Internationalization

To enable internationalization modules can contain a locale directory in the root of
the module. Messages for each locale should be stored in JSON files within
the locale directory with filenames using the [BCP-47](https://tools.ietf.org/html/bcp47) formatted language tag
(e.g. en-US.json).

**Contents**
* [Locale Structure](#locale-structure)
  * [Environment Specific Data](#environment-specific-data)
  * [ONE_CLIENT_LOCALE_FILENAME](#ONE_CLIENT_LOCALE_FILENAME)
* [Loading Language Packs](#loading-language-packs)
  * [`loadLanguagePack`](#loadLanguagePack)
  * [`queryLanguagePack`](#queryLanguagePack)
  * [`updateLocale`](#updateLocale)
  * [`getLocalePack`](#getLocalePack)


## Locale Structure

Following the below structure will allow [`one-app-locale-bundler`](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-locale-bundler) to correctly
bundle your locale files.

Module Root:
```
module
├── README.md
├── locale
|   ├── en-US.json
|   └── es-MX.json
├── package.json
└── src
    └── index.js
```

This will result in:
```
build
└── 1.0.0
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    ├── en-us
    |   ├── <moduleName>.json
    |   ├── integration.json
    |   └── qa.json
    └── es-mx
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

> 💬 For use with [React Intl](https://github.com/formatjs/react-intl) the language pack needs
> to be a flat JSON object and will not work with a nested structure.

Example `en-US.json`:
```JSON
{
  "loading": "Loading...",
  "welcome": "welcome to my module"
}
```

### Environment Specific Data

[`one-app-locale-bundler`](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-locale-bundler) also allows your module to provide environment
specific data. Currently One App supports three different environments;
production, qa and integration (development).

The directory name is what defines the key the data goes under,
below is an example of how you could include "link" specific data.


Module Root:
```
module
├── README.md
├── locale
|   ├── en-US
|   |   ├── links
|   |   |   └── production.json
|   |   |   └── qa.json
|   |   |   └── integration.json
|   |   └── copy.json
|   └── es-mx
|       ├── links
|       |   └── production.json
|       |   └── qa.json
|       |   └── integration.json
|       └── copy.json
├── package.json
└── src
    └── index.js
```

Example `en-US/copy.json`:
```JSON
{
  "loading": "Loading...",
  "welcome": "welcome to my module"
}
```

Example `en-US/links/production.json`:
```JSON
{
  "example": "https://example.com/en-us/home"
}
```

Example `en-US/links/qa.json`:
```JSON
{
  "example": "https://qa.example.com/en-us/home"
}
```

Example `en-US/links/integration.json`:
```JSON
{
  "example": "localhost:8080/en-us/home"
}
```

This will result in:
```
build
└── 1.0.0
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    ├── en-us
    |   ├── <moduleName>.json
    |   ├── integration.json
    |   └── qa.json
    └── es-mx
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

Example `en-US/qa.json`:
```JSON
{
  "loading": "Loading...",
  "welcome": "welcome to my module",
  "links": {
    "example": "https://qa.example.com/en-us/home"
  }
}
```

### `ONE_CLIENT_LOCALE_FILENAME`

One App uses the environment variable `ONE_CLIENT_LOCALE_FILENAME` to
determine which language pack will be loaded *if using the environment
specific language pack feature as described in the previous section*.
`ONE_CLIENT_LOCALE_FILENAME` must be one of `integration`, `qa`, or
be `undefined` (for production).

By default, `ONE_CLIENT_LOCALE_FILENAME` will be `undefined` unless `NODE_ENV === 'development'`
which will result it in being set to `integration`.

Example:
```bash
ONE_CLIENT_LOCALE_FILENAME=integration
```

## Managing Language Pack data

One App uses the [`one-app-ducks` intl duck](https://github.com/americanexpress/one-app-ducks#intl-duck)
to manage the loading of each module's language pack.

### Reducer

Please see the documentation on [Shared Ducks](./state-management.md#intl-duck) for information on how One App makes use of One App Duck's Intl Duck.

### Action Creators

#### `loadLanguagePack`

Used for fetching a module's language pack.

Please see One App Duck's [`loadLanguagePack`](https://github.com/americanexpress/one-app-ducks#loadlanguagepack) for information.

#### `queryLanguagePack`

The [Iguazu](https://github.com/americanexpress/iguazu) equivalent of [`loadLanguagePack`](#loadlanguagepack).

Please see One App Duck's [`queryLanguagePack`](https://github.com/americanexpress/one-app-ducks#querylanguagepack) for information.

#### `updateLocale`

Used to set the active locale for One App.

Please see One App Duck's [`updateLocale`](https://github.com/americanexpress/one-app-ducks#updatelocale) for information.

#### `getLocalePack`

Loads the locale of the requested country closest to the active locale. Used directly by One App.

Please see One App Duck's [`getLocalePack`](https://github.com/americanexpress/one-app-ducks#getlocalepack) for information.


**📘 More Information**
* To see an example of using [`react-intl`](https://github.com/formatjs/react-intl) within a module, see [`CulturedFrankie`](../../../prod-sample/sample-modules/cultured-frankie/0.0.0/src/components/CulturedFrankie.jsx),


[☝️ Return To Top](#internationalization)
