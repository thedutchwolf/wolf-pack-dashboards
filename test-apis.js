#!/usr/bin/env node

/**
 * Test all APIs to identify sync issues
 */

const https = require('https');

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
    }
};

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject({
                error: error.message,
                url: url
            });
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function testWolfPackAPI() {
    console.log('\n🐺 Testing Wolf Pack API...');
    
    try {
        // Test clients endpoint
        console.log('📋 Testing /client endpoint...');
        const clientsResponse = await makeRequest(
            `${CONFIG.WOLF_PACK_API.baseURL}/client`,
            {
                headers: {
                    'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`   Status: ${clientsResponse.statusCode}`);
        if (clientsResponse.data?.success) {
            console.log(`   ✅ Found ${clientsResponse.data.data?.data?.length || 0} clients`);
            if (clientsResponse.data.data?.data?.length > 0) {
                console.log(`   📄 Sample client:`, clientsResponse.data.data.data[0].name);
            }
        } else {
            console.log(`   ❌ Error:`, clientsResponse.data);
        }
        
        // Test closers endpoint
        console.log('🎯 Testing /closer endpoint...');
        const closersResponse = await makeRequest(
            `${CONFIG.WOLF_PACK_API.baseURL}/closer?limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${CONFIG.WOLF_PACK_API.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`   Status: ${closersResponse.statusCode}`);
        if (closersResponse.data?.success) {
            console.log(`   ✅ Found ${closersResponse.data.data?.data?.length || 0} closers`);
            if (closersResponse.data.data?.data?.length > 0) {
                console.log(`   📄 Sample closer:`, closersResponse.data.data.data[0]);
            }
        } else {
            console.log(`   ❌ Error:`, closersResponse.data);
        }
        
    } catch (error) {
        console.log('❌ Wolf Pack API Error:', error);
    }
}

async function testAirtableAPI() {
    console.log('\n🗂️ Testing Airtable API...');
    
    try {
        const url = `https://api.airtable.com/v0/${CONFIG.AIRTABLE_API.base}/${encodeURIComponent(CONFIG.AIRTABLE_API.table)}?maxRecords=5`;
        const response = await makeRequest(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.AIRTABLE_API.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log(`   ✅ Found ${response.data.records?.length || 0} records`);
            if (response.data.records?.length > 0) {
                console.log(`   📄 Sample fields:`, Object.keys(response.data.records[0].fields));
                console.log(`   📄 Sample record:`, response.data.records[0].fields['Student Name']);
            }
        } else {
            console.log(`   ❌ Error:`, response.data);
        }
        
    } catch (error) {
        console.log('❌ Airtable API Error:', error);
    }
}

async function testPipelineDashboard() {
    console.log('\n🌐 Testing Pipeline Dashboard...');
    
    try {
        const url = 'https://aurelio-bountiful-pilar.ngrok-free.dev/pipeline/';
        const response = await makeRequest(url, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        console.log(`   Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log(`   ✅ Pipeline dashboard accessible`);
            const htmlContent = response.data;
            if (htmlContent.includes('adminClients')) {
                console.log(`   ✅ Client dropdown found in dashboard`);
            } else {
                console.log(`   ⚠️ Client dropdown not found`);
            }
        } else {
            console.log(`   ❌ Error: Status ${response.statusCode}`);
            console.log(`   Response:`, response.data.substring(0, 200));
        }
        
    } catch (error) {
        console.log('❌ Pipeline Dashboard Error:', error);
    }
}

async function runTests() {
    console.log('🧪 Wolf Pack Sync System API Test');
    console.log('==================================');
    
    await testWolfPackAPI();
    await testAirtableAPI();
    await testPipelineDashboard();
    
    console.log('\n✅ API Tests Complete');
}

runTests().catch(console.error);