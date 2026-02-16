import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SoftGradientBackground } from '../components';
import { colors, gradients, radii, shadows, typography, spacing } from '../styles/tokens';
import { useSettings } from '../settings/useSettings';
import { useUser } from '../../../contexts/UserContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { PracticeSettings, UserSettings } from '../settings/settingsTypes';
import { DEFAULT_DOC_CHIPS } from '../settings/docStandardChips';
import {
    MATERIAL_CATALOG,
    MATERIAL_CATEGORY_META,
    type MaterialCatalogItem,
    type MaterialCategory,
} from '../registry/materialCatalog';
import './SettingsPageV10.css';
import { adminService, type NewUserData } from '../settings/adminService';
import type { PracticeRole } from '../../core/auth/authTypes';
import { TREATMENT_DEFINITIONS, TREATMENT_CATEGORIES, TREATMENT_IDS as ALL_TREATMENT_IDS, TREATMENT_LABELS } from '../settings/treatmentMaster';
import { SegmentedControl } from '../components/SegmentedControl';
import { SettingRow } from '../components/SettingRow';
import { PillToggleGroup } from '../components/PillToggleGroup';
import { ActionBar } from '../components/ActionBar';
import { InstrumentPanel } from '../components/InstrumentPanel';
import { Band } from '../components/Band';
import { ValueCapsule } from '../components/ValueCapsule';
import { InlineExpandPanel } from '../components/InlineExpandPanel';
import { OverlaySelectField } from '../components/OverlaySelectField';
import { OverlayMultiSelectField } from '../components/OverlayMultiSelectField';
import { HeaderDock } from '../components/HeaderDock';
import { deriveSettingsCapabilities } from '../settings/permissionPolicy';
import {
    getPracticeDefaultAnestheticAgentId,
    getUserDefaultAnestheticAgentId,
    getUserDefaultCappingMaterial,
    getUserDefaultIsolation,
    getUserDefaultLAType,
    getUserDefaultLATypeUkPosterior,
    patchPracticeDefaultAnestheticAgentId,
    patchUserDefaultAnestheticAgentId,
    patchUserDefaultCappingMaterial,
    patchUserDefaultIsolation,
    patchUserDefaultLAType,
    patchUserDefaultLATypeUkPosterior,
} from '../settings/medicalDefaults';

// TREATMENT_LABELS and ALL_TREATMENT_IDS now imported from treatmentMaster.ts
const TREATMENT_IDS = ALL_TREATMENT_IDS;
const GENERAL_TREATMENT_ID = 'allgemein';

/**
 * Phase 0 — Mandatory Scan Summary (settings state + persistence)
 * ════════════════════════════════════════════════════════════════
 * 
 * STATE SHAPE:
 * - practiceSettings: PracticeSettings (materials, devices, anesthetics)
 * - userSettings: UserSettings (chip defaults, treatment prefs, text style)
 * - Chip defaults: userSettings.chipStandards.global (string[])
 * - Treatment defaults: userSettings.treatments[treatmentId].* (per-treatment)
 * 
 * UPDATE FUNCTIONS:
 * - updateUser(partial) → merges into userSettings → triggers save
 * - updateUserTreatment(treatmentId, partial) → nested treatment update
 * - updatePractice(partial) → practice-wide settings
 * 
 * DIRTY / SAVE / RESET:
 * - isDirty state tracks unsaved changes
 * - ActionBar shows "Zurücksetzen" / "Speichern" when dirty
 * - Persistence: Firestore (cloud) + localStorage (offline fallback)
 * - Save: updateUserSettings() commits to Firestore
 * 
 * DROPDOWNS:
 * - All selects now use OverlaySelectField (light/glassy overlay panel)
 * - Options: { id, label }[] format
 * - State flows through existing onChange handlers
 */

function getRoleLabel(role?: string) {
    if (!role) return 'Behandler';
    return role;
}

function normalizeList(value: string) {
    return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function buildV10CssVars(): React.CSSProperties {
    // Keep the V10 settings surface aligned with Jeton by setting the V7 CSS variables.
    return {
        '--v7-font-display': typography.fontFamily,
        '--v7-font-body': typography.fontFamily,
        '--v7-cream': '#0d0d12',
        '--v7-cream-2': colors.surfaceCard,
        '--v7-peach': colors.surfaceGlass,
        '--v7-coral': colors.coralAccent,
        '--v7-orange': colors.coralMid,
        '--v7-yellow': colors.softApricot,
        '--v7-ink': colors.textPrimary,
        '--v7-ink-soft': colors.textSecondary,
        '--v7-white': colors.textPrimary,
        '--v7-hairline': colors.lineDivider,
        '--v7-glass': colors.surfaceGlass,
        '--v7-glass-2': colors.surfaceGlassActive,
        '--v7-shadow-soft': shadows.cardMedium,
        '--v7-shadow-pill': shadows.buttonDefault,
        '--v7-shadow-bloom': shadows.buttonGlow,
        '--v7-r-xl': radii.card,
        '--v7-r-pill': radii.pill,
    } as React.CSSProperties;
}

function TagInput({
    label,
    values,
    placeholder,
    onChange,
    disabled,
}: {
    label: string;
    values: string[];
    placeholder?: string;
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState('');
    const addValues = () => {
        if (!draft.trim()) return;
        const next = Array.from(new Set([...values, ...normalizeList(draft)]));
        onChange(next);
        setDraft('');
    };
    const removeValue = (value: string) => {
        onChange(values.filter(v => v !== value));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <label style={{ fontSize: typography.label, color: colors.textSecondary, fontWeight: typography.semibold }}>
                {label}
            </label>
            <div style={{
                display: 'flex',
                gap: spacing.sm,
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: 0,
            }}>
                {values.length === 0 && (
                    <span style={{ color: colors.textSubtle, fontSize: typography.caption }}>
                        Keine Einträge
                    </span>
                )}
                {values.map(val => (
                    <span key={val} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: '4px 10px',
                        borderRadius: radii.pill,
                        background: colors.surfaceGlassActive,
                        color: colors.textPrimary,
                        fontSize: typography.caption,
                    }}>
                        {val}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeValue(val)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: colors.textSubtle,
                                    cursor: 'pointer',
                                    fontSize: typography.caption,
                                }}
                            >
                                ×
                            </button>
                        )}
                    </span>
                ))}
            </div>
            <div style={{ display: 'flex', gap: spacing.sm }}>
                <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={placeholder ?? 'Einträge, getrennt durch Komma'}
                    disabled={disabled}
                    className="v10-settings-input v10-settings-inputInline"
                />
                <button
                    type="button"
                    onClick={addValues}
                    disabled={disabled}
                    style={{
                        padding: '10px 14px',
                        borderRadius: radii.pill,
                        border: 'none',
                        background: disabled ? 'rgba(255,255,255,0.10)' : gradients.button,
                        color: colors.textPrimary,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        fontWeight: typography.semibold,
                    }}
                >
                    Hinzufügen
                </button>
            </div>
        </div>
    );
}

