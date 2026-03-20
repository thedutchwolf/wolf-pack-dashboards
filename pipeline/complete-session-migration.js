// Complete Session Migration for ALL Students
// This migrates all existing sessions to the new Notes structure

console.log('🔄 Starting COMPLETE session migration for ALL students...');

// Function to migrate all localStorage session data
function migrateAllStudentSessions() {
    let totalStudents = 0;
    let totalSessionsMigrated = 0;
    
    // Get all localStorage keys that match student session pattern
    const sessionKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wolf-pack-sessions-')
    );
    
    console.log(`📊 Found ${sessionKeys.length} students with sessions`);
    
    sessionKeys.forEach(key => {
        const studentName = key.replace('wolf-pack-sessions-', '');
        totalStudents++;
        
        try {
            const sessions = JSON.parse(localStorage.getItem(key) || '[]');
            let sessionsMigrated = 0;
            
            // Migrate each session
            const migratedSessions = sessions.map((session, index) => {
                // Always ensure there's a notes field
                if (!session.notes) {
                    // If there's content in 'good' that looks like notes, move it
                    const goodContent = (session.good || '').trim();
                    
                    if (goodContent && goodContent.length > 0) {
                        // Move all good content to notes
                        session.notes = goodContent;
                        session.good = ''; // Clear the good field
                        sessionsMigrated++;
                        console.log(`  ✅ ${studentName} - Session ${index + 1}: Migrated notes`);
                    } else {
                        // No content, but add empty notes field
                        session.notes = '';
                    }
                }
                return session;
            });
            
            // Save migrated sessions back to localStorage
            localStorage.setItem(key, JSON.stringify(migratedSessions));
            totalSessionsMigrated += sessionsMigrated;
            
            if (sessionsMigrated > 0) {
                console.log(`📝 ${studentName}: ${sessionsMigrated}/${sessions.length} sessions migrated`);
            }
            
        } catch (error) {
            console.error(`❌ Error migrating ${studentName}:`, error);
        }
    });
    
    console.log(`✅ MIGRATION COMPLETE!`);
    console.log(`📊 Summary: ${totalSessionsMigrated} sessions migrated across ${totalStudents} students`);
    
    return { totalStudents, totalSessionsMigrated };
}

// Add this function to window so we can call it
window.migrateAllStudentSessions = migrateAllStudentSessions;

console.log('🔧 Migration function loaded. Call migrateAllStudentSessions() to execute.');