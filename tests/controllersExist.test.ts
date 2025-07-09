import fs from 'fs';
import path from 'path';

describe('controller factory functions', () => {
  const controllersDir = path.join(__dirname, '../src/controllers');
  const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

  files.forEach(file => {
    test(`${file} exports a create handler`, () => {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
      const regex = /export\s+(?:function|const)\s+create\w+/;
      expect(regex.test(content)).toBe(true);
    });
  });
});
