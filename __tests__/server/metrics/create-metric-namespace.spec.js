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

import createMetricNamespace from '../../../src/server/metrics/create-metric-namespace';

describe('createMetricNamespace', () => {
  it('throws if the namespace is multiple words', () => {
    expect(() => createMetricNamespace('party_corgi')).toThrowErrorMatchingSnapshot();
  });

  it('returns a function to create namespaces metrics with', () => {
    expect(createMetricNamespace('corgi')).toBeInstanceOf(Function);
  });

  describe('namespace', () => {
    it('does not throw if not given units', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party')).not.toThrowError();
    });

    it('throws if given more than two units', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party', 'bytes_seconds_total')).toThrowErrorMatchingSnapshot();
    });

    it('throws if given more than one unit and one is not "total"', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party', 'bytes_seconds')).toThrowErrorMatchingSnapshot();
    });

    it('throws if given two units and the last one is not "total"', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party', 'total_seconds')).toThrowErrorMatchingSnapshot();
    });

    it('throws if given two units and the first one is "total"', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party', 'total_total')).toThrowErrorMatchingSnapshot();
    });

    it('throws if given an unknown unit', () => {
      const ns = createMetricNamespace('corgi');
      expect(() => ns('party', 'bits')).toThrowErrorMatchingSnapshot();
    });

    it('returns a metric name without units', () => {
      const ns = createMetricNamespace('corgi');
      expect(ns('party')).toBe('oneapp_corgi_party');
    });

    it('returns a metric name with units', () => {
      const ns = createMetricNamespace('corgi');
      expect(ns('party', 'seconds')).toBe('oneapp_corgi_party_seconds');
    });

    it('returns a metric name with two units', () => {
      const ns = createMetricNamespace('corgi');
      expect(ns('party', 'seconds_total')).toBe('oneapp_corgi_party_seconds_total');
    });

    describe('getMetricNames', () => {
      it('is a function', () => {
        const ns = createMetricNamespace('corgi');
        expect(ns.getMetricNames).toBeInstanceOf(Function);
      });

      it('returns an object', () => {
        const ns = createMetricNamespace('corgi');
        expect(ns.getMetricNames()).toBeInstanceOf(Object);
        expect(typeof ns.getMetricNames()).toBe('object');
      });

      it('returns an object with camelCase\'d keys', () => {
        const ns = createMetricNamespace('corgi');
        ns('party_rainbow');
        expect(ns.getMetricNames()).toHaveProperty('partyRainbow');
      });

      it('returns an object with metric name values', () => {
        const ns = createMetricNamespace('corgi');
        ns('party_rainbow');
        expect(ns.getMetricNames()).toHaveProperty('partyRainbow', 'oneapp_corgi_party_rainbow');
      });
    });
  });
});
