time {
  rm -rf prod-sample/nginx/origin-statics
  mkdir prod-sample/nginx/origin-statics
  cp -R prod-sample/assets/ prod-sample/nginx/origin-statics
  cp -R static/ prod-sample/nginx/origin-statics
  # cp -R build/ prod-sample/nginx/origin-statics
  tree prod-sample/nginx/origin-statics/
}
