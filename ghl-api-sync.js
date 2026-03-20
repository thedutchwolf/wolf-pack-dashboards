// GoHighLevel API Direct Sync
// Scrapes all notes directly from GHL API and syncs to dashboard

const GHL_CONFIG = {
    token: 'pit-675ce2bb-9c7a-45d6-b16f-08406188ef7a',
    locationId: 'RpdMIs3RaHMaGTtxCPO1',
    pipelineId: 'KzImMeHjt4supoK0DP0Q',
    baseUrl: 'https://services.leadconnectorhq.com'
};

// Function to get all opportunities from GHL API
async function getAllOpportunities() {
    const url = `${GHL_CONFIG.baseUrl}/opportunities/search?location_id=${GHL_CONFIG.locationId}&pipeline_id=${GHL_CONFIG.pipelineId}&limit=100`;
    
    console.log('🔄 Fetching opportunities from GoHighLevel...');
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GHL_CONFIG.token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
        }
    });
    
    if (!response.ok) {
        throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.opportunities?.length || 0} opportunities`);
    return data.opportunities || [];
}

// Function to get notes for a specific contact
async function getContactNotes(contactId) {
    const url = `${GHL_CONFIG.baseUrl}/contacts/${contactId}/notes`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GHL_CONFIG.token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
        }
    });
    
    if (!response.ok) {
        console.warn(`⚠️ Could not fetch notes for contact ${contactId}: ${response.status}`);
        return [];
    }
    
    const data = await response.json();
    return data.notes || [];
}

// Main sync function
async function syncGoHighLevelNotes() {
    console.log('🚀 Starting GoHighLevel API sync...');
    
    try {
        // Get all opportunities
        const opportunities = await getAllOpportunities();
        
        const allNotes = {};
        let totalNotes = 0;
        
        for (const opp of opportunities) {
            if (!opp.contact) continue;
            
            const studentName = opp.name || opp.contact.name || 'Unknown';
            console.log(`📝 Processing: ${studentName}`);
            
            // Get notes from customFields (this is where GHL stores the notes data)
            const notes = [];
            if (opp.customFields && opp.customFields.length > 0) {
                opp.customFields.forEach((field, index) => {
                    if (field.fieldValueString && field.fieldValueString.length > 50) {
                        // This looks like notes content
                        notes.push({
                            id: `ghl_${opp.id}_${index}`,
                            body: field.fieldValueString,
                            bodyText: field.fieldValueString.replace(/<[^>]*>/g, ''), // Strip HTML
                            userId: 'GHL_SYNC',
                            dateAdded: opp.updatedAt || opp.createdAt,
                            contactId: opp.contact.id,
                            title: 'GoHighLevel Opportunity Notes',
                            color: 'blue'
                        });
                    }
                });
            }
            
            // ALSO get Contact Notes (this is where the detailed coaching notes are!)
            try {
                const contactNotes = await getContactNotes(opp.contact.id);
                if (contactNotes.length > 0) {
                    contactNotes.forEach(note => {
                        notes.push({
                            id: note.id,
                            body: note.body,
                            bodyText: note.bodyText || note.body?.replace(/<[^>]*>/g, ''),
                            userId: note.userId || 'GHL_CONTACT',
                            dateAdded: note.dateAdded,
                            contactId: opp.contact.id,
                            title: note.title || 'Coaching Notes',
                            color: note.color || 'yellow'
                        });
                    });
                    console.log(`  ✅ ${contactNotes.length} contact notes found`);
                }
            } catch (error) {
                console.warn(`  ⚠️ Could not get contact notes: ${error.message}`);
            }
            
            if (notes.length > 0) {
                allNotes[studentName] = notes;
                totalNotes += notes.length;
                console.log(`  ✅ Total: ${notes.length} notes (customFields + contact notes)`);
            } else {
                console.log(`  ⚠️ No notes found`);
            }
            
            // Rate limiting - small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`\n🎉 Sync complete!`);
        console.log(`📊 Students with notes: ${Object.keys(allNotes).length}`);
        console.log(`📝 Total notes: ${totalNotes}`);
        
        // Save to file
        const outputData = `// GoHighLevel Notes - Direct API Sync
// Generated: ${new Date().toISOString()}
// Students: ${Object.keys(allNotes).length}
// Total Notes: ${totalNotes}

window.WOLF_PACK_NOTES = ${JSON.stringify(allNotes, null, 2)};`;
        
        // Write to ghl-notes.js
        const fs = require('fs');
        fs.writeFileSync('ghl-notes.js', outputData);
        
        console.log('✅ Notes saved to ghl-notes.js');
        console.log('\n📋 Sample students with notes:');
        Object.keys(allNotes).slice(0, 5).forEach(student => {
            console.log(`  • ${student}: ${allNotes[student].length} notes`);
        });
        
        return allNotes;
        
    } catch (error) {
        console.error('❌ Sync failed:', error);
        throw error;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { syncGoHighLevelNotes, getAllOpportunities, getContactNotes };
} else {
    window.syncGoHighLevelNotes = syncGoHighLevelNotes;
}

console.log('🔧 GoHighLevel API sync loaded. Call syncGoHighLevelNotes() to execute.');