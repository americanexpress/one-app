#!/bin/bash
set -ev
docker build -t one-app:at-test .
if [ "${TRAVIS_PULL_REQUEST}" = "true" ] && [ "${TRAVIS_BRANCH}" = "prerelease" ]; then
  npm run build:sample-modules -- --archive-built-artifacts --bundle-statics-origin=https://one-app-statics.surge.sh
  echo 'https://one-app-sample.herokuapp.com' >> sample-module-bundles/CORS && \
  npx surge teardown one-app-statics.surge.sh && \
  npx surge sample-module-bundles one-app-statics.surge.sh && \
  docker login -u="$HEROKU_DOCKER_USERNAME" -p="$HEROKU_API_KEY" registry.heroku.com && \
  docker tag one-app:at-test registry.heroku.com/one-app-sample/web && \
  docker push registry.heroku.com/one-app-sample/web && \
  npx heroku container:release web -a one-app-sample && \
  ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD=true npm run test:integration -- --remote-one-app-environment=https://one-app-sample.herokuapp.com
else
  ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD=true npm run test:integration
fi
