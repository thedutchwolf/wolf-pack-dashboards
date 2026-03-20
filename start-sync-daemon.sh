#!/bin/bash

# Wolf Pack API Sync Daemon
# Runs every 5 minutes to sync new closers from Wolf Pack API to Airtable

SCRIPT_DIR="/Users/macmini/.openclaw/workspace/wolf-dashboards"
LOG_FILE="/tmp/wolf-pack-sync.log"

echo "🐺 Starting Wolf Pack API Sync Daemon..."
echo "📅 Started at: $(date)" >> "$LOG_FILE"

# Function to run sync
run_sync() {
    echo "🔄 Running sync at $(date)" >> "$LOG_FILE"
    cd "$SCRIPT_DIR"
    node api-sync-bridge.js >> "$LOG_FILE" 2>&1
    echo "✅ Sync completed at $(date)" >> "$LOG_FILE"
    echo "---" >> "$LOG_FILE"
}

# Run initial sync
run_sync

# Run every 5 minutes
while true; do
    sleep 300  # 5 minutes
    run_sync
done