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

import fs from 'fs';

const getHttpsConfig = () => {
  if (!(process.env.HTTPS_PRIVATE_KEY_PATH && process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH)) {
    throw new Error(
      'HTTPS_PORT requires HTTPS_PRIVATE_KEY_PATH and HTTPS_PUBLIC_CERT_CHAIN_PATH to be set'
    );
  }

  const serverOptions = {
    key: fs.readFileSync(process.env.HTTPS_PRIVATE_KEY_PATH),
    cert: fs.readFileSync(process.env.HTTPS_PUBLIC_CERT_CHAIN_PATH),
    minVersion: 'TLSv1.2',
  };

  if (process.env.HTTPS_TRUSTED_CA_PATH) {
    Object.assign(serverOptions, {
      // self-signed certificate to the upstream load balancer
      ca: [fs.readFileSync(process.env.HTTPS_TRUSTED_CA_PATH)],
    });
  }

  if (process.env.HTTPS_PRIVATE_KEY_PASS_FILE_PATH) {
    Object.assign(serverOptions, {
      passphrase: fs.readFileSync(process.env.HTTPS_PRIVATE_KEY_PASS_FILE_PATH, 'utf8'),
    });
  }

  return serverOptions;
};

export default getHttpsConfig;
