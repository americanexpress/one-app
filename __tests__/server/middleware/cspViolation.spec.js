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

jest.mock('yargs', () => ({ argv: {} }));

describe('cspViolation', () => {
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const end = jest.fn();
  const res = { status: jest.fn(() => ({ end })) };

  function load(development) {
    jest.resetModules();

    if (development) {
      process.env.NODE_ENV = 'development';
    } else {
      process.env.NODE_ENV = 'production';
    }

    return require('../../../src/server/middleware/cspViolation').default;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('development', () => {
    it('should respond with a 204 No Content', () => {
      const cspViolation = load(true);
      cspViolation({ data: 'hello' }, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should end the request', () => {
      const cspViolation = load(true);
      cspViolation({ body: 'hello' }, res);
      expect(end).toHaveBeenCalled();
    });

    it('should log the request body', () => {
      const sampleViolationReport = {
        'csp-report': {
          'document-uri': 'http://localhost:3000/start',
          referrer: '',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'",
          disposition: 'enforce',
          'blocked-uri': 'eval',
          'line-number': 5,
          'column-number': 54,
          'source-file': 'http://analytics.example.com',
          'status-code': 200,
          'script-sample': '',
        },
      };
      const cspViolation = load(true);
      cspViolation({ body: sampleViolationReport }, res);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0]).toMatchSnapshot();
    });

    it('log message about missing request body when not provided in request', () => {
      const cspViolation = load(true);
      cspViolation({}, res);
      const expected = 'CSP Violation reported, but no data received';
      expect(consoleSpy).toHaveBeenCalledWith(expected);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(end).toHaveBeenCalled();
    });
  });

  describe('production', () => {
    it('should respond with a 204 No Content', () => {
      const cspViolation = load();
      cspViolation({ body: 'hello' }, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should end the request', () => {
      const cspViolation = load();
      cspViolation({ body: 'hello' }, res);
      expect(end).toHaveBeenCalled();
    });

    it('should log the request body', () => {
      const sampleViolationReport = {
        'csp-report': {
          'document-uri': 'http://localhost:3000/start',
          referrer: '',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'",
          disposition: 'enforce',
          'blocked-uri': 'eval',
          'line-number': 5,
          'column-number': 54,
          'source-file': 'http://analytics.example.com',
          'status-code': 200,
          'script-sample': '',
        },
      };
      const cspViolation = load();
      const expectBody = JSON.stringify(sampleViolationReport, null, 2);
      cspViolation({ body: sampleViolationReport }, res);
      const expected = `CSP Violation: ${expectBody}`;
      expect(consoleSpy).toHaveBeenCalledWith(expected);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(end).toHaveBeenCalled();
    });

    it('log message about missing request body when not provided in request', () => {
      const cspViolation = load();
      cspViolation({}, res);
      const expected = 'CSP Violation: No data received!';
      expect(consoleSpy).toHaveBeenCalledWith(expected);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(end).toHaveBeenCalled();
    });
  });
});
