import React from 'react';

export interface ActionBarProps {
    dirty: boolean;
    saving?: boolean;
    saved?: boolean;
    onSave: () => void;
    onReset: () => void;
}

/**
 * Action bar for save/reset controls.
 * Render in header, only visible when dirty.
 */
export function ActionBar({ dirty, saving = false, saved = false, onSave, onReset }: ActionBarProps) {
    if (!dirty && !saved) return null;

    return (
        <div className="v10-action-bar">
            {saved ? (
                <span className="v10-action-bar-status">✓ Gespeichert</span>
            ) : (
                <>
                    <span className="v10-action-bar-status">Änderungen</span>
                    <button
                        type="button"
                        className="v10-action-bar-btn is-secondary"
                        onClick={onReset}
                        disabled={saving}
                    >
                        Zurücksetzen
                    </button>
                    <button
                        type="button"
                        className="v10-action-bar-btn is-primary"
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving ? 'Speichern…' : 'Speichern'}
                    </button>
                </>
            )}
        </div>
    );
}
