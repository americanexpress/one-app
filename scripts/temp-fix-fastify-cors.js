/*
NOTE: This temporarily fix is needed until
      this PR is reviewed, merged, and published
      https://github.com/fastify/fastify-cors/pull/234
*/

const fs = require('fs');
const path = require('path');

const LIB_PATH = path.resolve(__dirname, '..', 'node_modules/@fastify/cors/index.js');

const content = fs.readFileSync(LIB_PATH, 'utf-8');

fs.writeFileSync(LIB_PATH, content.replaceAll("addHook('onRequest'", "addHook('preHandler'"), 'utf-8');

console.log('@fastify/cors has been temporarily fixed');
