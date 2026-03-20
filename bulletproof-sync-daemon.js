#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF Wolf Pack Master Sync Daemon
 * 
 * Real-time synchronization with bulletproof reliability:
 * 1. Wolf Pack Admin Dashboard ↔ Airtable ↔ Coaching Pipeline
 * 
 * Features:
 * - 🎯 Real-time sync (10-30 seconds max delay)
 * - 🔧 Robust error handling with exponential backoff
 * - 📊 Multi-endpoint monitoring with health checks
 * - 💾 Persistent state management with gap detection
 * - 🔄 Multiple retry strategies
 * - 📈 Performance monitoring and reporting
 * - 🚨 Comprehensive logging and alerting
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
const CONFIG = {
    WOLF_PACK_API: {
        baseURL: 'https://wolfpack.thewolfpackgroup.com/api/v1',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1lbHZpbkB0aGV3b2xmcGFja2dyb3VwLmNvbSIsInJvbGUiOiJBRE1JTiIsImlkIjoiNjhkOGNiNjA2ZjkzMTBiZGViOGU4OWM1IiwiaWF0IjoxNzYzOTc4Njg4LCJleHAiOjQ5MTk3Mzg2ODh9.jNIeVQxj3xx3P-txsQX0u1EjCLaOcaMuSCVkG-xzg5c'
    },
    
    AIRTABLE_API: {
        token: 'patgj5c0XFB8kEmu7.86405981a4f0fece4f8005ccfb766df980004bbc030bac0c90e221cc6f97fc68',
        base: 'appFR2ovH2m5XN6I3',
        table: 'Coaching Pipeline'
    },
    
    PIPELINE_URL: 'https://aurelio-bountiful-pilar.ngrok-free.dev/pipeline/',
    
    // 🎯 REAL-TIME SYNC INTERVALS (10-30 seconds max delay)
    SYNC_INTERVALS: {
        clients: 15000,      // Check for new clients every 15 seconds
        closers: 10000,      // Check for new closers every 10 seconds 
        assignments: 20000,  // Check assignments every 20 seconds
        pipeline: 30000,     // Pipeline health check every 30 seconds
        healthCheck: 60000   // Overall health check every 1 minute
    },
    
    // 🔧 ROBUST ERROR HANDLING
    RETRY_CONFIG: {
        maxRetries: 5,
        initialDelay: 1000,     // 1 second
        maxDelay: 30000,        // 30 seconds
        backoffFactor: 2        // Exponential backoff
    },
    
    // Rate limiting
    RATE_LIMITS: {
        wolfPackRequests: 100,  // Requests per minute
        airtableRequests: 300,  // Requests per minute  
        requestDelay: 100       // Minimum delay between requests (ms)
    },
    
    // File paths
    STATE_FILE: '/tmp/bulletproof-sync-state.json',
    LOG_FILE: '/tmp/bulletproof-sync.log',
    PERFORMANCE_FILE: '/tmp/bulletproof-sync-performance.json'
};

// ===== GLOBAL STATE =====
let syncState = {
    // 💾 PERSISTENT STATE MANAGEMENT
    lastClientSync: 0,
    lastCloserSync: 0,
    lastAssignmentSync: 0,
    lastHealthCheck: 0,
    
    // Track processed items to avoid duplicates
    processedClients: [],
    processedClosers: [], 
    processedAssignments: [],
    
    // Sync gaps detection
    syncGaps: {
        clients: [],
        closers: [],
        assignments: []
    },
    
    // Performance metrics
    performance: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        avgSyncTime: 0,
        lastSyncDuration: 0
    },
    
    // Error tracking
    errors: {
        consecutive: 0,
        total: 0,
        lastError: null,
        errorHistory: []
    },
    
    // API health status
    apiHealth: {
        wolfPack: { status: 'unknown', lastCheck: 0, responseTime: 0 },
        airtable: { status: 'unknown', lastCheck: 0, responseTime: 0 },
        pipeline: { status: 'unknown', lastCheck: 0, responseTime: 0 }
    }
};

