import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// Client for the rebuilt game: phone controller at "/", host screen and facilitator console at "/host".
// In development the room server runs separately (npm run room) and Vite proxies to it.

const roomServer = `http://localhost:${process.env.ROOM_PORT ?? 8787}`;

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    host: true, // reachable from phones on the same Wi-Fi
    proxy: {
      '/api': roomServer,
      '/ws': { target: roomServer, ws: true },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
