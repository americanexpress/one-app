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

import util from 'util';

import ora from 'ora';

import dropEntryBasedOnLevel from '../level-dropper';
import {
  coloredLevels,
  printStatusCode,
  printStatusMessage,
} from './utils';

const spinners = [];

function createSpinner(opts) {
  const spinner = ora(opts);
  spinners.push(spinner);
  return spinner;
}

const oneAppDevCdnSpinner = createSpinner({
  text: 'Starting one-app-dev-cdn server...',
  spinner: 'bouncingBar',
});

const oneAppDevProxySpinner = createSpinner({
  text: 'Starting local services server',
  spinner: 'bouncingBar',
  isEnabled: false,
});

const metricsServerSpinner = createSpinner({
  text: 'Starting metrics server',
  spinner: 'bouncingBar',
  isEnabled: false,
});

const appServerSpinner = createSpinner({
  text: 'Starting app server: loading Holocron Modules...',
  spinner: 'bouncingBar',
  isEnabled: false,
});

const moduleMapSpinner = createSpinner({
  text: 'Polling Holocron Module map',
  spinner: 'bouncingBar',
  isEnabled: false,
});

function beforeWrite() {
  spinners
    .filter((spinner) => spinner.isEnabled)
    .forEach((spinner) => spinner.clear());
}

function afterWrite() {
  spinners
    .filter((spinner) => spinner.isEnabled)
    .forEach((spinner) => spinner.start());
}

function startupMatchers(level, ...args) {
  // the first argument may not be a string
  // eslint-disable-next-line unicorn/prefer-starts-ends-with
  if (/^env var /.test(args[0])) {
    // skip in non-verbose mode
    return null;
  }

  if (/^(client|server) config setup from process\.env/.test(args[0])) {
    // skip in non-verbose mode
    return null;
  }

  if (/WARNING: ONE_CLIENT_[A-Z_]+ unspecified, using ONE_[+A-Z]/.test(args[0])) {
    // skip in non-verbose mode
    return null;
  }

  if (/👕 one-app-dev-cdn server listening on port/.test(args[0])) {
    oneAppDevCdnSpinner.succeed(args[0]);
    oneAppDevCdnSpinner.isEnabled = false;
    oneAppDevProxySpinner.isEnabled = true;
    oneAppDevProxySpinner.start();
    return null;
  }

  if (/👖 one-app-dev-proxy server listening on port/.test(args[0])) {
    oneAppDevProxySpinner.succeed(args[0]);
    oneAppDevProxySpinner.isEnabled = false;

    appServerSpinner.isEnabled = true;
    appServerSpinner.start();
    metricsServerSpinner.isEnabled = true;
    metricsServerSpinner.start();
    return null;
  }

  if (/🌎 One App server listening on port/.test(args[0])) {
    appServerSpinner.succeed(args[0]);
    appServerSpinner.isEnabled = false;
    return null;
  }

  if (/📊 Metrics server listening on port/.test(args[0])) {
    metricsServerSpinner.succeed(args[0]);
    metricsServerSpinner.isEnabled = false;
    return null;
  }

  if (
    appServerSpinner.isEnabled
    && (
      // the first argument may not be a string
      // eslint-disable-next-line unicorn/prefer-starts-ends-with
      /^Failed to load Holocron module/.test(args[0])
      || /unable to find root module/.test(args[0])
    )
  ) {
    setImmediate(() => {
      const text = args[0] && args[0].message ? args[0].message : args[0];
      appServerSpinner.fail(text);
      appServerSpinner.isEnabled = false;
      return null;
    });
    return null;
  }

  return undefined;
}

function moduleMapPollingMatchers(level, ...args) {
  // log: pollModuleMap: polling...
  // info: 💻 ➡ 200 OK GET https://example.com/one-app/module-map.json 181ms
  // log: pollModuleMap: no updates, looking again in 9s
  if (args[0] === 'pollModuleMap: polling...') {
    setImmediate(() => {
      moduleMapSpinner.isEnabled = true;
      moduleMapSpinner.start();
    });
    return null;
  }
  // the first argument may not be a string
  // eslint-disable-next-line unicorn/prefer-starts-ends-with
  if (/^pollModuleMap: no updates, looking again in /.test(args[0])) {
    setImmediate(() => {
      moduleMapSpinner.succeed(`Polled Holocron Module map: no updates (polling again in ${/looking again in (\d+)/.exec(args[0])[1]}s)`);
      moduleMapSpinner.isEnabled = false;
    });
    return null;
  }
  if (/^pollModuleMap: \d+ modules loaded\/updated:$/.test(args[0])) {
    setImmediate(() => {
      moduleMapSpinner.succeed(`Polled Holocron Module map: ${/(\d+) modules loaded/.exec(args[0])[1]} updates`);
      moduleMapSpinner.isEnabled = false;
    });
    return `Modules updated: ${JSON.stringify(args[1], null, 2)}`;
  }
  if (args[0] === 'pollModuleMap: error polling') {
    setImmediate(() => {
      moduleMapSpinner.warn('Polling Holocron Module map failed');
      moduleMapSpinner.isEnabled = false;
    });
    return `${level}: ${util.format(args[1])}`;
  }
  if (args[0].toString().startsWith('pollModuleMap: setting up polling monitor to run every')) {
    return null;
  }
  if (args[0].toString().startsWith('pollModuleMap: running polling monitor')) {
    return null;
  }
  if (args[0].toString().startsWith('pollModuleMap: polling is working as expected.')) {
    return null;
  }
  if (args[0].toString().startsWith('pollModuleMap: polling has unexpectedly stopped.')) {
    return null;
  }
  if (args[0].toString().startsWith('pollModuleMap: restarted polling')) {
    return null;
  }

  return undefined;
}

const formatter = (levelName, ...args) => {
  const level = coloredLevels[levelName] || levelName;
  const obj = args[0];

  const startup = startupMatchers(level, ...args);
  if (startup !== undefined) {
    return startup;
  }

  const moduleMapPolling = moduleMapPollingMatchers(level, ...args);
  if (moduleMapPolling !== undefined) {
    return moduleMapPolling;
  }

  if (dropEntryBasedOnLevel(levelName)) {
    return null;
  }

  switch (obj && obj.type) {
    case 'request':
      if (obj.request.direction === 'out') {
        return null;
      }
      return `${level}: 🌍 ➡ 💻 ${printStatusCode(obj)} ${printStatusMessage(obj)} ${obj.request.metaData.method} ${obj.request.address.uri} ${obj.request.timings.duration}ms`;
    default:
      return `${level}: ${util.format.apply(null, args)}`;
  }
};

export {
  beforeWrite,
  afterWrite,
  formatter,
};
