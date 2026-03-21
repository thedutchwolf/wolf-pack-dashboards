#!/bin/bash

# 🐺 WOLF PACK DASHBOARD AUTO-BACKUP SYSTEM
# Created by: Donnie for Melvin Lassooy
# Runs: Every 3 hours
# Purpose: Automated backup to GitHub + local archives

LOG_FILE="/Users/macmini/.openclaw/workspace/wolf-dashboards/backup.log"
BACKUP_DIR="/Users/macmini/.openclaw/workspace/wolf-dashboards"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
ARCHIVE_DIR="/Users/macmini/.openclaw/workspace/backups"

echo "🐺 [$TIMESTAMP] Starting Wolf Pack Dashboard Backup..." >> "$LOG_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

cd "$BACKUP_DIR"

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ [$TIMESTAMP] No changes detected, backup skipped" >> "$LOG_FILE"
else
    # Add all changes
    git add .
    
    # Create commit with timestamp and system status
    COMMIT_MSG="🐺 Automated Backup - $TIMESTAMP

⚡ SYSTEM STATUS:
$(ps aux | grep 'python.*8085' | grep -v grep | head -1 | awk '{print "✅ Dashboard Server: PID " $2}' || echo "❌ Dashboard Server: Not running")
$(curl -s -w "✅ Ngrok Status: %{http_code}" "https://aurelio-bountiful-pilar.ngrok-free.dev/" | tail -c 20 || echo "❌ Ngrok: Offline")

📊 BACKUP STATS:
- Files tracked: $(git ls-files | wc -l | tr -d ' ')
- Last commit: $(git log --oneline -1)
- Branch: $(git branch --show-current)

Wolf Pack Strong! 🐺💪"

    git commit -m "$COMMIT_MSG"
    
    # Try to push to GitHub (if remote is configured)
    if git remote get-url origin >/dev/null 2>&1; then
        if git push origin main; then
            echo "✅ [$TIMESTAMP] Backup pushed to GitHub successfully" >> "$LOG_FILE"
        else
            echo "❌ [$TIMESTAMP] GitHub push failed" >> "$LOG_FILE"
        fi
    else
        echo "⚠️  [$TIMESTAMP] No GitHub remote configured" >> "$LOG_FILE"
    fi
    
    echo "✅ [$TIMESTAMP] Git backup completed" >> "$LOG_FILE"
fi

# Create local archive backup
ARCHIVE_NAME="wolf-pack-dashboard-backup-$TIMESTAMP.tar.gz"
cd "/Users/macmini/.openclaw/workspace"
tar -czf "$ARCHIVE_DIR/$ARCHIVE_NAME" wolf-dashboards/ 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ [$TIMESTAMP] Local archive created: $ARCHIVE_NAME" >> "$LOG_FILE"
    
    # Keep only last 10 archives (cleanup)
    cd "$ARCHIVE_DIR"
    ls -t wolf-pack-dashboard-backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
else
    echo "❌ [$TIMESTAMP] Local archive failed" >> "$LOG_FILE"
fi

# Update memory with backup status
echo "📝 [$TIMESTAMP] Updating backup status in memory..." >> "$LOG_FILE"
cat > "/Users/macmini/.openclaw/workspace/memory/backup-status.json" << EOF
{
  "lastBackup": "$TIMESTAMP",
  "backupInterval": "3 hours",
  "status": "automated",
  "archiveLocation": "$ARCHIVE_DIR/$ARCHIVE_NAME",
  "gitStatus": "$(git status --porcelain | wc -l | tr -d ' ') files tracked",
  "nextBackup": "$(date -v+3H '+%Y-%m-%d %H:%M:%S')"
}
EOF

echo "🎯 [$TIMESTAMP] Wolf Pack backup completed!" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"