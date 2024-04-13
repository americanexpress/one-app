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

const fs = require('node:fs/promises');
const path = require('node:path');

async function updateTarget(targetHost) {
  await fs.writeFile(path.resolve(__dirname, '..', '..', 'prometheus', 'targets.json'), `${JSON.stringify([
    {
      targets: [targetHost],
      labels: {
        group: 'one-app-metrics',
      },
    },
  ], null, 2)}\n`);
}

module.exports = updateTarget;
