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

import http from 'http';
import https from 'https';

import listen, { listenHttp, listenHttps } from '../../src/server/listen';

jest.mock('http');
jest.mock('https');
jest.mock('fs');

const origEnvVarVals = {};
[
  'HTTP_PORT',
  'HTTPS_PORT',
  'IP_ADDRESS',
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

  afterEach(() => {
    jest.clearAllMocks();
    http.mock.servers = [];
    https.mock.servers = [];
  });

  afterAll(() => {
    Object
      .keys(origEnvVarVals)
      .forEach((name) => resetEnvVar(name, origEnvVarVals[name]));
  });

  const app = (req, res) => res.status(418).send('Toot toot');

  describe('listen', () => {
    it('creates an HTTP server when not given HTTPS config', () => {
      const cb = jest.fn();
      http.mock.listenError = null;
      listen(app, cb);
      expect(http.createServer).toHaveBeenCalledTimes(1);
      expect(http.createServer).toHaveBeenCalledWith(app);
      expect(http.mock.servers[0].listen).toHaveBeenCalledTimes(1);
      expect(http.mock.servers[0].listen.mock.calls[0][0]).toEqual('3000');
      expect(cb).toHaveBeenCalledWith(null, { port: '3000' });
    });

    it('creates an HTTPS server when given HTTPS config', () => {
      const cb = jest.fn();
      process.env.HTTPS_PORT = '8998';
      process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
      process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';
      https.mock.listenError = null;
      listen(app, cb);
      expect(https.createServer).toHaveBeenCalledTimes(1);
      expect(https.createServer).toHaveBeenCalledWith(
        { key: undefined, cert: undefined, minVersion: 'TLSv1.2' },
        app
      );
      expect(https.mock.servers[0].listen).toHaveBeenCalledTimes(1);
      expect(https.mock.servers[0].listen.mock.calls[0][0]).toEqual('8998');
      expect(https.mock.servers[0].listen.mock.calls[0][1]).toEqual('0.0.0.0');
      expect(cb).toHaveBeenCalledWith(null, { port: '8998' });
    });
  });

  describe('listenHttp', () => {
    it('uses the HTTP_PORT env var given', () => {
      const cb = jest.fn();
      process.env.HTTP_PORT = '8998';
      http.mock.listenError = null;
      listenHttp(app, cb);
      expect(http.createServer).toHaveBeenCalledTimes(1);
      expect(http.createServer).toHaveBeenCalledWith(app);
      expect(http.mock.servers[0].listen).toHaveBeenCalledTimes(1);
      expect(http.mock.servers[0].listen.mock.calls[0][0]).toEqual('8998');
      expect(cb).toHaveBeenCalledWith(null, { port: '8998' });
    });

    it('passes the error to the callback', (done) => {
      process.env.HTTP_PORT = 8998;
      const listenError = new Error('port taken or such');
      http.mock.listenError = listenError;
      listenHttp(app, (err, serverInfo) => {
        expect(err).toEqual(listenError);
        expect(serverInfo.port).toEqual('8998');
        done();
      });
    });

    it('passes the server information to the callback', (done) => {
      process.env.HTTP_PORT = 8998;
      http.mock.listenError = null;
      listenHttp(app, (err, serverInfo) => {
        expect(err).toEqual(null);
        expect(serverInfo.port).toEqual('8998');
        done();
      });
    });
  });

  describe('listenHttps', () => {
    describe('basic options', () => {
      it('starts an HTTPS server', () => {
        const cb = jest.fn();

        process.env.HTTPS_PORT = '7890';
        process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
        process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';
        https.mock.listenError = null;

        listenHttps(app, cb);

        expect(https.createServer).toHaveBeenCalledTimes(1);
        expect(https.createServer).toHaveBeenCalledWith(
          { key: undefined, cert: undefined, minVersion: 'TLSv1.2' },
          app
        );
        expect(https.mock.servers[0].listen).toHaveBeenCalledTimes(1);
        expect(https.mock.servers[0].listen.mock.calls[0][0]).toEqual('7890');
        expect(https.mock.servers[0].listen.mock.calls[0][1]).toEqual('0.0.0.0');
        expect(cb).toHaveBeenCalledWith(null, { port: '7890' });
      });

      it('throws if HTTPS_PRIVATE_KEY_PATH is missing', () => {
        const cb = jest.fn();

        process.env.HTTPS_PORT = '7890';
        process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';
        https.mock.listenError = null;

        expect(() => listenHttps(app, cb)).toThrow(
          'HTTPS_PORT requires HTTPS_PRIVATE_KEY_PATH and HTTPS_PUBLIC_CERT_CHAIN_PATH to be set'
        );
        expect(https.createServer).toHaveBeenCalledTimes(0);
      });

      it('throws if HTTPS_PUBLIC_CERT_CHAIN_PATH is missing', () => {
        const cb = jest.fn();

        process.env.HTTPS_PORT = '7890';
        process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
        https.mock.listenError = null;

        expect(() => listenHttps(app, cb)).toThrow(
          'HTTPS_PORT requires HTTPS_PRIVATE_KEY_PATH and HTTPS_PUBLIC_CERT_CHAIN_PATH to be set'
        );
        expect(https.createServer).toHaveBeenCalledTimes(0);
      });
    });

    describe('certificate authority', () => {
      it('uses CA options', () => {
        const cb = jest.fn();

        process.env.HTTPS_PORT = '7890';
        process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
        process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';

        process.env.HTTPS_TRUSTED_CA_PATH = '/dev/null';

        https.mock.listenError = null;

        listenHttps(app, cb);

        expect(https.createServer).toHaveBeenCalledTimes(1);
        expect(https.createServer).toHaveBeenCalledWith(
          {
            key: undefined,
            cert: undefined,
            minVersion: 'TLSv1.2',
            ca: [undefined],
          },
          app
        );
        expect(https.mock.servers).toHaveLength(1);
        expect(https.mock.servers[0].listen).toHaveBeenCalledTimes(1);
        expect(https.mock.servers[0].listen.mock.calls[0][0]).toEqual('7890');
        expect(https.mock.servers[0].listen.mock.calls[0][1]).toEqual('0.0.0.0');
        expect(cb).toHaveBeenCalledWith(null, { port: '7890' });
      });

      it('uses passphrase option', () => {
        const cb = jest.fn();

        process.env.HTTPS_PORT = '7890';
        process.env.HTTPS_PRIVATE_KEY_PATH = '/dev/null';
        process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH = '/dev/null';

        process.env.HTTPS_PRIVATE_KEY_PASS_FILE_PATH = '/dev/null';

        https.mock.listenError = null;

        listenHttps(app, cb);

        expect(https.createServer).toHaveBeenCalledTimes(1);
        expect(https.createServer).toHaveBeenCalledWith(
          {
            key: undefined,
            cert: undefined,
            minVersion: 'TLSv1.2',
            passphrase: undefined,
          },
          app
        );
        expect(https.mock.servers).toHaveLength(1);
        expect(https.mock.servers[0].listen).toHaveBeenCalledTimes(1);
        expect(https.mock.servers[0].listen.mock.calls[0][0]).toEqual('7890');
        expect(https.mock.servers[0].listen.mock.calls[0][1]).toEqual('0.0.0.0');
        expect(cb).toHaveBeenCalledWith(null, { port: '7890' });
      });
    });
  });
});
