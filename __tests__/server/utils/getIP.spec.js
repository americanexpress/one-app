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

import os from 'os';
import { getIp } from '../../../src/server/utils/getIP';

const spy = jest.spyOn(os, 'networkInterfaces');

describe('getIp', () => {
  it('returns a valid IP address', () => {
    spy.mockReturnValue({
      addresses: [
        {
          address: '1.1.1.1',
          family: 'IPv4',
          internal: true,
        },
        {
          address: '2.2.2.2',
          family: 'IPv4',
          internal: false,
        },
        {
          address: '3.3.3.3',
          family: 'IPv6',
          internal: false,
        },
      ],
    });
    expect(getIp()).toBe('2.2.2.2');
  });
  it('returns 127.0.0.1 if no addresses found', () => {
    spy.mockReturnValue({
      addresses: [],
    });
    expect(getIp()).toBe('127.0.0.1');
  });
});
