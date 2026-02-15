/**
 * V10 Debug Drawer — Jeton Style Panel for Debug/Explainability
 * 
 * Shows: TraceLines, KB Meta, Combinability, Provenance, ExplainRun
 * 
 * STYLING: Matches V8 Jeton aesthetic (glass, blur, motion)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { V10ReproPanel } from './V10ReproPanel';
import { createReproBundle, type ReproBundleV1 } from '../debug/reproBundle';
import { getBuildInfo, getTreatmentKbInfo } from '../debug/buildInfo';
import { getLastRepro, copyLastReproToClipboard, type AutoReproBundle } from '../debug/autoReproCapture';

interface V10DebugDrawerProps {
    result: any; // PipelineResult from useV10Pipeline
    onClose: () => void;
    onImportRepro?: (bundle: ReproBundleV1) => void;
    onRunRepro?: () => void;
}

type DebugTab = 'build' | 'trace' | 'kb' | 'combinability' | 'provenance' | 'explain' | 'repro';

const TABS: { id: DebugTab; label: string }[] = [
    { id: 'build', label: 'Build' },
    { id: 'trace', label: 'Trace' },
    { id: 'kb', label: 'KB' },
    { id: 'combinability', label: 'Kombi' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'explain', label: 'Explain' },
    { id: 'repro', label: 'Repro' },
];

export function V10DebugDrawer({ result, onClose, onImportRepro, onRunRepro }: V10DebugDrawerProps) {
    const [activeTab, setActiveTab] = useState<DebugTab>('trace');

    // Extract debug info from result
    const debug = result?.debug || {};
    const v10TraceLines = debug?.v10TraceLines || [];
    const combinability = result?.combinability || {};

    // M70: Get build info and last repro
    const buildInfo = getBuildInfo();
    const lastRepro = getLastRepro();
    const [reproCopied, setReproCopied] = useState(false);

    const handleCopyRepro = async () => {
        const success = await copyLastReproToClipboard();
        if (success) {
            setReproCopied(true);
            setTimeout(() => setReproCopied(false), 2000);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'build':
                return (
                    <div data-testid="v10-debug-build">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>Build Info</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Git SHA */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>Git SHA</div>
                                <code style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                                    {buildInfo.gitSha}
                                </code>
                            </div>
                            {/* Build Time */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>Build Time</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                                    {buildInfo.buildTime} ({buildInfo.buildMode})
                                </div>
                            </div>
                            {/* Active Packs */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>Active Packs</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                                    {buildInfo.packs.join(', ')}
                                </div>
                            </div>
                            {/* OpenAI Key */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>OpenAI Key</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                                    {buildInfo.openAiKeyPresent ? 'present' : 'missing'}
                                </div>
                            </div>
                            {/* KB Hashes */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>KB Meta</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                                    <div>medical: {buildInfo.kb.medical?.version ?? 'N/A'} ({buildInfo.kb.medical?.hash ?? '-'})</div>
                                    <div>combi: {buildInfo.kb.combinability?.version ?? 'N/A'}</div>
                                </div>
                            </div>
                            {/* Last Repro Summary */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>Last Repro</div>
                                {lastRepro ? (
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                                        <div>State: {lastRepro.resultSummary?.state}</div>
                                        <div>Treatment: {lastRepro.pipelineInput.treatmentId}</div>
                                        <div>Time: {lastRepro.createdAt}</div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                        Keine Runs erfasst
                                    </div>
                                )}
                                <button
                                    data-testid="v10-copy-last-repro"
                                    onClick={handleCopyRepro}
                                    disabled={!lastRepro}
                                    style={{
                                        marginTop: '8px',
                                        padding: '6px 12px',
                                        background: reproCopied ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '999px',
                                        color: 'white',
                                        fontSize: '11px',
                                        cursor: lastRepro ? 'pointer' : 'not-allowed',
                                        opacity: lastRepro ? 1 : 0.5,
                                    }}
                                >
                                    {reproCopied ? 'Copied' : 'Copy Last Repro JSON'}
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'trace':
                return (
                    <div data-testid="v10-debug-trace">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>TraceLines ({v10TraceLines.length})</h3>
                        {v10TraceLines.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {v10TraceLines.map((line: any, i: number) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}>
                                        <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '4px' }}>
                                            {line.key}
                                        </div>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                                            {JSON.stringify(line.value, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: 'rgba(255,255,255,0.5)' }}>Keine TraceLines (Pipeline noch nicht ausgeführt)</div>
                        )}
                    </div>
                );

            case 'kb':
                return (
                    <div data-testid="v10-debug-kb">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>Knowledge Base Meta</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {['medical', 'treatment', 'combinability'].map(kb => {
                                // KB info may be in trace lines
                                const kbTrace = v10TraceLines.find((l: any) => l.key === `kb_${kb}`);
                                const meta = kbTrace?.value || {};
                                return (
                                    <div key={kb} style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                    }}>
                                        <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>
                                            {kb.toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                            <div>Version: {meta.version || 'N/A'}</div>
                                            <div>Hash: {meta.hash?.slice(0, 12) || 'N/A'}</div>
                                            <div>Source: {meta.source || 'N/A'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'combinability':
                const verdict = combinability?.verdict;
                return (
                    <div data-testid="v10-debug-combinability">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>Kombinierbarkeit</h3>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '16px',
                            borderRadius: '8px',
                        }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: verdict === 'PASS' ? '#4CAF50'
                                    : verdict === 'WARN' ? '#FF9800'
                                        : verdict === 'BLOCK' ? '#F44336'
                                            : 'rgba(255,255,255,0.5)',
                                marginBottom: '16px',
                            }}>
                                {verdict || 'N/A'}
                            </div>
                            {combinability?.conflicts?.length > 0 && (
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                                        Konflikte:
                                    </div>
                                    {combinability.conflicts.map((c: any, i: number) => (
                                        <div key={i} style={{
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                        }}>
                                            <div style={{ fontWeight: 600 }}>{c.ruleId}</div>
                                            <div>Codes: {c.codesInvolved?.join(', ')}</div>
                                            <div>Severity: {c.severity}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {combinability?.warnings?.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                                        Warnungen:
                                    </div>
                                    {combinability.warnings.map((warning: string, i: number) => (
                                        <div key={i} style={{
                                            background: 'rgba(255, 193, 7, 0.12)',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                            color: 'rgba(255,255,255,0.8)',
                                        }}>
                                            {warning}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'provenance':
                return (
                    <div data-testid="v10-debug-provenance">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>Provenance</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>Questions</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    {result?.questions?.length || 0} Fragen generiert
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>Output</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    {result?.output?.billingCodes?.length || 0} Billing Codes
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>Chip Provenance</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    {(result?.meta?.provenance?.chips?.length ?? result?.provenance?.chips?.length ?? 0)} Chip‑Einträge
                                    {' · '}
                                    {(result?.meta?.provenance?.askbacks?.length ?? result?.provenance?.askbacks?.length ?? 0)} Askback‑Einträge
                                </div>
                                <details style={{ marginTop: 8 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                                        Raw JSON anzeigen
                                    </summary>
                                    <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                                        {JSON.stringify(result?.meta?.provenance ?? result?.provenance ?? null, null, 2)}
                                    </pre>
                                </details>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>Billing Completeness (GP4/GP8)</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    complete: {String(result?.meta?.billingCompleteness?.isComplete ?? result?.billingCompleteness?.isComplete ?? 'N/A')}
                                    {' · '}
                                    missing: {String(result?.meta?.billingCompleteness?.missing?.length ?? result?.billingCompleteness?.missing?.length ?? 0)}
                                </div>
                                <details style={{ marginTop: 8 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                                        Origins anzeigen
                                    </summary>
                                    <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                                        {JSON.stringify(result?.meta?.billingCompleteness ?? result?.billingCompleteness ?? null, null, 2)}
                                    </pre>
                                </details>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, color: '#FA7366', marginBottom: '8px' }}>State</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    {result?.state || 'idle'}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'explain':
                return (
                    <div data-testid="v10-debug-explain">
                        <h3 style={{ marginBottom: '16px', color: 'white' }}>Full Result (JSON)</h3>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '12px',
                            borderRadius: '8px',
                            maxHeight: '400px',
                            overflow: 'auto',
                        }}>
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.8)',
                            }}>
                                {JSON.stringify(result, (key, value) => {
                                    // Skip Map objects (can't stringify)
                                    if (value instanceof Map) {
                                        return Object.fromEntries(value);
                                    }
                                    return value;
                                }, 2)}
                            </pre>
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                            style={{
                                marginTop: '12px',
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '999px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            Copy JSON
                        </button>
                    </div>
                );

            case 'repro':
                // Create repro bundle from current result
                const reproBundle: ReproBundleV1 | null = result ? createReproBundle({
                    pipelineInput: {
                        dictation: result.input?.dictation || '',
                        treatmentId: result.treatmentId || 'fuellung',
                        insuranceType: result.input?.insuranceType || 'GKV',
                    },
                    settings: result.debug?.settings,
                    chipOverrides: result.debug?.overrides,
                    lastExplainHash: result.debug?.explainHash,
                }) : null;

                const handleImportRepro = (bundle: ReproBundleV1) => {
                    if (onImportRepro) {
                        onImportRepro(bundle);
                    } else {
                        console.log('[V10DebugDrawer] Import repro (no handler):', bundle);
                    }
                };

                return (
                    <div data-testid="v10-debug-repro">
                        <V10ReproPanel
                            currentBundle={reproBundle}
                            lastExplainHash={result?.debug?.explainHash}
                            onImportRepro={handleImportRepro}
                            onRunRepro={onRunRepro || (() => console.log('Run repro (no handler)'))}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '420px',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                    V10 Debug
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '20px',
                        cursor: 'pointer',
                    }}
                >
                    ×
                </button>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                overflowX: 'auto',
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '999px',
                            border: 'none',
                            background: activeTab === tab.id
                                ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
                                : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                {renderTabContent()}
            </div>
        </motion.div>
    );
}
