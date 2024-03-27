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

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { TextEncoder, TextDecoder } from 'util';

process.env.ONE_CONFIG_ENV = 'test';

// Required for logger tests
process.setMaxListeners(15);

// Jest does not provide TextEncoder & TextDecoder on global.
// This could be moved to amex-jest-preset-react
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
