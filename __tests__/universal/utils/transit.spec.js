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
import {
  Map, OrderedMap, List, Set, OrderedSet, Record,
} from 'immutable';
import { TimeoutError } from '../../../src/universal/utils/createTimeoutFetch';

describe('transit', () => {
  let { default: transit } = require('../../../src/universal/utils/transit');
  const { writeError } = require('../../../src/universal/utils/transit');
  function transform(input) {
    return transit.fromJSON(transit.toJSON(input));
  }

  describe('writeError', () => {
    it('should remove internal URLs and stacks from errors', () => {
      const privateUrl = 'http://localhost:3002/an/example/endpoint';
      const inputError = new Error(`Internal Server Error (${privateUrl})`);
      inputError.response = {
        url: privateUrl,
        status: 500,
      };
      expect(writeError(inputError)).toMatchSnapshot();
    });
  });

  it('should output an equal Map fromJSON as that was input toJSON', () => {
    const input = new Map({ test: '123' });
    expect(transform(input)).toEqual(input);
  });

  it('should output an equal OrderedMap fromJSON as that was input toJSON', () => {
    const input = new OrderedMap({ foo: '123', bar: '456' });
    expect(transform(input)).toEqual(input);
  });

  it('should output an equal List fromJSON as that was input toJSON', () => {
    const input = new List([1, 2, 3]);
    expect(transform(input)).toEqual(input);
  });

  it('should output an equal Set fromJSON as that was input toJSON', () => {
    const input = new Set([1, 2, 3]);
    expect(transform(input)).toEqual(input);
  });

  it('should output an equal OrderedSet fromJSON as that was input toJSON', () => {
    const input = new OrderedSet([1, 2, 3]);
    expect(transform(input)).toEqual(input);
  });

  it('should output an equal Record fromJSON as that was input toJSON', () => {
    const MyRecord = new Record({ a: 1, b: 2 }, 'MyRecord');
    const input = new MyRecord({ b: 3 });
    const recordTransit = transit.withRecords([MyRecord]);
    const output = recordTransit.fromJSON(recordTransit.toJSON(input));
    expect(output.equals(input)).toBe(true);
  });

  it('should serialize an Error into an object', () => {
    const input = new Error('test');
    expect(transform(input)).toEqual(input);
  });

  it('should serialize a TimeoutError into an object', () => {
    const input = new TimeoutError();
    expect(transform(input)).toEqual(input);
  });

  it('should convert Functions to null', () => {
    const input = () => 0;
    expect(transform(input)).toBe(null);
  });

  it('should convert Promises to null', () => {
    const input = new Promise(() => 0);
    const output = transform(input);
    expect(output).toBe(null);
  });

  it('should serialize a Url', () => {
    const input = url.parse('http://my.example.com');
    const output = transform(input);
    expect(output).toEqual(input);
  });

  it('should serialize an absolute URL in the browser', () => {
    global.BROWSER = true;
    jest.resetModules();
    transit = require('../../../src/universal/utils/transit').default;
    const input = new URL('http://my.example.com');
    const output = transform(input);
    expect(output).toEqual(input);
    delete global.BROWSER;
  });

  it('should serialize a relative URL in the browser', () => {
    // first, the value the server will send
    const input = url.parse('./location');
    // `delete global.BROWSER;` does not work
    global.BROWSER = false;
    jest.resetModules();
    transit = require('../../../src/universal/utils/transit').default;
    const serialized = transit.toJSON(input);

    // then, the deserialization on the browser
    global.BROWSER = true;
    jest.resetModules();
    transit = require('../../../src/universal/utils/transit').default;
    // defaults to `about:blank`, cpojer recommendation:
    // https://github.com/facebook/jest/issues/890#issuecomment-209698782

    window.location.href = 'http://example.com/another/foo';
    const output = transit.fromJSON(serialized);

    expect(output).toEqual(new URL('http://example.com/another/location'));
    delete global.BROWSER;
  });
});
