/**
 * Askback Queue
 * 
 * Provides priority-based, dependency-aware, deduplicated askback queue.
 * 
 * ## Priority Rules
 * 1. Severity: error > warn
 * 2. Trigger type: missingField > missingCode > fieldValue > complexCase
 * 3. Stable tie-break: templateId alphabetically
 * 
 * ## Dependency Handling
 * - Templates with requiresField or dependsOn.fields are blocked until fields exist
 * - Templates with dependsOn.templates wait for those templates to be asked
 * 
 * ## Deduplication
 * - Default dedupeKey: ruleId + trigger.type + trigger.field + trigger.missingCode + fzSet
 * - Custom dedupeKey overrides default
 * - Once asked, never ask again (except 1 retry on invalid answer)
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AskbackTemplate {
    templateId: string;
    ruleId: string;
    severity: 'error' | 'warn';
    priority?: number;
    dedupeKey?: string;
    dependsOn?: {
        fields?: string[];
        templates?: string[];
    };
    trigger: {
        type: 'missingField' | 'missingCode' | 'fieldValue' | 'complexCase';
        field?: string;
        whenFzCodesInclude?: string[];
        missingCode?: string;
        requiresField?: string;
        when?: Record<string, any>;
        value?: any;
    };
    expectedAnswer?: {
        type: 'boolean' | 'enum' | 'stringArray' | 'object';
        options?: string[];
        itemPattern?: string;
        minItems?: number;
        maxItems?: number;
    };
    writeback?: Record<string, any>;
    [key: string]: any;
}

export interface CaseState {
    id: string;
    category?: string;
    befundklasse?: string;
    festzuschuss?: { fzCodes?: string[] };
    [key: string]: any;
}

export interface QueuedAskback {
    template: AskbackTemplate;
    priority: number;
    dedupeKey: string;
    blockedReason?: string;
}

export interface AskbackQueueState {
    pending: QueuedAskback[];
    asked: Set<string>; // dedupeKeys
    askedTemplateIds: string[];
    dedupedTemplates: string[];
    blockedTemplates: Array<{ templateId: string; reason: string }>;
    invalidAnswers: Array<{ templateId: string; reason: string; retryCount: number }>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const TRIGGER_TYPE_PRIORITY: Record<string, number> = {
    missingField: 100,
    missingCode: 80,
    fieldValue: 60,
    complexCase: 40,
};

const SEVERITY_PRIORITY: Record<string, number> = {
    error: 1000,
    warn: 500,
};

// ═══════════════════════════════════════════════════════════════
// PRIORITY CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculates priority for a template.
 * Higher priority = should be asked first.
 */
export function calculatePriority(template: AskbackTemplate): number {
    if (template.priority !== undefined) {
        return template.priority;
    }

    const severityScore = SEVERITY_PRIORITY[template.severity] ?? 0;
    const triggerScore = TRIGGER_TYPE_PRIORITY[template.trigger.type] ?? 0;

    return severityScore + triggerScore;
}

/**
 * Generates dedupe key for a template and case.
 */
export function generateDedupeKey(template: AskbackTemplate, caseState: CaseState): string {
    if (template.dedupeKey) {
        return template.dedupeKey;
    }

    const trigger = template.trigger;
    const fzCodes = caseState.festzuschuss?.fzCodes ?? [];

    // Normalize FZ codes: only those in whenFzCodesInclude, sorted
    let normalizedFzSet = '';
    if (trigger.whenFzCodesInclude && trigger.whenFzCodesInclude.length > 0) {
        const matching = fzCodes.filter(z => trigger.whenFzCodesInclude!.includes(z));
        normalizedFzSet = [...matching].sort().join(',');
    }

    return [
        template.ruleId,
        trigger.type,
        trigger.field ?? '',
        trigger.missingCode ?? '',
        normalizedFzSet,
    ].join('::');
}

// ═══════════════════════════════════════════════════════════════
// DEPENDENCY CHECKING
// ═══════════════════════════════════════════════════════════════

/**
 * Checks if a template's dependencies are satisfied.
 * Returns null if satisfied, or reason string if blocked.
 */
