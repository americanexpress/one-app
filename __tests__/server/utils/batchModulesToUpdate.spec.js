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

import batchModulesToUpdate from '../../../src/server/utils/batchModulesToUpdate';

jest.mock('../../../src/server/utils/stateConfig', () => ({
  getServerStateConfig: jest.fn(() => ({ rootModuleName: 'my-root' })),
}));

describe('batchModulesToUpdate', () => {
  beforeEach(() => jest.clearAllMocks());

  const modules = [...new Array(65)].map((x, i) => `module-${i}`);
  const modulesWithoutRoot = [...modules];
  modules.splice(20, 0, 'my-root');

  it('should put the root module first', () => {
    const result = batchModulesToUpdate(modules);
    expect(result[0]).toEqual(['my-root']);
  });

  it('should batch the rest of the modules in tens', () => {
    expect.assertions(10);
    const result = batchModulesToUpdate(modules);
    expect(result.length).toBe(8);
    result.forEach((arr, i) => {
      let expectedLength;
      if (i === 0) {
        expectedLength = 1;
      } else if (i < 7) {
        expectedLength = 10;
      } else if (i === 7) {
        expectedLength = 5;
      }
      expect(arr.length).toBe(expectedLength);
    });
    expect(JSON.stringify(result)).toMatchSnapshot();
  });

  it('should handle the root module only', () => {
    const result = batchModulesToUpdate(['some-root']);
    expect(result).toEqual([['some-root']]);
  });

  it('should batch modules in tens when there is no root module', () => {
    expect.assertions(9);
    const result = batchModulesToUpdate(modulesWithoutRoot);
    expect(result.length).toBe(7);
    result.forEach((arr, i) => {
      expect(arr.length).toBe(i < 6 ? 10 : 5);
    });
    expect(JSON.stringify(result)).toMatchSnapshot();
  });
});
