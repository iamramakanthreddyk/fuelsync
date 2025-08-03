const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const API_PREFIX = '/api/v1';

// Read app.ts to find imports and route mounts
const appTs = fs.readFileSync(path.join('src','app.ts'), 'utf8');

// Map imported router factory names to their file paths
const importRegex = /import\s+\{\s*([a-zA-Z0-9_]+)\s*\}\s+from\s+'\.\/routes\/([^']+)';/g;
const importMap = {};
let match;
while ((match = importRegex.exec(appTs)) !== null) {
  const funcName = match[1];
  const filePath = path.join('src','routes', match[2] + '.ts');
  importMap[funcName] = filePath;
}

// Find app.use statements mounting routers
const useRegex = /app\.use\(`\${API_PREFIX}([^`]+)`\s*,\s*([a-zA-Z0-9_]+)\(/g;
const mounts = [];
while ((match = useRegex.exec(appTs)) !== null) {
  const basePath = match[1];
  const funcName = match[2];
  const filePath = importMap[funcName];
  if (filePath && fs.existsSync(filePath)) {
    mounts.push({ basePath, filePath });
  }
}

// Extract routes from each router file
const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
const endpoints = [];
for (const { basePath, filePath } of mounts) {
  const content = fs.readFileSync(filePath, 'utf8');
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const routePath = m[2];
    let full = path.posix.join(API_PREFIX, basePath, routePath);
    if (!full.startsWith('/')) full = '/' + full;
    const params = [];
    for (const segment of full.split('/')) {
      if (segment.startsWith(':')) params.push(segment.slice(1));
    }
    endpoints.push({ method, path: full, params });
  }
}

// Sort endpoints
endpoints.sort((a, b) => {
  if (a.path === b.path) return a.method.localeCompare(b.method);
  return a.path.localeCompare(b.path);
});

// Generate backend_brain.md
const mdLines = [
  '# Backend API Reference',
  '',
  '| Method | Path | Path Params |',
  '| ------ | ---- | ----------- |',
  ...endpoints.map(e => `| ${e.method} | ${e.path} | ${e.params.join(', ') || '-'} |`)
];
fs.writeFileSync(path.join('docs','backend_brain.md'), mdLines.join('\n') + '\n');

// Generate minimal OpenAPI spec
const openapi = {
  openapi: '3.0.3',
  info: { title: 'FuelSync API', version: '1.0.0' },
  servers: [{ url: '/', description: 'API base URL' }],
  paths: {}
};
for (const e of endpoints) {
  const fullPath = e.path; // retain /api/v1 prefix
  if (!openapi.paths[fullPath]) openapi.paths[fullPath] = {};
  const methodObj = {
    summary: '',
    responses: { '200': { description: 'Success' } }
  };
  if (e.params.length) {
    methodObj.parameters = e.params.map(p => ({
      name: p,
      in: 'path',
      required: true,
      schema: { type: 'string' }
    }));
  }
  if (['POST','PUT','PATCH'].includes(e.method)) {
    methodObj.requestBody = {
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }
  openapi.paths[fullPath][e.method.toLowerCase()] = methodObj;
}
fs.writeFileSync(path.join('docs','openapi.yaml'), yaml.dump(openapi, { lineWidth: -1 }));

console.log(`Generated ${endpoints.length} endpoints.`);
