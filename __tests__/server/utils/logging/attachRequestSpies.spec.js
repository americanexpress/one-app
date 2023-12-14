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

import attachRequestSpies from '../../../../src/server/utils/logging/attachRequestSpies';
import attachSpy from '../../../../src/server/utils/logging/attachSpy';

jest.mock('http', () => ({ request: jest.fn() }));
jest.mock('https', () => ({ request: jest.fn() }));
jest.mock('on-finished');
jest.mock('../../../../src/server/utils/logging/attachSpy');

describe('attachRequestSpies', () => {
  beforeEach(() => {
    attachSpy.mockClear();
  });

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
    attachRequestSpies(jest.fn());
    expect(attachSpy).toHaveBeenCalledTimes(2);
    expect(attachSpy.mock.calls[0][0]).toEqual(https);
    expect(attachSpy.mock.calls[0][1]).toBe('request');
    expect(attachSpy.mock.calls[1][0]).toEqual(http);
    expect(attachSpy.mock.calls[1][1]).toBe('request');
    expect(typeof attachSpy.mock.calls[0][2]).toBe('function');
    expect(typeof attachSpy.mock.calls[1][2]).toBe('function');
  });

  describe('requestSpy', () => {
    it('is called with clientRequest', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      expect(attachSpy).toHaveBeenCalledTimes(2);

      const httpsSpy = attachSpy.mock.calls[0][2];
      const httpSpy = attachSpy.mock.calls[1][2];

      const callOriginal = jest.fn(() => 'client request object');

      httpsSpy(['http://example.tld'], callOriginal);
      httpSpy(['http://example.tld'], callOriginal);

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy.mock.calls[0][0]).toBe('client request object');
      expect(requestSpy.mock.calls[1][0]).toBe('client request object');
    });

    it('is called with object options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      expect(attachSpy).toHaveBeenCalledTimes(2);
      const httpsSpy = attachSpy.mock.calls[0][2];
      const httpSpy = attachSpy.mock.calls[1][2];
      const callOriginal = jest.fn(() => 'client request object');
      httpsSpy([{
        protocol: 'https',
        hostname: 'example.tld',
        port: 8080,
        method: 'GET',
        path: '/somewhere?over=rainbow#so-blue',
        auth: 'user:password',
      }], callOriginal);

      httpSpy([{
        protocol: 'http',
        hostname: 'example.tld',
        port: 8080,
        method: 'GET',
        path: '/somewhere?over=rainbow#so-blue',
        auth: 'user:password',
      }], callOriginal);

      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
      expect(requestSpy.mock.calls[1][1]).toMatchSnapshot();
    });

    it('is called with sparse object options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      expect(attachSpy).toHaveBeenCalledTimes(2);
      const httpsSpy = attachSpy.mock.calls[0][2];
      const httpSpy = attachSpy.mock.calls[1][2];

      const callOriginal = jest.fn(() => 'client request object');
      httpsSpy([{ method: 'GET' }], callOriginal);
      httpSpy([{ method: 'GET' }], callOriginal);
      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
      expect(requestSpy.mock.calls[1][1]).toMatchSnapshot();
    });

    it('is called with parsed options', () => {
      const requestSpy = jest.fn();
      attachRequestSpies(requestSpy);
      expect(attachSpy).toHaveBeenCalledTimes(2);
      const spy = attachSpy.mock.calls[0][2];
      const callOriginal = jest.fn(() => 'client request object');
      spy(['http://user:password@example.tld:8080/somewhere?over=rainbow#so-blue'], callOriginal);
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy.mock.calls[0][1]).toMatchSnapshot();
    });
  });

  describe('socketCloseSpy', () => {
    it('is called when the request socket closes', () => {
      onFinished.mockClear();
      const socketCloseSpy = jest.fn();
      attachRequestSpies(jest.fn(), socketCloseSpy);
      expect(attachSpy).toHaveBeenCalledTimes(2);
      const spy = attachSpy.mock.calls[0][2];
      const clientRequest = {};
      const callOriginal = () => clientRequest;
      spy(['http://example.tld'], callOriginal);
      expect(onFinished).toHaveBeenCalledTimes(1);
      onFinished.mock.calls[0][1]();
      expect(socketCloseSpy).toHaveBeenCalledTimes(1);
      expect(socketCloseSpy.mock.calls[0][0]).toBe(clientRequest);
      expect(socketCloseSpy.mock.calls[0][1]).toMatchSnapshot();
    });
  });
});
