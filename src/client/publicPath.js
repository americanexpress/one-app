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

// eslint-disable-next-line no-underscore-dangle
if (global.__webpack_public_path__) {
  // https://github.com/webpack/webpack/issues/2776#issuecomment-233208623
  // have to make the assignment inside of the compiled code
  // webpack ignores the global variable

  // this var is defined by webpack
  // eslint-disable-next-line no-undef, camelcase, prefer-destructuring, no-underscore-dangle
  __webpack_public_path__ = global.__webpack_public_path__;
}
