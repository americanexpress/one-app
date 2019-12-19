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

import fs from 'fs';

import readJsonFile from '../../../src/server/utils/readJsonFile';

jest.mock('fs');

describe('readJsonFile', () => {
  it('is a function', () => {
    expect(readJsonFile).toEqual(expect.any(Function));
  });

  it('parses JSON from the filesystem', () => {
    const testData = { a: ['b'] };
    fs.readFileSync.mockReturnValueOnce(JSON.stringify(testData));
    expect(readJsonFile('../file.json')).toEqual(testData);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/src\/server\/file\.json$/), 'utf8');
  });
});
