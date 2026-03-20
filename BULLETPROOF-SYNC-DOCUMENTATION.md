# 🛡️ BULLETPROOF Wolf Pack Sync System Documentation

## Overview

The Bulletproof Wolf Pack Sync System provides real-time, reliable synchronization between:
- **Wolf Pack Admin Dashboard** → Client and Closer data
- **Airtable Coaching Pipeline** → Student records and assignments  
- **Pipeline Dashboard** → Client dropdown sync

## 🎯 Key Features

### Real-Time Sync (10-30 seconds max delay)
- **Clients**: Every 15 seconds
- **Closers**: Every 10 seconds  
- **Health Checks**: Every 60 seconds
- **Assignments**: Every 20 seconds

### 🔧 Bulletproof Reliability
- **Exponential backoff retry logic**: 1s → 2s → 4s → 8s → 16s → 30s max
- **Rate limiting protection**: 100 Wolf Pack + 300 Airtable requests/min
- **Comprehensive error tracking**: Consecutive error alerting
- **Network error recovery**: Automatic retry on connection failures
- **State persistence**: Survives restarts and recovers from gaps

### 📊 Multi-Endpoint Monitoring  
- **API Health Tracking**: Response times and status monitoring
- **Performance Metrics**: Success rates, average sync times
- **Gap Detection**: Finds and fills missed syncs during downtime
- **Error Analysis**: Detailed error logging and reporting

### 💾 Persistent State Management
- **Processed Item Tracking**: Prevents duplicate processing
- **Sync Gap Recovery**: Detects missed items during downtime
- **Performance Metrics**: Long-term tracking of system health
- **Error History**: Maintains error patterns for analysis

## 📁 File Structure

```
wolf-dashboards/
├── bulletproof-sync-daemon.js       # Main sync daemon (enhanced)
├── start-bulletproof-sync.sh        # Daemon management script
├── test-bulletproof-sync.js         # Comprehensive testing suite
├── test-apis.js                     # API connectivity tests
├── BULLETPROOF-SYNC-DOCUMENTATION.md # This file
└── pipeline/index.html              # Dashboard with client dropdown

State & Log Files:
├── /tmp/bulletproof-sync-state.json        # Persistent sync state
├── /tmp/bulletproof-sync-performance.json  # Performance metrics
├── /tmp/bulletproof-sync.log              # Detailed logs
└── /tmp/bulletproof-sync.pid              # Process ID
```

## 🚀 Quick Start

### 1. Start the System
```bash
cd /Users/macmini/.openclaw/workspace/wolf-dashboards
./start-bulletproof-sync.sh start
```

### 2. Check Status
```bash
./start-bulletproof-sync.sh status
```

### 3. Monitor Logs
```bash
./start-bulletproof-sync.sh logs
```

### 4. Test APIs
```bash
./start-bulletproof-sync.sh test
```

## 📊 Management Commands

### Start/Stop/Restart
```bash
./start-bulletproof-sync.sh start      # Start daemon
./start-bulletproof-sync.sh stop       # Graceful stop
./start-bulletproof-sync.sh restart    # Restart daemon
```

### Monitoring
```bash
./start-bulletproof-sync.sh status     # Detailed status + metrics
./start-bulletproof-sync.sh logs       # Live log following
./start-bulletproof-sync.sh performance # Performance analysis
```

### Maintenance
```bash
./start-bulletproof-sync.sh reset      # Clear sync history (start fresh)
./start-bulletproof-sync.sh backup     # Backup current state
./start-bulletproof-sync.sh test       # Run API connectivity tests
```

## 🔧 Configuration

### API Endpoints
- **Wolf Pack API**: `https://wolfpack.thewolfpackgroup.com/api/v1`
- **Airtable Base**: `appFR2ovH2m5XN6I3`  
- **Airtable Table**: `Coaching Pipeline`
- **Pipeline Dashboard**: `https://aurelio-bountiful-pilar.ngrok-free.dev/pipeline/`

### Sync Intervals
```javascript
SYNC_INTERVALS: {
    clients: 15000,      // 15 seconds
    closers: 10000,      // 10 seconds 
    assignments: 20000,  // 20 seconds
    pipeline: 30000,     // 30 seconds
    healthCheck: 60000   // 60 seconds
}
```

### Error Handling
```javascript
RETRY_CONFIG: {
    maxRetries: 5,
    initialDelay: 1000,     // 1 second
    maxDelay: 30000,        // 30 seconds
    backoffFactor: 2        // Exponential backoff
}
```

### Rate Limits
```javascript
RATE_LIMITS: {
    wolfPackRequests: 100,  // Per minute
    airtableRequests: 300,  // Per minute  
    requestDelay: 100       // Minimum delay between requests (ms)
}
```

## 📈 Performance Monitoring

### Real-Time Metrics
- **Total Syncs**: Overall sync operations count
- **Success Rate**: Percentage of successful operations  
- **Average Sync Time**: Rolling average of sync durations
- **API Response Times**: Individual API performance

