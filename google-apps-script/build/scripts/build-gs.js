import { replaceInFile } from 'replace-in-file';
import dotenv from 'dotenv';
import {
  mkdirSync,
  readdirSync,
  copyFileSync,
  chmodSync,
  existsSync
} from 'fs';

// ensure dist/gs exists
mkdirSync('dist/gs', { recursive: true });

// copy all .gs files from src/gs to dist/gs
readdirSync('src/gs', { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.gs'))
  .forEach(entry => {
    const srcPath = `src/gs/${entry.name}`;
    const destPath = `dist/gs/${entry.name}`;
    copyFileSync(srcPath, destPath);
    chmodSync(destPath, 0o644);
  });

// load env, which is inside src/
if (existsSync('src/.env')) {
  dotenv.config({ path: 'src/.env' });
}
if (existsSync('src/.env.local')) {
  dotenv.config({ path: 'src/.env.local', override: true });
}

// replace placeholders
const keys = Object.keys(process.env);
const results = await replaceInFile({
  files: 'dist/gs/*.gs',
  from: keys.map(k => new RegExp(`__${k}__`, 'g')),
  to: keys.map(k => process.env[k])
});

if (results.some(r => r.hasChanged)) {
  //for troubleshooting
  //console.log('Processed gs files:', results.filter(r => r.hasChanged).map(r => r.file));
}
