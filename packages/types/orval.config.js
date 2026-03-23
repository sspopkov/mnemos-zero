import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './swagger.json',
    output: {
      target: '../../apps/web/src/api/index.ts',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
    },
  },
});
