# Student Performance Analytics System

EduAnalytics — web-based student performance predictor and class analytics dashboard.

## Overview

This repository contains a Flask backend (in `backend/`) that trains a Decision Tree model on `backend/dataset.csv` and an interactive frontend (in `frontend/`) that consumes the backend APIs. The app trains the model at startup and writes results to the `outputs/` directory (for example `accuracy.txt` and `confusion_matrix.png`).

## Features

- Single-student predictions with improvement suggestions (POST `/predict`)
- Class-level analytics and top-performers (GET `/class-analytics`)
- Attendance vs final-marks correlation data (GET `/correlations`)
- Simple, responsive frontend UI (Chart.js) and API-driven architecture

## Project Structure

- `backend/` — Flask API, training code, and the dataset
	- `app.py` — Flask app and routes
	- `model.py` — training + helpers (exports `train_model`, analytics helpers)
	- `dataset.csv` — training dataset used by the model
	- `requirements.txt` — Python dependencies
- `frontend/` — static site (HTML/CSS/JS) that calls the backend
	- `index.html`, `script.js`, `style.css`
- `outputs/` — generated artifacts (`accuracy.txt`, `confusion_matrix.png`)

## Quickstart (Windows)

1. Open a terminal and create a virtual environment:

```bash
cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Run the backend (will train the model on startup and serve the frontend):

```bash
python app.py
```

3. Open your browser at:

```
http://127.0.0.1:5000
```

The Flask server serves the frontend statically and exposes the API endpoints used by the UI.

## Quickstart (macOS / Linux)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

## API (examples)

- POST `/predict`

	- Required JSON fields:
		- `attendance` (number, 0–100)
		- `study_hours` (number, >=0)
		- `internal_marks` (number, 0–100)
		- `assignment_score` (number, 0–100)
		- `final_marks` (number, 0–100)

	- Example curl:

	```bash
	curl -X POST http://127.0.0.1:5000/predict \\
		-H "Content-Type: application/json" \\
		-d '{"attendance":85,"study_hours":3,"internal_marks":70,"assignment_score":80,"final_marks":78}'
	```

	- Response: JSON including `prediction`, `accuracy_percent`, `feature_importances`, and `suggestions`.

- GET `/class-analytics` — returns class summary, toppers, and weak-students list used by the frontend.
- GET `/correlations` — returns attendance vs final-marks points for the scatter plot.

## Dataset

Place or update `backend/dataset.csv` to retrain the model. The code expects columns such as:
`Student_ID, Name, Attendance, Study_Hours, Internal_Marks, Assignment_Score, Final_Marks, Result` and subject columns used for summaries.

## Outputs

Training and analytics create artifacts inside the `outputs/` directory:
- `outputs/accuracy.txt` — model accuracy
- `outputs/confusion_matrix.png` — confusion matrix image

## Troubleshooting

- If the frontend shows "Cannot reach Flask server": make sure the backend is running (see Quickstart) and that `frontend/script.js` points to `http://127.0.0.1:5000` (the `API` constant).
- If dependency installation fails, try upgrading pip: `python -m pip install --upgrade pip`.

## Development

- To retrain the model interactively:

```bash
cd backend
python -c "from model import train_model; train_model()"
```

If you'd like, I can further tailor this README (add badges, screenshots, or detailed API examples).
