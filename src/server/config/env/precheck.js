import { argv } from 'yargs';
import isFetchableUrlInNode from '@americanexpress/env-config-utils/isFetchableUrlInNode';
import isFetchableUrlInBrowser from '@americanexpress/env-config-utils/isFetchableUrlInBrowser';
import path from 'path';

// The required environment variables and config options.
const environment = {
  NODE_ENV: process.env.NODE_ENV,
  rootModuleName: argv.rootModuleName,
  HOLOCRON_MODULE_MAP_URL: process.env.HOLOCRON_MODULE_MAP_URL,
  ONE_CLIENT_REPORTING_URL: process.env.ONE_CLIENT_REPORTING_URL,
  ONE_CLIENT_CSP_REPORTING_URL: process.env.ONE_CLIENT_CSP_REPORTING_URL,
  ONE_CLIENT_ROOT_MODULE_NAME: process.env.ONE_CLIENT_ROOT_MODULE_NAME,
  ONE_CLIENT_CDN_URL: process.env.ONE_CLIENT_CDN_URL,
  ONE_CONFIG_ENV: process.env.ONE_CONFIG_ENV,
  localModuleMap: argv.localModuleMap,
  rootModuleNameDuplicate: Boolean(argv.rootModuleName && process.env.ONE_CLIENT_ROOT_MODULE_NAME),
};

// The rules the environment must follow
const rules = {
  NODE_ENV(parameter) {
    return {
      success: ['development', 'production']
        .some((option) => option === parameter),
      explanation: `NODE_ENV environment variable must be either "development" or "production"; given: ${parameter}`,
    };
  },
  rootModuleName(parameter) {
    return {
      success: Boolean(parameter) === true,
      explanation: 'option --root-module-name=<module-name> must be defined if NODE_ENV != "development"',
    };
  },
  HOLOCRON_MODULE_MAP_URL(parameter) {
    let success = true;
    let message;
    try {
      isFetchableUrlInNode(parameter);
    } catch (e) {
      success = false;
      message = e.message;
    }
    return {
      success,
      explanation: `HOLOCRON_MODULE_MAP_URL: ${message}`,
    };
  },
  ONE_CLIENT_REPORTING_URL(parameter) {
    let success = true;
    let message;
    try {
      isFetchableUrlInBrowser(parameter);
    } catch (e) {
      success = false;
      message = e.message;
    }
    return {
      success,
      explanation: `ONE_CLIENT_REPORTING_URL: ${message}`,
    };
  },
  ONE_CLIENT_CSP_REPORTING_URL(parameter) {
    let success = true;
    let message;
    try {
      isFetchableUrlInBrowser(parameter);
    } catch (e) {
      success = false;
      message = e.message;
    }
    return {
      success,
      explanation: `ONE_CLIENT_CSP_REPORTING_URL: ${message}`,
    };
  },
  ONE_CLIENT_ROOT_MODULE_NAME(parameter) {
    return {
      success: Boolean(parameter) === true,
      explanation: 'ONE_CLIENT_ROOT_MODULE_NAME environment variable must be defined',
    };
  },
  ONE_CLIENT_CDN_URL(parameter) {
    let success = true;
    let message;
    try {
      isFetchableUrlInBrowser(parameter);
      if (!/\/$/.test(parameter)) {
        throw new Error('ONE_CDN_URL must have a trailing slash');
      }
    } catch (e) {
      success = false;
      message = e.message;
    }
    return {
      success,
      explanation: `ONE_CDN_URL: ${message}`,
    };
  },
  ONE_CONFIG_ENV(parameter) {
    return {
      success: Boolean(parameter) === true,
      explanation: 'ONE_CONFIG_ENV environment variable must be defined',
    };
  },
  localModuleMap(parameter) {
    // only require a remote module map if there are no locally served modules
    let isLocalModuleMapEmpty = false;
    try {
      // eslint-disable-next-line import/no-dynamic-require,global-require
      const localModuleMap = require(path.join(process.cwd(), 'static', 'module-map.json'));
      if (Object.entries(localModuleMap).length === 0) {
        isLocalModuleMapEmpty = true;
      }
      // if local module map is an empty file we need to catch it
    } catch (error) {
      isLocalModuleMapEmpty = true;
    }
    return {
      success: !isLocalModuleMapEmpty || Boolean(parameter) === true,
      explanation: '`module-map-url` is required if there are no locally served modules',
    };
  },
  rootModuleNameDuplicate(parameter) {
    return {
      success: !parameter,
      explanation: 'Both the `root-module-name` argument and the `ONE_CLIENT_ROOT_MODULE_NAME` environment variable have been provided, but only one may be set at once.\n',
    };
  },
};


function selectRules() {
  const {
    NODE_ENV,
    rootModuleName,
    HOLOCRON_MODULE_MAP_URL,
    ONE_CLIENT_REPORTING_URL,
    ONE_CLIENT_CSP_REPORTING_URL,
    ONE_CLIENT_ROOT_MODULE_NAME,
    ONE_CLIENT_CDN_URL,
    ONE_CONFIG_ENV,
    localModuleMap,
    rootModuleNameDuplicate,
  } = rules;
  if (environment.NODE_ENV === 'development') {
    return {
      rootModuleName,
      localModuleMap,
    };
  }
  if (environment.NODE_ENV === 'production') {
    return {
      HOLOCRON_MODULE_MAP_URL,
      ONE_CLIENT_REPORTING_URL,
      ONE_CLIENT_CSP_REPORTING_URL,
      ONE_CLIENT_ROOT_MODULE_NAME,
      ONE_CLIENT_CDN_URL,
      ONE_CONFIG_ENV,
      rootModuleNameDuplicate,
    };
  }
  return {
    NODE_ENV,
  };
}

// An object mapping rule names to explanations for why they were broken
const rulesBroken = Object.entries(selectRules())
  .reduce((results, [parameter, validator]) => {
    const { success, explanation } = validator(environment[parameter]);
    if (!success) {
      results[parameter] = explanation;
    }
    return results;
  }, {});

if (Object.keys(rulesBroken).length > 0) {
  console.error('ERRORS:', rulesBroken);
  throw new Error('Please fix the above errors');
}
