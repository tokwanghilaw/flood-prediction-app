import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
//dfghjk
const app = express();
const port = 5000;
import prisma from './lib/prisma'

app.use(cors());
app.use(express.json());

// ====================== PYTHON CONV-LSTM PROXY ======================
app.post('/api/predict', async (req: any, res: any) => {
  console.log('📥 Received prediction request:', req.body);
  const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';

  try {
    console.log('⏳ Calling Python API (may take 30-60s first time)...');
    const response = await axios.post(`${pythonUrl}/predict`, req.body, { 
      timeout: 90000 
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

// ====================== SAVE PREDICTION TO DATABASE ======================
app.post('/api/save-prediction', async (req: Request, res: Response) => {
  try {
    const { prediction, rainfall, lake_level } = req.body;

    if (!prediction || !prediction.hours) {
      return res.status(400).json({ success: false, error: 'Invalid prediction data' });
    }

    const maxFlooded = Math.max(...prediction.hours.map((h: any) => h.flooded_land_pct || 0));
    const maxDepth = Math.max(...prediction.hours.map((h: any) => h.max_depth_m || 0));
    const highestWarning = prediction.hours[0]?.warning_level || "NORMAL";

    const saved = await prisma.prediction.create({
      data: {
        rainfall: rainfall,                    // Float[]
        lakeLevel: lake_level,                 // Float[]
        hours: prediction.hours,               // Json (full data + all PNGs)
        bounds: prediction.bounds,
        demPng: prediction.dem_png,
        lakePng: prediction.lake_png,
        thresholds: prediction.thresholds,
        maxFloodedLandPct: maxFlooded,
        maxDepthM: maxDepth,
        highestWarning: highestWarning,
      },
    });

    console.log(`✅ Prediction saved to DB! ID: ${saved.id}`);

    res.json({ 
      success: true, 
      id: saved.id,
      message: 'Prediction saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Save error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save to database', 
      details: error.message 
    });
  } finally {
    // await prisma.$disconnect();
  }
});
// =====================================================================

// ====================== HISTORY ======================
app.get('/api/history', async (req: any, res: any) => {
  // import prisma from './lib/prisma'

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