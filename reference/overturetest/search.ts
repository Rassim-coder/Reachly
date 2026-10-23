import * as fs from 'fs';
import { runSearch } from './query';

/**
 * CLI search: `npm run search -- "<niche>" "<city>" "<country>"`
 * e.g. `npm run search -- "car dealer" Algiers Algeria`
 */

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(`Usage: npm run search -- "<niche>" "<city>" "<country>"
  e.g. npm run search -- "car dealer" "Algiers" "Algeria"
       npm run search -- dentist Oran Algeria`);
  process.exit(2);
}

const [niche, city, country] = args;

async function main() {
  const res = await runSearch({ niche, city, country });

  console.log('============================================');
  console.log(`Release:       ${res.release}`);
  console.log(`Search:        niche="${niche}"  city="${city}"  country="${country}"`);
  console.log(`Resolved city: ${res.cityInfo.exactName} (${res.cityInfo.countryCode}, admin_level=${res.cityInfo.adminLevel})`);
  console.log(`Bounding box:  ${res.bbox.minLon},${res.bbox.minLat} .. ${res.bbox.maxLon},${res.bbox.maxLat}`);
  console.log(`Categories:    ${res.matchedCategories.join(', ') || '(none)'}`);
  if (res.matchedCategories.length === 0) {
    console.log('  No category matched the niche in this city. Most common categories here:');
    res.suggestions.slice(0, 12).forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
  }
  console.log('--------------------------------------------');
  console.log(`Total matching places:    ${res.stats.total}`);
  console.log(`With a phone number:      ${res.stats.withPhone}   <-- key number for lead-gen`);
  console.log(`With a website:           ${res.stats.withWebsite}`);
  console.log(`With an email:            ${res.stats.withEmail}`);
  console.log('============================================');

  const outFile = process.env.OUT_FILE || res.outFile;
  fs.writeFileSync(outFile, JSON.stringify(res.rows, null, 2), 'utf-8');
  console.log(`Saved ${res.stats.total} rows to ${outFile}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});