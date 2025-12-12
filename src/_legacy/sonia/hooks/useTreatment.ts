/**
 * Treatment Hook
 * 
 * Provides access to the treatment engine for the current treatment.
 * This is the bridge between the UI and the treatment definitions.
 */

import { useMemo } from 'react';
import { getTreatment } from '../treatments';
import {
    processTreatment,
    getDefaultActiveChips,
    getActiveUpsells
} from '../treatments/engine';
import { TreatmentOutput, InsuranceType } from '../treatments/types';

export interface UseTreatmentResult {
    // Treatment data
    treatment: ReturnType<typeof getTreatment>;
    chips: ReturnType<typeof getTreatment>['chips'] | [];
    defaultActiveChips: string[];

    // Processing
    process: (options: {
        activeChips: string[];
        extractedData: Record<string, any>;
        acceptedUpsells: string[];
        insuranceType: InsuranceType;
    }) => TreatmentOutput;

    // Upsells
    getUpsells: (data: Record<string, any>) => ReturnType<typeof getTreatment>['upsells'];
}

export function useTreatment(treatmentId: string | null): UseTreatmentResult {
    const treatment = useMemo(() => {
        if (!treatmentId) return undefined;
        return getTreatment(treatmentId);
    }, [treatmentId]);

    const chips = useMemo(() => {
        return treatment?.chips || [];
    }, [treatment]);

    const defaultActiveChips = useMemo(() => {
        if (!treatment) return [];
        return getDefaultActiveChips(treatment);
    }, [treatment]);

    const process = useMemo(() => {
        return (options: {
            activeChips: string[];
            extractedData: Record<string, any>;
            acceptedUpsells: string[];
            insuranceType: InsuranceType;
        }): TreatmentOutput => {
            if (!treatment) {
                return {
                    textLines: [],
                    procedureSnippets: [],
                    billingCodes: [],
                    dataPatches: {}
                };
            }

            return processTreatment({
                treatment,
                insuranceType: options.insuranceType,
                activeChips: options.activeChips,
                extractedData: options.extractedData,
                acceptedUpsells: options.acceptedUpsells
            });
        };
    }, [treatment]);

    const getUpsells = useMemo(() => {
        return (data: Record<string, any>) => {
            if (!treatment) return [];
            return getActiveUpsells(treatment, data);
        };
    }, [treatment]);

    return {
        treatment,
        chips,
        defaultActiveChips,
        process,
        getUpsells
    };
}
