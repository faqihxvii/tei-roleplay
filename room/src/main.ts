import path from 'node:path';
import { FileReportStore } from './reportStore';
import { createRoomServer } from './server';
import { FileStore } from './store';

const port = Number(process.env.PORT ?? 8787);
const root = process.cwd();

const { server, close } = await createRoomServer({
  store: new FileStore(process.env.ROOM_DATA_DIR ?? path.join(root, 'data', 'rooms')),
  publicDir: process.env.NODE_ENV === 'production' ? path.join(root, 'web', 'dist') : undefined,
  allowedOrigins: (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  rateLimitScale: Number(process.env.RATE_LIMIT_SCALE ?? 1),
  reports: {
    store: new FileReportStore(process.env.TELEMETRY_DIR ?? path.join(root, 'data', 'telemetry')),
    webhookUrl: process.env.TELEMETRY_WEBHOOK_URL || undefined,
    token: process.env.TELEMETRY_TOKEN || undefined,
  },
});

server.listen(port, () => console.log(`Server ruangan TEI di http://localhost:${port}`));

// Render (and most hosts) send SIGTERM before a deploy or restart: save rooms and post the last
// session reports first, but never hang past the host's grace period.
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    console.log(`${signal}: menyimpan ruangan dan laporan sebelum berhenti`);
    setTimeout(() => process.exit(1), 20_000).unref();
    close().then(() => process.exit(0), error => {
      console.error('Gagal menutup server dengan rapi', error);
      process.exit(1);
    });
  });
}
