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

// Headers are under a key with a dangling underscore
/* eslint-disable no-underscore-dangle */
import { promises as fs } from 'fs';
import path from 'path';

import fetch from 'cross-fetch';
import yargs, { argv } from 'yargs';
import parsePrometheusTextFormat from 'parse-prometheus-text-format';

import { setUpTestRunner, tearDownTestRunner, sendSignal } from './helpers/testRunner';
import { waitFor } from './helpers/wait';
import { deployBrokenModule, dropModuleVersion } from './helpers/moduleDeployments';
import {
  removeModuleFromModuleMap,
  addModuleToModuleMap,
  writeModuleMap,
  readModuleMap,
  retrieveModuleIntegrityDigests,
  retrieveGitSha,
  testCdnUrl,
} from './helpers/moduleMap';
import { searchForNextLogMatch } from './helpers/logging';
import createFetchOptions from './helpers/fetchOptions';
import getRandomPortNumber from './helpers/getRandomPortNumber';
import {
  getCacheKeys,
  getCacheEntries,
  getCacheMatch,
  getServiceWorkerReady,
} from './helpers/browserExecutors';
import transit from '../../src/universal/utils/transit';

yargs.array('remoteOneAppEnvironment');
yargs.array('scanEnvironment');

jest.setTimeout(95000);

const minPollTime = 1e3; // 1 second

