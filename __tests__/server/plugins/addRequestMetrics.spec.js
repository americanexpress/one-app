/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import addRequestMetrics from '../../../src/server/plugins/addRequestMetrics';
import * as summaryMetrics from '../../../src/server/metrics/summaries';

describe('addRequestMetrics', () => {
  const options = {};
  const done = jest.fn();

  const fastify = {
    decorateRequest: jest.fn(),
    addHook: jest.fn(),
  };

  const stopSummary = jest.fn();
  const summarySpy = jest.spyOn(summaryMetrics, 'startSummaryTimer').mockReturnValue(stopSummary);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds summary timer', async () => {
    const request = {};
    addRequestMetrics(fastify, options, done);

    const [requestEventName, requestEventCallback] = fastify.addHook.mock.calls[0];
    const [responseEventName, responseEventCallback] = fastify.addHook.mock.calls[1];

    expect(requestEventName).toEqual('onRequest');
    expect(responseEventName).toEqual('onResponse');

    await requestEventCallback(request);
    expect(summarySpy).toHaveBeenCalled();
    expect(request.finishRouteTimer).toEqual(stopSummary);
    expect(stopSummary).not.toHaveBeenCalled();

    await responseEventCallback(request);
    expect(stopSummary).toHaveBeenCalled();
  });

  // not using decorateRequest can negatively impact performance
  // https://www.fastify.io/docs/latest/Guides/Plugins-Guide/#decorators
  it('uses decorateRequest', async () => {
    addRequestMetrics(fastify, options, done);
    expect(fastify.decorateRequest).toHaveBeenCalledWith('finishRouteTimer', null);
  });
});
