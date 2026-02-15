import { useState } from 'react';
import { useSoniaV3Controller } from '../sonia/hooks/useSoniaV3Controller';
import DictationPill from '../sonia/ui/DictationPill';
import IssuesPanel from '../sonia/ui/IssuesPanel';
import PreviewPanel from '../sonia/ui/PreviewPanel';
import SuggestionsPanel from '../sonia/ui/SuggestionsPanel';

export default function SoniaV3() {
    const controller = useSoniaV3Controller();
    const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
    const [dataViewTab, setDataViewTab] = useState('resolved'); // 'extracted' | 'resolved'

    const handleExtractWithModal = async () => {
        const suggestions = await controller.handleExtract();
        if (suggestions && suggestions.length > 0) {
            setShowSuggestionsModal(true);
        }
    };

    const handleAcceptAllAndClose = () => {
        controller.handleAcceptAllSuggestions();
        setShowSuggestionsModal(false);
    };

    return (
        <div className="flex h-screen overflow-hidden relative" style={{ background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)' }}>
            {/* Left Column: Dictation & Configuration */}
            <div className="w-1/2 p-6 border-r border-white/20 flex flex-col relative z-10 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">SONIA V3</h2>
                        <p className="text-sm text-gray-600">Intelligente Diktat-Extraktion</p>
                    </div>
                    {/* Debug Mode Toggle */}
                    <button
                        onClick={() => controller.setDebugMode(!controller.debugMode)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md ${controller.debugMode
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/90 text-gray-600 hover:bg-white'
                            }`}
                    >
                        {controller.debugMode ? '🐛 Debug ON' : '🐛 Debug'}
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center mb-6">
                    <DictationPill
                        value={controller.dictation}
                        onChange={controller.setDictation}
                        onExtract={handleExtractWithModal}
                        isRecording={controller.isRecording}
                        onStartRecording={controller.handleStartRecording}
                        onStopRecording={controller.handleStopRecording}
                        isTranscribing={controller.isTranscribing}
                        extracting={controller.extracting}
                        // Configuration Props
                        insuranceType={controller.insuranceType}
                        onInsuranceChange={controller.setInsuranceType}
                        manualMaterial={controller.manualMaterial}
                        onMaterialChange={controller.setManualMaterial}
                        standards={controller.availableChips}
                        inactiveStandards={controller.inactiveStandards}
                        onToggleStandard={controller.handleToggleStandard}
                        showBillingCodes={controller.showBillingCodes}
                        setShowBillingCodes={controller.setShowBillingCodes}
                        includeRisks={controller.includeRisks}
                        setIncludeRisks={controller.setIncludeRisks}
                        debugMode={controller.debugMode}
                        setDebugMode={controller.setDebugMode}
                    />
                </div>

                {/* Template Selector - Keep separate as it's a primary action */}
                <div className="mb-6 bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-lg ring-1 ring-black/5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Template</label>
                    <select
                        value={controller.selectedTemplateId}
                        onChange={e => controller.setSelectedTemplateId(e.target.value)}
                        className="w-full bg-white text-gray-800 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-100 outline-none transition-all shadow-sm"
                    >
                        {controller.templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.title} ({t.category})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Smart Suggestions Panel */}
                {showSuggestionsModal && (
                    <SuggestionsPanel
                        suggestions={controller.smartSuggestions}
                        acceptedSuggestions={controller.acceptedSuggestions}
                        onAccept={controller.handleAcceptSuggestion}
                        onReject={controller.handleRejectSuggestion}
                        onClose={() => setShowSuggestionsModal(false)}
                        onAcceptAll={handleAcceptAllAndClose}
                    />
                )}

                {/* Debug Panels (only in debug mode) */}
                {controller.debugMode && Object.keys(controller.dictationExtracted).length > 0 && (
                    <div className="mt-6 bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-lg ring-1 ring-black/5">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setDataViewTab('extracted')}
                                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all shadow-sm ${dataViewTab === 'extracted'
                                    ? 'bg-green-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📝 Extrahiert
                            </button>
                            <button
                                onClick={() => setDataViewTab('resolved')}
                                className={`flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all shadow-sm ${dataViewTab === 'resolved'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                ✅ Resolved
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 max-h-64 overflow-y-auto text-xs border-2 border-gray-200 shadow-inner">
                            {dataViewTab === 'extracted' ? (
                                <pre className="text-green-700 whitespace-pre-wrap">
                                    {JSON.stringify(controller.dictationExtracted, null, 2)}
                                </pre>
                            ) : (
                                <pre className="text-blue-700 whitespace-pre-wrap">
                                    {JSON.stringify(controller.caseState.data, null, 2)}
                                </pre>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Preview & Validation */}
            <div className="w-1/2 p-6 overflow-y-auto">
                {/* Validation Panel - only show if issues exist */}
                {controller.validation.issues.length > 0 && controller.debugMode && (
                    <div className="mb-6">
                        <IssuesPanel issues={controller.validation.issues} />
                    </div>
                )}

                <PreviewPanel
                    onPreview={controller.handlePreview}
                    isLoading={controller.loading}
                    result={controller.previewResult}
                />
            </div>
        </div>
    );
}
