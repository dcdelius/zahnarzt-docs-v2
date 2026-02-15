import { describe, it, expect } from 'vitest';
import { getStandardChipIdsForInstance } from '../../settings/chipStandards';

describe('Settings: chipStandards', () => {
    it('filters unknown chips and preserves stable order', () => {
        const settings = {
            practice: {
                chipStandards: {
                    global: ['fluor', 'finishing'],
                    perTreatment: {
                        fuellung: ['komposit_basic'],
                    },
                },
            },
            user: {
                chipStandards: {
                    global: ['finishing', 'unknown_chip'],
                    perTreatment: {
                        fuellung: ['fluor', 'finishing'],
                    },
                },
            },
        };

        const result = getStandardChipIdsForInstance({
            settings,
            treatmentId: 'fuellung',
        });

        expect(result).toEqual(['fluor', 'finishing', 'komposit_basic']);
    });
});
