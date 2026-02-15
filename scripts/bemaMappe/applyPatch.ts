/**
 * Apply BEMA Patch to Catalog
 * 
 * Merges extracted BEMA codes into the existing catalog
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.resolve(__dirname, '../../src/docudent/core/billing/knowledgeBase/kataloge/bema.json');
const PATCH_PATH = path.resolve(__dirname, '../../docs/system-atlas/artifacts/bema-mappe/bema.patch.json');

function main() {
    console.log('📦 Applying BEMA Patch to Catalog\n');

    // Load existing catalog
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    const originalCount = Object.keys(catalog).filter(k => k.startsWith('BEMA_')).length;

    // Load patch
    const patch = JSON.parse(fs.readFileSync(PATCH_PATH, 'utf-8'));
    const patchKeys = Object.keys(patch);
    console.log(`📋 Patch contains ${patchKeys.length} codes\n`);

    let added = 0;
    let skipped = 0;
    const addedCodes: string[] = [];

    for (const code of patchKeys) {
        // Check if code already exists (with or without leading zero)
        const existsExact = catalog[code] !== undefined;

        // Normalize: check variants (BEMA_02 vs BEMA_2)
        const nummer = patch[code].nummer;
        const altCode = nummer.startsWith('0')
            ? `BEMA_${nummer.replace(/^0+/, '')}`  // 02 -> 2
            : `BEMA_0${nummer}`;  // 2 -> 02
        const existsAlt = catalog[altCode] !== undefined;

        if (existsExact || existsAlt) {
            skipped++;
            continue;
        }

        // Add to catalog
        catalog[code] = {
            id: code,
            system: 'BEMA',
            nummer: patch[code].nummer,
            bezeichnung: patch[code].bezeichnung,
            ...(patch[code].beschreibung && { beschreibung: patch[code].beschreibung }),
            ...(patch[code].punkte && { punkte: patch[code].punkte }),
            kategorie: guessCategoryFromCode(code)
        };
        added++;
        addedCodes.push(code);
    }

    console.log(`✅ Added: ${added} new codes`);
    console.log(`⏭  Skipped: ${skipped} (already exist)\n`);

    // Save updated catalog
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    console.log(`📄 Updated: ${CATALOG_PATH}`);

    const newCount = Object.keys(catalog).filter(k => k.startsWith('BEMA_')).length;
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

function guessCategoryFromCode(code: string): string {
    const nummer = code.replace('BEMA_', '').toLowerCase();

    // IP codes = prophylaxe
    if (nummer.startsWith('ip') || nummer.startsWith('fu')) return 'prophylaxe';

    // PAR codes
    if (['atg', 'mhu', 'ait', 'bev', 'upt', 'cpt'].some(p => nummer.startsWith(p))) return 'parodontologie';

    // Ä codes = roentgen or allgemein
    if (nummer.startsWith('ä9')) return 'roentgen';
    if (nummer.startsWith('ä')) return 'allgemein';

    // Number ranges
    const num = parseInt(nummer.replace(/[a-z]/gi, ''), 10);
    if (isNaN(num)) return 'sonstige';

    if (num >= 13 && num <= 26) return 'konservierend';
    if (num >= 28 && num <= 39) return 'endodontie';
    if (num >= 40 && num <= 42) return 'anaesthesie';
    if (num >= 43 && num <= 59) return 'chirurgie';
    if (num >= 60 && num <= 79) return 'chirurgie'; // Parodontalchirurgie
    if (num >= 80 && num <= 99) return 'prothetik';
    if (num >= 100 && num <= 112) return 'prothetik';

    return 'sonstige';
}

main();
