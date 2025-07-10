const fs = require('fs');
const yaml = require('js-yaml');
const doc = yaml.load(fs.readFileSync('docs/openapi.yaml', 'utf8'));
for (const [path, methods] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op || typeof op !== 'object') continue;
    const slug = path
      .replace(/\//g, ' ')
      .replace(/\{(.*?)\}/g, 'By$1')
      .split(' ')
      .filter(Boolean)
      .map((p, i) => i === 0 ? p : p[0].toUpperCase() + p.slice(1))
      .join('');
    const id = `${method}${slug.replace(/[^a-zA-Z0-9]/g, '')}`;
    op.operationId = id;
    // Add standard error responses if not present
    if (!op.responses) op.responses = {};
    for (const code of ['400','401','403','500']) {
      if (!op.responses[code]) {
        op.responses[code] = {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        };
      }
    }
    // Add pagination parameters for GET list operations
    const respSchema = op.responses['200']?.content?.['application/json']?.schema;
    if (method === 'get' && path.match(/^\/[^{]+$/) && respSchema && respSchema.type === 'array') {
      op.parameters = op.parameters || [];
      const hasLimit = op.parameters.some(p=>p['$ref']==='#/components/parameters/limit');
      if (!hasLimit) op.parameters.push({ '$ref': '#/components/parameters/limit' });
      const hasOffset = op.parameters.some(p=>p['$ref']==='#/components/parameters/offset');
      if (!hasOffset) op.parameters.push({ '$ref': '#/components/parameters/offset' });
    }
    // Add security none for auth routes
    if (path.startsWith('/auth') || path.startsWith('/admin/auth')) {
      op.security = [];
    }
  }
}
fs.writeFileSync('docs/openapi.yaml', yaml.dump(doc, { lineWidth: 120 }));
