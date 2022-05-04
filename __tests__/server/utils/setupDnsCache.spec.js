import http from 'http';
import https from 'https';
import CacheableLookup from 'cacheable-lookup';
import matchers from 'expect/build/matchers';
import setupDnsCache, {
  uninstallCacheableLookup,
  installCacheableLookup,
} from '../../../src/server/utils/setupDnsCache';

// Create a fake agent so we can get the Symbols used by cacheable-lookup
const fakeAgent = { createConnection: () => {} };
const cacheableInstance = new CacheableLookup();
cacheableInstance.install(fakeAgent);
const cacheableLookupSymbols = Object.getOwnPropertySymbols(fakeAgent);
// eslint-disable-next-line jest/no-standalone-expect -- validate we have the right symbols
expect(cacheableLookupSymbols).toMatchInlineSnapshot(`
  Array [
    Symbol(cacheableLookupCreateConnection),
    Symbol(cacheableLookupInstance),
  ]
`);
const cacheableInstanceSymbol = cacheableLookupSymbols[1];
const getCacheableInstance = (protocol) => protocol.globalAgent[cacheableInstanceSymbol];

expect.extend({
  toHaveCacheableLookupInstalled(input) {
    return matchers.toEqual.call(
      this,
      Object.getOwnPropertySymbols(input.globalAgent),
      expect.arrayContaining(cacheableLookupSymbols)
    );
  },
  toHaveMaxTtl(input, expected) {
    return matchers.toBe.call(
      this,
      getCacheableInstance(input).maxTtl,
      expected
    );
  },
});

describe('setupDnsCache', () => {
  beforeEach(uninstallCacheableLookup);

  it('should uninstall cacheable lookup when DNS cache is not enabled and cacheable lookup is installed', () => {
    installCacheableLookup();
    expect(http).toHaveCacheableLookupInstalled();
    expect(https).toHaveCacheableLookupInstalled();
    setupDnsCache();
    expect(http).not.toHaveCacheableLookupInstalled();
    expect(https).not.toHaveCacheableLookupInstalled();
  });

  it('should not attempt to uninstall cacheable lookup if it is not installed', () => {
    uninstallCacheableLookup();
    expect(http).not.toHaveCacheableLookupInstalled();
    expect(https).not.toHaveCacheableLookupInstalled();
    setupDnsCache();
    expect(http).not.toHaveCacheableLookupInstalled();
    expect(https).not.toHaveCacheableLookupInstalled();
  });

  it('should install cacheable lookup when DNS cache is enabled and it is not installed', () => {
    uninstallCacheableLookup();
    expect(http).not.toHaveCacheableLookupInstalled();
    expect(https).not.toHaveCacheableLookupInstalled();
    setupDnsCache({ enabled: true });
    expect(http).toHaveCacheableLookupInstalled();
    expect(https).toHaveCacheableLookupInstalled();
  });

  it('should uninstall and reinstall cacheable lookup when the max TTL changes', () => {
    installCacheableLookup(100);
    const httpInstanceBefore = getCacheableInstance(http);
    const httpsInstanceBefore = getCacheableInstance(https);
    expect(http).toHaveMaxTtl(100);
    expect(https).toHaveMaxTtl(100);
    setupDnsCache({ enabled: true, maxTtl: 10 });
    expect(http).toHaveMaxTtl(10);
    expect(https).toHaveMaxTtl(10);
    expect(getCacheableInstance(http)).not.toBe(httpInstanceBefore);
    expect(getCacheableInstance(https)).not.toBe(httpsInstanceBefore);
  });

  it('should not reinstall cacheable lookup when DNS cache settings do not change', () => {
    installCacheableLookup(100);
    const httpInstanceBefore = getCacheableInstance(http);
    const httpsInstanceBefore = getCacheableInstance(https);
    expect(http).toHaveMaxTtl(100);
    expect(https).toHaveMaxTtl(100);
    setupDnsCache({ enabled: true, maxTtl: 100 });
    expect(http).toHaveMaxTtl(100);
    expect(https).toHaveMaxTtl(100);
    expect(getCacheableInstance(http)).toBe(httpInstanceBefore);
    expect(getCacheableInstance(https)).toBe(httpsInstanceBefore);
  });
});
