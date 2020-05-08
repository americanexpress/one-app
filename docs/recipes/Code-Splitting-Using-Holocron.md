[holocron-readme]: https://github.com/americanexpress/holocron/tree/master/packages/holocron/README.md
[holocron-module-route-readme]: https://github.com/americanexpress/holocron/tree/master/packages/holocron-module-route/README.md
[one-app-bundler-readme]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler/README.md
[one-app-router-readme]: https://github.com/americanexpress/one-app-router/README.md

[holocron-module-api]: https://github.com/americanexpress/holocron/blob/master/packages/holocron/docs/api/README.md#holocron-module-configuration
[bundler-webpack-config]: https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler#webpackconfigpath-webpackclientconfigpath--webpackserverconfigpath

[frank-lloyd-root]: ../../prod-sample/sample-modules/frank-lloyd-root/0.0.0/README.md
[franks-burgers]: ../../prod-sample/sample-modules/franks-burgers/0.0.0/README.md

[webpack-dynamic-import-docs]: https://webpack.js.org/guides/code-splitting/#dynamic-imports
[react-code-splitting-docs]: https://reactjs.org/docs/code-splitting.html
[react-lazy-api]: https://reactjs.org/docs/react-api.html#reactlazy
[react-suspense-api]: https://reactjs.org/docs/react-api.html#reactsuspense

[👈 Return to Overview](./README.md)

# Code Splitting Using Holocron

