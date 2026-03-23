#!/usr/bin/env bash
set -e
echo "[XR Unicorn] Restarting dev server..."
pkill -f "vite" || true
npm run start
