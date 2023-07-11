import {
  setRedirectAllowList,
  validateRedirectUrl,
  getRedirectAllowList,
} from '../../../src/server/utils/redirectAllowList';

describe('redirectAllowList', () => {
  beforeEach(() => {
    setRedirectAllowList([]);
  });
  describe('setRedirectAllowList', () => {
    it('should set redirect allow list', () => {
      const redirectAllowList = ['https://americanexpress.com', '*.example.com'];
      setRedirectAllowList(redirectAllowList);
      expect(getRedirectAllowList()).toEqual(['https://americanexpress.com', 'https://*.example.com']);
    });
    it('should log an error if allow list is not an array', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const redirectAllowList = 'https://americanexpress.com';
      setRedirectAllowList(redirectAllowList);
      expect(console.error).toBeCalledWith('redirectAllowList is not an array');
    });
    it('should log an error if allow list contains insecure protocol (http)', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const redirectAllowList = ['http://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(console.error).toBeCalledWith('Insecure protocols (http://) are not allowed to be redirect locations. Ignoring \'http://americanexpress.com\' listed in redirectAlowList configuration.');
    });
  });
  describe('validateRedirectUrl', () => {
    it('should return true if redirectAllowList is not set', () => {
      expect(validateRedirectUrl('https://americanexpress.com')).toBeTruthy();
    });
    it('should return true if URL is in allow list', () => {
      const redirectAllowList = ['https://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(validateRedirectUrl('https://americanexpress.com')).toBeTruthy();
    });
    it('should return false if URL is NOT in allow list', () => {
      const redirectAllowList = ['https://americanexpress.com'];
      setRedirectAllowList(redirectAllowList);
      expect(validateRedirectUrl('https://americanxpress.com')).toBeFalsy();
    });
  });
});
