import { replaceInFile } from 'replace-in-file';
import dotenv from 'dotenv';
import {
  mkdirSync,
  readdirSync,
  copyFileSync,
  chmodSync,
  existsSync
} from 'fs';

// create cache dir
mkdirSync('src/.inline-cache', { recursive: true });

// cache JS files
readdirSync('src/js', { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
  .forEach(entry => {
    const srcPath = `src/js/${entry.name}`;
    const destPath = `src/.inline-cache/${entry.name}`;
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
// read the keys from the dotenv config
const keys = Object.keys(process.env);
const results = await replaceInFile({
  files: 'src/.inline-cache/*.js',
  from: keys.map(k => new RegExp(`__${k}__`, 'g')),
  to: keys.map(k => process.env[k])
});

//write the modified files to 'src/.inline-cache
if (results.some(r => r.hasChanged)) {
  //for troubleshooting
  //console.log('Processed js files:', results.filter(r => r.hasChanged).map(r => r.file));
}