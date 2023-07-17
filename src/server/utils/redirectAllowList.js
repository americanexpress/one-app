import wcmatch from 'wildcard-match';

let redirectAllowList = [];
let isAllowedUrl = wcmatch(redirectAllowList, { separator: '.' });

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

  isAllowedUrl = wcmatch(redirectAllowList, { separator: '.' });
};

// Spread it to keep it immutable
export const getRedirectAllowList = () => [...redirectAllowList];

export const isRedirectUrlAllowed = (url) => {
  // If a redirect list is not configured, allow the redirect.
  // This prevents the redirect allow list from becoming a breaking change.
  if (redirectAllowList.length === 0 || isAllowedUrl(url)) {
    return true;
  }
  return false;
};
