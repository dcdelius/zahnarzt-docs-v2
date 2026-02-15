/**
 * External Truth Set Loader
 * 
 * Loads and validates the external truth set YAML file
 * for use in gate tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ClaimKind =
    | 'COMBINABILITY_BLOCK'
    | 'COMBINABILITY_ALLOW'
    | 'REQUIRES'
    | 'MAXCOUNT'
    | 'SCOPE';

export type ClaimScope =
    | 'SESSION'
    | 'TOOTH'
    | 'QUADRANT'
    | 'CANAL'
    | 'UNKNOWN';

export type SourceType =
    | 'court_case'
    | 'official_commentary'
    | 'kzv_doc';

export interface Claim {
    kind: ClaimKind;
    codes: string[];
    scope: ClaimScope;
    notes: string;
}

export interface Source {
    title: string;
    url: string;
    retrievedAt: string;
    type: SourceType;
}

export interface TruthSetEntry {
    id: string;
    source: Source;
    mentionsCodes: string[];
    claims: Claim[];
}

export interface TruthSetMeta {
    version: string;
    generatedAt: string;
    curator: string;
    purpose: string;
}

export interface ExternalTruthSet {
    _meta: TruthSetMeta;
    entries: TruthSetEntry[];
}

// ═══════════════════════════════════════════════════════════════
// LOADER
// ═══════════════════════════════════════════════════════════════

let cachedTruthSet: ExternalTruthSet | null = null;

export function loadExternalTruthSet(): ExternalTruthSet {
    if (cachedTruthSet) return cachedTruthSet;

    const truthSetPath = path.join(
        process.cwd(),
        'docs/truthset/external_truthset.v1.yaml'
    );

    if (!fs.existsSync(truthSetPath)) {
        throw new Error(`External truth set not found: ${truthSetPath}`);
    }

    const content = fs.readFileSync(truthSetPath, 'utf-8');
    const parsed = yaml.parse(content);

    cachedTruthSet = {
        _meta: parsed._meta,
        entries: parsed.entries,
    };

    return cachedTruthSet;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateTruthSet(truthSet: ExternalTruthSet): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenIds = new Set<string>();

    // Check meta
    if (!truthSet._meta?.version) {
        errors.push('Missing _meta.version');
    }

    // Check entries
    if (!truthSet.entries || !Array.isArray(truthSet.entries)) {
        errors.push('Missing or invalid entries array');
        return { valid: false, errors, warnings };
    }

    for (const entry of truthSet.entries) {
        // Check required fields
        if (!entry.id) {
            errors.push('Entry missing id');
            continue;
        }

        // Check for duplicates
        if (seenIds.has(entry.id)) {
            errors.push(`Duplicate entry id: ${entry.id}`);
        }
        seenIds.add(entry.id);

        // Check source
        if (!entry.source?.url) {
            errors.push(`Entry ${entry.id}: missing source.url`);
        }
        if (!entry.source?.retrievedAt) {
            errors.push(`Entry ${entry.id}: missing source.retrievedAt`);
        }

        // Check mentionsCodes
        if (!entry.mentionsCodes || entry.mentionsCodes.length === 0) {
            errors.push(`Entry ${entry.id}: missing mentionsCodes`);
        }

        // Check claims
        if (!entry.claims || entry.claims.length === 0) {
            errors.push(`Entry ${entry.id}: missing claims`);
        } else {
            for (const claim of entry.claims) {
                if (!claim.kind) {
                    errors.push(`Entry ${entry.id}: claim missing kind`);
                }
                if (!claim.codes || claim.codes.length === 0) {
                    errors.push(`Entry ${entry.id}: claim missing codes`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function getBlockClaims(truthSet: ExternalTruthSet): Claim[] {
    const claims: Claim[] = [];
    for (const entry of truthSet.entries) {
        for (const claim of entry.claims) {
            if (claim.kind === 'COMBINABILITY_BLOCK') {
                claims.push(claim);
            }
        }
    }
    return claims;
}

export function getAllowClaims(truthSet: ExternalTruthSet): Claim[] {
    const claims: Claim[] = [];
    for (const entry of truthSet.entries) {
        for (const claim of entry.claims) {
            if (claim.kind === 'COMBINABILITY_ALLOW') {
                claims.push(claim);
            }
        }
    }
    return claims;
}

export function getEntriesForCode(truthSet: ExternalTruthSet, code: string): TruthSetEntry[] {
    return truthSet.entries.filter(e => e.mentionsCodes.includes(code));
}
