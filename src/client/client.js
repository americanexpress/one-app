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

/**
 * Main App
 * Set up the global store and kick off rendering
 */

// polyfill for ie 11
import 'abort-controller/polyfill';
import './polyfill/console';
import './polyfill/ChildNode.remove';
import './polyfill/Intl';
import './publicPath';
import './badPartMonkeypatches';

import initClient from './initClient';

initClient();
