import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  ai ??= new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  return ai;
}

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  }
}));
app.use(express.json({ limit: '16kb' }));

const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_RATE_LIMIT_MAX_REQUESTS = 20;
const aiRequestCounts = new Map<string, { count: number; resetAt: number }>();
let rateLimitRequestsSinceCleanup = 0;

function limitAiRequests(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = aiRequestCounts.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    if (!entry && aiRequestCounts.size >= 10_000) {
      const oldestKey = aiRequestCounts.keys().next().value;
      if (oldestKey !== undefined) aiRequestCounts.delete(oldestKey);
    }
    entry = { count: 0, resetAt: now + AI_RATE_LIMIT_WINDOW_MS };
    aiRequestCounts.set(clientKey, entry);
  }

  if (++rateLimitRequestsSinceCleanup >= 100 || aiRequestCounts.size > 10_000) {
    for (const [key, value] of aiRequestCounts) {
      if (value.resetAt <= now) aiRequestCounts.delete(key);
    }
    rateLimitRequestsSinceCleanup = 0;
  }

  if (entry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Terlalu banyak permintaan AI. Tunggu sebentar lalu coba lagi.' });
    return;
  }

  entry.count += 1;
  next();
}

const roles = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'] as const;
const metricKeys = ['mood', 'kas', 'chaos', 'cuanPengusaha', 'penaltyPengusaha'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntegerInRange = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function validMetrics(value: unknown): boolean {
  return isRecord(value) &&
    isIntegerInRange(value.mood, 0, 10) &&
    isIntegerInRange(value.kas, 0, 10) &&
    isIntegerInRange(value.chaos, 0, 10);
}

function validScenarioResponse(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.scenario) || !isRecord(value.actions)) return false;
  if (typeof value.scenario.title !== 'string' || value.scenario.title.length > 160 ||
      typeof value.scenario.description !== 'string' || value.scenario.description.length > 2000) return false;

  return roles.every(role => {
    const actions = value.actions[role];
    return Array.isArray(actions) && actions.length === 3 && actions.every((action: unknown) => {
      if (!isRecord(action) || typeof action.id !== 'string' || action.id.length > 100 ||
          typeof action.name !== 'string' || action.name.length > 160 ||
          typeof action.description !== 'string' || action.description.length > 1000 ||
          !isRecord(action.effects)) return false;
      const effects = Object.entries(action.effects);
      return effects.length >= 1 && effects.length <= 2 && effects.every(([key, amount]) => {
        if (!metricKeys.includes(key as typeof metricKeys[number]) || typeof amount !== 'number' || !Number.isInteger(amount)) return false;
        if (key === 'penaltyPengusaha') return (amount as number) >= 0 && (amount as number) <= 1;
        if (key === 'cuanPengusaha') return (amount as number) >= -2 && (amount as number) <= 3;
        return (amount as number) >= -3 && (amount as number) <= 3;
      });
    });
  });
}

function validRecapRequest(value: unknown): value is { year: number; actionsTaken: Record<string, unknown> } {
  if (!isRecord(value) || !isIntegerInRange(value.year, 1, 5) || !isRecord(value.actionsTaken)) return false;
  return roles.every(role => {
    const action = value.actionsTaken[role];
    return action === null || action === undefined ||
      (isRecord(action) && typeof action.name === 'string' && action.name.length <= 160);
  });
}

function getActionName(value: unknown): string {
  return isRecord(value) && typeof value.name === 'string' ? value.name : 'Skip';
}

function validRecapResponse(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.feed) && value.feed.length === 5 && value.feed.every((post: unknown) =>
    isRecord(post) && typeof post.author === 'string' && post.author.length <= 100 &&
    typeof post.handle === 'string' && post.handle.length <= 100 &&
    typeof post.content === 'string' && post.content.length <= 1000 &&
    isIntegerInRange(post.likes, 0, 100000000) && isIntegerInRange(post.retweets, 0, 100000000)
  );
}

