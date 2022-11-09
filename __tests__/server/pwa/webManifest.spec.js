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

import webManifestMiddleware from '../../../../src/server/middleware/pwa/webManifest';
import { getWebAppManifestConfig } from '../../../../src/server/middleware/pwa/config';

jest.mock('../../../../src/server/middleware/pwa/config', () => ({
  getWebAppManifestConfig: jest.fn(() => ({ webManifestEnabled: false, webAppManifest: null })),
}));

describe('webmanifest middleware', () => {
  test('middleware factory returns function', () => {
    expect.assertions(1);
    expect(webManifestMiddleware()).toBeInstanceOf(Function);
  });

  test('middleware is disabled by default', () => {
    expect.assertions(2);
    const middleware = webManifestMiddleware();
    const next = jest.fn();
    expect(middleware(null, null, next)).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('middleware responds with manifest', () => {
    expect.assertions(4);
    const webManifest = { name: 'One App Test', short_name: 'one-app-test' };
    const middleware = webManifestMiddleware();
    const next = jest.fn();
    const send = jest.fn();
    const type = jest.fn(() => ({ send }));
    getWebAppManifestConfig
      .mockImplementationOnce(() => ({ webManifestEnabled: true, webManifest }));
    expect(middleware(null, { type, send }, next)).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(type).toHaveBeenCalledWith('application/manifest+json');
    expect(send).toHaveBeenCalledWith(webManifest);
  });
});
