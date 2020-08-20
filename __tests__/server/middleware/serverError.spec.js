import serverError from '../../../src/server/middleware/serverError';

// existing coverage in ssrServer.spec.js

jest.spyOn(console, 'error').mockImplementation(() => {});
const next = jest.fn();
describe('serverError', () => {
  it('handles req with no headers however unlikely', () => {
    const reqWithNoHeaders = {};
    const res = { status: jest.fn(), send: jest.fn() };

    const callServerError = () => serverError('some error', reqWithNoHeaders, res, next);
    expect(callServerError).not.toThrowError();
  });
});
