# Contributing

The following guidelines must be followed by all contributors to this repository. Please review them carefully and do not hesitate to ask for help.

### Code of Conduct

* Review and test your code before submitting a pull request.
* Be kind and professional. Avoid assumptions; oversights happen.
* Be clear and concise when documenting code; focus on value.
* Don't commit commented code to the main repo (stash locally, if needed).

See [our code of conduct](./CODE_OF_CONDUCT.md) for more details.

### Running One App Locally

Clone and Install One App:

```bash
export NODE_ENV=development
git clone https://github.com/americanexpress/one-app.git
cd one-app
npm i --no-optional
```

At this point depending on what contribution you are looking to make you may wish to create a
sample module to demostrate your new feature, develop against, and ultimately run integration tests
against. The most efficient way to do so is to copy one of the existing sample modules
(`prod-sample/sample-modules/frank-lloyd-root/0.0.0`), and use that as your root module.

For more details on this see the [sample modules documentation](./prod-sample/README.md):

```bash
cd prod-sample/sample-modules/<your-newly-created-module>/0.0.0
npm ci
cd ../../../..
npm run serve-module prod-sample/sample-modules/<your-newly-created-module>/0.0.0
export ONE_CLIENT_ROOT_MODULE_NAME=<your-newly-created-module>
```

If there is an existing sample module that makes sense for you to use as you develop your feature
and write integration tests then use that instead.

```bash
cd prod-sample/sample-modules/<an-existing-module>/0.0.0
npm ci
cd ../../../..
npm run serve-module prod-sample/sample-modules/<an-existing-module>/0.0.0
export ONE_CLIENT_ROOT_MODULE_NAME=<an-existing-module>
```

Start One App:

```bash
npm run start:watch
```

### Running Tests

We use [Jest](https://jestjs.io/) as the test runner for all our tests and [ESLint](https://eslint.org/)
for linting. Prior to opening a pull request make sure to run `npm test`. This requires
[Docker](https://docs.docker.com/engine/installation/) to be installed.

To run the unit tests, integration tests, and linting:
```bash
$ npm test
```

If you would like to run only the unit tests:
```bash
npm run test:unit
```

Or only the [integration tests](./__tests__/integration/README.md):
```bash
npm run test:integration
```

Or only linting:
```bash
npm run test:lint
```

To auto fix eslint rule failures that are autofixable run `npm run test:lint -- --fix`

### Opening the PR

* [Fork the One App repository](https://github.com/americanexpress/one-app/fork), open a PR to `master`, and follow the guidelines outlined in this document.

### Pull Request Guidelines

* Keep PRs small, there should be one change per pull request.

* All pull requests must have descriptions and a link to corresponding issue(s) if applicable.

* Be sure to answer all the questions in our [preflight checklist](./scripts/dangers/preflight-checklist.js). There should be a comment from [Danger](https://danger.systems/js/) in the pull request asking for this checklist to be filled out.

* Keep [commit history clean](https://americanexpress.io/on-the-importance-of-commit-messages/). Follow commit message guidelines (see below) and squash commits as needed to keep a clean history. Remember that your git commit history should tell a story that should be easy to follow for anyone in the future.

* Before making substantial changes or changes to core functionality and/or architecture [open up an issue](https://github.com/americanexpress/one-app/issues/new) to propose and discuss the changes.

* Be patient. The review process will be thorough. It must be kept in mind that changes to our repos are platform wide and thus are not taken lightly. Be prepared to defend every single line of code in your pull request. Attempting to rush changes in will not work.

* Write tests for your changes. A feature is not considered done until it has tests and/or a test plan. It does not matter if code coverage shows 100%, tests are expected for *all* changes. This includes [integration tests](./__tests__/integration/README.md) as needed.

### Git Commit Guidelines

We follow precise rules for git commit message formatting. These rules make it easier to review commit logs and improve contextual understanding of code changes. This also allows us to auto-generate the CHANGELOG from commit messages and automatically version One App during releases.

For more information on the commit message guidelines we follow see [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
