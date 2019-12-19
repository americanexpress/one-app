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

import snakeCaseToCamelCase from '../../../src/server/utils/snakeCaseToCamelCase';

describe('snakeCaseToCamelCase', () => {
  const strings = [
    { snake: 'ENVIRONMENT_VARIABLE', camel: 'environmentVariable' },
    { snake: 'REDUX_STORE_VALUE', camel: 'reduxStoreValue' },
    { snake: 'SOME_RANDOM_WORD_THAT_I_LIKE', camel: 'someRandomWordThatILike' },
    { snake: 'I_LIKE_TURTLES', camel: 'iLikeTurtles' },
    { snake: 'my_favorite_color', camel: 'myFavoriteColor' },
    { snake: 'WORD', camel: 'word' },
    { snake: 'suspect_name', camel: 'suspectName' },

  ];

  strings.forEach(({ snake, camel }) => {
    it(`${snake} becomes ${camel}`, () => {
      expect(snakeCaseToCamelCase(snake)).toBe(camel);
    });
  });
});
