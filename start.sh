#!/bin/bash
set -e

echo "==> Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

echo "==> Starting backend..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000
