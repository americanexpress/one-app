# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
