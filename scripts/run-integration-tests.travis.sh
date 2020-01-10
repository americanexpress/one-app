#!/bin/bash
set -ev
# npm run test:integration && \
# if [ "${TRAVIS_PULL_REQUEST}" = "false" ]; then
npx surge teardown one-app-statics.surge.sh && \
npm run build:sample-modules -- --archive-built-artifacts --bundle-statics-hostname=https://one-app-statics.surge.sh && \
npx surge sample-module-bundles one-app-statics.surge.sh
# heroku stuff here && \
# npm run test:integration -- --remote-one-app-environment=https://one-app-sample.com
# fi