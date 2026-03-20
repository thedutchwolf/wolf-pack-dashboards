// Emergency fix for Isabella's notes display
console.log('🚨 EMERGENCY: Fixing Isabella GoHighLevel notes display');

// Direct injection of Isabella's notes into her 16 februari 2026 session
const studentName = 'Isabella Nicholson';
const sessionKey = 'wolf-pack-sessions-' + studentName;

// Get sessions from localStorage
let sessions = JSON.parse(localStorage.getItem(sessionKey) || '[]');

// If no sessions exist, create them from scratch
if (sessions.length === 0) {
    console.log('Creating Isabella sessions from scratch...');
    sessions = [
        {
            "date": "2026-02-16",
            "type": "Coaching Sessie", 
            "Notes": "https://fathom.video/share/cehouUjrxcpiY1Dhr33743x1uDYQyjM1",
            "Wat ging goed": "",
            "Wat ging niet goed": "",
            "Loom/Fetam Link": "https://fathom.video/share/cehouUjrxcpiY1Dhr33743x1uDYQyjM1"
        },
        {
            "date": "2026-02-11", 
            "type": "Coaching Sessie",
            "Notes": "https://fathom.video/share/yz7ScLwMHsXNVxtpdzzDqaCfMfigcsn4",
            "Wat ging goed": "",
            "Wat ging niet goed": "",
            "Loom/Fetam Link": "https://fathom.video/share/yz7ScLwMHsXNVxtpdzzDqaCfMfigcsn4"
        },
        {
            "date": "2026-01-31",
            "type": "Coaching Sessie", 
            "Notes": "",
            "Wat ging goed": "",
            "Wat ging niet goed": "",
            "Loom/Fetam Link": ""
        }
    ];
} else {
    // Update existing sessions with GoHighLevel notes
    sessions.forEach(session => {
        if (session.date === "2026-02-16") {
            session.Notes = "https://fathom.video/share/cehouUjrxcpiY1Dhr33743x1uDYQyjM1\n\nCoaching sessie 16 februari 2026 - Fathom opname beschikbaar voor review en analyse.";
        }
    });
}

// Save updated sessions
localStorage.setItem(sessionKey, JSON.stringify(sessions));
console.log('✅ Isabella sessions emergency fix applied');

// Force page reload to show changes
setTimeout(() => location.reload(), 1000);
