#!/bin/bash

# Slack Gateway Health Monitor
# Monitors both OpenClaw gateway and Slack webhook tunnel

LOG_FILE="/Users/macmini/.openclaw/workspace/wolf-dashboards/slack-health.log"

echo "[$(date)] Slack gateway health check..." >> "$LOG_FILE"

# Check OpenClaw gateway
if ! curl -s http://localhost:18789/health > /dev/null; then
    echo "[$(date)] ❌ OpenClaw gateway down - restarting..." >> "$LOG_FILE"
    openclaw gateway restart
    sleep 10
    echo "[$(date)] ✅ OpenClaw gateway restarted" >> "$LOG_FILE"
else
    echo "[$(date)] ✅ OpenClaw gateway healthy" >> "$LOG_FILE"
fi

# Check Slack webhook tunnel (using alternative tunnel for Slack)
SLACK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if '18789' in tunnel['config']['addr']:
            print(tunnel['public_url'])
            break
except: pass
" 2>/dev/null)

if [ ! -z "$SLACK_URL" ]; then
    if ! curl -s "${SLACK_URL}/health" > /dev/null; then
        echo "[$(date)] ❌ Slack tunnel down - restarting..." >> "$LOG_FILE"
        launchctl stop com.wolfpack.slack-tunnel
        sleep 3
        launchctl start com.wolfpack.slack-tunnel
        echo "[$(date)] ✅ Slack tunnel restarted" >> "$LOG_FILE"
    else
        echo "[$(date)] ✅ Slack tunnel healthy: $SLACK_URL" >> "$LOG_FILE"
    fi
else
    echo "[$(date)] ⚠️ No Slack tunnel found - starting..." >> "$LOG_FILE"
    launchctl start com.wolfpack.slack-tunnel
fi

echo "[$(date)] Slack health check complete" >> "$LOG_FILE"