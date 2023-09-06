/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import util from 'util';
import {
  setRedirectAllowList,
  isRedirectUrlAllowed,
  getRedirectAllowList,
} from '../../../src/server/utils/redirectAllowList';

jest.spyOn(console, 'error').mockImplementation(() => {});

describe('redirectAllowList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRedirectAllowList([]);
  });
  describe('setRedirectAllowList', () => {
    it('should set redirect allow list', () => {
      const redirectAllowList = ['https://americanexpress.com', '*.example.com'];
      setRedirectAllowList(redirectAllowList);
      expect(getRedirectAllowList()).toEqual(['https://americanexpress.com', 'https://*.example.com']);
    });
    it('should log an error if allow list is not an array', () => {
      const redirectAllowList = 'https://americanexpress.com';
      setRedirectAllowList(redirectAllowList);
      expect(console.error).toBeCalledWith('redirectAllowList is not an array');
    });
    it('should log an error if allow list contains insecure protocol (http)', () => {
      const redirectAllowList = ['http://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(util.format(...console.error.mock.calls[0])).toBe('Insecure protocols (http://) are not allowed to be redirect locations. Ignoring \'http://americanexpress.com\' listed in redirectAlowList configuration.');
    });
  });
  describe('validateRedirectUrl', () => {
    it('should return true if redirectAllowList is not set', () => {
      expect(isRedirectUrlAllowed('https://americanexpress.com')).toBeTruthy();
    });
    it('should return true if URL is in allow list', () => {
      const redirectAllowList = ['https://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(isRedirectUrlAllowed('https://americanexpress.com')).toBeTruthy();
    });
    it('should return false if URL is NOT in allow list', () => {
      const redirectAllowList = ['https://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(isRedirectUrlAllowed('https://americanxpress.com')).toBeFalsy();
    });
  });
});
