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

import url from 'url';

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'debug',
  },
}));

describe('setup', () => {
  let attachRequestSpies;
  let logger;
  let startTimer;

  const logMethods = ['error', 'warn', 'log', 'info', 'debug'];
  const originalConsole = logMethods.reduce((acc, curr) => ({
    ...acc,
    [curr]: console[curr],
  }), {});

  afterEach(() => {
    logMethods.forEach((method) => { console[method] = originalConsole[method]; });
  });

  function load() {
    jest.resetModules();

    jest.mock('../../../../src/server/utils/logging/attachRequestSpies');
    jest.mock('../../../../src/server/utils/logging/timing', () => ({
      startTimer: jest.fn(),
      measureTime: jest.fn(() => 12),
    }));
    attachRequestSpies = require('../../../../src/server/utils/logging/attachRequestSpies').default;
    ({ startTimer } = require('../../../../src/server/utils/logging/timing'));
    logger = require('../../../../src/server/utils/logging/logger').default;
    require('../../../../src/server/utils/logging/setup');
    jest.spyOn(logger, 'info').mockImplementation(() => 0);
  }

  it('replaces the global console with logger', () => {
    load();
    logMethods.forEach((method) => {
      expect(console[method].name).toBe('bound hookWrappedLog');
      expect(console[method]).not.toBe(originalConsole[method]);
    });
  });

  it('spies on requests', () => {
    load();
    expect(attachRequestSpies).toHaveBeenCalledTimes(1);
  });

  describe('logging outgoing requests', () => {
    function createExternalRequestAndParsedUrl() {
      const externalRequestHeaders = {
        'correlation-id': '123',
        host: 'example.com',
        referer: 'https://example.com/other-place',
        'user-agent': 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
      };
      const externalRequest = {
        method: 'GET',
        getHeader: jest.fn((name) => externalRequestHeaders[name]),
        res: {
          statusCode: 200,
          statusMessage: 'OK',
        },
      };
      const parsedUrl = url.parse('https://example.com/place');
      return { externalRequest, parsedUrl, externalRequestHeaders };
    }

    it('starts a timer when the request starts', () => {
      const { externalRequest } = createExternalRequestAndParsedUrl();
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestSpy = attachRequestSpies.mock.calls[0][0];
      outgoingRequestSpy(externalRequest);
      expect(startTimer).toHaveBeenCalledTimes(1);
      expect(startTimer).toHaveBeenCalledWith(externalRequest);
    });

    it('is level info', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info.mock.calls[0]).toMatchSnapshot();
    });

    it('uses the correlation id header if present', () => {
      const {
        externalRequest,
        externalRequestHeaders,
        parsedUrl,
      } = createExternalRequestAndParsedUrl();
      externalRequestHeaders['correlation-id'] = '1234';
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('correlationId', '1234');
    });

    it('uses undefined for the correlation id header if not present', () => {
      // TODO: add holocron API to edit the request so we can add tracing/correlationId headers
      const {
        externalRequest,
        externalRequestHeaders,
        parsedUrl,
      } = createExternalRequestAndParsedUrl();
      delete externalRequestHeaders['correlation-id'];
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('correlationId', undefined);
    });

    it('uses the status code if present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      externalRequest.res.statusCode = 200;
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusCode', 200);
    });

    it('uses null for the status code if not present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      delete externalRequest.res.statusCode;
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusCode', null);
    });

    it('uses the status text if present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      externalRequest.res.statusMessage = 'OK';
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusText', 'OK');
    });

    it('uses null for the status text if not present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      delete externalRequest.res.statusMessage;
      load();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusText', null);
    });
  });
});
