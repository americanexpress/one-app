/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

export function getConfig() {
  return JSON.parse(process.env.OSW_CONFIG || '{}');
}

export function getResourceTypeFromCacheName(cacheName = '') {
  const [, type = ''] = cacheName.match(/.*(one-app|language-pack|module)-cache$/) || [];
  return type;
}

export function getClientCacheRevisionFromUrl(url = '') {
  const [, key = ''] = url.match(/^https?.*(?:\.js\?clientCacheRevision=(.*))$/) || [];
  return key;
}

export function getLangPackInfoFromUrl(url = '') {
  // capture groups: name, version, locale, language, country, env,
  const info = url.match(/^https?.*\/(?<name>.*)\/(?<version>.*)\/(?<locale>(?<language>[a-z]{2,3})-(?<country>[A-Z]{1,4})?)\/(?<env>qa|integration|.*)\.json$/);

  if (info) {
    return info.groups;
  }

  return {};
}

export function getModuleInfoFromUrl(url = '') {
  // capture groups: checksum, name, version, bundle, legacy, revision
  const info = url.match(/^https?.*\/(?<checksum>.*)\/(?<name>.*)\/(?<version>.*)\/(?:.*)\2\.(?<bundle>(legacy\.)?browser)\.js(?:\?clientCacheRevision=(?<revision>.*))?$/);

  if (info) {
    return info.groups;
  }

  return {};
}

export function getAppInfoFromUrl(url = '') {
  // capture groups: version, name, i18n
  const info = url.match(/^https?.*\/_\/static\/app\/(?<version>.*)\/(?<name>(?<i18n>i18n)?.*)\.js$/);

  if (info) {
    return info.groups;
  }

  return {};
}

export function markForRemoval(cachedMetaRecord, newMetaRecord) {
  if (cachedMetaRecord.revision !== newMetaRecord.revision) return true;
  if (cachedMetaRecord.type === newMetaRecord.type) {
    if (cachedMetaRecord.name === newMetaRecord.name) {
      if (cachedMetaRecord.version !== newMetaRecord.version) return true;
      if (cachedMetaRecord.locale !== newMetaRecord.locale) return false;
    }
  }
  return false;
}
