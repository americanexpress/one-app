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

import deepMergeObjects from '../../../src/server/utils/deepMergeObjects';

const dockerComposeObj = {
  version: '3',
  networks: { 'one-app-test-network': null },
  services: {
    'one-app': {
      build: '../',
      image: 'one-app-image',
      volumes: ['./app/example/path', './app/example/path/two'],
      envFile: ['./one-app/env'],
      networks: { 'one-app-test-network': null },
    },
    'cdn-static-server': {
      image: 'cdn-static-server-image',
      volumes: ['./cdn-static-server/example/path', './cdn-static-server/example/path/two'],
      networks: {
        testNetwork: { 'one-app-test-network': { alias: 'alias' } },
      },
    },
    'webdriver-browser': {
      image: 'webdriver-browser-image',
      volumes: ['./webdriver-browser/example/path'],
      ports: ['4444:4444', '5901:5900'],
      networks: { 'one-app-test-network': null },
      entrypoint: 'entrypoint script',
    },
  },
};

const additionalServices = {
  services: {
    'webdriver-browser': {
      ports: [
        '2222:2222',
      ],
    },
    'one-app': {
      ports: [
        '8443:8443',
      ],
    },
  },
};

const mergedDockerComposeObj = {
  version: '3',
  networks: { 'one-app-test-network': null },
  services: {
    'one-app': {
      build: '../',
      image: 'one-app-image',
      volumes: ['./app/example/path', './app/example/path/two'],
      envFile: ['./one-app/env'],
      ports: ['8443:8443'],
      networks: { 'one-app-test-network': null },
    },
    'cdn-static-server': {
      image: 'cdn-static-server-image',
      volumes: ['./cdn-static-server/example/path', './cdn-static-server/example/path/two'],
      networks: {
        testNetwork: { 'one-app-test-network': { alias: 'alias' } },
      },
    },
    'webdriver-browser': {
      image: 'webdriver-browser-image',
      volumes: ['./webdriver-browser/example/path'],
      ports: ['2222:2222'],
      networks: { 'one-app-test-network': null },
      entrypoint: 'entrypoint script',
    },
  },
};

const origRequest = {
  headers: {
    originalHeader: 'yes',
    otherOriginalHeader: [1, 2, 3, { cat: 'dog' },
    ],
    rewrittenHeader: 'I have not been rewritten',
    headerTwo: 'should be overwritten',
    headerFive: 'keep me!',
  },
  randomKey: 'to my heart',
};

const newHeaders = {
  headers: {
    rewrittenHeader: 'I have been rewritten',
    headerOne: 'one',
    headerTwo: 'two',
    headerThree: 'three',
    headerFour: 'four',
  },
};
const newCookie = { cookie: 'macadamia nut' };

const mergedRequest = {
  headers: {
    originalHeader: 'yes',
    otherOriginalHeader: [1, 2, 3, { cat: 'dog' },
    ],
    rewrittenHeader: 'I have been rewritten',
    headerOne: 'one',
    headerTwo: 'two',
    headerThree: 'three',
    headerFour: 'four',
    headerFive: 'keep me!',
  },
  randomKey: 'to my heart',
  cookie: 'macadamia nut',
};

describe('deepMergeObjects', () => {
  it('should deep merge source object and subsequent object args', () => {
    expect(deepMergeObjects(origRequest, newHeaders, newCookie)).toStrictEqual(mergedRequest);
    expect(deepMergeObjects(dockerComposeObj, additionalServices))
      .toStrictEqual(mergedDockerComposeObj);
  });
  it('should only mutate source object', () => {
    const cookieCopy = { ...newCookie };
    deepMergeObjects(origRequest, newHeaders, newCookie);
    expect(newCookie).toStrictEqual(cookieCopy);

    const headersCopy = { ...newHeaders };
    deepMergeObjects(origRequest, newHeaders, newCookie);
    expect(newHeaders).toStrictEqual(headersCopy);

    const additionalServicesCopy = { ...additionalServices };
    deepMergeObjects(dockerComposeObj, additionalServices);
    expect(additionalServices).toStrictEqual(additionalServicesCopy);
  });
  it('should return original object if no additional obj args are passed in', () => {
    expect(deepMergeObjects(dockerComposeObj)).toStrictEqual(dockerComposeObj);
  });
});
