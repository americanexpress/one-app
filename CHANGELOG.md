# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [6.10.1](https://github.com/americanexpress/one-app/compare/v6.10.0...v6.10.1) (2024-02-21)


# [6.10.0](https://github.com/americanexpress/one-app/compare/v6.9.2...v6.10.0) (2024-02-16)


### Bug Fixes

* **devCdn:** removing extra / which created malformed url ([#1295](https://github.com/americanexpress/one-app/issues/1295)) ([dba1ac8](https://github.com/americanexpress/one-app/commit/dba1ac8e9c04b897b0fce6e95cb024d42d0c32e7))


### Features

* **proxyagent:** update proxy agent ([#1297](https://github.com/americanexpress/one-app/issues/1297)) ([4e6d8e8](https://github.com/americanexpress/one-app/commit/4e6d8e8a1dd685ded49811062b2b7e6ece1dce27))


## [6.9.2](https://github.com/americanexpress/one-app/compare/v6.9.1...v6.9.2) (2024-01-23)


### Bug Fixes

* **cdnCache:** make clear cache message generic ([#1248](https://github.com/americanexpress/one-app/issues/1248)) ([cac2e81](https://github.com/americanexpress/one-app/commit/cac2e81d633f1a0a051c9b1f864d9819f219e68f))
* **deps:** revert proxy agent ([#1249](https://github.com/americanexpress/one-app/issues/1249)) ([badbd98](https://github.com/americanexpress/one-app/commit/badbd98459dfab8db3765f554beeeda96782ce64))
* **errorHandler:** application errors would result in a 200 response ([#1243](https://github.com/americanexpress/one-app/issues/1243)) ([26a7740](https://github.com/americanexpress/one-app/commit/26a77403ced6fc11fd581788dba32d5e2d866bcb))
* **ssrServer:** fastify scope resulted in hooks being called more than once ([#1242](https://github.com/americanexpress/one-app/issues/1242)) ([2d84d6a](https://github.com/americanexpress/one-app/commit/2d84d6a628799e75d1412226edeeeef6ce1e71c2))


## [6.9.1](https://github.com/americanexpress/one-app/compare/v6.9.0...v6.9.1) (2024-01-22)


### Bug Fixes

* **proxy:** fix proxy configuration ([dd89ecd](https://github.com/americanexpress/one-app/commit/dd89ecd771647e85d17e964e3f6704b0d304a243))


# [6.9.0](https://github.com/americanexpress/one-app/compare/v6.8.3...v6.9.0) (2024-01-17)


### Bug Fixes

* **devCdn:** handle different module files ([48aa35f](https://github.com/americanexpress/one-app/commit/48aa35fc73c718f87531822e2cba754100993799))


### Features

* **otel:** log notice to STDOUT when using OTel ([#1215](https://github.com/americanexpress/one-app/issues/1215)) ([b4bcf21](https://github.com/americanexpress/one-app/commit/b4bcf2189e99c08ca6f8a4dad577047d9e73ffc0))


## [6.8.3](https://github.com/americanexpress/one-app/compare/v6.8.2...v6.8.3) (2023-12-06)


### Bug Fixes

* **runTime:** use relative urls for defaulted report variables ([059df73](https://github.com/americanexpress/one-app/commit/059df7391474cbd546a5402be7f642641f19b040))


## [6.8.2](https://github.com/americanexpress/one-app/compare/v6.8.1...v6.8.2) (2023-11-16)


### Bug Fixes

* **holocron:** update 1.9.2 ([#1189](https://github.com/americanexpress/one-app/issues/1189)) ([b781ee6](https://github.com/americanexpress/one-app/commit/b781ee6ee2c5b4e6b845ef92a2391706b7261f51))


## [6.8.1](https://github.com/americanexpress/one-app/compare/v6.8.0...v6.8.1) (2023-11-13)


### Bug Fixes

* **reactHtml:** use browser integrity for external fallbacks ([#1166](https://github.com/americanexpress/one-app/issues/1166)) ([6ae1e65](https://github.com/americanexpress/one-app/commit/6ae1e6579c2b8723e92f955f6263982ee2957ab9))


# [6.8.0](https://github.com/americanexpress/one-app/compare/v6.7.1...v6.8.0) (2023-11-01)


### Bug Fixes

* **scripts:** start watch failed to fetch modules ([#1159](https://github.com/americanexpress/one-app/issues/1159)) ([aa98621](https://github.com/americanexpress/one-app/commit/aa98621c1fe69f943cf7240be071a861ba656898))


### Features

* update strict transport security header to 2 years ([#1165](https://github.com/americanexpress/one-app/issues/1165)) ([6fbca9e](https://github.com/americanexpress/one-app/commit/6fbca9e8a4fa690f92d77fbe9f752625dac25659))


## [6.7.1](https://github.com/americanexpress/one-app/compare/v6.7.0...v6.7.1) (2023-09-28)


### Bug Fixes

* **cache-cdn:** stringify object ([#1138](https://github.com/americanexpress/one-app/issues/1138)) ([8715017](https://github.com/americanexpress/one-app/commit/871501745ece71085173501faab4b942b968f82c))


# [6.7.0](https://github.com/americanexpress/one-app/compare/v6.6.0...v6.7.0) (2023-09-27)


### Bug Fixes

* **image:** exclude devDeps from non-dev image ([#1085](https://github.com/americanexpress/one-app/issues/1085)) ([4d68dba](https://github.com/americanexpress/one-app/commit/4d68dba1cce2353ee56ba61e2296779d3480d678))
* **node:** bump Node.js to 18.17.1 for security patches ([#1087](https://github.com/americanexpress/one-app/issues/1087)) ([b491dbf](https://github.com/americanexpress/one-app/commit/b491dbfbb0be3f43be8a7502a8778b8568ad3b6c))


### Features

* **cache-module:** implemented cached modules ([#1094](https://github.com/americanexpress/one-app/issues/1094)) ([84838a8](https://github.com/americanexpress/one-app/commit/84838a8409e6384c18a80d4e1bc828ee7d7db006))
* **Dockerfile:** use .nvmrc to build the image ([#1090](https://github.com/americanexpress/one-app/issues/1090)) ([42c562c](https://github.com/americanexpress/one-app/commit/42c562c76ab0b31fb7129d3f681f608a5cfe3660))
* **external-fallbacks:** enable modules to have external fallbacks ([#984](https://github.com/americanexpress/one-app/issues/984)) ([7d51efe](https://github.com/americanexpress/one-app/commit/7d51efe55aa23729c03bd6394c9f10ad392e0179))
* **logging:** enable sending logs to OpenTelemetry ([#1097](https://github.com/americanexpress/one-app/issues/1097)) ([a0b8cb6](https://github.com/americanexpress/one-app/commit/a0b8cb6a5e162f89914798ed811b8d494a2e924e))
* **logging:** switch to fastify logger ([#1084](https://github.com/americanexpress/one-app/issues/1084)) ([33fa971](https://github.com/americanexpress/one-app/commit/33fa9712125a06546e377b862b838829742bf41b))
* **metrics:** add module rejection and fallback gauges ([#1131](https://github.com/americanexpress/one-app/issues/1131)) ([b60895a](https://github.com/americanexpress/one-app/commit/b60895a198e06cca715ad4117d323c57a487c2ba))
* **styleLoader:** aggregate stylesheets and dedupe if already loaded ([#1099](https://github.com/americanexpress/one-app/issues/1099)) ([a74a5ba](https://github.com/americanexpress/one-app/commit/a74a5ba5d315f8f0188657b3ee932e7444c590f6))


# [6.6.0](https://github.com/americanexpress/one-app/compare/v6.5.1...v6.6.0) (2023-08-09)


### Bug Fixes

* **csp:** removed csp default from fastify helmet ([e77372a](https://github.com/americanexpress/one-app/commit/e77372af879cdea478c0cfd5fd820f9b7daeeb7f))


### Features

* **config:** new config redirectAllowList ([#1050](https://github.com/americanexpress/one-app/issues/1050)) ([d3a94e2](https://github.com/americanexpress/one-app/commit/d3a94e22e7bc347ba94b98aa23e2a022622b7031))
* **node:** upgrade to node 18 ([#1067](https://github.com/americanexpress/one-app/issues/1067)) ([f1fd340](https://github.com/americanexpress/one-app/commit/f1fd34026e67eb695dba28e5909c3a63522de5e7))


## [6.5.1](https://github.com/americanexpress/one-app/compare/v6.5.0...v6.5.1) (2023-07-05)


### Bug Fixes

* **node:** bump node to 16.20.1 for security patches ([#1041](https://github.com/americanexpress/one-app/issues/1041)) ([7484c61](https://github.com/americanexpress/one-app/commit/7484c612a9c2f3ccae1a5575d21c0dacfd9fb891))


# [6.5.0](https://github.com/americanexpress/one-app/compare/v6.4.2...v6.5.0) (2023-06-29)


### Bug Fixes

* **configureRequestLog:** use default when configured with undefined ([#1029](https://github.com/americanexpress/one-app/issues/1029)) ([02eda87](https://github.com/americanexpress/one-app/commit/02eda8772a5546ce8e54c53854361b47b17f0dac))
* **csp-report:** add application/csp-report content type support ([#1038](https://github.com/americanexpress/one-app/issues/1038)) ([077fbc3](https://github.com/americanexpress/one-app/commit/077fbc3266e07e98f1a1072056a38b2b72b6a9a4))


### Features

* **circuitBreaker:** configurable event loop delay percentile ([#1032](https://github.com/americanexpress/one-app/issues/1032)) ([e5daa0c](https://github.com/americanexpress/one-app/commit/e5daa0c42787d9ce7d838f0bde9538bcf000bafa))
* **metrics:** response time summary ([#1026](https://github.com/americanexpress/one-app/issues/1026)) ([ad92ba2](https://github.com/americanexpress/one-app/commit/ad92ba2d8486428747925d8475492ea6629738c5))
* **metrics:** switch to fastify-metrics ([#1034](https://github.com/americanexpress/one-app/issues/1034)) ([b531606](https://github.com/americanexpress/one-app/commit/b5316069d20ff4cc749700df24f9f20f9f6bc1bd))
* **server:** add SSR React rendering summary metric ([#991](https://github.com/americanexpress/one-app/issues/991)) ([3e24352](https://github.com/americanexpress/one-app/commit/3e24352f9223508cd14c6441699408d4931bbda1))


## [6.4.2](https://github.com/americanexpress/one-app/compare/v6.4.1...v6.4.2) (2023-05-24)


### Bug Fixes

* **memLeak:** update one-app-ducks to fix memory leak ([#1008](https://github.com/americanexpress/one-app/issues/1008)) ([f428a77](https://github.com/americanexpress/one-app/commit/f428a779e8936dbcaa646bdcb86d1472e5d1150c))


## [6.4.1](https://github.com/americanexpress/one-app/compare/v6.4.0...v6.4.1) (2023-05-17)


### Bug Fixes

* **memoryLeak:** disable cache for transitjs ([#993](https://github.com/americanexpress/one-app/issues/993)) ([bb83c07](https://github.com/americanexpress/one-app/commit/bb83c07ed51be163cd9b9e52d22f9fae0a61770d))


# [6.4.0](https://github.com/americanexpress/one-app/compare/v6.3.0...v6.4.0) (2023-04-17)


### Bug Fixes

* **server:** remove extra nodeFramework key from log entries ([#974](https://github.com/americanexpress/one-app/issues/974)) ([973537c](https://github.com/americanexpress/one-app/commit/973537ce0b2a9ca044b2fa831b3c9707b2db3eb6))


### Features

* **pollModuleMap:** holocron provide rejected externals ([#962](https://github.com/americanexpress/one-app/issues/962)) ([dfc8745](https://github.com/americanexpress/one-app/commit/dfc87451896690bbf095d4a9038dbc28fa2c238e))


# [6.3.0](https://github.com/americanexpress/one-app/compare/v6.2.1...v6.3.0) (2023-03-22)


### Features

* **holocron:** allow mapStateToProps to be passed to holocron ([#951](https://github.com/americanexpress/one-app/issues/951)) ([ba8bad9](https://github.com/americanexpress/one-app/commit/ba8bad96f8bb0e32a7853bd83de9d3c759b394c9))


## [6.2.1](https://github.com/americanexpress/one-app/compare/v6.2.0...v6.2.1) (2023-03-09)


### Bug Fixes

* **devCdn:** requests were not using node-fetch API ([#949](https://github.com/americanexpress/one-app/issues/949)) ([8a3ff0a](https://github.com/americanexpress/one-app/commit/8a3ff0acea0e654a8ba532016b23f8ca6c199dc2))


# [6.2.0](https://github.com/americanexpress/one-app/compare/v6.1.2...v6.2.0) (2023-03-08)


### Bug Fixes

* **load-modules:** unnecessary calls to updateModuleRegistry ([#939](https://github.com/americanexpress/one-app/issues/939)) ([99ef4f1](https://github.com/americanexpress/one-app/commit/99ef4f1818fda4fde941041ba4ea22af2a27f726))


### Features

* **middleware:** trigger a redirect from loadModuleData ([#927](https://github.com/americanexpress/one-app/issues/927)) ([f948db1](https://github.com/americanexpress/one-app/commit/f948db19ff18be63f304bb1f9f3b034c47562292))
* **server:** ExpressJS to Fastify migration  ([#938](https://github.com/americanexpress/one-app/issues/938)) ([9b0c4b3](https://github.com/americanexpress/one-app/commit/9b0c4b3d5a1a8830225e4bf62d18f8ba566c5a07))


# [6.1.2](https://github.com/americanexpress/one-app/compare/v6.1.1...v6.1.2) (2023-02-20)


### Bug Fixes

* **deps:** bump holocron from 1.3.0 to 1.4.0 ([4ef11a8](https://github.com/americanexpress/one-app/commit/4ef11a801cdec3dea6f0baf7de05282c14e1e53e))


## [6.1.1](https://github.com/americanexpress/one-app/compare/v6.1.0...v6.1.1) (2022-11-09)


### Bug Fixes

* **fetchEnhancers:** take patch to fetch-enhancers ([a5e5d18](https://github.com/americanexpress/one-app/commit/a5e5d180fbc486c8f53c8aef3d088ddeb348f5a1))


# [6.1.0](https://github.com/americanexpress/one-app/compare/v6.0.0...v6.1.0) (2022-10-17)


### Code Refactoring

* migrating metrics server to Fastify ([#803](https://github.com/americanexpress/one-app/issues/803)) ([a0fc9ed](https://github.com/americanexpress/one-app/commit/a0fc9ed928b90c56c179080067c9b4908fbe4a9e)), closes [#780](https://github.com/americanexpress/one-app/issues/780) [#780](https://github.com/americanexpress/one-app/issues/780)


### Features

* **intl:** allow custom URLs for language packs ([#833](https://github.com/americanexpress/one-app/issues/833)) ([b67e826](https://github.com/americanexpress/one-app/commit/b67e8268f6578cf5b149db2a871dd0f2ecde8543))
* routes confidence checks ([2a3d996](https://github.com/americanexpress/one-app/commit/2a3d99692d2d52bab618d65f97ca73abe84d55f4))
* **server:** running app through fastify ([#785](https://github.com/americanexpress/one-app/issues/785)) ([e3da397](https://github.com/americanexpress/one-app/commit/e3da397a8664e11bfec58e85e2650d8a2cc16ff2))


# [6.0.0](https://github.com/americanexpress/one-app/compare/v5.15.3...v6.0.0) (2022-07-20)


### Bug Fixes

* **helmet:** disable breaking headers ([#780](https://github.com/americanexpress/one-app/issues/780)) ([df21a1d](https://github.com/americanexpress/one-app/commit/df21a1dd38b7ff5f893fe45961001a9ce010affb))


### Features

* **deps:** upgrade to react 17 ([d927a7f](https://github.com/americanexpress/one-app/commit/d927a7f370d88d216e1df7c6c026081ed7c5f9ea))
* **server:** drop node 12 support ([a755bef](https://github.com/americanexpress/one-app/commit/a755beffb9edce5f261bf02dca8c3cfd420f7c96))


### BREAKING CHANGES

* **server:** minimum supported node version is 16
* **deps:** Upgrade from React 16 to 17


## [5.15.3](https://github.com/americanexpress/one-app/compare/v5.15.2...v5.15.3) (2022-07-13)


### Bug Fixes

* **node:** bump node to 16.16.0 for security patch ([#782](https://github.com/americanexpress/one-app/issues/782)) ([3782116](https://github.com/americanexpress/one-app/commit/3782116f1e196780a547388e0a257f6717f98b02))


## [5.15.2](https://github.com/americanexpress/one-app/compare/v5.15.1...v5.15.2) (2022-07-06)


### Bug Fixes

* **deps:** bump core-js from 3.21.1 to 3.23.1 ([#764](https://github.com/americanexpress/one-app/issues/764)) ([53917e0](https://github.com/americanexpress/one-app/commit/53917e0266f9ceb05a3041802a9b2b11520b3512))


## [5.15.1](https://github.com/americanexpress/one-app/compare/v5.15.0...v5.15.1) (2022-06-08)


### Bug Fixes

* **renderPartial:** respect disabledStyles for partial render ([#755](https://github.com/americanexpress/one-app/issues/755)) ([8209bbe](https://github.com/americanexpress/one-app/commit/8209bbe713d88971a9557ab9f681e23ea6baac4a))


# [5.15.0](https://github.com/americanexpress/one-app/compare/v5.14.1...v5.15.0) (2022-06-01)


### Bug Fixes

* **fetch-enhancers:** use treeshakable es build ([#748](https://github.com/americanexpress/one-app/issues/748)) ([26b26ab](https://github.com/americanexpress/one-app/commit/26b26abaac1a9e3b5b693f1abd4403eb28f92e5d))


### Features

* **update:** updated node and npm versions on docker file ([7449e71](https://github.com/americanexpress/one-app/commit/7449e716c91320421702ccec6d2c028359a61be7))

## [5.14.1](https://github.com/americanexpress/one-app/compare/v5.14.0...v5.14.1) (2022-05-05)


### Bug Fixes

* **env:** don't require ONE_ENABLE_POST_TO_MODULE_ROUTES to be set ([#738](https://github.com/americanexpress/one-app/issues/738)) ([e7becf0](https://github.com/americanexpress/one-app/commit/e7becf0dbcbb6e36c3af2388ee972052e155fd98))


# [5.14.0](https://github.com/americanexpress/one-app/compare/v5.13.3...v5.14.0) (2022-05-04)


### Features

* **dns:** add option to enable app-level DNS caching ([#727](https://github.com/americanexpress/one-app/issues/727)) ([69dff8d](https://github.com/americanexpress/one-app/commit/69dff8d4a9b68b2dc2697ef02984e438cb1bc35b))
* **ssrServer:** make max POST request payload size configurable ([#721](https://github.com/americanexpress/one-app/issues/721)) ([a1abb49](https://github.com/americanexpress/one-app/commit/a1abb4986b922162935847fb0e042576f1c72b53))


## [5.13.3](https://github.com/americanexpress/one-app/compare/v5.13.2...v5.13.3) (2022-04-28)


### Bug Fixes

* **one-app-ducks:** delete lang pack request errors ([#722](https://github.com/americanexpress/one-app/issues/722)) ([b08ea4e](https://github.com/americanexpress/one-app/commit/b08ea4e57c247dbc81d487713e89b4701d7e08cd))


## [5.13.2](https://github.com/americanexpress/one-app/compare/v5.13.1...v5.13.2) (2022-04-13)


### Bug Fixes

* **addFrameOptions:** strict csp domain now matches ([#704](https://github.com/americanexpress/one-app/issues/704)) ([ee252db](https://github.com/americanexpress/one-app/commit/ee252dbc9c7e83e7fa5125f59c077a7e4669fd7b))


## [5.13.1](https://github.com/americanexpress/one-app/compare/v5.13.0...v5.13.1) (2022-03-16)


### Bug Fixes

* **csp:** remove script nonce if inline scripts are disabled ([#700](https://github.com/americanexpress/one-app/issues/700)) ([d90954e](https://github.com/americanexpress/one-app/commit/d90954ef3b6a07b3a0b01f8909f133c0ef504ef1))


# [5.13.0](https://github.com/americanexpress/one-app/compare/v5.12.0...v5.13.0) (2022-02-16)


### Bug Fixes

* **deps:** bump normalize-url from 4.5.0 to 4.5.1 ([#649](https://github.com/americanexpress/one-app/issues/649)) ([ad05552](https://github.com/americanexpress/one-app/commit/ad05552e2c7fea704683da49a23f560d256ffbd1))
* **holocron:** bad modules could cause crashes and prevent restart ([#631](https://github.com/americanexpress/one-app/issues/631)) ([3e53147](https://github.com/americanexpress/one-app/commit/3e5314715f07ecf9c217364971b9253fd581a64c))
* **prodsample:** configureRequestLog had faulty example code ([#647](https://github.com/americanexpress/one-app/issues/647)) ([9d62c6d](https://github.com/americanexpress/one-app/commit/9d62c6d5fdcbe30e19d282ffa32f1a0772254abc))


### Features

* **csp:** add env var to disable csp requirement in dev  ([#640](https://github.com/americanexpress/one-app/issues/640)) ([7fc5e19](https://github.com/americanexpress/one-app/commit/7fc5e1982b12c3fbb981840def2fd02ec96392f1))
* **csp:** allow nonce to be disabled in development ([#636](https://github.com/americanexpress/one-app/issues/636)) ([0916756](https://github.com/americanexpress/one-app/commit/0916756c8ffff0de5ca5f0ce25b02f9784378e35))
* **Dockerfile:** update to node 16 ([#677](https://github.com/americanexpress/one-app/issues/677)) ([2f302d6](https://github.com/americanexpress/one-app/commit/2f302d61ccd05207c73c534f442cd2c1b729b472))
* **routes:** childRoutes are not required for root module ([#657](https://github.com/americanexpress/one-app/issues/657)) ([0926fb2](https://github.com/americanexpress/one-app/commit/0926fb2ec05723f99279130c41e03414800dcd9f))
* **runtime:** support node 16 ([#624](https://github.com/americanexpress/one-app/issues/624)) ([f8752d6](https://github.com/americanexpress/one-app/commit/f8752d6252475d987eeb120061008e52e37b27a3))


# [5.12.0](https://github.com/americanexpress/one-app/compare/v5.11.7...v5.12.0) (2021-10-27)


### Features

* **externals:** added flag to not throw if externals versions have a mismatch ([#591](https://github.com/americanexpress/one-app/issues/591)) ([232d83e](https://github.com/americanexpress/one-app/commit/232d83e99ac838ca2623fb6f2742cc25b3fcb7bf))


## [5.11.7](https://github.com/americanexpress/one-app/compare/v5.11.6...v5.11.7) (2021-08-25)


### Bug Fixes

* **helmet:** fixes race condition with react-helmet ([#534](https://github.com/americanexpress/one-app/issues/534)) ([36f65d9](https://github.com/americanexpress/one-app/commit/36f65d9bdc42a8f31d751f40cc422c35a81445d1))


## [5.11.6](https://github.com/americanexpress/one-app/compare/v5.11.5...v5.11.6) (2021-06-23)


### Bug Fixes

* **requestLog:** only log on close ([#526](https://github.com/americanexpress/one-app/issues/526)) ([d57b26b](https://github.com/americanexpress/one-app/commit/d57b26b896d1418429fbfe12edd3d7b81a4c391c))


## [5.11.5](https://github.com/americanexpress/one-app/compare/v5.11.4...v5.11.5) (2021-05-26)


### Bug Fixes

* **clientErrorLogger:** add metaData to server side reported error ([2ca064f](https://github.com/americanexpress/one-app/commit/2ca064f0d7f380a1a2c33b7944608bcead7241f4))


## [5.11.4](https://github.com/americanexpress/one-app/compare/v5.11.3...v5.11.4) (2021-04-21)


### Bug Fixes

* **deps:** security audit ([#477](https://github.com/americanexpress/one-app/issues/477)) ([73022b5](https://github.com/americanexpress/one-app/commit/73022b5326abda84c4f22d8d176381c6c2a7c769))


## [5.11.3](https://github.com/americanexpress/one-app/compare/v5.11.2...v5.11.3) (2021-04-07)


### Bug Fixes

* **one-app-dev-cdn:** handle uncaught promise ([#476](https://github.com/americanexpress/one-app/issues/476)) ([324bfa3](https://github.com/americanexpress/one-app/commit/324bfa3203bf1cc8ab2dad5996c398da16cbb90b))


## [5.11.2](https://github.com/americanexpress/one-app/compare/v5.11.1...v5.11.2) (2021-02-24)


### Bug Fixes

* **deps:** bump one-app-ducks to 4.3.1 ([5aaf56a](https://github.com/americanexpress/one-app/commit/5aaf56abf22f9f9c0f57d6f3c1fc3082029ad2a2))
* **dev-holocron-cdn:** allow no local module map ([#433](https://github.com/americanexpress/one-app/issues/433)) ([58e1f7d](https://github.com/americanexpress/one-app/commit/58e1f7daf52f2896fa558a6c542dda689bde2ae3))
* **middleware:** use util.format in createRequestHtmlFragment ([0bfd1b7](https://github.com/americanexpress/one-app/commit/0bfd1b79e67a78bc09f6201ef04ce173714c87ae))


## [5.11.1](https://github.com/americanexpress/one-app/compare/v5.11.0...v5.11.1) (2021-02-03)


### Bug Fixes

* **holocron-module-route:** udpates returns promises ([#413](https://github.com/americanexpress/one-app/issues/413)) ([6aa086a](https://github.com/americanexpress/one-app/commit/6aa086a88c34709d818fabab05e3cfb68b5aeeb6))


# [5.11.0](https://github.com/americanexpress/one-app/compare/v5.10.2...v5.11.0) (2021-01-13)




### Features

* **createCircuitBreaker:** increase healthcheck interval to 5s ([#397](https://github.com/americanexpress/one-app/issues/397)) ([6f7f222](https://github.com/americanexpress/one-app/commit/6f7f2221fbfcdb6838f3f74226e73437687f5c9c))
* **metrics:** track intl cache size ([#406](https://github.com/americanexpress/one-app/issues/406)) ([de65e10](https://github.com/americanexpress/one-app/commit/de65e10e385fe40642f5e6e42ad4f0e29c5d439e))


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
