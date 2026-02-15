/**
 * Apply GOZ Patch to Catalog
 * 
 * Merges extracted GOZ codes into the existing catalog
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.resolve(__dirname, '../../src/docudent/core/billing/knowledgeBase/kataloge/goz.json');
const PATCH_PATH = path.resolve(__dirname, '../../docs/system-atlas/artifacts/goz-mappe/goz.patch.json');

function main() {
    console.log('📦 Applying GOZ Patch to Catalog\n');

    // Load existing catalog
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    const originalCount = Object.keys(catalog).filter(k => k.startsWith('GOZ_')).length;

    // Load patch
    const patch = JSON.parse(fs.readFileSync(PATCH_PATH, 'utf-8'));
    const patchKeys = Object.keys(patch);
    console.log(`📋 Patch contains ${patchKeys.length} codes\n`);

    let added = 0;
    let skipped = 0;
    const addedCodes: string[] = [];

    for (const code of patchKeys) {
        // Check if code already exists
        const existsExact = catalog[code] !== undefined;

        // Also check non-normalized variant (PHANTOM_REMOVED vs GOZ_0520)
        const nummer = patch[code].nummer;
        const altCode = `GOZ_${parseInt(nummer, 10)}`;  // Strip leading zeros
        const existsAlt = catalog[altCode] !== undefined;

        if (existsExact || existsAlt) {
            skipped++;
            continue;
        }

        // Add to catalog
        catalog[code] = {
            id: code,
            system: 'GOZ',
            nummer: patch[code].nummer,
            bezeichnung: patch[code].bezeichnung,
            ...(patch[code].beschreibung && { beschreibung: patch[code].beschreibung }),
            kategorie: patch[code].kategorie || 'sonstige'
        };
        added++;
        addedCodes.push(code);
    }

    console.log(`✅ Added: ${added} new codes`);
    console.log(`⏭  Skipped: ${skipped} (already exist)\n`);

    // Save updated catalog
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 4));
    console.log(`📄 Updated: ${CATALOG_PATH}`);

    const newCount = Object.keys(catalog).filter(k => k.startsWith('GOZ_')).length;
    console.log(`   Codes before: ${originalCount}`);
    console.log(`   Codes after: ${newCount}\n`);

    // Print first 20 added
    if (addedCodes.length > 0) {
        console.log('🆕 Added codes (first 20):');
        addedCodes.slice(0, 20).forEach(c => console.log(`   - ${c}: ${catalog[c]?.bezeichnung}`));
        if (addedCodes.length > 20) {
            console.log(`   ... and ${addedCodes.length - 20} more`);
        }
    }
}

main();
