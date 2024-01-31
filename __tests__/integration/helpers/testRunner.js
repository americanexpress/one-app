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

const path = require('node:path');
const fs = require('node:fs/promises');
const childProcess = require('node:child_process');
const { remote } = require('webdriverio');
const yaml = require('js-yaml');

const { waitUntilServerIsUp } = require('./wait');
const { createLogWatcherDuplex } = require('./logging');
const getRandomPortNumber = require('./getRandomPortNumber');
const deepMergeObjects = require('../../../src/server/utils/deepMergeObjects');

const prodSampleDir = path.resolve('./prod-sample/');
const pathToDockerComposeTestFile = path.resolve(prodSampleDir, 'docker-compose.test.yml');

const setUpTestRunner = async ({
  oneAppLocalPortToUse,
  oneAppMetricsLocalPortToUse,
  skipBrowser = false,
} = {}) => {
  const pathToBaseDockerComposeFile = path.resolve(prodSampleDir, 'docker-compose.yml');
  const seleniumServerPort = getRandomPortNumber();
  // create docker compose file from base with changes needed for tests
  const baseDockerComposeFileContents = yaml.load(await fs.readFile(pathToBaseDockerComposeFile, 'utf8'));
  const testDockerComposeFileContents = deepMergeObjects(
    baseDockerComposeFileContents,
    {
      services: {
        'selenium-chrome': {
          ports: [
            `${seleniumServerPort}:4444`,
            '7901:7900',
            '5901:5900',
          ],
        },
        ...oneAppLocalPortToUse && {
          'one-app': {
            ports: [
              `${oneAppLocalPortToUse}:8443`,
              oneAppMetricsLocalPortToUse ? `${oneAppMetricsLocalPortToUse}:3005` : undefined,
            ].filter(Boolean),
          },
        },
      },
    }
  );
  if (skipBrowser) {
    delete testDockerComposeFileContents.services['selenium-chrome'];
  } else {
    delete testDockerComposeFileContents.services['selenium-chrome'].entrypoint;
  }

  await fs.writeFile(pathToDockerComposeTestFile, yaml.dump(testDockerComposeFileContents));

  const dockerComposeUpCommand = `docker compose -f ${pathToDockerComposeTestFile} up --abort-on-container-exit --force-recreate`;
  const dockerComposeUpProcess = childProcess.spawn(`${dockerComposeUpCommand}`, { shell: true });
  const serverStartupTimeout = 90000;

  const logWatcherDuplex = createLogWatcherDuplex();
  // logWatcherDuplex enables the testing of logs without preventing logging to stdout and stderr
  dockerComposeUpProcess.stdout.pipe(logWatcherDuplex);
  dockerComposeUpProcess.stderr.pipe(logWatcherDuplex);

  // uncomment this line in order to view full logs for debugging
  // logWatcherDuplex.pipe(process.stdout);

  const traceFilePath = path.resolve(prodSampleDir, 'otel-collector', 'tmp', 'traces.jsonl');
  await fs.mkdir(path.dirname(traceFilePath), { recursive: true });
  await fs.writeFile(traceFilePath, '');
  const traceTail = childProcess.spawn('tail', ['-n', '10', '-f', traceFilePath]);

  // tail has a line character limit before it splits the chunks, but we need
  // each trace in a single line for parsing
  let currentTraceChunk = '';
  traceTail.stdout.on('data', (chunk) => {
    currentTraceChunk += chunk;
    if (currentTraceChunk.endsWith('\n')) {
      logWatcherDuplex.write(currentTraceChunk);
      // uncomment this line in order to view full traces for debugging
      // process.stdout.write(currentTraceChunk);
      currentTraceChunk = '';
    }
  });

  try {
    await Promise.all([
      oneAppLocalPortToUse ? waitUntilServerIsUp(`https://localhost:${oneAppLocalPortToUse}/success`, serverStartupTimeout) : Promise.resolve(),
      skipBrowser ? Promise.resolve() : waitUntilServerIsUp(`http://localhost:${seleniumServerPort}`, serverStartupTimeout),
    ]);
  } catch (err) {
    // logWatcherDuplex will buffer the logs until piped out.
    logWatcherDuplex.pipe(process.stdout);
    console.error('--> CONNECTION ERROR <--', err);
    throw new Error(
      '🚨 Either of the One App, Selenium, or Nginx servers failed to be pulled, built, and started '
      + `within ${serverStartupTimeout}ms. See logs for details.`
    );
  }

  if (skipBrowser) {
    return {};
  }

  const browser = await remote({
    logLevel: 'silent',
    protocol: 'http',
    hostname: 'localhost',
    path: '/wd/hub',
    port: seleniumServerPort,
    capabilities: {
      acceptInsecureCerts: true,
      'goog:chromeOptions': {
        ...!oneAppLocalPortToUse && process.env.HTTPS_PROXY
        && { args: [`--proxy-server=${process.env.HTTPS_PROXY}`] },
      },
      browserName: 'chrome',
    },
  });

  return { browser };
};

const tearDownTestRunner = async ({ browser } = {}) => {
  await fs.rm(pathToDockerComposeTestFile);
  if (browser) { await browser.deleteSession(); }

  const dockerComposeDownProcess = childProcess.spawnSync('docker-compose down', { shell: true, cwd: prodSampleDir });
  if (dockerComposeDownProcess.status !== 0) {
    throw new Error(
      `${'🚨 Error: Docker cleanup could not be completed. You may have to '
      + 'manually clean up all the Docker containers and networks that were created for this test setup.\n\n'}${
        dockerComposeDownProcess.stderr.toString()}`
    );
  }
};

function spawnAsync(...args) {
  const [, , options = {}] = args;
  return new Promise((res, rej) => {
    const spawnedProcess = childProcess.spawn(...args);

    spawnedProcess
      .on('error', rej)
      .on('close', (exitCode) => {
        if (exitCode !== 0) {
          return rej(exitCode);
        }
        return res(exitCode);
      });

    const { stdio = ['pipe', 'pipe', 'pipe'] } = options;
    if (stdio[1] === 'pipe') {
      spawnedProcess.stderr.pipe(process.stderr);
    }
    if (stdio[2] === 'pipe') {
      spawnedProcess.stdout.pipe(process.stdout);
    }
  });
}

function sendSignal(service, signal = 'SIGKILL') {
  return spawnAsync(
    'docker-compose',
    [
      '-f', pathToDockerComposeTestFile,
      'kill',
      '-s', signal,
      service,
    ]
  );
}

module.exports = {
  setUpTestRunner,
  tearDownTestRunner,
  sendSignal,
};
