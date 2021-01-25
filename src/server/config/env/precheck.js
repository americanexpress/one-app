import isFetchableUrlInNode from '@americanexpress/env-config-utils/isFetchableUrlInNode';
import isFetchableUrlInBrowser from '@americanexpress/env-config-utils/isFetchableUrlInBrowser';
import AggregateError from 'es-aggregate-error';


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
      explanation: 'In development mode option --root-module-name=<module-name> is a required arg if environment variable ONE_CLIENT_ROOT_MODULE_NAME is undefined',
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
        throw new Error('url must have a trailing slash');
      }
    } catch (e) {
      success = false;
      message = e.message;
    }
    return {
      success,
      explanation: `ONE_CLIENT_CDN_URL: ${message}`,
    };
  },
  ONE_CONFIG_ENV(parameter) {
    return {
      success: Boolean(parameter) === true,
      explanation: 'ONE_CONFIG_ENV environment variable must be defined',
    };
  },
  moduleMap(parameter) {
    let success = true;
    let message;
    const moduleMapRef = typeof parameter;
    if (moduleMapRef === 'string') {
      try {
        isFetchableUrlInNode(parameter);
      } catch (e) {
        success = false;
        message = e.message;
      }
    } else if (moduleMapRef === 'object') {
      try {
        if (Object.keys(parameter).length === 0) {
          throw new Error('local module map is empty');
        }
      } catch (e) {
        success = false;
        message = e.message;
      }
    } else {
      success = false;
    }
    return {
      success,
      explanation: `option module-map-url is required if there are no locally served modules: ${message}`,
    };
  },
  rootModuleNameDuplicate(parameter) {
    return {
      success: !parameter,
      explanation: 'Both the `root-module-name` argument and the `ONE_CLIENT_ROOT_MODULE_NAME` environment variable have been provided, but only one may be set at once.',
    };
  },
};

function selectRules({ NODE_ENV: nodeEnv }) {
  const {
    NODE_ENV,
    rootModuleName,
    HOLOCRON_MODULE_MAP_URL,
    ONE_CLIENT_REPORTING_URL,
    ONE_CLIENT_CSP_REPORTING_URL,
    ONE_CLIENT_ROOT_MODULE_NAME,
    ONE_CLIENT_CDN_URL,
    ONE_CONFIG_ENV,
    moduleMap,
    rootModuleNameDuplicate,
  } = rules;
  if (nodeEnv === 'development') {
    return {
      rootModuleName,
      moduleMap,
    };
  }
  if (nodeEnv === 'production') {
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

export default function validateEnvironment(env) {
  const errors = Object.entries(selectRules(env))
    .reduce((results, [parameter, validator]) => {
      const { success, explanation } = validator(env[parameter]);
      if (!success) {
        results.push(new Error(explanation));
      }
      return results;
    }, []);
  const numOfErrors = errors.length;
  if (numOfErrors > 0) {
    throw new AggregateError(errors, `Please fix the following ${numOfErrors} errors`);
  }
}
