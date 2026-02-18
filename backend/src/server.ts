import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import * as tf from '@tensorflow/tfjs'; // Placeholder for model

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Database connection (placeholder; update with your creds)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'floodforecast',
  password: 'thesis',
  port: 5432,
});

// Mock ConvLSTM model: Returns dummy flood data for timestamps
async function mockPredict(timestamp: string): Promise<any> {
  // Simulate TensorFlow prediction (replace with real model later)
  const model = await tf.loadLayersModel('file://path/to/your/model.json'); // Placeholder
  // For prototype: Return mock flood extents (GeoJSON-like)
  return {
    timestamp,
    floodExtent: [
      { location: 'Sipocot', depth: 1.5 }, // ft
      { location: 'Bato', depth: 3.2 },
      // Add more based on image (e.g., red areas for high flood)
    ],
  };
}

// API: Get flood data for a time range
app.get('/api/flood-data', async (req, res) => {
  const { startTime, endTime } = req.query;
  try {
    // Query DB for historical data (placeholder)
    const result = await pool.query('SELECT * FROM flood_data WHERE timestamp BETWEEN $1 AND $2', [startTime, endTime]);
    // Augment with model prediction
    const prediction = await mockPredict(endTime as string);
    res.json({ historical: result.rows, prediction });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});