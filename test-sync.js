#!/usr/bin/env node

/**
 * Test Wolf Pack API Sync
 * 
 * Usage: node test-sync.js
 */

const { syncClosers } = require('./api-sync-bridge');

console.log('🧪 Testing Wolf Pack API → Airtable sync...');
console.log('This will check for new closers from the last 24 hours\n');

syncClosers()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        console.log('\n📋 What this sync does:');
        console.log('1. Fetches recent closers from Wolf Pack API');
        console.log('2. Checks if they are already in Airtable');
        console.log('3. Adds new closers to "Signed Closer" pipeline stage');
        console.log('4. Syncs automatically to coaching dashboard');
        console.log('\n🎯 Result: New closers appear in pipeline within seconds!');
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });