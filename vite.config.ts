import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'frontend',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./frontend/src"),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        }
    }
});