export function checkDependencies(
    template: AskbackTemplate,
    caseState: CaseState,
    askedTemplateIds: string[]
): string | null {
    // Check requiresField (from trigger)
    if (template.trigger.requiresField) {
        const field = template.trigger.requiresField;
        if (caseState[field] === undefined) {
            return `BLOCKED_MISSING_FIELD: ${field}`;
        }
    }

    // Check dependsOn.fields
    if (template.dependsOn?.fields) {
        for (const field of template.dependsOn.fields) {
            if (caseState[field] === undefined) {
                return `BLOCKED_MISSING_FIELD: ${field}`;
            }
        }
    }

    // Check dependsOn.templates
    if (template.dependsOn?.templates) {
        for (const templateId of template.dependsOn.templates) {
            if (!askedTemplateIds.includes(templateId)) {
                return `BLOCKED_MISSING_TEMPLATE: ${templateId}`;
            }
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// ANSWER VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Validates an answer against template's expectedAnswer spec.
 */
export function validateAnswer(template: AskbackTemplate, answer: any): ValidationResult {
    const spec = template.expectedAnswer;
    if (!spec) {
        return { valid: true };
    }

    switch (spec.type) {
        case 'boolean':
            if (typeof answer !== 'boolean') {
                return { valid: false, reason: 'Expected boolean' };
            }
            break;

        case 'enum':
            if (!spec.options?.includes(answer)) {
                return { valid: false, reason: `Expected one of: ${spec.options?.join(', ')}` };
            }
            break;

        case 'stringArray':
            if (!Array.isArray(answer)) {
                return { valid: false, reason: 'Expected array' };
            }
            for (const item of answer) {
                if (typeof item !== 'string') {
                    return { valid: false, reason: 'Array items must be strings' };
                }
                if (spec.itemPattern) {
                    const re = new RegExp(spec.itemPattern);
                    if (!re.test(item)) {
                        return { valid: false, reason: `Item "${item}" does not match pattern` };
                    }
                }
            }
            if (spec.minItems && answer.length < spec.minItems) {
                return { valid: false, reason: `Minimum ${spec.minItems} items required` };
            }
            if (spec.maxItems && answer.length > spec.maxItems) {
                return { valid: false, reason: `Maximum ${spec.maxItems} items allowed` };
            }
            break;

        case 'object':
            if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
                return { valid: false, reason: 'Expected object' };
            }
            break;
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// QUEUE BUILDING
// ═══════════════════════════════════════════════════════════════

/**
 * Builds prioritized askback queue for a case.
 */
export function buildAskbackQueue(
    caseState: CaseState,
    templates: AskbackTemplate[],
    queueState: AskbackQueueState
): QueuedAskback[] {
    const fzCodes = caseState.festzuschuss?.fzCodes ?? [];
    const queue: QueuedAskback[] = [];
    const seenDedupeKeys = new Set<string>();

    for (const template of templates) {
        const dedupeKey = generateDedupeKey(template, caseState);

        // Already asked in this session
        if (queueState.asked.has(dedupeKey)) {
            continue;
        }

        // Dedupe within this batch
        if (seenDedupeKeys.has(dedupeKey)) {
            queueState.dedupedTemplates.push(template.templateId);
            continue;
        }
        seenDedupeKeys.add(dedupeKey);

        // Check trigger applicability
        if (!isTemplateTriggered(template, caseState)) {
            continue;
        }

        // Check dependencies
        const blockReason = checkDependencies(template, caseState, queueState.askedTemplateIds);

        const item: QueuedAskback = {
            template,
            priority: calculatePriority(template),
            dedupeKey,
            blockedReason: blockReason ?? undefined,
        };

        if (blockReason) {
            queueState.blockedTemplates.push({
                templateId: template.templateId,
                reason: blockReason,
            });
        } else {
            queue.push(item);
        }
    }

    // Sort by priority desc, then templateId asc for stability
    queue.sort((a, b) => {
        if (b.priority !== a.priority) {
            return b.priority - a.priority; // Higher first
        }
        return a.template.templateId.localeCompare(b.template.templateId);
    });

    return queue;
}

/**
 * Checks if a template's trigger condition is met for a case.
 */
function isTemplateTriggered(template: AskbackTemplate, caseState: CaseState): boolean {
    const trigger = template.trigger;
    const fzCodes = caseState.festzuschuss?.fzCodes ?? [];

    // Check whenFzCodesInclude
    if (trigger.whenFzCodesInclude && trigger.whenFzCodesInclude.length > 0) {
        const hasMatch = trigger.whenFzCodesInclude.some(z => fzCodes.includes(z));
        if (!hasMatch) return false;
    }

    switch (trigger.type) {
        case 'missingField':
            if (!trigger.field) return false;
            return caseState[trigger.field] === undefined;

        case 'missingCode':
            if (!trigger.missingCode) return false;
            return !fzCodes.includes(trigger.missingCode);

        case 'fieldValue':
            if (!trigger.field) return false;
            return caseState[trigger.field] === trigger.value;

        case 'complexCase':
            // Always triggered if fzCodes match (checked above)
            return true;

        default:
            return false;
    }
}

/**
 * Selects next askback from queue (single-question per pass).
 */
export function selectNextAskback(
    queue: QueuedAskback[]
): QueuedAskback | null {
    if (queue.length === 0) return null;
    return queue[0]; // Already sorted by priority
}

// ═══════════════════════════════════════════════════════════════
// QUEUE STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export function createQueueState(): AskbackQueueState {
    return {
        pending: [],
        asked: new Set(),
        askedTemplateIds: [],
        dedupedTemplates: [],
        blockedTemplates: [],
        invalidAnswers: [],
    };
}

export function markAsAsked(state: AskbackQueueState, item: QueuedAskback): void {
    state.asked.add(item.dedupeKey);
    state.askedTemplateIds.push(item.template.templateId);
}

export function markInvalidAnswer(
    state: AskbackQueueState,
    templateId: string,
    reason: string
): void {
    const existing = state.invalidAnswers.find(a => a.templateId === templateId);
    if (existing) {
        existing.retryCount += 1;
    } else {
        state.invalidAnswers.push({ templateId, reason, retryCount: 0 });
    }
}

/**
 * Checks if a retry is allowed for a template.
 */
export function canRetry(state: AskbackQueueState, templateId: string): boolean {
    const entry = state.invalidAnswers.find(a => a.templateId === templateId);
    return !entry || entry.retryCount < 1;
}
