from flask import Flask, jsonify, request
from flask_cors import CORS
import base64

app = Flask(__name__)
CORS(app)

TRANSPARENT_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
)

@app.route('/predict', methods=['POST'])
def predict():
    payload = request.get_json(force=True)
    rainfall = payload.get('rainfall')
    lake_level = payload.get('lake_level')

    if not isinstance(rainfall, list) or not isinstance(lake_level, list):
        return jsonify({'error': 'rainfall and lake_level must be arrays'}), 400

    if len(rainfall) != 12 or len(lake_level) != 12:
        return jsonify({'error': 'rainfall and lake_level must contain exactly 12 values'}), 400

    base_level = lake_level[-1]
    thresholds = {
        'normal': 0.60,
        'alert': 0.70,
        'alarm': 0.80,
        'critical': 0.90,
    }

    hours = []
    for i in range(6):
        level = round(base_level + 0.01 * (i + 1) + (rainfall[6 + i] if i + 6 < len(rainfall) else 0) * 0.001, 3)
        flooded = max(0.0, min(100.0, (level - thresholds['alert']) * 150))
        max_depth = round(max(0.0, (level - 0.5) * 2.0), 3)
        warning_level = 'NORMAL'
        warning_color = '#22c55e'

        if level >= thresholds['critical']:
            warning_level = 'CRITICAL'
            warning_color = '#dc2626'
        elif level >= thresholds['alarm']:
            warning_level = 'ALARM'
            warning_color = '#f97316'
        elif level >= thresholds['alert']:
            warning_level = 'ALERT'
            warning_color = '#f59e0b'

        hours.append({
            'hour': i + 1,
            'predicted_level_m': level,
            'warning_level': warning_level,
            'warning_color': warning_color,
            'overflowing': level >= thresholds['alert'],
            'flooded_land_pct': round(min(100.0, flooded), 1),
            'max_depth_m': max_depth,
            'mean_depth_m': round(max_depth * 0.45, 3),
            'flood_depth_png': TRANSPARENT_PNG_BASE64,
            'flood_extent_png': TRANSPARENT_PNG_BASE64,
        })

    response = {
        'hours': hours,
        'bounds': {
            'south': 13.38,
            'west': 123.40,
            'north': 13.50,
            'east': 123.60,
        },
        'dem_png': TRANSPARENT_PNG_BASE64,
        'lake_png': TRANSPARENT_PNG_BASE64,
        'thresholds': thresholds,
    }

    return jsonify(response)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
