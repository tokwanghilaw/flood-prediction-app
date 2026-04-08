import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rainfall, lake_level, data } = req.body;

    // Optional: calculate quick summary values (very useful later)
    const maxFlooded = Math.max(...data.hours.map((h: any) => h.flooded_land_pct || 0));
    const maxDepth = Math.max(...data.hours.map((h: any) => h.max_depth_m || 0));
    const highestWarning = data.hours[0]?.warning_level || "NORMAL";

    const saved = await prisma.prediction.create({
      data: {
        rainfall: rainfall,                    // input array
        lakeLevel: lake_level,                 // input array
        hours: data.hours,                     // full prediction (contains all PNGs)
        bounds: data.bounds,
        demPng: data.dem_png,                  // note: snake_case from API → camelCase in DB
        lakePng: data.lake_png,
        thresholds: data.thresholds,
        maxFloodedLandPct: maxFlooded,
        maxDepthM: maxDepth,
        highestWarning: highestWarning,
      },
    });

    console.log(`✅ Prediction saved to database! ID: ${saved.id}`);
    res.status(200).json({ success: true, id: saved.id });
  } catch (error: any) {
    console.error('❌ Database save failed:', error);
    res.status(500).json({ error: 'Failed to save prediction', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}