// GoHighLevel Notes Parser
// Extract all notes from CSV and convert to Wolf Pack format

const fs = require('fs');

console.log('🔄 Parsing GoHighLevel notes...');

// Read the CSV file
const csvContent = fs.readFileSync('/Users/macmini/.openclaw/media/inbound/opportunities_1---4d5bac73-54be-450c-ac3a-f9b94508dc28.csv', 'utf-8');

// Simple CSV parser (handles the complex notes field with multiline content)
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const records = [];
    
    let currentRecord = [];
    let insideQuotes = false;
    let currentField = '';
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                currentRecord.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        
        if (!insideQuotes) {
            currentRecord.push(currentField.trim());
            
            if (currentRecord.length >= headers.length) {
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = currentRecord[index] || '';
                });
                records.push(record);
                currentRecord = [];
            }
            currentField = '';
        } else {
            currentField += '\n';
        }
    }
    
    return records;
}

// Parse CSV
const records = parseCSV(csvContent);

console.log(`📊 Found ${records.length} total records`);

// Extract notes for each student
const studentNotes = {};
let totalNotesExtracted = 0;

records.forEach(record => {
    const studentName = record['Contact Name'];
    const notes = record['Notes'];
    const dateUpdated = record['Updated on'];
    const typeformAnswers = record['Typeform Answers'];
    
    if (studentName && (notes || typeformAnswers)) {
        if (!studentNotes[studentName]) {
            studentNotes[studentName] = [];
        }
        
        // Process main notes if they exist
        if (notes && notes.trim() && notes.length > 10) {
            studentNotes[studentName].push({
                id: `ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                body: notes,
                bodyText: notes.replace(/<[^>]*>/g, '').replace(/\&[^;]+;/g, ' '), // Strip HTML
                userId: "GHL_IMPORT",
                dateAdded: dateUpdated || new Date().toISOString(),
                contactId: studentName.replace(/\s+/g, '_').toLowerCase(),
                title: "GoHighLevel Note",
                color: "#e3f2fd"
            });
            totalNotesExtracted++;
        }
        
        // Process Typeform answers if they exist
        if (typeformAnswers && typeformAnswers.trim() && typeformAnswers.length > 10) {
            studentNotes[studentName].push({
                id: `typeform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                body: typeformAnswers,
                bodyText: typeformAnswers.replace(/<[^>]*>/g, '').replace(/\&[^;]+;/g, ' '),
                userId: "TYPEFORM_IMPORT", 
                dateAdded: dateUpdated || new Date().toISOString(),
                contactId: studentName.replace(/\s+/g, '_').toLowerCase(),
                title: "Typeform Responses",
                color: "#fff3e0"
            });
            totalNotesExtracted++;
        }
    }
});

console.log(`📝 Extracted notes for ${Object.keys(studentNotes).length} students`);
console.log(`📋 Total notes extracted: ${totalNotesExtracted}`);

// Generate JavaScript file for the dashboard
const jsOutput = `// GoHighLevel Notes - Auto-generated from CSV export
// Generated: ${new Date().toISOString()}

window.WOLF_PACK_NOTES = ${JSON.stringify(studentNotes, null, 2)};

console.log('📝 GoHighLevel notes loaded for ${Object.keys(studentNotes).length} students');
console.log('📊 Total notes: ${totalNotesExtracted}');
`;

// Write the JavaScript file
fs.writeFileSync('/Users/macmini/.openclaw/workspace/wolf-dashboards/pipeline/ghl-notes.js', jsOutput);

console.log('✅ GoHighLevel notes successfully converted!');
console.log('📄 Output: ghl-notes.js');

// Show sample of extracted data
console.log('\n📋 Sample extracted notes:');
const sampleStudents = Object.keys(studentNotes).slice(0, 3);
sampleStudents.forEach(student => {
    console.log(`\n👤 ${student}: ${studentNotes[student].length} notes`);
    if (studentNotes[student][0]) {
        const firstNote = studentNotes[student][0].bodyText.substring(0, 100);
        console.log(`   📝 First note: ${firstNote}...`);
    }
});

console.log('\n🔧 Next steps:');
console.log('1. Include ghl-notes.js in the dashboard HTML');
console.log('2. Run session migration to move existing notes to Notes field');
console.log('3. Test the auto-fill functionality');