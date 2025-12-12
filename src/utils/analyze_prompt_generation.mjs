
import { buildGPTPrompts } from './buildGPTPrompts.js';
import fs from 'fs';

// Mock Template Data (based on V2_Kons_Fuellung)
const mockTemplate = {
    id: "V2_Kons_Fuellung",
    title: "Füllungstherapie",
    Kategorie: "Konservierend",
    Prompt: `**1) Leistungsübersicht (Abrechnung)**
Füllung Zahn {ZAHN} - {FLAECHEN} - {BETRAG} €
Intraligamentäre Anästhesie
Isolation mittels Kofferdamm
Matrize und Keil
Mehrschichttechnik bei Kompositfüllung
Politur der Füllung

**2) Behandlungsdokumentation (Praxisakte)**
Patient kommt zur Füllung an Zahn {ZAHN}, Flächen: {FLAECHEN}.
Klinische Untersuchung zeigt kariöse Läsion an Zahn {ZAHN} {FLAECHEN}.
Vitalitätsprüfung mit Kältespray {VIT}.
Röntgenologisch zeigt sich kariöse Läsion im Dentin.
Vor- und Nachteile der Kompositfüllung besprochen, Patient einverstanden.
Kosten: {BETRAG} € pro Zahn.
Intraligamentäre Anästhesie mit 1 Amp. Ultracain DS 1,7 ml durchgeführt.
Die Behandlung erfolgte unter Kofferdamm.
Zur Füllung wurde eine Matrize angelegt.
Keil und Spannring gesetzt.
Karies vollständig exkaviert.
Kavität mit Adhäsivtechnik vorbereitet.
Trockenlegung in SÄT durchgeführt.
Die Füllung wurde in Mehrschichttechnik gelegt.
Füllung mit {MATERIAL} schichtweise gelegt und lichthärtend polymerisiert.
Anatomische Ausformung hergestellt, Kontaktpunkt wiederhergestellt.
Überschüsse entfernt, Okklusion mit Artikulationspapier geprüft und eingeschliffen.
Abschließend wurde die Füllung poliert.
Duraphat auf Füllung und umliegende Zähne appliziert.
Postoperative Hinweise gegeben: 2 Stunden Nahrungspause, keine harten Speisen heute.
Kontrolltermin in 4 Wochen vereinbart.
Patient verließ die Praxis in stabilem Zustand.`,
    Material: "Anästhesie: Ultracain D-S 1:200.000\nBonding: Adhese Universal\nKomposit: Tetric EvoCeram",
    practiceDefaults: {
        standardLeistungen: 'Anästhesie, Kofferdam, Matrize, Adhäsivtechnik, Mehrschichttechnik, Politur, Okklusionsprüfung'
    },
    aiSettings: {
        forensicMode: false,
        revenueBooster: false,
        textLength: 'standard',
        blueprint: 'modern',
        materialCheck: true
    }
};

// Scenarios
const scenarios = [
    {
        name: "Scenario 1: Standard",
        inputText: "36 füllung, vit pos, 130 euro",
        config: {
            textLength: 'standard',
            forensicLevel: 'standard',
            activeStandards: ['Kofferdam', 'Längenmessung']
        }
    },
    {
        name: "Scenario 2: Forensic Max & Detailed",
        inputText: "36 füllung, vit pos",
        config: {
            textLength: 'detailed',
            forensicLevel: 'max',
            activeStandards: []
        }
    },
    {
        name: "Scenario 3: Custom Blueprint",
        inputText: "36 füllung",
        templateOverride: {
            customBlueprint: "MY CUSTOM STRUCTURE:\n1. Diagnosis\n2. Treatment\n3. Billing"
        },
        config: {
            textLength: 'standard',
            forensicLevel: 'standard'
        }
    },
    {
        name: "Scenario 4: Safety Violation Attempt",
        inputText: "36 mesial mod",
        config: {
            textLength: 'short',
            forensicLevel: 'minimal'
        }
    }
];

let outputLog = "";

console.log("Starting Analysis...");

scenarios.forEach(scenario => {
    outputLog += `\n\n===================================================\n`;
    outputLog += `SCENARIO: ${scenario.name}\n`;
    outputLog += `INPUT: "${scenario.inputText}"\n`;
    outputLog += `CONFIG: ${JSON.stringify(scenario.config)}\n`;
    outputLog += `===================================================\n`;

    const templateToUse = { ...mockTemplate, ...(scenario.templateOverride || {}) };

    try {
        const result = buildGPTPrompts({
            template: templateToUse,
            inputText: scenario.inputText,
            ...scenario.config
        });

        outputLog += `\n--- SYSTEM PROMPT ---\n${result.systemPrompt}\n`;
        outputLog += `\n--- USER PROMPT ---\n${result.userPrompt}\n`;

    } catch (error) {
        outputLog += `\nERROR: ${error.message}\n`;
    }
});

fs.writeFileSync('prompt_analysis_output.txt', outputLog);
console.log("Analysis complete. Output written to prompt_analysis_output.txt");
