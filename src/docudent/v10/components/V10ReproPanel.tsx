/**
 * M41: V10ReproPanel — Export/Import Repro Bundle
 */

import React, { useState } from 'react';
import './V10ReproPanel.css';
import {
    ReproBundleV1,
    serializeReproBundle,
    parseReproBundle,
    createMinimalRepro,
    validateNoSecrets // M49: Security check
} from '../debug/reproBundle';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
    currentBundle: ReproBundleV1 | null;
    lastExplainHash?: string;
    onImportRepro: (bundle: ReproBundleV1) => void;
    onRunRepro: () => void;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10ReproPanel({ currentBundle, lastExplainHash, onImportRepro, onRunRepro }: Props) {
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopyRepro = () => {
        if (!currentBundle) return;
        const json = serializeReproBundle(currentBundle);
        navigator.clipboard.writeText(json);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyMinimal = () => {
        if (!currentBundle) return;
        const minimal = createMinimalRepro(currentBundle);
        const json = serializeReproBundle(minimal);
        navigator.clipboard.writeText(json);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = () => {
        const bundle = parseReproBundle(importText);
        if (!bundle) {
            setImportError('Invalid repro bundle');
            return;
        }
        // M49: Security check - reject bundles with secrets
        if (!validateNoSecrets(bundle)) {
            setImportError('Security: Bundle contains forbidden keys (token, apiKey, secret)');
            return;
        }
        onImportRepro(bundle);
        setShowImport(false);
        setImportText('');
        setImportError(null);
    };

    return (
        <div className="v10-repro-panel" data-testid="v10-repro-panel">
            <div className="v10-repro-header">
                <span className="v10-repro-title">Repro Export</span>
            </div>

            <div className="v10-repro-actions">
                <button
                    className="v10-repro-btn"
                    onClick={handleCopyRepro}
                    disabled={!currentBundle}
                    data-testid="v10-copy-repro"
                >
                    {copied ? '✓ Copied' : 'Copy Repro JSON'}
                </button>

                <button
                    className="v10-repro-btn secondary"
                    onClick={handleCopyMinimal}
                    disabled={!currentBundle}
                    data-testid="v10-copy-minimal"
                >
                    Copy Minimal
                </button>

                <button
                    className="v10-repro-btn secondary"
                    onClick={() => setShowImport(true)}
                    data-testid="v10-import-repro"
                >
                    Paste Repro
                </button>
            </div>

            {lastExplainHash && (
                <div className="v10-repro-hash">
                    <span className="v10-hash-label">Explain Hash:</span>
                    <code className="v10-hash-value" data-testid="v10-explain-hash">
                        {lastExplainHash.slice(0, 12)}...
                    </code>
                </div>
            )}

            {showImport && (
                <div className="v10-repro-import">
                    <textarea
                        className="v10-repro-textarea"
                        placeholder="Paste repro JSON here..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        data-testid="v10-import-textarea"
                    />
                    {importError && (
                        <div className="v10-import-error">{importError}</div>
                    )}
                    <div className="v10-import-actions">
                        <button
                            className="v10-repro-btn"
                            onClick={handleImport}
                            data-testid="v10-run-import"
                        >
                            Import & Run
                        </button>
                        <button
                            className="v10-repro-btn secondary"
                            onClick={() => {
                                setShowImport(false);
                                setImportError(null);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
