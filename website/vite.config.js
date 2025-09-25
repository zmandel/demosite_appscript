import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import fs from 'fs';

export default defineConfig(({ command }) => {
  
  // OPTIONAL: enable HTTPS dev server if you have certs (uncomment & adjust paths)
   const httpsConfig = {
    key: fs.readFileSync('../../../../certs/localhost+2-key.pem'),
    cert: fs.readFileSync('../../../../certs/localhost+2.pem')
  };
  
  return {
    root: 'src',
    publicDir: '../static',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html'),
          page1: resolve(__dirname, 'src/page1.html'),
          page2: resolve(__dirname, 'src/page2.html'),
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
      https: httpsConfig,   // uncomment if enabling HTTPS
      open: false,
      host: true, 
    },
    preview: {
      port: 4173
    }
  };
});