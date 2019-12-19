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

// remove document.(open|write|close)
// if `document.write` is called after the page loads, the entire DOM is erased
// we're loading javascript with async and defer, so prevent any issues
if (typeof document !== 'undefined') {
  document.open = function open() { throw new Error('document.open disabled'); };
  document.write = function write() { throw new Error('document.write disabled'); };
  document.writeln = function writeln() { throw new Error('document.writeln disabled'); };
  document.close = function close() { throw new Error('document.close disabled'); };
}

// disable eval
// eval is one of the bad parts, there's a better way to do the thing you want to
[
  'eval',
  'execScript',
].forEach((name) => {
  if (typeof global[name] !== 'function') {
    return;
  }
  global[name] = function monkeypatchedEval() {
    throw new Error(`${name} is disabled`);
  };
});
// there are imlicit eval forms of setTimeout and setInterval (1st arg as string)
// https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Parameters
[
  'setTimeout',
  'setInterval',
].forEach((name) => {
  const orig = global[name];
  global[name] = function monkeypatchedEvalForm(cb, ...args) {
    if (typeof cb === 'string') {
      throw new TypeError(`eval form of ${name} used, this is disabled`);
    }
    return orig.apply(this, [cb, ...args]);
  };
});

// TODO cover `new Function('var a = 1;')`, any other implicit eval cases?
