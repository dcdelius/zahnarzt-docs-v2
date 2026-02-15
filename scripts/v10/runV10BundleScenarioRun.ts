import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runV10Bundle } from '../../src/docudent/v10/multitreatment/runV10Bundle';
import type { V10BundleInput, V10ScopedBillingCode } from '../../src/docudent/v10/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Scenario = {
  id: string;
  title: string;
  bundle: V10BundleInput;
  expected: {
    mustIncludeCodes: string[];
    mustNotIncludePrefixes: string[];
    allowAliases: Record<string, string[]>;
  };
};

type CaseResult = {
  id: string;
  title: string;
  status: 'PASS' | 'FAIL';
  billingCodes: string[];
  failures: string[];
};

function hasCode(codes: string[], expected: string, aliases: Record<string, string[]>): boolean {
  if (codes.includes(expected)) return true;
  const aliasList = aliases[expected] || [];
  return codes.some(c => aliasList.includes(c));
}

function hasForbiddenPrefix(codes: string[], prefixes: string[]): string[] {
  const forbidden: string[] = [];
  for (const code of codes) {
    for (const prefix of prefixes) {
      if (code.startsWith(prefix)) {
        forbidden.push(code);
      }
    }
  }
  return forbidden;
}

async function runScenario(scenario: Scenario): Promise<CaseResult> {
  const failures: string[] = [];
  const result = await runV10Bundle(scenario.bundle, {
    autoAnswerAllQuestions: true,
    forceChipsByTreatmentId: {
      fuellung: ['fuellung_material_komposit', 'mehrschicht', 'kofferdam', 'la_leitung'],
      extraction: ['extraktion_einfach', 'anaesthesie_infiltr'],
    },
  });

  if (result.state !== 'output' || !result.output) {
    return {
      id: scenario.id,
      title: scenario.title,
      status: 'FAIL',
      billingCodes: [],
      failures: [`Bundle did not reach output state (state=${result.state})`],
    };
  }

  const billingCodes = (result.output.billingCodes as V10ScopedBillingCode[]).map(c => c.code);

  for (const code of scenario.expected.mustIncludeCodes) {
    if (!hasCode(billingCodes, code, scenario.expected.allowAliases)) {
      failures.push(`Missing expected code: ${code}, actual: ${billingCodes.join(', ')}`);
    }
  }

  const forbidden = hasForbiddenPrefix(billingCodes, scenario.expected.mustNotIncludePrefixes);
  if (forbidden.length > 0) {
    failures.push(`Forbidden codes found: ${forbidden.join(', ')}`);
  }

  return {
    id: scenario.id,
    title: scenario.title,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    billingCodes,
    failures,
  };
}

async function main() {
  const scenariosPath = path.resolve(__dirname, 'scenarios.v10.bundle.json');
  const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
  const scenarios: Scenario[] = scenariosData.cases;

  const results: CaseResult[] = [];
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
  }

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.length - pass;

  const report = {
    runId: new Date().toISOString(),
    total: results.length,
    pass,
    fail,
    cases: results,
  };

  const outDir = path.resolve(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-bundle-run');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  const summaryLines = [
    '# V10 Bundle Scenario Run Summary',
    '',
    `**Run ID:** ${report.runId}`,
    `**Total:** ${report.total} | **Pass:** ${report.pass} | **Fail:** ${report.fail}`,
    '',
    '## Results',
    '',
    '| ID | Title | BillingRefs | Status |',
    '|----|-------|-------------|--------|',
  ];
  for (const r of results) {
    summaryLines.push(`| ${r.id} | ${r.title} | ${r.billingCodes.join(', ')} | ${r.status} |`);
  }
  if (fail > 0) {
    summaryLines.push('', '## Failures', '');
    for (const r of results.filter(x => x.status === 'FAIL')) {
      summaryLines.push(`### Case ${r.id}: ${r.title}`);
      for (const f of r.failures) summaryLines.push(`- ${f}`);
      summaryLines.push('');
    }
  }

  fs.writeFileSync(path.join(outDir, 'summary.md'), summaryLines.join('\n'));

  if (fail > 0) {
    console.error('❌ HARD FAIL - Bundle scenarios failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
