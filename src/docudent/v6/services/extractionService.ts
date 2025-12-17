/**
 * V6 Extraction Service — FROZEN
 *
 * ═══════════════════════════════════════════════════════════════
 * ⚠️ FROZEN — DO NOT EDIT
 * ═══════════════════════════════════════════════════════════════
 *
 * This service has been PORTED to core/extraction/extractionService.ts.
 * All production imports should use core/services/extractionService.
 *
 * This file is kept for:
 * - Backwards compatibility with V6 internal code
 * - Historical reference
 *
 * RULES:
 * ❌ DO NOT modify this file
 * ❌ DO NOT add new features here
 * ✅ Use core/extraction/extractionService.ts for new code
 */

// Re-export from core (FROZEN shim)
export { extractFromDictation } from '../../core/extraction/extractionService';
export type { ExtractedDataV6 as ExtractedData } from '../../contracts/extractionV6';
