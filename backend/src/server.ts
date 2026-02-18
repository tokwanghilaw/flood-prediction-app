import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import { Pool } from 'pg';
// import * as tf from '@tensorflow/tfjs'; // Placeholder for model

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT), // Port must be a number
});

// Test DB connection on startup – debug
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('PostgreSQL connected successfully');
    release();
  }
});

// Mock prediction function (no real model yet)
async function mockPredict(timestamp: string) {
  return {
    timestamp,
    floodExtent: [
      { location: 'Sipocot', depth: Math.random() * 5 + 0.5 },
      { location: 'Bato', depth: Math.random() * 6 + 1 },
      { location: 'Camaligan', depth: Math.random() * 7 + 2 },
      // add more locations from your screenshot as needed
    ],
  };
}

// Initialize database table
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flood_data (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        location VARCHAR(100) NOT NULL,
        depth FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database table ready');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error creating table:', msg);
  }
}

initDatabase();

// ────────────────────────────────────────────────
// API endpoint
// ────────────────────────────────────────────────
app.get('/api/flood-data', async (req, res) => {
  const { startTime, endTime } = req.query;

  try {
    let historical: any[] = [];

    // Only query DB if parameters are provided
    if (startTime && endTime) {
      const result = await pool.query(
        'SELECT * FROM flood_data WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp',
        [startTime, endTime]
      );
      historical = result.rows;
    }

    // Always return a mock prediction
    const prediction = await mockPredict(
      (endTime as string) || new Date().toISOString()
    );

    res.json({
      historical,
      prediction,
      message: historical.length === 0 
        ? 'No historical data yet – insert some test rows' 
        : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API /flood-data error:', msg);
    res.status(500).json({ 
      error: 'Server error', 
      details: msg 
    });
  }
});

// Simple health-check endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is alive' });
});

app.listen(port, () => {
  console.log(`Backend running → http://localhost:${port}`);
  console.log('Test endpoints:');
  console.log(`  GET http://localhost:${port}/api/test`);
  console.log(`  GET http://localhost:${port}/api/flood-data`);
});