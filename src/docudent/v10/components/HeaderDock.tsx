/**
 * HeaderDock — Unified DockBar with 3 Tabs
 * ==========================================
 * 
 * ONE solid opaque pill body with:
 * - LEFT: DOCUDENT brand wordmark
 * - CENTER: 3 Tabs
 *   1. Einstellungen ▾ (dropdown: Praxis / Benutzer)
 *   2. Dokumentation (no dropdown, just navigates)
 *   3. Benutzer ▾ (dropdown: user selection)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './HeaderDock.css';

interface User {
    id: string;
    name: string;
}

type Scope = 'practice' | 'user';

type DockMode = 'settings' | 'docs';

interface Props {
    mode?: DockMode;
    activeScope?: Scope;
    onScopeChange?: (scope: Scope) => void;
    users?: User[];
    selectedUser?: User | null;
    onUserSelect?: (user: User) => void;
    docsControls?: React.ReactNode;
}

// ============== EINSTELLUNGEN TAB (with dropdown) ==============
function EinstellungenTab({
    activeScope,
    onScopeChange,
    isActive,
    onActivate,
}: {
    activeScope: Scope;
    onScopeChange: (scope: Scope) => void;
    isActive: boolean;
    onActivate: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const options: Array<{ id: Scope; label: string }> = [
        { id: 'practice', label: 'Praxis' },
        { id: 'user', label: 'Benutzer' },
    ];

    const currentLabel = activeScope === 'practice' ? 'Praxis' : 'Benutzer';

    // Close on outside click / ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    const handleSelect = (id: Scope) => {
        onScopeChange(id);
        setIsOpen(false);
        onActivate(); // Navigate to settings
    };

    const handleTriggerClick = () => {
        if (!isActive) {
            onActivate();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="header-dock-tab-container" ref={containerRef}>
            <button
                type="button"
                className={`header-dock-tab ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
                onClick={handleTriggerClick}
            >
                <span>Einstellungen</span>
                <ChevronDown size={12} className="header-dock-tab-chevron" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="header-dock-dropdown"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {options.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                className={`header-dock-dropdown-option ${activeScope === opt.id ? 'is-selected' : ''}`}
                                onClick={() => handleSelect(opt.id)}
                            >
                                <span>{opt.label}</span>
                                {activeScope === opt.id && <Check size={14} />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============== DOKUMENTATION TAB (no dropdown) ==============
function DokumentationTab({
    isActive,
    onActivate,
}: {
    isActive: boolean;
    onActivate: () => void;
}) {
    return (
        <button
            type="button"
            className={`header-dock-tab ${isActive ? 'is-active' : ''}`}
            onClick={onActivate}
        >
            <span>Dokumentation</span>
        </button>
    );
}

// ============== BENUTZER TAB (with dropdown) ==============
function BenutzerTab({
    users,
    selected,
    onSelect,
}: {
    users: User[];
    selected: User | null;
    onSelect: (user: User) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const showSearch = users.length > 6;
    const userName = selected?.name || 'Auswählen';

    const filteredUsers = query.trim()
        ? users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()))
        : users;

    // Focus search on open
    useEffect(() => {
        if (isOpen && showSearch && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 60);
        }
    }, [isOpen, showSearch]);

    // Clear query on close
    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    // Close on outside click / ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    const handleSelectUser = useCallback((user: User) => {
        onSelect(user);
        setIsOpen(false);
    }, [onSelect]);

    return (
        <div className="header-dock-tab-container" ref={containerRef}>
            <button
                type="button"
                className={`header-dock-tab ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{userName}</span>
                <ChevronDown size={12} className="header-dock-tab-chevron" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="header-dock-dropdown header-dock-dropdown-wide"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Search (optional) */}
                        {showSearch && (
                            <div className="header-dock-dropdown-search">
                                <Search size={14} className="header-dock-dropdown-search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Suchen..."
                                    className="header-dock-dropdown-search-input"
                                />
                            </div>
                        )}

                        {/* User list */}
                        <div className="header-dock-dropdown-list">
                            {filteredUsers.length === 0 ? (
                                <div className="header-dock-dropdown-empty">Keine Ergebnisse</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={`header-dock-dropdown-option ${user.id === selected?.id ? 'is-selected' : ''}`}
                                        onClick={() => handleSelectUser(user)}
                                    >
                                        <span>{user.name}</span>
                                        {user.id === selected?.id && <Check size={14} />}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============== HEADER DOCK ==============
export function HeaderDock({
    mode = 'settings',
    activeScope,
    onScopeChange,
    users,
    selectedUser,
    onUserSelect,
    docsControls,
}: Props) {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active section from current route
    const isOnSettings = location.pathname.includes('/settings');
    const canShowUsers = Boolean(users?.length && onUserSelect);
    const showSettingsTabs = mode === 'settings';

    const handleNavigateToSettings = () => {
        if (!isOnSettings) {
            navigate('/docudent/v10/settings');
        }
    };

    const handleNavigateToDocs = () => {
        if (isOnSettings) {
            navigate('/docudent/v10');
        }
    };

    return (
        <nav className={`header-dock ${mode === 'docs' ? 'is-docs' : 'is-settings'}`}>
            {/* LEFT: Brand wordmark */}
            <Link to="/docudent/v10" className="header-dock-brand">
                DOCUDENT
            </Link>

            <AnimatePresence mode="wait">
                {showSettingsTabs ? (
                    <motion.div
                        key="dock-settings"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="header-dock-content"
                    >
                        <div className="header-dock-tabs">
                            <EinstellungenTab
                                activeScope={activeScope ?? 'practice'}
                                onScopeChange={onScopeChange ?? (() => {})}
                                isActive={isOnSettings}
                                onActivate={handleNavigateToSettings}
                            />
                            <DokumentationTab
                                isActive={!isOnSettings}
                                onActivate={handleNavigateToDocs}
                            />
                            {canShowUsers ? (
                                <BenutzerTab
                                    users={users ?? []}
                                    selected={selectedUser ?? null}
                                    onSelect={onUserSelect ?? (() => {})}
                                />
                            ) : null}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dock-docs"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="header-dock-content"
                    >
                        <div className="header-dock-controls">
                            {docsControls}
                        </div>
                        <div className="header-dock-right">
                            <button
                                type="button"
                                className="header-dock-link"
                                onClick={handleNavigateToSettings}
                            >
                                Einstellungen
                            </button>
                            {canShowUsers ? (
                                <BenutzerTab
                                    users={users ?? []}
                                    selected={selectedUser ?? null}
                                    onSelect={onUserSelect ?? (() => {})}
                                />
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
