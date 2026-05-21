import fs from 'fs';
import path from 'path';

function findFiles(dir, filename, results = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        findFiles(fullPath, filename, results);
      }
    } else if (file === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

const res = findFiles('c:/Users/User/Desktop/comply360', 'templates.ts');
console.log('Templates found:', res);