### Error Tracking
- **Consecutive Errors**: Alert threshold (5+ consecutive)
- **Error History**: Last 10 errors with timestamps
- **Recovery Tracking**: Automatic error counter reset on success

### Health Status
- **Wolf Pack API**: Status + response time
- **Airtable API**: Status + response time  
- **Pipeline Dashboard**: Status + response time

## 🔍 Troubleshooting

### Common Issues

#### 1. API Authentication Errors (401/403)
```bash
# Check if tokens are valid
curl -H "Authorization: Bearer <token>" "https://wolfpack.thewolfpackgroup.com/api/v1/client"
```

#### 2. Rate Limiting (429)
- System automatically handles with exponential backoff
- Check rate limit settings if persistent

#### 3. Network Connectivity Issues
- System auto-retries with increasing delays
- Check internet connection and DNS resolution

#### 4. High Consecutive Errors
```bash
# Check recent errors
./start-bulletproof-sync.sh performance

# View detailed logs
tail -50 /tmp/bulletproof-sync.log | grep "❌"
```

### Recovery Procedures

#### Reset Sync State
```bash
# Stop daemon
./start-bulletproof-sync.sh stop

# Reset all state (fresh start)
./start-bulletproof-sync.sh reset

# Start fresh
./start-bulletproof-sync.sh start
```

#### Backup Current State
```bash
# Create backup before changes
./start-bulletproof-sync.sh backup
```

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run all tests
node test-bulletproof-sync.js

# API connectivity only
node test-apis.js
```

### Test Categories
1. **API Connectivity**: Wolf Pack, Airtable, Pipeline
2. **Error Handling**: Rate limits, invalid tokens
3. **State Management**: Persistence, performance tracking
4. **Dashboard Integration**: Client dropdown structure
5. **System Integration**: Daemon control scripts

## 📊 Data Flow

### 1. Client Sync Flow
```
Wolf Pack Admin → New Clients Detected → Dashboard Client Dropdown Updated → Auto-Assignment to Students
```

### 2. Closer Sync Flow  
```
Wolf Pack Admin → New Closers Detected → User Details Retrieved → Airtable Record Created/Updated
```

### 3. Error Handling Flow
```
API Error → Exponential Backoff Retry → Success/Failure → Error Counter Update → Health Status Update
```

### 4. Gap Detection Flow
```
System Restart → Compare Last Sync Times → Detect Missing Items → Add to Gap Queue → Process Gaps
```

## 🛡️ Security & Best Practices

### API Token Security
- Tokens stored in configuration constants
- No hardcoded credentials in logs
- Rate limiting prevents abuse

### Error Handling
- Never exposes sensitive data in logs
- Graceful degradation on partial failures
- Comprehensive retry strategies

### State Management
- Atomic file operations for state persistence
- Backup creation before critical updates
- Recovery from corrupted state files

## 📋 Maintenance Schedule

### Daily
- Monitor sync success rates via status command
- Check for consecutive error alerts in logs

### Weekly  
- Review performance metrics trends
- Backup sync state and logs
- Test API connectivity

### Monthly
- Analyze error patterns for optimization
- Review and update rate limiting settings
- Performance tuning based on usage patterns

## 🚨 Alerts & Notifications

### Automatic Alerts
- **5+ Consecutive Errors**: Logged as ALERT level
- **API Health Degradation**: Response time/status tracking
- **Gap Detection**: Missing sync items found

### Manual Monitoring
```bash
# Check for alerts in logs
grep "🚨 ALERT" /tmp/bulletproof-sync.log

# Monitor error frequency  
grep "❌" /tmp/bulletproof-sync.log | tail -20
```

## 🔄 Version History

### v2.0 (Bulletproof Version)
- ✅ Real-time sync (10-30 second delays)
- ✅ Exponential backoff retry logic  
- ✅ Comprehensive error handling
- ✅ Rate limiting protection
- ✅ Performance monitoring
- ✅ Gap detection and recovery
- ✅ Health status tracking
- ✅ Enhanced logging system

### v1.0 (Original)
- Basic sync functionality
- 60-second intervals  
- Limited error handling

## 📞 Support

### Log Analysis
```bash
# Recent errors
tail -100 /tmp/bulletproof-sync.log | grep "❌\\|⚠️"

# Performance summary
./start-bulletproof-sync.sh performance

# Full system status
./start-bulletproof-sync.sh status
```

### Emergency Procedures
1. **Stop all sync operations**: `./start-bulletproof-sync.sh stop`
2. **Backup current state**: `./start-bulletproof-sync.sh backup`
3. **Reset if needed**: `./start-bulletproof-sync.sh reset`
4. **Restart fresh**: `./start-bulletproof-sync.sh start`

---

🛡️ **Built for bulletproof reliability with 10-30 second real-time sync, comprehensive error handling, and persistent state management.**