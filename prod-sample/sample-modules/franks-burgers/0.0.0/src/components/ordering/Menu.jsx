import React from 'react';
import { FormattedMessage } from 'react-intl';

import { OrderContext } from './context';

export default function Menu() {
  const { addIngredient } = React.useContext(OrderContext);
  return (
    <section>
      <header>
        <h2 id="franks-menu">
          <FormattedMessage id="franks-menu" />
        </h2>
      </header>

      <article>
        <header>
          <h3 id="franks-ingredients">
            <FormattedMessage id="franks-ingredients" />
          </h3>
        </header>

        <ul id="ingredients-list">
          {React.Children.toArray([
            <section id="ingredients-condiments">
              <button id="ingredient-ketchup" type="button" onClick={() => addIngredient('ketchup')}>
                <FormattedMessage id="ketchup" />
              </button>

              <button id="ingredient-mustard" type="button" onClick={() => addIngredient('mustard')}>
                <FormattedMessage id="mustard" />
              </button>

              <button id="ingredient-pickles" type="button" onClick={() => addIngredient('pickles')}>
                <FormattedMessage id="pickles" />
              </button>
            </section>,

            <section id="ingredients-vegetables">
              <button id="ingredient-onions" type="button" onClick={() => addIngredient('onions')}>
                <FormattedMessage id="onions" />
              </button>

              <button id="ingredient-lettuce" type="button" onClick={() => addIngredient('lettuce')}>
                <FormattedMessage id="lettuce" />
              </button>

              <button id="ingredient-tomato" type="button" onClick={() => addIngredient('tomato')}>
                <FormattedMessage id="tomato" />
              </button>
            </section>,

            <section id="ingredients-cheeses">
              <button id="ingredient-american-cheese" type="button" onClick={() => addIngredient('american-cheese')}>
                <FormattedMessage id="american-cheese" />
              </button>
            </section>,

            <section id="ingredients-patties">
              <button id="ingredient-veggie-patty" type="button" onClick={() => addIngredient('veggie-patty')}>
                <FormattedMessage id="veggie-patty" />
              </button>

              <button id="ingredient-beef-patty" type="button" onClick={() => addIngredient('beef-patty')}>
                <FormattedMessage id="beef-patty" />
              </button>
            </section>,
          ].map((child) => (
            <li>
              {child}
            </li>
          )))}
        </ul>
      </article>
    </section>
  );
}
