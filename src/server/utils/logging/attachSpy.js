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

export default function attachSpy(obj, methodName, spy) {
  const origMethod = obj[methodName];

  if (typeof origMethod !== 'function') {
    throw new TypeError(`${methodName} is not a function`);
  }

  if (typeof spy !== 'function') {
    throw new TypeError(`spy must be a function (was "${typeof spy}")`);
  }

  // we're monkeypatching, we need to reassign a property of the obj argument
  // eslint-disable-next-line no-param-reassign -- see above comment
  obj[methodName] = function monkeypatchedMethod(...args) {
    let returnValue;
    let originalCalled = false;
    const callOriginal = () => {
      originalCalled = true;
      returnValue = origMethod.apply(obj, args);
      return returnValue;
    };

    spy([...args], callOriginal);

    if (!originalCalled) {
      callOriginal();
    }

    return returnValue;
  };
}