**Contents**
* [Route Based Code Splitting](#route-based-code-splitting)
* [Holocron Module Chunks _Via_ `import()`](#holocron-module-chunks-via-import())
  * [Using `Module.holocron`](#using-moduleholocron)
  * [Using `Suspense` and `lazy`](#using-suspense-and-lazy)
  * [How It Works](#how-it-works)
  * [Performance Considerations](#performance-considerations)
  * [Include](#include-existing-tools-into-the-pipeline)

For One App, Holocron modules are a formal way of code-splitting for a modern,
micro front-end in the One App ecosystem. Utilizing the module map as a system
which promotes synergy and asynchrony across teams and collaborators on
a single application.

With Holocron each individual module is by definition, a code split bundled
component with language packs that can be combined and composed based on our
needs. Each module is versioned, configurable, routable and can be further
split into smaller chunks using dynamic importing.

The main advantage we get with code splitting our modules is controlling what parts of
a module is first delivered and larger chunks are loaded by user actions and are not
necessary to include at initial delivery. This can save end users kilobytes of data
transfer (until needed) and reduce the time for waiting on the Holocron module
bundle to load.

Like `@loadable/component` and `react-loadable`, `holocron` is a complete code-splitting
solution that works in both client and server side, however there is no need to scaffold
a build infrastructure to support code-splitting when we use `one-app-bundler`.

**📘 More Information**

* **[`holocron`][holocron-readme]**
* **[`one-app-bundler`][one-app-bundler-readme]**

## Route Based Code Splitting

A Holocron module can be route-driven using `ModuleRoute` and we can use this component
to shape our routing for One App. Since each Holocron module is an independent bundle,
our `childRoutes` is a map of code-split modules that is driven by the url.

`ModuleRoute` is an extension of `Route` from [`one-app-router`][one-app-router-readme]
and can render the module(s) by its route per `history`.
Our Holocron modules are now loaded based on routing through the application.

```jsx
import React from 'react';
import { RenderModule } from 'holocron';
import { ModuleRoute } from 'holocron-module-route';
import { IndexRedirect } from '@americanexpress/one-app-router';

export const childRoutes = () => (
  <ModuleRoute moduleName="diner-finder">
    <IndexRedirect to="map" />
    <ModuleRoute path="map" moduleName="diner-finder-map" />
    <ModuleRoute path="selection" moduleName="diner-finder-selection-container">
      <ModuleRoute moduleName="diner-finder-selection" />
    </ModuleRoute>
  </ModuleRoute>
);
```

> To view a root Holocron module with a childRoutes config, [check out the sample module "Frank Lloyd Root"][frank-lloyd-root]

**📘 More Information**

* **[`holocron-module-route`][holocron-module-route-readme]**
* **[`one-app-router`][one-app-router-readme]**

## Holocron Module Chunks _Via_ `import()`

With a Holocron module, we use code-splitting to add granularity to our modules and create chunks
defined by user-driven actions or incorporate lazy loading for larger parts of our module.
Let's start with a sample Holocron module project:

```
root
|── locale
|   └── en-US.json
|── src
|   ├── Chunk.jsx
|   ├── index.js
|   └── Module.jsx
└── package.json
```

`src/index.js`
```jsx
import HolocronModule from './Module';

export default HolocronModule;
```

> It's important to mention, when we are code splitting with dynamic `import`s, we
> must rely on user actions to load module chunks dynamically.

`src/Module.jsx`
```jsx
import React from 'react';

export default function MyHolocronModule() {
  const [loadModule, setLoadModule] = React.useState(false);
  const [Component, setComponent] = React.useState(null);

  React.useEffect(() => {
    if (loadModule) {
      import(/* webpackChunkName: "<chunkName>" */ './Chunk')
        // the multi-line comment /* webpackChunkName: "..." */
        // is used by webpack to name your chunk
        .then((importedChunk) => importedChunk.default || importedChunk)
        // when we convert ES modules to common/supported formats,
        // we might need to interop the `default` property to get the export
        .then((chunk) => {
          // ... do things with the chunk once we have what we want
          setComponent(chunk);
        });
    }
  }, [loadModule]);

  if (Component) return <Component />;

  return (
    <button type="button" onClick={() => setLoadModule(true)}>
      Load Module
    </button>
  );
}
```

`src/Chunk.jsx`
```jsx
import React from 'react';

export default function ModuleChunk() {
  return <p>My Holocron Module Chunk</p>;
}
```

In our basic example, if we wanted to use `Chunk.jsx` as a Holocron module chunk, we can use
the supported `import()` syntax to divide up our module bundle into logical chunks and name
our chunk using the [_magic comments_ `/* webpackChunkName: "..." */`][webpack-dynamic-import-docs]:

```js
// compared to traditional imports, which adds to the main bundle
import './Chunk';

import(/* webpackChunkName: "<chunkName>" */ './Chunk');
```

Our _chunk_ can be anything from a component to a `node_modules` package. Once we run
`bundle-module` from [`one-app-bundler`][one-app-bundler-readme], our output in `build/<version>`
will contain additional JavaScript files based on the number of chunks we have dynamically split
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
        └── en-US
            ├── <moduleName>.json
            ├── integration.json
            └── qa.json
```

> To view a module chunks example using dynamic importing, [check out the sample module "Franks Burgers"][franks-burgers]

### Using `Module.holocron`

`src/Module.jsx`
```jsx
import React from 'react';

let Chunk = () => <p>Loading...</p>;

export function MyHolocronModule() {
  return <Chunk />;
}

MyHolocronModule.holocron = {
  name: 'holocron-module-name',
  // the loadModuleData property allows us to load our chunk with our module
  loadModuleData: async () => {
    try {
      // the same dynamic import is used to create a promise with our chunk
      const imported = await import(/* webpackChunkName: '<chunkName>' */ './Chunk');
      Chunk = imported.default || imported;
    } catch (error) {
      Chunk = () => <p>{error.message}</p>;
    }
  },
  // we can wait for our holocron module to load the chunk during server-side rendering
  // and render the module with the loaded chunk
};

export default MyHolocronModule;
```

### Using `Suspense` and `lazy`

React comes with an API made with code splitting in mind;
with [`React.Suspense`][react-suspense-api] and [`React.lazy`][react-lazy-api], we can
load a module chunk from our CDN and fallback to a given value while it asynchronously loads.

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

### Usage Considerations

#### Performance

When it comes to bundling a Holocron module and splitting it up into chunks for loading, it's
important to consider why we are code splitting our Holocron module. With each chunk
that is split from the module bundle, the browser has to open an extra connection to the server
to fetch every chunk. This can lead to performance degradation and can cause excessive traffic
to the web server if the code splitting is too granular.

#### UX

For an end user of One App, we want to create a fluid user experience while module chunks
are being asynchronously loaded. We want to focus on when the module is being loaded
and avoid "flashing" an indeterminate loading state (eg fast network, browser cache, service worker)
as well as handle delays in the module chunk delivery.

### How It Works

One App uses [`one-app-bundler`][one-app-bundler-readme] to support dynamic importing and code
splitting on the module level. Out of the box, [`one-app-bundler`][one-app-bundler-readme] uses
`webpack` and `babel` (with `@babel/plugin-syntax-dynamic-import`) under the hood to understand
the `import()` syntax and automatically split your module where ever the `import() ` statement
is used within your module.

We can expect the final bundled module output to contain everything it normally does,
with two additional JavaScript files per chunk (modern `browser` and `legacy.browser` versions).
For the `node` build output, all the dynamic imports have been imported, bundled and treated
as a `webpack_require` call.

### Include Other Tools Into The Pipeline

It can be helpful to test your current apps for migration and support `react-loadable` and
`@loadable/component`. [We can extend the webpack config if needed.][bundler-webpack-config]

[☝️ Return To Top](#code-splitting-using-holocron)
