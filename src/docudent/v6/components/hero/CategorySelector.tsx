/**
 * CategorySelector — Floating Category Rail (Jeton-Style)
 *
 * A floating, glassmorphism-styled category navigation component.
 * Two-level: Category → Subcategory
 *
 * Design: Text-first, no cards. Elegant hover pills.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Subcategory {
    id: string;
    label: string;
}

interface Category {
    id: string;
    label: string;
    subcategories: Subcategory[];
}

interface CategorySelectorProps {
    selectedCategory: string | null;
    selectedSubcategory: string | null;
    onSelectCategory: (id: string) => void;
    onSelectSubcategory: (id: string) => void;
    onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY DATA
// ═══════════════════════════════════════════════════════════════

const CATEGORIES: Category[] = [
    {
        id: 'konservierend',
        label: 'Konservierend',
        subcategories: [
            { id: 'filling', label: 'Füllung' },
            { id: 'inlay', label: 'Inlay' },
            { id: 'onlay', label: 'Onlay' },
            { id: 'overlay', label: 'Overlay' },
        ]
    },
    {
        id: 'chirurgie',
        label: 'Chirurgie',
        subcategories: [
            { id: 'extraction', label: 'Extraktion' },
            { id: 'osteotomy', label: 'Osteotomie' },
            { id: 'resection', label: 'WSR' },
            { id: 'abscess', label: 'Abszess' },
        ]
    },
    {
        id: 'prothetik',
        label: 'Prothetik',
        subcategories: [
            { id: 'crown_prep', label: 'Krone (Präp)' },
            { id: 'crown_insert', label: 'Krone (Einsetzen)' },
            { id: 'bridge_prep', label: 'Brücke (Präp)' },
            { id: 'veneer', label: 'Veneers' },
        ]
    },
    {
        id: 'parodontologie',
        label: 'Parodontologie',
        subcategories: [
            { id: 'pa_status', label: 'PA-Status' },
            { id: 'pa_therapy', label: 'AIT / PMPR' },
            { id: 'upt', label: 'UPT' },
        ]
    },
    {
        id: 'prophylaxe',
        label: 'Prophylaxe',
        subcategories: [
            { id: 'prophylaxis', label: 'PZR' },
            { id: 'fissure_seal', label: 'Versiegelung' },
            { id: 'kids_check', label: 'Kinder-U' },
        ]
    },
];

// ═══════════════════════════════════════════════════════════════
// EASING
// ═══════════════════════════════════════════════════════════════

const easeOutQuart = [0.25, 1, 0.5, 1];

// ═══════════════════════════════════════════════════════════════
// CATEGORY LIST VIEW
// ═══════════════════════════════════════════════════════════════

function CategoryListView({
    selectedCategory,
    onSelect
}: {
    selectedCategory: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <motion.div
            key="categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: easeOutQuart }}
        >
            {/* Label */}
            <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    marginBottom: '18px',
                }}
            >
                Behandlung wählen
            </motion.p>

            {/* Category Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {CATEGORIES.map((category, index) => {
                    const isActive = selectedCategory === category.id;
                    return (
                        <motion.button
                            key={category.id}
                            onClick={() => onSelect(category.id)}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.25,
                                delay: 0.05 + index * 0.04,
                                ease: easeOutQuart
                            }}
                            className="category-item"
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: isActive ? '8px 14px' : '6px 14px',
                                fontSize: '20px',
                                fontWeight: isActive ? 400 : 300,
                                lineHeight: 1.45,
                                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.90)',
                                background: isActive
                                    ? 'rgba(255,255,255,0.16)'
                                    : 'transparent',
                                backdropFilter: isActive ? 'blur(6px)' : 'none',
                                border: 'none',
                                borderRadius: '999px',
                                outline: isActive
                                    ? '1px solid rgba(255,255,255,0.18)'
                                    : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.backdropFilter = 'blur(6px)';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.backdropFilter = 'none';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            {category.label}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SUBCATEGORY VIEW
// ═══════════════════════════════════════════════════════════════

function SubcategoryView({
    category,
    selectedSubcategory,
    onSelect,
    onBack
}: {
    category: Category;
    selectedSubcategory: string | null;
    onSelect: (id: string) => void;
    onBack: () => void;
}) {
    return (
        <motion.div
            key="subcategories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, delay: 0.12, ease: easeOutQuart }}
        >
            {/* Back Link */}
            <motion.button
                onClick={onBack}
                whileHover={{ opacity: 0.8 }}
                whileTap={{ scale: 0.98 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.5)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                }}
            >
                <ArrowLeft style={{ width: '16px', height: '16px' }} />
                Kategorien
            </motion.button>

            {/* Category Title */}
            <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
                style={{
                    fontSize: '30px',
                    fontWeight: 300,
                    color: '#FFFFFF',
                    marginBottom: '24px',
                    letterSpacing: '-0.01em',
                }}
            >
                {category.label}
            </motion.h2>

            {/* Subcategory Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {category.subcategories.map((sub, index) => {
                    const isActive = selectedSubcategory === sub.id;
                    return (
                        <motion.button
                            key={sub.id}
                            onClick={() => onSelect(sub.id)}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.22,
                                delay: 0.1 + index * 0.04,
                                ease: easeOutQuart
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: isActive ? '8px 14px' : '6px 14px',
                                fontSize: '18px',
                                fontWeight: isActive ? 400 : 300,
                                lineHeight: 1.45,
                                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.90)',
                                background: isActive
                                    ? 'rgba(255,255,255,0.16)'
                                    : 'transparent',
                                backdropFilter: isActive ? 'blur(6px)' : 'none',
                                border: 'none',
                                borderRadius: '999px',
                                outline: isActive
                                    ? '1px solid rgba(255,255,255,0.18)'
                                    : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.backdropFilter = 'blur(6px)';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.backdropFilter = 'none';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            {sub.label}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT — FLOATING RAIL
// ═══════════════════════════════════════════════════════════════

export function CategorySelector({
    selectedCategory,
    selectedSubcategory,
    onSelectCategory,
    onSelectSubcategory,
    onBack,
}: CategorySelectorProps) {
    const category = CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOutQuart }}
            className="floating-rail"
            style={{
                maxWidth: '320px',
                padding: '24px 26px',
                borderRadius: '32px',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 18px 48px -24px rgba(0,0,0,0.45)',
            }}
        >
            <AnimatePresence mode="wait">
                {!selectedCategory ? (
                    <CategoryListView
                        selectedCategory={selectedCategory}
                        onSelect={onSelectCategory}
                    />
                ) : category ? (
                    <SubcategoryView
                        category={category}
                        selectedSubcategory={selectedSubcategory}
                        onSelect={onSelectSubcategory}
                        onBack={onBack}
                    />
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
}

export default CategorySelector;
