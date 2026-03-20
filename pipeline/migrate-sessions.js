// Migration script to move notes from "good" field to new "notes" field
// This handles all existing sessions for all students

console.log('🔄 Starting session migration...');

// Function to migrate localStorage data
function migrateLocalStorageData() {
    console.log('📊 Migrating localStorage session data...');
    
    let totalMigrated = 0;
    let studentsProcessed = 0;
    
    // Get all localStorage keys that match student session pattern
    const sessionKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wolf-pack-sessions-')
    );
    
    sessionKeys.forEach(key => {
        const studentName = key.replace('wolf-pack-sessions-', '');
        studentsProcessed++;
        
        try {
            const sessions = JSON.parse(localStorage.getItem(key) || '[]');
            let sessionsMigrated = 0;
            
            // Migrate each session
            const migratedSessions = sessions.map(session => {
                // Check if migration is needed
                if (session.good && !session.notes) {
                    // Move content from 'good' to 'notes' if it looks like general notes
                    // (not specifically about what went well)
                    const goodContent = session.good.trim();
                    
                    // If the "good" content looks like general notes (contains dates, links, general info)
                    // then move it to notes
                    const looksLikeNotes = goodContent.match(/📅|https:\/\/|fathom\.video|📝|🎥/) || 
                                          goodContent.length > 200 ||
                                          goodContent.includes('\n');
                    
                    if (looksLikeNotes) {
                        session.notes = goodContent;
                        session.good = ''; // Clear the good field
                        sessionsMigrated++;
                        console.log(`  ✅ Migrated session for ${studentName}: ${session.subject || 'No subject'}`);
                    }
                }
                return session;
            });
            
            // Save migrated sessions back to localStorage
            localStorage.setItem(key, JSON.stringify(migratedSessions));
            totalMigrated += sessionsMigrated;
            
            if (sessionsMigrated > 0) {
                console.log(`📝 ${studentName}: ${sessionsMigrated} sessions migrated`);
            }
            
        } catch (error) {
            console.error(`❌ Error migrating ${studentName}:`, error);
        }
    });
    
    console.log(`✅ Migration complete: ${totalMigrated} sessions migrated across ${studentsProcessed} students`);
    return { totalMigrated, studentsProcessed };
}

// Function to migrate embedded API notes structure
function migrateEmbeddedNotes() {
    console.log('🔄 Processing embedded GoHighLevel notes...');
    
    if (!window.WOLF_PACK_NOTES) {
        console.log('⚠️ No embedded notes found');
        return;
    }
    
    const students = Object.keys(window.WOLF_PACK_NOTES);
    console.log(`📊 Found notes for ${students.length} students:`, students.join(', '));
    
    students.forEach(studentName => {
        const notes = window.WOLF_PACK_NOTES[studentName];
        console.log(`📝 ${studentName}: ${notes.length} GoHighLevel notes available`);
        
        // Convert these notes to proper session format if they aren't already used
        const recentNotes = notes
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 5); // Get 5 most recent
            
        console.log(`  📅 Most recent note: ${new Date(recentNotes[0]?.dateAdded).toLocaleDateString()}`);
    });
}

// Run migration
try {
    const result = migrateLocalStorageData();
    migrateEmbeddedNotes();
    
    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Summary: ${result.totalMigrated} sessions migrated for ${result.studentsProcessed} students`);
    
    // Reload the page to show migrated data
    console.log('🔄 Reloading page to show migrated data...');
    setTimeout(() => {
        window.location.reload();
    }, 2000);
    
} catch (error) {
    console.error('❌ Migration failed:', error);
}