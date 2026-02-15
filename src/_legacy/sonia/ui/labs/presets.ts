export interface DocumentationPreset {
    id: string;
    name: string;
    description: string;
    iconGradient: [string, string]; // From color, To color
    iconType: 'lightning' | 'balance' | 'shield' | 'chart';
    settings: {
        forensicLevel: 'minimal' | 'standard' | 'detailed';
        textLength: 'compact' | 'standard' | 'verbose';
        showBillingCodes: boolean;
        tone: 'professional' | 'friendly';
        includeGroups: string[];
    };
}

export const DOCUMENTATION_PRESETS: DocumentationPreset[] = [
    {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Kurz, knapp, telegram-style. Perfekt für Routine-Fälle.',
        iconGradient: ['#8B5CF6', '#EC4899'],
        iconType: 'lightning',
        settings: {
            forensicLevel: 'minimal',
            textLength: 'compact',
            showBillingCodes: false,
            tone: 'professional',
            includeGroups: ['anesthesia', 'caries_depth', 'technique']
        }
    },
    {
        id: 'balanced',
        name: 'Balanced',
        description: 'Standard-Modus mit allen wichtigen Details.',
        iconGradient: ['#3B82F6', '#8B5CF6'],
        iconType: 'balance',
        settings: {
            forensicLevel: 'standard',
            textLength: 'standard',
            showBillingCodes: true,
            tone: 'professional',
            includeGroups: ['anesthesia', 'isolation', 'caries_depth', 'conditioning', 'technique', 'fluoridation']
        }
    },
    {
        id: 'forensic',
        name: 'Forensic Plus',
        description: 'Maximaler Rechtsschutz. Lückenlose Dokumentation.',
        iconGradient: ['#10B981', '#14B8A6'],
        iconType: 'shield',
        settings: {
            forensicLevel: 'detailed',
            textLength: 'verbose',
            showBillingCodes: true,
            tone: 'professional',
            includeGroups: ['anesthesia', 'isolation', 'caries_depth', 'pulp_capping', 'conditioning', 'matrix_system', 'technique', 'bmf', 'fluoridation', 'xray']
        }
    },
    {
        id: 'revenue',
        name: 'Revenue First',
        description: 'Abrechnungs-optimiert. GOZ-Potenzial ausschöpfen.',
        iconGradient: ['#F59E0B', '#EF4444'],
        iconType: 'chart',
        settings: {
            forensicLevel: 'standard',
            textLength: 'standard',
            showBillingCodes: true,
            tone: 'professional',
            includeGroups: ['anesthesia', 'isolation', 'caries_depth', 'pulp_capping', 'conditioning', 'matrix_system', 'technique', 'bmf', 'fluoridation']
        }
    }
];
