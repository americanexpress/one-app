import wcmatch from 'wildcard-match';

let redirectAllowList = [];

export const setRedirectAllowList = (allowList) => {
  if (!Array.isArray(allowList)) {
    console.error('redirectAllowList is not an array');
    return;
  }
  redirectAllowList = [];
  allowList.forEach((url) => {
    if (url.includes('http://')) {
      console.error(`Insecure protocols (http://) are not allowed to be redirect locations. Ignoring '${url}' listed in redirectAlowList configuration.`);
      return;
    }
    if (!url.includes('https://')) {
      const modifiedUrl = 'https://'.concat(url);
      redirectAllowList.push(modifiedUrl);
      return;
    }
    redirectAllowList.push(url);
  });
};

export const getRedirectAllowList = () => redirectAllowList;

export const validateRedirectUrl = (url) => {
  const isAllowedUrl = wcmatch(redirectAllowList, { separator: '.' });
  // If a redirect list is not configured, allow the redirect.
  // This prevents the redirect allow list from becoming a breaking change.
  if (redirectAllowList.length === 0 || isAllowedUrl(url)) {
    return true;
  }
  return false;
};
