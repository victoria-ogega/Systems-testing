import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://halicare-gules.vercel.app', 
    setupNodeEvents(on, config) {
      // ...
    },
  },
});