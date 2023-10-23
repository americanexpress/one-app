/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import util from 'node:util';
import { argv } from 'yargs';

export default {
  level: argv.logLevel,
  customLevels: {
    log: 35,
  },
  dedupe: true,
  errorKey: 'error',
  messageKey: 'message',
  hooks: {
    logMethod(inputArgs, method) {
      if (inputArgs.length > 1) {
        let error;
        if (inputArgs[0] instanceof Error) error = inputArgs.shift();
        if (inputArgs[inputArgs.length - 1] instanceof Error) error = inputArgs.pop();
        if (error) {
          const message = util.format(...inputArgs);
          return method.call(this, { error, message });
        }
      }
      return method.apply(this, inputArgs);
    },
  },
};
