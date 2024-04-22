/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

const fs = require('node:fs');
const path = require('node:path');
const { diffArrays } = require('diff');
const {
  green, red, dim, underline, strikethrough,
} = require('colorette');
const getResultDir = require('./getResultDir');

function createCoerceTestId(optionName) {
  return function coerceTestId(arg) {
    const dir = /^[./~]/.test(arg) ? path.resolve(process.cwd(), arg) : getResultDir(arg);
    const id = path.basename(dir);

    const dirContents = fs.readdirSync(dir).sort();
    const expectedContents = ['k6-out.json', 'k6-summary.json', 'metrics-k6.json', 'metrics-prom.json'].sort();

    if (!expectedContents.every((file) => dirContents.includes(file))) {
      const contentsDiff = diffArrays(expectedContents, dirContents, { ignoreWhitespace: true });
      const printDiff = contentsDiff.map((part) => (part.added ? strikethrough(green(part.value))
        // eslint-disable-next-line unicorn/no-nested-ternary -- conflicting rules
        : part.removed ? red(part.value) : dim(part.value)));

      throw new Error(`${red(`Bad option ${underline(optionName)}:`)}\n  Invalid test result directory: ${dir}\n\n  ${printDiff.join(', ')}`);
    }

    return { dir, id };
  };
}

module.exports = createCoerceTestId;
