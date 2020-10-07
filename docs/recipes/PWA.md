<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](./README.md)
<!--ONE-DOCS-HIDE end-->

[one-app-config]: ../api/modules/App-Configuration.md#pwa
[frank-lloyd-root]: ../../prod-sample/sample-modules/frank-lloyd-root/0.0.3/README.md
[one-service-worker]: https://github.com/americanexpress/one-service-worker

# PWA

## 📖 Table of Contents
* [Overview](#overview)
* [Setup](#setup)
* [Offline Support](#offline-support)
* [App Installation](#app-installation)

## Overview

In this compilation of mini recipes well be getting our feet wet with Progressive Web Apps
(PWA) in One App. We'll learn a bit about the service worker and how to use the web
manifest with One App. Each mini recipe below will cover UX issues and the technical
solutions to refine your One App PWA.
If any of these terms are new, we have links ready to get you familiar below in this section.
We recommend going through and reviewing the links before using PWA if you haven't
already done so.

**Links**

If you want to learn more about PWAs, service workers and web manifests,
here are a collection of links that talk more about the technologies involved:

- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [App Installs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Developer_guide/Installing)
- [Online/Offline](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/Online_and_offline_events)
- [Permissions](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)
- [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Cache Storage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

**Examples**

* [`frank-lloyd-root` v0.0.3](frank-lloyd-root) sample module configures and enables PWA.

## Setup

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
export default function RootModule({ children }) {
  return children;
}

RootModule.childRoutes = () => [
  <Route path="/" />,
];

RootModule.holocron = {
  name: 'root-module',
};

if (!global.BROWSER) {
  RootModule.appConfig = {
    // along with other config
    pwa: {
      serviceWorker: true,
      manifest: {
        name: 'Pottery Store',
        icons: [
          {
            src: 'https://drums.example.com/images/amphora-96.png',
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
drives the service worker that One App is using.
What you will get out of the box is caching for the `one-app` client, your modules,
including language packs bundled in your package; One App also supports
offline navigation, which means that when a user requests one of our pages when offline,
`one-app` client and modules will both load up and it is because what we have already
cached is given back to the browser when the network is down. Try testing what your modules
do when offline.

**Your development browser matters**

After you've setup, explore around for browsers that provide tools for
the service worker, the web manifest and the cache.
Skip to the next paragraph when you've selected a browser.

**Start**

When you're ready to start, here are a few mini recipes to outfit your
Holocron modules with PWA enhancements.

## Offline Support

It's important to note that with offline support, users that do encounter
themselves offline would find parts of the page broken because our modules
have loaded in but rely on data.
It is the module owners responsibility to know when the network is offline;
to respond with an informative UX or support an offline experience for your users.
When offline, the modules will load as normal, however checks are needed for
`offline` if we'd want to support the offline experience, or at least inform
the user on the state of the app and network.
The good thing is, it's easy to find out when the network is offline:

```js
const updateOnlineStatus = () => (navigator.onLine ? 'online' : 'offline');

window.addEventListener('online', () => console.log('network status: "%s"', updateOnlineStatus()));
window.addEventListener('offline', () => console.log('network status: "%s"', updateOnlineStatus()));
```

Let's make a React hook that uses both events.
Once we know if/when we're on or off the network, we can make our modules
ready for offline and tweak its behavior appropriately.

```jsx
import React from 'react';
import { isOffline } from '@americanexpress/one-service-worker';

function useOffline() {
  const [offline, setOffline] = React.useState(false);
  React.useLayoutEffect(() => {
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
 const isOffline = useOffline();
  if (isOffline) {
    return <OfflineMode />;
  }
  return <OnlineMode />;
}
```

## App Installation

App installation bridges our web apps to a native-like experience for our users. It allows web
apps to be installed and placed with other native apps on a given device. What we do have with
One App is a `manifest.webmanifest` and this resource is a manifest which serves like a web apps
meta data. It contains the title, images and splash screen for an installed PWA and a
[list of other options](https://developer.mozilla.org/en-US/docs/Web/Manifest#Members).
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
use our `beforeinstallprompt`example above to signal to the runtime when the
web app is installed.
