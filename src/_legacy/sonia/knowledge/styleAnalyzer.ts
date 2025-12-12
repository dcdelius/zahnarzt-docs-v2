import { TreatmentSettings } from '../settings/settingsManager';

export interface StyleAnalysisResult {
    settings: Partial<TreatmentSettings>;
    detectedModules: string[];
    structure: {
        headerStyle: 'caps_equals' | 'simple' | 'none'; // === TITLE === vs Title:
        overviewPosition: 'top' | 'bottom' | 'none';
        billingStyle: 'list' | 'text' | 'hidden';
        courseStyle: 'running_text' | 'bullets' | 'telegram';
        forensicPosition: 'integrated_in_course' | 'footer' | 'separate_section';
        customHeaders: {
            overview?: string;
            course?: string;
        };
    };
    confidence: number;
    insights: string[];
}

export function analyzeStyle(text: string): StyleAnalysisResult {
    const lower = text.toLowerCase();
    const lines = text.split('\n');
    const insights: string[] = [];
    const detectedModules: string[] = [];

    // --- 1. MODULE DETECTION ---
    const moduleKeywords = {
        'anesthesia': ['infil', 'leitungs', 'anästhesie', 'ultracain', 'la '],
        'isolation': ['kofferdam', 'watterollen', 'isolation', 'trockenlegung'],
        'caries_depth': ['exkav', 'karies', 'sondenhart', 'cp', 'pulpa'],
        'matrix_system': ['matrize', 'keil', 'teilmatrize'],
        'conditioning': ['ätz', 'bond', 'adhäsiv', 'säure'],
        'technique': ['schicht', 'inkrement', 'komposit', 'fül'],
        'fluoridation': ['fluorid'],
        'xray': ['röntgen', 'bissflügel', 'zahnfilm', 'kontrolle'],
        'pulp_capping': ['überkappung', 'kalzium', 'cp '],
        'bmf': ['mundsperrer', 'bmf']
    };

    Object.entries(moduleKeywords).forEach(([module, keywords]) => {
        if (keywords.some(k => lower.includes(k))) {
            detectedModules.push(module);
        }
    });

    // --- 2. STRUCTURE DETECTION ---

    // Headers
    let headerStyle: 'caps_equals' | 'simple' | 'none' = 'none';
    if (text.includes('===') || text.includes('---')) {
        headerStyle = 'caps_equals';
        insights.push("Struktur: Hervorgehobene Überschriften (===)");
    } else if (lines.some(l => l.trim().endsWith(':') && l.length < 30)) {
        headerStyle = 'simple';
    }

    // Custom Headers Extraction
    let overviewHeader = "ÜBERSICHT & ABRECHNUNG";
    let courseHeader = "BEHANDLUNGSABLAUF";

    const overviewMatch = lines.find(l => l.toLowerCase().includes('übersicht') || l.toLowerCase().includes('abrechnung'));
    if (overviewMatch) overviewHeader = overviewMatch.replace(/[=:]/g, '').trim();

    const courseMatch = lines.find(l => l.toLowerCase().includes('ablauf') || l.toLowerCase().includes('verlauf'));
    if (courseMatch) courseHeader = courseMatch.replace(/[=:]/g, '').trim();

    // Overview Position
    const overviewIndex = lines.findIndex(l => l.toLowerCase().includes('übersicht') || l.toLowerCase().includes('zahn:'));
    const courseIndex = lines.findIndex(l => l.toLowerCase().includes('ablauf') || l.toLowerCase().includes('verlauf') || l.toLowerCase().includes('la '));

    let overviewPosition: 'top' | 'bottom' | 'none' = 'none';
    if (overviewIndex !== -1) {
        overviewPosition = (courseIndex === -1 || overviewIndex < courseIndex) ? 'top' : 'bottom';
        insights.push(overviewPosition === 'top' ? "Struktur: Übersicht am Anfang" : "Struktur: Übersicht am Ende");
    }

    // Billing Style
    let billingStyle: 'list' | 'text' | 'hidden' = 'hidden';
    if (lower.includes('goz') || lower.includes('bema') || lower.includes('leistung')) {
        if (text.includes('•') || text.includes('- ')) {
            billingStyle = 'list';
            insights.push("Abrechnung: Als Liste formatiert");
        } else {
            billingStyle = 'text';
        }
    }

    // Course Style
    let courseStyle: 'running_text' | 'bullets' | 'telegram' = 'telegram';
    const courseSection = lines.slice(courseIndex).join('\n').toLowerCase();
    if (courseSection.includes('•') || courseSection.includes('- ')) {
        courseStyle = 'bullets';
        insights.push("Verlauf: Stichpunkte");
    } else if (courseSection.includes('ich habe') || courseSection.length > 500) {
        courseStyle = 'running_text';
        insights.push("Verlauf: Fließtext");
    } else {
        courseStyle = 'telegram'; // Default for short sentences
        insights.push("Verlauf: Telegram-Stil");
    }

    // Forensic Position
    let forensicPosition: 'integrated_in_course' | 'footer' | 'separate_section' = 'footer';
    if (courseHeader.toLowerCase().includes('aufklärung') || courseHeader.toLowerCase().includes('forensik')) {
        forensicPosition = 'integrated_in_course';
        insights.push("Forensik: In Behandlungsablauf integriert");
    } else if (lower.includes('forensik:') || lower.includes('aufklärung:')) {
        forensicPosition = 'separate_section';
    }

    // --- 3. SETTINGS MAPPING ---
    const MASTER_ORDER = [
        'anesthesia', 'isolation', 'caries_depth', 'pulp_capping',
        'conditioning', 'matrix_system', 'technique', 'bmf', 'fluoridation', 'xray'
    ];
    const finalGroups = MASTER_ORDER.filter(g => detectedModules.includes(g));

    return {
        settings: {
            global: {
                showBillingCodes: billingStyle !== 'hidden',
                forensicLevel: lower.includes('risiko') || lower.includes('aufgeklärt') ? 'detailed' : 'standard',
                textLength: text.length < 300 ? 'compact' : 'standard',
            } as any,
            templateOverrides: {
                'master_fill_v3': {
                    groups: finalGroups
                }
            } as any
        },
        detectedModules,
        structure: {
            headerStyle,
            overviewPosition,
            billingStyle,
            courseStyle,
            forensicPosition,
            customHeaders: {
                overview: overviewHeader,
                course: courseHeader
            }
        },
        confidence: 0.95,
        insights
    };
}
