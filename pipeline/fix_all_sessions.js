// DIRECT UPDATE van ALLE bestaande sessions met coach namen

// Coach mapping
const COACH_MAPPING = {
    'QVT1WQoi42eQHNevpiRL': 'Nabil',
    'jLMpKPPJNUc3HsHgBQX4': 'Nora',
    '7kYzWQljdJw495PGgf4a': 'Melvin',
    'bFJxyTSxKgHgx2EqVe9H': 'Melvin',
    '6zNaabgLvnwZWVwfOoS7': 'Coach #1',
    'N4eGG26wBxosATkCBnCD': 'Coach #2', 
    'vXkcrN7DRwV6KcYnz5Q1': 'Coach #3',
    null: 'Systeem',
    '': 'Systeem'
};

// Isabella's specifieke GoHighLevel data
const ISABELLA_NOTES = {
    '2026-03-19': { userId: 'QVT1WQoi42eQHNevpiRL' }, // Nabil
    '2026-02-16': { userId: null }, // Systeem
    '2026-02-11': { userId: null }, // Systeem  
    '2026-01-30': { userId: null }, // Systeem
    '2026-01-15': { userId: null }, // Systeem
    '2026-01-06': { userId: 'jLMpKPPJNUc3HsHgBQX4' } // Nora
};

// Kyle's GoHighLevel data
const KYLE_NOTES = {
    '2026-02-11': { userId: null }, // Systeem
    '2026-02-02': { userId: null }  // Systeem
};

function getCoachName(userId) {
    return COACH_MAPPING[userId] || 'Onbekend';
}

// Update Isabella's sessions
console.log('🔧 Updating Isabella Nicholson sessions...');
const isabellaKey = 'wolf-pack-sessions-Isabella Nicholson';
let isabellaSessions = JSON.parse(localStorage.getItem(isabellaKey) || '[]');

isabellaSessions.forEach((session, index) => {
    const sessionDate = session.date;
    const matchedNote = ISABELLA_NOTES[sessionDate];
    
    if (matchedNote) {
        session.coachName = getCoachName(matchedNote.userId);
        console.log(`✅ Isabella ${sessionDate}: ${session.coachName}`);
    } else {
        session.coachName = 'Onbekend';
    }
});

localStorage.setItem(isabellaKey, JSON.stringify(isabellaSessions));
console.log(`✅ Isabella: ${isabellaSessions.length} sessions updated`);

// Update Kyle's sessions  
console.log('🔧 Updating Kyle Dowling sessions...');
const kyleKey = 'wolf-pack-sessions-Kyle Dowling';
let kyleSessions = JSON.parse(localStorage.getItem(kyleKey) || '[]');

kyleSessions.forEach((session, index) => {
    const sessionDate = session.date;
    const matchedNote = KYLE_NOTES[sessionDate];
    
    if (matchedNote) {
        session.coachName = getCoachName(matchedNote.userId);
        console.log(`✅ Kyle ${sessionDate}: ${session.coachName}`);
    } else {
        session.coachName = 'Systeem';
    }
});

localStorage.setItem(kyleKey, JSON.stringify(kyleSessions));
console.log(`✅ Kyle: ${kyleSessions.length} sessions updated`);

// Update ALLE andere studenten met sessions
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('wolf-pack-sessions-') && 
        !key.includes('Isabella') && !key.includes('Kyle')) {
        
        const studentName = key.replace('wolf-pack-sessions-', '');
        let sessions = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (sessions.length > 0) {
            let updated = false;
            sessions.forEach((session, index) => {
                if (!session.coachName) {
                    session.coachName = 'Onbekend';
                    updated = true;
                }
            });
            
            if (updated) {
                localStorage.setItem(key, JSON.stringify(sessions));
                console.log(`✅ ${studentName}: ${sessions.length} sessions updated`);
            }
        }
    }
});

console.log('🎉 ALL SESSIONS UPDATED WITH COACH NAMES!');
return 'COMPLETE: All existing sessions now have coach names';

