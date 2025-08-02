/**
 * @file fix_imports.js
 * @description Remove problematic type imports that cause runtime issues
 */

const fs = require('fs');
const path = require('path');

function removeTypeImports(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      removeTypeImports(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove the problematic import
      const originalContent = content;
      content = content.replace(/import\s+['"]\.\.\/types\/express['"];\s*\n?/g, '// Types handled by TypeScript compilation\n');
      content = content.replace(/import\s+['"]\.\/types\/express['"];\s*\n?/g, '// Types handled by TypeScript compilation\n');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  }
}

console.log('Fixing type imports...');
removeTypeImports('./src');
console.log('Done!');
