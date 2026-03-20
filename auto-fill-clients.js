#!/usr/bin/env node

/**
 * Auto-Fill Missing Client Assignments
 * 
 * Automatically fills missing "Opdrachtgever" fields for Signed Closers
 * by matching with Wolf Pack Admin API data
 */

const https = require('https');

const CONFIG = {
    WOLF_PACK_API: {
        baseURL: 'https://wolfpack.thewolfpackgroup.com/api/v1',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1lbHZpbkB0aGV3b2xmcGFja2dyb3VwLmNvbSIsInJvbGUiOiJBRE1JTiIsImlkIjoiNjhkOGNiNjA2ZjkzMTBiZGViOGU4OWM1IiwiaWF0IjoxNzYzOTc4Njg4LCJleHAiOjQ5MTk3Mzg2ODh9.jNIeVQxj3xx3P-txsQX0u1EjCLaOcaMuSCVkG-xzg5c'
    },
    
    AIRTABLE_API: {
        token: 'patgj5c0XFB8kEmu7.86405981a4f0fece4f8005ccfb766df980004bbc030bac0c90e221cc6f97fc68',
        base: 'appFR2ovH2m5XN6I3',
        table: 'Coaching Pipeline'
    }
};

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

async function getAllClosers() {
    const allClosers = [];
    
    for (let page = 1; page <= 10; page++) {
        const url = `${CONFIG.WOLF_PACK_API.baseURL}/closer?limit=100&page=${page}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(url, options);
        
        if (!response.success) break;
        
        allClosers.push(...response.data.data);
        
        if (response.data.data.length < 100) break;
    }
    
    return allClosers;
}

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

function fuzzyMatch(name1, name2) {
    const clean1 = name1.toLowerCase().replace(/[^a-z]/g, '');
    const clean2 = name2.toLowerCase().replace(/[^a-z]/g, '');
    
    // Exact match
    if (clean1 === clean2) return 1.0;
    
    // Contains match
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    // Word overlap
    const words1 = name1.toLowerCase().split(/\s+/);
    const words2 = name2.toLowerCase().split(/\s+/);
    
    let overlap = 0;
    for (const word1 of words1) {
        for (const word2 of words2) {
            if (word1 === word2) overlap++;
        }
    }
    
    return overlap / Math.max(words1.length, words2.length);
}

async function autoFillClients() {
    console.log('🚀 Starting Auto-Fill for missing client assignments...');
    
    try {
        // Get all closers from Wolf Pack API
        console.log('📊 Fetching all closers from Wolf Pack API...');
        const allClosers = await getAllClosers();
        console.log(`📈 Found ${allClosers.length} closers in Wolf Pack API`);
        
        // Get Airtable records
        console.log('📊 Fetching Airtable records...');
        const airtableResponse = await getAirtableRecords();
        const airtableRecords = airtableResponse.records;
        
        // Find Signed Closers without Opdrachtgever
        const missingClients = airtableRecords.filter(record => 
            record.fields['Pipeline Stage'] === 'Signed Closer' && 
            (!record.fields['Opdrachtgever'] || record.fields['Opdrachtgever'].trim() === '')
        );
        
        console.log(`🔍 Found ${missingClients.length} Signed Closers without client assignment`);
        
        let filled = 0;
        
        for (const record of missingClients) {
            const studentName = record.fields['Student Name'];
            console.log(`\n🔍 Searching for ${studentName}...`);
            
            // Find matching closer in Wolf Pack API
            let bestMatch = null;
            let bestScore = 0;
            
            for (const closer of allClosers) {
                const score = fuzzyMatch(studentName, closer.user.name);
                if (score > bestScore && score >= 0.7) {
                    bestScore = score;
                    bestMatch = closer;
                }
            }
            
            if (bestMatch && bestMatch.userClient?.client?.name) {
                const clientName = bestMatch.userClient.client.name;
                const offer = bestMatch.userClient.client.offer || '';
                
                console.log(`✅ Match found: ${studentName} → ${clientName} (${offer}) [score: ${bestScore}]`);
                
                // Update Airtable
                await updateAirtableRecord(record.id, {
                    'Opdrachtgever': clientName,
                    'Notes': record.fields['Notes'] + `\n\n🤖 AUTO-FILL: Assigned to ${clientName}\nOffer: ${offer}\nMatch Score: ${bestScore.toFixed(2)}\nFilled: ${new Date().toISOString()}`
                });
                
                filled++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                console.log(`❌ No match found for ${studentName}`);
            }
        }
        
        console.log(`\n🎯 Auto-fill complete! Filled ${filled} out of ${missingClients.length} missing assignments`);
        
        if (filled > 0) {
            console.log('\n✅ Updated students:');
            console.log('Dashboard will refresh automatically within 5 seconds');
        }
        
    } catch (error) {
        console.error('❌ Auto-fill failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    autoFillClients()
        .then(() => {
            console.log('\n🏁 Auto-fill completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Auto-fill failed:', error.message);
            process.exit(1);
        });
}

module.exports = { autoFillClients };