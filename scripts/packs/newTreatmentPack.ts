#!/usr/bin/env tsx
/**
 * M19: Treatment Pack Skeleton Generator
 *
 * Creates a new treatment pack scaffold with TODOs.
 * Does NOT auto-modify registry.ts - prints snippet to manually add.
 *
 * Usage:
 *   npx tsx scripts/packs/newTreatmentPack.ts --id extraction
 *   npx tsx scripts/packs/newTreatmentPack.ts --id pzr --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// CLI PARSING
// ═══════════════════════════════════════════════════════════════

interface CliArgs {
    id: string;
    dryRun: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    let id = '';
    let dryRun = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--id' && args[i + 1]) {
            id = args[i + 1];
            i++;
        } else if (args[i] === '--dry-run') {
            dryRun = true;
        }
    }

    if (!id) {
        console.error('Error: --id is required');
        console.error('Usage: npx tsx scripts/packs/newTreatmentPack.ts --id <treatment_id>');
        process.exit(1);
    }

    // Validate id format (lowercase, alphanumeric, underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
        console.error('Error: id must be lowercase alphanumeric with underscores, starting with letter');
        process.exit(1);
    }

    return { id, dryRun };
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════

function generatePackTemplate(id: string): string {
    const pascalCase = id.charAt(0).toUpperCase() + id.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    return `/**
 * ${pascalCase} Treatment Pack
 *
 * Bundles all assets for ${id} treatment.
 *
 * TODO: Complete implementation following docs/v10/treatment-pack-checklist.md
 */

import type { TreatmentPack, CombinabilityGolden, ExtractionHints } from '../types';
import type { TreatmentKb } from '../../kb/treatment/types';
import type { ClinicalScenario } from '../../qa/runClinicalSuite';
import { jsonTreatmentKbProvider } from '../../kb/treatment';

// ═══════════════════════════════════════════════════════════════
// CLINICAL SCENARIOS
// ═══════════════════════════════════════════════════════════════

/**
 * TODO: Add golden clinical scenarios (minimum 7-10)
 *
 * Categories to cover:
 * - Simple/standard cases (3-4)
 * - Edge cases with askbacks (2-3)
 * - Multi-tooth scenarios (1-2)
 * - Insurance variants GKV/PKV (1-2)
 */
const ${id}Scenarios: ClinicalScenario[] = [
    // TODO: Add scenarios
    // Example:
    // {
    //     id: '${id.toUpperCase()}_01-simple',
    //     description: 'Simple ${id} case',
    //     treatmentId: '${id}',
    //     insuranceType: 'GKV',
    //     textLength: 'mittel',
    //     dictation: 'TODO: Add realistic dictation',
    // },
];

// ═══════════════════════════════════════════════════════════════
// COMBINABILITY GOLDENS
// ═══════════════════════════════════════════════════════════════

/**
 * TODO: Add combinability goldens
 *
 * Requirements:
 * - Minimum 5 PASS cases (valid combinations)
 * - Minimum 3 BLOCK cases (invalid combinations)
 */
const ${id}CombinabilityGoldens: CombinabilityGolden[] = [
    // TODO: Add PASS cases
    // {
    //     id: '${id.toUpperCase()}_PASS_01',
    //     description: 'Valid ${id} billing combination',
    //     codes: ['BEMA_XX', 'BEMA_YY'],
    //     expectedVerdict: 'PASS',
    // },

    // TODO: Add BLOCK cases
    // {
    //     id: '${id.toUpperCase()}_BLOCK_01',
    //     description: '${id} exclusion rule',
    //     codes: ['GOZ_XXXX', 'GOZ_YYYY'],
    //     expectedVerdict: 'BLOCK',
    //     expectedRuleId: 'regel_${id}_xxx',
    // },
];

// ═══════════════════════════════════════════════════════════════
// EXTRACTION HINTS
// ═══════════════════════════════════════════════════════════════

/**
 * TODO: Add extraction hints for this treatment
 */
const ${id}ExtractionHints: ExtractionHints = {
    treatmentKeywords: [
        // TODO: Add keywords that indicate this treatment
        // '${id}',
    ],
    entityPatterns: {
        // TODO: Add regex patterns for entity extraction
        // tooth: /\\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\\b/,
    },
};

// ═══════════════════════════════════════════════════════════════
// PACK FACTORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create the ${pascalCase} treatment pack.
 */
