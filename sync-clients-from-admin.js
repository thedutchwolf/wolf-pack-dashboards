const fs = require('fs');
const path = require('path');

// Extract client names from the Wolf Pack Admin API response
const clientsFromAdminAPI = [
    "Skyrix Consultancy",
    "Wolf of Washington", 
    "SheCom",
    "Abundance Academy",
    "Ecomgoats",
    "Elite Club",
    "The Founderdownload",
    "Barakah Arbitrage",
    "JobMarketingNederland",
    "Ecombase.community",
    "Valori International",
    "Jisk Hoogeboom",
    "Agenty Society",
    "No Sheeps Acedemy",
    "Martine Posthuma",
    "Anders Ecommerce",
    "Social Recruitment Academy",
    "Ecom Kaper",
    "Volty Banks",
    "Entreproneur",
    "Agency UAE"
];

console.log(`🎯 Found ${clientsFromAdminAPI.length} clients from Wolf Pack Admin API`);

// Read the pipeline index file
const pipelineFile = path.join(__dirname, 'pipeline', 'index.html');
let content = fs.readFileSync(pipelineFile, 'utf8');

// Update the clients array in the JavaScript section
const updatedClientsArray = `const clients = [
${clientsFromAdminAPI.map(client => `    "${client}"`).join(',\n')}
];`;

// Replace the old clients array with the new one
content = content.replace(
    /const clients = \[[\s\S]*?\];/,
    updatedClientsArray
);

// Write back to file
fs.writeFileSync(pipelineFile, content, 'utf8');

console.log('✅ Successfully updated coaching pipeline with Wolf Pack Admin clients');
console.log(`📊 Client count: ${clientsFromAdminAPI.length} (matching Wolf Pack Admin)`);

// Also create a JSON file for reference
const clientsData = {
    lastUpdated: new Date().toISOString(),
    source: 'Wolf Pack Admin API',
    totalClients: clientsFromAdminAPI.length,
    clients: clientsFromAdminAPI.map((name, index) => ({
        id: index + 1,
        name: name
    }))
};

fs.writeFileSync(
    path.join(__dirname, 'clients-sync.json'), 
    JSON.stringify(clientsData, null, 2),
    'utf8'
);

console.log('📄 Created clients-sync.json reference file');
console.log('🚀 Client sync completed successfully!');