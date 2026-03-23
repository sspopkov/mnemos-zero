import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Эмуляция __dirname в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;
