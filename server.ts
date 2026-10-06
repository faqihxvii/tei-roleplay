import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/scenario', async (req, res) => {
  try {
    const { year, currentMetrics, theme } = req.body;
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

    const response = await ai.models.generateContent({
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

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recap', async (req, res) => {
  try {
    const { year, actionsTaken } = req.body;
    const prompt = `Anda adalah admin media sosial portal berita satir ringan.
Tahun: ${year} baru saja selesai.
Keputusan yang diambil pemain:
- Pemerintah: ${actionsTaken['Pemerintah']?.name || 'Skip'}
- Bank Sentral: ${actionsTaken['Bank Sentral']?.name || 'Skip'}
- Pengusaha: ${actionsTaken['Pengusaha']?.name || 'Skip'}
- Serikat Buruh: ${actionsTaken['Serikat Buruh']?.name || 'Skip'}
- Masyarakat: ${actionsTaken['Masyarakat']?.name || 'Skip'}

Buat 5 postingan Feed Sosial Media (seperti X/Twitter atau Instagram) yang memberikan reaksi lucu dan satir terhadap keputusan-keputusan di atas.
Gunakan bahasa Indonesia santai sehari-hari yang natural. Hindari penggunaan bahasa gaul atau meme yang terlalu berlebihan. Berikan sedikit sentuhan sarkasme dari sudut pandang warga biasa.
Author-nya buat relevan (misal: @WargaBiasa, @PekerjaKeras, @PengamatWarkop, dll).`;

    const response = await ai.models.generateContent({
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

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
