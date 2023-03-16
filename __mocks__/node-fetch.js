/*
 * Copyright 2022 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,either express
 * or implied. See the License for the specific language governing permissions and limitations
 * under the License.
 */

const fetch = jest.createMockFromModule('node-fetch');
fetch.mockReturnJsonOnce = (obj) => {
  if (obj instanceof Error) {
    return fetch.mockImplementationOnce(() => Promise.reject(obj));
  }

  return fetch.mockImplementationOnce(() => Promise.resolve({
    json: () => Promise.resolve(obj),
    text: () => Promise.resolve(JSON.stringify(obj)),
    status: 200,
  }));
};

fetch.mockReturnFileOnce = (body, status = 200) => {
  if (body instanceof Error) {
    return fetch.mockImplementationOnce(() => Promise.reject(body));
  }

  return fetch.mockImplementationOnce(
    () => Promise.resolve({
      text: () => Promise.resolve(body),
      status,
    })
  );
};
module.exports = fetch;
