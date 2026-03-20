#!/bin/bash

# 🛡️ Bulletproof Wolf Pack Master Sync Daemon
# Enhanced reliability with comprehensive monitoring and error handling

SCRIPT_DIR="/Users/macmini/.openclaw/workspace/wolf-dashboards"
PID_FILE="/tmp/bulletproof-sync.pid"
LOG_FILE="/tmp/bulletproof-sync.log"
PERFORMANCE_FILE="/tmp/bulletproof-sync-performance.json"
STATE_FILE="/tmp/bulletproof-sync-state.json"

cd "$SCRIPT_DIR"

# Colors for better output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
NC='\\033[0m' # No Color

print_header() {
    echo -e "${BLUE}🛡️ BULLETPROOF Wolf Pack Sync Daemon${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_status() {
    local status="$1"
    local message="$2"
    case "$status" in
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "info") echo -e "${BLUE}📋 $message${NC}" ;;
    esac
}

check_dependencies() {
    if ! command -v node &> /dev/null; then
        print_status "error" "Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    if [ ! -f "bulletproof-sync-daemon.js" ]; then
        print_status "error" "bulletproof-sync-daemon.js not found in current directory"
        exit 1
    fi
}

get_performance_stats() {
    if [ -f "$PERFORMANCE_FILE" ]; then
        node -e "
            try {
                const stats = JSON.parse(require('fs').readFileSync('$PERFORMANCE_FILE', 'utf8'));
                console.log('📈 Performance Stats:');
                console.log('   Total Syncs: ' + stats.totalSyncs);
                console.log('   Success Rate: ' + Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) + '%');
                console.log('   Avg Sync Time: ' + Math.round(stats.avgSyncTime) + 'ms');
                console.log('   Last Sync: ' + stats.lastSyncDuration + 'ms');
            } catch(e) {
                console.log('📈 Performance Stats: Not available');
            }
        " 2>/dev/null || echo "📈 Performance Stats: Not available"
    fi
}

get_sync_state() {
    if [ -f "$STATE_FILE" ]; then
        node -e "
            try {
                const state = JSON.parse(require('fs').readFileSync('$STATE_FILE', 'utf8'));
                console.log('💾 Sync State:');
                console.log('   Processed Clients: ' + state.processedClients.length);
                console.log('   Processed Closers: ' + state.processedClosers.length);
                console.log('   Total Errors: ' + state.errors.total);
                console.log('   Consecutive Errors: ' + state.errors.consecutive);
                
                const apis = state.apiHealth;
                console.log('🏥 API Health:');
                for (const api in apis) {
                    const status = apis[api].status === 'healthy' ? '✅' : '❌';
                    const responseTime = apis[api].responseTime || 0;
                    console.log('   ' + api + ': ' + status + ' (' + responseTime + 'ms)');
                }
            } catch(e) {
                console.log('💾 Sync State: Not available');
            }
        " 2>/dev/null || echo "💾 Sync State: Not available"
    fi
}

