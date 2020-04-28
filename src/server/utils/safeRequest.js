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

function pick(request, safeKeys) {
  return safeKeys.reduce((obj, safeKey) => {
    if (request && request[safeKey] !== undefined) {
      // eslint-disable-next-line no-param-reassign
      obj[safeKey] = request[safeKey];
    }
    return obj;
  }, {});
}

const requestAllowList = [
  'acceptsLanguages',
  'baseUrl',
  'forwarded',
  'method',
  'originalUrl',
  'params',
  'protocol',
  'query',
  'url',
];

// This provides an extra level of control over the values allowed by default
const defaultRestrictedRequestAttributes = {
  headers: [
    'accept-language',
    'host',
    'user-agent',
  ],
  cookies: [],
};
const restrictedRequestAttributes = {
  ...defaultRestrictedRequestAttributes,
};

const moduleRequiredRestrictedAttributes = {};

export const getRequiredRestrictedAttributes = () => (
  Object.values(moduleRequiredRestrictedAttributes)
    .reduce((acc, requiredAttributes) => {
      Object.entries(requiredAttributes)
        .forEach(([attribute, values]) => {
          acc[attribute] = [...new Set(
            [
              ...acc[attribute] ? acc[attribute] : [],
              ...values,
            ]),
          ];
        });
      return acc;
    }, {})
);

const validateRequiredRestrictedPresent = (restrictedAttributeAdditions) => {
  const requiredRestrictedAttributesRemoved = [];
  const requiredRestrictedAttributes = getRequiredRestrictedAttributes();

  Object.keys(requiredRestrictedAttributes).forEach((key) => {
    const requiredAttributesIncluded = restrictedAttributeAdditions[key]
    && restrictedAttributeAdditions[key].every((requiredAttibute) => (
      restrictedAttributeAdditions[key].includes(requiredAttibute))
    );

    if (!requiredAttributesIncluded) {
      const missingRestrictedAttributes = requiredRestrictedAttributes[key];
      requiredRestrictedAttributesRemoved.push(
        `Attempting to remove required restricted attributes ${key}: ${missingRestrictedAttributes}`
      );
    }
  });

  if (requiredRestrictedAttributesRemoved.length !== 0) {
    throw new Error(requiredRestrictedAttributesRemoved.join('\n'));
  }
};

export const extendRestrictedAttributesAllowList = (restrictedAttributeAdditions) => {
  validateRequiredRestrictedPresent(restrictedAttributeAdditions);
  Object.keys(restrictedRequestAttributes)
    .forEach((key) => {
      restrictedRequestAttributes[key] = [
        ...defaultRestrictedRequestAttributes[key],
        ...restrictedAttributeAdditions[key] || [],
      ];
    });
};

export const validateSafeRequestRestrictedAttributes = (requiredAttributes, moduleName) => {
  const missingRequestItemsMessages = [];
  Object.keys(requiredAttributes)
    // only validate for attibutes defined in restrictedRequestAttributes
    .filter(((key) => Object.keys(restrictedRequestAttributes).includes(key)))
    .forEach((key) => {
      const requiredItems = requiredAttributes[key];
      const requestItemsIncluded = requiredItems.every((requiredValue) => (
        restrictedRequestAttributes[key].includes(requiredValue)
      ));

      if (!requestItemsIncluded) {
        missingRequestItemsMessages.push(
          `Root module must extendSafeRequestRestrictedAttributes with ${key}: [${requiredItems}]`
        );
      }
    });
  if (missingRequestItemsMessages.length !== 0) {
    throw new Error(missingRequestItemsMessages.join('\n'));
  }

  if (moduleName) {
    moduleRequiredRestrictedAttributes[moduleName] = requiredAttributes;
  }
};

export default function safeRequest(req, { useBodyForBuildingTheInitialState = false } = {}) {
  const request = pick(req, requestAllowList);

  Object.keys(restrictedRequestAttributes).forEach((restrictedAttribute) => {
    request[restrictedAttribute] = pick(
      req[restrictedAttribute],
      restrictedRequestAttributes[restrictedAttribute]
    );
  });

  if (useBodyForBuildingTheInitialState) {
    request.body = req.body;
  }

  return request;
}
