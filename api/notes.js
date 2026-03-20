#!/usr/bin/env node
/**
 * Simple API server to serve Wolf Pack coaching notes
 * Run with: node notes.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8086;
const NOTES_FILE = '/Users/macmini/.openclaw/workspace/wolf-pack-notes.json';

// Load notes data
let notesData = {};
try {
  const data = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  // Convert array to object keyed by student name
  data.forEach(student => {
    notesData[student.name] = student.notes || [];
  });
  console.log(`✅ Loaded notes for ${Object.keys(notesData).length} students`);
} catch (error) {
  console.error('❌ Failed to load notes:', error.message);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/notes' && req.method === 'GET') {
    // Return all notes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notesData));
  } else if (req.url.startsWith('/api/notes/') && req.method === 'GET') {
    // Return notes for specific student
    const studentName = decodeURIComponent(req.url.replace('/api/notes/', ''));
    const notes = notesData[studentName] || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🐺 Wolf Pack Notes API running on http://localhost:${PORT}`);
  console.log(`   GET /api/notes - All notes`);
  console.log(`   GET /api/notes/{studentName} - Notes for specific student`);
});
