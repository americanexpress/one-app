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

describe('setup', () => {
  let monkeypatches;
  let logger;
  let startTimer;
  let replaceGlobalConsoleWithOtelLogger;

  function load(useOtel = false) {
    jest.resetModules();
    if (useOtel) {
      process.env.OTEL_LOG_COLLECTOR_URL = 'http://localhost:4318/v1/logs';
    } else {
      delete process.env.OTEL_LOG_COLLECTOR_URL;
    }
    jest.mock('@americanexpress/lumberjack');
    jest.mock('../../../../src/server/utils/logging/timing', () => ({
      startTimer: jest.fn(),
      measureTime: jest.fn(() => 12),
    }));
    jest.mock('../../../../src/server/utils/logging/logger', () => ({ info: jest.fn() }));
    jest.mock('../../../../src/server/utils/logging/otel/logger');

    ({ monkeypatches } = require('@americanexpress/lumberjack'));
    ({ startTimer } = require('../../../../src/server/utils/logging/timing'));
    ({ replaceGlobalConsoleWithOtelLogger } = require('../../../../src/server/utils/logging/otel/logger'));
    logger = require('../../../../src/server/utils/logging/logger');
    require('../../../../src/server/utils/logging/setup');
  }

  it('replaces the global console with lumberjack logger when not using Otel', () => {
    load();
    expect(replaceGlobalConsoleWithOtelLogger).not.toHaveBeenCalled();
    expect(monkeypatches.replaceGlobalConsole).toHaveBeenCalledTimes(1);
    expect(monkeypatches.replaceGlobalConsole).toHaveBeenCalledWith(logger);
  });

  it('replaces the global console with OTel logger when using OTel', () => {
    load(true);
    expect(monkeypatches.replaceGlobalConsole).not.toHaveBeenCalled();
    expect(replaceGlobalConsoleWithOtelLogger).toHaveBeenCalledTimes(1);
  });

  it('replaces the global console with logger', () => {
    load();
    expect(monkeypatches.replaceGlobalConsole).toHaveBeenCalledTimes(1);
    expect(monkeypatches.replaceGlobalConsole).toHaveBeenCalledWith(logger);
  });

  it('spies on HTTP requests', () => {
    load();
    expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('spies on HTTPS requests when the node major version is higher than 8', () => {
    Object.defineProperty(process, 'version', {
      writable: true,
      value: 'v10.0.0',
    });
    load();
    expect(monkeypatches.attachHttpsRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('does not spy on HTTPS requests when the node major version is 8 or lower', () => {
    Object.defineProperty(process, 'version', {
      writable: true,
      value: 'v8.0.0',
    });
    load();
    expect(monkeypatches.attachHttpsRequestSpy).not.toHaveBeenCalled();
  });

  it('does not spy on HTTPS requests when the node major version is 6 or lower', () => {
    Object.defineProperty(process, 'version', {
      writable: true,
      value: 'v6.0.0',
    });
    load();
    expect(monkeypatches.attachHttpsRequestSpy).not.toHaveBeenCalled();
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
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][0];
      outgoingRequestSpy(externalRequest);
      expect(startTimer).toHaveBeenCalledTimes(1);
      expect(startTimer).toHaveBeenCalledWith(externalRequest);
    });

    it('is level info', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      load();
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
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
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
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
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('correlationId', undefined);
    });

    it('uses the status code if present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      externalRequest.res.statusCode = 200;
      load();
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusCode', 200);
    });

    it('uses null for the status code if not present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      delete externalRequest.res.statusCode;
      load();
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusCode', null);
    });

    it('uses the status text if present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      externalRequest.res.statusMessage = 'OK';
      load();
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusText', 'OK');
    });

    it('uses null for the status text if not present', () => {
      const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
      delete externalRequest.res.statusMessage;
      load();
      expect(monkeypatches.attachHttpRequestSpy).toHaveBeenCalledTimes(1);
      const outgoingRequestEndSpy = monkeypatches.attachHttpRequestSpy.mock.calls[0][1];
      outgoingRequestEndSpy(externalRequest, parsedUrl);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request).toHaveProperty('statusText', null);
    });
  });
});
