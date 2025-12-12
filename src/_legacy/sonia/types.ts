export type Source = "manual" | "dictation" | "chip" | "default" | "suggestion";

export type Conflict = {
    path: string;
    a: { source: Source; value: any };
    b: { source: Source; value: any };
    resolution: { source: Source; value: any };
};

export type CaseState = {
    data: Record<string, any>;
    sources: Record<string, Source>;
    conflicts: Conflict[];
    meta: {
        insuranceType: "GKV" | "PKV";
        templateId: string;
        createdAt: string;
        acceptedSuggestions?: string[];
    };
};
