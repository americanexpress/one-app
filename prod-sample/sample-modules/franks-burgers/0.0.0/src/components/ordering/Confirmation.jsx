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
