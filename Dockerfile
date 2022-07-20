# Use the pre-baked fat node image only in the builder
# which includes build utils preinstalled (e.g. gcc, make, etc).
# This will result in faster and reliable One App docker image
# builds as we do not have to run apk installs for alpine.
FROM node:16.16.0 as builder
WORKDIR /opt/build
RUN npm install -g npm@8.8.0 --registry=https://registry.npmjs.org
COPY --chown=node:node ./ /opt/build
# npm ci does not run postinstall with root account
RUN NODE_ENV=development npm ci --build-from-source
# npm ci does not run postinstall with root account
# which is why there is a dev build
RUN NODE_ENV=development npm run build && \
    mkdir -p /opt/one-app/development && \
    chown node:node /opt/one-app/development && \
    cp -r /opt/build/. /opt/one-app/development
# prod build
RUN NODE_ENV=production npm run build && \
    NODE_ENV=production npm prune && \
    mkdir -p /opt/one-app/production && \
    chown node:node /opt/one-app/production && \
    mv /opt/build/LICENSE.txt /opt/one-app/production && \
    mv /opt/build/node_modules /opt/one-app/production && \
    mv /opt/build/package.json /opt/one-app/production && \
    mv /opt/build/lib /opt/one-app/production && \
    mv /opt/build/build /opt/one-app/production && \
    mv /opt/build/bundle.integrity.manifest.json /opt/one-app/production && \
    mv /opt/build/.build-meta.json /opt/one-app/production

# development image
# docker build . --target=development
FROM node:16.16.0-alpine as development
ARG USER
ENV USER ${USER:-node}
ENV NODE_ENV=development
# exposing these ports as they are default for all the local dev servers
# see src/server/config/env/runtime.js
EXPOSE 3000
EXPOSE 3001
EXPOSE 3002
EXPOSE 3005
WORKDIR /opt/one-app
RUN chown node:node /opt/one-app
USER $USER
CMD ["node", "lib/server"]
COPY --from=builder --chown=node:node /opt/one-app/development ./

# production image
# last so that it's the default image artifact
FROM node:16.16.0-alpine as production
ARG USER
ENV USER ${USER:-node}
ENV NODE_ENV=production
# exposing these ports as they are defaults for one app and the prom metrics server
# see src/server/config/env/runtime.js
EXPOSE 3000
EXPOSE 3005
WORKDIR /opt/one-app
USER $USER
CMD ["node", "lib/server"]
COPY --from=builder --chown=node:node /opt/one-app/production ./
