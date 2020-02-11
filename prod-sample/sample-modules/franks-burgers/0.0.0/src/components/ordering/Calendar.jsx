import React from 'react';
import Calendar from 'react-calendar';
import { FormattedMessage } from 'react-intl';

import { OrderContext } from './context';

export default function BurgerCalendar() {
  const { date, setDate } = React.useContext(OrderContext);
  return (
    <section>
      <header>
        <h2>
          <FormattedMessage id="date-to-deliver" />
        </h2>
      </header>

      <Calendar
        onChange={setDate}
        value={date}
      />
    </section>
  );
}