function SettingSelect({
    label,
    value,
    options,
    description,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    description?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    // Convert options format for OverlaySelectField
    const overlayOptions = options.map(opt => ({ id: opt.value, label: opt.label }));
    const selectedLabel = options.find(opt => opt.value === value)?.label ?? value;

    return (
        <OverlaySelectField
            label={label}
            helper={description}
            value={selectedLabel}
            options={overlayOptions}
            selectedId={value}
            onSelect={onChange}
            disabled={disabled}
        />
    );
}

function MaterialCatalogPicker({
    title,
    subtitle,
    items,
    selectedIds,
    disabled,
    onToggle,
}: {
    title: string;
    subtitle?: string;
    items: MaterialCatalogItem[];
    selectedIds: string[];
    disabled?: boolean;
    onToggle: (id: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(i => {
            const hay = `${i.label} ${i.manufacturer} ${i.productLine ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [items, query]);

    const grouped = useMemo(() => {
        const map = new Map<string, MaterialCatalogItem[]>();
        for (const item of filtered) {
            const key = item.category;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        }
        const entries = Array.from(map.entries())
            .sort((a, b) => {
                const aMeta = MATERIAL_CATEGORY_META[a[0] as MaterialCategory];
                const bMeta = MATERIAL_CATEGORY_META[b[0] as MaterialCategory];
                return (aMeta?.order ?? 999) - (bMeta?.order ?? 999);
            })
            .map(([category, list]) => ({
                category,
                label: MATERIAL_CATEGORY_META[category as MaterialCategory]?.label ?? category,
                items: list,
            }));
        return entries;
    }, [filtered]);

    useEffect(() => {
        // Initialize open state (keep it stable, do not override user toggles).
        setOpenCategories(prev => {
            let changed = false;
            const next = { ...prev };
            for (const g of grouped) {
                if (!(g.category in next)) {
                    next[g.category] = g.items.length <= 6; // open small groups by default
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [grouped]);

    return (
        <div style={{ display: 'grid', gap: spacing.sm }}>
            <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: typography.label, color: colors.textSecondary, fontWeight: typography.semibold }}>
                    {title}
                </div>
                {subtitle ? (
                    <div style={{ color: colors.textMuted, fontSize: typography.bodySmall, lineHeight: typography.lineHeightRelaxed }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen (Hersteller / Produkt)…"
                disabled={disabled}
                className="v10-settings-input"
            />
            <div style={{ display: 'grid', gap: 12 }}>
                {grouped.map(group => {
                    const open = openCategories[group.category] ?? false;
                    const selectedCount = group.items.filter(i => selectedIds.includes(i.id)).length;
                    return (
                        <div key={group.category} style={{ display: 'grid', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setOpenCategories(prev => ({ ...prev, [group.category]: !open }))}
                                className="v10-settings-navGroupToggle"
                                style={{
                                    justifyContent: 'space-between',
                                    padding: '8px 6px',
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.82)',
                                }}
                                disabled={disabled}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, letterSpacing: '0.12em' }}>{group.label}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em' }}>
                                        {selectedCount}/{group.items.length}
                                    </span>
                                </span>
                                <span className={`v10-settings-navChevron ${open ? 'is-open' : ''}`}>⌄</span>
                            </button>
                            {open ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 6 }}>
                                    {group.items.map(item => {
                                        const active = selectedIds.includes(item.id);
                                        const label = `${item.label}`;
                                        const hint = item.manufacturer ? ` (${item.manufacturer})` : '';
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`v10-settings-pill ${active ? 'v10-settings-pillActive' : 'v10-settings-pillSecondary'}`}
                                                disabled={disabled}
                                                onClick={() => onToggle(item.id)}
                                                title={`${item.label}${hint}${item.notes ? ` — ${item.notes}` : ''}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SectionCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <section style={{ padding: `${spacing.sm} 0` }}>
            <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: typography.body, color: colors.textPrimary, fontWeight: typography.semibold }}>
                    {title}
                </div>
                {subtitle ? (
                    <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: typography.lineHeightRelaxed }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            <div className="v10-settings-divider" />
            <div style={{ display: 'grid', gap: spacing.lg }}>
                {children}
            </div>
        </section>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <SettingRow label={label} helper={description}>
            <label className="v10-toggle-control">
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={e => onChange(e.target.checked)}
                    className="v10-toggle-input"
                />
                <span className={`v10-toggle-track ${checked ? 'is-on' : ''}`}>
                    <span className="v10-toggle-thumb" />
                </span>
            </label>
        </SettingRow>
    );
}

function SettingTextField({
    label,
    description,
    value,
    placeholder,
    disabled,
    onChange,
}: {
    label: string;
    description?: string;
    value: string;
    placeholder?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div style={{ display: 'grid', gap: spacing.xs }}>
            <div style={{ fontSize: typography.label, color: colors.textSecondary, fontWeight: typography.semibold }}>
                {label}
            </div>
            {description ? (
                <div style={{ fontSize: typography.bodySmall, color: colors.textMuted }}>
                    {description}
                </div>
            ) : null}
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                onChange={event => onChange(event.target.value)}
                className="v10-settings-input"
            />
        </div>
    );
}

function PillTabs({
    items,
    value,
    onChange,
    ariaLabel,
}: {
    items: Array<{ key: string; label: string }>;
    value: string;
    onChange: (next: string) => void;
    ariaLabel: string;
}) {
    return (
        <div className="v10-settings-pillRow" role="tablist" aria-label={ariaLabel}>
            {items.map(item => (
                <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={value === item.key}
                    className={[
                        'v10-settings-pill',
                        value === item.key ? 'v10-settings-pillActive' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => onChange(item.key)}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}

function UserPicker({
    users,
    selectedUser,
    onChange,
    disabled,
}: {
    users: Array<{ id: string; name: string; role?: string }>;
    selectedUser: string;
    onChange: (next: string) => void;
    disabled?: boolean;
}) {
    const options = users.map(u => ({
        id: u.id,
        label: `${u.name}${u.role ? ` (${getRoleLabel(u.role)})` : ''}`
    }));
    const selected = users.find(u => u.id === selectedUser);
    const displayValue = selected
        ? `${selected.name}${selected.role ? ` (${getRoleLabel(selected.role)})` : ''}`
        : 'Auswählen...';

    return (
        <OverlaySelectField
            label="Benutzer"
            value={displayValue}
            options={options}
            selectedId={selectedUser}
            onSelect={onChange}
            disabled={disabled}
        />
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div style={{
            padding: spacing.md,
            borderRadius: radii.cardSmall,
            border: 'none',
            background: 'rgba(255,255,255,0.05)',
            color: colors.textMuted,
            fontSize: typography.bodySmall,
        }}>
            {text}
        </div>
    );
}

export default function SettingsPageV10() {
    const { users, selectedUser, setSelectedUser } = useUser();
    const { actorRole } = useAuth();
    const {
        practiceSettings,
        userSettings,
        updatePracticeSettings,
        updateUserSettings,
        isLoaded,
        canEditPractice: canEditPracticeByHook,
    } = useSettings({ userId: selectedUser, actorRole });

    const [activeScope, setActiveScope] = useState<'practice' | 'user'>('practice');
    const [activeTreatmentId, setActiveTreatmentId] = useState<string>(GENERAL_TREATMENT_ID);
    const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
    const [showAdvancedUser, setShowAdvancedUser] = useState(false);
    const [showInlineCreateUser, setShowInlineCreateUser] = useState(false);
    const [showFuellungPracticeMaterials, setShowFuellungPracticeMaterials] = useState(false);
    const [openTreatmentGroups, setOpenTreatmentGroups] = useState<Record<string, boolean>>({});
    const [isTreatmentsOpen, setIsTreatmentsOpen] = useState(true);
    const [chipDefaultsOpen, setChipDefaultsOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => {
        if (activeScope === 'practice' && activeTreatmentId !== GENERAL_TREATMENT_ID) {
            setActiveTreatmentId(GENERAL_TREATMENT_ID);
        }
    }, [activeScope, activeTreatmentId]);

    // Admin State
    const [newUserState, setNewUserState] = useState<NewUserData>({ name: '', role: 'provider', email: '' });
    const [createUserStatus, setCreateUserStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
    const [createUserError, setCreateUserError] = useState<string | null>(null);

    const currentUser = useMemo(() => users.find(u => u.id === selectedUser) ?? null, [users, selectedUser]);

    // Handler to select user by User object (for HeaderDock)
    const handleUserSelect = (user: { id: string; name: string }) => {
        setSelectedUser(user.id);
    };
    const v10CssVars = useMemo(() => buildV10CssVars(), []);
    const canEditPractice = canEditPracticeByHook;
    const enabledTreatments = userSettings.enabledTreatments ?? TREATMENT_IDS;
    const capabilities = useMemo(
        () => deriveSettingsCapabilities(actorRole, practiceSettings),
        [actorRole, practiceSettings]
    );
    const isTreatmentOverrideLocked = !capabilities.canEditUserTreatmentSelection;
    const isFuellungMaterialDefaultsLocked = !capabilities.canEditUserFuellungMaterialDefaults;

    useEffect(() => {
        const allIds = [GENERAL_TREATMENT_ID, ...TREATMENT_IDS];
        if (!allIds.includes(activeTreatmentId)) {
            setActiveTreatmentId(GENERAL_TREATMENT_ID);
        }
    }, [activeTreatmentId]);

    useEffect(() => {
        if (users.length && (!selectedUser || !users.some(user => user.id === selectedUser))) {
            setSelectedUser(users[0].id);
        }
    }, [selectedUser, users, setSelectedUser]);

    useEffect(() => {
        setLastChangedAt(null);
    }, [selectedUser]);


    const treatmentGroups = useMemo(() => {
        const grouped = new Map<string, string[]>();
        for (const id of TREATMENT_IDS) {
            const category = TREATMENT_DEFINITIONS[id]?.category ?? 'sonstiges';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category)?.push(id);
        }

        const categories = Object.entries(TREATMENT_CATEGORIES)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([key, meta]) => ({
                key,
                label: meta.label,
                items: grouped.get(key) ?? [],
            }))
            .filter(group => group.items.length > 0);

        return categories;
    }, []);

    useEffect(() => {
        setOpenTreatmentGroups(prev => {
            let changed = false;
            const next = { ...prev };
            for (const group of treatmentGroups) {
                if (!(group.key in next)) {
                    next[group.key] = false;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [treatmentGroups]);

    useEffect(() => {
        if (activeTreatmentId === GENERAL_TREATMENT_ID) return;
        const category = TREATMENT_DEFINITIONS[activeTreatmentId]?.category;
        if (!category) return;
        setOpenTreatmentGroups(prev => ({
            ...prev,
            [category]: true,
        }));
    }, [activeTreatmentId]);

    const activeTreatmentLabel = useMemo(() => {
        if (activeTreatmentId === GENERAL_TREATMENT_ID) return 'Allgemein';
        return TREATMENT_DEFINITIONS[activeTreatmentId]?.labelShort
            || TREATMENT_LABELS[activeTreatmentId]
            || activeTreatmentId;
    }, [activeTreatmentId]);

    const endoAllowedWlOptions = useMemo(() => ([
        { value: '', label: 'Keine Vorgabe' },
        { value: 'elektrisch', label: 'Elektrisch' },
        { value: 'roentgen', label: 'Röntgen' },
        { value: 'both', label: 'Beide' },
    ]), []);

    const endoAllowedWfOptions = useMemo(() => ([
        { value: '', label: 'Keine Vorgabe' },
        { value: 'kalt', label: 'Kalt' },
        { value: 'warm', label: 'Warm' },
        { value: 'einzel', label: 'Einzelstift' },
    ]), []);

    const endoAllowedIrrigationOptions = useMemo(() => ([
        { value: '', label: 'Keine Vorgabe' },
        { value: 'naocl_edta', label: 'NaOCl + EDTA' },
        { value: 'naocl_only', label: 'Nur NaOCl' },
        { value: 'none', label: 'Ohne' },
    ]), []);

    const fuellungAllowedSchichtungOptions = useMemo(() => ([
        { value: '', label: 'Keine Vorgabe' },
        { value: 'mehrschicht', label: 'Mehrschicht' },
        { value: 'bulk', label: 'Bulk / einfach' },
    ]), []);

    const fuellungAllowedMatrixOptions = useMemo(() => ([
        { value: '', label: 'Keine Vorgabe' },
        { value: 'none', label: 'Keine / nicht relevant' },
        { value: 'sectional', label: 'Sektional' },
        { value: 'tofflemire', label: 'Tofflemire' },
        { value: 'strip', label: 'Strip (Front)' },
    ]), []);

    const fuellungCompositeCatalogOptions = useMemo(() => {
        const selectedIds = practiceSettings.materialCatalog?.fuellung ?? [];
        const baseItems = selectedIds.length > 0
            ? MATERIAL_CATALOG.filter(m => selectedIds.includes(m.id))
            : MATERIAL_CATALOG;

        const items = baseItems
            .filter(m => m.category === 'composite_universal')
            .map(m => ({ value: m.id, label: `${m.label} (${m.manufacturer})` }));

        return [{ value: '', label: 'Keine Vorgabe' }, ...items];
    }, [practiceSettings.materialCatalog?.fuellung]);

    const fuellungBulkCatalogOptions = useMemo(() => {
        const selectedIds = practiceSettings.materialCatalog?.fuellung ?? [];
        const baseItems = selectedIds.length > 0
            ? MATERIAL_CATALOG.filter(m => selectedIds.includes(m.id))
            : MATERIAL_CATALOG;
        const items = baseItems
            .filter(m => m.category === 'composite_bulk')
            .map(m => ({ value: m.id, label: `${m.label} (${m.manufacturer})` }));
        return [{ value: '', label: 'Keine Vorgabe' }, ...items];
    }, [practiceSettings.materialCatalog?.fuellung]);

    const fuellungFlowableCatalogOptions = useMemo(() => {
        const selectedIds = practiceSettings.materialCatalog?.fuellung ?? [];
        const baseItems = selectedIds.length > 0
            ? MATERIAL_CATALOG.filter(m => selectedIds.includes(m.id))
            : MATERIAL_CATALOG;
        const items = baseItems
            .filter(m => m.category === 'composite_flowable')
            .map(m => ({ value: m.id, label: `${m.label} (${m.manufacturer})` }));
        return [{ value: '', label: 'Keine Vorgabe' }, ...items];
    }, [practiceSettings.materialCatalog?.fuellung]);

    const fuellungAdhesiveCatalogOptions = useMemo(() => {
        const selectedIds = practiceSettings.materialCatalog?.fuellung ?? [];
        const baseItems = selectedIds.length > 0
            ? MATERIAL_CATALOG.filter(m => selectedIds.includes(m.id))
            : MATERIAL_CATALOG;
        const items = baseItems
            .filter(m => m.category === 'adhesive_universal' || m.category === 'adhesive_system')
            .map(m => ({ value: m.id, label: `${m.label} (${m.manufacturer})` }));
        return [{ value: '', label: 'Keine Vorgabe' }, ...items];
    }, [practiceSettings.materialCatalog?.fuellung]);

    const fuellungEtchCatalogOptions = useMemo(() => {
        const selectedIds = practiceSettings.materialCatalog?.fuellung ?? [];
        const baseItems = selectedIds.length > 0
            ? MATERIAL_CATALOG.filter(m => selectedIds.includes(m.id))
            : MATERIAL_CATALOG;
        const items = baseItems
            .filter(m => m.category === 'etch')
            .map(m => ({ value: m.id, label: `${m.label} (${m.manufacturer})` }));
        return [{ value: '', label: 'Keine Vorgabe' }, ...items];
    }, [practiceSettings.materialCatalog?.fuellung]);

    const updatePractice = (updates: Partial<PracticeSettings>) => {
        updatePracticeSettings(updates);
        setLastChangedAt(Date.now());
        setIsDirty(true);
    };
    const updateUser = (updates: Partial<UserSettings>) => {
        updateUserSettings(updates);
        setLastChangedAt(Date.now());
        setIsDirty(true);
    };
    const togglePracticeCatalogMaterial = (treatmentId: 'fuellung', materialId: string) => {
        const current = practiceSettings.materialCatalog?.[treatmentId] ?? [];
        const next = current.includes(materialId)
            ? current.filter(id => id !== materialId)
            : [...current, materialId];
        updatePractice({
            materialCatalog: {
                ...(practiceSettings.materialCatalog ?? {}),
                [treatmentId]: next,
            },
        });
    };

    const updatePracticeDefaultAnesthetic = (materialId: string | undefined) => {
        updatePractice(patchPracticeDefaultAnestheticAgentId(practiceSettings, materialId));
    };
    const updateUserTreatment = (
        treatmentKey: 'endo' | 'fuellung',
        updates: Record<string, unknown>
    ) => {
        updateUser({
            treatments: {
                ...(userSettings.treatments ?? {}),
                [treatmentKey]: {
                    ...(userSettings.treatments?.[treatmentKey] ?? {}),
                    ...updates,
                },
            },
        });
    };

    const getPracticeStandardChips = (): string[] => {
        return practiceSettings.chipStandards?.global ?? [];
    };

    const togglePracticeStandardChip = (chipId: string) => {
        const current = getPracticeStandardChips();
        const next = current.includes(chipId)
            ? current.filter(id => id !== chipId)
            : [...current, chipId];

        updatePractice({
            chipStandards: {
                ...(practiceSettings.chipStandards ?? {}),
                global: next,
            },
        });
    };

    const getGlobalStandardChips = (): string[] => {
        return userSettings.chipStandards?.global ?? [];
    };

    const toggleGlobalStandardChip = (chipId: string) => {
        const current = getGlobalStandardChips();
        const next = current.includes(chipId)
            ? current.filter(id => id !== chipId)
            : [...current, chipId];

        updateUser({
            chipStandards: {
                ...(userSettings.chipStandards ?? {}),
                global: next,
            },
        });
    };

    const standardChipItems = useMemo(() => {
        const enabled = new Set(getGlobalStandardChips());
        return DEFAULT_DOC_CHIPS.map(item => ({
            ...item,
            enabled: enabled.has(item.id),
        }));
    }, [userSettings.chipStandards?.global]);

    const practiceStandardChipItems = useMemo(() => {
        const enabled = new Set(getPracticeStandardChips());
        return DEFAULT_DOC_CHIPS.map(item => ({
            ...item,
            enabled: enabled.has(item.id),
        }));
    }, [practiceSettings.chipStandards?.global]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey && event.key.toLowerCase() === 'k')) return;
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const tag = target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (target.isContentEditable) return;
            if (target.closest('[cmdk-input-wrapper]')) return;
            event.preventDefault();
            setChipDefaultsOpen(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const isUserTreatmentEnabled = activeTreatmentId !== GENERAL_TREATMENT_ID
        && enabledTreatments.includes(activeTreatmentId);

    const toggleUserTreatment = (next: boolean) => {
        if (activeTreatmentId === GENERAL_TREATMENT_ID) return;
        const base = new Set(userSettings.enabledTreatments ?? TREATMENT_IDS);
        if (next) {
            base.add(activeTreatmentId);
        } else {
            base.delete(activeTreatmentId);
        }
        updateUser({ enabledTreatments: Array.from(base) });
    };

    const handleCreateUser = async () => {
        if (!capabilities.canManageUsers) {
            setCreateUserStatus('error');
            setCreateUserError('Nur Praxis-Admins koennen Benutzer anlegen.');
            return;
        }
        if (!newUserState.name.trim()) return;
        setCreateUserStatus('creating');
        setCreateUserError(null);

        const practiceId = localStorage.getItem('docudent_practice_id') || '1';
        const result = await adminService.createUser(practiceId, newUserState);

        if (result.success) {
            setCreateUserStatus('success');
            setNewUserState({ name: '', role: 'provider', email: '' });
            setTimeout(() => setCreateUserStatus('idle'), 3000);
            // Optionally reload users? UserContext might not auto-refresh. 
            // Triggering a reload via window or context refresh is ideal, 
            // but for now user can just reload page or context might pick it up if real-time.
        } else {
            setCreateUserStatus('error');
            setCreateUserError(result.error || 'Unbekannter Fehler');
        }
    };

    const renderCreateUserForm = (showUsersList: boolean) => (
        <div style={{ display: 'grid', gap: spacing.md }}>
            {showUsersList ? (
                <div style={{ padding: spacing.sm, background: 'rgba(255,255,255,0.03)', borderRadius: radii.cardSmall }}>
                    <div style={{ fontSize: typography.label, color: colors.textSecondary }}>Aktuelle Benutzer:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {users.map(u => (
                            <span key={u.id} style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: typography.caption,
                                color: colors.textPrimary,
                            }}>
                                {u.name} <span style={{ opacity: 0.5 }}>({u.role})</span>
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            <label style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <span style={{ fontSize: typography.label, color: colors.textSecondary, fontWeight: typography.semibold }}>
                    Name
                </span>
                <input
                    value={newUserState.name}
                    onChange={e => setNewUserState(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Vorname Nachname"
                    className="v10-settings-input"
                />
            </label>

            <SettingSelect
                label="Rolle"
                value={newUserState.role}
                options={[
                    { value: 'provider', label: 'Behandler' },
                    { value: 'assistant', label: 'Assistenz' },
                    { value: 'practice_admin', label: 'Praxis-Admin' },
                ]}
                onChange={val => setNewUserState(prev => ({ ...prev, role: val as PracticeRole }))}
            />

            <label style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <span style={{ fontSize: typography.label, color: colors.textSecondary, fontWeight: typography.semibold }}>
                    Email (optional)
                </span>
                <input
                    value={newUserState.email || ''}
                    onChange={e => setNewUserState(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="v10-settings-input"
                />
            </label>

            {createUserError && (
                <div style={{ color: colors.warmPink, fontSize: typography.bodySmall }}>
                    Fehler: {createUserError}
                </div>
            )}

            <button
                type="button"
                onClick={handleCreateUser}
                disabled={createUserStatus === 'creating' || !newUserState.name.trim()}
                style={{
                    alignSelf: 'start',
                    padding: '10px 20px',
                    borderRadius: radii.pill,
                    border: 'none',
                    background: createUserStatus === 'success' ? '#10B981' : gradients.button,
                    color: createUserStatus === 'success' ? '#fff' : colors.textPrimary,
                    cursor: createUserStatus === 'creating' ? 'wait' : 'pointer',
                    fontWeight: typography.semibold,
                    opacity: !newUserState.name.trim() ? 0.5 : 1,
                }}
            >
                {createUserStatus === 'creating' ? 'Lege an...' : createUserStatus === 'success' ? 'Benutzer angelegt!' : 'Benutzer anlegen'}
            </button>
        </div>
    );

    return (
        <div className="v7 v10-settings-root" style={v10CssVars}>
            {/* Background Layers */}
            <div className="v10-settings-bg" />
            <SoftGradientBackground />
            <div className="v7-bg" />

            {/* HeaderDock — unified brand + tabs + scope + user */}
            <HeaderDock
                activeScope={activeScope}
                onScopeChange={setActiveScope}
                users={users}
                selectedUser={currentUser}
                onUserSelect={handleUserSelect}
            />

            {/* Settings content */}
            <div className="v10-settings-shell">
                <aside className="v10-settings-sidebar">
                    <div className="v10-settings-sidebarCard">
                        {/* Allgemein at top - standalone */}
                        <div className="v10-settings-navList v10-settings-navListRoot">
                            <button
                                type="button"
                                className={[
                                    'v10-settings-navPill',
                                    'v10-settings-navPillRoot',
                                    activeTreatmentId === GENERAL_TREATMENT_ID ? 'v10-settings-navPillActive' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => setActiveTreatmentId(GENERAL_TREATMENT_ID)}
                            >
                                Allgemein
                            </button>
                        </div>

                        {/* Behandlungen collapsible section - only in Benutzer scope */}
                        {activeScope !== 'practice' && (
                            <div className="v10-settings-navRoot">
                                <button
                                    type="button"
                                    className="v10-settings-navRootToggle"
                                    aria-expanded={isTreatmentsOpen}
                                    onClick={() => setIsTreatmentsOpen(open => !open)}
                                >
                                    <span>Behandlungen</span>
                                    <span className={`v10-settings-navChevron ${isTreatmentsOpen ? 'is-open' : ''}`}>▾</span>
                                </button>
                                {isTreatmentsOpen ? (
                                    <div className="v10-settings-navRootBody">
                                        {treatmentGroups.map(group => (
                                            <div key={group.key} className="v10-settings-navGroup v10-settings-navGroupNested">
                                                <button
                                                    type="button"
                                                    className="v10-settings-navGroupToggle"
                                                    aria-expanded={openTreatmentGroups[group.key] ?? false}
                                                    onClick={() => setOpenTreatmentGroups(prev => ({
                                                        ...prev,
                                                        [group.key]: !(prev[group.key] ?? false),
                                                    }))}
                                                >
                                                    <span>{group.label}</span>
                                                    <span className={`v10-settings-navChevron ${(openTreatmentGroups[group.key] ?? false) ? 'is-open' : ''}`}>
                                                        ▾
                                                    </span>
                                                </button>
                                                {(openTreatmentGroups[group.key] ?? false) ? (
                                                    <div className="v10-settings-navList v10-settings-navListNested">
                                                        {group.items.map(id => {
                                                            const label = TREATMENT_DEFINITIONS[id]?.labelShort || TREATMENT_LABELS[id] || id;
                                                            const enabledForUser = enabledTreatments.includes(id);
                                                            const status = enabledForUser ? 'active' : 'inactive';
                                                            const statusLabel = enabledForUser ? 'Aktiv' : 'Aus';

                                                            return (
                                                                <button
                                                                    key={id}
                                                                    type="button"
                                                                    className={[
                                                                        'v10-settings-navPill',
                                                                        activeTreatmentId === id ? 'v10-settings-navPillActive' : '',
                                                                    ].filter(Boolean).join(' ')}
                                                                    onClick={() => setActiveTreatmentId(id)}
                                                                >
                                                                    <span>{label}</span>
                                                                    <span className="v10-settings-navMeta">
                                                                        <span className={`v10-settings-navStatus is-${status}`} />
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {!canEditPractice && activeScope === 'practice' ? (
                        <div className="v10-settings-adminNote">
                            Nur Admin kann Praxis-Settings ändern.
                        </div>
                    ) : null}
                </aside>

                <main className="v10-settings-main">
                    <InstrumentPanel
                        title={activeTreatmentLabel}
                        action={activeScope === 'user' && activeTreatmentId !== GENERAL_TREATMENT_ID ? (
                            <label className="v10-toggle-control" title="Behandlung aktivieren">
                                <input
                                    type="checkbox"
                                    className="v10-toggle-input"
                                    checked={(userSettings.enabledTreatments ?? TREATMENT_IDS).includes(activeTreatmentId)}
                                    disabled={isTreatmentOverrideLocked}
                                    onChange={e => {
                                        const enabled = e.target.checked;
                                        const current = new Set(userSettings.enabledTreatments ?? TREATMENT_IDS);
                                        if (enabled) current.add(activeTreatmentId);
                                        else current.delete(activeTreatmentId);
                                        updateUserSettings({ enabledTreatments: Array.from(current) });
                                    }}
                                />
                                <span className={`v10-toggle-track ${(userSettings.enabledTreatments ?? TREATMENT_IDS).includes(activeTreatmentId) ? 'is-on' : ''}`}>
                                    <span className="v10-toggle-thumb" />
                                </span>
                            </label>
                        ) : undefined}
                    >

                        {activeScope === 'user' && showInlineCreateUser && capabilities.canManageUsers ? (
                            <div style={{ marginBottom: spacing.lg }}>
                                {renderCreateUserForm(false)}
                            </div>
                        ) : null}

                        {activeTreatmentId === GENERAL_TREATMENT_ID ? (
                            <>
                                {activeScope === 'practice' ? (
                                    <>
                                        <Band label="Praxis" description="Praxisweite Defaults für die Pipeline.">
                                            <OverlaySelectField
                                                label="Standard-Anästhetikum"
                                                helper="Wird in die LA-Textbausteine eingesetzt"
                                                value={
                                                    getPracticeDefaultAnestheticAgentId(practiceSettings)
                                                        ? MATERIAL_CATALOG.find(m => m.id === getPracticeDefaultAnestheticAgentId(practiceSettings))?.label ?? 'Auswählen...'
                                                        : 'Standard: Ultracain D-S'
                                                }
                                                options={[
                                                    { id: '', label: 'Standard: Ultracain D-S' },
                                                    ...MATERIAL_CATALOG
                                                        .filter(m => m.category === 'anesthetic_la')
                                                        .map(m => ({ id: m.id, label: `${m.label} (${m.manufacturer})` }))
                                                ]}
                                                selectedId={getPracticeDefaultAnestheticAgentId(practiceSettings) ?? ''}
                                                onSelect={(id) => updatePracticeDefaultAnesthetic(id || undefined)}
                                                disabled={!canEditPractice}
                                            />

                                            <SettingRow
                                                label="Geräte (Praxis)"
                                                helper="z.B. OP-Mikroskop, Apex-Locator, Intraoralscanner"
                                            >
                                                <TagInput
                                                    label=""
                                                    values={practiceSettings.devices ?? []}
                                                    placeholder="Gerät hinzufügen..."
                                                    onChange={(next) => updatePractice({ devices: next })}
                                                    disabled={!canEditPractice}
                                                />
                                            </SettingRow>
                                        </Band>

                                        <Band label="Dokumentation" description="Praxisweite Standard-Textbausteine.">
                                            <OverlayMultiSelectField
                                                label="Standard-Textbausteine (Praxis)"
                                                helper="Gilt für alle Behandler"
                                                items={practiceStandardChipItems}
                                                disabled={!canEditPractice}
                                                onItemToggle={(id, enabled) => {
                                                    const has = getPracticeStandardChips().includes(id);
                                                    if (enabled && !has) togglePracticeStandardChip(id);
                                                    if (!enabled && has) togglePracticeStandardChip(id);
                                                }}
                                                onEnableAll={() => {
                                                    updatePractice({
                                                        chipStandards: {
                                                            ...(practiceSettings.chipStandards ?? {}),
                                                            global: DEFAULT_DOC_CHIPS.map(item => item.id),
                                                        },
                                                    });
                                                }}
                                                onDisableAll={() => {
                                                    updatePractice({
                                                        chipStandards: {
                                                            ...(practiceSettings.chipStandards ?? {}),
                                                            global: [],
                                                        },
                                                    });
                                                }}
                                            />
                                        </Band>

                                        <Band label="KZV/Compliance" description="Evidenzbasierte Pflicht-Askbacks für KZV-sichere Dokumentation.">
                                            <ToggleRow
                                                label="Strict KZV-Modus"
                                                description="Erzwingt evidenzbasierte Askbacks (z. B. Cp/P, Röntgen, MKV)."
                                                checked={Boolean(practiceSettings.strictKzvMode)}
                                                disabled={!canEditPractice}
                                                onChange={(next) => updatePractice({ strictKzvMode: next })}
                                            />
                                        </Band>

                                        <Band label="Materialkatalog" description="Praxisweite Auswahl der Materialien.">
                                            <div className="v10-settings-sectionHint">
                                                Benutzer wählen daraus ihre persönlichen Defaults.
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowFuellungPracticeMaterials(v => !v)}
                                                className={`v10-settings-pill ${showFuellungPracticeMaterials ? 'v10-settings-pillActive' : 'v10-settings-pillSecondary'}`}
                                            >
                                                {showFuellungPracticeMaterials ? 'Materialkatalog ausblenden' : 'Materialkatalog öffnen'}
                                            </button>
                                            {showFuellungPracticeMaterials ? (
                                                <MaterialCatalogPicker
                                                    title="Materialkatalog: Füllung"
                                                    subtitle="Praxisweite Auswahl für Dokumentation und Benutzer-Defaults."
                                                    items={MATERIAL_CATALOG.filter(m => m.category !== 'anesthetic_la')}
                                                    selectedIds={practiceSettings.materialCatalog?.fuellung ?? []}
                                                    disabled={!canEditPractice}
                                                    onToggle={(id) => togglePracticeCatalogMaterial('fuellung', id)}
                                                />
                                            ) : null}
                                        </Band>

                                        <Band label="Behandlungen" description="Welche Behandlungen bietet diese Praxis an?">
                                            {treatmentGroups.map(group => {
                                                const groupEnabled = practiceSettings.enabledTreatments ?? TREATMENT_IDS;
                                                const items = group.items.map(id => ({
                                                    id,
                                                    label: TREATMENT_DEFINITIONS[id]?.labelShort || TREATMENT_LABELS[id] || id,
                                                    enabled: groupEnabled.includes(id),
                                                }));
                                                return (
                                                    <OverlayMultiSelectField
                                                        key={group.key}
                                                        label={group.label}
                                                        items={items}
                                                        disabled={!canEditPractice}
                                                        onItemToggle={(id, enabled) => {
                                                            const current = new Set(practiceSettings.enabledTreatments ?? TREATMENT_IDS);
                                                            if (enabled) {
                                                                current.add(id);
                                                            } else {
                                                                current.delete(id);
                                                            }
                                                            updatePractice({ enabledTreatments: Array.from(current) });
                                                        }}
                                                        onEnableAll={() => {
                                                            const current = new Set(practiceSettings.enabledTreatments ?? TREATMENT_IDS);
                                                            group.items.forEach(id => current.add(id));
                                                            updatePractice({ enabledTreatments: Array.from(current) });
                                                        }}
                                                        onDisableAll={() => {
                                                            const current = new Set(practiceSettings.enabledTreatments ?? TREATMENT_IDS);
                                                            group.items.forEach(id => current.delete(id));
                                                            updatePractice({ enabledTreatments: Array.from(current) });
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Band>

                                        <Band label="Governance" description="Steuert, welche Behandler-Overrides gegenüber Praxis-Defaults erlaubt sind.">
                                            <ToggleRow
                                                label="Behandler-Behandlungen an Praxisliste koppeln"
                                                description="Wenn aktiv, übernimmt jeder Behandler exakt die von der Praxis aktivierten Behandlungen."
                                                checked={Boolean(practiceSettings.lockUserOverrides?.enabledTreatments)}
                                                disabled={!canEditPractice}
                                                onChange={(next) => updatePractice({
                                                    lockUserOverrides: {
                                                        ...(practiceSettings.lockUserOverrides ?? {}),
                                                        enabledTreatments: next,
                                                    },
                                                })}
                                            />
                                            <ToggleRow
                                                label="Behandler-Materialdefaults (Füllung) sperren"
                                                description="Wenn aktiv, dürfen Behandler keine eigenen Material-Defaults für Füllung setzen."
                                                checked={Boolean(practiceSettings.lockUserOverrides?.fuellungMaterialDefaults)}
                                                disabled={!canEditPractice}
                                                onChange={(next) => updatePractice({
                                                    lockUserOverrides: {
                                                        ...(practiceSettings.lockUserOverrides ?? {}),
                                                        fuellungMaterialDefaults: next,
                                                    },
                                                })}
                                            />
                                        </Band>
                                    </>
                                ) : (
                                    <>
                                        {capabilities.canManageUsers ? (
                                            <Band label="Team" description="Benutzerverwaltung fuer diese Praxis.">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowInlineCreateUser(v => !v)}
                                                    className={`v10-settings-pill ${showInlineCreateUser ? 'v10-settings-pillActive' : 'v10-settings-pillSecondary'}`}
                                                >
                                                    {showInlineCreateUser ? 'Benutzeranlage ausblenden' : 'Benutzer anlegen'}
                                                </button>
                                                {showInlineCreateUser ? renderCreateUserForm(true) : null}
                                            </Band>
                                        ) : null}
                                        {isTreatmentOverrideLocked ? (
                                            <div className="v10-settings-adminNote">
                                                Praxis-Governance aktiv: Behandlungsliste wird zentral durch die Praxis gesteuert.
                                            </div>
                                        ) : null}
                                        <Band label="Dokumentation">
                                            <OverlaySelectField
                                                label="Textlänge"
                                                helper="Ausgabe-Länge für die Dokumentation"
                                                value={{ kurz: 'Kurz', mittel: 'Mittel', lang: 'Lang' }[userSettings.preferredTextLength ?? 'mittel'] || 'Mittel'}
                                                options={[
                                                    { id: 'kurz', label: 'Kurz' },
                                                    { id: 'mittel', label: 'Mittel' },
                                                    { id: 'lang', label: 'Lang' },
                                                ]}
                                                selectedId={userSettings.preferredTextLength ?? 'mittel'}
                                                onSelect={value => updateUser({
                                                    preferredTextLength: value as UserSettings['preferredTextLength'],
                                                })}
                                            />
                                            <OverlayMultiSelectField
                                                label="Standard-Textbausteine"
                                                helper="⌘K"
                                                items={standardChipItems}
                                                onItemToggle={(id, enabled) => {
                                                    const has = getGlobalStandardChips().includes(id);
                                                    if (enabled && !has) toggleGlobalStandardChip(id);
                                                    if (!enabled && has) toggleGlobalStandardChip(id);
                                                }}
                                                onEnableAll={() => {
                                                    updateUser({
                                                        chipStandards: {
                                                            ...(userSettings.chipStandards ?? {}),
                                                            global: DEFAULT_DOC_CHIPS.map(item => item.id),
                                                        },
                                                    });
                                                }}
                                                onDisableAll={() => {
                                                    updateUser({
                                                        chipStandards: {
                                                            ...(userSettings.chipStandards ?? {}),
                                                            global: [],
                                                        },
                                                    });
                                                }}
                                            />
                                        </Band>

                                        <Band label="Anästhesie">
                                            <OverlaySelectField
                                                label="Standard-LA"
                                                helper="Default, wenn im Diktat nichts Konkretes gesagt wurde"
                                                value={{ '': 'Keine', infiltration: 'Infiltration', leitung: 'Leitung', ila: 'Intraligamentär', none: 'Ohne' }[getUserDefaultLAType(userSettings) ?? ''] || 'Keine'}
                                                options={[
                                                    { id: '', label: 'Keine' },
                                                    { id: 'infiltration', label: 'Infiltration' },
                                                    { id: 'leitung', label: 'Leitung' },
                                                    { id: 'ila', label: 'Intraligamentär' },
                                                    { id: 'none', label: 'Ohne' },
                                                ]}
                                                selectedId={getUserDefaultLAType(userSettings) ?? ''}
                                                onSelect={value => updateUser(
                                                    patchUserDefaultLAType(userSettings, value ? (value as UserSettings['defaultLAType']) : undefined)
                                                )}
                                            />
                                            <OverlaySelectField
                                                label="Standard-Anästhetikum"
                                                helper="Überschreibt den Praxisstandard für deinen Output"
                                                value={
                                                    getUserDefaultAnestheticAgentId(userSettings)
                                                        ? MATERIAL_CATALOG.find(m => m.id === getUserDefaultAnestheticAgentId(userSettings))?.label ?? 'Auswählen...'
                                                        : 'Praxisstandard'
                                                }
                                                options={[
                                                    { id: '', label: 'Praxisstandard' },
                                                    ...MATERIAL_CATALOG
                                                        .filter(m => m.category === 'anesthetic_la')
                                                        .map(m => ({ id: m.id, label: `${m.label} (${m.manufacturer})` }))
                                                ]}
                                                selectedId={getUserDefaultAnestheticAgentId(userSettings) ?? ''}
                                                onSelect={(id) => updateUser(
                                                    patchUserDefaultAnestheticAgentId(userSettings, id ? id : undefined)
                                                )}
                                            />
                                            <OverlaySelectField
                                                label="UK Molaren Override"
                                                helper="Optionaler Override für Unterkiefer 6er/7er/8er"
                                                value={{ '': 'Keine', leitung: 'Leitung', ila: 'Intraligamentär', infiltration: 'Infiltration' }[getUserDefaultLATypeUkPosterior(userSettings) ?? ''] || 'Keine'}
                                                options={[
                                                    { id: '', label: 'Keine' },
                                                    { id: 'leitung', label: 'Leitung' },
                                                    { id: 'ila', label: 'Intraligamentär' },
                                                    { id: 'infiltration', label: 'Infiltration' },
                                                ]}
                                                selectedId={getUserDefaultLATypeUkPosterior(userSettings) ?? ''}
                                                onSelect={value => updateUser(
                                                    patchUserDefaultLATypeUkPosterior(
                                                        userSettings,
                                                        value ? (value as UserSettings['defaultLATypeUkPosterior']) : undefined
                                                    )
                                                )}
                                            />
                                        </Band>

                                        <Band label="Isolation">
                                            <OverlaySelectField
                                                label="Standard-Isolation"
                                                helper="Gilt für alle Behandlungen"
                                                value={{ '': 'Keine', kofferdam: 'Kofferdam', relative: 'Relativ', none: 'Ohne' }[getUserDefaultIsolation(userSettings) ?? ''] || 'Keine'}
                                                options={[
                                                    { id: '', label: 'Keine' },
                                                    { id: 'kofferdam', label: 'Kofferdam' },
                                                    { id: 'relative', label: 'Relativ' },
                                                    { id: 'none', label: 'Ohne' },
                                                ]}
                                                selectedId={getUserDefaultIsolation(userSettings) ?? ''}
                                                onSelect={value => updateUser(
                                                    patchUserDefaultIsolation(
                                                        userSettings,
                                                        value ? (value as UserSettings['defaultIsolation']) : undefined
                                                    )
                                                )}
                                            />
                                        </Band>

                                        <Band label="Abrechnung">
                                            <OverlaySelectField
                                                label="MKV als Default"
                                                helper="Mehrkostenvereinbarung standardmäßig aktiv"
                                                value={userSettings.defaultHasMKV ? 'An' : 'Aus'}
                                                options={[
                                                    { id: 'off', label: 'Aus' },
                                                    { id: 'on', label: 'An' },
                                                ]}
                                                selectedId={userSettings.defaultHasMKV ? 'on' : 'off'}
                                                onSelect={value => updateUser({ defaultHasMKV: value === 'on' })}
                                            />
                                        </Band>

                                        <button
                                            type="button"
                                            onClick={() => setShowAdvancedUser(v => !v)}
                                            className={`v10-settings-pill ${showAdvancedUser ? 'v10-settings-pillActive' : 'v10-settings-pillSecondary'}`}
                                            style={{ marginTop: 16 }}
                                        >
                                            {showAdvancedUser ? 'Erweitert ausblenden' : 'Erweitert'}
                                        </button>
                                        {showAdvancedUser && (
                                            <TagInput
                                                label="Askbacks überspringen (IDs)"
                                                values={userSettings.skipAskbacks ?? []}
                                                placeholder="z.B. medical_isolation, medical_la_type"
                                                onChange={(next) => updateUser({ skipAskbacks: next })}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        ) : activeScope === 'practice' ? (
                            <EmptyState text="Wähle 'Benutzer' oben um Behandlungs-Einstellungen zu bearbeiten." />
                        ) : (
                            <>

                                {activeTreatmentId === 'endo' ? (
                                    <>


                                        <SettingSelect
                                            label="WL-Methode"
                                            value={userSettings.treatments?.endo?.defaultWLMethod ?? ''}
                                            options={endoAllowedWlOptions}
                                            description="WL = Working Length (Arbeitslänge)."
                                            onChange={value => updateUserTreatment('endo', {
                                                defaultWLMethod: value ? value : undefined,
                                            })}
                                        />
                                        <SettingSelect
                                            label="WF-Technik"
                                            value={userSettings.treatments?.endo?.defaultWFTechnique ?? ''}
                                            options={endoAllowedWfOptions}
                                            description="WF = Wurzelfüllung."
                                            onChange={value => updateUserTreatment('endo', {
                                                defaultWFTechnique: value ? value : undefined,
                                            })}
                                        />
                                        <SettingSelect
                                            label="Spülprotokoll"
                                            value={userSettings.treatments?.endo?.defaultIrrigationProtocol ?? ''}
                                            options={endoAllowedIrrigationOptions}
                                            description="Standardisierte Endo-Spülung."
                                            onChange={value => updateUserTreatment('endo', {
                                                defaultIrrigationProtocol: value ? value : undefined,
                                            })}
                                        />
                                        <SettingSelect
                                            label="Aufbereitung (Standard)"
                                            value={userSettings.treatments?.endo?.defaultInstrumentationMode ?? ''}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'rotary', label: 'Maschinell (rotierend)' },
                                                { value: 'manual', label: 'Manuell' },
                                            ]}
                                            description="Standard-Aufbereitung, wenn im Diktat nicht erwähnt."
                                            onChange={(value) => {
                                                updateUserTreatment('endo', {
                                                    defaultInstrumentationMode: value ? value : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Sealer (Standard)"
                                            value={userSettings.treatments?.endo?.defaultSealer === undefined
                                                ? ''
                                                : (userSettings.treatments?.endo?.defaultSealer ? 'yes' : 'no')}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Sealer standardmäßig dokumentieren (bei WF), wenn nicht erwähnt."
                                            onChange={(value) => {
                                                updateUserTreatment('endo', {
                                                    defaultSealer: value ? value === 'yes' : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Med. Einlage"
                                            value={userSettings.treatments?.endo?.defaultEinlage ?? ''}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'none', label: 'Keine Einlage' },
                                                { value: 'caoh2', label: 'Ca(OH)2' },
                                            ]}
                                            description="Standard-Einlage bei Endo."
                                            onChange={(value) => {
                                                updateUserTreatment('endo', { defaultEinlage: value ? value : undefined });
                                            }}
                                        />
                                    </>
                                ) : activeTreatmentId === 'fuellung' ? (
                                    <>

                                        <SettingSelect
                                            label="Adhäsivtechnik"
                                            value={userSettings.treatments?.fuellung?.defaultAdhesiv ?? ''}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Ob du bei Füllungen standardmäßig adhäsiv arbeitest."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultAdhesiv: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="MKV Default (Füllung)"
                                            value={userSettings.treatments?.fuellung?.defaultHasMKV === undefined
                                                ? ''
                                                : (userSettings.treatments?.fuellung?.defaultHasMKV ? 'yes' : 'no')}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Wenn bei Füllungen standardmäßig eine Mehrkostenvereinbarung vorliegt."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', {
                                                    defaultHasMKV: value ? value === 'yes' : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Schichtung"
                                            value={userSettings.treatments?.fuellung?.defaultSchichtung ?? ''}
                                            options={fuellungAllowedSchichtungOptions}
                                            description="Standard-Schichtung für deine Füllungen."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultSchichtung: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Matrix-System"
                                            value={userSettings.treatments?.fuellung?.defaultMatrixSystem ?? ''}
                                            options={fuellungAllowedMatrixOptions}
                                            description="Standard-Matrix für Klasse-II Situationen."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultMatrixSystem: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Keil (Standard)"
                                            value={userSettings.treatments?.fuellung?.defaultKeilUsed === undefined
                                                ? ''
                                                : (userSettings.treatments?.fuellung?.defaultKeilUsed ? 'yes' : 'no')}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Keil standardmäßig dokumentieren bei approximalen Füllungen."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', {
                                                    defaultKeilUsed: value ? value === 'yes' : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Kontaktpunktprüfung (Standard)"
                                            value={userSettings.treatments?.fuellung?.defaultKontaktpunktCheck === undefined
                                                ? ''
                                                : (userSettings.treatments?.fuellung?.defaultKontaktpunktCheck ? 'yes' : 'no')}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Kontaktpunktprüfung standardmäßig dokumentieren (approximal)."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', {
                                                    defaultKontaktpunktCheck: value ? value === 'yes' : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Überkappung (Material-Default)"
                                            value={getUserDefaultCappingMaterial(userSettings) ?? ''}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'caoh2', label: 'Ca(OH)2' },
                                                { value: 'mta', label: 'MTA' },
                                                { value: 'biodentin', label: 'Biodentin' },
                                            ]}
                                            description="Wenn du standardmäßig ein Material bei (indirekter/direkter) Überkappung nutzt."
                                            onChange={value => updateUser(
                                                patchUserDefaultCappingMaterial(
                                                    userSettings,
                                                    value ? (value as UserSettings['defaultCappingMaterial']) : undefined
                                                )
                                            )}
                                        />
                                        {isFuellungMaterialDefaultsLocked ? (
                                            <div className="v10-settings-adminNote">
                                                Praxis-Governance aktiv: Material-Defaults werden zentral vorgegeben.
                                            </div>
                                        ) : null}
                                        <SettingSelect
                                            label="Standard-Komposit (Marke)"
                                            value={userSettings.treatments?.fuellung?.defaultCompositeMaterialId ?? ''}
                                            options={fuellungCompositeCatalogOptions}
                                            description={(practiceSettings.materialCatalog?.fuellung ?? []).length === 0
                                                ? 'Tipp: Im Materialkatalog der Praxis zuerst Materialien auswählen.'
                                                : 'Optional: für Dokumentation/Defaults (Auto-On).'}
                                            disabled={isFuellungMaterialDefaultsLocked}
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultCompositeMaterialId: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Standard-Bulk-Fill (Marke)"
                                            value={userSettings.treatments?.fuellung?.defaultBulkMaterialId ?? ''}
                                            options={fuellungBulkCatalogOptions}
                                            description="Optional: wenn du häufig Bulk-Fill nutzt."
                                            disabled={isFuellungMaterialDefaultsLocked}
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultBulkMaterialId: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Standard-Flowable (Marke)"
                                            value={userSettings.treatments?.fuellung?.defaultFlowableMaterialId ?? ''}
                                            options={fuellungFlowableCatalogOptions}
                                            description="Optional: wenn du eine Flowable Base bevorzugst."
                                            disabled={isFuellungMaterialDefaultsLocked}
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultFlowableMaterialId: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Flowable Base als Standard"
                                            value={userSettings.treatments?.fuellung?.defaultFlowableBase === undefined
                                                ? ''
                                                : (userSettings.treatments?.fuellung?.defaultFlowableBase ? 'yes' : 'no')}
                                            options={[
                                                { value: '', label: 'Keine Vorgabe' },
                                                { value: 'yes', label: 'Ja' },
                                                { value: 'no', label: 'Nein' },
                                            ]}
                                            description="Wenn du standardmäßig eine Flowable-Base einsetzt."
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', {
                                                    defaultFlowableBase: value ? value === 'yes' : undefined,
                                                });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Standard-Adhäsiv (Marke)"
                                            value={userSettings.treatments?.fuellung?.defaultAdhesiveMaterialId ?? ''}
                                            options={fuellungAdhesiveCatalogOptions}
                                            description="Optional: bevorzugtes Adhäsivsystem."
                                            disabled={isFuellungMaterialDefaultsLocked}
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultAdhesiveMaterialId: value ? value : undefined });
                                            }}
                                        />
                                        <SettingSelect
                                            label="Standard-Ätzgel (Marke)"
                                            value={userSettings.treatments?.fuellung?.defaultEtchMaterialId ?? ''}
                                            options={fuellungEtchCatalogOptions}
                                            description="Optional: bevorzugtes Ätzgel."
                                            disabled={isFuellungMaterialDefaultsLocked}
                                            onChange={(value) => {
                                                updateUserTreatment('fuellung', { defaultEtchMaterialId: value ? value : undefined });
                                            }}
                                        />
                                        <ToggleRow
                                            label="Flowable Base bevorzugt"
                                            description="Wenn vorhanden, wird Flowable als Basis standardmäßig bevorzugt."
                                            checked={Boolean(userSettings.treatments?.fuellung?.defaultFlowableBase)}
                                            onChange={(next) => {
                                                updateUserTreatment('fuellung', { defaultFlowableBase: next ? true : undefined });
                                            }}
                                        />
                                        <div style={{ color: colors.textMuted, fontSize: typography.bodySmall, lineHeight: typography.lineHeightRelaxed }}>
                                            Dokumentations-Standards (Auto-On Chips) stellst du unter <b>Allgemein</b> ein.
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState text="Für diese Behandlung gibt es noch keine spezifischen Einstellungen." />
                                )}
                            </>
                        )}
                    </InstrumentPanel>
                </main>
            </div>

            {/* Floating bottom ActionBar */}
            <div className="v10-bottom-bar">
                <ActionBar
                    dirty={isDirty}
                    saving={isSaving}
                    saved={showSaved}
                    onSave={() => {
                        setIsSaving(true);
                        // Re-commit current snapshots to Firestore/local storage so
                        // the Save action is a real persistence boundary.
                        updatePracticeSettings(practiceSettings);
                        updateUserSettings(userSettings);
                        setTimeout(() => {
                            setIsSaving(false);
                            setIsDirty(false);
                            setShowSaved(true);
                            setTimeout(() => setShowSaved(false), 2000);
                        }, 300);
                    }}
                    onReset={() => {
                        setIsDirty(false);
                        window.location.reload();
                    }}
                />
            </div>
        </div>
    );
}
