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

// the cleanest way to express the logic w/o loading development formatters, alternatives welcome
/* eslint-disable no-nested-ternary */

import { argv } from 'yargs';
import Lumberjack from '@americanexpress/lumberjack';

import productionFormatter from './production-formatter';

const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';
const productionConfig = { formatter: productionFormatter };

const logger = new Lumberjack(
  argv.logFormat === 'machine' ? productionConfig
  // development-formatters should not be loaded in production
  // eslint-disable-next-line no-extra-parens -- conflicting lint rule
  : (nodeEnvIsDevelopment ? require('./development-formatters') // eslint-disable-line global-require, indent
  : productionConfig) // eslint-disable-line indent
);

export default logger;
