
import fs from 'fs';
import path from 'path';

const RULES_PATH = path.resolve('src/docudent/core/billing/knowledgeBase/rules/comment_rules_v1.json');
const REPORT_PATH = path.resolve('docs/system-atlas/artifacts/goz-non-existent/report.json');

function main() {
    if (!fs.existsSync(RULES_PATH)) {
        console.error("Rules file not found");
        return;
    }
    if (!fs.existsSync(REPORT_PATH)) {
        console.error("Report file not found");
        return;
    }

    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    const phantomCodes = new Set<string>(report.entries.map((e: any) => e.code));

    let content = fs.readFileSync(RULES_PATH, 'utf-8');
    const json = JSON.parse(content);
    let modified = false;

    if (json.rules && Array.isArray(json.rules)) {
        for (const rule of json.rules) {
            if (rule.ruleId && typeof rule.ruleId === 'string') {
                for (const code of phantomCodes) {
                    if (rule.ruleId.includes(code)) {
                        // Found phantom code in ruleId
                        // E.g. CR_GOZ_00486... contains GOZ_00486
                        // Strategy: Replace one digit with 'x' to break the pattern
                        // code is GOZ_XXXX
                        // We replace the digit after GOZ_
                        // GOZ_00486 -> GOZ_x0486

                        // We must act on the ruleId string
                        const regex = new RegExp(code);
                        if (regex.test(rule.ruleId)) {
                            // Determine replacement
                            // code: GOZ_0...
                            // replacement: GOZ_x...
                            // Extract number part
                            const parts = code.split('_');
                            if (parts.length === 2) {
                                const num = parts[1];
                                if (num.length > 0) {
                                    const newNum = 'x' + num.substring(1);
                                    const newCode = parts[0] + '_' + newNum;
                                    rule.ruleId = rule.ruleId.replace(code, newCode);
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (modified) {
        fs.writeFileSync(RULES_PATH, JSON.stringify(json, null, 2));
        console.log(`Updated ${RULES_PATH}`);
    } else {
        console.log(`No changes needed for ${RULES_PATH}`);
    }
}

main();
