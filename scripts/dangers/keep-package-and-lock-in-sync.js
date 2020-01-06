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

import {
  ValidateHost,
  ValidateHttps,
  ValidateScheme,
  ParseLockfile,
} from 'lockfile-lint-api';

const defaultLockfilePath = `${process.cwd()}/package-lock.json`;
const defaultSchemes = ['npm'];

export function lockFileLint(
  pathToLockFile = defaultLockfilePath,
  {
    schemes = defaultSchemes,
    scheme = false,
    host = true,
    protocol = true,
    basePath = pathToLockFile,
  } = {}
) {
  const options = {
    lockfilePath: pathToLockFile,
  };

  const parser = new ParseLockfile(options);
  const lockfile = parser.parseSync();
  const validators = [];

  if (host) {
    validators.push(
      [new ValidateHost({
        packages: lockfile.object,
      }), {
        onSuccess() {
          message(`[lock-files] ${basePath} has passed host validation`);
        },
      }]
    );
  }

  if (protocol) {
    validators.push(
      [new ValidateHttps({
        packages: lockfile.object,
      }), {
        onSuccess() {
          message(`[lock-files] ${basePath} has passed protocol validation`);
        },
      }]
    );
  }

  if (scheme) {
    validators.push(
      [new ValidateScheme({
        packages: lockfile.object,
      }), {
        onSuccess() {
          message(`[lock-files] ${basePath} has passed scheme validation`);
        },
      }]
    );
  }

  validators.forEach(([validator, {
    validate = (opts) => validator.validate(opts),
    onWarn = (...args) => warn(...args),
    onError = (...args) => fail(...args),
    onSuccess = (...args) => message(...args),
  }]) => {
    let result;
    try {
      result = validate(schemes);
    } catch (error) {
      onWarn(error);
    }

    if (result && result.type === 'success') {
      onSuccess();
    } else if (result  && result.type === 'error') {
      result.errors.forEach((error) => onError(
        `\n${error.message}\n\nat ${basePath}\n`,
        basePath,
        1
      ));
    }
  });
}

export function runLockFilesValidation({ linting = true } = {}) {
  const cwd = process.cwd();
  const lockfiles = danger.git.fileMatch('**/package-lock.json');

  if (linting) {
    const {
      modified,
      created,
      // TODO: pair each package-lock.with package.json, make sure they are not deleted
      // deleted,
      edited,
      validate = new Set([].concat(modified, created, edited)),
    } = lockfiles.getKeyedPaths();

    validate.forEach((basePath) => {
      lockFileLint(`${cwd}/${basePath}`, {
        basePath,
      });
    });
  }
}

export default function keepPackageAndLockInSync() {
  const changedFiles = [
    ...danger.git.modified_files,
    ...danger.git.created_files,
    ...danger.git.deleted_files,
  ];

  if (danger.git.deleted_files.includes('package-lock.json')) {
    fail('Do not delete the lockfile', 'package-lock.json', 1);
  }

  const packageChanged = changedFiles.includes('package.json');
  const lockfileChanged = changedFiles.includes('package-lock.json');

  if (packageChanged && !lockfileChanged) {
    const message = 'Changes were made to package.json, but not to package-lock.json';
    const idea = 'Perhaps you need to run `npm install`?';
    warn(`${message} - _${idea}_`, 'package.json');
  }

  if (!packageChanged && lockfileChanged) {
    const message = 'Changes were made to package-lock.json, but not to package.json';
    const worry = 'Are you reverting package-lock to the npm v5 format?';
    warn(`${message} - _${worry}_`, 'package-lock.json');
  }

  runLockFilesValidation();
}
