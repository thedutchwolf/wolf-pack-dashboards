#!/bin/bash

# Wolf Pack Master Sync Daemon Starter
# 3-Way Real-Time Sync: Admin Dashboard ↔ Airtable ↔ Coaching Pipeline

SCRIPT_DIR="/Users/macmini/.openclaw/workspace/wolf-dashboards"
PID_FILE="/tmp/wolf-pack-master-sync.pid"
LOG_FILE="/tmp/wolf-pack-master-sync.log"

cd "$SCRIPT_DIR"

case "$1" in
    start)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "🐺 Master Sync Daemon is already running (PID: $PID)"
                exit 1
            else
                echo "🗑️ Removing stale PID file"
                rm -f "$PID_FILE"
            fi
        fi
        
        echo "🚀 Starting Wolf Pack Master Sync Daemon..."
        echo "📊 3-Way Sync: Admin Dashboard ↔ Airtable ↔ Coaching Pipeline"
        echo "📝 Log file: $LOG_FILE"
        
        nohup node master-sync-daemon.js >> "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        
        echo "✅ Master Sync Daemon started (PID: $(cat $PID_FILE))"
        echo "🔍 Monitor logs: tail -f $LOG_FILE"
        ;;
        
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "🛑 Stopping Master Sync Daemon (PID: $PID)..."
                kill "$PID"
                rm -f "$PID_FILE"
                echo "✅ Master Sync Daemon stopped"
            else
                echo "❌ Process not running"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ Master Sync Daemon is not running"
        fi
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "✅ Master Sync Daemon is running (PID: $PID)"
                echo "📊 Sync Status:"
                echo "   • Clients: Every 1 minute"
                echo "   • Closers: Every 30 seconds"  
                echo "   • Pipeline: Auto-sync (5 seconds)"
                echo ""
                echo "📝 Recent logs:"
                tail -5 "$LOG_FILE" 2>/dev/null || echo "   No logs yet"
            else
                echo "❌ Master Sync Daemon is not running (stale PID file)"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ Master Sync Daemon is not running"
        fi
        ;;
        
    logs)
        echo "📝 Master Sync Daemon Logs:"
        echo "=========================="
        tail -f "$LOG_FILE"
        ;;
        
    test)
        echo "🧪 Testing Master Sync..."
        node master-sync-daemon.js --test
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "🐺 Wolf Pack Master Sync Daemon"
        echo "================================"
        echo "Real-time synchronization between:"
        echo "  • Wolf Pack Admin Dashboard"
        echo "  • Airtable Coaching Pipeline" 
        echo "  • Ngrok Coaching Dashboard"
        echo ""
        echo "Commands:"
        echo "  start   - Start the sync daemon"
        echo "  stop    - Stop the sync daemon"
        echo "  restart - Restart the sync daemon"
        echo "  status  - Check daemon status"
        echo "  logs    - Follow live logs"
        echo "  test    - Run a test sync"
        exit 1
        ;;
esac