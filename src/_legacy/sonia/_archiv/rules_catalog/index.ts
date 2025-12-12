import { SmartRule } from '../types';
import { CONSERVATIVE_RULES } from './conservative';
import { ENDO_RULES } from './endo';
import { SURGERY_RULES } from './surgery';
import { PREVENTION_RULES } from './prevention';

export const RULE_CATALOGS: Record<string, SmartRule[]> = {
    conservative: CONSERVATIVE_RULES,
    endo: ENDO_RULES,
    surgery: SURGERY_RULES,
    prevention: PREVENTION_RULES
};

export const getRuleCatalog = (catalogId?: string): SmartRule[] => {
    if (catalogId && RULE_CATALOGS[catalogId]) {
        return RULE_CATALOGS[catalogId];
    }
    return CONSERVATIVE_RULES;
};

