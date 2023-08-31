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
import fs from 'node:fs/promises';
import path from 'node:path';

const PACKAGE_DIR_PATH = path.resolve(path.join(__dirname, '../'));

describe('package.json', () => {
  it('is parseable', async () => {
    expect.assertions(1);
    const rawPkg = await fs.readFile(path.join(PACKAGE_DIR_PATH, 'package.json'), 'utf8');
    expect(() => JSON.parse(rawPkg)).not.toThrow();
  });
  it('is formatted like npm does', async () => {
    expect.assertions(1);
    const rawPkg = await fs.readFile(path.join(PACKAGE_DIR_PATH, 'package.json'), 'utf8');
    const parsedPkg = JSON.parse(rawPkg);
    const builtPkg = { ...parsedPkg };

    [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ].forEach((listName) => {
      if (!Object.hasOwnProperty.call(parsedPkg, listName)) {
        return;
      }
      builtPkg[listName] = Object
        .entries(parsedPkg[listName])
        .sort(([packageNameA], [packageNameB]) => (
          // let the engine do the work of sorting the strings
          [packageNameA, packageNameB].sort()[0] === packageNameA ? -1 : 1)
        )
        // ECMAScript Objects do not have an order to their keys, but the V8 implementation does
        .reduce(
          (orderedList, [packageName, versionRange]) => {
            // adding properties one at a time is less bad than rebuilding (via destructuring) a
            // new object every iteration of the loop
            /* eslint-disable-next-line no-param-reassign */
            orderedList[packageName] = versionRange;
            return orderedList;
          },
          {}
        );
    });

    expect(rawPkg).toEqual(`${JSON.stringify(builtPkg, null, 2)}\n`);
  });
});
