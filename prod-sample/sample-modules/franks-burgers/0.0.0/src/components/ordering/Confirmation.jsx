/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

import React from 'react';
import { FormattedMessage } from 'react-intl';

import { OrderContext } from './context';

export default function OrderConfirmation() {
  const { ingredients, date } = React.useContext(OrderContext);
  return (
    <section>
      <header>
        <h2>
          <FormattedMessage id="order-confirmation" />
        </h2>
      </header>

      <p>
        <span>Date: </span>
        <span>{date.toString()}</span>
      </p>

      <ul>
        {React.Children.toArray([...ingredients].map((ingredient) => (
          <li>
            <p>{ingredient}</p>
          </li>
        )))}
      </ul>
    </section>
  );
}
