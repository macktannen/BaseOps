const fs = require('fs');
const https = require('https');
const { parse } = require('csv-parse/sync');

const url = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const outputFile = './src/data/airports.json';

// Ensure data dir exists
if (!fs.existsSync('./src/data')){
    fs.mkdirSync('./src/data');
}

console.log('Downloading airports data...');
https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Download complete. Parsing CSV...');
        
        try {
            const records = parse(data, {
                columns: true,
                skip_empty_lines: true
            });
            
            const inOhAirports = records
                .filter(record => 
                    (record.iso_region === 'US-IN' || record.iso_region === 'US-OH') && 
                    record.ident.startsWith('K')
                )
                .map(record => ({
                    id: record.ident,
                    type: record.type,
                    name: record.name,
                    lat: parseFloat(record.latitude_deg),
                    lon: parseFloat(record.longitude_deg),
                    municipality: record.municipality,
                    state: record.iso_region === 'US-IN' ? 'IN' : 'OH'
                }));
            
            fs.writeFileSync(outputFile, JSON.stringify(inOhAirports, null, 2));
            console.log(`Saved ${inOhAirports.length} IN/OH airports to ${outputFile}`);
        } catch (e) {
            console.error('Error parsing CSV:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching airports:', err.message);
});