describe('Tests that require Docker setup', () => {
  describe('one-app startup with bad module module', () => {
    let originalModuleMap;
    const oneAppLocalPortToUse = getRandomPortNumber();
    const oneAppMetricsLocalPortToUse = getRandomPortNumber();
    let browser;
    const moduleName = 'unhealthy-frank';
    const version = '0.0.0';
    const revertErrorMatch = /There was an error loading module (?<moduleName>.*) at (?<url>.*). Ignoring (?<workingModule>.*) until .*/;
    let requiredExternalsError;

    beforeAll(async () => {
      originalModuleMap = readModuleMap();

      await addModuleToModuleMap({
        moduleName,
        version,
      });
      requiredExternalsError = searchForNextLogMatch(revertErrorMatch, 30000);
      ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse, oneAppMetricsLocalPortToUse }));
    });

    afterAll(async () => {
      await tearDownTestRunner({ browser });
      writeModuleMap(originalModuleMap);
    });

    test('one-app starts up successfully with a bad module', async () => {
      const loggedError = await requiredExternalsError;
      const [, problemModule, problemModuleUrl, workingUrl] = revertErrorMatch.exec(loggedError);
      const gitSha = await retrieveGitSha();
      await expect(requiredExternalsError).resolves.toMatch(revertErrorMatch);
      expect(problemModule).toBe(moduleName);
      expect(problemModuleUrl).toBe(
        `${testCdnUrl}/${gitSha}/${moduleName}/${version}/${moduleName}.node.js`
      );
      // eslint-disable-next-line no-useless-escape
      expect(workingUrl).toBe(moduleName);
    });
    test('one-app remains healthy with a bad module at start', async () => {
      await browser.url('https://one-app:8443/success');
      const header = await browser.$('.helloMessage');
      const headerText = await header.getText();
      expect(headerText).toBe('Hello! One App is successfully rendering its Modules!');
    });
  });

  describe('one-app successfully started', () => {
    const defaultFetchOptions = createFetchOptions();
    let originalModuleMap;
    const oneAppLocalPortToUse = getRandomPortNumber();
    const oneAppMetricsLocalPortToUse = getRandomPortNumber();
    const appAtTestUrls = {
      fetchUrl: `https://localhost:${oneAppLocalPortToUse}`,
      fetchMetricsUrl: `http://localhost:${oneAppMetricsLocalPortToUse}/metrics`,
      browserUrl: 'https://one-app:8443',
      cdnUrl: 'https://sample-cdn.frank',
    };

    let browser;

    beforeAll(async () => {
      removeModuleFromModuleMap('late-frank');
      removeModuleFromModuleMap('unhealthy-frank');
      originalModuleMap = readModuleMap();
      ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse, oneAppMetricsLocalPortToUse }));
    });

    afterAll(async () => {
      await tearDownTestRunner({ browser });
      writeModuleMap(originalModuleMap);
    });

    test('app rejects CORS POST requests', async () => {
      const response = await fetch(`${appAtTestUrls.fetchUrl}/success`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: {
          origin: 'test.example.com',
        },
        body: JSON.stringify({}),
      });
      const rawHeaders = response.headers.raw();
      expect(response.status).toBe(200);
      expect(rawHeaders).not.toHaveProperty('access-control-expose-headers');
      expect(rawHeaders).not.toHaveProperty('access-control-allow-credentials');
    });

    describe('metrics', () => {
      it('connects', async () => {
        expect.assertions(1);
        const response = await fetch(appAtTestUrls.fetchMetricsUrl);
        expect(response).toHaveProperty('status', 200);
      });

      it('has all metrics', async () => {
        expect.assertions(1);
        const response = await fetch(appAtTestUrls.fetchMetricsUrl);
        const parsedMetrics = parsePrometheusTextFormat(await response.text());
        expect(parsedMetrics.map((metric) => metric.name).sort()).toMatchSnapshot();
      });

      it('has help information on each metric', async () => {
        expect.assertions(1);
        const response = await fetch(appAtTestUrls.fetchMetricsUrl);
        const parsedMetrics = parsePrometheusTextFormat(await response.text());
        const allMetricNames = parsedMetrics.map((metric) => metric.name);

        const metricsNamesWithHelpInfo = parsedMetrics
          .filter((metric) => metric.help && metric.help.length > 0)
          .map((metric) => metric.name);

        expect(metricsNamesWithHelpInfo).toEqual(allMetricNames);
      });
    });

    test('app rejects CORS OPTIONS pre-flight requests for POST', async () => {
      const response = await fetch(`${appAtTestUrls.fetchUrl}/success`, {
        ...defaultFetchOptions,
        method: 'OPTIONS',
        headers: {
          origin: 'test.example.com',
        },
      });

      expect(response.status).toBe(404);
      // preflight-only headers
      const rawHeaders = response.headers.raw();
      expect(rawHeaders).not.toHaveProperty('access-control-max-age');
      expect(rawHeaders).not.toHaveProperty('access-control-allow-methods');
      expect(rawHeaders).not.toHaveProperty('access-control-allow-headers');
      // any response headers
      expect(rawHeaders).not.toHaveProperty('access-control-allow-origin');
      expect(rawHeaders).not.toHaveProperty('access-control-expose-headers');
      expect(rawHeaders).not.toHaveProperty('access-control-allow-credentials');
    });

    describe('root module without corsOrigins set', () => {
      beforeAll(async () => {
        await addModuleToModuleMap({
          moduleName: 'frank-lloyd-root',
          version: '0.0.2',
          integrityDigests: retrieveModuleIntegrityDigests({
            moduleName: 'frank-lloyd-root',
            version: '0.0.2',
          }),
        });
        // wait for change to be picked up
        await waitFor(minPollTime);
      });

      // Success is tested in block:
      // "Tests that can run against either local Docker setup or remote One App environments"
      test('app rejects CORS POST requests for partials', async () => {
        const response = await fetch(
          `${appAtTestUrls.fetchUrl}/html-partial/en-US/frank-the-parrot`,
          {
            ...defaultFetchOptions,
            method: 'POST',
            headers: {
              origin: 'test.example.com',
            },
            body: JSON.stringify({
              message: 'Hello!',
            }),
          }
        );
        const rawHeaders = response.headers.raw();
        expect(response.status).toBe(200);
        expect(rawHeaders).not.toHaveProperty('access-control-allow-origin');
        expect(rawHeaders).not.toHaveProperty('access-control-expose-headers');
        expect(rawHeaders).not.toHaveProperty('access-control-allow-credentials');
      });

      afterAll(async () => {
        writeModuleMap(originalModuleMap);
        // wait for modules to revert
        await waitFor(minPollTime);
      });
    });

    describe('one-app server provides reporting routes', () => {
      describe('client reported errors', () => {
        let reportedErrorSearch;
        const errorMessage = 'reported client error';
        const clientReportedErrorLog = new RegExp(errorMessage);

        beforeAll(() => {
          reportedErrorSearch = searchForNextLogMatch(clientReportedErrorLog);
        });

        test('logs errors when reported to /_/report/errors', async () => {
          const resp = await fetch(`${appAtTestUrls.fetchUrl}/_/report/errors`, {
            ...defaultFetchOptions,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{ msg: errorMessage }]),
          });

          expect(resp.status).toEqual(204);

          await expect(reportedErrorSearch).resolves.toMatchSnapshot();
        });
      });

      describe('csp-violations reported to server', () => {
        let reportedCspViolationSearch;
        // const violation = 'csp violation';
        const cspViolationLog = /CSP Violation: {.*document-uri.*bad.example.com/;

        beforeAll(() => {
          reportedCspViolationSearch = searchForNextLogMatch(cspViolationLog);
        });

        test('logs violations reported to /_/report/errors', async () => {
          const resp = await fetch(`${appAtTestUrls.fetchUrl}/_/report/security/csp-violation`, {
            ...defaultFetchOptions,
            method: 'POST',
            headers: {
              'Content-Type': 'application/csp-report',
            },
            body: JSON.stringify({
              'csp-report': {
                'document-uri': 'bad.example.com',
              },
            }),
          });

          expect(resp.status).toEqual(204);
          await expect(reportedCspViolationSearch).resolves.toMatchSnapshot();
        });
      });
    });

    describe('holocron', () => {
      let sampleModuleVersion;

      beforeAll(async () => {
        sampleModuleVersion = '0.0.0';
      });

      test('loads modules on start', async () => {
        await browser.url(`${appAtTestUrls.browserUrl}/healthy-frank`);
        const headerBody = await browser.$('.helloFrank');
        const headerText = await headerBody.getText();
        expect(headerText.includes('Im Frank, and healthy')).toBe(true);
      });

      describe('module removed from module map', () => {
        afterAll(async () => {
          const integrityDigests = retrieveModuleIntegrityDigests({
            moduleName: 'healthy-frank',
            version: sampleModuleVersion,
          });
          addModuleToModuleMap({
            moduleName: 'healthy-frank',
            version: sampleModuleVersion,
            integrityDigests,
          });
          await waitFor(5000);
        });

        test('removes module from one-app', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/healthy-frank`);
          const headerBody = await browser.$('.helloFrank');
          const headerText = await headerBody.getText();
          expect(headerText.includes('Im Frank, and healthy')).toBe(true);

          removeModuleFromModuleMap('healthy-frank');
          // not ideal but need to wait for app to poll;
          await waitFor(minPollTime);

          await browser.url(`${appAtTestUrls.browserUrl}/demo/healthy-frank`);
          const missingModuleMessageElement = await browser.$('.missingModuleMessage');
          const missingModuleNameElement = await missingModuleMessageElement.$(
            '.missingModuleName'
          );
          const missingModuleName = await missingModuleNameElement.getText();
          expect(missingModuleName.includes('healthy-frank')).toBe(true);
        });
      });

      describe('new module added to module map', () => {
        afterAll(async () => {
          removeModuleFromModuleMap('late-frank');
          await waitFor(5000);
        });

        test('loads new module when module map updated', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/late-frank`);
          const missingModuleMessageElement = await browser.$('.missingModuleMessage');
          const missingModuleNameElement = await missingModuleMessageElement.$(
            '.missingModuleName'
          );
          const missingModuleName = await missingModuleNameElement.getText();
          expect(missingModuleName.includes('late-frank')).toBe(true);

          await addModuleToModuleMap({
            moduleName: 'late-frank',
            version: sampleModuleVersion,
            integrityDigests: retrieveModuleIntegrityDigests({
              moduleName: 'late-frank',
              version: sampleModuleVersion,
            }),
          });
          // not ideal but need to wait for app to poll;
          await waitFor(minPollTime);

          await browser.url(`${appAtTestUrls.browserUrl}/demo/late-frank`);
          const frankHeader = await browser.$('.lateFrank');
          const frankText = await frankHeader.getText();
          expect(frankText.includes('Sorry Im late!')).toBe(true);
        });
      });

      describe('root module module config', () => {
        test('provideStateConfig sets config', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/success`);
          const configPreTag = await browser.$('.value-provided-from-config');
          const configText = await configPreTag.getText();
          expect(configText).toEqual('https://internet-origin-dev.example.com/some-api/v1');
        });

        describe('root module provides invalid config', () => {
          let failedRootModuleConfigSearch;
          const failedRootModuleConfig = /Root module attempted to set the following non-overrideable options for the client but not the server:\\n\s{2}someApiUrl/;

          beforeAll(async () => {
            const nextVersion = '0.0.1';
            failedRootModuleConfigSearch = searchForNextLogMatch(failedRootModuleConfig);
            await addModuleToModuleMap({
              moduleName: 'frank-lloyd-root',
              version: nextVersion,
              integrityDigests: retrieveModuleIntegrityDigests({
                moduleName: 'frank-lloyd-root',
                version: nextVersion,
              }),
            });
            await waitFor(minPollTime);
          });

          afterAll(async () => {
            writeModuleMap(originalModuleMap);
            await waitFor(5000);
          });

          test('writes an error to log when failed module config', async () => {
            await expect(failedRootModuleConfigSearch).resolves.toMatch(failedRootModuleConfig);
          });

          test('with an unhealthy config results in keeping healthy module', async () => {
            await browser.url(`${appAtTestUrls.browserUrl}/success`);
            const configPreTag = await browser.$('.value-provided-from-config');
            const configText = await configPreTag.getText();
            expect(configText).toEqual('https://internet-origin-dev.example.com/some-api/v1');
          });
        });
      });

      describe('child module config', () => {
        test('validateStateConfig validates an acceptable module config', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/picky-frank`);
          const versionSelector = await browser.$('.version');
          const version = await versionSelector.getText();
          expect(version).toEqual('v0.0.0');
        });

        describe('child module fails to validate the module config', () => {
          let failedChildModuleSearch;
          const failedChildModuleValidation = /Error: Failed to pass correct url on client/;

          beforeEach(async () => {
            const nextVersion = '0.0.1';
            failedChildModuleSearch = searchForNextLogMatch(failedChildModuleValidation);
            await addModuleToModuleMap({
              moduleName: 'picky-frank',
              version: nextVersion,
              integrityDigests: retrieveModuleIntegrityDigests({
                moduleName: 'picky-frank',
                version: nextVersion,
              }),
            });
            await waitFor(minPollTime);
          });

          afterEach(async () => {
            writeModuleMap(originalModuleMap);
            await waitFor(5000);
          });

          test('writes an error to log when failed child module validation', async () => {
            await expect(failedChildModuleSearch).resolves.toMatch(failedChildModuleValidation);
          });

          test('with a validation failure one app serves healthy module', async () => {
            await browser.url(`${appAtTestUrls.browserUrl}/demo/picky-frank`);
            const versionSelector = await browser.$('.version');
            const version = await versionSelector.getText();
            expect(version).toEqual('v0.0.0');
          });
        });
      });

      describe('loading broken module', () => {
        let brokenModuleDetails;
        const blocklistRegex = /bad-frank\.node\.js added to blocklist: bad things will happen/;
        let blocklistingOfModuleLogSearch;

        beforeAll(async () => {
          brokenModuleDetails = {
            moduleName: 'bad-frank',
            version: sampleModuleVersion,
            integrityDigests: {
              browser:
                'sha256-4XVXHQGFftIRsBvUKIobtVQjouQBaq11PwPHDMzQ2Hk= sha384-FX5cUzgC22jk+RGJ47h07QVt4q/cvv+Ck57CY0A8bwEQDn+w48zYlwMDlh9OxRzq',
              node: 'sha256-4XVXHQGFftIRsBvUKIobtVQjouQBaq11PwPHDMzQ2Hk= sha384-FX5cUzgC22jk+RGJ47h07QVt4q/cvv+Ck57CY0A8bwEQDn+w48zYlwMDlh9OxRzq',
              legacyBrowser:
                'sha256-4XVXHQGFftIRsBvUKIobtVQjouQBaq11PwPHDMzQ2Hk= sha384-FX5cUzgC22jk+RGJ47h07QVt4q/cvv+Ck57CY0A8bwEQDn+w48zYlwMDlh9OxRzq',
            },
          };
          blocklistingOfModuleLogSearch = searchForNextLogMatch(blocklistRegex);
          await deployBrokenModule(brokenModuleDetails);
          await addModuleToModuleMap(brokenModuleDetails);
          // not ideal but need to wait for app to poll;
          await waitFor(minPollTime);
        });

        afterAll(async () => {
          writeModuleMap(originalModuleMap);
          await dropModuleVersion(brokenModuleDetails);
        });

        test('bad-frank added to blocklist', async () => {
          await expect(blocklistingOfModuleLogSearch).resolves.toMatch(blocklistRegex);
        });

        test('does not load broken module', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/bad-frank`);
          const missingModuleMessageElement = await browser.$('.missingModuleMessage');
          const missingModuleNameElement = await missingModuleMessageElement.$(
            '.missingModuleName'
          );
          const missingModuleName = await missingModuleNameElement.getText();
          expect(missingModuleName.includes('bad-frank')).toBe(true);
        });

        test('one-app remains healthy', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/success`);
          const header = await browser.$('.helloMessage');
          const headerText = await header.getText();
          expect(headerText).toBe('Hello! One App is successfully rendering its Modules!');
        });
      });

      describe('loading module with an integrity mismatch on the server', () => {
        const blocklistRegex = /SRI for module at https:\/\/sample-cdn\.frank\/modules\/.+\/sneaky-frank\/0\.0\.0\/sneaky-frank\.node\.js must match SRI in module map/;
        let blocklistingOfModuleLogSearch;
        let moduleDetails;
        beforeAll(async () => {
          const version = '0.0.0';
          moduleDetails = {
            moduleName: 'sneaky-frank',
            version,
            integrityDigests: {
              browser:
                'sha256-GmvP4f2Fg21H5bLWdUNqFFuLeGnLbXD7FDrb0CJL6CA= sha384-sewv7JNAfdDA+jcS+nn4auGm5Sad4GaMSxvT3IIlAdsLhUnxCjqWrWHbt4PWBJoo',
              legacyBrowser:
                'sha256-GmvP4f2Fg21H5bLWdUNqFFuLeGnLbXD7FDrb0CJL6CA= sha384-sewv7JNAfdDA+jcS+nn4auGm5Sad4GaMSxvT3IIlAdsLhUnxCjqWrWHbt4PWBJoo',
              node: 'invalid-digest',
            },
          };
          await deployBrokenModule({
            moduleName: moduleDetails.moduleName,
            version: moduleDetails.version,
          });
          await addModuleToModuleMap(moduleDetails);
          blocklistingOfModuleLogSearch = searchForNextLogMatch(blocklistRegex);
          // not ideal but need to wait for app to poll;
          await waitFor(minPollTime);
        });

        afterAll(async () => {
          writeModuleMap(originalModuleMap);
          await dropModuleVersion({
            moduleName: moduleDetails.moduleName,
            version: moduleDetails.version,
          });
        });

        test('sneaky-frank added to blocklist', async () => {
          await expect(blocklistingOfModuleLogSearch).resolves.toMatch(blocklistRegex);
        });

        test('does not load broken module', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/sneaky-frank`);
          const missingModuleMessageElement = await browser.$('.missingModuleMessage');
          const missingModuleNameElement = await missingModuleMessageElement.$(
            '.missingModuleName'
          );
          const missingModuleName = await missingModuleNameElement.getText();
          expect(missingModuleName.includes('sneaky-frank')).toBe(true);
        });

        test('one-app remains healthy', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/success`);
          const header = await browser.$('.helloMessage');
          const headerText = await header.getText();
          expect(headerText).toBe('Hello! One App is successfully rendering its Modules!');
        });
      });

      describe('loading module with an integrity mismatch on the client', () => {
        let moduleDetails;

        beforeAll(async () => {
          const version = '0.0.0';
          const moduleName = 'healthy-frank';
          moduleDetails = {
            moduleName,
            version,
            integrityDigests: {
              ...retrieveModuleIntegrityDigests({ moduleName, version }),
              browser: 'sha256-invalid-digest sha384-invalid-digest',
              legacyBrowser: 'sha256-invalid-digest sha384-invalid-digest',
            },
          };
          await addModuleToModuleMap(moduleDetails);
          // not ideal but need to wait for app to poll;
          await waitFor(minPollTime);
        });

        afterAll(() => {
          writeModuleMap(originalModuleMap);
        });

        test('does not load unverified module on the browser', async () => {
          await browser.url(`${appAtTestUrls.browserUrl}/demo/healthy-frank`);
          const consoleLogs = await browser.getLogs('browser');

          expect(consoleLogs).toEqual(
            expect.arrayContaining([
              {
                level: 'SEVERE',
                message: expect.stringMatching(
                  /https:\/\/one-app:8443\/demo\/healthy-frank - Failed to find a valid digest in the 'integrity' attribute for resource 'https:\/\/sample-cdn\.frank\/modules\/.+\/healthy-frank\/0\.0\.0\/healthy-frank.browser.js' with computed SHA-384 integrity '.+'\. The resource has been blocked\./
                ),
                source: 'security',
                timestamp: expect.any(Number),
              },
            ])
          );
        });
      });

      describe('needy frank can make universal requests to an api', () => {
        afterAll(async () => {
          writeModuleMap(originalModuleMap);
        });
        describe('with iguazu', () => {
          describe('with ssr enabled', () => {
            beforeAll(async () => {
              const integrityDigests = retrieveModuleIntegrityDigests({
                moduleName: 'needy-frank',
                version: '0.0.0',
              });
              await addModuleToModuleMap({
                moduleName: 'needy-frank',
                version: '0.0.0',
                integrityDigests,
              });
              await waitFor(minPollTime);
            });
            test('should have SSR preload module state with readPosts', async () => {
              await browser.url(
                `${appAtTestUrls.browserUrl}/demo/needy-frank?api=https://fast.api.frank/posts`
              );
              const needyFrankModuleStateTag = await browser.$('.needy-frank-loaded-data');
              const needyFrankModuleState = await needyFrankModuleStateTag.getText();
              expect(JSON.parse(needyFrankModuleState)).toMatchSnapshot();
            });

            describe('uses root module provided fetch', () => {
              test('should timeout on server if request exceeds one second', async () => {
                await browser.url(
                  `${appAtTestUrls.browserUrl}/demo/needy-frank?api=https://slow.api.frank/posts`
                );
                const needyFrankModuleStateTag = await browser.$('.needy-frank-loaded-data');
                const needyFrankModuleState = await needyFrankModuleStateTag.getText();
                expect(JSON.parse(needyFrankModuleState)).toEqual({
                  procedures: {
                    pendingCalls: {
                      readPosts: {},
                    },
                    procedureCaches: {
                      readPosts: {
                        '8cd6dad8022e63aee356ac38f2f079d979eb40ef': {
                          message: 'Request to https://***/posts was too slow',
                          name: 'Error',
                        },
                      },
                    },
                  },
                  resources: {},
                });
              });
            });
          });
          describe('with ssr disabled', () => {
            beforeAll(async () => {
              const integrityDigests = retrieveModuleIntegrityDigests({
                moduleName: 'needy-frank',
                version: '0.0.1',
              });
              await addModuleToModuleMap({
                moduleName: 'needy-frank',
                version: '0.0.1',
                integrityDigests,
              });
              await waitFor(minPollTime);
            });
            test('should timeout on client if request exceeds six seconds', async () => {
              await browser.url(
                `${appAtTestUrls.browserUrl}/demo/needy-frank?api=https://extra-slow.api.frank/posts`
              );
              await waitFor(7000);
              const needyFrankModuleStateTag = await browser.$('.needy-frank-loaded-data');
              const needyFrankModuleState = await needyFrankModuleStateTag.getText();
              expect(JSON.parse(needyFrankModuleState)).toMatchSnapshot({
                procedures: {
                  procedureCaches: {
                    readPosts: {
                      de48373b416b8d2af053d04402c35d194568ffdd: {
                        stack: expect.stringContaining(
                          'Error: https://extra-slow.api.frank/posts after 6000ms'
                        ),
                      },
                    },
                  },
                },
              });
            });
          });
        });
      });

      describe('`providedExternals` and `requiredExternals` module configuration', () => {
        afterAll(() => {
          removeModuleFromModuleMap('late-frank');
        });

        describe('root module `providedExternals` usage', () => {
          const providedExternalsModuleValidation = /Module frank-lloyd-root attempted to provide externals/;

          const moduleName = 'frank-lloyd-root';
          const version = '0.0.2';

          let providedExternalsWarning;

          beforeAll(async () => {
            providedExternalsWarning = searchForNextLogMatch(providedExternalsModuleValidation);
            await addModuleToModuleMap({
              moduleName,
              version,
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
          });

          afterAll(() => {
            writeModuleMap(originalModuleMap);
          });

          test('no warnings written to log if a root module is configured with `providedExternals`', async () => {
            await expect(providedExternalsWarning).rejects.toEqual(
              new Error(
                'Failed to match: /Module frank-lloyd-root attempted to provide externals/ in logs'
              )
            );
          });

          test('loads root module correctly with styles from @emotion/core when the root module `providesExternals`', async () => {
            await browser.url(`${appAtTestUrls.browserUrl}/success`);
            const headerBody = await browser.$('.helloMessage');
            const headerText = await headerBody.getText();
            const headerColor = await headerBody.getCSSProperty('background-color');
            expect(
              headerText.includes('Hello! One App is successfully rendering its Modules!')
            ).toBe(true);
            expect(headerColor.value).toEqual('rgba(0,0,255,1)'); // color: blue;
          });
        });

        describe('child module `providedExternals` invalid usage', () => {
          const providedExternalsModuleValidation = /Module late-frank attempted to provide externals/;

          const moduleName = 'late-frank';
          const version = '0.0.1';

          let providedExternalsWarning;

          beforeAll(async () => {
            providedExternalsWarning = searchForNextLogMatch(providedExternalsModuleValidation);
            await addModuleToModuleMap({
              moduleName,
              version,
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
          });

          afterAll(() => {
            writeModuleMap(originalModuleMap);
          });

          test('writes a warning to log if a child module is configured with `providedExternals`', async () => {
            await expect(providedExternalsWarning).resolves.toMatch(
              providedExternalsModuleValidation
            );
          });

          test('loads child module correctly with styles from @emotion/core regardless of mis-configuration', async () => {
            await browser.url(`${appAtTestUrls.browserUrl}/demo/late-frank`);
            const headerBody = await browser.$('.lateFrank');
            const headerText = await headerBody.getText();
            const headerColor = await headerBody.getCSSProperty('color');
            expect(headerText.includes('Sorry Im late!')).toBe(true);
            expect(headerColor.value).toEqual('rgba(255,192,203,1)'); // color: pink;
          });
        });

        describe('child module `requiredExternals` invalid usage', () => {
          const moduleName = 'cultured-frankie';
          const version = '0.0.1';

          afterEach(async () => {
            writeModuleMap(originalModuleMap);
            await waitFor(5000);
          });

          test('fails to get external `react-intl` for child module as an unsupplied `requiredExternal` - logs failure', async () => {
            const requiredExternalsErrorMatch = /External 'react-intl' is required by cultured-frankie, but is not provided by the root module/;

            const requiredExternalsError = searchForNextLogMatch(requiredExternalsErrorMatch);
            await addModuleToModuleMap({
              moduleName,
              version,
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);

            await expect(requiredExternalsError).resolves.toMatch(requiredExternalsErrorMatch);
          });

          test('fails to get external `react-intl` for child module as an unsupplied `requiredExternal` - Logs reverting message', async () => {
            const revertErrorMatch = /There was an error loading module (?<moduleName>.*) at (?<url>.*). Reverting back to (?<workingModule>.*)/;
            const requiredExternalsError = searchForNextLogMatch(revertErrorMatch);
            await addModuleToModuleMap({
              moduleName,
              version,
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
            const loggedError = await requiredExternalsError;
            const [, problemModule, problemModuleUrl, workingUrl] = revertErrorMatch
              .exec(loggedError);
            const gitSha = await retrieveGitSha();
            await expect(requiredExternalsError).resolves.toMatch(revertErrorMatch);
            expect(problemModule).toBe('cultured-frankie');
            expect(problemModuleUrl).toBe(
              `${testCdnUrl}/${gitSha}/${moduleName}/${version}/${moduleName}.node.js`
            );
            // eslint-disable-next-line no-useless-escape
            expect(workingUrl).toBe(
              `${testCdnUrl}/${gitSha}/${moduleName}/0.0.0/${moduleName}.node.js"}`
            );
          });
          test('fails to get external `semver` for child module as an unsupplied `requiredExternal` for new module in mooduleMap', async () => {
            const revertErrorMatch = /There was an error loading module (?<moduleName>.*) at (?<url>.*). Ignoring (?<ignoredModule>.*) until .*/;
            const requiredExternalsError = searchForNextLogMatch(revertErrorMatch);
            const modName = 'unhealthy-frank';
            const modVersion = '0.0.0';
            await addModuleToModuleMap({
              moduleName: modName,
              version: modVersion,
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
            const loggedError = await requiredExternalsError;
            const [, problemModule, problemModuleUrl, ignoredModule] = revertErrorMatch
              .exec(loggedError);
            const gitSha = await retrieveGitSha();
            await expect(requiredExternalsError).resolves.toMatch(revertErrorMatch);
            expect(problemModule).toBe(modName);
            expect(problemModuleUrl).toBe(
              `${testCdnUrl}/${gitSha}/${modName}/${modVersion}/${modName}.node.js`
            );
            expect(ignoredModule).toBe(modName);
          });

          test('does not modify the original version "0.0.0" of the failing module', async () => {
            const response = await fetch(`${appAtTestUrls.fetchUrl}/demo/${moduleName}`, {
              ...defaultFetchOptions,
            });
            const htmlData = await response.text();
            expect(/<script.*cultured-frankie\/0\.0\.0.*>/.test(htmlData)).toBe(true);
          });
        });

        describe('child module `requiredExternals` valid usage', () => {
          const providedExternalsModuleValidation = /Module late-frank attempted to provide externals/;

          let providedExternalsWarning;

          beforeAll(async () => {
            providedExternalsWarning = searchForNextLogMatch(providedExternalsModuleValidation);
            await addModuleToModuleMap({
              moduleName: 'frank-lloyd-root',
              version: '0.0.2',
            });
            await addModuleToModuleMap({
              moduleName: 'late-frank',
              version: '0.0.2',
            });
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
          });

          afterAll(async () => {
            writeModuleMap(originalModuleMap);
            // not ideal but need to wait for app to poll;
            await waitFor(minPollTime);
          });

          test('does not write a warning to log if a child module is configured with `requiredExternals`', async () => {
            await expect(providedExternalsWarning).rejects.toEqual(
              new Error(
                'Failed to match: /Module late-frank attempted to provide externals/ in logs'
              )
            );
          });

          test('loads child module correctly with styles from @emotion/core', async () => {
            await browser.url(`${appAtTestUrls.browserUrl}/demo/late-frank`);
            const headerBody = await browser.$('.lateFrank');
            const headerText = await headerBody.getText();
            const headerColor = await headerBody.getCSSProperty('color');
            expect(headerText.includes('Sorry Im late!')).toBe(true);
            expect(headerColor.value).toEqual('rgba(255,192,203,1)'); // color: pink;
          });
        });
      });
    });

    describe('module requires SafeRequest Restricted Attributes not provided by the root module', () => {
      const requestRestrictedAttributesRegex = /Error: Root module must extendSafeRequestRestrictedAttributes with cookies: \[macadamia,homebaked]/;
      let requestRestrictedAttributesLogSearch;

      beforeAll(async () => {
        requestRestrictedAttributesLogSearch = searchForNextLogMatch(
          requestRestrictedAttributesRegex
        );
        await addModuleToModuleMap({
          moduleName: 'vitruvius-franklin',
          version: '0.0.1',
          integrityDigests: retrieveModuleIntegrityDigests({
            moduleName: 'vitruvius-franklin',
            version: '0.0.1',
          }),
        });
        // not ideal but need to wait for app to poll;
        await waitFor(minPollTime);
      });

      afterAll(() => {
        writeModuleMap(originalModuleMap);
      });

      it('does not update the module in memory', async () => {
        await browser.url(`${appAtTestUrls.browserUrl}/vitruvius`);
        const versionSelector = await browser.$('.version');
        const version = await versionSelector.getText();
        expect(version).toEqual('0.0.0');
      });

      it('does not load module', async () => {
        await expect(requestRestrictedAttributesLogSearch).resolves.toMatch(
          requestRestrictedAttributesRegex
        );
      });
    });

    test('app calls loadModuleData to run async requests using root module provided fetchClient', async () => {
      const response = await fetch(`${appAtTestUrls.fetchUrl}/demo/ssr-frank`, {
        ...defaultFetchOptions,
      });
      const htmlData = await response.text();
      const scriptContents = htmlData.match(
        /<script id="initial-state" nonce=\S+>([^<]+)<\/script>/
      )[1];
      const initialState = scriptContents.match(/window\.__INITIAL_STATE__ = "([^<]+)";/)[1];
      const state = transit.fromJSON(initialState.replace(/\\/g, ''));
      expect(state.getIn(['modules', 'ssr-frank', 'data'])).toEqual({
        posts: [
          {
            author: 'typicode',
            id: 1,
            title: 'json-server',
          },
        ],
        secretMessage: 'you are being watched',
        loadedOnServer: true,
      });
    });

    describe('module root configureRequestLog', () => {
      it('has included userId from cookies in request log', async () => {
        const requestLogRegex = /some-user-id-1234/;
        const searchForRequerstLog = searchForNextLogMatch(requestLogRegex);
        await browser.setCookies({
          name: 'userId',
          value: 'some-user-id-1234',
        });
        await browser.url(`${appAtTestUrls.browserUrl}/success`);
        await expect(searchForRequerstLog).resolves.toMatch(requestLogRegex);
      });

      it('log gets updated when Root module gets updated', async () => {
        await addModuleToModuleMap({
          moduleName: 'frank-lloyd-root',
          version: '0.0.2',
          integrityDigests: retrieveModuleIntegrityDigests({
            moduleName: 'frank-lloyd-root',
            version: '0.0.2',
          }),
        });
        const waiting = waitFor(5000);

        const requestLogRegex = /abcdefg123456/;
        const searchForRequerstLog = searchForNextLogMatch(requestLogRegex);
        await browser.setCookies({
          name: 'guuid',
          value: 'abcdefg123456',
        });
        await waiting;
        await browser.url(`${appAtTestUrls.browserUrl}/success`);
        await expect(searchForRequerstLog).resolves.toMatch(requestLogRegex);
      });

      afterAll(() => {
        writeModuleMap(originalModuleMap);
      });
    });

    describe('custom error page', () => {
      const loadCustomErrorPageRoot = async () => {
        await addModuleToModuleMap({
          moduleName: 'frank-lloyd-root',
          version: '0.0.2',
        });
        // wait for change to be picked up
        await waitFor(minPollTime);
      };

      afterAll(() => {
        writeModuleMap(originalModuleMap);
      });
      describe('successful fetch of error page', () => {
        beforeAll(loadCustomErrorPageRoot);
        test('responds with a custom error page', async () => {
          const response = await fetch(
            `${appAtTestUrls.fetchUrl}/%c0.%c0./%c0.%c0./%c0.%c0./%c0.%c0./winnt/win.ini`,
            defaultFetchOptions
          );
          const body = await response.text();
          expect(body).toContain('Here is a custom error page though.');
        });
      });
    });

    describe('progressive web app', () => {
      const scriptUrl = `${appAtTestUrls.fetchUrl}/_/pwa/service-worker.js`;
      const webManifestUrl = `${appAtTestUrls.fetchUrl}/_/pwa/manifest.webmanifest`;
      const offlineUrl = `${appAtTestUrls.fetchUrl}/_/pwa/shell`;

      const fetchServiceWorker = () => fetch(scriptUrl, defaultFetchOptions);
      const fetchWebManifest = () => fetch(webManifestUrl, defaultFetchOptions);
      const fetchOfflineShell = () => fetch(offlineUrl, defaultFetchOptions);
      const loadInitialRoot = async () => {
        await addModuleToModuleMap({
          moduleName: 'frank-lloyd-root',
          version: '0.0.0',
        });
        // wait for change to be picked up
        await waitFor(minPollTime);
      };
      const loadPWARoot = async () => {
        await addModuleToModuleMap({
          moduleName: 'frank-lloyd-root',
          version: '0.0.3',
        });
        // wait for change to be picked up
        await waitFor(minPollTime);
      };

      afterAll(() => {
        writeModuleMap(originalModuleMap);
      });

      describe('default pwa state', () => {
        test('does not load PWA resources from server by default', async () => {
          expect.assertions(3);

          const serviceWorkerResponse = await fetchServiceWorker();
          const webManifestResponse = await fetchWebManifest();
          const offlineResponse = await fetchOfflineShell();

          expect(serviceWorkerResponse.status).toBe(404);
          expect(webManifestResponse.status).toBe(404);
          expect(offlineResponse.status).toBe(404);
        });
      });

      describe('progressive web app enabled', () => {
        // we load in the pwa enabled frank-lloyd-root
        beforeAll(loadPWARoot);

        test('loads PWA resources from server', async () => {
          expect.assertions(9);

          const serviceWorkerResponse = await fetchServiceWorker();

          expect(serviceWorkerResponse.status).toBe(200);
          expect(serviceWorkerResponse.headers.get('cache-control')).toEqual('no-store, no-cache');
          expect(serviceWorkerResponse.headers.get('service-worker-allowed')).toEqual('/');

          const webManifestResponse = await fetchWebManifest();

          expect(webManifestResponse.status).toBe(200);
          expect(webManifestResponse.headers.get('cache-control')).toBeDefined();
          expect(webManifestResponse.headers.get('content-type')).toEqual(
            'application/manifest+json'
          );

          const offlineResponse = await fetchOfflineShell();

          expect(offlineResponse.status).toBe(200);
          expect(offlineResponse.headers.get('content-security-policy')).toBeDefined();
          expect(offlineResponse.headers.get('content-type')).toEqual('text/html; charset=utf-8');
        });

        test('service worker has a valid registration', async () => {
          expect.assertions(1);

          await browser.url(`${appAtTestUrls.browserUrl}/success`);

          const ready = await browser.executeAsync(getServiceWorkerReady);

          expect(ready).toMatchObject({
            // subset of registration
            waiting: null,
            installing: null,
            active: {
              scriptURL: scriptUrl.replace(appAtTestUrls.fetchUrl, appAtTestUrls.browserUrl),
            },
            scope: `${appAtTestUrls.browserUrl}/`,
            updateViaCache: 'none',
          });
        });

        describe('caching', () => {
          const oneAppVersionRegExp = /\/([^/]+)(?:\/i18n)?\/[^/]*\.js$/;

          describe('caching resources', () => {
            test('caches offline PWA resources on start', async () => {
              expect.assertions(3);

              await browser.url(`${appAtTestUrls.browserUrl}/success`);

              await waitFor(500);

              const cacheKeys = await browser.executeAsync(getCacheKeys);
              const cacheMap = new Map(await browser.executeAsync(getCacheEntries, cacheKeys));
              const [shell, manifest] = [
                `${appAtTestUrls.browserUrl}/_/pwa/shell`,
                `${appAtTestUrls.browserUrl}/_/pwa/manifest.webmanifest`,
              ];

              await expect(browser.executeAsync(getCacheMatch, shell)).resolves.toBeDefined();
              await expect(browser.executeAsync(getCacheMatch, manifest)).resolves.toBeDefined();
              expect(cacheMap.get('__sw/offline').sort()).toEqual([manifest, shell].sort());
            });

            test('caches the app assets and entry root module', async () => {
              expect.assertions(3);

              await browser.url(`${appAtTestUrls.browserUrl}/success`);

              await waitFor(500);

              const holocronModuleMap = readModuleMap();
              const cacheKeys = await browser.executeAsync(getCacheKeys);
              const cacheMap = new Map(await browser.executeAsync(getCacheEntries, cacheKeys));
              const oneAppCacheURLs = cacheMap
                .get('__sw/one-app')
                .map((url) => url.replace(url.match(oneAppVersionRegExp)[1], '[one-app-version]'));

              expect(cacheMap.get('__sw/lang-packs')).toBeUndefined();
              expect(cacheMap.get('__sw/modules')).toEqual([
                holocronModuleMap.modules['frank-lloyd-root'].browser.url,
              ]);
              expect(oneAppCacheURLs).toEqual(
                expect.arrayContaining([
                  // the build output directory uses the git sha which
                  // changes from any modification
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/app~vendors.js`,
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/runtime.js`,
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/vendors.js`,
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/i18n/en-US.js`,
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/app.js`,
                  `${appAtTestUrls.cdnUrl}/app/[one-app-version]/service-worker-client.js`,
                ])
              );
            });

            test('caches a module and its code-split chunk', async () => {
              expect.assertions(2);

              await browser.url(`${appAtTestUrls.browserUrl}/demo/franks-burgers`);
              const openerMessage = await browser.$('#franks-opening-line');
              await openerMessage.waitForExist();
              const btn = await browser.$('#order-burger-btn');
              await btn.click();
              const franksBurger = await browser.$('#franks-burger');
              await franksBurger.waitForExist();

              const holocronModuleMap = readModuleMap();
              const cacheKeys = await browser.executeAsync(getCacheKeys);
              const cacheMap = new Map(await browser.executeAsync(getCacheEntries, cacheKeys));
              const burgerChunkURL = holocronModuleMap.modules[
                'franks-burgers'
              ].browser.url.replace('franks-burgers.browser.js', 'Burger.chunk.browser.js');

              expect(cacheMap.get('__sw/modules')).toHaveLength(4);
              expect(cacheMap.get('__sw/modules')).toEqual(
                expect.arrayContaining([
                  holocronModuleMap.modules['frank-lloyd-root'].browser.url,
                  holocronModuleMap.modules['preview-frank'].browser.url,
                  holocronModuleMap.modules['franks-burgers'].browser.url,
                  // the module chunk
                  burgerChunkURL,
                ])
              );
            });
          });

          describe('cache invalidation', () => {
            beforeAll(async () => {
              await addModuleToModuleMap({
                moduleName: 'late-frank',
                version: '0.0.0',
              });
              // wait for change to be picked up
              await waitFor(minPollTime);
            });

            describe('module version', () => {
              const fetchServiceWorkerScript = () => fetch(`${appAtTestUrls.fetchUrl}/_/pwa/service-worker.js`, {
                ...defaultFetchOptions,
              }).then((res) => res.text());

              test('service worker script is updated when the module map changes with new module version', async () => {
                expect.assertions(2);
                // due to the service worker script changing and being re-installed
                // selenium does not seem to update the service worker, we can check if the
                // service worker script is updated to make sure the latest module would be updated
                await expect(fetchServiceWorkerScript()).resolves.toContain('late-frank/0.0.0');
                await addModuleToModuleMap({
                  moduleName: 'late-frank',
                  version: '0.0.1',
                });
                // wait for change to be picked up
                await waitFor(minPollTime);
                await expect(fetchServiceWorkerScript()).resolves.toContain('late-frank/0.0.1');
              });
            });

            describe('module language pack', () => {
              test('invalidates a language pack if a different locale is loaded', async () => {
                expect.assertions(2);

                await browser.url(`${appAtTestUrls.browserUrl}/demo/cultured-frankie`);

                const holocronModuleMap = readModuleMap();
                const localeSelector = await browser.$('#locale-selector');
                // update the locale
                await localeSelector.selectByVisibleText('es-MX');
                await waitFor(500);

                const cacheKeys = await browser.executeAsync(getCacheKeys);
                const cacheMap = new Map(await browser.executeAsync(getCacheEntries, cacheKeys));
                const culturedFrankieUrl = holocronModuleMap.modules[
                  'cultured-frankie'
                ].browser.url.replace('cultured-frankie.browser.js', 'es-mx/cultured-frankie.json');
                // we should not expect an additional lang pack to be added,
                // rather it replaces the other one used by any given module
                expect(cacheMap.get('__sw/lang-packs')).toHaveLength(1);
                expect(cacheMap.get('__sw/lang-packs')).toEqual([culturedFrankieUrl]);
              });
            });
          });
        });
      });

      describe('progressive web app disabled', () => {
        // we load back up to frank-lloyd-root@0.0.0 to make sure the system is off
        beforeAll(loadInitialRoot);

        test('does not load PWA resources from server after shutdown', async () => {
          expect.assertions(3);

          const serviceWorkerResponse = await fetchServiceWorker();
          const webManifestResponse = await fetchWebManifest();
          const offlineResponse = await fetchOfflineShell();

          expect(serviceWorkerResponse.status).toBe(404);
          expect(webManifestResponse.status).toBe(404);
          expect(offlineResponse.status).toBe(404);
        });

        test('service worker is no longer registered and removed with root module change', async () => {
          expect.assertions(2);

          await browser.url(`${appAtTestUrls.browserUrl}/success`);

          // eslint-disable-next-line prefer-arrow-callback
          const result = await browser.executeAsync(function getRegistration(done) {
            navigator.serviceWorker.getRegistration().then(done);
          });

          expect(result).toBe(null);

          // eslint-disable-next-line prefer-arrow-callback
          const cacheKeys = await browser.executeAsync(getCacheKeys);

          expect(cacheKeys).toEqual([]);
        });
      });
    });
  });

  describe('Routes confidence checks', () => {
    const defaultFetchOptions = createFetchOptions();
    let originalModuleMap;
    const oneAppLocalPortToUse = getRandomPortNumber();
    const oneAppMetricsLocalPortToUse = getRandomPortNumber();
    const fetchUrl = `https://localhost:${oneAppLocalPortToUse}`;

    let browser;

    beforeAll(async () => {
      originalModuleMap = readModuleMap();
      ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse, oneAppMetricsLocalPortToUse }));
    });

    afterAll(async () => {
      await tearDownTestRunner({ browser });
      writeModuleMap(originalModuleMap);
    });

    test('Request: /_/status', async () => {
      const response = await fetch(`${fetchUrl}/_/status`, {
        ...defaultFetchOptions,
        method: 'GET',
        headers: {
          origin: 'test.example.com',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.raw()).toEqual({
        connection: [
          'close',
        ],
        'content-length': [
          '2',
        ],
        'content-type': [
          'text/plain; charset=utf-8',
        ],
        date: [
          expect.any(String),
        ],
        'one-app-version': [
          expect.any(String),
        ],
        'referrer-policy': [
          'same-origin',
        ],
        'strict-transport-security': [
          'max-age=63072000; includeSubDomains',
        ],
        vary: [
          'Accept-Encoding, accept-encoding',
        ],
        'x-content-type-options': [
          'nosniff',
        ],
        'x-dns-prefetch-control': [
          'off',
        ],
        'x-download-options': [
          'noopen',
        ],
        'x-frame-options': [
          'DENY',
        ],
        'x-permitted-cross-domain-policies': [
          'none',
        ],
        'x-xss-protection': [
          '1; mode=block',
        ],
      });
    });

    test('Request: /_/report/security/csp-violation', async () => {
      const response = await fetch(`${fetchUrl}/_/report/security/csp-violation`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: {
          origin: 'test.example.com',
        },
        body: {},
      });

      expect(response.headers.raw()).toEqual({
        vary: ['Accept-Encoding'],
        connection: [
          'close',
        ],
        'content-security-policy': [
          expect.any(String),
        ],
        date: [
          expect.any(String),
        ],
        'one-app-version': [
          expect.any(String),
        ],
        'referrer-policy': [
          'same-origin',
        ],
        'strict-transport-security': [
          'max-age=63072000; includeSubDomains',
        ],
        'x-content-type-options': [
          'nosniff',
        ],
        'x-dns-prefetch-control': [
          'off',
        ],
        'x-download-options': [
          'noopen',
        ],
        'x-frame-options': [
          'DENY',
        ],
        'x-permitted-cross-domain-policies': [
          'none',
        ],
        'x-xss-protection': [
          '1; mode=block',
        ],
      });
      expect(response.status).toBe(204);
      expect(response.type).toBe(undefined); // not specified
      expect(await response.text()).toBe('');
    });

    test('Request: /_/report/errors responds with status 415', async () => {
      const response = await fetch(`${fetchUrl}/_/report/errors`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: {
          origin: 'test.example.com',
        },
        body: {},
      });

      expect(response.headers.raw()).toEqual({
        connection: [
          'close',
        ],
        'content-length': [
          '22',
        ],
        'content-security-policy': [
          expect.any(String),
        ],
        'content-type': [
          'text/plain; charset=utf-8',
        ],
        date: [
          expect.any(String),
        ],
        'one-app-version': [
          expect.any(String),
        ],
        'referrer-policy': [
          'same-origin',
        ],
        'strict-transport-security': [
          'max-age=63072000; includeSubDomains',
        ],
        vary: [
          'Accept-Encoding, accept-encoding',
        ],
        'x-content-type-options': [
          'nosniff',
        ],
        'x-dns-prefetch-control': [
          'off',
        ],
        'x-download-options': [
          'noopen',
        ],
        'x-frame-options': [
          'DENY',
        ],
        'x-permitted-cross-domain-policies': [
          'none',
        ],
        'x-xss-protection': [
          '1; mode=block',
        ],
      });
      expect(response.status).toBe(415);
      expect(await response.text()).toBe('Unsupported Media Type');
    });

    test('Request: /_/report/errors responds with status 204', async () => {
      const response = await fetch(`${fetchUrl}/_/report/errors`, {
        ...defaultFetchOptions,
        method: 'POST',
        headers: {
          origin: 'test.example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(response.headers.raw()).toEqual({
        connection: [
          'close',
        ],
        'content-security-policy': [
          expect.any(String),
        ],
        date: [
          expect.any(String),
        ],
        'one-app-version': [
          expect.any(String),
        ],
        'referrer-policy': [
          'same-origin',
        ],
        'strict-transport-security': [
          'max-age=63072000; includeSubDomains',
        ],
        vary: ['Accept-Encoding'],
        'x-content-type-options': [
          'nosniff',
        ],
        'x-dns-prefetch-control': [
          'off',
        ],
        'x-download-options': [
          'noopen',
        ],
        'x-frame-options': [
          'DENY',
        ],
        'x-permitted-cross-domain-policies': [
          'none',
        ],
        'x-xss-protection': [
          '1; mode=block',
        ],
      });
    });

    test('Request: /foo/invalid.json', async () => {
      const response = await fetch(`${fetchUrl}/foo/invalid.json`, {
        ...defaultFetchOptions,
        method: 'GET',
        headers: {
          origin: 'test.example.com',
        },
      });

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not found');
      expect(response.headers.raw()).toEqual({
        'cache-control': [
          'no-store',
        ],
        connection: [
          'close',
        ],
        'content-length': [
          '9',
        ],
        'content-security-policy': [
          expect.any(String),
        ],
        'content-type': [
          'text/plain; charset=utf-8',
        ],
        date: [
          expect.any(String),
        ],
        'one-app-version': [
          expect.any(String),
        ],
        pragma: [
          'no-cache',
        ],
        'referrer-policy': [
          'no-referrer',
        ],
        'strict-transport-security': [
          'max-age=63072000; includeSubDomains',
        ],
        vary: [
          'Accept-Encoding, accept-encoding',
        ],
        'x-content-type-options': [
          'nosniff',
        ],
        'x-dns-prefetch-control': [
          'off',
        ],
        'x-download-options': [
          'noopen',
        ],
        'x-frame-options': [
          'SAMEORIGIN',
        ],
        'x-permitted-cross-domain-policies': [
          'none',
        ],
        'x-xss-protection': [
          '0',
        ],
      });
    });
  });
});

describe('Tests that can run against either local Docker setup or remote One App environments', () => {
  const { remoteOneAppEnvironment } = argv;
  const oneAppLocalPortToUse = getRandomPortNumber();
  const defaultFetchOpts = createFetchOptions({ targetRemoteAppInstance: remoteOneAppEnvironment });
  // urls are different bt what fetch uses and what selenium uses bc fetch runs from host and
  // selenium runs inside a docker container
  const appAtTestInstances = remoteOneAppEnvironment
    // conflicting eslint rules make it so that on running `lint --fix` this rule always fails
    // eslint-disable-next-line max-len
    ? remoteOneAppEnvironment.map((environmentUrl) => ({
      fetchUrl: environmentUrl,
      browserUrl: environmentUrl,
    }))
    : [
      {
        fetchUrl: `https://localhost:${oneAppLocalPortToUse}`,
        browserUrl: 'https://one-app:8443',
      },
    ];

  let browser;

  beforeAll(async () => {
    if (remoteOneAppEnvironment) {
      ({ browser } = await setUpTestRunner());
    } else {
      ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse }));
    }
  });

  afterAll(() => tearDownTestRunner({ browser }));

  appAtTestInstances.forEach((appInstanceUrls) => {
    describe(`with ${appInstanceUrls.fetchUrl} - `, () => {
      test('app renders successfully on the browser with no console errors', async () => {
        await browser.url(`${appInstanceUrls.browserUrl}/success`);
        const header = await browser.$('.helloMessage');
        const headerText = await header.getText();
        const consoleLogs = await browser.getLogs('browser');

        expect(headerText).toBe('Hello! One App is successfully rendering its Modules!');
        expect(consoleLogs).toEqual([]);
      });

      test('app allows CORS POST requests for partials', async () => {
        const response = await fetch(
          `${appInstanceUrls.fetchUrl}/html-partial/en-US/frank-the-parrot`,
          {
            ...defaultFetchOpts,
            method: 'POST',
            headers: {
              origin: 'test.example.com',
            },
            body: JSON.stringify({
              message: 'Hello!',
            }),
          }
        );
        expect(response.status).toBe(200);
        expect(response.headers.raw()).toHaveProperty('access-control-allow-origin');
        expect(response.headers.get('access-control-allow-origin')).toEqual('test.example.com');
      });

      test('app renders frank-lloyd-root on a POST', async () => {
        const response = await fetch(`${appInstanceUrls.fetchUrl}/success`, {
          ...defaultFetchOpts,
          method: 'POST',
          body: {},
        });
        const pageHtml = await response.text();
        expect(pageHtml).toContain('Hello! One App is successfully rendering its Modules!');
      });

      test('app passes vitruvius data to modules', async () => {
        await browser.addCookie({
          name: 'macadamia',
          value: 'digestive',
        });

        await browser.url(`${appInstanceUrls.browserUrl}/vitruvius`);
        const rootElement = await browser.$('#root');
        const pageHtml = await rootElement.getHTML();
        const data = JSON.parse(pageHtml.match(/<pre>([^<]+)<\/pre>/)[1].replace(/&quot;/g, '"'));
        expect(data).toMatchObject({
          config: expect.any(Object),
          req: {
            baseUrl: '',
            cookies: {
              macadamia: 'digestive',
            },
            headers: {
              'accept-language': 'en-US,en;q=0.9',
              host: expect.any(String),
              'user-agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            method: 'GET',
            originalUrl: '/vitruvius',
            params: {
              '*': 'vitruvius',
            },
            protocol: expect.stringMatching(/^https?$/),
            query: {},
            url: '/vitruvius',
          },
        });
      });

      test('app passes JSON POST data to modules via vitruvius', async () => {
        const response = await fetch(`${appInstanceUrls.fetchUrl}/vitruvius`, {
          ...defaultFetchOpts,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            legacy: 'application',
            sendingData: 'in POSTs',
          }),
        });

        const pageHtml = await response.text();
        const data = JSON.parse(pageHtml.match(/<pre>([^<]+)<\/pre>/)[1].replace(/&quot;/g, '"'));
        expect(data).toHaveProperty('req.body');
        expect(data.req.body).toEqual({
          legacy: 'application',
          sendingData: 'in POSTs',
        });
      });

      test('app passes urlencoded POST data to modules via vitruvius', async () => {
        const response = await fetch(`${appInstanceUrls.fetchUrl}/vitruvius`, {
          ...defaultFetchOpts,
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: 'legacy=application&sendingData=in POSTs',
        });

        const pageHtml = await response.text();
        const data = JSON.parse(pageHtml.match(/<pre>([^<]+)<\/pre>/)[1].replace(/&quot;/g, '"'));
        expect(data).toHaveProperty('req.body');
        expect(data.req.body).toEqual({
          legacy: 'application',
          sendingData: 'in POSTs',
        });
      });

      describe('routing', () => {
        test('IndexRedirect redirects', async () => {
          await browser.url(`${appInstanceUrls.browserUrl}/healthy-frank`);
          const url = await browser.getUrl();
          expect(url).toMatch(/healthy-frank\/simple/);
        });

        test('data loads when navigating to module on client', async () => {
          // start by navigating to ssr-frank without prefetch
          await browser.url(`${appInstanceUrls.browserUrl}/healthy-frank`);
          const regularLink = await browser.$('.ssr-frank-link');
          await regularLink.click();
          // need to wait for regular loading to finish;
          await waitFor(1e3);
          const renderedModuleData = await browser.$('.ssr-frank-loaded-data');
          const moduleStateAsText = await renderedModuleData.getText();
          const moduleState = JSON.parse(moduleStateAsText);
          // calling loadModuleData calls https://fast.api.frank/posts
          expect(moduleState).toEqual({
            isLoading: false,
            isComplete: true,
            error: null,
            data: {
              posts: [{ id: 1, title: 'json-server', author: 'typicode' }],
              secretMessage: null,
              loadedOnServer: false,
            },
          });
        });

        test('moduleRoutePrefetch loads data in ssr frank on hover', async () => {
          await browser.url(`${appInstanceUrls.browserUrl}/healthy-frank`);
          const prefetchLink = await browser.$('.prefetch-ssr-frank');
          await prefetchLink.moveTo();
          // need to wait for prefetching to finish;
          await waitFor(1e3);
          await prefetchLink.click();
          const loadedData = await browser.$('.ssr-frank-loaded-data');
          const moduleStateAsText = await loadedData.getText();
          const moduleState = JSON.parse(moduleStateAsText);
          // calling loadModuleData calls https://fast.api.frank/posts
          expect(moduleState).toEqual({
            isLoading: false,
            isComplete: true,
            error: null,
            data: {
              posts: [{ id: 1, title: 'json-server', author: 'typicode' }],
              secretMessage: null,
              loadedOnServer: false,
            },
          });
        });

        test('not found requests are caught', async () => {
          const response = await fetch(
            `${appInstanceUrls.fetchUrl}/this-route-does-not-exist`,
            defaultFetchOpts
          );
          const body = await response.text();
          expect(response.status).toBe(404);
          expect(body).toContain('<div id="root">Not found</div>');
        });
      });

      describe('internationalization', () => {
        test('uses language from the language pack to render on the initial page load', async () => {
          await browser.url(`${appInstanceUrls.browserUrl}/demo/cultured-frankie`);
          const greetingMessage = await browser.$('#greeting-message');
          await waitFor(minPollTime);
          expect(await greetingMessage.getText()).toBe(
            'Hello, my name is Frankie and I am in the United States!'
          );
        });

        test('successfully switches languages', async () => {
          await browser.url(`${appInstanceUrls.browserUrl}/demo/cultured-frankie`);
          const greetingMessage = await browser.$('#greeting-message');
          const localeSelector = await browser.$('#locale-selector');
          await localeSelector.selectByVisibleText('en-CA');
          await waitFor(minPollTime);
          expect(await greetingMessage.getText()).toBe(
            'Hello, my name is Frankie and I am in Canada!'
          );
          await waitFor(minPollTime);
          await localeSelector.selectByVisibleText('es-MX');
          await waitFor(minPollTime);
          expect(await greetingMessage.getText()).toBe(
            'Hola! Mi nombre es Frankie y estoy en Mexico!'
          );
        });
      });

      describe('code-splitting', () => {
        test('successfully loads a code-split module chunk with a language pack and then lazy loads `franks-burger` chunk', async () => {
          await browser.url(`${appInstanceUrls.browserUrl}/demo/franks-burgers`);

          const openerMessage = await browser.$('#franks-opening-line');
          await openerMessage.waitForExist({ timeout: 50000 });
          expect(await openerMessage.getText()).toBe(
            'Welcome to Franks Burgers! The best burgers in town.'
          );

          // before clicking to lazy load our chunk, ensure `franks-burger` does not exist
          const missingFranksBurger = await browser.$('#franks-burger');
          const exists = await missingFranksBurger.isExisting();
          expect(exists).toBeFalsy();

          // once confirmed chunk does not exist, click to load it
          const btn = await browser.$('#order-burger-btn');
          await btn.click();
          // grab the chunk and wait for it to load
          const franksBurger = await browser.$('#franks-burger');
          await franksBurger.waitForExist({ timeout: 50000 });
          await expect(franksBurger.getText()).resolves.toEqual('Burger');
        });
      });

      describe('HTML rendering', () => {
        describe('partial only', () => {
          test('responds with an incomplete HTML document', async () => {
            const response = await fetch(
              `${appInstanceUrls.fetchUrl}/html-partial/en-US/frank-the-parrot?message=Hello!`,
              defaultFetchOpts
            );
            const body = await response.text();
            expect(body).toBe(
              '<style class="ssr-css">.frank-lloyd-root__styles__stylish___2aiGw{color:orchid}</style><pre class="value-provided-from-config">https://intranet-origin-dev.example.com/some-api/v1</pre><span class="message">Hello!</span>'
            );
          });
        });
        describe('render text only', () => {
          test('responds with text only without HTML', async () => {
            const response = await fetch(
              `${appInstanceUrls.fetchUrl}/text-only/en-US/frank-the-parrot?message=Hello!`,
              defaultFetchOpts
            );
            const body = await response.text();
            expect(response.headers.get('content-type')).toEqual('text/plain; charset=utf-8');
            expect(body).toBe(' https://intranet-origin-dev.example.com/some-api/v1  Hello! ');
          });
        });
      });
      describe('static error page', () => {
        test('responds with default error page on rendering error', async () => {
          const response = await fetch(
            `${appInstanceUrls.fetchUrl}/%c0.%c0./%c0.%c0./%c0.%c0./%c0.%c0./winnt/win.ini`,
            defaultFetchOpts
          );
          const body = await response.text();
          expect(body).toMatch(new RegExp('<!DOCTYPE html>'));
          expect(body).toMatch(new RegExp('<title>One App</title>'));
          expect(body).toMatch(new RegExp('<meta name="application-name" content="one-app">'));
          expect(body).toMatch(
            new RegExp(
              '<h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>'
            )
          );
        });
      });
    });
  });
});

describe('Scan app instance for console errors', () => {
  const oneAppLocalPortToUse = getRandomPortNumber();
  const { scanEnvironment } = argv;
  const environmentsToScan = scanEnvironment || ['https://one-app:8443/success'];

  let browser;

  describe('scanning forward', () => {
    beforeAll(async () => {
      if (scanEnvironment) {
        ({ browser } = await setUpTestRunner());
      } else {
        ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse }));
      }
    });

    afterAll(async () => {
      await tearDownTestRunner({ browser });
      await waitFor(500);
    });

    environmentsToScan.forEach((url) => {
      test(`browser visits ${url} successfully with no console errors`, async () => {
        await browser.url(url);
        const consoleLogs = await browser.getLogs('browser');
        expect(consoleLogs).toEqual([]);
      });
    });
  });

  if (environmentsToScan.length > 1) {
    describe('scanning in reverse', () => {
      beforeAll(async () => {
        if (scanEnvironment) {
          ({ browser } = await setUpTestRunner());
        } else {
          ({ browser } = await setUpTestRunner({ oneAppLocalPortToUse }));
        }
      });

      afterAll(async () => {
        await tearDownTestRunner({ browser });
        await waitFor(500);
      });

      environmentsToScan.reverse().forEach((url) => {
        test(`browser visits ${url} successfully with no console errors`, async () => {
          await browser.url(url);
          const consoleLogs = await browser.getLogs('browser');
          expect(consoleLogs).toEqual([]);
        });
      });
    });
  }
});

describe('heapdump', () => {
  const oneAppLocalPortToUse = getRandomPortNumber();

  beforeAll(async () => {
    await setUpTestRunner({ oneAppLocalPortToUse, skipBrowser: true });
  });

  afterAll(async () => {
    await tearDownTestRunner();
    await waitFor(500);
  });

  it('writes a heapdump to /tmp on a SIGUSR2 signal', async () => {
    const tmpMountDir = path.resolve(__dirname, '../../prod-sample/one-app/tmp');
    // set up log watchers first to avoid semblance of a race condition
    const aboutToWritePromise = searchForNextLogMatch(/about to write a heapdump to .+/);
    // slower in Travis than on local machines
    const didWritePromise = searchForNextLogMatch(/wrote heapdump out to .+/, 20e3);
    await sendSignal('one-app', 'SIGUSR2');

    const aboutToWriteRaw = await aboutToWritePromise;
    const didWriteRaw = await didWritePromise;

    const aboutToWriteFilePath = aboutToWriteRaw
      .replace(/^about to write a heapdump to /, '')
      .replace(/".+$/, '');

    const didWriteFilePath = didWriteRaw.replace(/^wrote heapdump out to /, '').replace(/".+$/, '');

    expect(aboutToWriteFilePath).toEqual(didWriteFilePath);
    expect(path.dirname(didWriteFilePath)).toBe('/tmp');
    const didWriteFile = path.basename(didWriteFilePath);
    const dirContents = await fs.readdir(tmpMountDir);
    expect(dirContents).toContain(didWriteFile);

    const { size } = await fs.stat(path.join(tmpMountDir, didWriteFile));
    const oneMegabyte = 1024 * 1024;
    // at the time of writing size was observed to be 14-15MB but uncertain if this
    // is affected by my test development
    expect(size).toBeGreaterThanOrEqual(10 * oneMegabyte);
    expect(size).toBeLessThanOrEqual(100 * oneMegabyte);
  });
});
