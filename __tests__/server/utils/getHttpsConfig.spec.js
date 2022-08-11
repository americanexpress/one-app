/*
 * Copyright 2022 American Express Travel Related Services Company, Inc.
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

import getHttpsConfig from '../../../src/server/utils/getHttpsConfig';

jest.mock('fs');

const origEnvVarVals = {};
[
  'HTTPS_PRIVATE_KEY_PATH',
  'HTTPS_PUBLIC_CERT_CHAIN_PATH',
  'HTTPS_TRUSTED_CA_PATH',
  'HTTPS_PRIVATE_KEY_PASS_FILE_PATH',
]
  .forEach((name) => { origEnvVarVals[name] = process.env[name]; });

function resetEnvVar(name, val) {
  if (val === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = val;
  }
}

function clearAllEnvVars() {
  Object
    .keys(origEnvVarVals)
    .forEach((name) => delete process.env[name]);
  process.env.HTTP_PORT = 3000;
}

describe('server listen', () => {
  beforeEach(() => {
    clearAllEnvVars();
  });

  afterAll(() => {
    Object
      .keys(origEnvVarVals)
      .forEach((name) => resetEnvVar(name, origEnvVarVals[name]));
  });

  describe('basic options', () => {
    it('throws if HTTPS_PRIVATE_KEY_PATH is missing', () => {
      process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';

      expect(() => getHttpsConfig()).toThrow(
        'HTTPS_PORT requires HTTPS_PRIVATE_KEY_PATH and HTTPS_PUBLIC_CERT_CHAIN_PATH to be set'
      );
    });

    it('throws if HTTPS_PUBLIC_CERT_CHAIN_PATH is missing', () => {
      process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';

      expect(() => getHttpsConfig()).toThrow(
        'HTTPS_PORT requires HTTPS_PRIVATE_KEY_PATH and HTTPS_PUBLIC_CERT_CHAIN_PATH to be set'
      );
    });
  });

  describe('certificate authority', () => {
    it('uses CA options', () => {
      process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
      process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';

      process.env.HTTPS_TRUSTED_CA_PATH = '/dev/null';

      expect(getHttpsConfig()).toEqual({
        key: undefined,
        cert: undefined,
        minVersion: 'TLSv1.2',
        ca: [undefined],
      });
    });

    it('uses passphrase option', () => {
      process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
      process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';

      process.env.HTTPS_PRIVATE_KEY_PASS_FILE_PATH = '/dev/null';

      getHttpsConfig();

      expect(getHttpsConfig()).toEqual(
        {
          key: undefined,
          cert: undefined,
          minVersion: 'TLSv1.2',
          passphrase: undefined,
        }
      );
    });
  });
});
