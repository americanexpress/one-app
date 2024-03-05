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

import https from 'node:https';
import http from 'node:http';
import url from 'node:url';
import onFinished from 'on-finished';

export function attachSpy(obj, methodName, spy) {
  const origMethod = obj[methodName];

  if (typeof origMethod !== 'function') {
    throw new TypeError(`${methodName} is not a function`);
  }

  if (typeof spy !== 'function') {
    throw new TypeError(`spy must be a function (was "${typeof spy}")`);
  }

  // we're monkeypatching, we need to reassign a property of the obj argument
  // eslint-disable-next-line no-param-reassign -- see above comment
  obj[methodName] = function spiedMethod(...args) {
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

function buildUrlObject(options, defaultProtocol) {
  // TODO: url.parse is deprecated, use new URL() instead
  // this is not a 1:1 replacement and will require changes.
  // Currently the parsed url is used to provide href to
  // loggers outgoingRequestEndSpy function.
  // https://github.com/americanexpress/one-app/blob/main/src/server/utils/logging/setup.js#L42
  // https://nodejs.org/api/url.html#urlparseurlstring-parsequerystring-slashesdenotehost
  const parsedPath = url.parse(options.path || '/');
  const protocol = options.protocol || `${defaultProtocol}:`;
  const urlObject = {
    auth: options.auth,
    hostname: options.hostname || options.host || 'localhost',
    protocol,
    port: options.port || (protocol === 'http:' ? 80 : 443),
    hash: parsedPath.hash,
    path: parsedPath.path,
    pathname: parsedPath.pathname,
    query: parsedPath.query,
    search: parsedPath.search,
  };
  if (
    (protocol === 'http:' && urlObject.port === 80)
    || (protocol === 'https:' && urlObject.port === 443)
  ) {
    urlObject.port = undefined;
  }
  return urlObject;
}

function parseUrl(options, defaultProtocol) {
  // some data is not stored in the clientRequest, have to duplicate some parsing
  // adapted from https://github.com/nodejs/node/blob/894203dae39c7f1f36fc6ba126bb5d782d79b744/lib/_http_client.js#L22
  if (typeof options === 'string') {
    return url.parse(options);
  }

  return url.parse(url.format(buildUrlObject(options, defaultProtocol)));
}

function httpSpy(defaultProtocol, requestSpy, socketCloseSpy) {
  return (args, callOriginal) => {
    const options = args[0];
    const clientRequest = callOriginal();
    const parsedUrl = parseUrl(options, defaultProtocol);

    requestSpy(clientRequest, parsedUrl);

    if (socketCloseSpy) {
      onFinished(clientRequest, () => socketCloseSpy(clientRequest, parsedUrl));
    }
  };
}

export default function attachRequestSpies(requestSpy, socketCloseSpy) {
  if (typeof requestSpy !== 'function') {
    throw new TypeError(`requestSpy must be a function (was "${typeof requestSpy}")`);
  }

  if (socketCloseSpy && (typeof socketCloseSpy !== 'function')) {
    throw new TypeError(
      `socketCloseSpy must be function if provided (was "${typeof socketCloseSpy}")`);
  }

  attachSpy(https, 'request', httpSpy('https', requestSpy, socketCloseSpy));
  attachSpy(http, 'request', httpSpy('http', requestSpy, socketCloseSpy));
}
