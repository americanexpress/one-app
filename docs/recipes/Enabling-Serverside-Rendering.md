<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Enabling Server-side Rendering

One App will always attempt to render your module on the server before sending html back to the client. However, it won't wait for any asynchronous tasks, such as data fetching, to complete before doing so.

The following options provide ways to ensure that server side requested data is included as part of the initial render.

## Using `loadModuleData`

One App v5 introduced [`loadModuleData`](https://one-amex-docs.americanexpress.com/en-us/one-app/api/modules/loading-data) which is invoked on the server and client.

```jsx
YourModule.holocron = {
  name: 'your-module',
  // Runs on both Server and Browser
  loadModuleData: async ({ store, fetchClient, ownProps }) => {
    store.dispatch({ type: 'LOADING_API' });
    const response = await fetchClient('https://api.example.com', ownProps.options);
    const data = await response.json();
    store.dispatch({ type: 'LOADED_API', data });
  },
};
```

## Using Fetchye and `loadModuleData`

```jsx
import React, { Fragment } from 'react';
import { ImmutableCache } from 'fetchye-immutable-cache';
import { useFetchye, makeServerFetchye } from 'fetchye';

const BookList = () => {
  const { isLoading, data } = useFetchye('http://example.com/api/books/');

  if (isLoading) {
    return (<p>Loading...</p>);
  }

  return (
    <Fragment>
      {/* Render data */}
    </Fragment>
  );
};

BookList.holocron = {
  loadModuleData: async ({ store: { dispatch, getState }, fetchClient }) => {
    if (!global.BROWSER) {
      const fetchye = makeServerFetchye({
      // Redux store
        store: { dispatch, getState },
        // Use ImmutableCache as One App uses ImmutableJS
        cache: ImmutableCache({
        // Selector to wherever fetchye reducer exists in Redux
          cacheSelector: (state) => state.getIn(['modules', 'my-module-root', 'fetchye']),
        }),
        fetchClient,
      });

      // async/await fetchye has same arguments as useFetchye
      // dispatches events into the server side Redux store
      await fetchye('http://example.com/api/books/');
    }
  },
};

export default BookList;
```

## Using Iguazu

If you want to use Iguazu in One App v5 ensure you set `loadDataAsProps.ssr = true` and configure Iguazu in `loadModuleData`.

```jsx
YourModule.holocron = {
  name: 'your-module',
  reducer,
  // Add configureIguazuSSR to install Iguazu SSR capabilities
  // https://github.com/americanexpress/holocron/blob/main/packages/iguazu-holocron/src/configureIguazuSSR.js
  loadModuleData: async ({ store, module, ownProps }) => {
    await configureIguazuSSR({ store, module, ownProps });
  },
};

export const loadDataAsProps = ({ store: { dispatch } }) => ({
  someData: () => dispatch(queryProcedureResult({
    procedureName: 'SomeProcedure.v1',
    args: {
      timeout: 10e3,
    },
  })),
});

// Must add to enable SSR for Iguazu
loadDataAsProps.ssr = true;

export default connectAsync({ loadDataAsProps })(AxpMyRoot);
```

[☝️ Return To Top](#enabling-serverside-rendering)