// Rate limiting tracking
const rateLimiters = {
    wolfPack: { requests: [], lastReset: Date.now() },
    airtable: { requests: [], lastReset: Date.now() }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Enhanced HTTP request with retry logic and error handling
 */
function makeRequestWithRetry(url, options = {}, retryCount = 0) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(data),
                        responseTime,
                        retryCount
                    };
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(result);
                    } else if (res.statusCode === 429 && retryCount < CONFIG.RETRY_CONFIG.maxRetries) {
                        // Rate limited - retry with exponential backoff
                        const delay = Math.min(
                            CONFIG.RETRY_CONFIG.initialDelay * Math.pow(CONFIG.RETRY_CONFIG.backoffFactor, retryCount),
                            CONFIG.RETRY_CONFIG.maxDelay
                        );
                        
                        log(`🔄 Rate limited (${res.statusCode}), retrying in ${delay}ms (attempt ${retryCount + 1}/${CONFIG.RETRY_CONFIG.maxRetries})`, 'WARNING');
                        
                        setTimeout(() => {
                            makeRequestWithRetry(url, options, retryCount + 1)
                                .then(resolve)
                                .catch(reject);
                        }, delay);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data,
                            responseTime,
                            retryCount
                        });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                }
            });
        });
        
        req.on('error', (error) => {
            if (retryCount < CONFIG.RETRY_CONFIG.maxRetries) {
                const delay = Math.min(
                    CONFIG.RETRY_CONFIG.initialDelay * Math.pow(CONFIG.RETRY_CONFIG.backoffFactor, retryCount),
                    CONFIG.RETRY_CONFIG.maxDelay
                );
                
                log(`🔄 Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${CONFIG.RETRY_CONFIG.maxRetries}): ${error.message}`, 'WARNING');
                
                setTimeout(() => {
                    makeRequestWithRetry(url, options, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                }, delay);
            } else {
                reject(error);
            }
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

/**
 * Check rate limits before making requests
 */
function checkRateLimit(service) {
    const now = Date.now();
    const limiter = rateLimiters[service];
    
    // Reset counter every minute
    if (now - limiter.lastReset > 60000) {
        limiter.requests = [];
        limiter.lastReset = now;
    }
    
    const limit = CONFIG.RATE_LIMITS[service + 'Requests'];
    if (limiter.requests.length >= limit) {
        throw new Error(`Rate limit exceeded for ${service}: ${limiter.requests.length}/${limit} requests per minute`);
    }
    
    limiter.requests.push(now);
    return true;
}

/**
 * Enhanced logging with log levels and file output
 */
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': '📋',
        'SUCCESS': '✅', 
        'WARNING': '⚠️',
        'ERROR': '❌',
        'SYNC': '🔄',
        'PERF': '📈',
        'HEALTH': '🏥'
    }[level] || '📋';
    
    const logEntry = `[${timestamp}] ${emoji} ${message}`;
    console.log(logEntry);
    
    // Write to log file
    try {
        fs.appendFileSync(CONFIG.LOG_FILE, logEntry + '\\n');
    } catch (e) {
        // Silently fail to avoid infinite loops
    }
}

/**
 * Track performance metrics
 */
function trackPerformance(operation, duration, success = true) {
    syncState.performance.totalSyncs++;
    if (success) {
        syncState.performance.successfulSyncs++;
    } else {
        syncState.performance.failedSyncs++;
    }
    
    syncState.performance.lastSyncDuration = duration;
    
    // Calculate rolling average
    const total = syncState.performance.successfulSyncs + syncState.performance.failedSyncs;
    syncState.performance.avgSyncTime = (
        (syncState.performance.avgSyncTime * (total - 1) + duration) / total
    );
    
    // Log performance every 10 operations
    if (syncState.performance.totalSyncs % 10 === 0) {
        log(`📈 Performance: ${syncState.performance.successfulSyncs}/${syncState.performance.totalSyncs} successful, avg ${Math.round(syncState.performance.avgSyncTime)}ms`, 'PERF');
    }
    
    // Save performance metrics
    try {
        fs.writeFileSync(CONFIG.PERFORMANCE_FILE, JSON.stringify(syncState.performance, null, 2));
    } catch (e) {
        log(`Warning: Could not save performance metrics: ${e.message}`, 'WARNING');
    }
}

/**
 * Track and handle errors
 */
function handleError(error, operation) {
    syncState.errors.total++;
    syncState.errors.consecutive++;
    syncState.errors.lastError = {
        message: error.message,
        operation,
        timestamp: Date.now()
    };
    
    // Add to error history (keep last 10)
    syncState.errors.errorHistory.unshift({
        message: error.message,
        operation,
        timestamp: Date.now()
    });
    
    if (syncState.errors.errorHistory.length > 10) {
        syncState.errors.errorHistory = syncState.errors.errorHistory.slice(0, 10);
    }
    
    log(`❌ Error in ${operation}: ${error.message}`, 'ERROR');
    
    // Log alert if too many consecutive errors
    if (syncState.errors.consecutive >= 5) {
        log(`🚨 ALERT: ${syncState.errors.consecutive} consecutive errors in sync system!`, 'ERROR');
    }
}

/**
 * Reset error counter on success
 */
function resetErrorCounter() {
    if (syncState.errors.consecutive > 0) {
        log(`✅ Error recovery: Reset consecutive error count from ${syncState.errors.consecutive}`, 'SUCCESS');
        syncState.errors.consecutive = 0;
    }
}

// ===== STATE MANAGEMENT =====

/**
 * Load persistent state from disk
 */
function loadState() {
    try {
        if (fs.existsSync(CONFIG.STATE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
            syncState = { ...syncState, ...data };
            log(`📂 Loaded sync state: ${syncState.processedClients.length} clients, ${syncState.processedClosers.length} closers processed`, 'INFO');
        }
    } catch (e) {
        log(`Warning: Could not load state file: ${e.message}`, 'WARNING');
    }
}

/**
 * Save persistent state to disk
 */
function saveState() {
    try {
        fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(syncState, null, 2));
    } catch (e) {
        log(`Error saving state: ${e.message}`, 'ERROR');
    }
}

/**
 * Detect sync gaps - items we missed during downtime
 */
async function detectSyncGaps() {
    log('🔍 Detecting sync gaps...', 'SYNC');
    
    try {
        // Check for new clients since last sync
        const clientsResponse = await getWolfPackClients();
        if (clientsResponse.success) {
            const allClients = clientsResponse.data.data;
            const newClients = allClients.filter(client => {
                const clientTime = new Date(client.createdAt).getTime();
                return clientTime > syncState.lastClientSync && 
                       !syncState.processedClients.includes(client.id);
            });
            
            if (newClients.length > 0) {
                log(`🔍 Found ${newClients.length} client gaps to fill`, 'WARNING');
                syncState.syncGaps.clients = newClients.map(c => c.id);
            }
        }
        
        // Check for new closers since last sync  
        const closersResponse = await getWolfPackClosers(1, 100);
        if (closersResponse.success) {
            const allClosers = closersResponse.data.data;
            const newClosers = allClosers.filter(closer => {
                const closerTime = new Date(closer.createdAt).getTime();
                return closerTime > syncState.lastCloserSync && 
                       !syncState.processedClosers.includes(closer.id);
            });
            
            if (newClosers.length > 0) {
                log(`🔍 Found ${newClosers.length} closer gaps to fill`, 'WARNING');
                syncState.syncGaps.closers = newClosers.map(c => c.id);
            }
        }
        
    } catch (error) {
        handleError(error, 'gap detection');
    }
}

// ===== API FUNCTIONS =====

/**
 * Wolf Pack API: Get clients
 */
async function getWolfPackClients() {
    checkRateLimit('wolfPack');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/client`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    
    // Update API health
    syncState.apiHealth.wolfPack = {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: response.responseTime
    };
    
    return response.data;
}

/**
 * Wolf Pack API: Get closers
 */
async function getWolfPackClosers(page = 1, limit = 100) {
    checkRateLimit('wolfPack');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/closer?limit=${limit}&page=${page}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    
    // Update API health
    syncState.apiHealth.wolfPack = {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: response.responseTime
    };
    
    return response.data;
}

/**
 * Wolf Pack API: Get user details
 */
async function getWolfPackUser(userId) {
    checkRateLimit('wolfPack');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/user/${userId}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    return response.data;
}

/**
 * Airtable API: Get records
 */
async function getAirtableRecords() {
    checkRateLimit('airtable');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    
    // Update API health
    syncState.apiHealth.airtable = {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: response.responseTime
    };
    
    return response.data;
}

/**
 * Airtable API: Add record
 */
async function addToAirtable(record) {
    checkRateLimit('airtable');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        },
        body: {
            fields: record
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    return response.data;
}

/**
 * Airtable API: Update record
 */
async function updateAirtableRecord(recordId, fields) {
    checkRateLimit('airtable');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}/${recordId}`;
    const options = {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        },
        body: {
            fields: fields
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    return response.data;
}

/**
 * Airtable API: Find record by student name
 */
async function findAirtableRecord(studentName) {
    checkRateLimit('airtable');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
    
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}?filterByFormula={Student Name}="${studentName}"`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequestWithRetry(url, options);
    return response.data.records && response.data.records.length > 0 ? response.data.records[0] : null;
}

// ===== SYNC FUNCTIONS =====

/**
 * Sync clients from Wolf Pack to pipeline dashboard
 */
async function syncClients() {
    const startTime = Date.now();
    
    try {
        log('🔄 Syncing clients from Wolf Pack Admin...', 'SYNC');
        
        const clientsResponse = await getWolfPackClients();
        
        if (!clientsResponse.success) {
            throw new Error('Failed to fetch clients from Wolf Pack API');
        }
        
        const clients = clientsResponse.data.data;
        let newClients = [];
        
        // Process new clients and gaps
        for (const client of clients) {
            if (!syncState.processedClients.includes(client.id) || 
                syncState.syncGaps.clients.includes(client.id)) {
                newClients.push(client);
                
                // Add to processed if not already there
                if (!syncState.processedClients.includes(client.id)) {
                    syncState.processedClients.push(client.id);
                }
                
                // Remove from gaps
                syncState.syncGaps.clients = syncState.syncGaps.clients.filter(id => id !== client.id);
            }
        }
        
        if (newClients.length > 0) {
            log(`📊 Found ${newClients.length} new/gap clients to sync`, 'SUCCESS');
            
            // Update dashboard client list
            await updateDashboardClients(clients);
            
            newClients.forEach(client => {
                log(`  • ${client.name} (${client.offer})`, 'INFO');
            });
            
            // Auto-assign new clients to students without assignments
            await autoAssignNewClients(newClients);
        }
        
        syncState.lastClientSync = Date.now();
        resetErrorCounter();
        trackPerformance('client_sync', Date.now() - startTime, true);
        
    } catch (error) {
        handleError(error, 'client sync');
        trackPerformance('client_sync', Date.now() - startTime, false);
        
        // Mark API as unhealthy on error
        syncState.apiHealth.wolfPack.status = 'error';
    }
}

/**
 * Sync closers from Wolf Pack to Airtable
 */
async function syncClosers() {
    const startTime = Date.now();
    
    try {
        log('🔄 Syncing closers from Wolf Pack Admin...', 'SYNC');
        
        const closersResponse = await getWolfPackClosers(1, 100);
        
        if (!closersResponse.success) {
            throw new Error('Failed to fetch closers from Wolf Pack API');
        }
        
        const closers = closersResponse.data.data;
        let newClosers = [];
        
        for (const closer of closers) {
            // Skip if already processed (unless it's a gap to fill)
            if (syncState.processedClosers.includes(closer.id) && 
                !syncState.syncGaps.closers.includes(closer.id)) {
                continue;
            }
            
            // Only sync recent closers or gaps
            const createdDate = new Date(closer.createdAt);
            const updatedDate = new Date(closer.updatedAt);
            const now = new Date();
            
            const createdHoursDiff = (now - createdDate) / (1000 * 60 * 60);
            const updatedHoursDiff = (now - updatedDate) / (1000 * 60 * 60);
            
            // Skip if older than 24 hours and not recently updated (unless it's a gap)
            if (createdHoursDiff > 24 && updatedHoursDiff > 24 && 
                !syncState.syncGaps.closers.includes(closer.id)) {
                continue;
            }
            
            try {
                // Get user details
                const userResponse = await getWolfPackUser(closer.userId);
                
                if (userResponse.success && userResponse.data) {
                    const user = userResponse.data;
                    const clientName = closer.userClient?.client?.name || '';
                    
                    // Check if student exists in Airtable
                    const existingRecord = await findAirtableRecord(user.name);
                    
                    const notes = `🚀 CLOSER PLACEMENT\\n\\nDeal Date: ${closer.dealDate}\\nAmount: €${closer.amount}\\nOffer: ${closer.userClient?.client?.offer || ''}\\nProposition: ${closer.proposition}\\nStatus: ${closer.status}\\nCreated: ${closer.createdAt}\\nUpdated: ${closer.updatedAt}\\n\\n✅ Auto-synced by Bulletproof Sync Daemon`;
                    
                    if (existingRecord) {
                        // Update existing record
                        await updateAirtableRecord(existingRecord.id, {
                            'Pipeline Stage': 'Signed Closer',
                            'Opdrachtgever': clientName,
                            'Notes': notes
                        });
                        log(`✅ Updated ${user.name} → ${clientName}`, 'SUCCESS');
                    } else {
                        // Create new record
                        const airtableRecord = {
                            'Student Name': user.name,
                            'Pipeline Stage': 'Signed Closer',
                            'Email': user.email,
                            'Notes': notes,
                            'Opdrachtgever': clientName,
                            'Coach': '' // Will be assigned manually
                        };
                        
                        await addToAirtable(airtableRecord);
                        log(`✅ Added ${user.name} → ${clientName}`, 'SUCCESS');
                    }
                    
                    newClosers.push({
                        name: user.name,
                        email: user.email,
                        client: clientName,
                        amount: closer.amount,
                        date: closer.dealDate
                    });
                    
                    // Mark as processed
                    if (!syncState.processedClosers.includes(closer.id)) {
                        syncState.processedClosers.push(closer.id);
                    }
                    
                    // Remove from gaps
                    syncState.syncGaps.closers = syncState.syncGaps.closers.filter(id => id !== closer.id);
                }
                
            } catch (error) {
                log(`Error processing closer ${closer.id}: ${error.message}`, 'ERROR');
            }
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay));
        }
        
        if (newClosers.length > 0) {
            log(`🎯 Processed ${newClosers.length} closer placements`, 'SUCCESS');
        }
        
        syncState.lastCloserSync = Date.now();
        resetErrorCounter();
        trackPerformance('closer_sync', Date.now() - startTime, true);
        
    } catch (error) {
        handleError(error, 'closer sync');
        trackPerformance('closer_sync', Date.now() - startTime, false);
        
        // Mark API as unhealthy on error
        syncState.apiHealth.wolfPack.status = 'error';
    }
}

/**
 * Update dashboard clients list
 */
async function updateDashboardClients(clients) {
    try {
        const dashboardPath = '/Users/macmini/.openclaw/workspace/wolf-dashboards/pipeline/index.html';
        let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        // Extract client names and sort
        const clientNames = clients.map(client => `"${client.name}"`).sort();
        const clientList = clientNames.join(',\\n                  ');
        
        // Update the adminClients array with bulletproof pattern matching
        const pattern = /(\/\/ Wolf Pack admin clients.*?const adminClients = \[)([\s\S]*?)(\s*\];)/;
        const replacement = `$1\n                  ${clientList}\n        $3`;
        
        dashboardContent = dashboardContent.replace(pattern, replacement);
        
        // Backup current file before writing
        const backupPath = `${dashboardPath}.backup-${Date.now()}`;
        fs.writeFileSync(backupPath, fs.readFileSync(dashboardPath));
        
        // Write updated file
        fs.writeFileSync(dashboardPath, dashboardContent);
        
        log(`📝 Updated dashboard with ${clients.length} clients (backup: ${path.basename(backupPath)})`, 'SUCCESS');
        
    } catch (error) {
        log(`Failed to update dashboard clients: ${error.message}`, 'ERROR');
        throw error;
    }
}

/**
 * Auto-assign new clients to students without assignments
 */
async function autoAssignNewClients(newClients) {
    try {
        // Get Airtable records
        const airtableResponse = await getAirtableRecords();
        const airtableRecords = airtableResponse.records;
        
        // Find Signed Closers without Opdrachtgever
        const studentsWithoutClients = airtableRecords.filter(record => 
            record.fields['Pipeline Stage'] === 'Signed Closer' && 
            (!record.fields['Opdrachtgever'] || record.fields['Opdrachtgever'].trim() === '')
        );
        
        if (studentsWithoutClients.length > 0 && newClients.length > 0) {
            log(`🔧 Auto-assigning ${newClients.length} new clients to ${studentsWithoutClients.length} students`, 'INFO');
            
            // Smart assignment based on patterns and availability
            for (let i = 0; i < studentsWithoutClients.length; i++) {
                const student = studentsWithoutClients[i];
                const client = newClients[i % newClients.length]; // Cycle through clients
                
                await updateAirtableRecord(student.id, {
                    'Opdrachtgever': client.name
                });
                
                log(`🔧 Auto-assigned ${student.fields['Student Name']} → ${client.name}`, 'SUCCESS');
                
                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMITS.requestDelay * 2));
            }
        }
        
    } catch (error) {
        log(`Auto-assign new clients failed: ${error.message}`, 'ERROR');
        throw error;
    }
}

/**
 * Health check for all APIs and services
 */
async function healthCheck() {
    const startTime = Date.now();
    
    try {
        log('🏥 Running health check...', 'HEALTH');
        
        // Check Wolf Pack API
        try {
            await getWolfPackClients();
            syncState.apiHealth.wolfPack.status = 'healthy';
        } catch (error) {
            syncState.apiHealth.wolfPack.status = 'error';
            log(`🏥 Wolf Pack API unhealthy: ${error.message}`, 'WARNING');
        }
        
        // Check Airtable API  
        try {
            await getAirtableRecords();
            syncState.apiHealth.airtable.status = 'healthy';
        } catch (error) {
            syncState.apiHealth.airtable.status = 'error';
            log(`🏥 Airtable API unhealthy: ${error.message}`, 'WARNING');
        }
        
        // Check Pipeline Dashboard
        try {
            const response = await makeRequestWithRetry(CONFIG.PIPELINE_URL, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            
            syncState.apiHealth.pipeline = {
                status: response.statusCode === 200 ? 'healthy' : 'error',
                lastCheck: Date.now(),
                responseTime: response.responseTime
            };
            
            if (response.statusCode === 200) {
                log(`🏥 Pipeline dashboard healthy (${response.responseTime}ms)`, 'HEALTH');
            } else {
                log(`🏥 Pipeline dashboard unhealthy: HTTP ${response.statusCode}`, 'WARNING');
            }
        } catch (error) {
            syncState.apiHealth.pipeline.status = 'error';
            log(`🏥 Pipeline dashboard unhealthy: ${error.message}`, 'WARNING');
        }
        
        // Check for sync gaps
        await detectSyncGaps();
        
        syncState.lastHealthCheck = Date.now();
        
        // Report overall health
        const healthyApis = Object.values(syncState.apiHealth).filter(api => api.status === 'healthy').length;
        const totalApis = Object.keys(syncState.apiHealth).length;
        
        log(`🏥 Health check complete: ${healthyApis}/${totalApis} APIs healthy`, healthyApis === totalApis ? 'SUCCESS' : 'WARNING');
        
        trackPerformance('health_check', Date.now() - startTime, true);
        
    } catch (error) {
        handleError(error, 'health check');
        trackPerformance('health_check', Date.now() - startTime, false);
    }
}

// ===== MAIN SYNC LOOP =====

/**
 * Main bulletproof sync loop with comprehensive monitoring
 */
async function bulletproofSyncLoop() {
    log('🛡️ Starting BULLETPROOF Wolf Pack Sync Daemon...', 'SUCCESS');
    log(`🎯 Real-time sync intervals: Clients(${CONFIG.SYNC_INTERVALS.clients/1000}s), Closers(${CONFIG.SYNC_INTERVALS.closers/1000}s)`, 'INFO');
    log(`🔧 Retry config: Max ${CONFIG.RETRY_CONFIG.maxRetries} retries, ${CONFIG.RETRY_CONFIG.initialDelay}ms-${CONFIG.RETRY_CONFIG.maxDelay}ms delays`, 'INFO');
    log(`📊 Monitoring: Wolf Pack API, Airtable, Pipeline Dashboard`, 'INFO');
    
    let intervals = {};
    
    try {
        // Detect any sync gaps from downtime
        await detectSyncGaps();
        
        // Initial sync run
        await syncClients();
        await syncClosers();
        await healthCheck();
        saveState();
        
        // 🎯 REAL-TIME SYNC INTERVALS
        intervals.clients = setInterval(async () => {
            try {
                await syncClients();
                saveState();
            } catch (error) {
                log(`Client sync interval error: ${error.message}`, 'ERROR');
            }
        }, CONFIG.SYNC_INTERVALS.clients);
        
        intervals.closers = setInterval(async () => {
            try {
                await syncClosers();
                saveState();
            } catch (error) {
                log(`Closer sync interval error: ${error.message}`, 'ERROR');
            }
        }, CONFIG.SYNC_INTERVALS.closers);
        
        intervals.health = setInterval(async () => {
            try {
                await healthCheck();
                saveState();
            } catch (error) {
                log(`Health check interval error: ${error.message}`, 'ERROR');
            }
        }, CONFIG.SYNC_INTERVALS.healthCheck);
        
        log('✅ BULLETPROOF Sync Daemon is running!', 'SUCCESS');
        log('🎯 All sync intervals active with bulletproof error handling', 'INFO');
        log('📊 Performance metrics being tracked', 'INFO');
        log('🛑 Press Ctrl+C to stop gracefully', 'INFO');
        
    } catch (error) {
        log(`Failed to start sync daemon: ${error.message}`, 'ERROR');
        throw error;
    }
    
    // 🛡️ GRACEFUL SHUTDOWN
    const shutdown = () => {
        log('🛑 Graceful shutdown initiated...', 'WARNING');
        
        // Clear all intervals
        Object.values(intervals).forEach(interval => clearInterval(interval));
        
        // Save final state
        saveState();
        
        // Final health report
        const performance = syncState.performance;
        log(`📈 Final performance report:`, 'PERF');
        log(`   Total syncs: ${performance.totalSyncs}`, 'PERF');
        log(`   Success rate: ${Math.round((performance.successfulSyncs / performance.totalSyncs) * 100)}%`, 'PERF');
        log(`   Average sync time: ${Math.round(performance.avgSyncTime)}ms`, 'PERF');
        log(`   Total errors: ${syncState.errors.total}`, 'PERF');
        
        log('🛡️ Bulletproof sync daemon shutdown complete', 'SUCCESS');
        process.exit(0);
    };
    
    // Handle shutdown signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
        log(`💥 Uncaught exception: ${error.message}`, 'ERROR');
        log(error.stack, 'ERROR');
        shutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        log(`💥 Unhandled rejection: ${reason}`, 'ERROR');
        shutdown();
    });
}

// ===== INITIALIZE =====
if (require.main === module) {
    // Clear old log files
    try {
        if (fs.existsSync(CONFIG.LOG_FILE)) {
            fs.unlinkSync(CONFIG.LOG_FILE);
        }
    } catch (e) {
        // Ignore
    }
    
    loadState();
    bulletproofSyncLoop().catch(error => {
        log(`🛡️ Bulletproof sync daemon failed: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { 
    bulletproofSyncLoop, 
    syncClients, 
    syncClosers, 
    healthCheck,
    CONFIG 
};