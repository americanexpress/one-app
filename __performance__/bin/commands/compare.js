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

const { diffJson } = require('diff');
const {
  green, red, dim, underline,
} = require('colorette');
const pick = require('../util/pick');
const generateTable = require('../util/metricsTable');
const coerceTestId = require('../util/coerceTestId');
const {
  diffProcessor,
  pValueProcessor,
  variantProcessor,
} = require('../util/internalProcessors');
const banner = require('../util/banner');
const { colors } = require('../util/format');
const options = require('../util/options');
const readResults = require('../util/readResults');

module.exports.command = 'compare';

module.exports.describe = 'Compare two performance test results';

module.exports.handler = async function compare(argv) {
  const { italic } = colors();
  const { control, variant } = argv;

  console.log(banner([
    {
      ...control,
      label: `${control.label} (${argv.cls})`,
    },
    {
      ...variant,
      label: `${variant.label} (${argv.vls})`,
    },
  ], argv.markdown));

  const headers = [];
  const processors = [];

  for (const processor of argv.processors) {
    processors.push(
      processor,
      variantProcessor(processor, variant.data),
      diffProcessor(processor, variant.data)
    );
    headers.push(
      `${processor.label} (${argv.cls})`,
      `${processor.label} (${argv.vls})`,
      `${processor.label} (diff)`
    );
  }

  processors.push(pValueProcessor(variant.data, argv.alpha));
  headers.push(`${italic('p')}-value`);

  const table = generateTable({
    ...argv,
    headers,
    processors,
    data: pick(control.data, argv.metrics),
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
  .check(async (argv) => {
    if (argv.control.id === argv.variant.id) {
      throw new Error(red(`Bad option: ${underline('control')} and ${underline('variant')} test IDs must be unique`));
    }

    const [control, variant] = await Promise.all([
      readResults(argv.control.dir),
      readResults(argv.variant.dir),
    ]);

    if (control.meta.type !== variant.meta.type) {
      throw new Error(`${red(`Bad option: ${underline('control')} and ${underline('variant')} test types must match.`)}\n  Control: ${control.meta.type}\n  Variant: ${variant.meta.type}`);
    }
    if (control.meta.hash !== variant.meta.hash) {
      const optionsDiff = diffJson(control.meta.options, variant.meta.options);
      const printDiff = optionsDiff.map((part) => (part.added ? green(`+ ${part.value}`)
        // eslint-disable-next-line unicorn/no-nested-ternary -- conflicting rules
        : part.removed ? red(`- ${part.value}`) : dim(part.value)));

      throw new Error(`${red(`Bad option: ${underline('control')} and ${underline('variant')} test options must match`)}\n  ${printDiff.join('')}`);
    }

    control.label = argv.controlLabel;
    variant.label = argv.variantLabel;
    Object.assign(argv.control, control);
    Object.assign(argv.variant, variant);

    return true;
  })
  .showHidden('show-hidden', 'Show hidden options');
