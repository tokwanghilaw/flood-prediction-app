import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const PYTHON_API = process.env.PYTHON_API_URL!;

router.post('/predict', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${PYTHON_API}/predict`, req.body, {
      timeout: 30000, // 30s timeout (model inference ~10-15s first time)
    });

    res.json(response.data); // returns exact shape: { hours, bounds, dem_png, lake_png, thresholds }
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

export default router;