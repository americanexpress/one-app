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
import { exec } from 'child_process';
import path from 'path';
import zlib from 'zlib';
import { Writable, pipeline } from 'stream';
import { promisify } from 'util';

import glob from 'glob';
import table from 'markdown-table';

import { version } from '../../package.json';

const fsp = {
  readdir: promisify(fs.readdir),
  lstat: promisify(fs.lstat),
};

const execp = promisify(exec);

function globp(...opts) {
  return new Promise((res, rej) => {
    opts.push((err, fileList) => {
      if (err) {
        rej(err);
      } else {
        res(fileList);
      }
    });
    glob(...opts);
  });
}

function humanSize(bytes) {
  const ONE_KB = 1024;
  const ONE_MB = 1024 * ONE_KB;

  if (bytes < ONE_KB) {
    return `${bytes}B`;
  }
  if (bytes < ONE_MB) {
    return `${Math.floor(bytes / (ONE_KB / 10)) / 10}KB`;
  }
  return `${Math.floor(bytes / (ONE_MB / 10)) / 10}MB`;
}

function getGzipSize(filePath) {
  let bytesWritten = 0;
  const byteCounter = new Writable({
    write(chunk, encoding, callback) {
      // we control the input stream, will always be a Buffer
      bytesWritten += chunk.length;
      callback();
    },
  });

  return new Promise((res, rej) => {
    pipeline(
      fs.createReadStream(filePath),
      zlib.createGzip({ level: 9 }),
      byteCounter,
      (err) => {
        if (err) {
          rej(err);
        }
        res(bytesWritten);
      }
    );
  });
}

function resolveAndStoreKey(keyname, objects) {
  return Promise
    .all(objects.map((object) => object[keyname]))
    .then((resolvedValues) => {
      objects.forEach((object, index) => {
        // storing the resolved value instead of the resolved Promise
        /* eslint-disable-next-line no-param-reassign */
        object[keyname] = resolvedValues[index];
      });
      return objects;
    });
}

export default function bundleSizes() {
  return schedule(
    execp('NODE_ENV=production npm run build')
      .then(() => globp(`app/${version}*`, { cwd: path.resolve(__dirname, '../../build') }))
      .then(([buildPath]) => path.join(path.resolve(__dirname, '../../build'), buildPath))
      .then((fullBuildPath) => globp('{legacy/,}*.js', { cwd: fullBuildPath })
        .then((fileList) => ({
          fullBuildPath,
          fileList,
        }))
      )
      .then(({ fullBuildPath, fileList }) => resolveAndStoreKey('stats', fileList.map((fileName) => {
        const filePath = path.resolve(fullBuildPath, fileName);
        return {
          fileName,
          filePath,
          stats: fsp.lstat(filePath),
        };
      })))
      .then((fileInfo) => fileInfo.filter(({ stats }) => !stats.isDirectory()))
      .then((fileInfo) => fileInfo.sort((a, b) => {
        const fileNameDepthDiff = a.fileName.split('/').length - b.fileName.split('/').length;
        if (fileNameDepthDiff !== 0) {
          return fileNameDepthDiff;
        }
        const aBaseName = path.basename(a.fileName);
        const bBaseName = path.basename(b.fileName);

        // named chunks first
        if (/^[a-z]/i.test(aBaseName) && /^\d/.test(bBaseName)) { return -1; }
        if (/^[a-z]/i.test(bBaseName) && /^\d/.test(aBaseName)) { return 1; }

        const baseNameDiff = aBaseName.length - bBaseName.length;
        if (baseNameDiff !== 0) {
          return baseNameDiff;
        }

        return [aBaseName, bBaseName].sort()[0] === aBaseName ? -1 : 1;
      }))
      .then((fileInfo) => resolveAndStoreKey('gzipSize', fileInfo.map(({ filePath, ...otherInfo }) => ({
        filePath,
        ...otherInfo,
        gzipSize: getGzipSize(filePath),
      }))))
      .then((fileInfo) => {
        markdown(`\
### 📊 Bundle Size Report

${table(
    [
      ['file name', 'size on disk', 'gzip'],
    ].concat(
      fileInfo.map(({ fileName, stats, gzipSize }) => [
        fileName,
        humanSize(stats.size),
        humanSize(gzipSize),
      ])
    ),
    { align: ['l', 'r', 'r'] }
  )}
        `);
      })
  );
}
