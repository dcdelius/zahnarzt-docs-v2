import { UI_SELECTOR_TREATMENT_IDS } from '../../contracts/treatments.manifest';

export const SETTINGS_TREATMENT_IDS = [...UI_SELECTOR_TREATMENT_IDS] as const;

export type SettingsTreatmentId = typeof SETTINGS_TREATMENT_IDS[number];
