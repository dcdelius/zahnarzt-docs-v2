import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export function InstrumentPanel({ title, subtitle, action, children }: Props) {
    return (
        <div className="v10-instrument-panel">
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="v10-instrument-header"
            >
                <div>
                    <div className="v10-instrument-title">{title}</div>
                    {subtitle ? (
                        <div className="v10-instrument-subtitle">{subtitle}</div>
                    ) : null}
                </div>
                {action ? (
                    <div className="v10-instrument-action">{action}</div>
                ) : null}
            </motion.header>

            <div className="v10-instrument-surface">
                {children}
            </div>
        </div>
    );
}
