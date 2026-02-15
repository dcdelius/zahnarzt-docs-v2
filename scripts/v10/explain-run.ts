/**
 * V10 ExplainRun Runner
 *
 * Generates a deterministic ExplainRun report (JSON + Markdown).
 *
 * Usage:
 *   npm run v10:explain-run -- --dictation "Zahn 36 mo Komposit" --treatment fuellung --insurance GKV
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { runV10 } from '../../src/docudent/v10/pipeline/runV10';
import { explainRunV10 } from '../../src/docudent/v10/qa/explainRunV10';

type Insurance = 'GKV' | 'PKV' | 'MKV';
type Treatment = 'fuellung' | 'endo' | 'extraction';
type TextLength = 'kurz' | 'mittel' | 'lang';

function readArg(args: string[], key: string, fallback?: string): string | undefined {
    const idx = args.indexOf(key);
    if (idx === -1) return fallback;
    return args[idx + 1] ?? fallback;
}

function parseArgs() {
    const args = process.argv.slice(2);
    const dictation = readArg(args, '--dictation', readArg(args, '-d', 'Zahn 36 mo Komposit'))!;
    const treatmentId = (readArg(args, '--treatment', readArg(args, '-t', 'fuellung')) as Treatment) ?? 'fuellung';
    const insuranceType = (readArg(args, '--insurance', readArg(args, '-i', 'GKV')) as Insurance) ?? 'GKV';
    const textLength = (readArg(args, '--textLength', readArg(args, '-l', 'mittel')) as TextLength) ?? 'mittel';
    const outDir = readArg(args, '--out', readArg(args, '-o', 'docs/system-atlas/artifacts/_latest/v10-explain-run'))!;

    return { dictation, treatmentId, insuranceType, textLength, outDir };
}

async function runExplain(): Promise<void> {
    const { dictation, treatmentId, insuranceType, textLength, outDir } = parseArgs();

    const input = {
        dictation,
        treatmentId,
        insuranceType,
        textLength,
    };

    const output = await runV10(input);

    const explain = explainRunV10(input, output, { format: 'both' });

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        path.join(outDir, 'report.json'),
        JSON.stringify(explain.reportJson, null, 2)
    );

    if (explain.reportMarkdown) {
        fs.writeFileSync(path.join(outDir, 'report.md'), explain.reportMarkdown);
    }

    const summary = [
        '# V10 ExplainRun Summary',
        '',
        `**State**: ${output.state}`,
        `**Hash**: \`${explain.stableHash}\``,
        `**Treatment**: ${treatmentId}`,
        `**Insurance**: ${insuranceType}`,
        `**Dictation**: "${dictation}"`,
        '',
        `**Output Dir**: ${outDir}`,
        '',
    ].join('\n');

    fs.writeFileSync(path.join(outDir, 'summary.md'), summary);

    console.log(`ExplainRun report saved to: ${outDir}`);

    if (output.state === 'error') {
        console.error(`Pipeline error: ${output.error}`);
        process.exit(1);
    }
}

runExplain().catch(err => {
    console.error('ExplainRun failed:', err);
    process.exit(1);
});

