/**
 * WOLF PACK SHARED COACHING SYNC SOLUTION
 * Probleem: Coaches zien elkaars coaching notes niet
 * Oplossing: Real-time centralized sync via Airtable
 */

// STAP 1: Vervang localStorage met Airtable als single source of truth
class SharedCoachingSync {
    constructor() {
        this.AIRTABLE_BASE = 'appFR2ovH2m5XN6I3';
        this.AIRTABLE_TABLE = 'Coaching Pipeline'; // Use existing table
        this.AIRTABLE_TOKEN = 'patMqfWUIjB5TmChpZ.f91b8c97c62bb9ade6bfd5f62ee47b14c8dc5a76cbe0b36bb96f3a27f1c8b8e6';
        
        // Real-time sync interval (5 seconden)
        this.syncInterval = null;
        this.lastSyncTime = Date.now();
    }

    // STAP 2: Upload alle coaching sessies naar Airtable (shared database)
    async uploadSessionToAirtable(studentName, sessionData, coachName) {
        try {
            console.log(`📤 Uploading session: ${studentName} by ${coachName}`);
            
            const record = {
                fields: {
                    'Student Name': studentName,
                    'Coach': coachName,
                    'Session Date': sessionData.date,
                    'Subject': sessionData.subject || '',
                    'Notes': sessionData.notes || '',
                    'What Went Well': sessionData.good || '',
                    'What Went Wrong': sessionData.bad || '',
                    'Fathom Link': sessionData.link || '',
                    'Created At': new Date().toISOString(),
                    'Last Modified By': coachName,
                    'Sync Status': 'SHARED'
                }
            };

            const response = await fetch(`https://api.airtable.com/v0/${this.AIRTABLE_BASE}/${encodeURIComponent(this.AIRTABLE_TABLE)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(record)
            });

            if (response.ok) {
                console.log(`✅ Session uploaded: ${studentName} by ${coachName}`);
                return true;
            } else {
                console.error('❌ Upload failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            return false;
        }
    }

    // STAP 3: Download alle coaching sessies van alle coaches
    async downloadAllSessions() {
        try {
            console.log('📥 Downloading all shared coaching sessions...');
            
            const response = await fetch(`https://api.airtable.com/v0/${this.AIRTABLE_BASE}/${encodeURIComponent(this.AIRTABLE_TABLE)}`, {
                headers: {
                    'Authorization': `Bearer ${this.AIRTABLE_TOKEN}`
                }
            });

            if (!response.ok) {
                console.error('❌ Download failed:', response.status);
                return {};
            }

            const data = await response.json();
            console.log(`✅ Downloaded ${data.records.length} shared sessions`);
            
            // Groepeer per student
            const sessionsByStudent = {};
            
            data.records.forEach(record => {
                const fields = record.fields;
                const studentName = fields['Student Name'];
                
                if (studentName) {
                    if (!sessionsByStudent[studentName]) {
                        sessionsByStudent[studentName] = [];
                    }
                    
                    sessionsByStudent[studentName].push({
                        id: record.id,
                        date: fields['Session Date'],
                        subject: fields['Subject'],
                        coach: fields['Coach'],
                        notes: fields['Notes'],
                        good: fields['What Went Well'],
                        bad: fields['What Went Wrong'],
                        link: fields['Fathom Link'],
                        createdBy: fields['Last Modified By'],
                        createdAt: fields['Created At']
                    });
                }
            });

            return sessionsByStudent;
        } catch (error) {
            console.error('❌ Download error:', error);
            return {};
        }
    }

    // STAP 4: Real-time sync elke 5 seconden
    startRealTimeSync() {
        console.log('🔄 Starting real-time coaching sync...');
        
        this.syncInterval = setInterval(async () => {
            try {
                // Download fresh data van alle coaches
                const allSessions = await this.downloadAllSessions();
                
                // Update UI met nieuwe data
                window.updateCoachingSessions(allSessions);
                
                console.log('🔄 Real-time sync completed');
            } catch (error) {
                console.error('❌ Real-time sync error:', error);
            }
        }, 5000); // Elke 5 seconden
    }

    // STAP 5: Stop sync
    stopRealTimeSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Real-time sync stopped');
        }
    }

    // STAP 6: Migratie functie - verplaats localStorage naar Airtable
    async migrateLocalDataToShared() {
        console.log('🔄 Migrating local coaching data to shared database...');
        
        try {
            // Lees huidige localStorage data
            const studentData = JSON.parse(localStorage.getItem('studentData') || '{}');
            let migrated = 0;
            
            for (const [studentName, data] of Object.entries(studentData)) {
                if (data.sessions && data.sessions.length > 0) {
                    for (const session of data.sessions) {
                        const success = await this.uploadSessionToAirtable(
                            studentName, 
                            session, 
                            session.coach || 'Unknown Coach'
                        );
                        if (success) migrated++;
                    }
                }
            }
            
            console.log(`✅ Migration completed: ${migrated} sessions migrated`);
            return migrated;
        } catch (error) {
            console.error('❌ Migration error:', error);
            return 0;
        }
    }
}

// STAP 7: Globale functie voor UI updates
window.updateCoachingSessions = function(allSessions) {
    console.log('🔄 Updating UI with shared sessions:', Object.keys(allSessions).length, 'students');
    
    // Update de coaching sessies voor elke student in de UI
    for (const [studentName, sessions] of Object.entries(allSessions)) {
        const studentCard = document.querySelector(`[data-student="${studentName}"]`);
        if (studentCard) {
            // Update de sessie count badge
            const badge = studentCard.querySelector('.session-count');
            if (badge) {
                badge.textContent = sessions.length;
                badge.style.display = sessions.length > 0 ? 'inline' : 'none';
            }
        }
    }
    
    // Update de detail panel als die open is
    const detailPanel = document.getElementById('studentDetailPanel');
    if (detailPanel && detailPanel.style.right === '0px') {
        const studentName = detailPanel.dataset.currentStudent;
        if (studentName && allSessions[studentName]) {
            window.renderCoachingSessions(studentName, allSessions[studentName]);
        }
    }
};

// STAP 8: Initialize shared coaching system
window.sharedCoachingSync = new SharedCoachingSync();

console.log('🚀 Wolf Pack Shared Coaching System loaded!');
console.log('📋 Available functions:');
console.log('- window.sharedCoachingSync.startRealTimeSync()');
console.log('- window.sharedCoachingSync.migrateLocalDataToShared()');
console.log('- window.sharedCoachingSync.uploadSessionToAirtable(student, data, coach)');