import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs/promises';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

function extractText(resp) {
  try {
    const candidates = resp?.candidates;
    const parts = candidates?.[0]?.content?.parts;
    return parts?.[0]?.text || 'Respons kosong dari Gemini.';
  } catch (err) {
    console.error('Error extracting text:', err);
    return 'Gagal mengekstrak teks dari respons.';
  }
}

async function fileToGenerativePart(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

app.post('/chat', async (req, res) => {
  const { conversation } = req.body;

  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ success: false, message: 'Percakapan harus berupa array!' });
  }

  const isValid = conversation.every(msg =>
    msg &&
    typeof msg === 'object' &&
    ['role', 'text'].every(k => Object.keys(msg).includes(k)) &&
    ['user', 'model'].includes(msg.role) &&
    typeof msg.text === 'string'
  );

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Struktur percakapan tidak valid!' });
  }

  const contents = conversation.map(({ role, text }) => ({
    role,
    parts: [{ text }]
  }));

  try {
    const resp = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil ditanggapi oleh Gemini!',
      data: extractText(resp),
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/multimodal', upload.single('file'), async (req, res) => {
  const { prompt } = req.body;
  const file = req.file;

  if (!file || !prompt) {
    return res.status(400).json({ success: false, message: 'File dan prompt wajib diisi!' });
  }

  try {
    const filePart = await fileToGenerativePart(file.path, file.mimetype);
    const resp = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [prompt, filePart],
    });

    await fs.unlink(file.path);

    res.status(200).json({
      success: true,
      message: 'File berhasil diproses!',
      data: extractText(resp),
    });
  } catch (err) {
    console.error('Multimodal error:', err);
    if (file?.path) await fs.unlink(file.path).catch(console.error);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di http://localhost:${PORT}`);
});
