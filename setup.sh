#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SMB Voice Agent — Setup & Launch Script
# Run this on your server (or chomp) after configuring .env
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "============================================"
echo "SMB Voice Agent — Setup & Launch"
echo "============================================"

# ── Detect environment ──────────────────────────────────────────────────────
if command -v ngrok &> /dev/null; then
    echo "✓ ngrok found"
    NGROK_BIN="ngrok"
elif [ -f "$HOME/ngrok" ]; then
    echo "✓ ngrok found at ~/ngrok"
    NGROK_BIN="$HOME/ngrok"
else
    echo "✗ ngrok not found. Installing..."
    if command -v unzip &> /dev/null; then
        curl -s https://bin.equinox.io/c/4VmDzA7iaH/ngrok-stable-linux-amd64.zip -o /tmp/ngrok.zip
        unzip -q /tmp/ngrok.zip -d ~/ngrok-install
        NGROK_BIN="$HOME/ngrok-install/ngrok"
    else
        echo "ERROR: unzip not found. Please install unzip first."
        exit 1
    fi
fi

# ── Check Python / pip ─────────────────────────────────────────────────────
if command -v python3 &> /dev/null; then
    echo "✓ python3 found: $(python3 --version)"
else
    echo "ERROR: python3 not found"
    exit 1
fi

# ── Check npm ───────────────────────────────────────────────────────────────
if command -v npm &> /dev/null; then
    echo "✓ npm found: $(npm --version)"
else
    echo "WARNING: npm not found. Frontend dev server won't be available."
fi

# ── Load env vars ───────────────────────────────────────────────────────────
ENV_FILE="$HOME/projects/smb-voice-agent/.env"
if [ -f "$ENV_FILE" ]; then
    echo "✓ Loading env from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "WARNING: .env not found at $ENV_FILE"
    echo "Creating template..."
    cat > "$ENV_FILE" << 'EOF'
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# AI Services
SARVAM_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxx
MINIMAX_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Business
INDUSTRY=hvac
DB_PATH=voice_agent.db
EOF
    echo "Created template .env at $ENV_FILE — FILL IN YOUR KEYS"
fi

# ── Install Python deps ─────────────────────────────────────────────────────
echo ""
echo "Installing Python dependencies..."
cd "$(dirname "$0")/api"
pip install -q -r requirements.txt 2>/dev/null || pip3 install -q -r requirements.txt
echo "✓ Python deps installed"

# ── Start ngrok ──────────────────────────────────────────────────────────────
echo ""
echo "Starting ngrok tunnel to port 8000..."
$NGROK_BIN http 8000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "✓ ngrok PID: $NGROK_PID"

# Wait for ngrok to be ready
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null || echo "")

if [ -z "$NGROK_URL" ]; then
    echo "WARNING: Could not get ngrok URL. Check /tmp/ngrok.log"
else
    echo "✓ ngrok tunnel: $NGROK_URL"
    echo ""
    echo "============================================"
    echo "TWILIO WEBHOOK URL:"
    echo "  $NGROK_URL/webhook/twilio"
    echo ""
    echo "STATUS CALLBACK URL:"
    echo "  $NGROK_URL/webhook/twilio/status"
    echo "============================================"
fi

# ── Start FastAPI backend ───────────────────────────────────────────────────
echo ""
echo "Starting FastAPI backend..."
cd "$(dirname "$0")/api"
python3 main.py &
API_PID=$!
echo "✓ API PID: $API_PID"

# ── Start frontend dev server ───────────────────────────────────────────────
if command -v npm &> /dev/null && [ -d "../web" ]; then
    echo ""
    echo "Starting React dev server..."
    cd "$(dirname "$0")/web"
    npm run dev &
    WEB_PID=$!
    echo "✓ Frontend PID: $WEB_PID"
fi

echo ""
echo "============================================"
echo "All services started."
echo "Dashboard: http://localhost:5173"
echo "API:       http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
if [ -n "$NGROK_URL" ]; then
    echo "Webhook:   $NGROK_URL/webhook/twilio"
fi
echo "============================================"
echo ""
echo "PIDs: ngrok=$NGROK_PID api=$API_PID" ${WEB_PID:+"web=$WEB_PID"}
echo "Logs: /tmp/ngrok.log"
echo ""
echo "To stop: kill $NGROK_PID $API_PID" ${WEB_PID:+"$WEB_PID"}
