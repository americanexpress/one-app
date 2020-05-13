[👈 Return to Overview](./README.md)

# Partial Rendering

Renders static markup from a Holocron module, rather than a complete page. Useful for reusing a One
App Module's markup on a non One App web page. This will only work when dispatched on the server.

```js
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderPartialOnly(true));
```

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for partial requests and by default there are no allowed origins. Add origins in the root module [corsOrigins](../api/modules/App-Configuration.md#corsorigins) in the [appConfig](../api/modules/App-Configuration.md)

See the [`Partial` component](../../prod-sample/sample-modules/frank-lloyd-root/0.0.2/src/components/Partial.jsx)
in the `frank-lloyd-root` module for an example implementation.

> Note: for the use case of rendering a complete document (like an email), the top-level component
> can be wrapped in a `<dangerously-return-only-doctype />` (instead of a `<div />` for instance)
> which will be removed from the final render.

[☝️ Return To Top](#partial-rendering)