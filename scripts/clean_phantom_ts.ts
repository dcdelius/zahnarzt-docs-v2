
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.resolve('docs/system-atlas/artifacts/goz-non-existent/report.json');

function loadReport() {
    if (!fs.existsSync(REPORT_PATH)) {
        console.error("Report not found!");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
}

function cleanTs(filePath: string, phantomCodes: Set<string>) {
    // Only process .ts, .tsx, .js, .md
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.md')) return;

    console.log(`Checking ${filePath}...`);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    const lines = content.split('\n');
    const newLines = [];

    for (const line of lines) {
        let newLine = line;
        let lineModified = false;

        for (const code of phantomCodes) {
            if (line.includes(code)) {
                // Check if it's a real token match (basic check)
                const regex = new RegExp(`${code}(?!\\d)`);
                if (regex.test(line)) {
                    // Found phantom code.
                    // Strategy:
                    // 1. If it's a comment, ignore? Or delete? "REMOVE_ALL_REFERENCES" implies verifying comments too?
                    // 2. If it's code.
                    //    a) If it's in a list ` 'GOZ_XXXX', ` -> remove the item.
                    //    b) If it's a property ` code: 'GOZ_XXXX' ` -> replace with 'INVALID_PHANTOM' or comment out?
                    //    c) If it's `const x = 'GOZ_XXXX'` -> ...

                    // Safe automated approach:
                    // If checks mostly lists (like in gate tests), we can just comment out the line.
                    // But strictly, we should try to be less destructive if possible except for tests.

                    // For now, let's replace the code with "PHANTOM_REMOVED".
                    // This breaks validity (e.g. if expected by something), but signals removal.
                    // Or comment out the line.

                    // Given the instruction "Tests dürfen gelöscht werden", let's comment out lines in tests.
                    // In source (non-test), careful.

                    const isTest = filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.');

                    if (isTest) {
                        // Check if already commented
                        if (line.trim().startsWith('// REMOVED_PHANTOM:')) {
                            // Already processed, but maybe the code is still there?
                            // Let's ensure the code is replaced in the existing comment too
                            if (line.includes(code)) {
                                newLine = line.replace(new RegExp(code, 'g'), 'PHANTOM_REMOVED');
                                lineModified = true;
                            }
                        } else {
                            // Comment out the line AND replace the code to ensure detection doesn't find it
                            const cleanedLine = line.replace(new RegExp(code, 'g'), 'PHANTOM_REMOVED');
                            newLine = `// REMOVED_PHANTOM: ${cleanedLine}`;
                            lineModified = true;
                        }
                    } else {
                        // In source code, replace with empty string or distinct marker?
                        // Replacing with "GOZ_INVALID" might allow compilation but fail runtime logic gracefully?
                        // Or comment out if it is a list item?
                        // Let's try replacing with a sentinel first.
                        newLine = line.replace(code, 'PHANTOM_REMOVED');
                        lineModified = true;
                    }
                    modified = true;
                    break; // Moved to modified state for this line
                }
            }
        }
        newLines.push(newLine);
    }

    if (modified) {
        fs.writeFileSync(filePath, newLines.join('\n'));
        console.log(`Updated ${filePath}`);
    }
}

function main() {
    const report = loadReport();
    const entries = report.entries;
    const phantomCodes = new Set<string>(entries.map((e: any) => e.code));

    // Gather TS files from report
    const filesToClean = new Set<string>();
    for (const entry of entries) {
        for (const loc of entry.locations) {
            if (loc.endsWith('.ts') || loc.endsWith('.tsx') || loc.endsWith('.js') || loc.endsWith('.md')) {
                filesToClean.add(loc);
            }
        }
    }

    for (const file of filesToClean) {
        cleanTs(file, phantomCodes);
    }
}

main();
