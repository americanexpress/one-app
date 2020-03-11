[👈 Return to Overview](./Recipes.md)

# Adding Styles

## Adding a CSS File to Root Module

In order to access styles within your application, you will need to add the stylesheet to the `<head>`. You can achieve this by using [react-helmet](https://github.com/nfl/react-helmet).

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

*Note:* Keep in mind that the domain in the stylesheet needs to be added to the [csp](../api/modules/App-Configuration.md#csp).

## CSS Modules

Since CSS is global, One App uses the [CSS Modules](https://github.com/css-modules/css-modules) pattern to avoid class name collisions. This pattern should not be too different than what you are already used to. The main differences will be the strict use of camelCased class names and the way you import the class names.

### Example Class Names

```css
/* good */
.myClass {
  color: red;
}

/* bad, won't work */
.my-class {
  color: red;
}
```

### Importing and Using Those Classes

```jsx
import styles from './MyModule.scss';

const MyModule = () => (
  <div className={styles.myClass}>
    My Module
  </div>
);
```

## Using Reakit with One App

If you are wanting to use [Reakit](https://reakit.io/), here is how to do so within One App.

### Add Reakit to Root Module

```bash
npm install --save reakit
```

If you want their default styles

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

Since `reakit-system-bootstrap` was added in the root module, you do not need to `npm install` it in your child modules.

```jsx
import React, { Fragment } from 'react';
import { Button } from 'reakit/Button';


const MyModule = ({ children }) => (
  <Button>Button</Button>
);

export default MyModule;
```

### Share Reakit across all your modules

You can use [one-app-bundler's](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler) `providedExternals` and `requiredExternals` to avoid duplicating Reakit across all your modules.

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
