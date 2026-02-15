
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

function pruneJson(filePath: string, phantomCodes: Set<string>) {
    console.log(`Pruning ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf-8');

    const isJsonl = filePath.endsWith('.jsonl');
    let modified = false;

    // Pruning logic definitions must be available for both paths

    // Generic recursive Pruning to handle object filtering in arrays
    function walkAndFilter(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(walkAndFilter).filter(item => {
                if (item === null || item === undefined) return false;

                // 1. If item is string phantom
                if (typeof item === 'string') {
                    for (const code of phantomCodes) {
                        if (item.includes(code)) {
                            const regex = new RegExp(`${code}(?!\\d)`);
                            if (regex.test(item)) {
                                modified = true;
                                return false;
                            }
                        }
                    }
                    return true;
                }

                // 2. If item is object, check if it has critical phantom fields
                if (typeof item === 'object') {
                    // Check specific fields that identify the object
                    const criticalFields = ['id', 'code', 'codePattern', 'betrifft', 'blockWith', 'entityId'];
                    for (const field of criticalFields) {
                        if (item[field]) {
                            const val = item[field];
                            if (typeof val === 'string') {
                                for (const code of phantomCodes) {
                                    if (val.includes(code)) {
                                        const regex = new RegExp(`${code}(?!\\d)`);
                                        if (regex.test(val)) {
                                            modified = true;
                                            return false; // Remove this object from array
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return true;
            });
        }

        if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                let keyIsPhantom = false;
                if (phantomCodes.has(key)) {
                    keyIsPhantom = true;
                } else {
                    for (const code of phantomCodes) {
                        if (key.includes(code)) {
                            const regex = new RegExp(`${code}(?!\\d)`);
                            if (regex.test(key)) {
                                keyIsPhantom = true;
                                break;
                            }
                        }
                    }
                }

                if (keyIsPhantom) { modified = true; continue; }

                const val = obj[key];
                if (typeof val === 'string') {
                    let isPhantom = false;
                    for (const code of phantomCodes) {
                        if (val.includes(code)) {
                            const regex = new RegExp(`${code}(?!\\d)`);
                            if (regex.test(val)) { isPhantom = true; break; }
                        }
                    }
                    if (isPhantom) { modified = true; continue; }
                }
                newObj[key] = walkAndFilter(val);
            }
            return newObj;
        }

        return obj;
    }

    if (isJsonl) {
        const lines = content.split('\n');
        const prunedLines: string[] = [];
        let modifiedJsonl = false;

        for (const line of lines) {
            if (!line.trim()) {
                prunedLines.push(line);
                continue;
            }
            try {
                const lineObj = JSON.parse(line);

                // Check if line object itself should be filtered (as if it was in an array)
                // We reuse the logic: if walkAndFilter removes it from an array, we should remove the line.
                // But walkAndFilter works on logic "obj -> transformed obj".
                // So checking "shouldRemove" logic manually is safer or wrapping in array?
                // Logic: 
                let shouldRemove = false;
                if (typeof lineObj === 'object') {
                    const criticalFields = ['id', 'code', 'codePattern', 'betrifft', 'blockWith', 'entityId'];
                    for (const field of criticalFields) {
                        if (lineObj[field]) {
                            const val = lineObj[field];
                            if (typeof val === 'string') {
                                for (const code of phantomCodes) {
                                    if (val.includes(code)) {
                                        const regex = new RegExp(`${code}(?!\\d)`);
                                        if (regex.test(val)) {
                                            shouldRemove = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (shouldRemove) break;
                    }
                }

                if (shouldRemove) {
                    modified = true;
                    modifiedJsonl = true;
                    continue; // Skip this line
                }

                // Reset modified flag for the deep walk to detect changes within the object
                // But 'modified' is outer scope. 
                // We can just rely on JSON comparison.
                const originalStr = JSON.stringify(lineObj);
                const prunedObj = walkAndFilter(lineObj);
                const prunedStr = JSON.stringify(prunedObj);

                prunedLines.push(prunedStr);

                if (prunedStr !== originalStr) {
                    modified = true;
                    modifiedJsonl = true;
                }
            } catch (e) {
                // Not JSON line? keep it
                prunedLines.push(line);
            }
        }

        if (modifiedJsonl) {
            fs.writeFileSync(filePath, prunedLines.join('\n'));
            console.log(`Updated ${filePath} (JSONL)`);
        } else {
            console.log(`No changes needed for ${filePath}`);
        }
        return;
    }

    // Normal JSON handling
    let json;
    try {
        json = JSON.parse(content);
    } catch (e) {
        console.error(`Failed to parse ${filePath}: ${e}`);
        return;
    }

    // Special handling for comment_rules_v1.json (array of rules)
    if (path.basename(filePath) === 'comment_rules_v1.json' && json.rules && Array.isArray(json.rules)) {
        const originalLength = json.rules.length;
        json.rules = json.rules.filter((rule: any) => {
            if (phantomCodes.has(rule.codePattern)) {
                return false;
            }
            return true;
        });
        if (json.rules.length !== originalLength) {
            modified = true;
            console.log(`Removed ${originalLength - json.rules.length} rules from ${filePath}`);
        }
    }

    const pruned = walkAndFilter(json);

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(pruned, null, 2));
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes needed for ${filePath}`);
    }
}

function main() {
    const report = loadReport();
    const entries = report.entries;
    const phantomCodes = new Set<string>(entries.map((e: any) => e.code));

    // Gather all JSON files mentioned in locations
    const filesToPrune = new Set<string>();
    for (const entry of entries) {
        for (const loc of entry.locations) {
            if ((loc.endsWith('.json') || loc.endsWith('.jsonl')) && fs.existsSync(loc)) {
                // Avoid pruning the report itself or allowlist (we deal with allowlist separately or mostly here)
                if (loc === REPORT_PATH) continue;
                filesToPrune.add(loc);
            }
        }
    }

    for (const file of filesToPrune) {
        pruneJson(file, phantomCodes);
    }
}

main();
