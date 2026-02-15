import React from 'react';

interface Props {
    label: string;
    description?: string;
    children: React.ReactNode;
}

export function Band({ label, description, children }: Props) {
    return (
        <section className="v10-band">
            <div className="v10-band-header">
                <div className="v10-band-label">{label}</div>
                {description ? (
                    <div className="v10-band-description">{description}</div>
                ) : null}
            </div>
            <div className="v10-band-rows">
                {children}
            </div>
        </section>
    );
}
