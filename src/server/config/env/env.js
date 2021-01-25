import { argv } from 'yargs';
import path from 'path';

function getLocalModuleMap() {
  const localModulePath = path.join(process.cwd(), 'static', 'module-map.json');
  try {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    return require(localModulePath);
  } catch (e) {
    return 'no such path';
  }
}

const moduleMap = argv.moduleMapUrl || getLocalModuleMap();
const rootModuleName = process.env.ONE_CLIENT_ROOT_MODULE_NAME || argv.rootModuleName;

const environment = {
  NODE_ENV: process.env.NODE_ENV,
  rootModuleName,
  HOLOCRON_MODULE_MAP_URL: process.env.HOLOCRON_MODULE_MAP_URL,
  ONE_CLIENT_REPORTING_URL: process.env.ONE_CLIENT_REPORTING_URL,
  ONE_CLIENT_CSP_REPORTING_URL: process.env.ONE_CLIENT_CSP_REPORTING_URL,
  ONE_CLIENT_ROOT_MODULE_NAME: process.env.ONE_CLIENT_ROOT_MODULE_NAME,
  ONE_CLIENT_CDN_URL: process.env.ONE_CLIENT_CDN_URL,
  ONE_CONFIG_ENV: process.env.ONE_CONFIG_ENV,
  moduleMap,
  rootModuleNameDuplicate: Boolean(argv.rootModuleName && process.env.ONE_CLIENT_ROOT_MODULE_NAME),
};

export { environment as default };
