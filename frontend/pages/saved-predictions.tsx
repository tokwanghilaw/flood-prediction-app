'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SavedPredictionDetail {
  id: number;
  createdAt: string;
  rainfall: number[];
  lake_level: number[];
  prediction: {
    hours: Array<{
      hour: number;
      predicted_level_m: number;
      warning_level: string;
      warning_color: string;
      flooded_land_pct: number;
      max_depth_m: number;
      mean_depth_m: number;
    }>;
  };
}

export default function SavedPredictionsPage() {
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchSavedPredictions();
  }, []);

  const fetchSavedPredictions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/history');
      if (res.ok) {
        const data = await res.json();
        setSavedPredictions(data);
      } else {
        setError('Failed to fetch saved predictions');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPrediction = savedPredictions.find(p => p.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Saved Predictions</h1>
            <p className="text-gray-600">View all flood predictions saved to the database</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
          >
            ← Back to Predictor
          </Link>
        </div>

        {loading && <div className="text-center text-gray-600">Loading saved predictions...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

        {!loading && savedPredictions.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg text-center">
            <p className="text-lg font-semibold">No saved predictions yet</p>
            <p className="text-yellow-700 mt-2">
              Go to the <Link href="/" className="underline font-semibold">predictor</Link> and run a prediction to save it.
            </p>
          </div>
        )}

        {!loading && savedPredictions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List of predictions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-100 p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Predictions ({savedPredictions.length})</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {savedPredictions.map((pred) => (
                    <button
                      key={pred.id}
                      onClick={() => setSelectedId(pred.id)}
                      className={`w-full text-left p-4 transition ${
                        selectedId === pred.id
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">ID: {pred.id}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(pred.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                          Max: {Math.max(...pred.rainfall).toFixed(1)} mm
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Details panel */}
            <div className="lg:col-span-2">
              {selectedPrediction ? (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4">Prediction Details (ID: {selectedPrediction.id})</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(selectedPrediction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Max Rainfall (12h history)</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {Math.max(...selectedPrediction.rainfall).toFixed(2)} mm
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Initial Lake Level</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedPrediction.lake_level[0].toFixed(3)} m
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Final Lake Level (Hour 6)</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {selectedPrediction.prediction.hours[5]?.predicted_level_m.toFixed(3)} m
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 6-Hour Forecast Table */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4">6-Hour Forecast</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Hour</th>
                            <th className="px-4 py-3 text-left font-semibold">Level (m)</th>
                            <th className="px-4 py-3 text-left font-semibold">Warning</th>
                            <th className="px-4 py-3 text-left font-semibold">Flooded %</th>
                            <th className="px-4 py-3 text-left font-semibold">Max Depth</th>
                            <th className="px-4 py-3 text-left font-semibold">Mean Depth</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPrediction.prediction.hours.map((hour, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-semibold">{hour.hour}</td>
                              <td className="px-4 py-3">{hour.predicted_level_m.toFixed(3)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                                  style={{ backgroundColor: hour.warning_color }}
                                >
                                  {hour.warning_level}
                                </span>
                              </td>
                              <td className="px-4 py-3">{hour.flooded_land_pct.toFixed(1)}%</td>
                              <td className="px-4 py-3">{hour.max_depth_m.toFixed(2)} m</td>
                              <td className="px-4 py-3">{hour.mean_depth_m.toFixed(2)} m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Input Data */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4">Input Data (Past 12 Hours)</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-semibold">Rainfall (mm)</p>
                        <p className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200">
                          {selectedPrediction.rainfall.map(r => r.toFixed(2)).join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2 font-semibold">Lake Level (m)</p>
                        <p className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200">
                          {selectedPrediction.lake_level.map(l => l.toFixed(3)).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-600 text-lg">Select a prediction from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
