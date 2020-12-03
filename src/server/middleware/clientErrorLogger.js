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

// /_/report/errors
import util from 'util';

const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';

export default function clientErrorLogger(req, res) {
  if (!nodeEnvIsDevelopment) {
    const contentType = req.headers['content-type'];
    if (!/^application\/json/i.test(contentType)) {
      return res.sendStatus(415);
    }

    const {
      body: errorsReported,
      headers: {
        'correlation-id': correlationId,
        'user-agent': userAgent,
      },
    } = req;

    if (Array.isArray(errorsReported)) {
      errorsReported.forEach((raw) => {
        if (!raw || typeof raw !== 'object') {
          // drop on the floor, this is the wrong interface
          console.warn(`dropping an error report, wrong interface (${typeof raw})`);
          return;
        }
        const {
          msg, stack, href, otherData,
        } = raw;
        const err = new Error(msg);
        Object.assign(err, {
          name: 'ClientReportedError',
          stack,
          userAgent,
          uri: href,
          metaData: {
            ...otherData,
            correlationId,
          },
        });
        console.error(util.inspect(err, false, 10, true));
      });
    } else {
      // drop on the floor, this is the wrong interface
      console.warn(`dropping an error report group, wrong interface (${typeof errorsReported})`);
    }
  }

  return res.sendStatus(204);
}
