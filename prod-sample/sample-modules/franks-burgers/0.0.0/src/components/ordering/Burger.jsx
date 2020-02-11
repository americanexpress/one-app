import React from 'react';

import { OrderContext } from './context';

export default function Burger() {
  const { ingredients } = React.useContext(OrderContext);
  return (
    <ul>
      {React.Children.toArray(ingredients.map((ingredient) => (
        <li>{ingredient}</li>
      )))}
    </ul>
  );
}
