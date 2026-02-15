/**
 * BEMA HTML Extractor
 * 
 * Extracts BEMA codes from local monkeymed HTML files
 * and generates structured JSON data for catalog updates.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_DIR = path.resolve(__dirname, '../../docs/BEMA NEU/BEMA_NEU');
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/system-atlas/artifacts/bema-mappe');

interface BemaItem {
    code: string;           // BEMA_44, BEMA_41a
    nummer: string;         // 44, 41a  
    bezeichnung: string;    // Title
    beschreibung?: string;  // Description
    abrechnungsbestimmungen?: string;
    punkte?: number;
    kategorie?: string;
    source: string;
}

// Extract code from filename like "monkeymed.de_leistungskataloge_bema_44.html"
function extractCodeFromFilename(filename: string): string | null {
    const match = filename.match(/bema_([a-zA-Z0-9äöüÄÖÜ]+)\.html$/i);
    if (!match) return null;
    return match[1];
}

// Parse HTML to extract structured data
function parseHtmlFile(htmlPath: string): BemaItem | null {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const filename = path.basename(htmlPath);

    const nummerFromFile = extractCodeFromFilename(filename);
    if (!nummerFromFile) return null;

    // Skip test/invalid files
    if (nummerFromFile === 'TEST') return null;

    // Extract title from <h1>
    // Pattern: BEMA 13e<br/><span class="text-3xl">Kompositfüllungen...</span>
    let bezeichnung = '';
    let nummerFromHtml = '';

    const h1Match = html.match(/<h1[^>]*>BEMA\s*(?:<!--[^>]*-->)?([a-zA-Z0-9äöüÄÖÜ]+)<br\/?><span[^>]*>([^<]+)<\/span>/i);
    if (h1Match) {
        nummerFromHtml = h1Match[1].trim();
        bezeichnung = h1Match[2].trim();
    } else {
        // Fallback: try simpler pattern
        const simpleH1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (simpleH1) {
            bezeichnung = simpleH1[1].replace(/BEMA\s*[a-zA-Z0-9]+\s*/, '').trim();
        }
    }

    // Extract points from badge
    // Pattern: <span...>52<!-- -->° | <!-- -->67,44<!-- -->€</span>
    let punkte: number | undefined;
    const punkteMatch = html.match(/>(\d+(?:,\d+)?)\s*(?:<!--[^>]*-->)?\s*°/);
    if (punkteMatch) {
        punkte = parseFloat(punkteMatch[1].replace(',', '.'));
    }

    // Extract description
    let beschreibung = '';
    const beschMatch = html.match(/<h2[^>]*>Beschreibung<\/h2><\/div><div[^>]*><div[^>]*>([^<]+)<\/div>/i);
    if (beschMatch) {
        beschreibung = beschMatch[1].trim();
    }

    // Alternative: Look for Beschreibung section
    if (!beschreibung) {
        const altBeschMatch = html.match(/Beschreibung<\/h2>.*?<div[^>]*class="font-light"[^>]*>([^<]+)/is);
        if (altBeschMatch) {
            beschreibung = altBeschMatch[1].trim();
        }
    }

    // Extract Abrechnungsbestimmungen
    let abrechnungsbestimmungen = '';
    const abrMatch = html.match(/Abrechnungsbestimmungen<\/h2>.*?<div[^>]*class="font-light"[^>]*>([^<]+)/is);
    if (abrMatch) {
        abrechnungsbestimmungen = abrMatch[1].trim();
    }

    // Normalize nummer
    const nummer = (nummerFromHtml || nummerFromFile).toLowerCase();
    const code = `BEMA_${nummer}`;

    // Skip if no meaningful content
    if (!bezeichnung && !beschreibung) {
        console.log(`  ⚠ Skipping ${filename}: no content extracted`);
        return null;
    }

    return {
        code,
        nummer,
        bezeichnung: bezeichnung || `BEMA ${nummer}`,
        beschreibung: beschreibung || undefined,
        abrechnungsbestimmungen: abrechnungsbestimmungen || undefined,
        punkte,
        source: 'monkeymed_html'
    };
}

// Main extraction
function extractAll(): BemaItem[] {
    const items: BemaItem[] = [];

    if (!fs.existsSync(HTML_DIR)) {
        console.error(`❌ HTML directory not found: ${HTML_DIR}`);
        return items;
    }

    const files = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));
    console.log(`📂 Found ${files.length} HTML files\n`);

    for (const file of files) {
        const filePath = path.join(HTML_DIR, file);
        try {
            const item = parseHtmlFile(filePath);
            if (item) {
                items.push(item);
            }
        } catch (err) {
            console.error(`  ❌ Error parsing ${file}:`, err);
        }
    }

    // Sort by code
    items.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    return items;
}

