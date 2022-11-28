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

import serviceWorkerHandler from '../../../src/server/pwa/serviceWorkerHandler';
import { getServerPWAConfig } from '../../../src/server/pwa/config';
import { getClientModuleMapCache } from '../../../src/server/utils/clientModuleMapCache';

jest.mock('../../../src/server/pwa/config');
jest.mock('../../../src/server/utils/clientModuleMapCache');

const serviceWorkerStandardScript = '[service-worker-script]';
const serviceWorkerRecoveryScript = '[service-worker-recovery-script]';
const serviceWorkerEscapeHatchScript = '[service-worker-escape-hatch-script]';
function createServiceWorkerConfig({ type, scope } = {}) {
  let serviceWorker = false;
  let serviceWorkerScope = null;
  let serviceWorkerScript = null;
  if (type === 'standard') serviceWorkerScript = serviceWorkerStandardScript;
  else if (type === 'recovery') serviceWorkerScript = serviceWorkerRecoveryScript;
  else if (type === 'escape-hatch') serviceWorkerScript = serviceWorkerEscapeHatchScript;
  if (type) {
    serviceWorker = true;
    serviceWorkerScope = scope || '/';
  }
  return {
    serviceWorker,
    serviceWorkerScope,
    serviceWorkerScript,
  };
}

beforeAll(() => {
  getClientModuleMapCache.mockImplementation(() => ({
    browser: { modules: {} },
  }));
});

const makeReplyObject = () => {
  const reply = {};
  reply.send = jest.fn(() => reply);
  reply.header = jest.fn(() => reply);
  reply.type = jest.fn(() => reply);
  reply.status = jest.fn(() => reply);

  return reply;
};

describe('service worker handler', () => {
  test('replies with 404', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig());

    const reply = makeReplyObject();

    expect(serviceWorkerHandler(null, reply)).toBeUndefined();
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith('Not found');
  });

  test('handler responds with service worker script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'standard' }));

    const reply = makeReplyObject();

    serviceWorkerHandler(null, reply);

    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.type).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledTimes(2);
    expect(reply.type).toHaveBeenCalledWith('application/javascript');
    expect(reply.header).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(reply.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerStandardScript));
  });

  test('handler responds with service worker noop script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'recovery' }));

    const reply = makeReplyObject();

    serviceWorkerHandler(null, reply);

    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.type).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledTimes(2);
    expect(reply.type).toHaveBeenCalledWith('application/javascript');
    expect(reply.header).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(reply.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerRecoveryScript));
  });

  test('handler responds with service worker escape hatch script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'escape-hatch' }));

    const reply = makeReplyObject();

    serviceWorkerHandler(null, reply);

    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.type).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledTimes(2);
    expect(reply.type).toHaveBeenCalledWith('application/javascript');
    expect(reply.header).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(reply.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerEscapeHatchScript));
  });

  test('replaces HOLOCRON_MODULE_MAP in service worker script', () => {
    getServerPWAConfig.mockImplementationOnce(() => {
      const config = createServiceWorkerConfig({ type: 'standard' });
      config.serviceWorkerScript = 'process.env.HOLOCRON_MODULE_MAP';
      return config;
    });

    const reply = makeReplyObject();

    serviceWorkerHandler(null, reply);

    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.type).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledTimes(2);
    expect(reply.type).toHaveBeenCalledWith('application/javascript');
    expect(reply.header).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(reply.send).toHaveBeenCalledWith(Buffer.from(`'${JSON.stringify(getClientModuleMapCache().browser)}'`));
  });
});
