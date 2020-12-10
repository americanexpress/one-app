<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Module Composition

A key part of working with One App is module composition. Modules can be rendered inside one another by either using `ModuleRoute` or `RenderModule`.

## `ModuleRoute`

`ModuleRoute` from `holocron-module-route` allows modules to dynamically load other modules
as a child route. This can be done on any module as routing is not limited to the root module:

```jsx
ParentModule.childRoutes = () => [
  <ModuleRoute
    path="childModule"
    moduleName="child-module"
    greeting="hello"
  />,
];
```

When using ModuleRoute, additional props are passed through to the module via the `route` prop:

```jsx
const ChildModule = ({ route: { greeting } } = {}) => <h1>{greeting}</h1>;
```

## `RenderModule`

Holocron's `RenderModule` provides an alternate method to rendering another module:

```jsx
const ParentModule = () => (
  <div>
    <h1>I am the parent module</h1>
    <RenderModule moduleName="child-module" props={{ greeting: 'hello' }} />
  </div>
);
```

To use `RenderModule` we need to ensure that the module bundle has been correctly
loaded into our client before it can be rendered. We can do this by
dispatching either `loadModule` or `composeModules` in our parent modules `loadModuleData`.

```jsx
ParentModule.holocron = {
  loadModuleData: async ({ store: { dispatch }, ownProps }) => {
    await dispatch(composeModules([{ name: 'child-module' }]));
    // or
    // await dispatch(loadModule('child-module'));
  },
};
```

Both `loadModule` and `composeModules` will ensure that the modules client bundle is loaded and the module can be rendered, however there are some minor differences between the two.

`loadModule` takes the modules name as a single argument and will only ensure that a modules client bundle is loaded so the module can be rendered on the client.

`composeModules` takes an array of objects, each one contains the name of the module required to load. It will then perform `loadModule` on each of those modules and in addition ensure that every modules `loadModuleData` is invoked. This is very important when server side rendering your modules as `loadModuleData` executes the asynchronous tasks that might be required to correctly render a module on the server.

<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#Making-An-Api-Call)
<!--ONE-DOCS-HIDE end-->
