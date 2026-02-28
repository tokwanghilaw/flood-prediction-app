'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const ImageOverlay = dynamic(() => import('react-leaflet').then(mod => mod.ImageOverlay), { ssr: false });

interface HourData {
  hour: number;
  predicted_level_m: number;
  warning_level: string;
  warning_color: string;
  overflowing: boolean;
  flooded_land_pct: number;
  max_depth_m: number;
  mean_depth_m: number;
  flood_depth_png: string;
  flood_extent_png: string;
}

interface PredictionResponse {
  hours: HourData[];
  bounds: { south: number; west: number; north: number; east: number };
  dem_png: string;
  lake_png: string;
  thresholds: { normal: number; alert: number; alarm: number; critical: number };
}

export default function FloodMap() {
  const [rainfall, setRainfall] = useState('0,0.5,2,5,10,15,25,35,45,40,30,20');
  const [lakeLevel, setLakeLevel] = useState('0.50,0.55,0.60,0.65,0.70,0.75,0.78,0.80,0.83,0.86,0.90,0.95');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [selectedHour, setSelectedHour] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useExtent, setUseExtent] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setPrediction(null);

    const rainfallArr = rainfall.split(',').map(v => parseFloat(v.trim()));
    const lakeArr = lakeLevel.split(',').map(v => parseFloat(v.trim()));

    if (rainfallArr.length !== 12 || lakeArr.length !== 12) {
      setError('Please enter exactly 12 numbers separated by commas');
      setLoading(false);
      return;
    }

    try {
      const backendPort = 5000; // ← your backend port from terminal
      const res = await fetch(`http://localhost:${backendPort}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rainfall: rainfallArr, lake_level: lakeArr }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data: PredictionResponse = await res.json();
      setPrediction(data);
      setSelectedHour(1);
    } catch (err: any) {
      setError(err.message || 'Server error - check all terminals are running');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const current = prediction?.hours.find(h => h.hour === selectedHour);
  const imageBounds = prediction ? [
    [prediction.bounds.south, prediction.bounds.west],
    [prediction.bounds.north, prediction.bounds.east]
  ] : [[13.38, 123.40], [13.50, 123.60]];

  const chartData = prediction?.hours.map(h => ({
    hour: `Hour ${h.hour}`,
    level: h.predicted_level_m,
    alert: prediction!.thresholds.alert,
    alarm: prediction!.thresholds.alarm,
    critical: prediction!.thresholds.critical,
  })) || [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR - Input Form */}
      <div className="w-96 bg-white border-r border-gray-200 p-8 overflow-auto flex flex-col">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">Flood Predictor</h1>

        <div className="space-y-6 flex-1">
          <div>
            <label className="block text-sm font-medium mb-2">Past 12 Hours Rainfall (mm) — comma separated</label>
            <textarea
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
              className="w-full h-28 p-3 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="0,0.5,2,5,10,15,25,35,45,40,30,20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Past 12 Hours Lake Level (meters)</label>
            <textarea
              value={lakeLevel}
              onChange={(e) => setLakeLevel(e.target.value)}
              className="w-full h-28 p-3 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="0.50,0.55,0.60,0.65,0.70,0.75,0.78,0.80,0.83,0.86,0.90,0.95"
            />
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-xl text-lg font-semibold transition"
          >
            {loading ? '⏳ Predicting... (10-15s)' : 'Run Flood Prediction'}
          </button>

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        {current && (
          <div className="mt-auto pt-6 text-center"> {/* center everything inside */}
            <div className="text-sm text-gray-500 mb-1">CURRENT WARNING</div>
            <div
              className="px-6 py-3 rounded-2xl text-white text-xl font-bold mx-auto" /* block with auto margin */
              style={{ backgroundColor: current.warning_color }}
            >
              {current.warning_level}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE - Map + Chart */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative" style={{ minHeight: '500px' }}>
          {prediction ? (
            <MapContainer center={[13.45, 123.50]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ImageOverlay url={`data:image/png;base64,${prediction.dem_png}`} bounds={imageBounds} opacity={0.5} />
              <ImageOverlay url={`data:image/png;base64,${prediction.lake_png}`} bounds={imageBounds} opacity={0.75} />
              {current && (
                <ImageOverlay
                  url={`data:image/png;base64,${useExtent ? current.flood_extent_png : current.flood_depth_png}`}
                  bounds={imageBounds}
                  opacity={0.85}
                />
              )}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xl">Click "Run Flood Prediction" to see the map</div>
          )}
        </div>

        {prediction && (
          <div className="bg-white border-t border-gray-200 p-6 space-y-6">
            {/* Slider + Toggle */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Hour {selectedHour} Forecast — {current?.predicted_level_m.toFixed(3)} m</span>
              </div>
              <input type="range" min={1} max={6} value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setUseExtent(false)} className={`px-4 py-2 rounded-lg text-sm ${!useExtent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Flood Depth Heatmap</button>
              <button onClick={() => setUseExtent(true)} className={`px-4 py-2 rounded-lg text-sm ${useExtent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Flood Extent (red)</button>
            </div>

            {/* LINE CHART - exactly as in API_README */}
            <div className="h-80">
              <h3 className="font-semibold mb-3">6-Hour Lake Level Forecast with Thresholds</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0.4, 1.0]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="level" stroke="#2563eb" strokeWidth={4} dot={{ r: 6 }} />
                  <ReferenceLine y={chartData[0]?.alert} label="ALERT" stroke="#f1c40f" strokeDasharray="5 5" />
                  <ReferenceLine y={chartData[0]?.alarm} label="ALARM" stroke="#e67e22" strokeDasharray="5 5" />
                  <ReferenceLine y={chartData[0]?.critical} label="CRITICAL" stroke="#e74c3c" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-gray-500">Flooded Land</div>
                <div className="text-2xl font-bold">{current?.flooded_land_pct.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-gray-500">Max Depth</div>
                <div className="text-2xl font-bold">{current?.max_depth_m.toFixed(2)} m</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-gray-500">Mean Depth</div>
                <div className="text-2xl font-bold">{current?.mean_depth_m.toFixed(2)} m</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}