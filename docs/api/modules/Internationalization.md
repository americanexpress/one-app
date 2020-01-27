[👈 Return to Overview](../API.md)

# Internationalization

To enable internationalization modules can contain a locale directory in the root of
the module. Messages for each locale should be stored in JSON files within
the locale directory with filenames using the BCP-47 formatted language tag
(e.g. en-US.json).

**Contents**
* [Locale Structure](#locale-structure)
  - * [Environment Specific Data](#environment-specific-data)
  - * [ONE_CLIENT_LOCALE_FILENAME](#`ONE_CLIENT_LOCALE_FILENAME`)
* [Loading Language Packs](#loading-language-packs)
  - * [`loadLanguagePack`](#`loadLanguagePack`)
  - * [`queryLanguagePack`](#`queryLanguagePack`)
  - * [`updateLocale`](#`updateLocale`)
  - * [`getLocalePack`](#`getLocalePack`)


## Locale Structure

Following the below structure will allow [one-app-locale-bundler](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-locale-bundler) to correctly
bundle your locale files.

Module Root:
```
module
└── locale
| └── en-US.json
| └── es-MX.json
|── src
|   └── index.js
└── package.json
```

This will result in:
```
build
└── 1.0.0
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    └── en-us
    |    ├── <moduleName>.json
    |    ├── integration.json
    |    └── qa.json
    └──es-MX
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

The language pack itself needs to be a flat JSON object and will not work with a nested structure.

Example `en-US.json`:
```JSON
{
  "loading": "Loading...",
  "welcome": "welcome to my module"
}
```

### Environment Specific Data

[one-app-locale-bundler](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-locale-bundler) also allows your module to provide environment
specific data. Currently One App supports three different environments;
production, qa and integration (development).

Below is an example of how you could include link specific data.

Module Root:
```
module
└── locale
| └── en-US
|     └── links
|     |   └── production.json
|     |   └── qa.json
|     |   └── integration.json
|     └── copy.json
| └── es-MX.json
|── src
|   └── index.js
└── package.json
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
    └── en-us
    |    ├── <moduleName>.json
    |    ├── integration.json
    |    └── qa.json
    └──es-MX
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
determine which language pack will be loaded. `ONE_CLIENT_LOCALE_FILENAME`
must be one of `integration`, `qa`, or be `undefined` (for production).

By default the it will be `undefined` unless `NODE_ENV === 'development'`
which will result it in being set to `integration`

Example:
```bash
ONE_CLIENT_LOCALE_FILENAME=integration
```

## Loading Language Packs

One App uses [one-app-ducks intl duck](https://github.com/americanexpress/one-app-ducks#intl-duck) to manage
the loading of each modules language pack.

### Action Creators

#### `loadLanguagePack`

Used for fetching a module's language pack.

Please see one-app-ducks [loadLanguagePack](https://github.com/americanexpress/one-app-ducks#loadlanguagepack) for information.

#### `queryLanguagePack`

The [Iguazu](https://github.com/americanexpress/iguazu) equivalent of [`loadLanguagePack`](#loadlanguagepack).

Please see one-app-ducks [queryLanguagePack](https://github.com/americanexpress/one-app-ducks#querylanguagepack) for information.

#### `updateLocale`

Used to set the active locale for One App.

Please see one-app-ducks [updateLocale](https://github.com/americanexpress/one-app-ducks#updatelocale) for information.

#### `getLocalePack`

Loads the locale of the requested country closest to the active locale. Used directly by One App.

Please see one-app-ducks [getLocalePack](https://github.com/americanexpress/one-app-ducks#getlocalepack) for information.


**📘 More Information**
* Language packs compatible with [`react-intl`](https://github.com/formatjs/react-intl),
* See Cultured Frankie for an example [`CulturedFrankie`](../../../prod-sample/sample-modules/cultured-frankie/0.0.0/src/components/CulturedFrankie.jsx),


[☝️ Return To Top](#internationalization)