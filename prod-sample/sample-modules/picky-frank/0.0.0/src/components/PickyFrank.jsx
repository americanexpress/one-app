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

export function PickyFrank() {
  return (
    <Fragment>
      <span>Picky Frank is running version...</span>
      <span className="version">v0.0.0</span>
    </Fragment>
  );
}

if (!global.BROWSER) {
  PickyFrank.appConfig = {
    validateStateConfig: {
      someApiUrl: {
        client: {
          validate(url) {
            if (!url.includes('v1')) {
              throw new Error('Failed to pass correct url on client');
            }
          },
        },
        server: {
          validate(url) {
            if (!url.includes('v1')) {
              throw new Error('Failed to pass correct url on server');
            }
          },
        },
      },
      someBooleanValue: {
        client: {
          validate(value) {
            if (typeof value !== 'boolean') {
              throw new TypeError('Failed to pass correct boolean on client');
            }
          },
        },
        server: {
          validate(value) {
            if (typeof value !== 'boolean') {
              throw new TypeError('Failed to pass correct boolean on server');
            }
          },
        },
      },
    },
  };
}

export default PickyFrank;