// Compare with existing catalog
function compareWithCatalog(items: BemaItem[]): {
    newCodes: string[];
    existingCodes: string[];
    missingInMappe: string[];
} {
    const catalogPath = path.resolve(__dirname, '../../src/docudent/core/billing/knowledgeBase/kataloge/bema.json');
    let catalog: Record<string, any> = {};

    if (fs.existsSync(catalogPath)) {
        catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    }

    const catalogCodes = Object.keys(catalog).filter(k => k.startsWith('BEMA_'));
    const mappeCodes = items.map(i => i.code);

    const newCodes = mappeCodes.filter(c => !catalogCodes.includes(c));
    const existingCodes = mappeCodes.filter(c => catalogCodes.includes(c));
    const missingInMappe = catalogCodes.filter(c => !mappeCodes.includes(c));

    return { newCodes, existingCodes, missingInMappe };
}

// Generate patch for new codes
function generatePatch(items: BemaItem[], newCodes: string[]): Record<string, any> {
    const patch: Record<string, any> = {};

    for (const item of items) {
        if (newCodes.includes(item.code)) {
            patch[item.code] = {
                id: item.code,
                system: 'BEMA',
                nummer: item.nummer,
                bezeichnung: item.bezeichnung,
                ...(item.beschreibung && { beschreibung: item.beschreibung }),
                ...(item.punkte && { punkte: item.punkte }),
                source: item.source
            };
        }
    }

    return patch;
}

// Main
async function main() {
    console.log('🔍 BEMA HTML Extractor\n');
    console.log('==================================================\n');

    // Ensure output dir exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Extract all items
    const items = extractAll();
    console.log(`\n✅ Extracted ${items.length} BEMA items\n`);

    // Compare with catalog
    const { newCodes, existingCodes, missingInMappe } = compareWithCatalog(items);

    console.log('📊 Comparison with existing catalog:');
    console.log(`   - Items in HTML: ${items.length}`);
    console.log(`   - Already in catalog: ${existingCodes.length}`);
    console.log(`   - NEW codes: ${newCodes.length}`);
    console.log(`   - In catalog but not in HTML: ${missingInMappe.length}\n`);

    // Save outputs

    // 1. All items as JSONL
    const jsonlPath = path.join(OUTPUT_DIR, 'bema.items.jsonl');
    fs.writeFileSync(jsonlPath, items.map(i => JSON.stringify(i)).join('\n'));
    console.log(`📄 Saved: ${jsonlPath}`);

    // 2. Index summary
    const indexPath = path.join(OUTPUT_DIR, 'bema.index.json');
    const index = {
        generated_at: new Date().toISOString(),
        total_items: items.length,
        codes: items.map(i => i.code),
        new_codes: newCodes,
        existing_codes: existingCodes,
        missing_in_mappe: missingInMappe
    };
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`📄 Saved: ${indexPath}`);

    // 3. Patch for new codes
    if (newCodes.length > 0) {
        const patch = generatePatch(items, newCodes);
        const patchPath = path.join(OUTPUT_DIR, 'bema.patch.json');
        fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
        console.log(`📄 Saved: ${patchPath}`);

        console.log('\n🆕 New codes to add:');
        newCodes.slice(0, 20).forEach(c => console.log(`   - ${c}`));
        if (newCodes.length > 20) {
            console.log(`   ... and ${newCodes.length - 20} more`);
        }
    }

    // 4. Diff report
    const diffPath = path.join(OUTPUT_DIR, 'diff.report.md');
    let diffMd = `# BEMA Catalog Diff Report\n\n`;
    diffMd += `Generated: ${new Date().toISOString()}\n\n`;
    diffMd += `## Summary\n\n`;
    diffMd += `- Items extracted from HTML: **${items.length}**\n`;
    diffMd += `- Already in catalog: ${existingCodes.length}\n`;
    diffMd += `- **New codes to add: ${newCodes.length}**\n`;
    diffMd += `- In catalog but missing from HTML: ${missingInMappe.length}\n\n`;

    if (newCodes.length > 0) {
        diffMd += `## New Codes\n\n`;
        newCodes.forEach(c => {
            const item = items.find(i => i.code === c);
            diffMd += `### ${c}\n\n`;
            diffMd += `- **Bezeichnung**: ${item?.bezeichnung || '-'}\n`;
            diffMd += `- **Punkte**: ${item?.punkte || '-'}\n\n`;
        });
    }

    if (missingInMappe.length > 0) {
        diffMd += `## Codes in Catalog but not in HTML\n\n`;
        missingInMappe.forEach(c => diffMd += `- ${c}\n`);
    }

    fs.writeFileSync(diffPath, diffMd);
    console.log(`📄 Saved: ${diffPath}`);

    console.log('\n✅ Extraction complete!\n');
}

main().catch(console.error);
