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

import getObjectValueAtPath from '../../../src/server/utils/getObjectValueAtPath';

describe('getObjectValueAtPath', () => {
  const obj = {
    foo: {
      name: 'Sally',
      hello: true,
      dog: 'woof',
      stuff: [6, 9, 56, { moreNumbers: [14, 88, 101] }],
    },
    bar: [
      55,
      {
        color: 'pink', hello: false, animals: ['cat', 'parrot', 'sugar glider'], 'favorite-numbers': [12, 34, 6, 19, 8],
      }],
  };

  const paths = [
    { path: 'foo.name', value: 'Sally' },
    { path: 'foo.hello', value: true },
    { path: 'foo.dog', value: 'woof' },
    { path: 'foo.stuff[2]', value: 56 },
    { path: 'foo.stuff[3].moreNumbers[1]', value: 88 },
    { path: 'bar[0]', value: 55 },
    { path: 'bar[1][color]', value: 'pink' },
    { path: 'bar[1].hello', value: false },
    { path: 'bar[1].animals[2]', value: 'sugar glider' },
    { path: 'bar[1][favorite-numbers][4]', value: 8 },
  ];

  describe('should display correct path', () => {
    paths.forEach(({ path, value }) => {
      it(`path ${path} should result in ${value}`, () => {
        expect(getObjectValueAtPath(obj, path)).toBe(value);
      });
    });
  });
  it('should display defaultValue if path value is undefined', () => {
    expect(getObjectValueAtPath(obj, 'foo.undefinedPath[3]', 'default')).toBe('default');
  });
});
