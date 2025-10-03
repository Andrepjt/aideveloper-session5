import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs/promises';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Fungsi bantu: konversi file ke format inlineData Gemini
async function fileToGenerativePart(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

// Ekstraksi teks dari respons Gemini dengan validasi aman
function extractText(resp) {
  try {
    const candidates = resp?.candidates;
    if (!candidates || candidates.length === 0) {
      return 'Respons kosong dari Gemini. Tidak ada kandidat.';
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0 || !parts[0].text) {
      return 'Respons tidak memiliki bagian teks yang bisa diekstrak.';
    }

    return parts[0].text;
  } catch (err) {
    console.error('Error extracting text:', err);
    return 'Gagal mengekstrak teks dari respons. Silakan cek log server.';
  }
}


// Endpoint teks biasa
app.post('/chat', upload.none(), async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt tidak boleh kosong!' });
  }

  try {
    const resp = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [prompt],
    });

    console.log('Gemini response (text):', JSON.stringify(resp, null, 2));

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

// Endpoint multimodal
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

    console.log('Gemini response (multimodal):', JSON.stringify(resp, null, 2));

    await fs.unlink(file.path); // Bersihkan file

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

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan!' });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di http://localhost:${PORT}`);
});
