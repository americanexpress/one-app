[👈 Return to Overview](./Recipes.md)

# Internationalizing Your Module

This guide demonstrates how to get started with Internationalization with [react-intl](https://github.com/formatjs/react-intl). **In fact, if you created your module with the [One App Module Generator](https://github.com/americanexpress/one-app-cli/tree/master/packages/generator-one-app-module) (highly recommended), most of the work is already done!** You can skip ahead to ahead to [Accessing Intl in Child Components](#-accessing-intl-in-child-components). 

However, if you are creating a module from scratch or to better understand the pieces of internationalization in a module, begin at [Component Creation](#-component-creation).


## Component Creation
Begin with a parent and child component.

`Parent.jsx`
```es6
import React from 'react';
import Child from './Child';

const Parent = () => (
  <Child />
);

export default Parent;
```

`Child.jsx`
```es6
import React from 'React';

const Child = () => <div>greeting</div>;

export default Child;
```

## Module Locale Files

Next create the locale files. [one-app-locale-bundler](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-locale-bundler) will bundle the locale files as a part of [one-app-bundler](https://github.com/americanexpress/one-app-cli/tree/master/packages/one-app-bundler). More information about locale folder stucture and naming can be found in the [README](https://github.com/americanexpress/one-app-cli/blob/master/packages/one-app-locale-bundler/README.md).

Create a folder structure and content as follows (locale must follow BCP-47):
```
- locale
  - en-US.json
  - es-MX.json
```

`en-US.json`
```json
{
  "greeting": "Welcome!"
}
```

`es-MX.json`
```json
{
  "greeting": "Bienvenidos!"
}
```

## Module Creation

Turn the `Parent` component into a module. The parent module will use [compose](https://redux.js.org/api/compose/) from [Redux](https://redux.js.org/) and `holocron` from [holocron](https://github.com/americanexpress/holocron/tree/master/packages/holocron).

Install Redux and Holocron:
```
  npm i -s redux holocron
```

Wrap the `Parent` component with the Higher-Order Component (HOC) functions. Replace `module-name` with the name of the module.
```es6
import React from 'react';
import Child from './Child';

const Parent = () => (
  <Child />
);

Parent.holocron = {
  name: 'module-name',
};

export default Parent;
```

## Load Language Pack
With the module and locale files created, they need to be loaded into the Redux state. To load a language pack use [loadLanguagePack](https://github.com/americanexpress/one-app-ducks#loadlanguagepack) when initializing your module with [holocron](https://github.com/americanexpress/holocron) during `loadModuleData`.

Install One App Ducks:
```
npm i -s @americanexpress/one-app-ducks
```

Load the language pack during load:
```es6
import React from 'react';
import { compose } from 'redux';
import { loadLanguagePack } from '@americanexpress/one-app-ducks';
import Child from './Child';

const Parent = () => (
  <Child />
);

export const loadModuleData = ({ store: { dispatch } }) => dispatch(loadLanguagePack('module-name', { fallbackLocale: 'en-US' }));

Parent.holocron = {
  name: 'module-name',
  loadModuleData
};

export default Parent;
```

## Access Locale and Language Pack
Utilizing [mapStateToProps](https://react-redux.js.org/api/connect#mapstatetoprops-state-ownprops-object) will allow accessing the langugage pack and locale from the Redux state and provide them as props in the `Parent` component.

Install React-Redux, Immutable, and PropTypes:
```
npm i -s redux react-redux immutable prop-types
```

Add a `mapStateToProps` functionality and update the `Parent` component's props.
```es6
import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { loadLanguagePack } from '@americanexpress/one-app-ducks';
import { connect } from 'react-redux';
import { fromJS } from 'immutable';
import Child from './Child';

const Parent = ({ languageData, localeName }) => (
  <Child />
);

Parent.propTypes = {
  languageData: PropTypes.shape({
    greeting: PropTypes.string.isRequired,
  }).isRequired,
  localeName: PropTypes.string.isRequired,
};

export const loadModuleData = ({ store: { dispatch } }) => dispatch(loadLanguagePack('module-name', { fallbackLocale: 'en-US' }));

Parent.holocron = {
  name: 'module-name',
  loadModuleData,
};

export const mapStateToProps = (state) => {
  const localeName = state.getIn(['intl', 'activeLocale']);
  const languagePack = state.getIn(
    ['intl', 'languagePacks', localeName, 'module-name'],
    fromJS({})
  ).toJS();

  return {
    languageData: languagePack && languagePack.data ? languagePack.data : {},
    localeName,
  };
};

export default compose(
  connect(mapStateToProps)
)(Parent);
```

## Create IntlProvider
Creating an `IntlProvider` from [react-intl](https://github.com/formatjs/react-intl) will allow child components access the `intl` information configured for the module.

Install React-Intl:
```
npm i -s react-intl
```

Using the locale and language data, initialize an `IntlProvider` that wraps the `Child` component.
```es6
import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { loadLanguagePack } from '@americanexpress/one-app-ducks';
import { connect } from 'react-redux';
import { fromJS } from 'immutable';
import { IntlProvider } from 'react-intl';
import Child from './Child';

const Parent = ({ languageData, localeName }) => (
  <IntlProvider locale={localeName} messages={languageData}>
    <Child />
  </IntlProvider>
);

Parent.propTypes = {
  languageData: PropTypes.shape({
    greeting: PropTypes.string.isRequired,
  }).isRequired,
  localeName: PropTypes.string.isRequired,
};

export const loadModuleData = ({ store: { dispatch } }) => dispatch(loadLanguagePack('module-name', { fallbackLocale: 'en-US' }));

Parent.holocron = {
  name: 'module-name',
  loadModuleData,
};

export const mapStateToProps = (state) => {
  const localeName = state.getIn(['intl', 'activeLocale']);
  const languagePack = state.getIn(
    ['intl', 'languagePacks', localeName, 'module-name'],
    fromJS({})
  ).toJS();

  return {
    languageData: languagePack && languagePack.data ? languagePack.data : {},
    localeName,
  };
};

export default compose(
  connect(mapStateToProps)
)(Parent);
```

## Accessing Intl in Child Components

With the `IntlProvider` created in the `Parent` component there are several ways to access the `intl` information in the `Child` component.

With [useIntl](https://github.com/formatjs/react-intl/blob/master/docs/API.md#useintl-hook) Hook:
```es6
import React from 'react';
import { useIntl } from 'react-intl';

const Child = () => {
  const intl = useIntl();
  return <div>{intl.messages.greeting}</div>;
};

export default Child;
```

With [injectIntl](https://github.com/formatjs/react-intl/blob/master/docs/API.md#injectintl-hoc) HOC:
```es6
import React from 'react';
import { injectIntl } from 'react-intl';

const Child = ({ intl }) => <div>{intl.messages.greeting}</div>;

export default injectIntl(Child);
```

[☝️ Return To Top](#internationalizing-your-module)
