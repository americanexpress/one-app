FROM node:16-alpine
MAINTAINER One App Team

WORKDIR /

EXPOSE 443
EXPOSE 80
ADD api-cert.pem /api-cert.pem
ADD api-privkey.pem /api-privkey.pem
ADD server.js /server.js
ADD db.json /db.json
ADD package.json /package.json
RUN npm install --registry=https://registry.npmjs.org
ENTRYPOINT ["npm", "start"]
CMD [""]
