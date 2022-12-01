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

/** @jsx jsx */

import { jsx, css } from '@emotion/core';

const styles = css`
  background-color: grey;
  color: pink;
  font-size: 24px;
  font-family: system;
`;

export function FashionablyLateFrank() {
  // eslint-disable-next-line react/no-unknown-property
  return <div><h1 className="lateFrank" css={styles}>Sorry Im late!</h1></div>;
}

export default FashionablyLateFrank;
