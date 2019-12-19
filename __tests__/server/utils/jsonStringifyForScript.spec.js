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

/* eslint no-unused-expressions:0 no-eval:0 */
// eval as we need to evaluate the JS the way the browser will as it parses to build the DOM
import jsonStringifyForScript from '../../../src/server/utils/jsonStringifyForScript';

describe('jsonStringifyForScript', () => {
  it('should serialize safe data the same', () => {
    const expected = '{"a":1,"b":"c","d":true,"e":false}';
    const data = JSON.parse(expected);
    const stringified = jsonStringifyForScript(data);
    expect(stringified).toEqual(expected);
    const evaluatedParse = eval(`JSON.parse('${stringified}')`);
    expect(evaluatedParse).toEqual(data);
  });

  // escaping JSON before it's finished is bad
  // a) breaks the app a bit
  // b) security concern (what was strictly data might be executed instead)

  describe('<script> tags', () => {
    // disallow the browser to escape parsing JSON by finding a <script> tag

    const data = {
      a: 'jury duty',
      b: '<script>alert(1);</script>',
      c: 'm<script >alert(2)</script>',
      d: 'n<script type="text/javascript">alert(3)</script>',
      e: 'o<script src="trust-me.js">alert(4)</script>',
      '<p><script>': '//?</script><script>alert(5)</script>',
    };

    const stringified = jsonStringifyForScript(data);

    it('is still able to de-serialize the data', () => {
      const evaluated = eval(`var a = ${stringified}; a;`);
      expect(evaluated).toEqual(data);
    });

    it('removes opening tags', () => {
      expect(stringified).not.toContain('<script>');
      expect(stringified).not.toContain('<script');
    });

    it('removes closing tags', () => {
      expect(stringified).not.toContain('<script/>');
      expect(stringified).not.toContain('script/>');
    });
  });

  describe('HTML comment tags', () => {
    // disallow the browser to escape parsing JSON by finding HTML comment tags
    // ex: --> is the end of JavaScript textContent in <script>
    // https://www.w3.org/TR/html401/interact/scripts.html#h-18.3.2

    const data = {
      a: true,
      b: 'maybe',
      c: 'dun dun --> duuun',
      d: '--> here <--',
      e: '<-- there -->',
      f: 'unchanged',
      g: '<-- yup -->',
      h: {
        i: 'unchanged',
        j: '--> pup <--',
        k: {
          l: '<-- sup -->',
        },
      },
      '<--m-->': 'n',
    };

    const stringified = jsonStringifyForScript(data);

    it('is still able to de-serialize the data', () => {
      const evaluated = eval(`var a = ${stringified}; a;`);
      expect(evaluated).toEqual(data);
    });

    it('removes opening tags', () => {
      expect(stringified).not.toContain('<!--');
      expect(stringified).not.toContain('<--');
    });

    it('removes closing tags', () => {
      expect(stringified).not.toContain('-->');
    });
  });

  describe('HTML escape characters for legacy browsers', () => {
    describe('angle brackets: `<` and `>`', () => {
      const errorObject = { errorField: '<script></script>' };
      const errorObjectStringified = jsonStringifyForScript(errorObject);

      it('with angle brackets should escape', () => {
        expect(errorObjectStringified).toEqual('{"errorField":"\\u003cscript\\u003e\\u003c/script\\u003e"}');
      });

      it('with angle brackets should parse back', () => {
        expect(JSON.parse(errorObjectStringified)).toEqual(errorObject);
      });
    });

    describe('amperstands: `&`', () => {
      const errorObject = { errorField: '&' };
      const errorObjectStringified = jsonStringifyForScript(errorObject);

      it('with ampersands should escape', () => {
        expect(errorObjectStringified).toEqual('{"errorField":"\\u0026"}');
      });

      it('with ampersands should parse back', () => {
        expect(JSON.parse(errorObjectStringified)).toEqual(errorObject);
      });
    });

    describe('line seperators: `\\u2028` and `\\u2029`', () => {
      const errorObject = { errorField: '\u2028\u2029' };
      const errorObjectStringified = jsonStringifyForScript(errorObject);

      it('with "LINE SEPARATOR" and "PARAGRAPH SEPARATOR" should escape', () => {
        expect(errorObjectStringified).toEqual('{"errorField":"\\u2028\\u2029"}');
      });

      it('with "LINE SEPARATOR" and "PARAGRAPH SEPARATOR" should parse back', () => {
        expect(JSON.parse(errorObjectStringified)).toEqual(errorObject);
      });
    });
  });
});
