#!/bin/bash
# JOBEZEE Hetzner Worker — one-shot setup script
# Run as root: bash setup.sh
set -e

REPO="https://github.com/zeeza18/JOBEZEE.git"
INSTALL_DIR="/opt/jobezee"
# Pass WORKER_SECRET as env var: WORKER_SECRET=your_secret bash setup.sh
WORKER_SECRET="${WORKER_SECRET:?ERROR: Set WORKER_SECRET env var before running setup.sh}"

echo "=== [1/7] System packages ==="
apt-get update -q
apt-get install -y -q git python3 python3-pip python3-venv wget curl xvfb

echo "=== [2/7] Install Google Chrome ==="
wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install -y -q /tmp/chrome.deb 2>/dev/null || apt-get install -y -q -f
rm -f /tmp/chrome.deb
google-chrome --version

echo "=== [3/7] Clone / update repo ==="
if [ -d "$INSTALL_DIR/.git" ]; then
    git -C "$INSTALL_DIR" pull --ff-only
else
    git clone "$REPO" "$INSTALL_DIR"
fi

echo "=== [4/7] Python virtualenv + deps ==="
python3 -m venv "$INSTALL_DIR/.venv"
"$INSTALL_DIR/.venv/bin/pip" install -q --upgrade pip
"$INSTALL_DIR/.venv/bin/pip" install -q -r "$INSTALL_DIR/worker/requirements.txt"
"$INSTALL_DIR/.venv/bin/pip" install -q -r "$INSTALL_DIR/backend/requirements.txt"
"$INSTALL_DIR/.venv/bin/pip" install -q -r "$INSTALL_DIR/linkedin/requirements.txt" 2>/dev/null || true

echo "=== [5/7] Write .env ==="
cat > "$INSTALL_DIR/worker/.env" <<EOF
WORKER_SECRET=${WORKER_SECRET}
EOF

echo "=== [6/7] Xvfb systemd service ==="
cat > /etc/systemd/system/xvfb.service <<'EOF'
[Unit]
Description=Xvfb virtual display :99
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "=== [7/7] Worker systemd service ==="
cat > /etc/systemd/system/jobezee-worker.service <<EOF
[Unit]
Description=JOBEZEE Hetzner Worker
After=network.target xvfb.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/worker
EnvironmentFile=${INSTALL_DIR}/worker/.env
ExecStart=${INSTALL_DIR}/.venv/bin/uvicorn worker:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xvfb jobezee-worker
systemctl restart xvfb
sleep 2
systemctl restart jobezee-worker
sleep 3

echo ""
echo "=== Done! ==="
systemctl status jobezee-worker --no-pager
echo ""
echo "Test: curl http://localhost:8001/health"
curl -s http://localhost:8001/health
