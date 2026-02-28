'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic import (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const ImageOverlay = dynamic(() => import('react-leaflet').then(mod => mod.ImageOverlay), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });

interface HourlyResult { /* paste from API response types if you want TS */ }

export default function FloodMap() {
  const [prediction, setPrediction] = useState<any>(null);
  const [selectedHour, setSelectedHour] = useState(1);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rainfall: [0,0.5,2,5,10,15,25,35,45,40,30,20], // your real inputs
        lake_level: [0.5,0.55,0.6,0.65,0.7,0.75,0.78,0.8,0.83,0.86,0.9,0.95],
      }),
    });
    const data = await res.json();
    setPrediction(data);
    setSelectedHour(1);
    setLoading(false);
  };

  const current = prediction?.hours.find((h : any) => h.hour === selectedHour);

  return (
    <div>
      <button onClick={handlePredict} disabled={loading}>
        {loading ? 'Predicting (10-15s)...' : 'Run 6-Hour Flood Forecast'}
      </button>

      {prediction && (
        <>
          <input
            type="range"
            min={1}
            max={6}
            value={selectedHour}
            onChange={(e) => setSelectedHour(+e.target.value)}
          />
          <p>Hour {selectedHour} — Level: {current?.predicted_level_m} m — {current?.warning_level}</p>

          <MapContainer center={[13.45, 123.35]} zoom={12} style={{ height: '600px', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Static base layers */}
            <ImageOverlay
              url={`data:image/png;base64,${prediction.dem_png}`}
              bounds={[[prediction.bounds.south, prediction.bounds.west], [prediction.bounds.north, prediction.bounds.east]]}
              opacity={0.6}
            />
            <ImageOverlay
              url={`data:image/png;base64,${prediction.lake_png}`}
              bounds={[[prediction.bounds.south, prediction.bounds.west], [prediction.bounds.north, prediction.bounds.east]]}
              opacity={0.8}
            />

            {/* Dynamic flood overlay */}
            {current && (
              <ImageOverlay
                url={`data:image/png;base64,${current.flood_depth_png}`}
                bounds={[[prediction.bounds.south, prediction.bounds.west], [prediction.bounds.north, prediction.bounds.east]]}
                opacity={0.85}
              />
            )}
          </MapContainer>
        </>
      )}
    </div>
  );
}