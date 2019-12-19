/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

const fs = require('fs');
const https = require('https');
const http = require('http');
const jsonServer = require('json-server');
const pause = require('connect-pause');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const delay = process.argv[2] ? Number(process.argv[2]) : 0;
const options = {
  key: fs.readFileSync('./api-privkey.pem'),
  cert: fs.readFileSync('./api-cert.pem'),
};

if (delay !== 0) {
  server.use(pause(delay));
}

server.use(middlewares);
server.use((req, res, next) => {
  const secretMessage = req.headers['auth-token'] ? 'you are being watched' : 'unauthorised';
  res.append('secret-message', secretMessage);
  next();
});
server.use(router);

https.createServer(options, server).listen(443, '0.0.0.0');
http.createServer({}, server).listen(80, '0.0.0.0');
