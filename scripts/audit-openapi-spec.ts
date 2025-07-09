const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function getRouteEndpoints() {
  const routesDir = path.join(__dirname, '../src/routes');
  const files = fs.readdirSync(routesDir);
  const endpoints = new Set();
  for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const regex = /router\.(get|post|put|patch|delete)\(['`]([^'`]+)['`]/g;
    let match;
    while ((match = regex.exec(content))) {
      const method = match[1].toUpperCase();
      const route = match[2].replace(/:([^/]+)/g, '{$1}');
      endpoints.add(`${method} ${route}`);
    }
  }
  return endpoints;
}

function getSpecEndpoints() {
  const doc = yaml.load(fs.readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8'));
  const endpoints = new Set();
  for (const [route, methods] of Object.entries(doc.paths || {})) {
    for (const method of Object.keys(methods)) {
      if (['get','post','put','patch','delete'].includes(method)) {
        endpoints.add(`${method.toUpperCase()} ${route}`);
      }
    }
  }
  return endpoints;
}

function main() {
  const routes = getRouteEndpoints();
  const spec = getSpecEndpoints();
  const missingInSpec = [...routes].filter(e => !spec.has(e));
  const extraInSpec = [...spec].filter(e => !routes.has(e));
  console.log('Missing in OpenAPI:', missingInSpec);
  console.log('Extra in OpenAPI:', extraInSpec);
}

main();
