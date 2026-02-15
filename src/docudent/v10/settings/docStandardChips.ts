export const DEFAULT_DOC_CHIPS = [
    { id: 'doc_aufklaerung', label: 'Aufklärung' },
    { id: 'doc_alternativen', label: 'Alternativen' },
    { id: 'doc_risiken', label: 'Risiken' },
    { id: 'doc_einverstaendnis', label: 'Einverständnis' },
    { id: 'doc_okklusion', label: 'Okklusion' },
    { id: 'doc_politur', label: 'Politur' },
    { id: 'optisch_elektronisch', label: 'Optisch/elektronisch unterstützt' },
] as const;

export type DefaultDocChipId = typeof DEFAULT_DOC_CHIPS[number]['id'];
