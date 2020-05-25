time {
  for dir in prod-sample/sample-modules/*/
  do
    for path in $dir*/
    do
      path=${path%*/}
      echo "updating $path"
      (cd $path && npm update)
    done
  done
}
