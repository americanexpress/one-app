[👈 Return to Overview](./Recipes.md)

# Code Splitting Using Holocron

> To view a working sample of code splitting in One App, check out the sample module [Franks Burgers](../../prod-sample/sample-modules/franks-burgers/0.0.0/README.md)

One App uses `one-app-bundler` to support dynamic importing and code splitting, out of the box.
`one-app-bundler` uses `webpack` and `babel` (with `@babel/plugin-syntax-dynamic-import`) under
the hood to understand the `import()` syntax and automatically split your module where ever
the `import()` statement is used within your module. Let's go through a quick example to get
a better grasp of code splitting.

Let's start with a sample Holocron module project:

```
root
|── locale
|   └── en-US.json
|── src
|   ├── chunk.js
|   └── index.js
└── package.json
```

and import our chunk using the dynamic `import()` syntax like so:

`src/index.js`
```jsx
import React from 'react';

export default function MyModule() {
  const [Component, setComponent] = React.useState(null);

  React.useEffect(() => {
    import(/* webpackChunkName: "<chunkName>" */ './chunk')
      // the multi-line comment /* webpackChunkName: "..." */ is used by webpack to name your chunk
      .then((importedChunk) => importedChunk.default || importedChunk)
      // when we convert ES modules to common/supported formats,
      // we might need to interop the `default` property to get the export
      .then((chunk) => {
        // ... do things with the chunk once we have what we want
        setComponent(chunk);
      });
  }, []);

  // ...

  if (Component) return <Component />;

  return null;
}
```

Once we run `bundle-module` from `one-app-bundler`, our output in `build/<version>` will
contain additional JavaScript files based on the number of chunks we have dynamically
split from our module.

```
build
└── 1.0.0
    ├── <chunkName>.<moduleName>.chunk.browser.js
    ├── <chunkName>.<moduleName>.chunk.legacy.browser.js
    ├── <moduleName>.browser.js
    ├── <moduleName>.legacy.browser.js
    ├── <moduleName>.node.js
    └── en-us
        ├── <moduleName>.json
        ├── integration.json
        └── qa.json
```

We can expect the final bundled module output to contain everything it nornally does,
with two additional JavaScript files per chunk (modern `browser` and `legacy.rowser` versions).

For the `node` build output, all the dynamic imports have been imported, bundled and treated
as a `webpack_require` call.

[☝️ Return To Top](#code-splitting-using-holocron)