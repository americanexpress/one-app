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

[☝️ Return To Top](#adding-styles)
