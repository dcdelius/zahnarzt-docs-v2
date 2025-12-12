import { BillingItem, BillingEngineResult, BillingSuggestion, RequirementHit } from './types';
import { CaseState } from '../types';
import { PREDICATES } from './predicates';

export interface BillingCtx {
    data: Record<string, any>;
    sources: Record<string, any>; // Source type
    insuranceType: 'GKV' | 'PKV';
    templateId: string;
    practiceId: string;
}

export function generateBillingSuggestions(
    activeItems: BillingItem[],
    caseState: CaseState,
    practiceId: string = 'default'
): BillingEngineResult {
    const ctx: BillingCtx = {
        data: caseState.data,
        sources: caseState.sources || {},
        insuranceType: caseState.meta?.insuranceType || 'GKV', // Default to GKV if missing
        templateId: caseState.meta?.templateId || 'default',
        practiceId: practiceId
    };

    const suggestions: BillingSuggestion[] = [];
    const blocked: BillingSuggestion[] = [];
    const excluded: BillingSuggestion[] = [];
    const requiredDocsMap: Record<string, { fieldId: string; reason: string; forItemIds: string[] }> = {};

    const manualSelected = new Set<string>((caseState.meta as any)?.manualBillingSelections || []);

    // 1. Filter & Check Eligibility
    for (const item of activeItems) {
        // A. Payer Check
        if (item.payer !== 'BOTH' && item.payer !== ctx.insuranceType) {
            continue; // Not relevant for this payer
        }

        const why: string[] = [];
        let isEligible = false;

        const mode = item.eligibility?.mode || 'auto';

        if (mode === 'manual') {
            if (manualSelected.has(item.id)) {
                isEligible = true;
                why.push('Manuell ausgewählt');
            } else {
                continue; // Skip manual items not selected
            }
        } else {
            // Auto Mode
            const predicateId = item.eligibility?.predicateId;

            if (predicateId) {
                const predicate = PREDICATES[predicateId];
                if (!predicate) {
                    // Unknown predicate -> Exclude
                    excluded.push(createSuggestion(item, ctx, 'excluded', ['Unbekanntes Prädikat: ' + predicateId], []));
                    continue;
                }

                if (predicate(caseState.data, ctx.insuranceType)) {
                    isEligible = true;
                    why.push('Automatisch erkannt');
                } else {
                    continue; // Not eligible
                }
            } else {
                // No predicate in Auto Mode -> NOT Eligible
                continue;
            }
        }

        if (!isEligible) continue;

        // C. Requirements Check
        // Check requirements
        let allRequirementsSatisfied = true;
        const requirements: RequirementHit[] = [];
        const blocks: string[] = []; // Collect messages for blocks

        if (item.requires) {
            for (const req of item.requires) {
                const value = ctx.data[req.fieldId];
                // Fix: Check for undefined/null/empty string, but allow false/0
                const isMissing = value === undefined || value === null || value === '';

                let reqSatisfied = !isMissing;

                if (reqSatisfied) {
                    // Check mustBeNonDefault
                    if (req.mustBeNonDefault) {
                        const source = ctx.sources?.[req.fieldId];
                        // Assuming 'default' is the marker for default values.
                        if (source === 'default' || !source) {
                            reqSatisfied = false;
                        }
                    }
                    // Check mustBeTruthy
                    if (reqSatisfied && req.mustBeTruthy) {
                        if (!value) {
                            reqSatisfied = false;
                        }
                    }
                    // Check expectedValue
                    if (reqSatisfied && req.expectedValue !== undefined) {
                        if (value !== req.expectedValue) {
                            reqSatisfied = false;
                        }
                    }
                }

                requirements.push({
                    fieldId: req.fieldId,
                    satisfied: reqSatisfied,
                    message: req.message
                });

                if (!reqSatisfied) {
                    allRequirementsSatisfied = false;
                    blocks.push(req.message); // Add message to blocks
                    // Aggregate required docs
                    if (!requiredDocsMap[req.fieldId]) {
                        requiredDocsMap[req.fieldId] = { fieldId: req.fieldId, reason: req.message, forItemIds: [] };
                    }
                    if (!requiredDocsMap[req.fieldId].forItemIds.includes(item.id)) {
                        requiredDocsMap[req.fieldId].forItemIds.push(item.id);
                    }
                }
            }
        }

        // D. Create Suggestion
        const isBlocked = !allRequirementsSatisfied;
        const status = isBlocked ? 'blocked' : 'suggested';
        const suggestion = createSuggestion(item, ctx, status, why, requirements, blocks);

        if (isBlocked) {
            blocked.push(suggestion);
        } else {
            suggestions.push(suggestion);
        }
    }

    // 2. Conflict Resolution (Group Exclusivity & Explicit Excludes)

    // A. Explicit Excludes
    const allActive = [...suggestions, ...blocked];
    const activeIds = new Set(allActive.map(s => s.itemId));

    for (const s of allActive) {
        // Guard: If item was already removed, skip
        if (!activeIds.has(s.itemId)) continue;

        const item = activeItems.find(i => i.id === s.itemId);
        if (item?.excludes) {
            for (const excludedId of item.excludes) {
                if (activeIds.has(excludedId)) {
                    // Find the victim
                    const victimSuggested = suggestions.find(v => v.itemId === excludedId);
                    const victimBlocked = blocked.find(v => v.itemId === excludedId);

                    if (victimSuggested) {
                        suggestions.splice(suggestions.indexOf(victimSuggested), 1);
                        victimSuggested.status = 'excluded';
                        victimSuggested.blocks = [`Ausgeschlossen durch ${s.label}`];
                        excluded.push(victimSuggested);
                    }
                    if (victimBlocked) {
                        blocked.splice(blocked.indexOf(victimBlocked), 1);
                        victimBlocked.status = 'excluded';
                        victimBlocked.blocks = [`Ausgeschlossen durch ${s.label}`];
                        excluded.push(victimBlocked);
                    }
                    activeIds.delete(excludedId);
                }
            }
        }
    }

    // B. Group Exclusivity
    const groups: Record<string, BillingSuggestion[]> = {};
    [...suggestions, ...blocked].forEach(s => {
        const item = activeItems.find(i => i.id === s.itemId);
        if (item?.group) {
            if (!groups[item.group]) groups[item.group] = [];
            groups[item.group].push(s);
        }
    });

    for (const groupId in groups) {
        const groupItems = groups[groupId];
        if (groupItems.length > 1) {
            // Sort by Status (Suggested > Blocked), then Priority desc, then ID asc
            groupItems.sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === 'suggested' ? -1 : 1; // Suggested wins
                }
                if (a.priority !== b.priority) {
                    return b.priority - a.priority; // Higher priority wins
                }
                return a.itemId.localeCompare(b.itemId); // Stable tie-break
            });

            // Keep winner, exclude others
            const winner = groupItems[0];
            for (let i = 1; i < groupItems.length; i++) {
                const loser = groupItems[i];
                // Move loser to excluded
                if (loser.status === 'suggested') {
                    const idx = suggestions.indexOf(loser);
                    if (idx > -1) suggestions.splice(idx, 1);
                } else {
                    const idx = blocked.indexOf(loser);
                    if (idx > -1) blocked.splice(idx, 1);
                }
                loser.status = 'excluded';
                loser.blocks = [`Verdrängt durch ${winner.label}`];
                excluded.push(loser);
            }
        }
    }

    // 3. Sort
    const sortFn = (a: BillingSuggestion, b: BillingSuggestion) => b.priority - a.priority;
    suggestions.sort(sortFn);
    blocked.sort(sortFn);

    return {
        suggested: suggestions,
        blocked: blocked,
        excluded: excluded,
        requiredDocs: Object.values(requiredDocsMap)
    };
}

function createSuggestion(
    item: BillingItem,
    ctx: BillingCtx,
    status: 'suggested' | 'blocked' | 'excluded',
    why: string[],
    requires: RequirementHit[],
    blocks: string[] = []
): BillingSuggestion {
    const code = ctx.insuranceType === 'GKV' ? (item.codes.gkv || item.codes.pkv || '') : (item.codes.pkv || item.codes.gkv || '');

    return {
        itemId: item.id,
        payer: ctx.insuranceType === 'GKV' ? 'GKV' : 'PKV', // Simplified
        code: code,
        label: item.label,
        priority: item.priority,
        why: why,
        requires: requires,
        status: status,
        blocks: blocks
    };
}
