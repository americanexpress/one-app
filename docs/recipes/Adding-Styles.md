[👈 Return to Overview](./README.md)

# Adding Styles

## 📖 Table of Contents

* [CSS Modules](#css-modules)
  * [Example Class Names](#example-class-names)
  * [Importing and Using Classes](#importing-and-using-classes)
* [Adding a CSS File to Root Module](#adding-a-css-file-to-root-module)
* [Adding a CSS File to Child Module](#adding-a-css-file-to-child-module)
* [Using Reakit with One App](#using-reakit-with-one-app)
  * [Add Reakit to Root Module](#add-reakit-to-root-module)
  * [Using Reakit in a Child Module](#using-reakit-in-a-child-module)
  * [Share Reakit Across Your Modules](#share-reakit-across-your-modules)
    * [Add Reakit as a `providedExternals` in your Root Module](#add-reakit-as-a-providedexternals-in-your-root-module)
    * [Add Reakit as a `requiredExternals` in your Child Module](#add-reakit-as-a-requiredexternals-in-your-child-module)

## CSS Modules

Since CSS is global, One App uses the [CSS Modules](https://github.com/css-modules/css-modules)
pattern to avoid class name collisions. The main differences will be the strict use of camelCased
class names and the way you import the class names.

### Example Class Names

```css
/* good */
.myClass {
  color: red;
}

/* not currently supported due to purge-css */
.my-class {
  color: red;
}
```

### Importing and Using Classes

```jsx
import styles from './MyModule.scss';

const MyModule = () => (
  <div className={styles.myClass}>
    My Module
  </div>
);
```

## Adding a CSS File to Root Module

In order to provide global styles within your application, you can add a stylesheet to the
`<head>` within your root module. You can achieve this by using [react-helmet](https://github.com/nfl/react-helmet).

```jsx
import React, { Fragment } from 'react';
import { Helmet } from 'react-helmet';

const MyRoot = ({ children }) => (
  <Fragment>
    <Helmet>
      <link rel="stylesheet" href="https://www.example.com/styles.min.css" />
    </Helmet>
    {children}
  </Fragment>
);
```

*Note:* Keep in mind that the domain in the stylesheet needs to be added to the
[csp](../api/modules/App-Configuration.md#csp).

## Adding a CSS File to Child Module

This is done the same way as with the Root Module. However, keep in mind that if you add a
stylesheet in the Root Module as well as a Child Module, this can cause collisions as well as
multiple loads of the same styles.

## Using Reakit with One App

If you are wanting to use [Reakit](https://reakit.io/), here is how to do so within One App.

### Add Reakit to Root Module

```bash
npm install --save reakit
```

Add default their styling by installing `reakit-system-bootstrap`. This is optional.

```bash
npm install --save reakit-system-bootstrap
```

```jsx
import React, { Fragment } from 'react';
import { Provider } from 'reakit';
import * as system from 'reakit-system-bootstrap';


const MyRootModule = ({ children }) => (
  <Fragment>
    <Provider unstable_system={system}>
      { children }
    </Provider>
  </Fragment>
);

export default MyRootModule;
```

Wrapping your children with Reakit's `Provider` will make the styles accessible by the children.

### Using Reakit in a Child Module

```bash
npm install --save reakit
```

Since `reakit-system-bootstrap` was added in the root module, you do not need to `npm install` it
in your child modules.

```jsx
import React, { Fragment } from 'react';
import { Button } from 'reakit';


const MyModule = ({ children }) => (
  <Button>Button</Button>
);

export default MyModule;
```

### Share Reakit Across Your Modules

You can use [one-app-bundler's](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler)
`providedExternals` and `requiredExternals` to avoid duplicating Reakit across all your modules.
Furthermore, due to Reakit using React's context API, in order for your child modules to leverage
this, you **MUST** add it to `providedExternals` as well as `requiredExternals`.

#### Add Reakit as a `providedExternals` in your Root Module

Add the following in your root module's `package.json`.

```json
"one-amex": {
  "bundler": {
    "providedExternals": [
      "reakit"
    ]
  }
},
```

#### Add Reakit as a `requiredExternals` in your Child Module

```json
"one-amex": {
  "bundler": {
    "requiredExternals": [
      "reakit"
    ]
  }
},
```

⚠️ Caveat

When using externals and how Webpack handles them, you will need to change your import from

```jsx
import { Button } from 'Reakit/Button';
```

to

```jsx
import { Button } from 'Reakit';
```

[☝️ Return To Top](#adding-styles)
