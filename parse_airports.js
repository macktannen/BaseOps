import fs from 'fs';
import { parse } from 'csv-parse/sync';

const run = () => {
  const content = fs.readFileSync('airports.csv', 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });

  const usAirports = records.filter(r => 
    r.iso_country === 'US' && 
    ['small_airport', 'medium_airport', 'large_airport'].includes(r.type) &&
    r.ident && r.ident.length >= 3
  );

  const formatted = usAirports.map(r => ({
    id: r.ident,
    type: r.type,
    name: r.name,
    lat: parseFloat(r.latitude_deg),
    lon: parseFloat(r.longitude_deg),
    municipality: r.municipality,
    state: r.iso_region ? r.iso_region.split('-')[1] : ''
  }));

  fs.writeFileSync('src/data/airports.json', JSON.stringify(formatted, null, 2));
  console.log(`Wrote ${formatted.length} airports to src/data/airports.json`);
};

run();
