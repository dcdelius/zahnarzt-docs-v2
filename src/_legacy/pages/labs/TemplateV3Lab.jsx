import React, { useState } from 'react';
import { MASTER_TEMPLATE_V3 } from '../../data/masterTemplate';

// Simple Tab Component
const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium ${active ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
    >
        {children}
    </button>
);

export default function TemplateV3Lab() {
    const [template, setTemplate] = useState(MASTER_TEMPLATE_V3);
    const [activeTab, setActiveTab] = useState('fields');
    const [jsonError, setJsonError] = useState(null);

    // Field Editor State
    const [editingField, setEditingField] = useState(null);

    const handleFieldSave = (field) => {
        setTemplate(prev => {
            const fields = [...prev.fields];
            const idx = fields.findIndex(f => f.id === field.id);
            if (idx >= 0) {
                fields[idx] = field;
            } else {
                fields.push(field);
            }
            return { ...prev, fields };
        });
        setEditingField(null);
    };

    const handleFieldDelete = (id) => {
        setTemplate(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== id)
        }));
    };

    return (
        <div className="p-6 h-screen flex flex-col bg-gray-50">
            <h1 className="text-2xl font-bold mb-4">Template V3 Editor</h1>

            {/* Tabs */}
            <div className="flex border-b mb-4">
                <TabButton active={activeTab === 'fields'} onClick={() => setActiveTab('fields')}>Fields</TabButton>
                <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>Rules</TabButton>
                <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>Preview</TabButton>
                <TabButton active={activeTab === 'json'} onClick={() => setActiveTab('json')}>Raw JSON</TabButton>
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'fields' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Fields ({template.fields.length})</h2>
                            <button
                                onClick={() => setEditingField({ id: '', label: '', type: 'string', required: false })}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                + Add Field
                            </button>
                        </div>

                        {editingField && (
                            <div className="bg-white p-4 border rounded shadow mb-4">
                                <h3 className="font-bold mb-2">{editingField.id ? 'Edit Field' : 'New Field'}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">ID</label>
                                        <input
                                            className="w-full border p-2 rounded"
                                            value={editingField.id}
                                            onChange={e => setEditingField({ ...editingField, id: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Label</label>
                                        <input
                                            className="w-full border p-2 rounded"
                                            value={editingField.label}
                                            onChange={e => setEditingField({ ...editingField, label: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Type</label>
                                        <select
                                            className="w-full border p-2 rounded"
                                            value={editingField.type}
                                            onChange={e => setEditingField({ ...editingField, type: e.target.value })}
                                        >
                                            <option value="string">String</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="enum">Enum</option>
                                            <option value="multiselect">Multiselect</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editingField.required || false}
                                                onChange={e => setEditingField({ ...editingField, required: e.target.checked })}
                                            />
                                            Required
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2 justify-end">
                                    <button onClick={() => setEditingField(null)} className="text-gray-500 px-4 py-2">Cancel</button>
                                    <button onClick={() => handleFieldSave(editingField)} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white border rounded shadow divide-y">
                            {template.fields.map(field => (
                                <div key={field.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <div className="font-bold">{field.label} <span className="text-gray-400 font-normal">({field.id})</span></div>
                                        <div className="text-xs text-gray-500">{field.type} {field.required ? '• Required' : ''}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingField(field)} className="text-blue-500 hover:underline">Edit</button>
                                        <button onClick={() => handleFieldDelete(field.id)} className="text-red-500 hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Rules ({template.rules.length})</h2>
                            <button
                                onClick={() => setTemplate(prev => ({ ...prev, rules: [...prev.rules, { id: `rule_${Date.now()}`, when: [], then: [] }] }))}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                + Add Rule
                            </button>
                        </div>
                        <div className="bg-white border rounded shadow divide-y">
                            {template.rules.map((rule, idx) => (
                                <div key={rule.id} className="p-4">
                                    <div className="flex justify-between mb-2">
                                        <div className="font-bold">{rule.id}</div>
                                        <button
                                            onClick={() => setTemplate(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== rule.id) }))}
                                            className="text-red-500 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <div className="text-xs font-mono bg-gray-100 p-2 rounded">
                                        {JSON.stringify(rule, null, 2)}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        (Visual Rule Editor TODO - Edit via JSON tab for now)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <PreviewTab template={template} />
                )}

                {activeTab === 'json' && (
                    <div className="h-full flex flex-col">
                        <textarea
                            className="flex-1 font-mono text-xs p-4 border rounded"
                            value={JSON.stringify(template, null, 2)}
                            onChange={(e) => {
                                try {
                                    setTemplate(JSON.parse(e.target.value));
                                    setJsonError(null);
                                } catch (err) {
                                    setJsonError(err.message);
                                }
                            }}
                        />
                        {jsonError && <div className="text-red-500 p-2 text-sm">{jsonError}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

function PreviewTab({ template }) {
    const [testData, setTestData] = useState(JSON.stringify({ tooth: "16", surfaces: { m: true }, matrix: { type: "none" } }, null, 2));
    const [validationResult, setValidationResult] = useState(null);
    const [dataError, setDataError] = useState(null);

    // Lazy import validation engine to avoid circular deps or heavy load if not needed
    // But for now we assume it's available or we mock it. 
    // Ideally we import { validateData } from '../../engine/validate';
    // Since we are in a file, let's try to dynamic import or just assume global for Lab.
    // Actually, we should import it at top level if possible, but let's use a placeholder if not.

    // For this implementation, I will assume validateData is available via import.
    // I'll add the import to the top of the file in a separate edit if needed, 
    // but for now I'll use a mock or try to use the one from context if I could.
    // Wait, I can't easily add import to top without reading file again.
    // I will assume I can add the import in the next step or use a require if environment supports it.
    // Let's just try to use a mock for the UI structure first, then I'll fix the import.

    const runValidation = async () => {
        try {
            const data = JSON.parse(testData);
            setDataError(null);
            // Dynamic import to ensure we get the latest engine
            const { validateData } = await import('../../engine/validate');
            const result = validateData(template, data);
            setValidationResult(result);
        } catch (err) {
            setDataError(err.message);
        }
    };

    return (
        <div className="flex gap-4 h-full">
            <div className="flex-1 flex flex-col">
                <label className="font-bold mb-2">Test Data (JSON)</label>
                <textarea
                    className="flex-1 font-mono text-xs p-4 border rounded mb-2"
                    value={testData}
                    onChange={e => setTestData(e.target.value)}
                />
                {dataError && <div className="text-red-500 text-xs mb-2">{dataError}</div>}
                <button
                    onClick={runValidation}
                    className="bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700"
                >
                    Validate
                </button>
            </div>
            <div className="flex-1 bg-white border rounded shadow p-4 overflow-auto">
                <h3 className="font-bold mb-4">Validation Results</h3>
                {!validationResult && <div className="text-gray-400">Run validation to see results.</div>}

                {validationResult && (
                    <div className="space-y-4">
                        <div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {validationResult.valid ? 'VALID' : 'INVALID'}
                            </span>
                        </div>

                        {validationResult.issues.length === 0 && <div className="text-green-600">No issues found.</div>}

                        {validationResult.issues.map((issue, i) => (
                            <div key={i} className={`p-3 rounded border-l-4 text-sm ${issue.type === 'error' ? 'border-red-500 bg-red-50' :
                                    issue.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'
                                }`}>
                                <div className="font-bold flex justify-between">
                                    <span>{issue.code}</span>
                                    <span className="uppercase text-xs">{issue.type}</span>
                                </div>
                                <div className="mt-1">{issue.message}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">Path: {issue.path}</div>
                            </div>
                        ))}

                        {validationResult.normalizedData && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="font-bold text-sm mb-2">Normalized Data</h4>
                                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                                    {JSON.stringify(validationResult.normalizedData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
