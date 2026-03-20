#!/usr/bin/env node

/**
 * Wolf Pack Master Sync Daemon
 * 
 * 3-Way Real-Time Synchronization:
 * 1. Wolf Pack Admin Dashboard ↔ Airtable ↔ Coaching Pipeline (Ngrok)
 * 
 * Monitors and syncs:
 * - New clients
 * - Closer placements  
 * - Client assignments
 * - Pipeline stage changes
 * 
 * Usage: node master-sync-daemon.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
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
    
    SYNC_INTERVALS: {
        clients: 60000,      // Check for new clients every 1 minute
        closers: 30000,      // Check for new closers every 30 seconds
        assignments: 15000,  // Check assignments every 15 seconds
        pipeline: 10000      // Pipeline updates every 10 seconds
    },
    
    STATE_FILE: '/tmp/wolf-pack-master-sync-state.json'
};

// Global state
let syncState = {
    lastClientSync: 0,
    lastCloserSync: 0,
    lastAssignmentSync: 0,
    processedClients: [],
    processedClosers: [],
    processedAssignments: []
};

// Utility functions
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': '📋',
        'SUCCESS': '✅',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'SYNC': '🔄'
    }[level] || '📋';
    
    console.log(`[${timestamp}] ${emoji} ${message}`);
}

// State management
function loadState() {
    try {
        if (fs.existsSync(CONFIG.STATE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
            syncState = { ...syncState, ...data };
        }
    } catch (e) {
        log(`Warning: Could not load state file: ${e.message}`, 'WARNING');
    }
}

function saveState() {
    try {
        fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(syncState, null, 2));
    } catch (e) {
        log(`Error saving state: ${e.message}`, 'ERROR');
    }
}

// Wolf Pack API calls
async function getWolfPackClients() {
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/client`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

async function getWolfPackClosers(page = 1, limit = 100) {
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/closer?limit=${limit}&page=${page}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

async function getWolfPackUser(userId) {
    const url = `${CONFIG.WOLF_PACK_API.baseURL}/user/users/${userId}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

// Airtable API calls
async function getAirtableRecords() {
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

async function addToAirtable(record) {
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
    
    return await makeRequest(url, options);
}

async function updateAirtableRecord(recordId, fields) {
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
    
    return await makeRequest(url, options);
}

async function findAirtableRecord(studentName) {
    const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}?filterByFormula={Student Name}="${studentName}"`;
    const options = {
        headers: {
            'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const result = await makeRequest(url, options);
    return result.records && result.records.length > 0 ? result.records[0] : null;
}

// Sync functions
async function syncClients() {
    try {
        log('🔄 Syncing clients from Wolf Pack Admin...', 'SYNC');
        
        const clientsResponse = await getWolfPackClients();
        
        if (!clientsResponse.success) {
            throw new Error('Failed to fetch clients from Wolf Pack API');
        }
        
        const clients = clientsResponse.data.data;
        const newClients = [];
        
        for (const client of clients) {
            if (!syncState.processedClients.includes(client.id)) {
                newClients.push(client);
                syncState.processedClients.push(client.id);
            }
        }
        
        if (newClients.length > 0) {
            log(`📊 Found ${newClients.length} new clients`, 'SUCCESS');
            
            // Update dashboard client list
            await updateDashboardClients(clients);
            
            newClients.forEach(client => {
                log(`  • ${client.name} (${client.offer})`, 'INFO');
            });
        }
        
        // Auto-assign new clients to students without assignments
        if (newClients.length > 0) {
            await autoAssignNewClients(newClients);
        }
        
        syncState.lastClientSync = Date.now();
        
    } catch (error) {
        log(`Client sync failed: ${error.message}`, 'ERROR');
    }
}

async function syncClosers() {
    try {
        log('🔄 Syncing closers from Wolf Pack Admin...', 'SYNC');
        
        const closersResponse = await getWolfPackClosers(1, 100);
        
        if (!closersResponse.success) {
            throw new Error('Failed to fetch closers from Wolf Pack API');
        }
        
        const closers = closersResponse.data.data;
        const newClosers = [];
        
        for (const closer of closers) {
            // Skip if already processed
            if (syncState.processedClosers.includes(closer.id)) {
                continue;
            }
            
            // Only sync recent closers or updated ones
            const createdDate = new Date(closer.createdAt);
            const updatedDate = new Date(closer.updatedAt);
            const now = new Date();
            
            const createdHoursDiff = (now - createdDate) / (1000 * 60 * 60);
            const updatedHoursDiff = (now - updatedDate) / (1000 * 60 * 60);
            
            // Skip if older than 24 hours and not recently updated
            if (createdHoursDiff > 24 && updatedHoursDiff > 24) {
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
                    
                    const notes = `🚀 CLOSER PLACEMENT\\n\\nDeal Date: ${closer.dealDate}\\nAmount: €${closer.amount}\\nOffer: ${closer.userClient?.client?.offer || ''}\\nProposition: ${closer.proposition}\\nStatus: ${closer.status}\\nCreated: ${closer.createdAt}\\nUpdated: ${closer.updatedAt}\\n\\nAuto-synced from Wolf Pack Admin Dashboard`;
                    
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
                    syncState.processedClosers.push(closer.id);
                }
                
            } catch (error) {
                log(`Error processing closer ${closer.id}: ${error.message}`, 'ERROR');
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (newClosers.length > 0) {
            log(`🎯 Processed ${newClosers.length} closer placements`, 'SUCCESS');
        }
        
        syncState.lastCloserSync = Date.now();
        
    } catch (error) {
        log(`Closer sync failed: ${error.message}`, 'ERROR');
    }
}

async function updateDashboardClients(clients) {
    try {
        // Read current dashboard file
        const dashboardPath = '/Users/macmini/.openclaw/workspace/wolf-dashboards/pipeline/index.html';
        let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        // Extract client names
        const clientNames = clients.map(client => `"${client.name}"`).sort();
        const clientList = clientNames.join(',\\n                  ');
        
        // Update the adminClients array
        const pattern = /(\/\/ Wolf Pack admin clients.*?const adminClients = \[)([\s\S]*?)(\s*\];)/;
        const replacement = `$1\n                  ${clientList}\n        $3`;
        
        dashboardContent = dashboardContent.replace(pattern, replacement);
        
        // Write updated file
        fs.writeFileSync(dashboardPath, dashboardContent);
        
        log(`📝 Updated dashboard with ${clients.length} clients`, 'SUCCESS');
        
        // Send notification for new clients
        if (newClients.length > 0) {
            const clientNames = newClients.map(c => c.name).join(', ');
            log(`🚨 NEW CLIENTS DETECTED: ${clientNames}`, 'SUCCESS');
        }
        
    } catch (error) {
        log(`Failed to update dashboard clients: ${error.message}`, 'ERROR');
    }
}

// Auto-fix missing client assignments
async function autoFixMissingClients() {
    try {
        // Get Airtable records
        const airtableResponse = await getAirtableRecords();
        const airtableRecords = airtableResponse.records;
        
        // Find Signed Closers without Opdrachtgever
        const missingClients = airtableRecords.filter(record => 
            record.fields['Pipeline Stage'] === 'Signed Closer' && 
            (!record.fields['Opdrachtgever'] || record.fields['Opdrachtgever'].trim() === '')
        );
        
        if (missingClients.length > 0) {
            log(`🔧 Found ${missingClients.length} Signed Closers missing client assignments`, 'WARNING');
            
            // Simple assignment based on common patterns
            const defaultAssignments = {
                'brian': 'Social Recruitment Academy',
                'joey': 'Ecomgoats',
                'krishna': 'Elite Club',
                'illias': 'Barakah Arbitrage'
            };
            
            for (const record of missingClients) {
                const studentName = record.fields['Student Name'].toLowerCase();
                let assignedClient = null;
                
                // Try to match with default patterns
                for (const [pattern, client] of Object.entries(defaultAssignments)) {
                    if (studentName.includes(pattern)) {
                        assignedClient = client;
                        break;
                    }
                }
                
                // Fallback to a common client
                if (!assignedClient) {
                    assignedClient = 'Social Recruitment Academy';
                }
                
                // Update record
                await updateAirtableRecord(record.id, {
                    'Opdrachtgever': assignedClient
                });
                
                log(`🔧 Auto-assigned ${record.fields['Student Name']} → ${assignedClient}`, 'SUCCESS');
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
    } catch (error) {
        log(`Auto-fix failed: ${error.message}`, 'ERROR');
    }
}

// Auto-assign new clients to students without assignments
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
            
            // Simple round-robin assignment
            for (let i = 0; i < studentsWithoutClients.length; i++) {
                const student = studentsWithoutClients[i];
                const client = newClients[i % newClients.length]; // Cycle through clients
                
                await updateAirtableRecord(student.id, {
                    'Opdrachtgever': client.name
                });
                
                log(`🔧 Auto-assigned ${student.fields['Student Name']} → ${client.name}`, 'SUCCESS');
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
    } catch (error) {
        log(`Auto-assign new clients failed: ${error.message}`, 'ERROR');
    }
}

// Main sync loop
async function masterSyncLoop() {
    log('🚀 Starting Master Sync Daemon...', 'SUCCESS');
    log(`📊 Monitoring Wolf Pack Admin Dashboard → Airtable → Coaching Pipeline`, 'INFO');
    
    let clientSyncInterval, closerSyncInterval;
    
    // Client sync (every 1 minute)
    clientSyncInterval = setInterval(async () => {
        await syncClients();
        saveState();
    }, CONFIG.SYNC_INTERVALS.clients);
    
    // Closer sync (every 30 seconds)  
    closerSyncInterval = setInterval(async () => {
        await syncClosers();
        // Auto-fix disabled to prevent incorrect assignments
        saveState();
    }, CONFIG.SYNC_INTERVALS.closers);
    
    // Initial sync
    await syncClients();
    await syncClosers();
    saveState();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        log('🛑 Shutting down Master Sync Daemon...', 'WARNING');
        clearInterval(clientSyncInterval);
        clearInterval(closerSyncInterval);
        saveState();
        process.exit(0);
    });
    
    log('✅ Master Sync Daemon is running!', 'SUCCESS');
    log('📋 Client sync: every 1 minute', 'INFO');
    log('📋 Closer sync: every 30 seconds', 'INFO');
    log('📋 Pipeline auto-sync: every 5 seconds (built-in)', 'INFO');
    log('🛑 Press Ctrl+C to stop', 'INFO');
}

// Initialize and start
if (require.main === module) {
    loadState();
    masterSyncLoop().catch(error => {
        log(`Master sync failed: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { masterSyncLoop, syncClients, syncClosers };