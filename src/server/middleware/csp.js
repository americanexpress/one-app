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

import { v4 as uuidV4 } from 'uuid';
import ip from 'ip';

function parsePolicy(headerValue) {
  const policy = {};
  headerValue
    .split(';')
    .map((s) => s.trim())
    .forEach((directive) => {
      if (directive) {
        const parts = /^([^ ]+) (.+)$/.exec(directive);
        if (parts) {
          const directiveName = parts[1];
          policy[directiveName] = parts[2].split(' ');
        } else {
          policy[directive] = true;
        }
      }
    });
  return policy;
}

const insertSource = (policy, directive, value) => {
  const policyContainsDirective = policy.search(directive) !== -1;
  const updatedPolicy = policyContainsDirective
    ? policy.replace(directive, `${directive} ${value}`)
    : policy;
  return updatedPolicy;
};

export const cspCache = {
  policy: "default-src 'none';",
};

export function updateCSP(csp) {
  cspCache.policy = csp;
}

export function getCSP() {
  return parsePolicy(cspCache.policy);
}

const csp = () => (req, res, next) => {
  const { policy } = cspCache;
  const scriptNonce = uuidV4();
  let updatedPolicy;
  if (process.env.NODE_ENV === 'development') {
    const developmentAdditions = `${ip.address()}:* localhost:*`;
    let updatedScriptSrc;
    if (process.env.ONE_CSP_ALLOW_INLINE_SCRIPTS === 'true') {
      updatedScriptSrc = insertSource(policy, 'script-src', developmentAdditions);
    } else {
      updatedScriptSrc = insertSource(policy, 'script-src', `'nonce-${scriptNonce}' ${developmentAdditions}`);
    }
    updatedPolicy = insertSource(updatedScriptSrc, 'connect-src', developmentAdditions);
  } else {
    updatedPolicy = insertSource(policy, 'script-src', `'nonce-${scriptNonce}'`);
  }

  res.scriptNonce = scriptNonce;
  res.setHeader('Content-Security-Policy', updatedPolicy);
  next();
};

export default csp;
