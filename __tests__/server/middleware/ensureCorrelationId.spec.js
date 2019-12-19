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

const ensureCorrelationId = require('../../../src/server/middleware/ensureCorrelationId').default;

describe('ensureCorrelationId', () => {
  function generateSamples() {
    const req = {
      headers: {},
    };
    const res = null;
    const next = jest.fn();
    return { req, res, next };
  }

  it('uses correlation_id for correlation-id on a request without correlation-id', () => {
    const { req, res, next } = generateSamples();
    delete req.headers['correlation-id'];
    req.headers.correlation_id = 'cloudy';
    ensureCorrelationId(req, res, next);
    expect(req.headers).toHaveProperty('correlation-id', 'cloudy');
  });

  it('uses unique_id for correlation-id on a request without correlation-id or correlation_id', () => {
    const { req, res, next } = generateSamples();
    delete req.headers['correlation-id'];
    delete req.headers.correlation_id;
    req.headers.unique_id = 'thunderstorms';
    ensureCorrelationId(req, res, next);
    expect(req.headers).toHaveProperty('correlation-id', 'thunderstorms');
  });

  it('adds a correlation-id header to a request without anything', () => {
    const { req, res, next } = generateSamples();
    delete req.headers['correlation-id'];
    ensureCorrelationId(req, res, next);
    expect(req.headers).toHaveProperty('correlation-id');
    expect(typeof req.headers['correlation-id']).toBe('string');
  });

  it('does not change an existing correlation-id header on a request', () => {
    const { req, res, next } = generateSamples();
    req.headers['correlation-id'] = 'exists';
    ensureCorrelationId(req, res, next);
    expect(req.headers).toHaveProperty('correlation-id', 'exists');
  });

  it('calls the next middleware', () => {
    const { req, res, next } = generateSamples();
    expect(next).not.toHaveBeenCalled();
    ensureCorrelationId(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
