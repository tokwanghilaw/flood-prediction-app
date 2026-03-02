'use client';

import { useState, useEffect } from 'react';
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

interface SavedPrediction {
  id: number;
  createdAt: string;
  rainfall: number[];
}

export default function FloodMap() {
  const [rainfall, setRainfall] = useState('0,0.5,2,5,10,15,25,35,45,40,30,20');
  const [lakeLevel, setLakeLevel] = useState('0.50,0.55,0.60,0.65,0.70,0.75,0.78,0.80,0.83,0.86,0.90,0.95');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [selectedHour, setSelectedHour] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useExtent, setUseExtent] = useState(false);
  const [history, setHistory] = useState<SavedPrediction[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle slideshow playback
  useEffect(() => {
    if (!isPlaying || !prediction) return;

    const interval = setInterval(() => {
      setSelectedHour(prev => (prev >= 6 ? 1 : prev + 1));
    }, 1500); // Change hour every 1.5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, prediction]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.log('History not loaded yet (normal on first run)');
    }
  };

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
      const backendPort = 5000;
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

  const handleSave = async () => {
    if (!prediction) return;

    try {
      const res = await fetch('http://localhost:5000/api/save-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction,
          rainfall: rainfall.split(',').map(v => parseFloat(v.trim())),
          lake_level: lakeLevel.split(',').map(v => parseFloat(v.trim())),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Prediction saved to database. ID: ${data.id}`);
        fetchHistory(); // refresh the history table
      } else {
        alert('Failed to save');
      }
    } catch (err) {
      alert('Failed to save to database');
      console.error(err);
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
            <label className="block text-sm font-medium mb-2">Past 12 Hours Lake Water Level (meters)</label>
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
            {loading ? 'Predicting...' : 'Run Flood Prediction'}
          </button>

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          {/* SAVE BUTTON - appears after successful prediction */}
          {prediction && (
            <button
              onClick={handleSave}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-lg font-semibold"
            >
              Save Prediction
            </button>
          )}
        </div>

        {current && (
          <div className="mt-auto pt-6 text-center">
            <div className="text-sm text-gray-500 mb-1">CURRENT WARNING</div>
            <div
              className="px-6 py-3 rounded-2xl text-white text-xl font-bold mx-auto"
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
            {/* Slider + Play Button */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">Hour {selectedHour} Forecast — {current?.predicted_level_m.toFixed(3)} m</span>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    isPlaying
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
              </div>
              <input 
                type="range" 
                min={1} 
                max={6} 
                value={selectedHour} 
                onChange={e => {
                  setSelectedHour(Number(e.target.value));
                  setIsPlaying(false); // Stop playback when manually sliding
                }}
                className="w-full accent-blue-600" 
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setUseExtent(false)} 
                className={`px-4 py-2 rounded-lg text-sm ${!useExtent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Flood Depth Heatmap
              </button>
              <button 
                onClick={() => setUseExtent(true)} 
                className={`px-4 py-2 rounded-lg text-sm ${useExtent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Flood Extent (red)
              </button>
            </div>

            {/* LINE CHART */}
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

      {/* HISTORY TABLE (fixed at bottom) */}
      {history.length > 0 && (
        <div className="fixed bottom-0 left-96 right-0 bg-white border-t shadow-lg p-4 max-h-52 overflow-auto z-50">
          <h3 className="font-semibold mb-3">History</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Date & Time</th>
                <th className="p-2 text-left">Max Rainfall</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{p.id}</td>
                  <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-2">{Math.max(...p.rainfall)} mm</td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => alert('Load feature coming soon')}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Load
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}