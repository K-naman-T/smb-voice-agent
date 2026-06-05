#!/bin/bash
set -e
echo "[SMB Voice Agent] Starting..."

cd "$(dirname "$0")"

# Install Python deps
echo "[1/4] Python deps..."
cd api
pip install -r requirements.txt -q
cd ..

# Install frontend deps
echo "[2/4] Frontend deps..."
cd web
npm install 2>/dev/null || true
cd ..

# Create audio dir
mkdir -p /tmp/smb_voice_audio

# Start backend
echo "[3/4] Starting FastAPI backend on port 8000..."
cd api
python3 main.py > /tmp/smb_backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "[4/4] Starting frontend on port 5173..."
cd web
npm run dev > /tmp/smb_frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "SMB Voice Agent running!"
echo "=========================================="
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  tail -f /tmp/smb_backend.log"
echo "  tail -f /tmp/smb_frontend.log"
echo "=========================================="
