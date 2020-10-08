<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

[one-app-config]: ../api/modules/App-Configuration.md#pwa
[frank-lloyd-root]: ../../prod-sample/sample-modules/frank-lloyd-root/0.0.3/README.md
[one-service-worker]: https://github.com/americanexpress/one-service-worker

# Progressive One App

## 📖 Table of Contents
* [Overview](#overview)
* [Getting Setup](#getting-setup)
* [Offline Support](#offline-support)
* [App Installation](#app-installation)

## Overview

In this compilation of mini recipes well be getting our feet wet with
Progressive Web Apps (PWA) in One App. We'll learn a bit about the
service worker and how to use the web manifest with One App. Each mini
recipe below will cover UX issues and the technical solutions to refine
your One App PWA.

**Prerequisites**

If you want to learn more about PWAs in general, or about service workers
and web manifests, here are a collection of links that talk more about the
technologies involved:

- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [App Installs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Developer_guide/Installing)
- [Online/Offline](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events)
- [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Cache Storage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

We recommend going through and reviewing the links before using PWA if you haven't
already done so.

**Examples**

* [`frank-lloyd-root@0.0.3`](frank-lloyd-root) sample module configures and enables PWA.

## Getting Setup

Let's start by configuring One App to enable the service worker.

**One App**

First thing is we need to set `ONE_SERVICE_WORKER` before we run One App:

```bash
export ONE_SERVICE_WORKER=true
```

This is set to `false` by default.

**Root Module**

Next step is to add it to your `appConfig` in your root module. The `pwa` key has
a few options that we can use to turn on the service worker and create a web manifest.
Here is a sample configuration:

```jsx
import React from 'react';

export default function RootModule({ children }) {
  return children;
}

RootModule.childRoutes = () => [
  <Route path="/" />,
];

RootModule.holocron = {
  name: 'potters-hut-root',
};

if (!global.BROWSER) {
  RootModule.appConfig = {
    // along with other config
    pwa: {
      serviceWorker: true,
      // enables the service worker
      scope: '/potters-hut',
      // scopes the service worker activity
      manifest: {
      // the web manifest; meta data for a PWA

        name: 'Potters Hut',
        // titles your PWA

        description: 'Pan over historical pottery and modern day twists',
        // the description provided for your PWA

        start_url: '/potters-hut/pwa/start',
        // tells the installed PWA which url to open to, which can match
        // a module route that you can create

        icons: [
        // icons allow for customizing the appearance of your PWA
        // when the OS decides to use them
          {
            src: 'https://example.com/potters-hut/images/amphora-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    },
  };
}
```

To read more on the `appConfig.pwa` and how you can turn off the service worker,
[read the App Config documentation.][one-app-config]

Once you've enabled the service worker and set up your manifest, you will
load in a PWA ready One App. The service worker is installed automatically
and the web manifest we've configured will be added to the rendered HTML.
Under the hood, [`@americanexpress/one-service-worker`][one-service-worker]
drives the service worker that One App is using. The service worker can be
found at `<one-app-instance>/_/pwa/service-worker.js`.

Using the `appConfig.pwa.scope` option set to `/potters-hut`, we can apply where
to mount the service worker. This will dictate when the worker is active and
sandboxes it to a given path. Our example config will set the scope over
`<one-app-instance>/potters-hut` which would only apply the PWA enhancements
under the provided scope and applied when installed.

**Caching**

What you will get out of the box with One App (when `serviceWorker` is enabled)
is caching for the `one-app` client and your modules, including language
packs bundled in your package. One App also provides offline navigation,
which means that when a user opens our web page while offline,
both the `one-app` client and modules will both load up - this is
because what we have already cached by the service worker is given
back to the browser... when the network is down.

**App Shell**

When there is a network connection, the cached results will continue to be
served; avoiding network traffic to CDN servers and reserving bandwidth. One
exception with the cache is that navigating to our web page is never cached,
it will always call the server first then fallback to the cached app shell
when offline. The One App app shell is used to load in the base app that will
start the client when offline and with installed PWAs. The app shell can be
rendered at `<one-app-instance>/_/pwa/shell`.

**Your development browser matters**

After you've setup, explore around for browsers that provide tools for
the service worker, the web manifest and the cache. A browser we often use is
[Chrome by Google](https://www.google.com/chrome/). The browser has a range of
panels in its dev tools that interact with all the elements we discuss throughout.

When you're ready to start, here are a few mini recipes to outfit your
Holocron modules with PWA enhancements.

## Offline Support

Supporting an offline experience for users is a privilege that native apps
have had from the start, however with PWA we can build offline support for
our web apps. There are plenty of positives to supporting offline:

* Gives One App a native feel whether in the browser or installed as a PWA
* Offline navigation makes our web app loadable in both environments
* One App assets and modules are available via the cache

Some costs to offline for consideration:
* Additional work is required to support the experience

**Supporting the Experience**

With One App we support the base offline experience however users that do
encounter themselves offline may find parts of the page fall apart because
our modules may not have been built with offline in mind. While One App will
load up along with the modules, data and other factors relying on the network
would cause failure if not mitigated. It is the module owners responsibility to
know when the network is offline and act with an informative UX or support an
offline experience for your users.

The first thing we need to support the offline experience is knowing when
we're `offline` or connected. Good news, it's pretty easy to find out when
the network is offline:

```js
const updateOnlineStatus = () => (navigator.onLine ? 'online' : 'offline');

window.addEventListener('online', () => console.log('network status: "%s"', updateOnlineStatus()));
window.addEventListener('offline', () => console.log('network status: "%s"', updateOnlineStatus()));
```

Let's make a React hook that uses both events. Once we know if/when
we're on or off the network, we can make our modules ready for offline
and tweak its behavior appropriately.

```jsx
import React from 'react';
import { isOffline } from '@americanexpress/one-service-worker';

function useOffline() {
  const [offline, setOffline] = React.useState(false);
  // since One App renders both client-side and server-side,
  // useLayoutEffect was used to prevent the hook from running
  // during SSR
  React.useLayoutEffect(() => {
    // Alternatively, we can add `if (global.BROWSER) { ... }`
    // and place any references to the `window` in that block
    const updateStatus = () => setOffline(isOffline());
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);
  return offline;
}

export function OnlineMode() {
  const offline = useOffline();
  React.useEffect(() => {
    // this hook and condition will trigger whenever we get back online
    // users with intermittent connections would lack data hydration, to
    // sync back up with our services, we can:
    if (!offline) {
      // reload data
      // flush analytics/errors/reports
      // dispatch offline form submissions
    }
  }, [offline]);
  return <p>Normal Mode</p>;
}

export function OfflineMode() {
  const offline = useOffline();
  React.useEffect(() => {
    if (offline) {
      // inform user
      // collect form submission
      // collect analytics/errors/reports
    }
  }, [offline]);
  return <p>Offline Mode</p>;
}

export default function MainModule() {
  const offline = useOffline();
  if (offline) {
    return <OfflineMode />;
  }
  return <OnlineMode />;
}
```

## App Installation

App installation bridges our web apps to a native-like experience for our users. It allows web
apps to be installed and placed with other native apps on a given device. What we do have with
One App is a `manifest.webmanifest` and this resource serves as the meta data for a web app.
The manifest contains the title, images and splash screen info for an installed PWA along with
[a list of other options](https://developer.mozilla.org/en-US/docs/Web/Manifest#Members).
We'll configure a manifest before we begin to make sure
[it will qualify with the browser](https://www.w3.org/TR/appmanifest/#installability-signals).

When a browser concludes that our web app is of interest to our user, it first
checks to see if our app has a web manifest and then meets installation standard.
If qualified, the browser will notify the user with a native prompt to install our
app or cancel. When a user frequents often, the prompt may appear after the page loads
if our web app and manifest qualify. This may be disruptive to the UX.

In this mini recipe, we'll go over configuring our web manifest, how we can control
when the native prompt appears and how to blend the experience with our own UI.

**Manifest**

Getting the webmanifest right is key as it decides how different parts of our PWA will look.
Here are a few options we recommend including:

* `name: 'PWA App'` the title of the PWA
* `short_name: 'PWA'` short version of your name
* `start_url: '.'` open the PWA to this URL
* `display: 'standalone'` tells the underlying web view how to display
* `theme_color: '#f0f0f0'` applies this color to the native UI
* `background_color: '#fff'` similar to theme_color, used as background color
* `description: 'An example PWA.'` A sentence that summarizes your app
* `icons: [{ src, sizes, type }]` An array of image metadata

We need to make sure our manifest has a `name`, `icons` populated with 2-3 different sizes
between 96px and 512px optimally and `start_url` to be defined (usually your home route).
For the splash screen to apply, you will need a big enough image for it to display.
The different icon sizes will match based on the OS settings. The rest of the config
tweak how the PWA will be displayed.

The webmanifest can be rendered at `<one-app-instance>/_/pwa/manifest.webmanifest`.

[**`beforeinstallprompt`**](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent)

Let's suppose we want to display a branded banner when the app is ready to install. This section
will cover how to integrate your UI with the app install native prompt. The `beforeinstallprompt`
event can be listened to and it is fired right before the install prompt appears. We can prevent the
default behavior of the event and make a deferred prompt for later use. The example below blends
together the native and web app UI by rendering a banner that will only display when the prompt
is ready and the user has not answered yet. If the user clicks yes, the native prompt will pop
up and if no was chosen, the response is stored for delegating any future app install requests.

```jsx
import React from 'react';

export const APP_INSTALL_KEY_NAME = 'app-install';

// these outcomes are based off user response
const [accepted, dismissed] = ['accepted', 'dismissed'];
const getOutcomeFromStore = () => localStorage.getItem(APP_INSTALL_KEY_NAME);
const setOutcomeToStore = (outcome) => localStorage.setItem(APP_INSTALL_KEY_NAME, outcome);

export function useInstallPrompt() {
  const prompt = React.useRef(null);
  const [outcome, setOutcome] = React.useState(null);

  React.useLayoutEffect(() => {
    setOutcome(getOutcomeFromStore() || null);

    const beforeInstallPrompt = (event) => {
      // once we prevent the default behavior, users won't be prompted immediately
      event.preventDefault();
      // allows triggering the prompt when we want to
      prompt.current = () => event.prompt().then(() => {
        event.userChoice.then((choiceResult) => {
          // we write to localstorage to avoid bothering the user after they made a decision
          setOutcomeToStore(choiceResult.outcome);
          setOutcome(choiceResult.outcome);
        });
      });
    };


    // we listen and wait for the event to happen
    window.addEventListener('beforeinstallprompt', beforeInstallPrompt);
    return () => {
      // making sure we clean up events
      window.removeEventListener('beforeinstallprompt', beforeInstallPrompt);
    };
  }, []);

  return {
    prompt: prompt.current,
    outcome,
    dispose() {
      // to remove the prompt and event from reference,
      // we can dispose when we're done.
      prompt.current = null;
    },
    isAnswered() {
      return [accepted, dismissed].includes(outcome);
    },
  };
}

export default function InstallBanner() {
  const {
    prompt, outcome, dispose, isAnswered,
  } = useInstallPrompt();

  if (prompt && !isAnswered()) {
    // our banner
    return (
      <aside className="shiny-banner">
        <p>Do you want to install our web app on your device?</p>
        <p />
        <button type="button" onClick={() => prompt()}>
          Yes!
        </button>
        <button type="button" onClick={() => dispose()}>
          No thanks
        </button>
      </aside>
    );
  }

  return null;
}
```

[**`appinstalled`**](https://developer.mozilla.org/en-US/docs/Web/API/Window/appinstalled_event)

There is of course an `appinstalled` event.

```js
window.addEventListener('appinstalled', () => { /* callback */ });
```

`appinstalled` is called after a user consents & installs the PWA. Listening
to the event gives us the chance to move the user out of the browser and into
the PWA. At the time of writing, the event is being deprecated however we can
use our `beforeinstallprompt` example above to signal to the runtime when the
web app is installed.
