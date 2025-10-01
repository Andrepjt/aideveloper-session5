import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();

// Inisialisasi Google Generative AI dengan API key dari environment
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

// Tentukan model Gemini yang digunakan
const GEMINI_MODEL = process.env.GEMINI_MODEL;

// Middleware untuk parsing JSON
app.use(express.json());

// Fungsi untuk ekstraksi teks dari respons Gemini
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

// Endpoint untuk generate teks dari prompt
app.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Prompt harus diisi dan berupa string!',
        data: null,
      });
    }

    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const resultText = extractText(resp);

    res.status(200).json({
      success: true,
      message: 'Berhasil ditanggapi oleh Google Gemini Flash!',
      data: resultText,
    });
  } catch (err) {
    console.error('Error generating text:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Ada masalah di server gan!',
      data: null,
    });
  }
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan!',
    data: null,
  });
});