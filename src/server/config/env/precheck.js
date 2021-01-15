import { argv } from 'yargs';

// The required environment variables and config options.
const environment = {
  NODE_ENV: process.env.NODE_ENV,
  rootModuleName: argv.rootModuleName,

};

// The rules the environment must follow
const rules = {
  NODE_ENV(parameter) {
    const validation = {
      success: ['development', 'production']
        .some((option) => option === parameter),
      explanation: `Environment variable NODE_ENV must be either "development" or "production"; given: "${parameter}"`,
    };
    return validation;
  },
  rootModuleName(parameter) {
    const validation = {
      success: Boolean(parameter) === true,
      explanation: 'option --root-module-name=<module-name> must be supplied if NODE_ENV != "development"',
    };
    return validation;
  },
};


function selectRules() {
  const { rootModuleName, NODE_ENV } = rules;
  if (environment.NODE_ENV === 'development') {
    return {
      rootModuleName,
    };
  }
  if (environment.NODE_ENV === 'production') {
    return {};
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
