import React from 'react';
import { FormattedMessage } from 'react-intl';

export default function OrderCountDown() {
  const [timer, setTimer] = React.useState(30 * 60);

  React.useState(() => {
    const ref = setInterval(() => {
      setTimer((time) => time - 1);
    }, 1000);

    return () => {
      clearInterval(ref);
    };
  }, []);

  return (
    <section>
      <h3>
        <FormattedMessage id="arrival-time" />
      </h3>

      <p>
        <span>{timer}</span>
        <span>
          {' '}
          <FormattedMessage id="time-units" />
        </span>
      </p>
    </section>
  );
}
