export function hasExplicitNegation(text: string): boolean {
    const t = (text || "").toLowerCase();
    // Matches "keine", "kein", "ohne", "nicht" as whole words
    return /\b(keine|kein|ohne|nicht)\b/.test(t);
}
