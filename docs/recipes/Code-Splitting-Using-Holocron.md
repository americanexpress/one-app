[holocron-readme]: https://github.com/americanexpress/holocron/tree/master/packages/holocron/README.md
[holocron-module-route-readme]: https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route/README.md
[one-app-bundler-readme]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler/README.md
[one-app-router-readme]: https://github.com/americanexpress/one-app-router/README.md
[frank-lloyd-root]: ../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/README.md
[franks-burgers]: ../../prod-sample/sample-modules/franks-burgers/0.0.0/README.md

[👈 Return to Overview](./Recipes.md)

# Code Splitting Using Holocron

For One App, Holocron modules are a formal way of code-splitting for a modern,
micro front-end in the One App ecosystem. Utilizing the module map as a system
which promotes synergy and asynchrony across teams and collaborators on
a single application.

With Holocron each individual module is by definition, a code split bundled
component with language packs that can be combined and composed based on our
needs. Each module is versioned, configurable, routable and can be further
split into smaller chunks using dynamic importing.

Like `@loadable/component` and `react-loadable`, `holocron` is a complete code-splitting
solution that works in both client and server side, however there is no need to scaffold
a build infrastructure to support code-splitting when we use `one-app-bundler`.

**[Read the `holocron` documentation.][holocron-readme]**

**[Read the `one-app-bundler` documentation.][one-app-bundler-readme]**

## Route based code splitting

> To view a root Holocron module with a childConfig, [check out the sample module "Frank Lloyd Root"][frank-lloyd-root]

A Holocron module can be route-driven using `ModuleRoute` and we can use this component
to shape our routing for One App. Since each Holocron module is an independent bundle,
our `childRoutes` is a map of code-split modules that is driven by the url. `ModuleRoute`
extends `Route` from `one-app-router` and can render the module(s) by its route per
`history`.

**[Read mode about `holocron-module-route`][holocron-module-route-readme]**

**[Read mode about `one-app-router`][holocron-module-route-readme]**

Our code split Holocron modules are now loaded based on routing to the application.

`src/childRoutes.jsx`
```jsx
import React from 'react';
import { ModuleRoute } from 'holocron-module-route';

export const childRoutes = () => (
  <ModuleRoute
    path="home"
    moduleName="holocron-reactor"
    onEnter={(nextState, replace, callback) => {
      // ... do something on enter
      callback();
    }}
  />
);
```

or can be an elaborate route configuration:

```jsx
import React from 'react';
import { RenderModule } from 'holocron';
import { ModuleRoute } from 'holocron-module-route';

export const childRoutes = () => (
  <ModuleRoute moduleName="holocron-reactor">
    <ModuleRoute moduleName="holocron-reactor-hud" />
    <ModuleRoute moduleName="holocron-reactor-beam" />
    <ModuleRoute moduleName="holocron-reactor-engine">
      <ModuleRoute moduleName="holocron-reactor-core" />
    </ModuleRoute>
  </ModuleRoute>
);
```

## Holocron module chunks _via_ `import()`

> To view a module chunks example using dynamic importing, [check out the sample module "Franks Burgers"][franks-burgers]

With a Holocron module, we use code-splitting to add granularity to our modules and create chunks
defined by user-driven actions or incorporate lazy loading for larger parts of our module.
Let's start with a sample Holocron module project:

```
root
|── locale
|   └── en-US.json
|── src
|   ├── Module.jsx
|   ├── Chunk.jsx
|   └── index.js
└── package.json
```

`src/Module.jsx`
```jsx
import React from 'react';

export default function MyHolocronModule() {
  const [Component, setComponent] = React.useState(null);

  React.useEffect(() => {
    import(/* webpackChunkName: "<chunkName>" */ './Chunk')
      // the multi-line comment /* webpackChunkName: "..." */ is used by webpack to name your chunk
      .then((importedChunk) => importedChunk.default || importedChunk)
      // when we convert ES modules to common/supported formats,
      // we might need to interop the `default` property to get the export
      .then((chunk) => {
        // ... do things with the chunk once we have what we want
        setComponent(chunk);
      });
  }, []);

  if (Component) return <Component />;

  return null;
}
```

`src/Chunk.jsx`
```jsx
import React from 'react';

export default function ModuleChunk() {
  return <p>My Holocron Module Chunk</p>;
}
```

`src/index.js`
```jsx
import HolocronModule from './Module';

export default HolocronModule;
```

In our basic example, if we wanted to use `Chunk.jsx` as a Holocron module chunk, we can use
the supported `import()` syntax to divide up our module bundle into logical chunks and name
our chunk using the _magic comments_ `/* webpackChunkName: "..." */`:

```js
// compared to traditional imports, which adds to the main bundle
import './Chunk';

import(/* webpackChunkName: "<chunkName>" */ './Chunk');
```

Our _chunk_ can be anything from a component to a `node_modules` package. Once we run
`bundle-module` from `one-app-bundler`, our output in `build/<version>` will contain
additional JavaScript files based on the number of chunks we have dynamically split
from our module.

```
root
└── build
    └── 1.0.0
        ├── <chunkName>.<moduleName>.chunk.browser.js
        ├── vendors~<chunkName>.<moduleName>.chunk.browser.js
        ├── <chunkName>.<moduleName>.chunk.legacy.browser.js
        ├── <moduleName>.browser.js
        ├── <moduleName>.legacy.browser.js
        ├── <moduleName>.node.js
        └── en-us
            ├── <moduleName>.json
            ├── integration.json
            └── qa.json
```

### Using **`holocronModule`**

`src/Module.jsx`
```jsx
import React from 'react';
import { holocronModule } from 'holocron';

let Chunk = () => <p>Loading...</p>;

export function MyHolocronModule() {
  return <Chunk />;
}

export default holocronModule({
  name: 'holocron-module',
  load: () => () => Promise.all([
    import(/* webpackChunkName: '<chunkName>' */ './Chunk')
      .then((imported) => imported.default || imported)
      .then((Component) => {
        Chunk = Component;
      })
      .catch((error) => {
        Chunk = () => <p>{error.message}</p>;
      }),
    //  ... load language packs, etc
  ]),
  options: { ssr: true },
})(MyHolocronModule);
```
### Using `Suspense` and `lazy`

> server side rendering is not compatible with Suspense & lazy

`src/Module.jsx`
```jsx
import React from 'react';

const Chunk = React.lazy(() => import(/* webpackChunkName: "<chunkName>" */ './Chunk')
  .then((importedChunk) => importedChunk.default || importedChunk));

export default function MyHolocronModule() {
  return (
    <React.Suspense fallback={<p>Loading...</p>}>
      <Chunk />
    </React.Suspense>
  );
}
```

### How it works

One App uses [`one-app-bundler`][one-app-bundler-readme] to support dynamic importing and code
plitting on the module level. Out of the box, [`one-app-bundler`][one-app-bundler-readme] uses
`webpack` and `babel` (with `@babel/plugin-syntax-dynamic-import`) under the hood to understand
the `import()` syntax and automatically split your module where ever the `import() ` statement
is used within your module.

We can expect the final bundled module output to contain everything it nornally does,
with two additional JavaScript files per chunk (modern `browser` and `legacy.rowser` versions).
For the `node` build output, all the dynamic imports have been imported, bundled and treated
as a `webpack_require` call.

### Include your existing tools to the pipeline

It can be helpful to test your current apps for migration, supporting react-loadable and
@loadable/component. Extend the webpack config if you need.

[☝️ Return To Top](#code-splitting-using-holocron)
