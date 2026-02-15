
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '../docs/GOZ NEU');
const GOZ_JSON_PATH = path.resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/kataloge/goz.json');
const REPORT_PATH = path.resolve(__dirname, '../docs/system-atlas/artifacts/goz-implantology/recheck.report.json');

// Ensure report dir exists
const reportDir = path.dirname(REPORT_PATH);
if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
}

function parseHtml(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // <title>GOZ 8080 - Diagnostische Maßnahmen an Modellen</title>
    const titleRegex = /<title>GOZ\s+(\d{4})\s*-\s*([^<]+)<\/title>/;
    const match = content.match(titleRegex);

    if (!match) {
        return null;
    }

    const number = match[1];
    const title = match[2].trim();

    return {
        id: `GOZ_${number}`,
        system: 'GOZ',
        nummer: number,
        bezeichnung: title,
        beschreibung: null, // Default to null as per plan if not reliably extractable
        source: 'monkeymed_html'
    };
}

function main() {
    console.log('Starting GOZ 8xxx Audit...');

    // 1. Find extracted codes
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.html'));
    console.log(`Found ${files.length} HTML files.`);

    const extracted = [];

    for (const file of files) {
        const filePath = path.join(DOCS_DIR, file);
        const data = parseHtml(filePath);

        if (data && data.nummer.startsWith('8') && data.nummer.length === 4) {
            extracted.push(data);
        }
    }

    console.log(`Extracted ${extracted.length} codes in range 8000-8999.`);

    // 2. Load existing catalog
    let gozCatalog = {};
    if (fs.existsSync(GOZ_JSON_PATH)) {
        gozCatalog = JSON.parse(fs.readFileSync(GOZ_JSON_PATH, 'utf8'));
    }

    const existingIds = new Set(Object.keys(gozCatalog));

    // 3. Identify missing & Add
    const added = [];
    const present = [];

    for (const item of extracted) {
        if (existingIds.has(item.id)) {
            present.push(item.id);
        } else {
            // New entry
            gozCatalog[item.id] = item;
            added.push(item.id);
        }
    }

    // 4. Update Catalog
    if (added.length > 0) {
        // Sort keys potentially? Or just append.
        // Let's sort the catalog by ID to keep it tidy
        const sortedCatalog = {};
        Object.keys(gozCatalog).sort().forEach(key => {
            sortedCatalog[key] = gozCatalog[key];
        });

        fs.writeFileSync(GOZ_JSON_PATH, JSON.stringify(sortedCatalog, null, 4), 'utf8');
        console.log(`Updated goz.json with ${added.length} new entries.`);
    } else {
        console.log('No new entries to add.');
    }

    // 5. Generate Report
    const report = {
        timestamp: new Date().toISOString(),
        stats: {
            total_8xxx_found: extracted.length,
            added: added.length,
            already_present: present.length
        },
        added_codes: added,
        present_codes: present
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report written to ${REPORT_PATH}`);
}

main();
