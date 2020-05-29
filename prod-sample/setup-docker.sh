#!/bin/bash
time {
  docker pull nginx
  # docker pull selenium/standalone-chrome
  docker pull selenium/standalone-chrome-debug@sha256:e8bf805eca673e6788fb50249b105be860d991ee0fa3696422b4cb92acb5c07a
}

time {
  docker build -t one-app:at-test -t one-app:latest .
  docker cp $(docker create one-app):opt/one-app/build/app ./prod-sample/nginx/origin-statics/
}

time {
  (cd prod-sample && docker-compose build --parallel one-app fast-api slow-api extra-slow-api nginx selenium-chrome)
}
