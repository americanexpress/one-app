#!/bin/bash
set -ev
docker build -t one-app:at-test .
# npm run test:integration
# if [ "${TRAVIS_PULL_REQUEST}" = "false" ] && [ "${TRAVIS_BRANCH}" = "master" ]; then
  # npm run build:sample-modules -- --archive-built-artifacts --bundle-statics-hostname=https://one-app-statics.surge.sh && \
  # npx surge teardown one-app-statics.surge.sh && \
  # npx surge sample-module-bundles one-app-statics.surge.sh && \
  # docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD" registry.heroku.com && \
  # docker tag one-app:at-test registry.heroku.com/one-app-sample/web && \
  # docker push registry.heroku.com/one-app-sample/web && \
  # npm run test:integration -- --remote-one-app-environment=https://one-app-sample.herokuapp.com
# fi