case "$1" in
    start)
        print_header
        check_dependencies
        
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                print_status "error" "Bulletproof Sync Daemon is already running (PID: $PID)"
                exit 1
            else
                print_status "warning" "Removing stale PID file"
                rm -f "$PID_FILE"
            fi
        fi
        
        print_status "info" "Starting Bulletproof Wolf Pack Sync Daemon..."
        print_status "info" "🎯 Real-time sync with 10-30 second delays"
        print_status "info" "🔧 Enhanced error handling with exponential backoff"
        print_status "info" "📊 Multi-endpoint monitoring and health checks"
        print_status "info" "💾 Persistent state management with gap detection"
        print_status "info" "📝 Log file: $LOG_FILE"
        
        # Start the daemon
        nohup node bulletproof-sync-daemon.js >> "$LOG_FILE" 2>&1 &
        DAEMON_PID=$!
        echo $DAEMON_PID > "$PID_FILE"
        
        # Wait a moment and check if it started successfully
        sleep 2
        if kill -0 "$DAEMON_PID" 2>/dev/null; then
            print_status "success" "Bulletproof Sync Daemon started successfully (PID: $DAEMON_PID)"
            print_status "info" "🔍 Monitor logs: tail -f $LOG_FILE"
            print_status "info" "📊 Check status: $0 status"
        else
            print_status "error" "Failed to start daemon. Check logs: tail $LOG_FILE"
            rm -f "$PID_FILE"
            exit 1
        fi
        ;;
        
    stop)
        print_header
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                print_status "warning" "Stopping Bulletproof Sync Daemon (PID: $PID)..."
                kill "$PID"
                
                # Wait for graceful shutdown
                for i in {1..10}; do
                    if ! kill -0 "$PID" 2>/dev/null; then
                        break
                    fi
                    sleep 1
                done
                
                # Force kill if still running
                if kill -0 "$PID" 2>/dev/null; then
                    print_status "warning" "Force killing daemon..."
                    kill -9 "$PID"
                fi
                
                rm -f "$PID_FILE"
                print_status "success" "Bulletproof Sync Daemon stopped"
                get_performance_stats
            else
                print_status "error" "Process not running"
                rm -f "$PID_FILE"
            fi
        else
            print_status "error" "Bulletproof Sync Daemon is not running"
        fi
        ;;
        
    restart)
        print_status "info" "Restarting Bulletproof Sync Daemon..."
        $0 stop
        sleep 3
        $0 start
        ;;
        
    status)
        print_header
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                print_status "success" "Bulletproof Sync Daemon is running (PID: $PID)"
                
                echo ""
                get_sync_state
                echo ""
                get_performance_stats
                
                echo ""
                print_status "info" "🔄 Active Sync Intervals:"
                print_status "info" "   Clients: Every 15 seconds"
                print_status "info" "   Closers: Every 10 seconds"
                print_status "info" "   Health Check: Every 60 seconds"
                
                echo ""
                print_status "info" "📝 Recent logs (last 10 lines):"
                if [ -f "$LOG_FILE" ]; then
                    tail -10 "$LOG_FILE" | sed 's/^/   /'
                else
                    print_status "warning" "   No logs yet"
                fi
            else
                print_status "error" "Bulletproof Sync Daemon is not running (stale PID file)"
                rm -f "$PID_FILE"
            fi
        else
            print_status "error" "Bulletproof Sync Daemon is not running"
        fi
        ;;
        
    logs)
        print_header
        print_status "info" "📝 Following Bulletproof Sync Daemon logs..."
        print_status "info" "Press Ctrl+C to stop following logs"
        echo ""
        tail -f "$LOG_FILE"
        ;;
        
    test)
        print_header
        print_status "info" "🧪 Running API connectivity test..."
        node test-apis.js
        ;;
        
    performance)
        print_header
        get_performance_stats
        echo ""
        if [ -f "$LOG_FILE" ]; then
            print_status "info" "📈 Error analysis (last 50 lines):"
            grep "❌\\|⚠️" "$LOG_FILE" | tail -10 | sed 's/^/   /'
        fi
        ;;
        
    reset)
        print_header
        print_status "warning" "🔄 Resetting sync state and performance data..."
        read -p "Are you sure? This will clear all sync history. (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $0 stop 2>/dev/null
            rm -f "$STATE_FILE" "$PERFORMANCE_FILE"
            print_status "success" "Reset complete. You can now start fresh with: $0 start"
        else
            print_status "info" "Reset cancelled"
        fi
        ;;
        
    backup)
        print_header
        BACKUP_DIR="/tmp/bulletproof-sync-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Copy current files
        [ -f "$STATE_FILE" ] && cp "$STATE_FILE" "$BACKUP_DIR/"
        [ -f "$PERFORMANCE_FILE" ] && cp "$PERFORMANCE_FILE" "$BACKUP_DIR/"
        [ -f "$LOG_FILE" ] && cp "$LOG_FILE" "$BACKUP_DIR/"
        
        print_status "success" "Backup created: $BACKUP_DIR"
        ls -la "$BACKUP_DIR"
        ;;
        
    *)
        print_header
        echo -e "${PURPLE}Usage: $0 {start|stop|restart|status|logs|test|performance|reset|backup}${NC}"
        echo ""
        echo -e "${BLUE}🛡️ Bulletproof Wolf Pack Sync Daemon Commands:${NC}"
        echo -e "${GREEN}  start       ${NC}- Start the bulletproof sync daemon"
        echo -e "${GREEN}  stop        ${NC}- Stop the sync daemon gracefully"
        echo -e "${GREEN}  restart     ${NC}- Restart the sync daemon"
        echo -e "${GREEN}  status      ${NC}- Show detailed daemon status and metrics"
        echo -e "${GREEN}  logs        ${NC}- Follow live logs in real-time"
        echo -e "${GREEN}  test        ${NC}- Test API connectivity"
        echo -e "${GREEN}  performance ${NC}- Show performance metrics and error analysis"
        echo -e "${GREEN}  reset       ${NC}- Reset sync state (start fresh)"
        echo -e "${GREEN}  backup      ${NC}- Backup current sync state and logs"
        echo ""
        echo -e "${BLUE}🎯 Features:${NC}"
        echo -e "   • Real-time sync (10-30 second delays)"
        echo -e "   • Exponential backoff retry logic"
        echo -e "   • Rate limiting protection"
        echo -e "   • Comprehensive error tracking"
        echo -e "   • API health monitoring"
        echo -e "   • Sync gap detection and recovery"
        echo -e "   • Performance metrics tracking"
        echo -e "   • Graceful shutdown handling"
        exit 1
        ;;
esac