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
const path = require('node:path');
const { diffJson } = require('diff');
const {
  green, red, dim, underline,
} = require('colorette');
const math = require('../util/math');
const pick = require('../util/pick');
const generateTable = require('../util/metricsTable');
const coerceTestId = require('../util/coerceTestId');
const {
  diffProcessor,
  pValueProcessor,
  variantProcessor,
} = require('../util/processors');
const banner = require('../util/banner');
const { colors } = require('../util/format');
const options = require('../util/options');

module.exports.command = 'compare';

module.exports.describe = 'Compare two performance test results';

module.exports.handler = async function compare(argv) {
  const { italic } = colors();
  const cData = {
    ...JSON.parse(await fs.promises.readFile(path.join(argv.control.dir, 'metrics-k6.json'))),
    ...JSON.parse(await fs.promises.readFile(path.join(argv.control.dir, 'metrics-prom.json'))),
  };
  const vData = {
    ...JSON.parse(await fs.promises.readFile(path.join(argv.variant.dir, 'metrics-k6.json'))),
    ...JSON.parse(await fs.promises.readFile(path.join(argv.variant.dir, 'metrics-prom.json'))),
  };

  console.log(banner([
    {
      label: `${argv.controlLabel} (${argv.cls})`,
      id: argv.control.id,
      data: cData,
      meta: JSON.parse(await fs.promises.readFile(path.join(argv.control.dir, 'k6-summary.json'))).meta,
    },
    {
      label: `${argv.variantLabel} (${argv.vls})`,
      id: argv.variant.id,
      data: vData,
      meta: JSON.parse(await fs.promises.readFile(path.join(argv.variant.dir, 'k6-summary.json'))).meta,
    },
  ], argv.markdown));

  const headers = [];
  const processors = [];

  for (const processor of argv.processors) {
    processors.push(
      math[processor],
      variantProcessor(math[processor], vData),
      diffProcessor(math[processor], vData)
    );
    headers.push(
      `${math[processor].label} (${argv.cls})`,
      `${math[processor].label} (${argv.vls})`,
      `${math[processor].label} (diff)`
    );
  }

  processors.push(pValueProcessor(vData, argv.alpha));
  headers.push(`${italic('p')}-value`);

  const table = generateTable({
    headers,
    processors,
    data: pick(cData, argv.metrics),
    markdown: argv.markdown,
    description: argv.description,
    raw: argv.raw,
  });

  console.log(`\n${table}`);
};

module.exports.builder = (yargs) => yargs
  .option('control', {
    alias: 'c',
    description: 'Control test ID or path to control test results',
    type: 'string',
    demandOption: true,
    coerce: coerceTestId('control'),
  })
  .option('variant', {
    alias: 'v',
    description: 'Variant test ID or path to variant test results',
    type: 'string',
    demandOption: true,
    coerce: coerceTestId('variant'),
  })
  .option('markdown', options.markdown)
  .option('description', options.description)
  .option('alpha', {
    alias: 'a',
    description: 'The significance level of the test',
    type: 'number',
    default: 0.05,
    coerce: (arg) => {
      if (arg >= 1) {
        throw new Error(red(`Bad option: ${underline('alpha')} must be below 1.0`));
      }
      return arg;
    },
  })
  .option('processors', options.processors)
  .options('raw', options.raw)
  .option('metrics', options.metrics)
  .option('control-label', {
    alias: 'C',
    type: 'string',
    description: 'Label for control test in report',
    default: 'Control',
  })
  .option('variant-label', {
    alias: 'V',
    type: 'string',
    description: 'Label for variant test in report',
    default: 'Variant',
  })
  .option('control-label-short', {
    alias: 'cls',
    type: 'string',
    default: 'c',
    hidden: true,
  })
  .option('variant-label-short', {
    alias: 'vls',
    type: 'string',
    default: 'v',
    hidden: true,
  })
  .check((argv) => {
    if (argv.control.id === argv.variant.id) {
      throw new Error(red(`Bad option: ${underline('control')} and ${underline('variant')} test IDs must be unique`));
    }

    const controlMeta = JSON.parse(fs.readFileSync(path.join(argv.control.dir, 'k6-summary.json'), 'utf8')).meta;
    const variantMeta = JSON.parse(fs.readFileSync(path.join(argv.variant.dir, 'k6-summary.json'), 'utf8')).meta;

    if (controlMeta.type !== variantMeta.type) {
      throw new Error(`${red(`Bad option: ${underline('control')} and ${underline('variant')} test types must match.`)}\n  Control: ${controlMeta.type}\n  Variant: ${variantMeta.type}`);
    }
    if (controlMeta.hash !== variantMeta.hash) {
      const optionsDiff = diffJson(controlMeta.options, variantMeta.options);
      const printDiff = optionsDiff.map((part) => (part.added ? green(`+ ${part.value}`)
        // eslint-disable-next-line unicorn/no-nested-ternary -- conflicting rules
        : part.removed ? red(`- ${part.value}`) : dim(part.value)));

      throw new Error(`${red(`Bad option: ${underline('control')} and ${underline('variant')} test options must match`)}\n  ${printDiff.join('')}`);
    }
    return true;
  })
  .showHidden('show-hidden', 'Show hidden options');
