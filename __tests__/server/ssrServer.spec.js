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

import compress from '@fastify/compress';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';

import ensureCorrelationId from '../../src/server/plugins/ensureCorrelationId';
import setAppVersionHeader from '../../src/server/plugins/setAppVersionHeader';
import addSecurityHeadersPlugin from '../../src/server/plugins/addSecurityHeaders';
import csp from '../../src/server/plugins/csp';
import logging from '../../src/server/utils/logging/fastifyPlugin';
import forwardedHeaderParser from '../../src/server/plugins/forwardedHeaderParser';
import renderHtml from '../../src/server/plugins/reactHtml';
import renderStaticErrorPage from '../../src/server/plugins/reactHtml/staticErrorPage';
import addFrameOptionsHeader from '../../src/server/plugins/addFrameOptionsHeader';
import addCacheHeaders from '../../src/server/plugins/addCacheHeaders';
import { getServerPWAConfig, serviceWorkerHandler, webManifestMiddleware } from '../../src/server/pwa';

import ssrServer from '../../src/server/ssrServer';

jest.mock('@fastify/compress');
jest.mock('fastify');
jest.mock('@fastify/cookie');
jest.mock('@fastify/formbody');
jest.mock('@fastify/static');
jest.mock('@fastify/helmet');
jest.mock('@fastify/sensible');
jest.mock('../../src/server/plugins/ensureCorrelationId');
jest.mock('../../src/server/plugins/setAppVersionHeader');
jest.mock('../../src/server/plugins/addSecurityHeaders');
jest.mock('../../src/server/plugins/csp');
jest.mock('../../src/server/utils/logging/fastifyPlugin');
jest.mock('../../src/server/plugins/forwardedHeaderParser');
jest.mock('../../src/server/plugins/reactHtml');
jest.mock('../../src/server/plugins/reactHtml/staticErrorPage');
jest.mock('../../src/server/plugins/addFrameOptionsHeader');
jest.mock('../../src/server/plugins/addCacheHeaders');
jest.mock('../../src/server/pwa');

describe('ssrServer', () => {
  jest.spyOn(console, 'info').mockImplementation(() => { });
  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });

  beforeEach(() => {
    // jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
    delete process.env.ONE_MAX_POST_REQUEST_PAYLOAD;
  });

  describe('...', () => {
    test('builds the fastify server', async () => {
      const app = await ssrServer();

      const response = app.inject({
        method: 'get',
        url: '/testing'
      });

    })
  });
});
