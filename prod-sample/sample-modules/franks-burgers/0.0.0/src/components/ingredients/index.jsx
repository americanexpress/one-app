/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

function Loader() {
  return (
    <article>
      <button type="button">
        <FormattedMessage id="loading" />
      </button>
    </article>
  );
}

function bootStrap(loader) {
  function ComponentLoader({ fallback, ...props }) {
    const [errored, setError] = React.useState(null);
    const [Component, setComponent] = React.useState(null);
    React.useEffect(() => {
      let dismounted = false;
      const setter = (component) => {
        if (dismounted === false) setComponent(component);
      };
      loader()
        .then((container) => container.default || container)
        .then(setter)
        .catch((error) => {
          setError(error);
        });
      return () => {
        dismounted = true;
      };
    }, []);

    if (Component) {
      if (React.isValidElement(Component)) return React.cloneElement(Component, props);
      // eslint-disable-next-line react/jsx-props-no-spreading
      return <Component {...props} />;
    }

    if (typeof fallback === 'function') return fallback(props);

    if (errored) return null;

    return <Loader />;
  }

  ComponentLoader.propTypes = {
    fallback: PropTypes.func,
  };
  ComponentLoader.defaultProps = {
    fallback: undefined,
  };

  return ComponentLoader;
}

export const Bacon = bootStrap(() => import(/* webpackChunkName: "Bacon" */ './Bacon'));
export const Cheese = bootStrap(() => import(/* webpackChunkName: "Cheese" */ './Cheese'));
export const Ketchup = bootStrap(() => import(/* webpackChunkName: "Ketchup" */ './Ketchup'));
export const Lettuce = bootStrap(() => import(/* webpackChunkName: "Lettuce" */ './Lettuce'));
export const Mustard = bootStrap(() => import(/* webpackChunkName: "Mustard" */ './Mustard'));
export const Onions = bootStrap(() => import(/* webpackChunkName: "Onions" */ './Onions'));
export const Pickles = bootStrap(() => import(/* webpackChunkName: "Pickles" */ './Pickles'));
export const Patty = bootStrap(() => import(/* webpackChunkName: "Patty" */ './Patty'));
export const Tomato = bootStrap(() => import(/* webpackChunkName: "Lettuce" */ './Tomato'));
export const VeggiePatty = bootStrap(() => import(/* webpackChunkName: "VeggiePatty" */ './VeggiePatty'));
