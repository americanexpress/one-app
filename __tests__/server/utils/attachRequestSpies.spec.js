/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,either express
 * or implied. See the License for the specific language governing permissions and limitations
 * under the License.
 */

import http from 'node:http';
import https from 'node:https';
import onFinished from 'on-finished';

import attachRequestSpies, { attachSpy } from '../../../src/server/utils/attachRequestSpies';

jest.mock('node:http', () => ({ request: jest.fn() }));
jest.mock('node:https', () => ({ request: jest.fn() }));
jest.mock('on-finished');

describe('attachRequestSpies', () => {
  it('throws if requestSpy is not a function', () => {
    expect(attachRequestSpies).toThrowErrorMatchingSnapshot();
  });

  it('does not throw if socketCloseSpy is not provided', () => {
    expect(() => attachRequestSpies(() => {})).not.toThrow();
  });

  it('throws if socketCloseSpy is provided but is not a function', () => {
    expect(() => attachRequestSpies(() => {}, 'apples')).toThrowErrorMatchingSnapshot();
  });

  it('attaches http and https spies', () => {
    const requestSpy = jest.fn();
    const originalHttpRequest = http.request;
    const originalHttpsRequest = https.request;
    attachRequestSpies(requestSpy);
    expect(http.request).not.toEqual(originalHttpRequest);
    expect(https.request).not.toEqual(originalHttpsRequest);
    http.request('http://example.com');
    https.request('https://example.com');
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  describe('requestSpy', () => {
    it('is called with clientRequest', () => {
      const fakeOriginalHttpRequest = jest.fn();
      const fakeOriginalHttpsRequest = jest.fn();
      http.request = fakeOriginalHttpRequest;
      https.request = fakeOriginalHttpsRequest;

      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      http.request('http://example.tld');
      https.request('https://example.tld');

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(fakeOriginalHttpRequest).toHaveBeenCalledWith('http://example.tld');
      expect(fakeOriginalHttpsRequest).toHaveBeenCalledWith('https://example.tld');
    });

    it('is called with object options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);

      https.request({
        protocol: 'https',
        hostname: 'example.tld',
        port: 8080,
        method: 'GET',
        path: '/somewhere?over=rainbow#so-blue',
        auth: 'user:password',
      });

      http.request({
        protocol: 'http',
        hostname: 'example.tld',
        port: 8080,
        method: 'GET',
        path: '/somewhere?over=rainbow#so-blue',
        auth: 'user:password',
      });

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
      expect(requestSpy.mock.calls[1][1]).toMatchSnapshot();
    });

    it('is called with sparse object options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);

      https.request({ method: 'GET' });
      http.request({ method: 'GET' });

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
      expect(requestSpy.mock.calls[1][1]).toMatchSnapshot();
    });

    it('is called with parsed options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      http.request('http://user:password@example.tld:8080/somewhere?over=rainbow#so-blue');
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
    });
  });

  describe('socketCloseSpy', () => {
    it('is called when the request socket closes', () => {
      const fakeOriginalRequest = jest.fn();
      http.request = fakeOriginalRequest;
      onFinished.mockClear();
      const socketCloseSpy = jest.fn();
      attachRequestSpies(jest.fn(), socketCloseSpy);

      http.request('http://example.tld');
      expect(onFinished).toHaveBeenCalledTimes(1);
      onFinished.mock.calls[0][1]();
      expect(socketCloseSpy).toHaveBeenCalledTimes(1);
      expect(socketCloseSpy.mock.calls[0][1]).toMatchSnapshot();
      expect(fakeOriginalRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('attachSpy', () => {
    it('throws if the method name is not a function on the object', () => {
      expect(() => attachSpy({}, 'method', () => {})).toThrowErrorMatchingSnapshot();
    });
    it('throws if the spy is not a function', () => {
      expect(() => attachSpy({ method: () => {} }, 'method', 'hello')).toThrowErrorMatchingSnapshot();
    });
    describe('monkeypatched method', () => {
      const originalMethod = jest.fn(() => 'some return value');
      const obj = {};

      beforeEach(() => {
        obj.method = originalMethod;
        originalMethod.mockClear();
      });

      it('invokes the spy', () => {
        const spy = jest.fn();
        attachSpy(obj, 'method', spy);
        expect(spy).not.toHaveBeenCalled();
        obj.method();
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('invokes the spy with args', () => {
        const spy = jest.fn();
        attachSpy(obj, 'method', spy);
        obj.method('g', { h: 'i' }, 9);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toEqual(['g', { h: 'i' }, 9]);
      });

      it('invokes the spy with callOriginal', () => {
        const spy = jest.fn();
        attachSpy(obj, 'method', spy);
        obj.method();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(typeof spy.mock.calls[0][1]).toEqual('function');
      });

      it('returns the original methods return value from callOriginal', () => {
        expect.assertions(1);
        attachSpy(obj, 'method', (args, callOriginal) => {
          expect(callOriginal()).toEqual('some return value');
        });
        obj.method();
      });

      it('calls the original method when the spy does not', () => {
        attachSpy(obj, 'method', () => {});
        obj.method();
        expect(originalMethod).toHaveBeenCalledTimes(1);
      });

      it('does not call the original method when the spy already had', () => {
        attachSpy(obj, 'method', (args, callOriginal) => {
          callOriginal();
        });
        obj.method();
        expect(originalMethod).toHaveBeenCalledTimes(1);
      });

      it('returns the original methods return value to the caller of the monkeypatched method', () => {
        attachSpy(obj, 'method', jest.fn());
        expect(obj.method()).toEqual('some return value');
      });
    });
  });
});
