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

// using https://prometheus.io/docs/practices/naming/ as our guide
import snakeCaseToCamelCase from '../utils/snakeCaseToCamelCase';

const validUnits = [
  'seconds',
  'bytes',
  'total',
];

export default function createMetricNamespace(namespace) {
  if (namespace.split('_').length > 1) {
    throw new Error('metric namespace/application should be a single word');
  }

  const names = {};
  const createMetricName = (middle, units) => {
    const nameParts = ['oneapp', namespace, middle];

    if (units) {
      const unitParts = units.split('_');

      if (unitParts.length > 2) {
        throw new Error(`should use only one type of units unless also using "total" (given "${units}")`);
      }

      // seconds_total is okay, seconds_bytes is not
      if (unitParts.length > 1) {
        if (unitParts[1] !== 'total') {
          throw new Error(`if combining two units the last should be "total" (given "${unitParts[1]}")`);
        }

        if (unitParts[0] === 'total') {
          throw new Error(`should use "total" only once (given "${units}")`);
        }
      }

      if (validUnits.indexOf(unitParts[0]) === -1) {
        throw new Error(`units needs to be one of ${validUnits.join(', ')}`);
      }

      nameParts.push(units);
    }

    const name = nameParts.join('_');

    names[snakeCaseToCamelCase(middle)] = name;

    return name;
  };

  createMetricName.getMetricNames = () => names;
  return createMetricName;
}
