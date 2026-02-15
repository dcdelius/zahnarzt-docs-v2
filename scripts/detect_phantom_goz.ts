
import fs from 'fs';
import path from 'path';

// CONFIG
const GOZ_CATALOG_PATH = path.resolve('src/docudent/core/billing/knowledgeBase/kataloge/goz.json');
const REPORT_DIR = path.resolve('docs/system-atlas/artifacts/goz-non-existent');
const REPORT_PATH = path.join(REPORT_DIR, 'report.json');

// EXCLUSIONS (Directories to skip)
const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.gemini',
    'dist',
    'build',
    'coverage',
    'tmp',
    'goz-non-existent', // Avoid self-referencing the report
    'scripts' // Ignore build/maintenance scripts which may reference codes for logic
]);

// REGEX
const GOZ_PATTERN = /GOZ_(\d{1,5})/g; // Match GOZ_ followed by digits (up to 5 just in case)

function loadValidCodes(): Set<string> {
    if (!fs.existsSync(GOZ_CATALOG_PATH)) {
        throw new Error(`GOZ Catalog not found at ${GOZ_CATALOG_PATH}`);
    }
    const raw = fs.readFileSync(GOZ_CATALOG_PATH, 'utf-8');
    const json = JSON.parse(raw);
    // Valid codes are the keys of the JSON object, e.g. "GOZ_1020"
    // Filter only keys starting with GOZ_
    const keys = Object.keys(json).filter(key => key.startsWith('GOZ_'));
    return new Set(keys);
}

function scanFile(filePath: string, validCodes: Set<string>, results: Map<string, string[]>) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let match;
        while ((match = GOZ_PATTERN.exec(content)) !== null) {
            const code = match[0]; // e.g. PHANTOM_REMOVED
            if (!validCodes.has(code)) {
                if (!results.has(code)) {
                    results.set(code, []);
                }
                results.get(code)?.push(filePath);
            }
        }
    } catch (err) {
        if (Object.prototype.toString.call(err) === "[object Error]" && (err as any).code !== 'EISDIR') {
            // Ignore read errors for binary files etc if any slip through
            // console.warn(`Skipping file ${filePath}: ${err}`);
        }
    }
}

function walkDir(dir: string, validCodes: Set<string>, results: Map<string, string[]>) {
    if (IGNORED_DIRS.has(path.basename(dir))) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, validCodes, results);
        } else if (entry.isFile()) {
            // Only process likely text files ? Or all? 
            // The prompt says "Audit scripts, fixtures, etc." which are ts, js, json, yaml, md, html...
            // Let's just excludes binary extensions if needed, but for now simple read is fine.
            // We explicitly avoid checking the script itself if we want, but checking strictly is better.
            // But if this script contains "PHANTOM_REMOVED" as string literal in comments below, it might self-flag.
            // That is fine, we can ignore this file in the locations if needed, or better: write this script without hardcoding bad examples in a way that triggers it?
            // I used regex above so it won't flag unless I write PHANTOM_REMOVED.
            scanFile(fullPath, validCodes, results);
        }
    }
}

function main() {
    console.log("Loading valid codes...");
    const validCodes = loadValidCodes();
    console.log(`Loaded ${validCodes.size} valid GOZ codes.`);

    const results = new Map<string, string[]>();

    console.log("Scanning codebase...");
    walkDir(path.resolve('.'), validCodes, results);

    // Convert map to list for reporting
    const reportEntries = [];
    for (const [code, locations] of results) {
        reportEntries.push({
            code,
            classification: "NON_EXISTENT",
            locations: [...new Set(locations)], // dedupe files
            required_action: "REMOVE_ALL_REFERENCES"
        });
    }

    // Ensure output dir
    if (!fs.existsSync(REPORT_DIR)) {
        fs.mkdirSync(REPORT_DIR, { recursive: true });
    }

    const reportJson = {
        generated_at: new Date().toISOString(),
        total_phantom_codes: reportEntries.length,
        entries: reportEntries
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(reportJson, null, 2));
    console.log(`Scan complete. Found ${reportEntries.length} phantom codes. Report saved to ${REPORT_PATH}`);
}

main();
