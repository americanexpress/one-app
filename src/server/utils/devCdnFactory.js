import path from 'path';
import fs from 'fs';
import got from 'got';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import ip from 'ip';
import ProxyAgent from 'proxy-agent';

const getLocalModuleMap = ({ pathToModuleMap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(fs.readFileSync(pathToModuleMap, 'utf8').toString());
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    module.browser.url = module.browser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.legacyBrowser.url = module.legacyBrowser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.node.url = module.node.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
  });
  return JSON.stringify(moduleMap, null, 2);
};

const matchPathToKnownRemoteModuleUrl = (
  incomingRequestPath,
  remoteModuleBaseUrls
) => remoteModuleBaseUrls.find((remoteModuleBaseUrl) => {
  const remoteModuleUrlOrigin = new URL(remoteModuleBaseUrl).origin;
  const remoteModulePath = remoteModuleBaseUrl.replace(remoteModuleUrlOrigin, '');

  return incomingRequestPath.startsWith(remoteModulePath);
});

const consumeRemoteRequest = async (remoteModuleMapUrl, hostAddress, remoteModuleBaseUrls) => {
  try {
    const response = await got(remoteModuleMapUrl, {
      agent: {
        https: new ProxyAgent(),
        http: new ProxyAgent(),
      },
    });

    // clear out remoteModuleBaseUrls as the new module map now has different urls in it
    // not clearing would result in an ever growing array
    remoteModuleBaseUrls.splice(0, remoteModuleBaseUrls.length);
    const remoteModuleMap = JSON.parse(response.body);
    const { modules } = remoteModuleMap;
    const oneAppDevStaticsAddress = `${hostAddress}/static`;
    Object.keys(modules).map((moduleName) => {
      const module = modules[moduleName];

      const parsedBundlePath = path.parse(module.node.url, '');

      // store urls for later lookup when module requests are caught by one-app-dev-cdn
      remoteModuleBaseUrls.push(
        module.node.url.replace(parsedBundlePath.base, '')
      );

      // override remote module map to point all module URLs to one-app-dev-cdn
      module.node.url = module.node.url.replace(
        new URL(module.node.url).origin, oneAppDevStaticsAddress
      );
      module.legacyBrowser.url = module.legacyBrowser.url.replace(
        new URL(module.legacyBrowser.url).origin, oneAppDevStaticsAddress
      );
      module.browser.url = module.browser.url.replace(
        new URL(module.browser.url).origin, oneAppDevStaticsAddress
      );
      return module;
    });
    return remoteModuleMap;
  } catch (error) {
    console.warn(
      `one-app-dev-cdn error loading module map from ${remoteModuleMapUrl}: ${error}`
    );
    return {};
  }
};

export const oneAppDevCdnFactory = ({
  localDevPublicPath,
  remoteModuleMapUrl,
  useLocalModules,
  appPort,
  useHost,
  routePrefix = '',
}) => {
  if (!remoteModuleMapUrl && !useLocalModules) {
    throw new Error('remoteModuleMapUrl is a required param when useLocalModules is not true');
  }
  if (!localDevPublicPath) { throw new Error('localDevPublicPath is a required param'); }
  if (!appPort) { throw new Error('appPort is a required param'); }

  if (remoteModuleMapUrl) {
    console.log(`one-app-dev-cdn loading module map from ${remoteModuleMapUrl}`);
  } else {
    console.log('one-app-dev-cdn only using locally served modules');
  }

  const oneAppDevCdn = Fastify();

  if (process.env.NODE_ENV === 'production') {
    console.warn('do not include one-app-dev-cdn in production');
    return oneAppDevCdn;
  }
  oneAppDevCdn.register(compress, {
    global: false,
  });
  oneAppDevCdn.register(cors, {
    origin: [
      `http://localhost:${appPort}`,
      `http://${ip.address()}:${appPort}`,
      undefined,
    ],
  });

  // for locally served modules

  oneAppDevCdn.register(fastifyStatic, {
    root: `${localDevPublicPath}/modules`,
    prefix: `${routePrefix}/modules`,
    index: false,

  });

  const remoteModuleBaseUrls = [];
  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get(`${routePrefix}/module-map.json`, async (req, reply) => {
    const hostAddress = useHost ? `http://${req.headers.host}` : `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}`;

    const localMap = useLocalModules ? JSON.parse(getLocalModuleMap({
      pathToModuleMap: path.join(localDevPublicPath, 'module-map.json'),
      oneAppDevCdnAddress: hostAddress,
    })) : {};
    let remoteMap = {};

    if (remoteModuleMapUrl !== undefined) {
      remoteMap = await consumeRemoteRequest(remoteModuleMapUrl, hostAddress, remoteModuleBaseUrls);
    }
    // remoteMap always fulfilled

    const map = {
      ...remoteMap,
      key: 'not-used-in-development',
      modules: {
        ...remoteMap.modules,
        ...localMap.modules,
      },
    };

    reply
      .code(200)
      .send(map);
  });
  // We dont return a value here so disable eslint
  // eslint-disable-next-line consistent-return
  oneAppDevCdn.get('*', async (req, reply) => {
    const incomingRequestPath = req.url;

    if (matchPathToKnownRemoteModuleUrl(incomingRequestPath, remoteModuleBaseUrls)) {
      const knownRemoteModuleBaseUrl = matchPathToKnownRemoteModuleUrl(
        incomingRequestPath,
        remoteModuleBaseUrls
      );
      const remoteModuleBaseUrlOrigin = new URL(knownRemoteModuleBaseUrl).origin;
      try {
        const remoteModuleResponse = await got(`${remoteModuleBaseUrlOrigin}/${req.url}`, {

          headers: { connection: 'keep-alive' },
          agent: {
            https: new ProxyAgent(),
            http: new ProxyAgent(),
          },
        });
        reply
          .code(remoteModuleResponse.statusCode)
          .type(path.extname(req.url))
          .send(remoteModuleResponse.body);
      } catch (err) {
        const status = err.statusCode === 'ERR_NON_2XX_3XX_RESPONSE' ? err.response.statusCode : 500;
        return reply
          .code(status)
          .send(err);
      }
    } else {
      reply
        .code(404)
        .send('Not found');
    }
  });

  return oneAppDevCdn;
};

export default oneAppDevCdnFactory;
