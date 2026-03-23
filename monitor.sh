#!/bin/bash

# Wolf Pack Dashboard Health Monitor
# Runs every 5 minutes via cron

LOG_FILE="/Users/macmini/.openclaw/workspace/wolf-dashboards/health.log"

echo "[$(date)] Health check starting..." >> "$LOG_FILE"

# Check dashboard server
if ! curl -s http://localhost:8085 > /dev/null; then
    echo "[$(date)] ❌ Dashboard server down - restarting..." >> "$LOG_FILE"
    launchctl stop com.wolfpack.dashboards
    sleep 2
    launchctl start com.wolfpack.dashboards
    echo "[$(date)] ✅ Dashboard server restarted" >> "$LOG_FILE"
else
    echo "[$(date)] ✅ Dashboard server healthy" >> "$LOG_FILE"
fi

# Check ngrok tunnel
if ! curl -s "https://aurelio-bountiful-pilar.ngrok-free.dev/" > /dev/null; then
    echo "[$(date)] ❌ Ngrok tunnel down - restarting..." >> "$LOG_FILE"
    launchctl stop com.wolfpack.ngrok
    sleep 3
    launchctl start com.wolfpack.ngrok
    echo "[$(date)] ✅ Ngrok tunnel restarted" >> "$LOG_FILE"
else
    echo "[$(date)] ✅ Ngrok tunnel healthy" >> "$LOG_FILE"
fi

echo "[$(date)] Health check complete" >> "$LOG_FILE"