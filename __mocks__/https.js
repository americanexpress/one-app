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

const mock = {
  servers: [],
  listenError: null,
};

const https = {
  createServer: jest.fn(() => {
    const server = {
      listen: jest.fn((port, ipAddress, cb) => cb(mock.listenError || null)),
    };
    mock.servers.push(server);
    return server;
  }),
  mock,
};

export default https;
