'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic imports (no SSR issues with Leaflet)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const ImageOverlay = dynamic(() => import('react-leaflet').then((mod) => mod.ImageOverlay), { ssr: false });

interface PredictionHour {
  hour: number;
  predicted_level_m: number;
  warning_level: string;
  flood_depth_png: string;
}

interface PredictionResponse {
  hours: PredictionHour[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  dem_png: string;
  lake_png: string;
}

export default function FloodMap() {
  const [rainfall, setRainfall] = useState<string>('0,0.5,2,5,10,15,25,35,45,40,30,20');
  const [lakeLevel, setLakeLevel] = useState<string>('0.50,0.55,0.60,0.65,0.70,0.75,0.78,0.80,0.83,0.86,0.90,0.95');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [selectedHour, setSelectedHour] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setPrediction(null);

    // Convert comma strings to number arrays
    const rainfallArray = rainfall.split(',').map((v) => parseFloat(v.trim()));
    const lakeArray = lakeLevel.split(',').map((v) => parseFloat(v.trim()));

    if (rainfallArray.length !== 12 || lakeArray.length !== 12) {
      setError('Please enter exactly 12 numbers for each field (comma separated)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rainfall: rainfallArray,
          lake_level: lakeArray,
        }),
      });

      if (!res.ok) throw new Error('Server error');

      const data: PredictionResponse = await res.json();
      setPrediction(data);
      setSelectedHour(1);
    } catch (err: any) {
      setError(err.message || 'Prediction failed. Make sure Python API is running on port 8000');
    } finally {
      setLoading(false);
    }
  };

  const currentHour = prediction?.hours.find((h) => h.hour === selectedHour);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🌧️ Lake Buhi Flood Predictor (ConvLSTM)</h1>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-medium mb-2">Past 12 Hours Rainfall (mm) — comma separated</label>
          <textarea
            value={rainfall}
            onChange={(e) => setRainfall(e.target.value)}
            className="w-full h-24 p-3 border rounded font-mono text-sm"
            placeholder="0, 0.5, 2, 5, 10, 15, 25, 35, 45, 40, 30, 20"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Past 12 Hours Lake Level (meters)</label>
          <textarea
            value={lakeLevel}
            onChange={(e) => setLakeLevel(e.target.value)}
            className="w-full h-24 p-3 border rounded font-mono text-sm"
            placeholder="0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.78, 0.80, 0.83, 0.86, 0.90, 0.95"
          />
        </div>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg disabled:bg-gray-400"
      >
        {loading ? '⏳ Predicting 6-hour forecast... (10-15s)' : '🚀 Run Flood Prediction'}
      </button>

      {error && <p className="text-red-600 font-medium">{error}</p>}

      {/* Results */}
      {prediction && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={6}
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="w-64 accent-blue-600"
            />
            <div>
              <strong>Hour {selectedHour}</strong> — Lake Level: <span className="text-xl">{currentHour?.predicted_level_m.toFixed(2)} m</span> — 
              <span className={`ml-2 px-3 py-1 rounded-full text-white ${currentHour?.warning_level.includes('High') ? 'bg-red-600' : currentHour?.warning_level.includes('Medium') ? 'bg-orange-600' : 'bg-green-600'}`}>
                {currentHour?.warning_level}
              </span>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="border rounded-lg overflow-hidden shadow-lg" style={{ height: '600px' }}>
            <MapContainer
              center={[13.45, 123.35]} // Lake Buhi center
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />

              {/* Static DEM */}
              <ImageOverlay
                url={`data:image/png;base64,${prediction.dem_png}`}
                bounds={[
                  [prediction.bounds.south, prediction.bounds.west],
                  [prediction.bounds.north, prediction.bounds.east],
                ]}
                opacity={0.5}
              />

              {/* Static Lake */}
              <ImageOverlay
                url={`data:image/png;base64,${prediction.lake_png}`}
                bounds={[
                  [prediction.bounds.south, prediction.bounds.west],
                  [prediction.bounds.north, prediction.bounds.east],
                ]}
                opacity={0.7}
              />

              {/* Dynamic Flood Overlay */}
              {currentHour && (
                <ImageOverlay
                  url={`data:image/png;base64,${currentHour.flood_depth_png}`}
                  bounds={[
                    [prediction.bounds.south, prediction.bounds.west],
                    [prediction.bounds.north, prediction.bounds.east],
                  ]}
                  opacity={0.85}
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}