import path from 'node:path';
import { createRoomServer } from './server';
import { FileStore } from './store';

const port = Number(process.env.PORT ?? 8787);
const root = process.cwd();

const { server } = await createRoomServer({
  store: new FileStore(process.env.ROOM_DATA_DIR ?? path.join(root, 'data', 'rooms')),
  publicDir: process.env.NODE_ENV === 'production' ? path.join(root, 'web', 'dist') : undefined,
  allowedOrigins: (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
});

server.listen(port, () => console.log(`Server ruangan TEI di http://localhost:${port}`));
