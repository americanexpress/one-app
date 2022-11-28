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

import webManifestHandler from '../../../src/server/pwa/webManifest';
import { getWebAppManifestConfig } from '../../../src/server/pwa/config';

jest.mock('../../../src/server/pwa/config', () => ({
  getWebAppManifestConfig: jest.fn(() => ({ webManifestEnabled: false, webAppManifest: null })),
}));

const makeReplyObject = () => {
  const reply = {};
  reply.send = jest.fn(() => reply);
  reply.header = jest.fn(() => reply);
  reply.type = jest.fn(() => reply);
  reply.status = jest.fn(() => reply);

  return reply;
};

describe('webmanifest middleware', () => {
  test('middleware is disabled by default', () => {
    expect.assertions(2);

    const reply = makeReplyObject();

    webManifestHandler(null, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith('Not found');
  });

  test('middleware responds with manifest', () => {
    expect.assertions(2);

    const webManifest = { name: 'One App Test', short_name: 'one-app-test' };

    getWebAppManifestConfig
      .mockImplementationOnce(() => ({ webManifestEnabled: true, webManifest }));

    const reply = makeReplyObject();

    webManifestHandler(null, reply);

    expect(reply.type).toHaveBeenCalledWith('application/manifest+json');
    expect(reply.send).toHaveBeenCalledWith(webManifest);
  });
});
