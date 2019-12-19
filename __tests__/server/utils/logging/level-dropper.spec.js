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

describe('level-dropper', () => {
  function load(logLevel = 'info') {
    jest.resetModules();
    jest.setMock('yargs', { argv: { logLevel } });

    return require('../../../../src/server/utils/logging/level-dropper').default;
  }

  it('keeps error when logLevel is error', () => expect(load('error')('error')).toBe(false));
  it('drops warn when logLevel is error', () => expect(load('error')('warn')).toBe(true));
  it('drops log when logLevel is error', () => expect(load('error')('log')).toBe(true));
  it('drops info when logLevel is error', () => expect(load('error')('info')).toBe(true));

  it('keeps error when logLevel is warn', () => expect(load('warn')('error')).toBe(false));
  it('keeps warn when logLevel is warn', () => expect(load('warn')('warn')).toBe(false));
  it('drops log when logLevel is warn', () => expect(load('warn')('log')).toBe(true));
  it('drops info when logLevel is warn', () => expect(load('warn')('info')).toBe(true));

  it('keeps error when logLevel is log', () => expect(load('log')('error')).toBe(false));
  it('keeps warn when logLevel is log', () => expect(load('log')('warn')).toBe(false));
  it('keeps log when logLevel is log', () => expect(load('log')('log')).toBe(false));
  it('drops info when logLevel is log', () => expect(load('log')('info')).toBe(true));

  it('keeps error when logLevel is info', () => expect(load('info')('error')).toBe(false));
  it('keeps warn when logLevel is info', () => expect(load('info')('warn')).toBe(false));
  it('keeps log when logLevel is info', () => expect(load('info')('log')).toBe(false));
  it('keeps info when logLevel is info', () => expect(load('info')('info')).toBe(false));
});
