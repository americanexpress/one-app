import React, { Suspense } from 'react';
import { FormattedMessage } from 'react-intl';
import { Wizard, Steps, Step } from 'react-albus';

import { OrderContext } from './context';

import Burger from './Burger';
import Menu from './Menu';
import Confirmation from './Confirmation';
import Delivery from './Delivery';

const Calendar = React.lazy(() => import(/* webpackChunkName: 'Calendar' */ './Calendar'));

function orderReducer(state = { ingredients: [], date: new Date() }, action) {
  switch (action.type) {
    default:
      return state;
    case 'add-ingredient':
      state.ingredients.push(action.ingredient);
      return { ...state };
    case 'remove-ingredient':
      state.ingredients.splice(action.index, 1);
      return { ...state };
    case 'clear-ingredients':
      return { ...state, ingredients: [] };
    case 'set-date':
      return { ...state, date: new Date(action.date) };
  }
}
export default function Order() {
  const [state, dispatch] = React.useReducer(orderReducer, { ingredients: [], date: new Date() });
  const context = {
    ...state,
    setDate(date) {
      dispatch({ type: 'set-date', date });
    },
    addIngredient(ingredient) {
      dispatch({ type: 'add-ingredient', ingredient });
    },
    removeIngredient(index) {
      dispatch({ type: 'remove-ingredient', index });
    },
    clearIngredient() {
      dispatch({ type: 'clear-ingredients' });
    },
  };
  console.log(context);

  return (
    <OrderContext.Provider
      value={context}
    >
      <Burger />

      <footer>
        <Wizard>
          <Steps>
            <Step
              id="menu-ingredients"
              render={({ next }) => (
                <div>
                  <Menu />
                  <button type="button" onClick={next} disabled={state.ingredients.length === 0}>
                    <FormattedMessage id="franks-cta" />
                  </button>
                </div>
              )}
            />
            <Step
              id="date-time-of-delivery"
              render={({ next, previous }) => (
                <div>
                  <Suspense fallback={<p><FormattedMessage id="loading" /></p>}>
                    <Calendar />
                  </Suspense>
                  <button type="button" onClick={previous}>
                    <FormattedMessage id="btn-previous" />
                  </button>
                  <button type="button" onClick={next}>
                    <FormattedMessage id="btn-next" />
                  </button>
                </div>
              )}
            />
            <Step
              id="confirmation"
              render={({ next, previous }) => (
                <div>
                  <Confirmation />
                  <button type="button" onClick={next}>
                    <FormattedMessage id="btn-confirm" />
                  </button>
                  <button type="button" onClick={previous}>
                    <FormattedMessage id="btn-previous" />
                  </button>
                </div>
              )}
            />
            <Step
              id="delivery"
              render={() => (
                <div>
                  <Delivery />
                </div>
              )}
            />
          </Steps>
        </Wizard>
      </footer>
    </OrderContext.Provider>
  );
}
