/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { holocronModule } from 'holocron';
import reducer from '../duck';

export function VitruviusFranklin({ moduleState }) {
  return (
    <Fragment>
      <pre>
        {JSON.stringify(moduleState, undefined, 2)}
      </pre>
      <p className="version">0.0.0</p>
    </Fragment>
  );
}

if (!global.BROWSER) {
  VitruviusFranklin.appConfig = {
    requiredSafeRequestRestrictedAttributes: {
      cookies: ['macadamia'],
    },
  };
}


VitruviusFranklin.propTypes = {
  moduleState: PropTypes.shape({
    req: PropTypes.object,
  }).isRequired,
};

const hocChain = compose(
  holocronModule({
    name: 'vitruvius-franklin',
    reducer,
  })
);

export default hocChain(VitruviusFranklin);
