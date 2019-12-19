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

export default function readJsonFile(filePath) {
  switch (filePath.split('/').pop()) {
    case '.build-meta.json':
      return { buildVersion: '1.2.3-rc.4-abc123' };
    case 'bundle.integrity.manifest.json':
      return {
        'web.js': '123',
        'named-chunk.js': '456',
        'other-chunk.js': '789',
        'legacy/web.js': 'abc',
        'legacy/named-chunk.js': 'def',
        'legacy/other-chunk.js': 'ghi',
      };
    case '.webpack-stats.browser.json':
    case '.webpack-stats.legacyBrowser.json':
      return {
        version: '0.0.1', // Version of webpack used for the compilation
        hash: '11593e3b3ac85436984a', // Compilation specific hash
        time: 2469, // Compilation time in milliseconds
        filteredModules: 0, // A count of excluded modules when exclude is passed to toJson
        outputPath: '/', // path to webpack output directory
        assetsByChunkName: {
          // Chunk name to emitted asset(s) mapping
          main: 'web.js?h=11593e3b3ac85436984a',
          'named-chunk': 'named-chunk.web.js',
          'other-chunk': [
            'other-chunk.js',
            'other-chunk.css',
          ],
        },
        assets: [
          // A list of asset objects
        ],
        chunks: [
          // A list of chunk objects
        ],
        modules: [
          // A list of module objects
        ],
        errors: [
          // A list of error strings
        ],
        warnings: [
          // A list of warning strings
        ],
      };
    default:
      throw new Error('Couldn\'t find JSON file to read');
  }
}
