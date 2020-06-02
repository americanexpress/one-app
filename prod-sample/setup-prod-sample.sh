#!/bin/bash

ORIGIN_STATICS_DIR=prod-sample/nginx/origin-statics
SAMPLE_ASSETS_DIR=prod-sample/assets/
SAMPLE_MODULES_DIR=prod-sample/sample-modules/
SAMPLE_MODULES_STATIC_DIR=static/

function rewrite_module_map {
  local URL_REPLACEMENT_PATTERN="\[one-app-dev-cdn-url\]"
  local KEY_REPLACEMENT_PATTERN="\"key\": \"not-used-in-development\","
  local URL_REPLACEMENT="${1:-http:\/\/localhost:3001}"
  local KEY_REPLACEMENT="\"clientCacheRevision\": \"${2:-sample-modules}\","
  local MODULE_MAP_PATH=${3:-static\/module-map.json}
  echo "$(cat $MODULE_MAP_PATH | sed -e "s/$URL_REPLACEMENT_PATTERN/$URL_REPLACEMENT/g" | sed -e "s/$KEY_REPLACEMENT_PATTERN/$KEY_REPLACEMENT/g")" > $MODULE_MAP_PATH
}

function build_sample_module {
  local path=$1
  local version=${path##*/}

  if [[ "${2:-false}" =~ true ]]; then
    echo "⬇️ Installing ${moduleName}@${version}..."
    (cd $path && NODE_ENV=development npm ci)
    echo "✅ ‍${moduleName}@${version} Installed!"
  fi

  if [[ "${3:-false}" =~ true ]]; then
    echo "🛠 Building ${moduleName}@${version}..."
    (cd $path && NODE_ENV=production npm run build)
    echo "✅ ‍${moduleName}@${version} Built!"
  fi
}

function build_sample_modules {
  initialModules=()

  for dir in $1*/
  do
    moduleName=${dir##*/}
    for path in $dir*/
    do
      path=${path%*/}
      version=${path##*/}

      if [[ "$version" =~ "0.0.0" ]]; then
        initialModules+=($path)
      fi

      build_sample_module $path $2 $3 &
    done
  done

  wait

  for path in ${initialModules[@]}; do
    npm run serve-module $path
  done
}

function build_origin_statics {
  rm -rf $ORIGIN_STATICS_DIR
  rm -rf $SAMPLE_MODULES_STATIC_DIR
  mkdir $ORIGIN_STATICS_DIR
  mkdir $SAMPLE_MODULES_STATIC_DIR

  cp -R $SAMPLE_ASSETS_DIR $SAMPLE_MODULES_STATIC_DIR

  build_sample_modules $SAMPLE_MODULES_DIR $2 $3

  rewrite_module_map $1

  cp -R $SAMPLE_MODULES_STATIC_DIR $ORIGIN_STATICS_DIR
}

function setup_docker {
  docker pull nginx
  docker pull selenium/standalone-chrome-debug@sha256:e8bf805eca673e6788fb50249b105be860d991ee0fa3696422b4cb92acb5c07a

  docker build -t one-app:at-test -t one-app:latest .
  docker cp $(docker create one-app):opt/one-app/build/app ./prod-sample/nginx/origin-statics/

  (cd prod-sample && sh generate-certs.sh "localhost" one-app)
  (cd prod-sample && sh generate-certs.sh "sample-cdn.frank" nginx)
  (cd prod-sample && sh generate-certs.sh "*.api.frank" api)

  (cd prod-sample && docker-compose build --parallel one-app fast-api slow-api extra-slow-api nginx selenium-chrome)
}

function setup_prod_sample {
  if [ -z "$HEROKU_APP_URL" ] || \&
  [ -z "$HEROKU_APP_ID" ] || \&
  [ -z "$HEROKU_DOCKER_USERNAME" ] || \&
  [ -z "$HEROKU_API_KEY" ] || \&
  [ -z "$SURGE_DOMAIN" ]; then
    export REMOTE_ONE_APP_ENVIRONMENT="https://sample-cdn.frank"
    build_origin_statics $REMOTE_ONE_APP_ENVIRONMENT true true
    setup_docker
  else
    export REMOTE_ONE_APP_ENVIRONMENT=$HEROKU_APP_URL
    build_origin_statics $SURGE_DOMAIN
    echo $HEROKU_APP_URL >> $ORIGIN_STATICS_DIR/CORS

    npx surge teardown $SURGE_DOMAIN
    npx surge $ORIGIN_STATICS_DIR $SURGE_DOMAIN

    setup_docker

    docker login -u="$HEROKU_DOCKER_USERNAME" -p="$HEROKU_API_KEY" registry.heroku.com
    docker tag one-app:at-test registry.heroku.com/$HEROKU_APP_ID/web
    docker push registry.heroku.com/$HEROKU_APP_ID/web

    npx heroku container:release web -a $HEROKU_APP_ID
  fi
}

setup_prod_sample
