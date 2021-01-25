const precheckMock = {
  __esModule: true,
  default: jest.fn(),
};

jest.doMock('../../../../src/server/config/env/precheck', () => precheckMock);


describe('run', () => {
  test('validateEnvironment is called', () => {
    require('../../../../src/server/config/env/run');
    expect(precheckMock.default).toHaveBeenCalled();
  });
});
