#!/bin/sh

# Copyright 2024 American Express Travel Related Services Company, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
# or implied. See the License for the specific language governing
# permissions and limitations under the License.

flags="$@"
nodeArgs='--dns-result-order ipv4first --no-experimental-fetch'

if [ -n "$OTEL_EXPORTER_OTLP_TRACES_ENDPOINT" ] || echo $flags | grep -q "\--log-level=trace"; then
  nodeArgs="$nodeArgs --require=./lib/server/utils/tracer.js"
fi

for flag in $flags; do
  if echo "$flag" | grep -q "^--inspect"; then
    nodeArgs="$nodeArgs $flag --expose-gc"
    flags=$(echo "$flags" | sed "s/$flag//")
    break
  fi
done

commandArgs="$nodeArgs lib/server/index.js $flags"

echo "node $commandArgs"
exec node $commandArgs
