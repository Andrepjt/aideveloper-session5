import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer({ dest: 'uploads/' });

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(express.json());

// Fungsi ekstraksi teks dari respons Gemini
function extractText(resp) {
  try {
    const text =
      resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
      resp?.response?.candidates?.[0]?.content?.text;

    return text ?? JSON.stringify(resp, null, 2);
  } catch (err) {
    console.error('Error extracting text:', err);
    return JSON.stringify(resp, null, 2);
  }
}

// Fungsi bantu: konversi file ke format inlineData Gemini
async function fileToGenerativePart(filePath, mime) {
  const buffer = await fs.readFile(filePath);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mime,
    },
  };
}

// Endpoint teks biasa
app.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Prompt harus berupa string!', data: null });
    }

    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil ditanggapi oleh Google Gemini Flash!',
      data: extractText(resp),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Endpoint gambar
app.post('/image', upload.single('image'), async (req, res) => {
  const { prompt } = req.body;
  const file = req.file;

  if (!file || !prompt) {
    return res.status(400).json({ success: false, message: 'Gambar dan prompt wajib diisi!', data: null });
  }

  try {
    const imagePart = await fileToGenerativePart(file.path, file.mimetype);
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [prompt, imagePart],
    });

    await fs.unlink(file.path); // Bersihkan file setelah diproses

    res.status(200).json({
      success: true,
      message: 'Gambar berhasil diproses!',
      data: extractText(resp),
    });
  } catch (err) {
    await fs.unlink(file.path);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Endpoint dokumen
app.post('/document', upload.single('document'), async (req, res) => {
  const { prompt } = req.body;
  const file = req.file;

  if (!file || !prompt) {
    return res.status(400).json({ success: false, message: 'Dokumen dan prompt wajib diisi!', data: null });
  }

  try {
    const docPart = await fileToGenerativePart(file.path, file.mimetype);
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [prompt, docPart],
    });

    await fs.unlink(file.path);

    res.status(200).json({
      success: true,
      message: 'Dokumen berhasil diproses!',
      data: extractText(resp),
    });
  } catch (err) {
    await fs.unlink(file.path);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Endpoint audio
app.post('/audio', upload.single('audio'), async (req, res) => {
  const { prompt } = req.body;
  const file = req.file;

  if (!file || !prompt) {
    return res.status(400).json({ success: false, message: 'Audio dan prompt wajib diisi!', data: null });
  }

  try {
    const audioPart = await fileToGenerativePart(file.path, file.mimetype);
    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [prompt, audioPart],
    });

    await fs.unlink(file.path);

    res.status(200).json({
      success: true,
      message: 'Audio berhasil diproses!',
      data: extractText(resp),
    });
  } catch (err) {
    await fs.unlink(file.path);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan!',
    data: null,
  });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
