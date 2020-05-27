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

const merge = (sourceObj, mergeObj) => {
  Object.keys(mergeObj).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(sourceObj, key)
                  && typeof sourceObj[key] === 'object'
                  && !Array.isArray(sourceObj[key])) {
      merge(sourceObj[key], mergeObj[key]);
    } else {
      // eslint-disable-next-line no-param-reassign
      sourceObj[key] = mergeObj[key];
    }
  });
  return sourceObj;
};

const deepMergeObjects = (baseObj, ...objs) => {
  objs.forEach((mergeObj) => merge(baseObj, mergeObj));
  return baseObj;
};

module.exports = deepMergeObjects;
