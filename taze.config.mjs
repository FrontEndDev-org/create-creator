import { defineConfig } from 'taze';

export default defineConfig({
  exclude: [],
  packageMode: {
    '/vite/': 'minor',
  },
});
