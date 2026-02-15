/**
 * UserSwitcher — Jeton-style dropdown (matches OverlaySelectField)
 * ==================================================================
 * 
 * - Simple trigger pill with chevron
 * - Height-based reveal animation (same as other dropdowns)
 * - 280ms open, 220ms close
 * - Solid opaque surface
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import './UserSwitcher.css';

interface User {
    id: string;
    name: string;
    role?: string;
}

interface Props {
    users: User[];
    selected: string;
    onSelect: (userId: string) => void;
}

const SEARCH_THRESHOLD = 6;

// Animation matching OverlaySelectField
const panelMotion = {
    initial: { height: 0, opacity: 0 },
    animate: {
        height: 'auto',
        opacity: 1,
        transition: {
            height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.15, ease: 'easeOut' },
        }
    },
    exit: {
        height: 0,
        opacity: 0,
        transition: {
            height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.12, ease: 'easeIn' },
        }
    },
};

export function UserSwitcher({ users, selected, onSelect }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const showSearch = users.length > SEARCH_THRESHOLD;

    const selectedUser = users.find(u => u.id === selected);
    const displayName = selectedUser?.name || 'Auswählen';

    const filteredUsers = useMemo(() => {
        if (!query.trim()) return users;
        const q = query.toLowerCase();
        return users.filter(u => u.name.toLowerCase().includes(q));
    }, [users, query]);

    // Focus search on open
    useEffect(() => {
        if (isOpen && showSearch && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen, showSearch]);

    // Clear query on close
    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    // Click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const handleSelect = (userId: string) => {
        onSelect(userId);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="user-switcher">
            {/* Trigger pill */}
            <button
                type="button"
                className={`user-switcher-trigger ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="user-switcher-name">{displayName}</span>
                <motion.span
                    className="user-switcher-chevron"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={14} />
                </motion.span>
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="user-switcher-panel"
                        {...panelMotion}
                    >
                        {/* Search */}
                        {showSearch && (
                            <div className="user-switcher-search">
                                <Search size={14} className="user-switcher-search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Suchen..."
                                    className="user-switcher-search-input"
                                />
                            </div>
                        )}

                        {/* User list */}
                        <div className="user-switcher-list">
                            {filteredUsers.length === 0 ? (
                                <div className="user-switcher-empty">Keine Ergebnisse</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={`user-switcher-option ${user.id === selected ? 'is-selected' : ''}`}
                                        onClick={() => handleSelect(user.id)}
                                    >
                                        <span className="user-switcher-option-name">{user.name}</span>
                                        {user.id === selected && (
                                            <Check size={14} className="user-switcher-option-check" />
                                        )}
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
