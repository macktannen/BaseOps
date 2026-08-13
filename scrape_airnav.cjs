const fs = require('fs');

const airportsPath = './src/data/airports.json';
let airports = [];
try {
    airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
} catch (e) {
    console.error("Could not read airports.json", e);
    process.exit(1);
}

// Helper to pause
const delay = ms => new Promise(res => setTimeout(res, ms));

async function scrapeAirports() {
    console.log(`Starting scraper for ${airports.length} airports...`);
    let updatedCount = 0;
    
    for (let i = 0; i < airports.length; i++) {
        const ap = airports[i];
        if (!ap.id.startsWith('K')) continue; // Ensure we only scrape US public

        console.log(`[${i+1}/${airports.length}] Fetching ${ap.id}...`);
        
        try {
            const res = await fetch(`https://www.airnav.com/airport/${ap.id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            
            if (!res.ok) {
                console.log(`  Failed to fetch ${ap.id}: ${res.status}`);
                await delay(500);
                continue;
            }

            const html = await res.text();
            const text = html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n');
            
            // Look for Manager Address
            const managerMatch = text.match(/Manager:(?:&nbsp;)?\s*\n([^\n]*)\n([^\n]*)\n(.*?,\s*[A-Z]{2}\s*\d{5})/i) || 
                                 text.match(/Owner:(?:&nbsp;)?\s*\n([^\n]*)\n([^\n]*)\n(.*?,\s*[A-Z]{2}\s*\d{5})/i);

            if (managerMatch) {
                const street = managerMatch[2].trim();
                const cityStateZip = managerMatch[3].trim(); // e.g. "VALPARAISO, IN 46383"
                
                // Parse City, State, Zip
                const cszMatch = cityStateZip.match(/(.*?),\s*([A-Z]{2})\s*(\d{5})/i);
                
                if (cszMatch) {
                    ap.addressStreet = street;
                    ap.addressCity = cszMatch[1].trim();
                    ap.addressState = cszMatch[2].trim();
                    ap.addressZip = cszMatch[3].trim();
                    console.log(`  -> Found: ${ap.addressStreet}, ${ap.addressCity}, ${ap.addressState} ${ap.addressZip}`);
                    updatedCount++;
                } else {
                    console.log(`  -> Could not parse City/State/Zip: ${cityStateZip}`);
                }
            } else {
                console.log(`  -> No Manager or Owner address found.`);
            }
            
        } catch (e) {
            console.error(`  Error processing ${ap.id}:`, e.message);
        }

        // Wait a bit to prevent rate-limiting (250ms)
        await delay(250);
        
        // Save periodically
        if (updatedCount > 0 && updatedCount % 20 === 0) {
            fs.writeFileSync(airportsPath, JSON.stringify(airports, null, 2));
        }
    }
    
    // Final save
    fs.writeFileSync(airportsPath, JSON.stringify(airports, null, 2));
    console.log(`Done! Updated ${updatedCount} airports with physical addresses.`);
}

scrapeAirports();
