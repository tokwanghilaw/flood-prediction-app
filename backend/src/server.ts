import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ====================== PYTHON CONV-LSTM PROXY ======================
app.post('/api/predict', async (req: any, res: any) => {
  console.log('📥 Received prediction request:', req.body);
  const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';

  try {
    console.log('⏳ Calling Python API (may take 30-60s first time)...');
    const response = await axios.post(`${pythonUrl}/predict`, req.body, { 
      timeout: 90000   // ← increased to 90 seconds
    });
    console.log('✅ Python API success');
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Python API error:', error.message);
    res.status(500).json({ 
      error: 'Prediction failed', 
      details: error.message,
      hint: 'First prediction can take up to 60 seconds. Wait longer or check Python terminal.'
    });
  }
});

// ====================== SAVE TO DATABASE ======================
app.post('/api/save-prediction', async (req: any, res: any) => {
  const prisma = new PrismaClient();  

  try {
    const { prediction, rainfall, lake_level } = req.body;

    const saved = await prisma.prediction.create({
      data: {
        rainfall,
        lakeLevel: lake_level,
        hours: prediction.hours,
        bounds: prediction.bounds,
        demPng: prediction.dem_png,
        lakePng: prediction.lake_png,
        thresholds: prediction.thresholds,
      },
    });

    console.log(`✅ Saved to DB! ID: ${saved.id}`);
    res.json({ success: true, id: saved.id });
  } catch (error: any) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save' });
  } finally {
    await prisma.$disconnect();
  }
});

// ====================== HISTORY ======================
app.get('/api/history', async (req: any, res: any) => {
  const prisma = new PrismaClient();   // ← created here

  try {
    const predictions = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, rainfall: true }
    });
    res.json(predictions);
  } catch (error: any) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to load history' });
  } finally {
    await prisma.$disconnect();
  }
});

// ====================== TEST ======================
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is working perfectly!' });
});

app.listen(port, () => {
  console.log(`🚀 Backend running → http://localhost:${port}`);
  console.log('Test here → http://localhost:5000/api/test');
});