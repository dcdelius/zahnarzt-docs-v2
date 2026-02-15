/**
 * GOZ HTML Extractor
 * 
 * Extracts GOZ codes from local monkeymed HTML files
 * and generates structured JSON data for catalog updates.
 * 
 * GOZ codes are always 4-digit normalized: GOZ_0520 (not PHANTOM_REMOVED)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_DIR = path.resolve(__dirname, '../../docs/GOZ NEU');
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/system-atlas/artifacts/goz-mappe');

interface GozItem {
    id: string;            // GOZ_0520
    system: string;        // GOZ
    nummer: string;        // 0520 (4-digit)
    nummer_raw: string;    // Raw from HTML
    bezeichnung: string;   // Title
    beschreibung?: string;
    abrechnungsbestimmungen?: string;
    punkte?: number;
    kategorie?: string;
    quelle: string;
}

// Normalize GOZ code to 4-digit format
function normalizeGozNummer(raw: string): string {
    const cleaned = raw.replace(/\D/g, '');
    return cleaned.padStart(4, '0');
}

// Extract code from filename like "monkeymed.de_leistungskataloge_goz_0520.html"
function extractCodeFromFilename(filename: string): string | null {
    const match = filename.match(/goz_(\d+)\.html$/i);
    if (!match) return null;
    return match[1];
}

// Extract from <title> tag - format: "GOZ 0010 - U - Eingehende Untersuchung"
function extractFromTitle(html: string): { nummer: string; kurzform: string; bezeichnung: string } | null {
    const titleMatch = html.match(/<title>GOZ\s*(\d+)\s*-\s*([^-]+)\s*-\s*([^<]+)<\/title>/i);
    if (!titleMatch) return null;
    return {
        nummer: titleMatch[1].trim(),
        kurzform: titleMatch[2].trim(),
        bezeichnung: titleMatch[3].trim()
    };
}

// Parse HTML to extract structured data
function parseHtmlFile(htmlPath: string): GozItem | null {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const filename = path.basename(htmlPath);

    const nummerRawFromFile = extractCodeFromFilename(filename);
    if (!nummerRawFromFile) return null;

    // Extract title from <h1>
    // Pattern: GOZ 0520<br/><span class="text-3xl">OP-Zuschlag...</span>
    let bezeichnung = '';
    let nummerRawFromHtml = '';

    const h1Match = html.match(/<h1[^>]*>GOZ\s*(?:<!--[^>]*-->)?(\d+)<br\/?><span[^>]*>([^<]+)<\/span>/i);
    if (h1Match) {
        nummerRawFromHtml = h1Match[1].trim();
        bezeichnung = h1Match[2].trim();
    } else {
        // Fallback: try to find title in other patterns
        const altH1 = html.match(/<h1[^>]*>GOZ\s*(\d+).*?<span[^>]*class="[^"]*text-3xl[^"]*"[^>]*>([^<]+)/is);
        if (altH1) {
            nummerRawFromHtml = altH1[1].trim();
            bezeichnung = altH1[2].trim();
        }
    }

    // Fallback: extract from <title> tag if H1 patterns failed
    if (!bezeichnung) {
        const titleData = extractFromTitle(html);
        if (titleData) {
            nummerRawFromHtml = titleData.nummer;
            bezeichnung = titleData.bezeichnung;
        }
    }

    // Use whichever source we have
    const nummerRaw = nummerRawFromHtml || nummerRawFromFile;
    const nummer = normalizeGozNummer(nummerRaw);
    const id = `GOZ_${nummer}`;

    // Extract points (if present)
    // Pattern: <span...>96,76<!-- -->€</span> or Punkte info
    let punkte: number | undefined;
    const punkteMatch = html.match(/(\d+(?:,\d+)?)\s*(?:<!--[^>]*-->)?\s*Punkte/i);
    if (punkteMatch) {
        punkte = parseFloat(punkteMatch[1].replace(',', '.'));
    }

    // Extract description
    let beschreibung = '';
    const beschMatch = html.match(/Beschreibung<\/h2>.*?<div[^>]*class="font-light"[^>]*>([^<]+)/is);
    if (beschMatch) {
        beschreibung = beschMatch[1].trim();
    }

    // Extract Abrechnungsbestimmungen
    let abrechnungsbestimmungen = '';
    const abrMatch = html.match(/Abrechnungsbestimmungen<\/h2>.*?<div[^>]*class="font-light"[^>]*>([^<]+)/is);
    if (abrMatch) {
        abrechnungsbestimmungen = abrMatch[1].trim();
    }

    // Try to extract bezeichnung from different h1 pattern if still empty
    if (!bezeichnung) {
        const simpleH1 = html.match(/<h1[^>]*>[^<]*GOZ\s*\d+[^<]*<span[^>]*>([^<]+)/is);
        if (simpleH1) {
            bezeichnung = simpleH1[1].trim();
        }
    }

    // Skip if no meaningful content
    if (!bezeichnung && !beschreibung) {
        console.log(`  ⚠ Skipping ${filename}: no content extracted`);
        return null;
    }

    return {
        id,
        system: 'GOZ',
        nummer,
        nummer_raw: nummerRaw,
        bezeichnung: bezeichnung || `GOZ ${nummer}`,
        beschreibung: beschreibung || undefined,
        abrechnungsbestimmungen: abrechnungsbestimmungen || undefined,
        punkte,
        kategorie: guessCategoryFromCode(nummer),
        quelle: 'monkeymed_html'
    };
}

function guessCategoryFromCode(nummer: string): string {
    const num = parseInt(nummer, 10);

    // GOZ number ranges
    if (num >= 10 && num <= 120) return 'diagnostik';
    if (num >= 500 && num <= 530) return 'chirurgie'; // OP-Zuschläge
    if (num >= 1000 && num <= 1040) return 'prophylaxe';
    if (num >= 2000 && num <= 2199) return 'konservierend';
    if (num >= 2200 && num <= 2440) return 'endodontie';
    if (num >= 3000 && num <= 3310) return 'chirurgie';
    if (num >= 4000 && num <= 4150) return 'parodontologie';
    if (num >= 5000 && num <= 5340) return 'prothetik';
    if (num >= 6000 && num <= 6260) return 'prothetik';
    if (num >= 7000 && num <= 7100) return 'kfo';
    if (num >= 8000 && num <= 8100) return 'funktionsanalyse';
    if (num >= 9000 && num <= 9170) return 'implantologie';

    return 'sonstige';
}

// Main extraction
function extractAll(): GozItem[] {
    const items: GozItem[] = [];

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

    // Sort by nummer
    items.sort((a, b) => a.nummer.localeCompare(b.nummer, undefined, { numeric: true }));

    return items;
}

// Compare with existing catalog
function compareWithCatalog(items: GozItem[]): {
    newCodes: string[];
    existingCodes: string[];
    conflicts: { mappe: string; catalog: string }[];
} {
    const catalogPath = path.resolve(__dirname, '../../src/docudent/core/billing/knowledgeBase/kataloge/goz.json');
    let catalog: Record<string, any> = {};

    if (fs.existsSync(catalogPath)) {
        catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    }

    const catalogCodes = Object.keys(catalog).filter(k => k.startsWith('GOZ_'));
    const mappeCodes = items.map(i => i.id);

    const newCodes: string[] = [];
    const existingCodes: string[] = [];
    const conflicts: { mappe: string; catalog: string }[] = [];

    for (const item of items) {
        const exactMatch = catalogCodes.includes(item.id);
        // Also check non-normalized variants (PHANTOM_REMOVED vs GOZ_0520)
        const altId = `GOZ_${item.nummer_raw}`;
        const altMatch = catalogCodes.includes(altId);

        if (exactMatch) {
            existingCodes.push(item.id);
        } else if (altMatch) {
            conflicts.push({ mappe: item.id, catalog: altId });
            existingCodes.push(item.id);
        } else {
            newCodes.push(item.id);
        }
    }

    return { newCodes, existingCodes, conflicts };
}

// Generate patch for new codes
function generatePatch(items: GozItem[], newCodes: string[]): Record<string, any> {
    const patch: Record<string, any> = {};

    for (const item of items) {
        if (newCodes.includes(item.id)) {
            patch[item.id] = {
                id: item.id,
                system: 'GOZ',
                nummer: item.nummer,
                bezeichnung: item.bezeichnung,
                ...(item.beschreibung && { beschreibung: item.beschreibung }),
                ...(item.kategorie && { kategorie: item.kategorie }),
                quelle: item.quelle
            };
        }
    }

    return patch;
}

// Main
async function main() {
    console.log('🔍 GOZ HTML Extractor\n');
    console.log('==================================================\n');

    // Ensure output dir exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Extract all items
    const items = extractAll();
    console.log(`\n✅ Extracted ${items.length} GOZ items\n`);

    // Compare with catalog
    const { newCodes, existingCodes, conflicts } = compareWithCatalog(items);

    console.log('📊 Comparison with existing catalog:');
    console.log(`   - Items in HTML: ${items.length}`);
    console.log(`   - Already in catalog: ${existingCodes.length}`);
    console.log(`   - NEW codes: ${newCodes.length}`);
    console.log(`   - Conflicts (normalization): ${conflicts.length}\n`);

    // Save outputs

    // 1. All items as JSONL
    const jsonlPath = path.join(OUTPUT_DIR, 'goz.items.jsonl');
    fs.writeFileSync(jsonlPath, items.map(i => JSON.stringify(i)).join('\n'));
    console.log(`📄 Saved: ${jsonlPath}`);

    // 2. Index summary
    const indexPath = path.join(OUTPUT_DIR, 'goz.index.json');
    const index = {
        generated_at: new Date().toISOString(),
        total_items: items.length,
        codes: items.map(i => i.id),
        new_codes: newCodes,
        existing_codes: existingCodes,
        conflicts: conflicts
    };
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`📄 Saved: ${indexPath}`);

    // 3. Patch for new codes
    if (newCodes.length > 0) {
        const patch = generatePatch(items, newCodes);
        const patchPath = path.join(OUTPUT_DIR, 'goz.patch.json');
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
    let diffMd = `# GOZ Catalog Diff Report\n\n`;
    diffMd += `Generated: ${new Date().toISOString()}\n\n`;
    diffMd += `## Summary\n\n`;
    diffMd += `- Items extracted from HTML: **${items.length}**\n`;
    diffMd += `- Already in catalog: ${existingCodes.length}\n`;
    diffMd += `- **New codes to add: ${newCodes.length}**\n`;
    diffMd += `- Normalization conflicts: ${conflicts.length}\n\n`;

    if (conflicts.length > 0) {
        diffMd += `## Normalization Conflicts\n\n`;
        conflicts.forEach(c => diffMd += `- Mappe: ${c.mappe} ↔ Catalog: ${c.catalog}\n`);
        diffMd += '\n';
    }

    if (newCodes.length > 0) {
        diffMd += `## New Codes\n\n`;
        newCodes.forEach(c => {
            const item = items.find(i => i.id === c);
            diffMd += `### ${c}\n\n`;
            diffMd += `- **Bezeichnung**: ${item?.bezeichnung || '-'}\n`;
            diffMd += `- **Kategorie**: ${item?.kategorie || '-'}\n\n`;
        });
    }

    fs.writeFileSync(diffPath, diffMd);
    console.log(`📄 Saved: ${diffPath}`);

    console.log('\n✅ Extraction complete!\n');
}

main().catch(console.error);
