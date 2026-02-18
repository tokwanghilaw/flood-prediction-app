import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FaPlay, FaPause } from 'react-icons/fa';

// Dynamically import react-leaflet components (SSR-safe)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(mod => mod.Marker),       { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(mod => mod.Popup),        { ssr: false });
const GeoJSON      = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON),      { ssr: false });

// ────────────────────────────────────────────────
// Type definition for the flood data structure
// ────────────────────────────────────────────────
interface FloodTimeStep {
  time: string;
  depths: Record<string, number>;   // e.g. { Sipocot: 0.5, Balongay: 1.0, ... }
}

// Mock data – fallback when backend fetch fails
const mockFloodData: FloodTimeStep[] = [
  { time: '2 PM', depths: { Sipocot: 0.5, Balongay: 1.0, Camaligan: 2.5 } },
  { time: '3 PM', depths: { Sipocot: 1.0, Balongay: 1.5, Camaligan: 3.0 } },
  { time: '4 PM', depths: { Sipocot: 1.8, Balongay: 2.2, Camaligan: 3.8 } },
  { time: '5 PM', depths: { Sipocot: 2.5, Balongay: 3.0, Camaligan: 4.5 } },
  { time: '1 AM', depths: { Sipocot: 4.5, Balongay: 5.0, Camaligan: 6.0 } },
];

// ────────────────────────────────────────────────
// Create GeoJSON Feature (typed correctly)
// ────────────────────────────────────────────────
const createFloodFeature = (depth: number): GeoJSON.Feature => ({
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [123.9, 13.4],
        [124.2, 13.4],
        [124.2, 13.7],
        [123.9, 13.7],
        [123.9, 13.4],
      ],
    ],
  },
  properties: { depth },
});

// ────────────────────────────────────────────────
// Color function matching your screenshot
// ────────────────────────────────────────────────
const getColor = (depth: number): string => {
  if (depth > 6) return '#8B0000';
  if (depth > 4) return '#FF0000';
  if (depth > 2) return '#FF4500';
  if (depth > 1) return '#FFD700';
  if (depth > 0.5) return '#00BFFF';
  return '#ADD8E6';
};

const Home = () => {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [floodData, setFloodData] = useState<FloodTimeStep[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const totalSteps = floodData.length || mockFloodData.length;
        setCurrentTimeIndex((prev) => (prev + 1) % Math.max(totalSteps, 1));
      }, 1000);
    } else if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, floodData.length]);

  // Fetch data from backend
  useEffect(() => {
    const fetchFloodData = async () => {
      try {
        const res = await fetch('/api/flood-prediction');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        // Basic validation – make sure it's an array of expected shape
        if (Array.isArray(data) && data.every(item => 
          typeof item === 'object' && 
          'time' in item && typeof item.time === 'string' &&
          'depths' in item && typeof item.depths === 'object'
        )) {
          setFloodData(data as FloodTimeStep[]);
        } else {
          console.warn('Unexpected data format from backend, using mock data');
          setFloodData(mockFloodData);
        }
      } catch (err) {
        console.error('Error fetching flood prediction:', err);
        setFloodData(mockFloodData); // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchFloodData();
  }, []);

  const togglePlay = () => setIsPlaying((prev) => !prev);

  const currentData = floodData[currentTimeIndex] || mockFloodData[currentTimeIndex] || mockFloodData[0];
  const currentDepth = currentData?.depths
    ? (Object.values(currentData.depths)[0] as number) || 0
    : 0;

  const floodFeature = createFloodFeature(currentDepth);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          background: 'rgba(255,255,255,0.9)',
          padding: '20px 40px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          Loading flood prediction data...
        </div>
      )}

      {/* Search input (placeholder) */}
      <input
        type="text"
        placeholder="Search location"
        style={{ margin: '10px', padding: '8px 12px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
      />

      {/* Map */}
      <MapContainer center={[13.5, 123.5]} zoom={10} style={{ flex: 1 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Example markers */}
        <Marker position={[13.7, 123.2]}>
          <Popup>Sipocot</Popup>
        </Marker>
        <Marker position={[13.6, 123.3]}>
          <Popup>Balongay</Popup>
        </Marker>

        {/* Flood overlay */}
        <GeoJSON
          data={floodFeature}
          style={() => ({
            fillColor: getColor(currentDepth),
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.65,
          })}
        />
      </MapContainer>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f8f9fa',
          borderTop: '1px solid #ddd',
        }}
      >
        <button
          onClick={togglePlay}
          style={{
            marginRight: '16px',
            padding: '10px 14px',
            fontSize: '20px',
            cursor: 'pointer',
            border: 'none',
            background: '#0070f3',
            color: 'white',
            borderRadius: '6px',
          }}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        <Slider
          min={0}
          max={Math.max(floodData.length || mockFloodData.length, 1) - 1}
          value={currentTimeIndex}
          onChange={(value) => setCurrentTimeIndex(value as number)}
          marks={(floodData.length ? floodData : mockFloodData).reduce(
            (acc, data, idx) => ({ ...acc, [idx]: data.time }),
            {}
          )}
          step={null}
          style={{ flex: 1 }}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '90px',
          right: '16px',
          background: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Legend</h4>
        <div
          style={{
            background: 'linear-gradient(to bottom, #ADD8E6, #00BFFF, #FFD700, #FF4500, #FF0000, #8B0000)',
            height: '140px',
            width: '28px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
        <p style={{ margin: 0, fontSize: '13px' }}>&lt;0.5 ft   &gt;6 ft</p>
      </div>
    </div>
  );
};

export default Home;