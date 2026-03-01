import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: ".",
  publicDir: "public",
  server: {
    port: 3000,
    allowedHosts: ["sb-1upo7t3fvxuo.vercel.run"],
  },
  build: {
    outDir: "dist",
  },
});
