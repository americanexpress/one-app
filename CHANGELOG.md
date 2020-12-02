# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.10.2](https://github.com/americanexpress/one-app/compare/v5.10.1...v5.10.2) (2020-12-02)


### Bug Fixes

* **clientErrorLogger:** format console error message ([#382](https://github.com/americanexpress/one-app/issues/382)) ([03da190](https://github.com/americanexpress/one-app/commit/03da190baa91aea1044de06bdc72e4e50f3ec420))
* **typo:** circuit breaker “function” input ([#372](https://github.com/americanexpress/one-app/issues/372)) ([e1e74b9](https://github.com/americanexpress/one-app/commit/e1e74b9424b8fd573ba81eabb02e0984a8104081))


## [5.10.1](https://github.com/americanexpress/one-app/compare/v5.10.0...v5.10.1) (2020-10-28)


### Bug Fixes

* **security:** specify min TLS version ([bc460aa](https://github.com/americanexpress/one-app/commit/bc460aa51e27a51d8d4e78d73321d43c593d1c9e))


# [5.10.0](https://github.com/americanexpress/one-app/compare/v5.9.0...v5.10.0) (2020-10-21)


### Features

* **react:** update react to 16.14.0 ([be92d96](https://github.com/americanexpress/one-app/commit/be92d96ef46a54b408d71111728ece84af093b9e))


# [5.9.0](https://github.com/americanexpress/one-app/compare/v5.8.0...v5.9.0) (2020-10-14)


### Features

* **ssrServer:** enable urlencoded post data ([#313](https://github.com/americanexpress/one-app/issues/313)) ([3481dc0](https://github.com/americanexpress/one-app/commit/3481dc0bbe26865b234df01fa2effc60ad41634e))


# [5.8.0](https://github.com/americanexpress/one-app/compare/v5.7.0...v5.8.0) (2020-10-07)


### Bug Fixes

* **holocron:** does not check for global state on component mount ([e36b343](https://github.com/americanexpress/one-app/commit/e36b3437af6eba494583eb1e02e8f0e1370cc847))
* **stateConfig:** use ip when useHost flag is passed ([#327](https://github.com/americanexpress/one-app/issues/327)) ([4ca50c4](https://github.com/americanexpress/one-app/commit/4ca50c466c5b56af90d7671204101225644d8423))
* **tests/integration:** offline cache timing ([20c85e6](https://github.com/americanexpress/one-app/commit/20c85e66e103f5ebee26821f8bc7616e2e633e33))


### Features

* **csp:** loosen development to use localhost or ip '*' ([#331](https://github.com/americanexpress/one-app/issues/331)) ([1bad920](https://github.com/americanexpress/one-app/commit/1bad920d673ab72d61baf3abe77f28cdc360f696))


# [5.7.0](https://github.com/americanexpress/one-app/compare/v5.6.1...v5.7.0) (2020-09-30)


### Bug Fixes

* **circuit:** disable circuit breaker in development ([#307](https://github.com/americanexpress/one-app/issues/307)) ([1d87967](https://github.com/americanexpress/one-app/commit/1d879672520c8095d2c667f46cf50e64c1d51496))


### Features

* **module-text:** remove tags and render text only ([0a1aa68](https://github.com/americanexpress/one-app/commit/0a1aa687201ce9b434a18f54b31fbca33ae5cde0))
* **prod-sample:** deploy module util ([#308](https://github.com/americanexpress/one-app/issues/308)) ([#323](https://github.com/americanexpress/one-app/issues/323)) ([becfca5](https://github.com/americanexpress/one-app/commit/becfca55db4b260ec5a696f0d85d571623687e66))


## [5.6.1](https://github.com/americanexpress/one-app/compare/v5.6.0...v5.6.1) (2020-09-23)


### Bug Fixes

* **dockerfile:** set user after chown ([#305](https://github.com/americanexpress/one-app/issues/305)) ([105ddbf](https://github.com/americanexpress/one-app/commit/105ddbf7be36f20fee9f345895d941b88d37020d))
* **integration-tests:** simplify franks burgers ([4a90b98](https://github.com/americanexpress/one-app/commit/4a90b9859f19d974b6724e41fe2c10e6392a553a))
* **watchLocalModules:** fix watcher crashing due to build errors ([#306](https://github.com/americanexpress/one-app/issues/306)) ([9290d92](https://github.com/americanexpress/one-app/commit/9290d921572f3dedb719097d6c7beaf594acc5b5))


# [5.6.0](https://github.com/americanexpress/one-app/compare/v5.5.1...v5.6.0) (2020-09-16)


### Features

* **sendHtml:** allow custom error page ([#281](https://github.com/americanexpress/one-app/issues/281)) ([73eb8a7](https://github.com/americanexpress/one-app/commit/73eb8a72e7f20e66d5a6313c3a103b20c0ed0143))
* **server:** use native V8 heapdump ([794ff35](https://github.com/americanexpress/one-app/commit/794ff355b4b89457937aa081651aee10c48d8464))


## [5.5.1](https://github.com/americanexpress/one-app/compare/v5.5.0...v5.5.1) (2020-09-02)


### Bug Fixes

* **fetch:** upgrade bundler to add fetch polyfills ([#289](https://github.com/americanexpress/one-app/issues/289)) ([f81e8c5](https://github.com/americanexpress/one-app/commit/f81e8c5333d024702b1fcc5ca8e1388784a7971f))


# [5.5.0](https://github.com/americanexpress/one-app/compare/v5.4.1...v5.5.0) (2020-08-26)


### Bug Fixes

* **pollModuleMap:** ensure single pollModuleMap ([#284](https://github.com/americanexpress/one-app/issues/284)) ([5503a03](https://github.com/americanexpress/one-app/commit/5503a035a55feaade9344d651aea0531e2ac0c37))
* **pwa:** reset config when not supplied ([#283](https://github.com/americanexpress/one-app/issues/283)) ([6784c7c](https://github.com/americanexpress/one-app/commit/6784c7c9e2b977b036ad87ef17e2f0b2e919a740))
* **watchLocalModules:** wait for change to finish ([#285](https://github.com/americanexpress/one-app/issues/285)) ([a27d4ba](https://github.com/americanexpress/one-app/commit/a27d4ba3af68c0bac29650be9220dadf0461227a))


### Features

* **app-config:** pwa validation ([fb10509](https://github.com/americanexpress/one-app/commit/fb10509343d2dd178cb9cb857598f4c419111b1d))
* **serverError:** add additional logging for server errors ([#282](https://github.com/americanexpress/one-app/issues/282)) ([60825f8](https://github.com/americanexpress/one-app/commit/60825f8cf7aaa8b3919cc98b7cddf3ddb52a7607))


## [5.4.1](https://github.com/americanexpress/one-app/compare/v5.4.0...v5.4.1) (2020-08-19)


### Bug Fixes

* **metrics:** health check ([#274](https://github.com/americanexpress/one-app/issues/274)) ([352bbd3](https://github.com/americanexpress/one-app/commit/352bbd3f09c47514fea193398fa6b06f1249a174))


# [5.4.0](https://github.com/americanexpress/one-app/compare/v5.3.1...v5.4.0) (2020-08-12)


### Features

* **pwa/cache:** add resource caching and invalidation ([a85045c](https://github.com/americanexpress/one-app/commit/a85045c4622f20ea3e3f66f4d352ba05f270d73f))


## [5.3.1](https://github.com/americanexpress/one-app/compare/v5.3.0...v5.3.1) (2020-08-05)


### Bug Fixes

* **scripts/watch:** ensure missing sw scripts ([69f5f1b](https://github.com/americanexpress/one-app/commit/69f5f1b37e1cdee475ca662d4bfa3d3ed3bdf0b1))


# [5.3.0](https://github.com/americanexpress/one-app/compare/v5.2.2...v5.3.0) (2020-07-29)


### Features

* **createCircuitBreaker:** log circuit breaker activity ([acb96c3](https://github.com/americanexpress/one-app/commit/acb96c315db663474fa99b0fc929719586deacf9))
* **pwa/cache:** clear when disabled ([e84eddd](https://github.com/americanexpress/one-app/commit/e84eddd40a2c99a6b87928e58b5fcd40768e9edd))
* **ssrServer:** added readiness check route ([#248](https://github.com/americanexpress/one-app/issues/248)) ([a342e71](https://github.com/americanexpress/one-app/commit/a342e71e99a1485616392c074c1d1459c058d7e2))


## [5.2.2](https://github.com/americanexpress/one-app/compare/v5.2.1...v5.2.2) (2020-07-15)

### Dependency Updates

* **deps-dev/webdriverio** 6.1.20 to 6.1.24
* **deps/@americanexpress/one-app-ducks** 4.0.1 to 4.1.1
* **deps/@americanexpress/one-app-bundler** 6.6.0 to 6.7.0
* **deps-dev/jest** 26.0.1 to 26.1.0
* **deps/@americanexpress/fetch-enhancers** 1.0.0 to 1.0.1

<a name="5.2.1"></a>
## [5.2.1](https://github.com/americanexpress/one-app/compare/v5.2.0...v5.2.1) (2020-07-01)


### Bug Fixes

* **clientModuleMapCache:** set base url for module bundle type ([#215](https://github.com/americanexpress/one-app/issues/215)) ([95ca35f](https://github.com/americanexpress/one-app/commit/95ca35f))
* **release/change-log:** remove -e added ([#211](https://github.com/americanexpress/one-app/issues/211)) ([250113b](https://github.com/americanexpress/one-app/commit/250113b))


<a name="5.2.0"></a>
# [5.2.0](https://github.com/americanexpress/one-app/compare/v5.1.1...v5.2.0) (2020-06-24)


### Bug Fixes

* **module-map:** missing baseUrl to module map on server ([#206](https://github.com/americanexpress/one-app/issues/206)) ([c6a251e](https://github.com/americanexpress/one-app/commit/c6a251e))
* **stateConfig:** incorrect env var for dev-proxy port ([#209](https://github.com/americanexpress/one-app/issues/209)) ([3620a1a](https://github.com/americanexpress/one-app/commit/3620a1a))


### Features

* **createTimeoutFetch:** replaced [@americanexpress](https://github.com/americanexpress)/fetch-enhancers ([c12db6f](https://github.com/americanexpress/one-app/commit/c12db6f))
* **pwa/offline:** html shell ([e8a1dd2](https://github.com/americanexpress/one-app/commit/e8a1dd2))


<a name="5.1.1"></a>
## [5.1.1](https://github.com/americanexpress/one-app/compare/v5.1.0...v5.1.1) (2020-06-17)


### Bug Fixes

* **send-html:** ignore async chunks ([49a3826](https://github.com/americanexpress/one-app/commit/49a3826))


<a name="5.1.0"></a>
# [5.1.0](https://github.com/americanexpress/one-app/compare/v5.0.0...v5.1.0) (2020-06-10)


### Bug Fixes

* **pwa/icons:** correct base url ([c6fbd58](https://github.com/americanexpress/one-app/commit/c6fbd58))


### Features

* **make-promises-safe:** treat unhandledRejection as uncaught exception ([#174](https://github.com/americanexpress/one-app/issues/174)) ([5fe0245](https://github.com/americanexpress/one-app/commit/5fe0245))


<a name="5.0.0"></a>
# [5.0.0](https://github.com/americanexpress/one-app/compare/v5.0.0-rc.5...v5.0.0) (2020-05-28)


### Chores

* **deps:** upgrade react-helmet ([ac65593](https://github.com/americanexpress/one-app/commit/ac65593))


### Features

* **build/server:** only transpile for node ([#161](https://github.com/americanexpress/one-app/issues/161)) ([48c25cd](https://github.com/americanexpress/one-app/commit/48c25cd))
* **sendHtml/legacy:** only check user agent for ie ([#147](https://github.com/americanexpress/one-app/issues/147)) ([cc0aa95](https://github.com/americanexpress/one-app/commit/cc0aa95))
* **metrics/update prom-client:** update prom-client for more dimensions ([#123](https://github.com/americanexpress/one-app/issues/123)) ([79f0e68](https://github.com/americanexpress/one-app/commit/79f0e68))


### BREAKING CHANGES

* **deps:** requires react-helmet v6


<a name="5.0.0-rc.5"></a>
# [5.0.0-rc.5](https://github.com/americanexpress/one-app/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2020-05-20)


### Features

* **one-app-router:** update to 1.1.0 ([#137](https://github.com/americanexpress/one-app/issues/137)) ([0139c6c](https://github.com/americanexpress/one-app/commit/0139c6c))
* **pwa/web-manifest:** add middleware & config support ([9077f17](https://github.com/americanexpress/one-app/commit/9077f17))


<a name="5.0.0-rc.4"></a>
# [5.0.0-rc.4](https://github.com/americanexpress/one-app/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2020-05-13)


### Features

* **one-app-dev-cdn:** pass use-host flag ([#138](https://github.com/americanexpress/one-app/issues/138)) ([b7202ca](https://github.com/americanexpress/one-app/commit/b7202ca))
* **one-service-worker:** integration with one-app ([3a76625](https://github.com/americanexpress/one-app/commit/3a76625))


<a name="5.0.0-rc.3"></a>
# [5.0.0-rc.3](https://github.com/americanexpress/one-app/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2020-05-06)


### Features

* **createRequestHtmlFragment:** implemented circuit breaker ([#111](https://github.com/americanexpress/one-app/issues/111)) ([e10f707](https://github.com/americanexpress/one-app/commit/e10f707))
* **initClient:** removed StrictMode, resolves [#74](https://github.com/americanexpress/one-app/issues/74) ([#126](https://github.com/americanexpress/one-app/issues/126)) ([890a7e8](https://github.com/americanexpress/one-app/commit/890a7e8))


<a name="5.0.0-rc.2"></a>
# [5.0.0-rc.2](https://github.com/americanexpress/one-app/compare/5.0.0-rc.1...v5.0.0-rc.2) (2020-04-29)


### Features

* **dep:** add create-shared-react-context ([#112](https://github.com/americanexpress/one-app/issues/112)) ([24217c6](https://github.com/americanexpress/one-app/commit/24217c6))
* **one-app:** removed tenancy or tenant instances ([#69](https://github.com/americanexpress/one-app/issues/69)) ([1b6a5e5](https://github.com/americanexpress/one-app/commit/1b6a5e5))


# [5.0.0-rc.1](https://github.com/americanexpress/one-app/compare/5.0.0-rc.0...5.0.0-rc.1) (2020-04-22)


### Features

* **fetch:** switch to cross-fetch instead of isomorphic-fetch ([#101](https://github.com/americanexpress/one-app/issues/101)) ([82155d5](https://github.com/americanexpress/one-app/commit/82155d5d63344409559c42fd0783ab8b4b012bc3))
* **SecurityHeaders:** add Referrer-Policy override ([#97](https://github.com/americanexpress/one-app/issues/97)) ([6e16cc9](https://github.com/americanexpress/one-app/commit/6e16cc97926095f85ca786fd56c8cf825aad6c6e))


### Bug Fixes

* **healthyFrank:** change onHover for onMouseOver ([#104](https://github.com/americanexpress/one-app/issues/104)) ([ff3c87d](https://github.com/americanexpress/one-app/commit/ff3c87dd41e185624948408e966e9797a73611c2))
* **react:** update React to 16.13.1 ([#109](https://github.com/americanexpress/one-app/issues/109)) ([917e55a](https://github.com/americanexpress/one-app/commit/917e55a8deebf561c81762c4c9e88015760cac6a))
* **workflows:** removed greeting action ([#103](https://github.com/americanexpress/one-app/issues/103)) ([663fc0c](https://github.com/americanexpress/one-app/commit/663fc0c0a7b325339cba1cedb5e4cfe00fb97b7a))


## 5.0.0-rc.0 (2020-04-08)


### Features

* **all:** initial oss release ([0c64dcd](https://github.com/americanexpress/one-app/commit/0c64dcd7b76018868c37101e50ef2228c25a3eec))
* **csp:** add local development domains to csp ([#42](https://github.com/americanexpress/one-app/issues/42)) ([4952d28](https://github.com/americanexpress/one-app/commit/4952d286c8ae5750a0b723deb117a1d96d1fb0f2))
* **danger:** validate lockfiles ([#7](https://github.com/americanexpress/one-app/issues/7)) ([1e560f7](https://github.com/americanexpress/one-app/commit/1e560f71090253072cc37b43a4143e819f6dc88e))
* **holocron:** holocron 1.1.0 ([5e84384](https://github.com/americanexpress/one-app/commit/5e84384d17a452edd66a058dcdb905182021e5c3))
* **loadModule:** optional cache bust key ([#37](https://github.com/americanexpress/one-app/issues/37)) ([b34b1bd](https://github.com/americanexpress/one-app/commit/b34b1bd57fc5c49c683d771e24bafc4dae38d0e3))
* **react:** update to latest version of react ([690e02b](https://github.com/americanexpress/one-app/commit/690e02bd8689b7091d71b618bf925606f0fff040))
* **release:**  one-app release process ([#90](https://github.com/americanexpress/one-app/issues/90)) ([72ea38b](https://github.com/americanexpress/one-app/commit/72ea38bc033195e0db1a3b4d220c1e1093dc3264))
* **routes:** added default 404 route ([d8f1bad](https://github.com/americanexpress/one-app/commit/d8f1bad4379f8ec1198b4f31c30e17d4db1fe5e4))
* **runtime:** add csp reporting url env var ([#81](https://github.com/americanexpress/one-app/issues/81)) ([f6faa53](https://github.com/americanexpress/one-app/commit/f6faa53bbdbf3f841c4609bbdc1fad5922ffe901))
* **stateConfig:** make state config more flexible ([#38](https://github.com/americanexpress/one-app/issues/38)) ([72539a0](https://github.com/americanexpress/one-app/commit/72539a013c7905bf75f3b8126f1bee579ceb6477)), closes [#20](https://github.com/americanexpress/one-app/issues/20)
* **statics:** generate one-app-statics package ([#82](https://github.com/americanexpress/one-app/issues/82)) ([8b65858](https://github.com/americanexpress/one-app/commit/8b658587d6cdced36b245642374b70af79a67b69))


### Bug Fixes

* **conditionallyAllowCors:** nested array of cors origins ([#14](https://github.com/americanexpress/one-app/issues/14)) ([75ba553](https://github.com/americanexpress/one-app/commit/75ba55336f79afe53459070946a77877c2513fe4))
* **devCdn:** proxy modules through dev cdn ([#48](https://github.com/americanexpress/one-app/issues/48)) ([20a910a](https://github.com/americanexpress/one-app/commit/20a910a8b370f702c87960520cdd9068fbbb6caf))
* **provided-externals:** logs warning for child modules ([#32](https://github.com/americanexpress/one-app/issues/32)) ([24a9be4](https://github.com/americanexpress/one-app/commit/24a9be4ceaeaf2b2e5f6e8dc60d98cd9643e2ede))
* **scripts:** drop-module ([#75](https://github.com/americanexpress/one-app/issues/75)) ([8e9de45](https://github.com/americanexpress/one-app/commit/8e9de457966544a0589dfd1eb74eac1969b16ddc))
* **server:** changes to allow for dev proxy usage ([#54](https://github.com/americanexpress/one-app/issues/54)) ([6c6631c](https://github.com/americanexpress/one-app/commit/6c6631c3061d0d7d2426e2f90a754df5d67b524f))
* **stateConfig:** use localhost rather than ip for dev ([#63](https://github.com/americanexpress/one-app/issues/63)) ([de051d9](https://github.com/americanexpress/one-app/commit/de051d9f0917bcb65a948b13487306248a1a3319))
* **utils:** replace watchLocalModules cdn-url string to be ip/port ([#17](https://github.com/americanexpress/one-app/issues/17)) ([0650b16](https://github.com/americanexpress/one-app/commit/0650b166ef7825ef58a3e8a0b2ee69b48a1d8129))
* **vulnerabilities:** dependency updates ([#5](https://github.com/americanexpress/one-app/issues/5)) ([9b35457](https://github.com/americanexpress/one-app/commit/9b35457afd1acadf6f37880f3091c0724db42b4c))