export function create${pascalCase}Pack(): TreatmentPack {
    return {
        id: '${id}',
        version: '1.0.0',

        getTreatmentKb(): TreatmentKb | null {
            // TODO: Ensure treatments/${id}/unified.json exists
            return jsonTreatmentKbProvider.getTreatmentKb('${id}');
        },

        getGoldenClinicalScenarios(): ClinicalScenario[] {
            return ${id}Scenarios;
        },

        getCombinabilityGoldens(): CombinabilityGolden[] {
            return ${id}CombinabilityGoldens;
        },

        getExtractionHints(): ExtractionHints {
            return ${id}ExtractionHints;
        },

        // TODO: Implement if pack needs coverage allowlist
        // getCoverageConfig() {
        //     return {
        //         uncoveredBillingChipIds: [
        //             // 'chip_id', // Reason: not yet covered by scenarios
        //         ],
        //     };
        // },
    };
}
`;
}

function generateRegistrySnippet(id: string): string {
    const pascalCase = id.charAt(0).toUpperCase() + id.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    return `
// ═══════════════════════════════════════════════════════════════
// ADD TO registry.ts
// ═══════════════════════════════════════════════════════════════

// 1. Add import at the top of the file:
import { create${pascalCase}Pack } from './${id}/pack';

// 2. Add to PACKS constant:
export const PACKS = {
    fuellung: createFuellungPack(),
    endo: createEndoPack(),
    ${id}: create${pascalCase}Pack(), // NEW
} as const;
`;
}

function generatePackDocs(id: string): string {
    const pascalCase = id.charAt(0).toUpperCase() + id.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    return `# ${pascalCase} Treatment Pack

## Overview

Pack for ${id} treatment. Implements \`TreatmentPack\` interface.

## Status

- [ ] Treatment KB created (\`treatments/${id}/unified.json\`)
- [ ] Clinical scenarios defined (target: 7-10)
- [ ] Combinability goldens defined (target: 5 PASS + 3 BLOCK)
- [ ] Registered in \`registry.ts\`
- [ ] All gates passing

## Files

| File | Status |
|------|--------|
| \`v10/packs/${id}/pack.ts\` | Created (skeleton) |
| \`treatments/${id}/unified.json\` | TODO |
| \`medical_kb/rules/${id}.json\` | TODO (if needed) |

## Notes

- Created by \`newTreatmentPack.ts\` generator
- Follow \`docs/v10/treatment-pack-checklist.md\` to complete
`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

function main(): void {
    const { id, dryRun } = parseArgs();

    const repoRoot = process.cwd();
    const packDir = path.join(repoRoot, 'src/docudent/v10/packs', id);
    const packFile = path.join(packDir, 'pack.ts');
    const docsDir = path.join(repoRoot, 'docs/v10/packs');
    const docsFile = path.join(docsDir, `${id}.md`);

    console.log(`\n🔧 Treatment Pack Generator`);
    console.log(`   ID: ${id}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'CREATE'}\n`);

    // Check if pack already exists
    if (fs.existsSync(packDir)) {
        console.error(`❌ Error: Pack directory already exists: ${packDir}`);
        process.exit(1);
    }

    // Generate content
    const packContent = generatePackTemplate(id);
    const docsContent = generatePackDocs(id);
    const registrySnippet = generateRegistrySnippet(id);

    if (dryRun) {
        console.log('📄 Pack file content:');
        console.log('─'.repeat(60));
        console.log(packContent);
        console.log('─'.repeat(60));
        console.log('\n📄 Docs file content:');
        console.log('─'.repeat(60));
        console.log(docsContent);
        console.log('─'.repeat(60));
    } else {
        // Create directories
        fs.mkdirSync(packDir, { recursive: true });
        fs.mkdirSync(docsDir, { recursive: true });

        // Write files
        fs.writeFileSync(packFile, packContent);
        console.log(`✅ Created: ${packFile}`);

        fs.writeFileSync(docsFile, docsContent);
        console.log(`✅ Created: ${docsFile}`);
    }

    // Always print registry snippet
    console.log('\n' + '═'.repeat(60));
    console.log(registrySnippet);
    console.log('═'.repeat(60));

    console.log(`\n📋 Next steps:`);
    console.log(`   1. Create treatments/${id}/unified.json`);
    console.log(`   2. Add scenarios to pack.ts`);
    console.log(`   3. Add combinability goldens to pack.ts`);
    console.log(`   4. Update registry.ts with the snippet above`);
    console.log(`   5. Run gates: npx vitest run gate-m18 gate-m19 gate-m20`);
    console.log(`\n   See: docs/v10/treatment-pack-checklist.md for full checklist\n`);
}

// Only run if executed directly (not imported by Vitest or other tools)
// ESM equivalent of if (require.main === module)
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}
