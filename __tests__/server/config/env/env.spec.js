/*
 * Copyright 2021 American Express Travel Related Services Company, Inc.
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

import path from 'path';

jest.mock('yargs', () => ({ argv: { rootModuleName: 'my-module' } }));

try {
  jest.doMock(path.join(process.cwd(), 'static', 'module-map.json'), () => {
    throw new Error('bad module map path');
  });
} catch (e) {
  jest.fn();
}

describe('env', () => {
  test('moduleMap field is undefined if module map path non-existent', () => {
    const environment = require('../../../../src/server/config/env/env');
    expect(environment.default.moduleMap).toBe('no such path');
    expect(environment.default.rootModuleNameDuplicate).toBeFalsy();
  });
});
