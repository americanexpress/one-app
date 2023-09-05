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

import util from 'util';
import { argv } from 'yargs';

export default {
  level: argv.logLevel,
  customLevels: {
    log: 35,
  },
  dedupe: true,
  errorKey: 'error',
  hooks: {
    logMethod(inputArgs, method) {
      if (inputArgs.length > 1) {
        let error;
        if (inputArgs[0] instanceof Error) error = inputArgs.shift();
        if (inputArgs[inputArgs.length - 1] instanceof Error) error = inputArgs.pop();
        if (error) {
          const message = util.format(...inputArgs);
          // TODO: The default message key "msg" is required here to prevent
          // duplicate messages in entry. Production log formatter replaces "msg" from these
          // logs with "message". Change the key to message once bug is resolved.
          // https://github.com/pinojs/pino/issues/1790
          return method.call(this, { error, msg: message });
        }
      }
      return method.apply(this, inputArgs);
    },
  },
};