function requireApiKey(res: express.Response): GoogleGenAI | null {
  const client = getAiClient();
  if (client) return client;
  res.status(503).json({ error: 'Layanan AI belum dikonfigurasi. Atur GEMINI_API_KEY di file .env.' });
  return null;
}

app.post('/api/scenario', limitAiRequests, async (req, res) => {
  try {
    const { year, currentMetrics, theme } = req.body ?? {};
    if (!isIntegerInRange(year, 1, 5) || !validMetrics(currentMetrics) ||
        !isRecord(theme) || typeof theme.title !== 'string' || theme.title.length > 160 ||
        typeof theme.description !== 'string' || theme.description.length > 1000) {
      return res.status(400).json({ error: 'Input skenario tidak valid.' });
    }
    const aiClient = requireApiKey(res);
    if (!aiClient) return;

    const prompt = `Anda adalah game master untuk game simulasi negara ber-genre satir sosial-ekonomi yang realistis.
Tahun: ${year}.
Kondisi Negara: 
- Mood Rakyat: ${currentMetrics.mood}/10
- Kas Negara: ${currentMetrics.kas}/10
- Level Chaos: ${currentMetrics.chaos}/10

TEMA UTAMA TAHUN INI:
Judul: "${theme?.title || 'Krisis Tak Terduga'}"
Konteks: "${theme?.description || 'Terjadi masalah yang mengancam stabilitas negara.'}"

TUGAS ANDA:
1. Buat Skenario Permasalahan (title dan description) yang menceritakan dan mengembangkan TEMA UTAMA di atas agar menjadi krisis yang mendesak bagi pemain. JANGAN gunakan contoh beras jika temanya bukan tentang beras.
2. Berikan 3 pilihan 'Kartu Aksi' yang realistis, masuk akal, namun memiliki sedikit unsur satir/ironi keseharian untuk masing-masing peran (Pemerintah, Bank Sentral, Pengusaha, Serikat Buruh, Masyarakat). Sesuaikan aksi dengan tema tahun ini.

PENTING - EFEK KARTU (Gunakan angka integer, pilih 1 atau 2 efek per kartu saja agar simple):
- mood: -3 s/d +3 (Mempengaruhi Mood Rakyat)
- kas: -3 s/d +3 (Mempengaruhi Kas Negara)
- chaos: -3 s/d +3 (Mempengaruhi Level Chaos)
- cuanPengusaha: -2 s/d +3 (Token Cuan Pengusaha)
- penaltyPengusaha: 0 s/d 1 (Penalti untuk Pengusaha yang diberikan Buruh/Pemerintah)

Contoh Kartu (JANGAN DISALIN, HANYA CONTOH FORMAT):
- Pemerintah: "Bagi-Bagi Bantuan Sosial Dadakan" (mood +2, kas -2)
- Bank Sentral: "Naikkan Bunga Cicilan KPR" (kas +1, mood -1)
- Pengusaha: "Kurangi Porsi Barang, Harga Tetap" (cuanPengusaha +2, mood -1)
- Serikat Buruh: "Tuntut Kenaikan UMR 15%" (chaos +2, penaltyPengusaha +1)
- Masyarakat: "Ngutang Pinjol Demi HP Baru" (mood +1, kas -1)

Buat skenario dan aksinya terasa nyata, relevan dengan masalah sehari-hari, dan mudah dipahami. Hindari bahasa yang terlalu gaul atau komedi yang memaksakan. Format JSON wajib.`;

    const actionSchema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        effects: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.NUMBER },
            kas: { type: Type.NUMBER },
            chaos: { type: Type.NUMBER },
            cuanPengusaha: { type: Type.NUMBER },
            penaltyPengusaha: { type: Type.NUMBER }
          }
        }
      },
      required: ["id", "name", "description", "effects"]
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Judul kocak, max 6 kata" },
                description: { type: Type.STRING, description: "Penjelasan krisis kocak" }
              },
              required: ["title", "description"]
            },
            actions: {
              type: Type.OBJECT,
              properties: {
                Pemerintah: { type: Type.ARRAY, items: actionSchema },
                "Bank Sentral": { type: Type.ARRAY, items: actionSchema },
                Pengusaha: { type: Type.ARRAY, items: actionSchema },
                "Serikat Buruh": { type: Type.ARRAY, items: actionSchema },
                Masyarakat: { type: Type.ARRAY, items: actionSchema },
              },
              required: ["Pemerintah", "Bank Sentral", "Pengusaha", "Serikat Buruh", "Masyarakat"]
            }
          },
          required: ["scenario", "actions"]
        }
      }
    });

    const result: unknown = JSON.parse(response.text || '{}');
    if (!validScenarioResponse(result)) {
      console.error('Gemini returned an invalid scenario response.');
      return res.status(502).json({ error: 'AI menghasilkan skenario dengan format tidak valid. Coba lagi.' });
    }
    return res.json(result);
  } catch (error) {
    console.error('Scenario generation failed:', error);
    return res.status(502).json({ error: 'Skenario gagal dibuat. Coba lagi beberapa saat.' });
  }
});

