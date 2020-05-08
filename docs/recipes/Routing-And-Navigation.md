[👈 Return to Overview](./README.md)

# Routing and Navigation

One App contains a single route `<ModuleRoute moduleName={root-module-name}/>` which loads the
root-module configured by `root-module-name`. This is what makes the root module the entry
point to your application. As One App does not set a path by default, the root module
itself is required to have at least a single route with a path.

```js
import { Route } from '@americanexpress/one-app-router';

export function RootModule({ children, config }) {
  return <h1>Hello World!</h1>;
}
RootModule.childRoutes = [
  <Route path="/" />,
];
```

As your application grows, you can also take advantage of Holocron's [`ModuleRoute`](./docs/api/modules/loading-modules.md#moduleroute)
to load other modules.

```js
import { Route } from '@americanexpress/one-app-router';
import ModuleRoute from 'holocron-module-route';

export function RootModule({ children, config }) {
  return (
    <React.Fragment>
      { /* Root module UI */ }
      { children }
    </React.Fragment>
  );
}
RootModule.childRoutes = [
  <Route path="/" component={() => <h1>Hello World</h1>} />,
  <ModuleRoute path="child" moduleName="child-module" />,
];
```

To allow users to navigate around your application you can use `Link`
provided by One App Router.

```js
import { Link, Route } from '@americanexpress/one-app-router';
import ModuleRoute from 'holocron-module-route';

export function RootModule({ children, config }) {
  return (
    <React.Fragment>
      <nav>
        <Link to="/">
          Home
        </Link>
        <Link to="/child">
          Home
        </Link>
      </nav>
      { children }
    </React.Fragment>
  );
}
RootModule.childRoutes = [
  <Route path="/" component={() => <h1>Hello World</h1>} />,
  <ModuleRoute path="child" moduleName="child-module" />,
];
```

**📘 More Information**
* See One App Router for more docs related to routing: [One App Router](https://github.com/americanexpress/one-app-router)

[☝️ Return To Top](#Routing-And-Navigation)