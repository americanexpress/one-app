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

import attachSpy from '../../../../src/server/utils/logging/attachSpy';

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
