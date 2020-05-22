FROM node:12-alpine
MAINTAINER One App Team

WORKDIR /

EXPOSE 443
EXPOSE 80
ADD api-cert.pem /api-cert.pem
ADD api-privkey.pem /api-privkey.pem
ADD server.js /server.js
ADD package-lock.json /package-lock.json
ADD db.json /db.json
ADD package.json /package.json
RUN npm ci --registry=https://registry.npmjs.org
ENTRYPOINT ["npm", "start"]
CMD [""]
