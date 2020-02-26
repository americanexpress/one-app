/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const { Duplex } = require('stream');
const { waitFor } = require('./wait');

const timeOutPromise = (timeout, msg) => new Promise((_, rej) => {
  setTimeout(
    () => rej(new Error(msg)),
    timeout
  );
});

const watchers = {};
const addWatcher = (watcherName, watcherFunc) => {
  if (Object.keys(watchers).includes(watcherName)) {
    throw new Error(`Watcher ${watcherName} already exists`);
  }
  watchers[watcherName] = watcherFunc;
};

const removeWatcher = (watcherName) => {
  delete watchers[watcherName];
};

const searchForNextLogMatch = async (regex, timeout = 10000) => {
  let matchedChunk;
  const watcherName = regex.toString();

  const logWatcher = (chunk) => {
    const chunkString = chunk.toString();
    const matchResult = chunkString.match(regex);

    if (matchResult) {
      [matchedChunk] = matchResult;
    }
  };

  const waitingForMatch = async () => {
    if (!matchedChunk) {
      await waitFor(200);
      await waitingForMatch();
    }
  };

  addWatcher(watcherName, logWatcher);

  await Promise.race([
    timeOutPromise(timeout, `Failed to match: ${watcherName} in logs`),
    waitingForMatch(),
  ]);

  removeWatcher(watcherName);
  return matchedChunk;
};

const createLogWatcherDuplex = () => new Duplex({
  write(chunk, encoding, callback) {
    this.push(chunk);
    Object.values(watchers).forEach((watcher) => watcher(chunk));
    callback();
  },
  read() {
    // ..no change required for read
  },
});

module.exports = {
  createLogWatcherDuplex,
  searchForNextLogMatch,
};
