#!/bin/bash
set -e

fuser -k 5000/tcp 2>/dev/null || true

echo "==> Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

echo "==> Starting backend..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000