app.post('/api/recap', limitAiRequests, async (req, res) => {
  try {
    const { year, actionsTaken } = req.body ?? {};
    if (!validRecapRequest({ year, actionsTaken })) {
      return res.status(400).json({ error: 'Input rekap tidak valid.' });
    }
    const aiClient = requireApiKey(res);
    if (!aiClient) return;
    const prompt = `Anda adalah admin media sosial portal berita satir ringan.
Tahun: ${year} baru saja selesai.
Keputusan yang diambil pemain:
- Pemerintah: ${getActionName(actionsTaken['Pemerintah'])}
- Bank Sentral: ${getActionName(actionsTaken['Bank Sentral'])}
- Pengusaha: ${getActionName(actionsTaken['Pengusaha'])}
- Serikat Buruh: ${getActionName(actionsTaken['Serikat Buruh'])}
- Masyarakat: ${getActionName(actionsTaken['Masyarakat'])}

Buat 5 postingan Feed Sosial Media (seperti X/Twitter atau Instagram) yang memberikan reaksi lucu dan satir terhadap keputusan-keputusan di atas.
Gunakan bahasa Indonesia santai sehari-hari yang natural. Hindari penggunaan bahasa gaul atau meme yang terlalu berlebihan. Berikan sedikit sentuhan sarkasme dari sudut pandang warga biasa.
Author-nya buat relevan (misal: @WargaBiasa, @PekerjaKeras, @PengamatWarkop, dll).`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feed: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  author: { type: Type.STRING, description: "Display name lucu" },
                  handle: { type: Type.STRING, description: "@username lucu" },
                  content: { type: Type.STRING, description: "Isi cuitan/postingan meme" },
                  likes: { type: Type.NUMBER },
                  retweets: { type: Type.NUMBER }
                },
                required: ["author", "handle", "content", "likes", "retweets"]
              }
            }
          },
          required: ["feed"]
        }
      }
    });

    const result: unknown = JSON.parse(response.text || '{}');
    if (!validRecapResponse(result)) {
      console.error('Gemini returned an invalid recap response.');
      return res.status(502).json({ error: 'AI menghasilkan rekap dengan format tidak valid. Coba lagi.' });
    }
    return res.json(result);
  } catch (error) {
    console.error('Recap generation failed:', error);
    return res.status(502).json({ error: 'Rekap gagal dibuat. Coba lagi beberapa saat.' });
  }
});

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);

  const status = isRecord(error) && typeof error.status === 'number' ? error.status : 500;
  if (req.path.startsWith('/api/')) {
    const message = status === 413 ? 'Ukuran permintaan terlalu besar.' : status === 400 ? 'Format JSON permintaan tidak valid.' : 'Terjadi kesalahan pada server.';
    return res.status(status).json({ error: message });
  }

  console.error('Unhandled request error:', error);
  return res.status(status).send('Terjadi kesalahan pada server.');
});

const PORT = Number(process.env.PORT) || 3000;
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
