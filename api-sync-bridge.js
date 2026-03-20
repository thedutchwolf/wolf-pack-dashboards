#!/usr/bin/env node

/**
 * Wolf Pack API ↔ Airtable Sync Bridge
 * 
 * Synchroniseert nieuwe closers tussen:
 * - Wolf Pack API (https://wolfpack.thewolfpackgroup.com/api/v1/closer)
 * - Airtable Coaching Pipeline (appFR2ovH2m5XN6I3)
 * 
 * Usage: node api-sync-bridge.js
 */

const https = require('https');
const fs = require('fs');

// Configuration
const WOLF_PACK_API = {
    baseURL: 'https://wolfpack.thewolfpackgroup.com/api/v1',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1lbHZpbkB0aGV3b2xmcGFja2dyb3VwLmNvbSIsInJvbGUiOiJBRE1JTiIsImlkIjoiNjhkOGNiNjA2ZjkzMTBiZGViOGU4OWM1IiwiaWF0IjoxNzYzOTc4Njg4LCJleHAiOjQ5MTk3Mzg2ODh9.jNIeVQxj3xx3P-txsQX0u1EjCLaOcaMuSCVkG-xzg5c'
};

const AIRTABLE_API = {
    token: 'patgj5c0XFB8kEmu7.86405981a4f0fece4f8005ccfb766df980004bbc030bac0c90e221cc6f97fc68',
    base: 'appFR2ovH2m5XN6I3',
    table: 'Coaching Pipeline'
};

const STATE_FILE = '/tmp/wolf-pack-sync-state.json';

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

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Load/save sync state
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {
        log(`Warning: Could not load state file: ${e.message}`);
    }
    
    return { lastSyncTime: 0, processedClosers: [] };
}

function saveState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        log(`Error saving state: ${e.message}`);
    }
}

// Wolf Pack API calls
async function getWolfPackClosers(page = 1, limit = 50) {
    const url = `${WOLF_PACK_API.baseURL}/closer?limit=${limit}&page=${page}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

async function getWolfPackUser(userId) {
    const url = `${WOLF_PACK_API.baseURL}/user/users/${userId}`;
    const options = {
        headers: {
            'Authorization': `Bearer ${WOLF_PACK_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    return await makeRequest(url, options);
}

// Airtable API calls
async function addToAirtable(record) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_API.base}/${encodeURIComponent(AIRTABLE_API.table)}`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        },
        body: {
            fields: record
        }
    };
    
    return await makeRequest(url, options);
}

async function checkExistingStudent(studentName) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_API.base}/${encodeURIComponent(AIRTABLE_API.table)}?filterByFormula={Student Name}="${studentName}"`;
    const options = {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const result = await makeRequest(url, options);
    return result.records && result.records.length > 0 ? result.records[0] : null;
}

async function updateAirtableRecord(recordId, fields) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_API.base}/${encodeURIComponent(AIRTABLE_API.table)}/${recordId}`;
    const options = {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API.token}`,
            'Content-Type': 'application/json'
        },
        body: {
            fields: fields
        }
    };
    
    return await makeRequest(url, options);
}

// Main sync function
async function syncClosers() {
    log('🚀 Starting Wolf Pack → Airtable sync...');
    
    const state = loadState();
    const newClosers = [];
    
    try {
        // Get recent closers from Wolf Pack API
        const closersResponse = await getWolfPackClosers(1, 100);
        
        if (!closersResponse.success) {
            throw new Error('Failed to fetch closers from Wolf Pack API');
        }
        
        const closers = closersResponse.data.data;
        log(`📊 Found ${closers.length} closers in Wolf Pack API`);
        
        // Process new closers
        for (const closer of closers) {
            // Skip if already processed
            if (state.processedClosers.includes(closer.id)) {
                continue;
            }
            
            // Sync closers from last 7 days OR created/updated today
            const dealDate = new Date(closer.dealDate);
            const createdDate = new Date(closer.createdAt);
            const updatedDate = new Date(closer.updatedAt);
            const now = new Date();
            
            const dealHoursDiff = (now - dealDate) / (1000 * 60 * 60);
            const createdHoursDiff = (now - createdDate) / (1000 * 60 * 60);
            const updatedHoursDiff = (now - updatedDate) / (1000 * 60 * 60);
            
            // Skip if deal is older than 7 days AND not recently created/updated
            if (dealHoursDiff > (24 * 7) && createdHoursDiff > 24 && updatedHoursDiff > 24) {
                continue;
            }
            
            try {
                // Get user details
                const userResponse = await getWolfPackUser(closer.userId);
                
                if (userResponse.success && userResponse.data) {
                    const user = userResponse.data;
                    
                    // Get client name from userClient data
                    const clientName = closer.userClient?.client?.name || '';
                    
                    // Prepare Airtable record
                    const airtableRecord = {
                        'Student Name': user.name,
                        'Pipeline Stage': 'Signed Closer',
                        'Email': user.email,
                        'Notes': `🚀 CLOSER PLACEMENT\\n\\nDeal Date: ${closer.dealDate}\\nAmount: €${closer.amount}\\nOffer: ${closer.userClient?.client?.offer || ''}\\nProposition: ${closer.proposition}\\nStatus: ${closer.status}\\n\\nAuto-synced from Wolf Pack API`,
                        'Opdrachtgever': clientName,
                        'Coach': '' // Will be assigned manually
                    };
                    
                    // Check if student already exists in Airtable
                    const existingRecord = await checkExistingStudent(user.name);
                    
                    if (existingRecord) {
                        // Update existing record with client assignment
                        await updateAirtableRecord(existingRecord.id, {
                            'Pipeline Stage': 'Signed Closer',
                            'Opdrachtgever': clientName,
                            'Notes': airtableRecord.Notes
                        });
                        log(`✅ Updated ${user.name} → ${clientName}`);
                    } else {
                        // Add new record
                        await addToAirtable(airtableRecord);
                        log(`✅ Added ${user.name} → ${clientName}`);
                    }
                    
                    log(`✅ Added ${user.name} to Airtable coaching pipeline`);
                    newClosers.push({
                        name: user.name,
                        email: user.email,
                        amount: closer.amount,
                        date: closer.dealDate
                    });
                    
                    // Mark as processed
                    state.processedClosers.push(closer.id);
                }
                
            } catch (error) {
                log(`❌ Error processing closer ${closer.id}: ${error.message}`);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Update sync state
        state.lastSyncTime = Date.now();
        saveState(state);
        
        if (newClosers.length > 0) {
            log(`🎯 Sync complete: ${newClosers.length} new closers added to coaching pipeline`);
            
            // Summary
            newClosers.forEach(closer => {
                log(`  • ${closer.name} (€${closer.amount})`);
            });
        } else {
            log('ℹ️ No new closers to sync');
        }
        
    } catch (error) {
        log(`❌ Sync failed: ${error.message}`);
        throw error;
    }
}

// Run sync
if (require.main === module) {
    syncClosers()
        .then(() => {
            log('🏁 Sync completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            log(`💥 Sync failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { syncClosers };