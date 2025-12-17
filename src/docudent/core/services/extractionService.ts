/**
 * CORE Extraction Service — FACADE
 *
 * ═══════════════════════════════════════════════════════════════
 * Re-exports extraction functionality from core/extraction.
 * V7 pipeline and other consumers should import from here.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ❌ DO NOT import from v6/**
 * ✅ Import from core/extraction/**
 */

// Re-export from core/extraction
export { extractFromDictation } from '../extraction/extractionService';

// Re-export types from contracts
export type { ExtractedDataV6, ExtractedData } from '../../contracts/extractionV6';
export { EXTRACTION_VERSION_V6 } from '../../contracts/extractionV6';
