const fs = require('fs');
const path = require('path');

const LIB_PATH = path.resolve(__dirname, '..', 'node_modules/@fastify/cors/index.js');

const content = fs.readFileSync(LIB_PATH, 'utf-8');

fs.writeFileSync(LIB_PATH, content.replaceAll("addHook('onRequest'", "addHook('preHandler'"), 'utf-8');

console.log('@fastify/cors has been temporarily fixed');
