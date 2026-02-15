const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const KB_PATH = path.join(ROOT, 'src/docudent/medical_kb/medical_kb.v1.json');
const PACKS_DIR = path.join(ROOT, 'src/docudent/v10/packs');
const REPORT_PATH = path.join(ROOT, 'docs/system-atlas/settings-coverage.md');

const normalizeId = (id) =>
    id
        ?.toString()
        .toLowerCase()
        .replace(/^askback[-_]/, '')
        .replace(/^medical[_-]/, '')
        .replace(/^endo[_-]/, '')
        .replace(/^fuellung[_-]/, '')
        .replace(/^ab[_-]/, '')
        .replace(/-/g, '_');

function walkFiles(dir, predicate, acc = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, predicate, acc);
            continue;
        }
        if (predicate(full)) {
            acc.push(full);
        }
    }
    return acc;
}

function extractMappingsFromContract(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = new Set();
    const regex = /mapsToAskbackId:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.add(match[1]);
    }
    return matches;
}

function main() {
    const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
    const askbacks = (kb.askbacks ?? []).map((a) => a.id).filter(Boolean);
    const askbackSet = new Set(askbacks);
    const askbackNormalizedSet = new Set(askbacks.map(normalizeId));

    const contractFiles = walkFiles(
        PACKS_DIR,
        (file) => file.endsWith('ui.contract.ts')
    );

    const mapped = new Set();
    for (const file of contractFiles) {
        const matches = extractMappingsFromContract(file);
        for (const id of matches) {
            mapped.add(id);
        }
    }

    const mappedAskbacks = askbacks
        .filter((id) => {
            const norm = normalizeId(id);
            return Array.from(mapped).some((m) => normalizeId(m) === norm);
        })
        .sort();

    const unmappedAskbacks = askbacks
        .filter((id) => {
            const norm = normalizeId(id);
            return !Array.from(mapped).some((m) => normalizeId(m) === norm);
        })
        .sort();

    const mappedExternal = Array.from(mapped)
        .filter((id) => {
            const norm = normalizeId(id);
            return !askbackSet.has(id) && !askbackNormalizedSet.has(norm);
        })
        .sort();

    const lines = [
        '# Settings Coverage (Askbacks)',
        '',
        `Stand: ${new Date().toISOString().slice(0, 10)}`,
        '',
        '## Überblick',
        `- Askbacks in ` + '`medical_kb.v1.json`' + `: ${askbacks.length}`,
        `- Askbacks mit Settings-Mapping: ${mappedAskbacks.length}`,
        `- Askbacks ohne Settings-Mapping: ${unmappedAskbacks.length}`,
        '',
        '## Gemappt (aus SettingsSchema)',
        ...mappedAskbacks.map((id) => `- ${id}`),
        '',
        '## Nicht gemappt',
        ...unmappedAskbacks.map((id) => `- ${id}`),
    ];

    if (mappedExternal.length > 0) {
        lines.push('', '## Mappings ohne KB-Askback');
        lines.push(...mappedExternal.map((id) => `- ${id}`));
    }

    fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
    console.log(`Wrote: ${REPORT_PATH}`);
}

main();
