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
}
