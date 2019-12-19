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

import createTimeoutFetch, { TimeoutError } from '../../../src/universal/utils/createTimeoutFetch';

function resolveInMs(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Fetch Resolved'), ms);
  });
}

jest.useFakeTimers();

describe('createTimeoutFetch', () => {
  it('should reject if the response takes longer than the given default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(3000));
    const enhancedFetch = createTimeoutFetch(1000)(mockFetch);
    const promise = enhancedFetch('/test');
    // added buffer of about 500, because the promises can
    // resolve/reject a little after the fake timers.
    jest.runTimersToTime(1500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 1000ms'));
  });

  it('should reject if the response takes longer than custom timeout that is longer than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(6000));
    const enhancedFetch = createTimeoutFetch(4000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 5000 });
    jest.runTimersToTime(5500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 5000ms'));
  });

  it('should reject if the response takes longer than custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(4000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 2000 });
    jest.runTimersToTime(2500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 2000ms'));
  });

  it('should resolve if the response finishes before the default timeout', async () => {
    const mockFetch = jest.fn(() => resolveInMs(1000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test');
    jest.runTimersToTime(1500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('should resolve if the response finishes before the custom timeout that is longer than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(2000));
    const enhancedFetch = createTimeoutFetch(1000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 3000 });
    jest.runTimersToTime(2500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('should resolve if the response finishes before the custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(1000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 2000 });
    jest.runTimersToTime(1500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });
});

describe('TimeoutError', () => {
  let error;
  const msg = 'dark void of nothingness';

  beforeEach(() => {
    error = new TimeoutError(msg);
  });

  it('should be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of TimeoutError', () => {
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it('should be named "TimeoutError"', () => {
    expect(error.name).toEqual('TimeoutError');
  });

  it('should have the message given', () => {
    expect(error.message).toEqual(msg);
  });

  it('should have a stack, if available', () => {
    const testError = new Error('test');
    if (!testError.stack) {
      // runtime doesn't support this property
      return;
    }

    expect(typeof error.stack).toBe(typeof testError.stack);
  });
});
