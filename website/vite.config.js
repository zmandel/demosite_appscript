import { defineConfig } from 'vite'
import fs from 'fs';
import { resolve } from 'node:path'
import inlineSource from 'vite-plugin-inline-source';

export default defineConfig(({ command }) => {
  
  // OPTIONAL: enable HTTPS dev server if you have certs (uncomment & adjust paths)
  let httpsConfig = undefined;
  try {
    httpsConfig = {
      key: fs.readFileSync('../../../../certs/localhost+2-key.pem'),
      cert: fs.readFileSync('../../../../certs/localhost+2.pem')
    };
  } catch (err) {
    // Certs not found, will use HTTP
  }

  return {
    root: 'src',
    publicDir: '../static',
    plugins: [inlineSource()],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html'),
          page1: resolve(__dirname, 'src/page1.html'),
          page2: resolve(__dirname, 'src/page2.html'),
          page3: resolve(__dirname, 'src/page3.html'),
          login: resolve(__dirname, 'src/login.html'),
        },
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth']
          }
        }
      },
    },
    server: {
      port: 5173,
      https: httpsConfig,   // to enable HTTPS
      open: false,
      host: true, 
    },
    preview: {
      port: 4173
    }
  };
});