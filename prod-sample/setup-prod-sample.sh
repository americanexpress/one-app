#!/bin/bash

ORIGIN_STATICS_DIR=prod-sample/nginx/origin-statics
SAMPLE_ASSETS_DIR=prod-sample/assets/
SAMPLE_MODULES_DIR=prod-sample/sample-modules/
SAMPLE_MODULES_STATIC_DIR=static/

TIMEFORMAT='Job done in %R seconds'

function rewrite_module_map {
  local URL_REPLACEMENT_PATTERN='\[one-app-dev-cdn-url\]\/static'
  local KEY_REPLACEMENT_PATTERN="\"key\": \"not-used-in-development\","
  local URL_REPLACEMENT="${1:-"http:\/\/localhost:3001/static"}"
  local KEY_REPLACEMENT="\"clientCacheRevision\": \"${2:-sample-modules}\","
  local MODULE_MAP_PATH=${3:-static\/module-map.json}
  echo "$(cat $MODULE_MAP_PATH | sed -e "s|$URL_REPLACEMENT_PATTERN|$URL_REPLACEMENT|g" | sed -e "s|$KEY_REPLACEMENT_PATTERN|$KEY_REPLACEMENT|g")" > $MODULE_MAP_PATH
}

function build_sample_module {
  local path=$1
  local moduleName=$2
  local version=${path##*/}

  if [[ "${3:-false}" =~ true ]]; then
    echo "⬇️ Installing ${moduleName}@${version}..."
    (cd $path && NODE_ENV=development npm ci > /dev/null && echo -e "✅ ‍${moduleName}@${version} Installed!\n" || "🚨 ${moduleName}@${version} failed to install")
  fi

  if [[ "${4:-false}" =~ true ]]; then
    echo "🛠 Building ${moduleName}@${version}..."
    (cd $path && NODE_ENV=production npm run build > /dev/null && echo -e "✅ ‍${moduleName}@${version} Built!\n" || "🚨 ${moduleName}@${version} failed to build")
  fi
}

function build_sample_modules {
  initialModules=()

  echo -e "\nBuilding modules\n"

  for dir in $1*/
  do
    dir=${dir%*/}
    moduleName=${dir##*/}
    for path in $dir/*/
    do
      path=${path%*/}
      version=${path##*/}

      if [[ "$version" =~ "0.0.0" ]]; then
        initialModules+=($path)
      fi

      build_sample_module $path $moduleName $2 $3 &
    done
  done

  wait

  echo -e "\nServing modules\n"

  for path in ${initialModules[@]}; do
    echo "Serving ${path#*/}"
    npm run serve-module $path > /dev/null
  done
}

function build_statics {
  time {
    echo -e "\nCleaning statics and rebuilding\n"

    rm -rf $ORIGIN_STATICS_DIR
    rm -rf $SAMPLE_MODULES_STATIC_DIR
    mkdir $ORIGIN_STATICS_DIR
    mkdir $SAMPLE_MODULES_STATIC_DIR
  }

  time {
    echo -e "\nCopying Assets\n"

    cp -R $SAMPLE_ASSETS_DIR $SAMPLE_MODULES_STATIC_DIR
  }

  time {
    echo -e "\nInstalling and building sample modules\n"

    build_sample_modules $SAMPLE_MODULES_DIR $2 $3
  }

  time {
    echo -e "\nFinalizing module map\n"

    rewrite_module_map $1
  }

  time {
    echo -e "\nCopying over final build\n"

    cp -R $SAMPLE_MODULES_STATIC_DIR $ORIGIN_STATICS_DIR
  }
}

function setup_docker {
  time {
    echo -e "\nPulling docker images\n"

    docker pull nginx
    docker pull selenium/standalone-chrome-debug@sha256:e8bf805eca673e6788fb50249b105be860d991ee0fa3696422b4cb92acb5c07a
  }

  time {
    echo -e "\nBuilding One App docker image\n"

    docker build -t one-app:at-test -t one-app:latest .
    docker cp $(docker create one-app):opt/one-app/build/app ./prod-sample/nginx/origin-statics/
  }

  time {
    echo -e "\nGenerating server certificates\n"

    (cd prod-sample && sh generate-certs.sh "localhost" one-app > /dev/null 2>&1)
    (cd prod-sample && sh generate-certs.sh "sample-cdn.frank" nginx > /dev/null 2>&1)
    (cd prod-sample && sh generate-certs.sh "*.api.frank" api > /dev/null 2>&1)
  }

  time {
    echo -e "\nBuilding prod sample docker images\n"

    (cd prod-sample && docker-compose build --parallel one-app fast-api slow-api extra-slow-api nginx selenium-chrome)
  }
}

function build_local_prod_sample {
  echo -e "\nBuilding local prod sample\n"

  export REMOTE_ONE_APP_ENVIRONMENT="https://sample-cdn.frank"
  build_statics $REMOTE_ONE_APP_ENVIRONMENT true true
  setup_docker
}

function build_remote_prod_sample {
  echo -e "\nBuilding remote prod sample\n"

  export REMOTE_ONE_APP_ENVIRONMENT=$HEROKU_APP_URL
  build_statics $SURGE_DOMAIN
  echo $HEROKU_APP_URL >> $ORIGIN_STATICS_DIR/CORS

  npx surge teardown $SURGE_DOMAIN
  npx surge $ORIGIN_STATICS_DIR $SURGE_DOMAIN

  setup_docker

  docker login -u="$HEROKU_DOCKER_USERNAME" -p="$HEROKU_API_KEY" registry.heroku.com
  docker tag one-app:at-test registry.heroku.com/$HEROKU_APP_ID/web
  docker push registry.heroku.com/$HEROKU_APP_ID/web

  npx heroku container:release web -a $HEROKU_APP_ID
}

function setup_prod_sample {
  if [ -z "$HEROKU_APP_URL" ] || \&
    [ -z "$HEROKU_APP_ID" ] || \&
    [ -z "$HEROKU_DOCKER_USERNAME" ] || \&
    [ -z "$HEROKU_API_KEY" ] || \&
    [ -z "$SURGE_DOMAIN" ]; then
    build_local_prod_sample
  else
    build_remote_prod_sample
  fi
}

time {
  setup_prod_sample
}
