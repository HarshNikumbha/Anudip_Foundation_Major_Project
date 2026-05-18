import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from model import (
    train_model,
    get_improvement_suggestions,
    get_class_analytics,
    get_correlation_data
)
import numpy as np

# Point static folder to the frontend directory
frontend_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
CORS(app)

# Train once at startup
model, accuracy, importances, df = train_model()


@app.route("/")
def home():
    return send_from_directory(app.static_folder, 'index.html')


@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    required = ["attendance", "study_hours", "internal_marks", "assignment_score", "final_marks"]
    for key in required:
        if key not in data:
            return jsonify({"error": f"Missing field: {key}"}), 400

    try:
        att   = float(data["attendance"])
        study = float(data["study_hours"])
        inter = float(data["internal_marks"])
        assign = float(data["assignment_score"])
        final = float(data["final_marks"])
    except (ValueError, TypeError):
        return jsonify({"error": "All fields must be numbers"}), 400

    # Range validation
    if not (0 <= att <= 100): return jsonify({"error": "Attendance must be 0-100"}), 400
    if not (0 <= inter <= 100): return jsonify({"error": "Internal Marks must be 0-100"}), 400
    if not (0 <= assign <= 100): return jsonify({"error": "Assignment Score must be 0-100"}), 400
    if not (0 <= final <= 100): return jsonify({"error": "Final Marks must be 0-100"}), 400
    if study < 0: return jsonify({"error": "Study Hours cannot be negative"}), 400

    features = np.array([[att, study, inter, assign, final]])
    prediction = model.predict(features)[0]
    suggestions = get_improvement_suggestions(att, study, inter, assign, final)

    return jsonify({
        "prediction": str(prediction),
        "accuracy": round(float(accuracy), 4),
        "accuracy_percent": round(float(accuracy) * 100, 2),
        "feature_importances": importances,
        "suggestions": suggestions
    })


@app.route("/class-analytics", methods=["GET"])
def class_analytics():
    return jsonify(get_class_analytics())


@app.route("/correlations", methods=["GET"])
def correlations():
    return jsonify(get_correlation_data())


if __name__ == "__main__":
    app.run(debug=True)