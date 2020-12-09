<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

# Making An API Call

> **TLDR**: Use [Fetchye](#fetchye) with the `fetchye-one-app` helpers.

Making API calls within a One App module has some additional considerations over a
traditional client side React application.

A basic data fetching example in a client side React app using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) might look like the following:

```jsx
const BooksModule = () => {
  const [{ books, isLoading, fetchError }, setData] = useState({});

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setData({ books, isLoading: true, fetchError: false });
        const response = await fetch('https://some-data-server.com/api/v1/books');
        if (response.ok) {
          const newBooks = await response.json();
          setData({ books: newBooks, isLoading: false });
        } else {
          setData({ books, isLoading: false, fetchError: true });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch Books:', e);
        setData({ books, isLoading: false, fetchError: true });
      }
    };
    fetchBooks();
  });

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (fetchError) {
    return <p>Error fetching Books</p>;
  }

  return (
    <div>
      <h1>Books</h1>
      <ul>
        {
          books && books.map((book) => (
            <li key={book.id}>Title: { book.title }</li>
          ))
        }
      </ul>
    </div>
  );
};
```

This approach works for modules, however it will not fully benefit from server side rendering and,
if the url is called across multiple modules, will result in duplicated API calls.

## Server Side data fetching

One App will attempt to render your module on the server before sending the resulting HTML
back to client. If a module requires any asynchronous tasks to render, such as data fetching,
then these will need to be performed before the One App server renders the module. To do this you can use [`loadModuleData`](https://github.com/americanexpress/one-app/blob/main/docs/api/modules/Loading-Data.md#moduleholocronloadmoduledata).

`loadModuleData` will be invoked before a module is rendered on the One App server. This happens when modules are loaded using [`ModuleRoute`](https://github.com/americanexpress/holocron/tree/main/packages/holocron-module-route) or [`composeModules`](https://github.com/americanexpress/holocron/blob/main/packages/holocron/docs/api/README.md#composemodules). `loadModuleData` will also be called on the client when the Holocron module mounts and receives props.

> You can read more about how to use `ModuleRoute` in [Routing-And-Navigation](./Routing-And-Navigation.md) and `composeModules` in the [Module-Composition](./Module-Composition.md) recipes.

Here is an example using `loadModuleData` to server side data fetch for the above example:

```jsx
const loadModuleData = async ({ store, fetchClient, ownProps }) => {
  store.dispatch({ type: 'FETCH_API' });
  try {
    const response = await fetchClient('https://some-data-server.com/api/v1/books');
    if (response.ok) {
      const data = await response.json();
      store.dispatch({ type: 'LOADED_API', data });
    } else {
      store.dispatch({ type: 'FAILED_API' });
    }
  } catch (e) {
    store.dispatch({ type: 'FAILED_API' });
  }
};

Books.holocron = {
  // Runs on both Server and Browser
  loadModuleData,
  reducer,
};
```

The modules reducer would handle those dispatched actions so the module would be able to retrieve the data from the Redux store.

## Duplicate Calls Across modules

When adding response data to the redux store it can be tempting to try to access this directly in other modules. This is **not** a recommended approach as you should aim to have modules as independent as possible.

You could also choose to bubble up your data fetching to the root module and pass down the data as props, which is a common approach with React applications, however this will result in closer coupling between child and root modules.

## Fetchye

[Fetchye](https://github.com/americanexpress/fetchye) brings a new, simplified method of making cached API calls. It makes use of React hooks to provide a simple API to enable data fetching with a centralized cache. Combined with the `fetchye-one-app` helpers it has minimal configuration and does not tightly couple a root module configuration to child modules.

Below is a breakdown of the APIs used to integrate with One App:

* [`useFetchye`](https://github.com/americanexpress/fetchye#usefetchye) from `fetchye` - A react hook responsible for dispatching an asynchronous fetch request to a given URL.
* [`OneFetchyeProvider`](https://github.com/americanexpress/fetchye#onefetchyeprovider) from `fetchye-one-app` - This is a react context provider which will ensure that any `useFetchye` calls will use the One App configuration. Think of this as the global config for your application. It is not required for `useFetchye` to work but it enables `useFetchye` to de-dupe requests and make use of a centralized cache.
* [`OneCache`](https://github.com/americanexpress/fetchye#onecache) from `fetchye-one-app` - This is a configured cache for use with One App modules. This is the cache which `OneFetchyeProvider` will always use.
* [`makeOneServerFetchye`](https://github.com/americanexpress/fetchye#makeoneserverfetchye) from `fetchye-one-app` - This helper creates a specialized fetch client for making requests on the One App server for server side rendering.


### Using `useFetchye`

Install `fetchye`:

```bash
npm i -S fetchye
```

Updating the first example to use `useFetchye` reduces the amount of boilerplate required for handling the request, loading and error states.

```jsx
import { useFetchye } from 'fetchye';

const BooksModule = () => {
  const { isLoading, data, error } = useFetchye('https://some-data-server.com/api/v1/books');
  const books = data && data.body;

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error fetching Books</p>;
  }

  return (
    <div>
      <h1>Books</h1>
      <ul>
        {
          books && books.map((book) => (
            <li key={book.id}>Title: { book.title }</li>
          ))
        }
      </ul>
    </div>
  );
};
```

At this stage `useFetchye` will make the request but will not de-dupe or cache the response.

> `useFetchye` has a default fetcher which will attempt to parse the response to JSON before returning `data` if you wish for a different approach you can supply a [custom fetcher](https://github.com/americanexpress/fetchye#custom-fetcher).

### Enabling centralized cache

To enable centralized caching the root module will need to add the `OneFetchyeProvider`.

To do this install `fetchye-one-app` and, if not already installed in your root module, `fetchye`:

```bash
npm i -S fetchye fetchye-one-app
```

Then at the top component of your root module add the `OneFetchyeProvider` and configure the reducer from `OneCache`:

```jsx
import { combineReducers } from 'redux-immutable';
import { OneFetchyeProvider, OneCache } from 'fetchye-one-app';

const MyModuleRoot = ({ children }) => (
  <div>
    { /* OneFetchyeProvider is configured to use OneCache */ }
    <OneFetchyeProvider>
      {/* Use your Router to supply children components containing useFetchye */}
      {children}
    </OneFetchyeProvider>
  </div>
);

// ...

MyModuleRoot.holocron = {
  name: 'my-module-root',
  reducer: combineReducers({
    // ensure you scope the reducer under "fetchye", this is important
    // to ensure that child modules can make use of the single cache
    fetchye: OneCache().reducer,
    // ... other reducers
  }),
};
```

Now every request made with `useFetchye` across your application will be de-duped and cached. You can now freely make requests with `useFetchye` anywhere the data is required and not worry about any unnecessary API calls.

It is very **important** to note that the `OneCache().reducer` be set on your root module under the `fetchye` scope. If this is not done as shown above the provider will not be able to correctly make use of the cache. This convention ensures that any module using fetchye will correctly make use of the cache on both the client and server. If you wish to alter the configuration it will increase the chance for cache misses by other modules.

### Fetching Data during SSR

If we want to fetch the data on the server we can use `makeOneServerFetchye` to create a fetch client. This will directly update our Redux store which will be used to hydrate any data into our components when rendering on the server and form part the initial state of the fetchye cache on the client.

Install `fetchye-one-app` in your module:

```bash
npm i -S fetchye-one-app
```

Now we can update `loadModuleData` to use `makeOneServerFetchye`

```jsx
import React from 'react';
import { useFetchye } from 'fetchye';
import { makeOneServerFetchye } from 'fetchye-one-app';

const bookUrl = 'https://some-data-server.com/api/v1/books';

const BooksModule = () => {
  const { isLoading, data, error } = useFetchye(bookUrl);
  const books = data && data.body;

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error fetching Books</p>;
  }

  return (
    <div>
      <h1>Books</h1>
      <ul>
        {
          books && books.map((book) => (
            <li key={book.id}>Title: { book.title }</li>
          ))
        }
      </ul>
    </div>
  );
};

// loadModuleData gets called before rendering on the server
// and during component mount and props update on the client
const loadModuleData = async ({ store: { dispatch, getState }, fetchClient }) => {
  // We only need this to be called on the server as the useFetchye hook will
  // take over in the client, so lets remove the unnecessary weight from our
  // client bundle
  if (!global.BROWSER) {
    const fetchye = makeOneServerFetchye({
      // Redux store
      store: { dispatch, getState },
      fetchClient,
    });

    // async/await fetchye has same arguments as useFetchye
    // dispatches events into the server side Redux store
    await fetchye(bookUrl);
  }
};

BooksModule.holocron = {
  loadModuleData,
};

export default BooksModule;
```

Please note that this low config approach relies on the conventions shown above. If the reducer or provider is not setup correctly in the root module you will not benefit from the caching. The `fetchye-one-app` helpers are designed to meet the majority of use cases and may not meet your requirements. It is possible to have a custom configuration using the `fetchye-redux-provider` and `fetchye-immutable-cache` however this could lead to cache misses and unutilized server side calls by modules not using the same configuration.

<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#Making-An-Api-Call)
<!--ONE-DOCS-HIDE end-->
