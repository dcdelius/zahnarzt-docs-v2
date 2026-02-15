import React from 'react';

export default function IssuesPanel({ issues }) {
    if (!issues || issues.length === 0) return null;

    return (
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-lg ring-1 ring-black/5 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Validierung</h2>
            <div className="space-y-3">
                {issues.map((issue, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-2xl border-2 flex items-start gap-3 shadow-sm ${issue.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                    >
                        <div className="flex-1">
                            <div className="font-semibold text-sm">{issue.message}</div>
                            <div className="text-xs opacity-70 mt-1 font-mono">{issue.code} • {issue.path}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
