import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      publicDir: 'public',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy all /oparl/* requests to the actual OParl server to bypass CORS
          '/oparl': {
            target: 'https://buergerinfo.stadt-koeln.de',
            changeOrigin: true,
            secure: true,
            // No rewrite needed: /oparl/... maps directly to the target path
          },
          '/mcp-http': {
            target: 'http://127.0.0.1:3333',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mcp-http/, '/mcp'),
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL),
        'process.env.GEMINI_FALLBACK_MODELS': JSON.stringify(env.GEMINI_FALLBACK_MODELS),
        'process.env.VITE_MCP_HTTP_ENDPOINT': JSON.stringify(env.VITE_MCP_HTTP_ENDPOINT || '/mcp-http'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
