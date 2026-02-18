export type Top20SmokeCase = {
    treatmentId: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV';
};

export const TOP20_SMOKE_CASES: Top20SmokeCase[] = [
    { treatmentId: 'fuellung', dictation: 'Zahn 26 Karies mesial distale Füllung mit Komposit.', insuranceType: 'GKV' },
    { treatmentId: 'endo', dictation: 'Wurzelkanalbehandlung an Zahn 46 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'extraction', dictation: 'Extraktion Zahn 28 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'roentgen', dictation: 'Roentgenaufnahme Zahn 36 erstellt.', insuranceType: 'GKV' },
    { treatmentId: 'pzr', dictation: 'PZR durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'crown_prep', dictation: 'Kronenpräparation an Zahn 11 durchgeführt.', insuranceType: 'PKV' },
    { treatmentId: 'ueberkappung', dictation: 'Ueberkappung bei pulpanaher Karies dokumentiert.', insuranceType: 'GKV' },
    { treatmentId: 'untersuchung', dictation: 'Eingehende Untersuchung durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'fissurenversiegelung', dictation: 'Fissurenversiegelung an Zahn 16 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'parodontologie', dictation: 'Parodontalbehandlung an Zahn 36 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'upt', dictation: 'UPT an Zahn 36 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'krone', dictation: 'Kronenversorgung an Zahn 16 durchgeführt.', insuranceType: 'PKV' },
    { treatmentId: 'teilkrone', dictation: 'Teilkronenversorgung an Zahn 16 durchgeführt.', insuranceType: 'PKV' },
    { treatmentId: 'wsr', dictation: 'Wurzelspitzenresektion an Zahn 11 durchgeführt.', insuranceType: 'GKV' },
    { treatmentId: 'trauma', dictation: 'Zahntrauma an Zahn 11 dokumentiert.', insuranceType: 'GKV' },
    { treatmentId: 'implant', dictation: 'Implantologische Behandlung regio 36 dokumentiert.', insuranceType: 'PKV' },
    { treatmentId: 'bruecke', dictation: 'Brueckenversorgung dokumentiert.', insuranceType: 'PKV' },
    { treatmentId: 'schiene', dictation: 'Schienentherapie dokumentiert.', insuranceType: 'PKV' },
    { treatmentId: 'teilprothese', dictation: 'Teilprothese dokumentiert.', insuranceType: 'PKV' },
    { treatmentId: 'totalprothese', dictation: 'Totalprothese dokumentiert.', insuranceType: 'PKV' },
];
