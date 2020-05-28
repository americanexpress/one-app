time {
  for dir in prod-sample/sample-modules/*/
  do
    for path in $dir*/
    do
      path=${path%*/}

      echo "installing $path"
      (cd $path && NODE_ENV=development npm ci)

      version=${path##*/}
      if [[ "$version" =~ "0.0.0" ]]; then
        echo "serving $version"
        npm run serve-module $path
      fi
    done
  done

  cat static/module-map.json
}
