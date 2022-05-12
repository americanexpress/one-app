import http from 'http';
import https from 'https';
import CacheableLookup from 'cacheable-lookup';

let cacheableInstance = null;

export function uninstallCacheableLookup() {
  if (cacheableInstance !== null) {
    cacheableInstance.uninstall(http.globalAgent);
    cacheableInstance.uninstall(https.globalAgent);
    cacheableInstance = null;
  }
}

export function installCacheableLookup(maxTtl) {
  uninstallCacheableLookup();
  cacheableInstance = new CacheableLookup({ maxTtl });
  cacheableInstance.install(http.globalAgent);
  cacheableInstance.install(https.globalAgent);
}

export default function setupDnsCache({ enabled, maxTtl } = { enabled: false }) {
  if (enabled !== true) {
    uninstallCacheableLookup();
  } else if (
    enabled === true
    && (cacheableInstance == null || cacheableInstance.maxTtl !== maxTtl)
  ) {
    installCacheableLookup(maxTtl);
  }
}
