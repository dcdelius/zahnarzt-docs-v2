/**
 * Combinability KB Compiler
 *
 * Compiles source RuleRecords (kombinationen.json) into runtime KB.
 * SSOT: Database/source → Compiler → Runtime KB
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SourceRule {
    id: string;
    typ: 'ausschluss' | 'bedingung' | 'haeufigkeit' | 'dokumentation';
    titel: string;
    beschreibung: string;
    betrifft: string[];
    regel: {
        operator: string;
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: 'regress' | 'warnung' | 'info';
    quelle?: { dokument?: string; url?: string; paragraph?: string };
    blockWith?: string[];
    autoResolve?: 'drop_anchor' | 'drop_blockwith';
}

interface CompiledRule {
    id: string;
    typ: string;
    titel: string;
    beschreibung: string;
    betrifft: string[];
    regel: {
        operator: string;
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: string;
    sourceRefs: { anchor: string; document: string; url?: string }[];
    scope: 'SESSION' | 'TOOTH' | 'QUADRANT' | 'CANAL' | 'UNKNOWN';
    blockWith?: string[];
    autoResolve?: string;
    priority: number;
}

interface CompiledKb {
    _meta: {
        version: string;
        generatedAt: string;
        sourceFile: string;
        ruleCount: number;
        hash: string;
        sourceHash: string;
        provider: string;
    };
    rules: CompiledRule[];
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

const VALID_PREFIXES = ['GOZ_', 'BEMA_', 'BEL_', 'MKV', 'TEST_'];

function validateCode(code: string, ruleId: string): void {
    const valid = VALID_PREFIXES.some(p => code.startsWith(p));
    if (!valid) {
        throw new Error(`[FAIL-FAST] Rule ${ruleId}: invalid code "${code}"`);
    }
}

function validateRule(rule: SourceRule): string[] {
    const errors: string[] = [];

    if (!rule.id) {
        errors.push('Missing rule id');
    }

    if (!rule.betrifft || rule.betrifft.length === 0) {
        errors.push(`Rule ${rule.id}: empty betrifft`);
    }

    for (const code of rule.betrifft || []) {
        try {
            validateCode(code, rule.id);
        } catch (e) {
            errors.push((e as Error).message);
        }
    }

    if (!rule.quelle?.dokument && !rule.titel) {
        errors.push(`Rule ${rule.id}: missing source document`);
    }

    return errors;
}

// ═══════════════════════════════════════════════════════════════
// SCOPE DERIVATION
// ═══════════════════════════════════════════════════════════════

function deriveScope(regel: SourceRule['regel']): CompiledRule['scope'] {
    const bezug = regel.bezug?.toLowerCase() ?? '';
    const zeitraum = regel.zeitraum?.toLowerCase() ?? '';

    if (bezug.includes('kanal') || bezug.includes('canal')) return 'CANAL';
    if (bezug.includes('kieferhaelfte') || bezug.includes('quadrant')) return 'QUADRANT';
    if (bezug.includes('zahn') || bezug.includes('tooth')) return 'TOOTH';
    if (zeitraum.includes('sitzung') || zeitraum.includes('session')) return 'SESSION';

    return 'SESSION'; // Default
}

// ═══════════════════════════════════════════════════════════════
// COMPILER
// ═══════════════════════════════════════════════════════════════

export function compileRules(sourceRules: SourceRule[], sourceFile: string): CompiledKb {
    const allErrors: string[] = [];

    // Validate all rules
    for (const rule of sourceRules) {
        const errors = validateRule(rule);
        allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
        throw new Error(`[FAIL-FAST] Compilation failed:\n${allErrors.join('\n')}`);
    }

    // Check for duplicate IDs
    const ids = sourceRules.map(r => r.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
        throw new Error(`[FAIL-FAST] Duplicate rule IDs: ${duplicates.join(', ')}`);
    }

    // Compile
    const compiledRules: CompiledRule[] = sourceRules.map(rule => ({
        id: rule.id,
        typ: rule.typ,
        titel: rule.titel,
        beschreibung: rule.beschreibung,
        betrifft: rule.betrifft,
        regel: rule.regel,
        schweregrad: rule.schweregrad,
        sourceRefs: [{
            anchor: rule.id.toUpperCase(),
            document: rule.quelle?.dokument ?? 'Unknown',
            url: rule.quelle?.url,
        }],
        scope: deriveScope(rule.regel),
        blockWith: rule.blockWith,
        autoResolve: rule.autoResolve,
        priority: 100,
    }));

    // Deterministic sort
    compiledRules.sort((a, b) => a.id.localeCompare(b.id));

    // Generate hashes
    const sourceJson = JSON.stringify(sourceRules);
    const sourceHash = createHash('sha256').update(sourceJson).digest('hex').slice(0, 16);
    const rulesJson = JSON.stringify(compiledRules);
    const contentHash = createHash('sha256').update(rulesJson).digest('hex').slice(0, 16);

    return {
        _meta: {
            version: '1.2.0',
            generatedAt: new Date().toISOString(),
            sourceFile,
            ruleCount: compiledRules.length,
            hash: contentHash,
            sourceHash,
            provider: 'wissing-kommentar',
        },
        rules: compiledRules,
    };
}

// ═══════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════

export function runCompiler(
    sourcePath: string,
    outputPath: string
): { success: boolean; error?: string } {
    try {
        const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
        const sourceRules: SourceRule[] = JSON.parse(sourceContent);

        const kb = compileRules(sourceRules, path.basename(sourcePath));

        fs.writeFileSync(outputPath, JSON.stringify(kb, null, 2));

        console.log(`[COMPILER] Success: ${kb._meta.ruleCount} rules compiled`);
        console.log(`[COMPILER] Source hash: ${kb._meta.sourceHash}`);
        console.log(`[COMPILER] Content hash: ${kb._meta.hash}`);

        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

// For testing
export { validateCode, validateRule, deriveScope };
