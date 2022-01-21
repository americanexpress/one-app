import hasChildRoutes from '../../../src/universal/utils/hasChildRoutes';

it('hasChildRoutes returns false', () => {
  [undefined, null, '', {}].forEach((value) => {
    expect(hasChildRoutes(value)).toBe(false);
  });
});

it('hasChildRoutes returns true', () => {
  expect(hasChildRoutes({ childRoutes: [] })).toBe(true);
});
