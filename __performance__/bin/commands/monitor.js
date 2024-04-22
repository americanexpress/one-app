/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fetch = require('cross-fetch');
const { red, bold } = require('colorette');
const { ProxyAgent } = require('proxy-agent');
const updateTarget = require('../prometheus/updateTarget');
const { saveProcess, killProcess, getLogFile } = require('../util/bgProcess');

module.exports.command = 'monitor';

module.exports.describe = 'Monitor One App performance';

module.exports.handler = async function monitor(argv) {
  if (argv.kill) {
    await killProcess('monitor');
    console.log('Monitoring services killed.');
    return;
  }

  if (argv.tail) {
    process.on('SIGINT', () => {
      console.log(`\n\nExiting tail, but monitoring services are still running. Run ${bold('npm run perf -- monitor --kill')} to stop them.`);
      process.exit(0);
    });
    spawn('tail', ['-f', getLogFile('monitor')], { stdio: 'inherit' });
    return;
  }

  try {
    await fetch(`http://${argv.target.fetch}/im-up`, {
      agent: new ProxyAgent(),
    });
  } catch (error) {
    console.error(`${red('Error: Target metrics service is not available. Is it running?')}\nRun ${bold('npm run start:prod-sample')} to start the prod sample image.`);
    process.exit(1);
  }

  await updateTarget(argv.target.docker);

  const bgStdIo = fs.openSync(getLogFile('monitor'), 'a');
  const options = argv.background ? { detached: true, stdio: ['ignore', bgStdIo, bgStdIo] } : { stdio: 'inherit' };
  const monitorProcess = spawn('docker', ['compose', 'up', '--abort-on-container-exit', 'influxdb', 'grafana', 'prometheus'], { cwd: path.resolve(__dirname, '..', '..'), ...options });

  if (argv.background) {
    await saveProcess('monitor', monitorProcess.pid);
    monitorProcess.unref();
    console.log(`Monitoring services started in the background (PID:${monitorProcess.pid}).`);
    process.exit(0);
  }
};

module.exports.builder = (yargs) => yargs
  .option('target', {
    alias: 't',
    description: 'Host of the target metrics service',
    type: 'string',
    demandOption: true,
    default: 'localhost:3005',
    coerce: (arg) => ({
      fetch: arg.replace('host.docker.internal', 'localhost'),
      docker: arg.replace('localhost', 'host.docker.internal'),
    }),
  })
  .option('background', {
    alias: 'b',
    description: 'Run the monitoring in the background',
    type: 'boolean',
    conflicts: ['tail', 'kill'],
  })
  .option('tail', {
    alias: 'l',
    description: 'Tail backgrounded monitoring',
    type: 'boolean',
    conflicts: ['kill', 'background'],
  })
  .option('kill', {
    alias: 'k',
    description: 'Kill the backgrounded monitoring',
    type: 'boolean',
    conflicts: ['tail', 'background'],
  });
