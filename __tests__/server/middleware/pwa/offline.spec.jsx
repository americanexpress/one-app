/**
 * @jest-environment node
 */

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
import { Helmet } from 'react-helmet';
import { registerModule } from 'holocron';
import { createRequest, createResponse } from 'node-mocks-http';

import oneApp from '../../../../src/universal';
import { setStateConfig } from '../../../../src/server/utils/stateConfig';
import sendHtml from '../../../../src/server/middleware/sendHtml';
import { configurePWA } from '../../../../src/server/middleware/pwa/config';

import createOfflineMiddleware from '../../../../src/server/middleware/pwa/offline';

jest.mock('../../../../src/server/middleware/sendHtml', () => jest.fn());
jest.mock('fs', () => ({
  existsSync: () => false,
  readFileSync: (filePath) => Buffer.from(filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]'),
}));

describe('offline middleware', () => {
  beforeAll(() => {
    process.env.ONE_SERVICE_WORKER = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn(() => Promise.resolve({}));

    const rootModuleName = 'root-module';
    registerModule(rootModuleName, () => React.createElement('p', null, 'Hi there'));
    setStateConfig({
      rootModuleName: {
        server: rootModuleName,
        client: rootModuleName,
      },
    });
    configurePWA({
      serviceWorker: true,
      scope: '/',
      webManifest: {
        name: 'One App Test',
      },
    });
  });

  test('does nothing if service worker is not enabled', async () => {
    expect.assertions(3);

    const middleware = createOfflineMiddleware(oneApp);
    const next = jest.fn();
    const req = createRequest();
    const res = createResponse();

    configurePWA({ serviceWorker: false });

    await expect(middleware(req, res, next)).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(sendHtml).not.toHaveBeenCalled();
  });

  test('calls the stack of middleware and finishes with "sendHtml" middleware', async () => {
    expect.assertions(5);

    const middleware = createOfflineMiddleware(oneApp);
    const next = jest.fn();
    const req = createRequest();
    const res = createResponse();

    await expect(middleware(req, res, next)).resolves.toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(req.appHtml).toEqual('<p>Hi there</p>');
    expect(sendHtml).toHaveBeenCalledTimes(1);
    expect(sendHtml).toHaveBeenCalledWith(req, res, next);
  });

  test('renders "appHtml", "helmetInfo" and sets the "renderMode"', async () => {
    expect.assertions(5);

    const middleware = createOfflineMiddleware(oneApp);
    const req = createRequest();
    const res = createResponse();
    registerModule('root-module', () => (
      <React.Fragment>
        <Helmet>
          <link rel="manifest" href="manifest.webmanifest" />
        </Helmet>
        <p>
          hello
        </p>
      </React.Fragment>
    ));

    await expect(middleware(req, res)).resolves.toBeUndefined();
    expect(req.appHtml).toEqual('<p>hello</p>');
    expect(req.renderMode).toEqual('render');
    expect(req.helmetInfo).toBeDefined();
    expect(req.helmetInfo.link.toString()).toEqual(
      '<link data-react-helmet="true" rel="manifest" href="manifest.webmanifest"/>'
    );
  });
});
