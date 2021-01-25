import path from 'path';

jest.mock('yargs', () => ({ argv: { rootModuleName: 'my-module' } }));
jest.doMock(path.join(process.cwd(), 'static', 'module-map.json'), () => {
  throw new Error('bad module map path');
});

describe('env', () => {
  test('moduleMap field is undefined if module map path non-existent', () => {
    const environment = require('../../../../src/server/config/env/env');
    expect(environment.default.moduleMap).toBe('no such path');
    expect(environment.default.rootModuleNameDuplicate).toBeFalsy();
  });
});
