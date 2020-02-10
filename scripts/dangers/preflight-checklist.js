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

export default function preflightChecklist() {
  markdown(`\
### ☑️ Preflight Checklist:

_All questions must be addressed before this PR can be merged._

- What is the communication plan for this change?
- Does any documentation need to be updated or added to account for this change? If so was it done already?
- What is the motivation for this change?
- Should these changes also be applied to a maintenance branch or any other long lived branch?
- How was this change tested?
- Does this change require cross browser checks? Why or why not?
- Does this change require a performance test prior to merging? Why or why not?
- Could this be considered a breaking change? Why or why not?
- Does the change impact caching?
- Does the change impact HTTP headers?
- Does the change have any new infrastructure requirements?
- Does the change affect other versions of the app?
- Does the change require additional environment variables?
- What is the impact to developers using the app?
- What is the change to the size of assets?
- Should integration tests be added to protect against future regressions on this change?
`);
}
