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

// eval can be harmful, that's why we're disabling it
/* eslint-disable no-eval, no-implied-eval */

import getObjectValueAtPath from '../../src/server/utils/getObjectValueAtPath';

const set = require('lodash.set');

jest.useFakeTimers();

describe('badPartMonkeypatches', () => {
  // eslint-disable-next-line no-console
  global.execScript = (s) => console.info('execScript?', s);
  const originals = {};
  [
    'document',
    'document.open',
    'document.write',
    'document.writeln',
    'document.close',
    'eval',
    'execScript',
    'setTimeout',
    'setInterval',
  ]
    .forEach((key) => {
      originals[key] = getObjectValueAtPath(global, key);
    });

  function applyMonkeypatches() {
    jest.resetAllMocks();
    jest.resetModules();
    require('../../src/client/badPartMonkeypatches');
  }

  afterEach(() => {
    Object
      .keys(originals)
      .forEach((key) => {
        const val = originals[key];
        set(global, key, val);
      });
  });

  describe('document.write stream family', () => {
    it('should monkeypatch document.open to throw', () => {
      applyMonkeypatches();
      expect(() => document.open('alert(1)')).toThrowErrorMatchingSnapshot();
    });
    it('should monkeypatch document.write to throw', () => {
      applyMonkeypatches();
      expect(() => document.write('alert(1)')).toThrowErrorMatchingSnapshot();
    });
    it('should monkeypatch document.writeln to throw', () => {
      applyMonkeypatches();
      expect(() => document.writeln('alert(1)')).toThrowErrorMatchingSnapshot();
    });
    it('should monkeypatch document.close to throw', () => {
      applyMonkeypatches();
      expect(() => document.close('alert(1)')).toThrowErrorMatchingSnapshot();
    });
    it('does not throw if document does not exist', () => {
      delete global.document;
      expect(typeof document).toEqual('undefined');
      expect(applyMonkeypatches).not.toThrow();
    });
  });

  describe('explicit eval', () => {
    it('should monkeypatch eval to throw', () => {
      applyMonkeypatches();
      expect(() => eval('alert(1)')).toThrowErrorMatchingSnapshot();
    });

    it('should monkeypatch execScript to throw', () => {
      applyMonkeypatches();
      // execScript is manually defined earlier
      expect(
        () => execScript('alert(1)') // eslint-disable-line no-undef
      )
        .toThrowErrorMatchingSnapshot();
    });

    it('does not throw if eval does not exist', () => {
      // `delete global.eval;` does not work, it remains
      global.eval = null;
      global.execScript = null;
      expect(typeof eval).toEqual(typeof null);
      expect(typeof execScript).toEqual(typeof null);
      expect(applyMonkeypatches).not.toThrow();
      expect(typeof eval).toEqual(typeof null);
      expect(typeof execScript).toEqual(typeof null);
    });
  });

  describe('implicit eval', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-console
      console.warn = jest.fn(console.warn);
      applyMonkeypatches();
    });

    describe('monkeypatch setTimeout', () => {
      it('should throw on string first argument', () => {
        expect(() => setTimeout('alert(1)')).toThrowErrorMatchingSnapshot();
      });

      it('should execute normally on non-string first argument', () => {
        setTimeout(
          // eslint-disable-next-line no-console
          (a, b, c) => console.log(a, b, c),
          1e3,
          'A',
          'B',
          'C'
        );
        const origSetTimeout = originals.setTimeout;
        expect(origSetTimeout.mock.calls.length).toBe(1);
        expect(origSetTimeout.mock.calls[0][1]).toBe(1000);
        expect(origSetTimeout.mock.calls[0][2]).toBe('A');
        expect(origSetTimeout.mock.calls[0][3]).toBe('B');
        expect(origSetTimeout.mock.calls[0][4]).toBe('C');
      });
    });
    describe('monkeypatch setInterval', () => {
      it('should throw on string first argument', () => {
        expect(() => setInterval('alert(1)')).toThrowErrorMatchingSnapshot();
      });

      it('should execute normally on non-string first argument', () => {
        setInterval(
          // eslint-disable-next-line no-console
          (a, b, c) => console.log(a, b, c),
          1e3,
          'A',
          'B',
          'C'
        );
        const origSetInterval = originals.setInterval;
        expect(origSetInterval.mock.calls.length).toBe(1);
        expect(origSetInterval.mock.calls[0][1]).toBe(1000);
        expect(origSetInterval.mock.calls[0][2]).toBe('A');
        expect(origSetInterval.mock.calls[0][3]).toBe('B');
        expect(origSetInterval.mock.calls[0][4]).toBe('C');
      });
    });
  });
});
