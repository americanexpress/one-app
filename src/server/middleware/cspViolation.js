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

export default process.env.NODE_ENV === 'development'
  ? function cspViolation(req, res) {
    const violation = req.body && req.body['csp-report'];
    if (!violation) {
      console.warn('CSP Violation reported, but no data received');
    } else {
      const {
        'document-uri': documentUri,
        'violated-directive': violatedDirective,
        'blocked-uri': blockedUri,
        'line-number': lineNumber,
        'column-number': columnNumber,
        'source-file': sourceFile,
      } = violation;
      console.warn(`CSP Violation: ${sourceFile}:${lineNumber}:${columnNumber} on page ${documentUri} violated the ${violatedDirective} policy via ${blockedUri}`);
    }
    res.status(204).end();
  }
  : function cspViolation(req, res) {
    const violation = req.body ? JSON.stringify(req.body, null, 2) : 'No data received!';
    console.warn(`CSP Violation: ${violation}`);
    res.status(204).end();
  };
