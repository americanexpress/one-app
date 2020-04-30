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


let safeRequest;
let extendRestrictedAttributesAllowList;
let validateSafeRequestRestrictedAttributes;
let getRequiredRestrictedAttributes;

describe('safeRequest', () => {
  const dirtyRequest = {
    acceptsLanguages: () => 'I accept languages!',
    // makes sure defined falsy values get added too
    baseUrl: '',
    forwarded: {
      host: 'foo',
    },
    method: 'GET',
    originalUrl: '/foo/bar.html',
    corrupt: 'fields',
    params: {},
    protocol: 'https',
    query: {},
    url: '/bar.html',
    dangerous: 'data',
    headers: {
      'accept-language': true,
      host: 'bar',
      'user-agent': '100.0.0.0:0000',
      flavor: 'chocolate',
      risky: 'could be useful',
    },
    cookies: {
      applocale: 'en-US',
      publicsession: 'hasSession',
      randomcookie: 'not real',
    },
    body: {
      head: 'top',
      toes: 'bottom',
    },
  };

  function requireSafeRequest() {
    jest.resetModules();
    const safeRequestFile = require('../../../src/server/utils/safeRequest');
    safeRequest = safeRequestFile.default;
    ({
      extendRestrictedAttributesAllowList,
      validateSafeRequestRestrictedAttributes,
      getRequiredRestrictedAttributes,
    } = safeRequestFile);
  }

  describe('default safeRequest', () => {
    let cleanedRequest;

    beforeAll(() => {
      requireSafeRequest();
      cleanedRequest = safeRequest(dirtyRequest);
    });

    it('should include all safe request fields', () => {
      expect(cleanedRequest.acceptsLanguages()).toBe('I accept languages!');
      expect(cleanedRequest.baseUrl).toBe('');
      expect(cleanedRequest.forwarded.host).toBe('foo');
      expect(cleanedRequest.method).toBe('GET');
      expect(cleanedRequest.originalUrl).toBe('/foo/bar.html');
      expect(cleanedRequest.params).toStrictEqual({});
      expect(cleanedRequest.protocol).toBe('https');
      expect(cleanedRequest.query).toStrictEqual({});
      expect(cleanedRequest.url).toBe('/bar.html');
    });
    it('should include all safe request headers', () => {
      expect(cleanedRequest.headers['accept-language']).toBe(true);
      expect(cleanedRequest.headers.host).toBe('bar');
      expect(cleanedRequest.headers['user-agent']).toBe('100.0.0.0:0000');
    });

    it('should strip unsafe request fields', () => {
      expect(cleanedRequest.corrupt).toBeUndefined();
      expect(cleanedRequest.dangerous).toBeUndefined();
      expect(cleanedRequest.protocol).toBeDefined();
      expect(cleanedRequest.forwarded).toBeDefined();
    });

    it('should strip unsafe request headers', () => {
      expect(cleanedRequest.headers.flavor).toBeUndefined();
      expect(cleanedRequest.headers.host).toBeDefined();
      expect(cleanedRequest.headers['user-agent']).toBeDefined();
    });

    it('should strip unspecified request cookies', () => {
      expect(cleanedRequest.cookies.locale).toBeUndefined();
      expect(cleanedRequest.cookies.randomcookie).toBeUndefined();
    });
  });

  describe('extendRestrictedAttributesAllowList', () => {
    beforeEach(requireSafeRequest);

    it('updates allowed request', () => {
      extendRestrictedAttributesAllowList({
        cookies: ['applocale'],
        headers: ['risky'],
      });

      const extendedCleanedRequest = safeRequest(dirtyRequest);
      expect(extendedCleanedRequest.cookies.applocale).toEqual('en-US');
      expect(extendedCleanedRequest.headers.risky).toEqual('could be useful');
    });

    it('does not add additional keys to request', () => {
      extendRestrictedAttributesAllowList({
        notvalid: ['haha'],
      });

      const extendedCleanedRequest = safeRequest(dirtyRequest);
      expect(extendedCleanedRequest.notvalid).toBeUndefined();
    });

    it('resets to default restricted attributes ', () => {
      extendRestrictedAttributesAllowList({
        cookies: ['applocale'],
      });

      const extendedCleanedRequest = safeRequest(dirtyRequest);
      expect(extendedCleanedRequest.cookies.applocale).toEqual('en-US');

      extendRestrictedAttributesAllowList({
        browser: [],
      });

      const secondCleanedRequest = safeRequest(dirtyRequest);
      expect(secondCleanedRequest.cookies.applocale).toBeUndefined();
    });

    it('validates that required attributes', () => {
      extendRestrictedAttributesAllowList({ cookies: ['applocale'], headers: ['flavor'] });
      validateSafeRequestRestrictedAttributes({ cookies: ['applocale'] }, 'a-module');

      expect(
        () => extendRestrictedAttributesAllowList({ headers: ['flavor', 'host'] })
      ).toThrowError('Attempting to remove required restricted attributes cookies: applocale');

      expect(
        () => extendRestrictedAttributesAllowList({
          headers: ['flavor', 'host'],
          cookies: ['applocale'],
        })
      ).not.toThrowError();
    });
  });

  describe('getRequiredRestrictedAttributes', () => {
    beforeEach(requireSafeRequest);

    it('returns set restricted attributes', () => {
      extendRestrictedAttributesAllowList({ cookies: ['applocale'], headers: ['flavor'] });
      validateSafeRequestRestrictedAttributes({ cookies: ['applocale'] }, 'a-module');
      validateSafeRequestRestrictedAttributes({ headers: ['flavor'] }, 'b-module');
      validateSafeRequestRestrictedAttributes({
        headers: ['flavor'],
        cookies: ['applocale'],
      }, 'c-module');

      expect(getRequiredRestrictedAttributes()).toEqual({
        cookies: ['applocale'],
        headers: ['flavor'],
      });
    });
  });

  describe('validateSafeRequestRestrictedAttributes', () => {
    beforeEach(requireSafeRequest);

    it('does not throw when included', () => {
      extendRestrictedAttributesAllowList({
        cookies: ['applocale'],
        headers: ['custom-header'],
      });

      expect(
        () => validateSafeRequestRestrictedAttributes({
          cookies: ['applocale'],
          headers: ['custom-header'],
        })
      ).not.toThrow();
    });

    it('ignores invalid request keys', () => {
      expect(
        () => validateSafeRequestRestrictedAttributes({
          cheeses: ['cheddar'],
          headers: ['host'],
        })
      ).not.toThrow();
    });

    it('throws error when missing in safeRequest', () => {
      expect(
        () => validateSafeRequestRestrictedAttributes({
          cookies: ['jaffa-cake'],
          headers: ['secret-id'],
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('updates required attributes', () => {
      extendRestrictedAttributesAllowList({ headers: ['flavor'], cookies: ['applocale'] });

      expect(getRequiredRestrictedAttributes()).toEqual({});

      validateSafeRequestRestrictedAttributes({ headers: ['flavor'] }, 'a-module');
      validateSafeRequestRestrictedAttributes({ cookies: ['applocale'] }, 'b-module');

      expect(getRequiredRestrictedAttributes()).toEqual({
        headers: ['flavor'],
        cookies: ['applocale'],
      });

      validateSafeRequestRestrictedAttributes({}, 'a-module');
      validateSafeRequestRestrictedAttributes({ cookies: ['applocale'] }, 'b-module');
      expect(getRequiredRestrictedAttributes()).toEqual({
        cookies: ['applocale'],
      });
    });
  });

  describe('useBodyForBuildingTheInitialState', () => {
    beforeEach(requireSafeRequest);

    it('should omit the body when useBodyForBuildingTheInitialState is not true', () => {
      const cleanedBodyRequest = safeRequest(
        dirtyRequest, { useBodyForBuildingTheInitialState: false }
      );
      expect(cleanedBodyRequest).not.toHaveProperty('body');
    });

    it('should include the body when useBodyForBuildingTheInitialState is true', () => {
      const cleanedBodyRequest = safeRequest(
        dirtyRequest, { useBodyForBuildingTheInitialState: true }
      );
      expect(cleanedBodyRequest).toHaveProperty('body');
      expect(cleanedBodyRequest.body).toEqual({ head: 'top', toes: 'bottom' });
    });
  });
});
