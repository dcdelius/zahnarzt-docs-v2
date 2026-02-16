"use strict";
/**
 * Docudent Cloud Functions — Auth & Invite System
 *
 * F1: createPracticeSelfServe — Create org + practice for new user
 * F2: createInvite — Generate invite link
 * F3: acceptInvite — Accept invite and join practice
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineDocumentationTextV1 = exports.transcribeAudioV1 = exports.extractFromDictationV1 = exports.detectTreatmentIntentsV1 = exports.acceptInvite = exports.createInvite = exports.createPracticeSelfServe = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
async function getUserClaims(uid) {
    try {
        const user = await auth.getUser(uid);
        return user.customClaims ?? { orgs: {}, practices: {} };
    }
    catch {
        return { orgs: {}, practices: {} };
    }
}
async function updateUserClaims(uid, claims) {
    await auth.setCustomUserClaims(uid, claims);
}
async function hasPracticeRole(uid, orgId, practiceId, role) {
    // Check Firestore membership directly (more reliable than claims for verification)
    const membershipRef = db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`);
    const snap = await membershipRef.get();
    if (!snap.exists)
        return false;
    const data = snap.data();
    return data.roles.includes(role);
}
exports.createPracticeSelfServe = functions.https.onCall(async (data, context) => {
    // Auth required
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const uid = context.auth.uid;
    const email = context.auth.token.email ?? 'unknown';
    const now = admin.firestore.Timestamp.now();
    // Validate input
    const practiceName = (data.practiceName ?? '').trim();
    if (!practiceName || practiceName.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Practice name required (min 2 chars)');
    }
    const orgName = (data.orgName ?? practiceName).trim();
    // Generate IDs
    const orgId = generateId('org');
    const practiceId = generateId('practice');
    // Create org
    const orgDoc = {
        id: orgId,
        name: orgName,
        status: 'active',
        createdAt: now,
        createdBy: uid,
    };
    await db.doc(`orgs/${orgId}`).set(orgDoc);
    // Create practice
    const practiceDoc = {
        id: practiceId,
        orgId,
        name: practiceName,
        status: 'active',
        createdAt: now,
        createdBy: uid,
    };
    await db.doc(`orgs/${orgId}/practices/${practiceId}`).set(practiceDoc);
    // Create org membership (member role)
    const orgMembership = {
        userId: uid,
        orgId,
        roles: ['member'],
        createdAt: now,
        createdBy: uid,
    };
    await db.doc(`orgs/${orgId}/memberships/${uid}`).set(orgMembership);
    // Create practice membership (practice_admin role)
    const practiceMembership = {
        userId: uid,
        orgId,
        practiceId,
        roles: ['practice_admin'],
        createdAt: now,
        createdBy: uid,
    };
    await db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`).set(practiceMembership);
    // Update custom claims
    const claims = await getUserClaims(uid);
    claims.orgs = claims.orgs ?? {};
    claims.practices = claims.practices ?? {};
    claims.orgs[orgId] = ['member'];
    claims.practices[practiceId] = ['practice_admin'];
    await updateUserClaims(uid, claims);
    functions.logger.info(`Created practice ${practiceId} in org ${orgId} by ${email}`);
    return { orgId, practiceId };
});
exports.createInvite = functions.https.onCall(async (data, context) => {
    // Auth required
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const uid = context.auth.uid;
    const now = admin.firestore.Timestamp.now();
    // Validate input
    const { orgId, practiceId, role, email } = data;
    if (!orgId || !practiceId) {
        throw new functions.https.HttpsError('invalid-argument', 'orgId and practiceId required');
    }
    const validRoles = ['practice_admin', 'provider', 'assistant'];
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid role: ${role}`);
    }
    // Verify caller is practice_admin
    const isPracticeAdmin = await hasPracticeRole(uid, orgId, practiceId, 'practice_admin');
    if (!isPracticeAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only practice_admin can create invites');
    }
    // Generate token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const inviteId = generateId('invite');
    // Create invite doc
    const inviteDoc = {
        id: inviteId,
        orgId,
        practiceId,
        role,
        tokenHash,
        createdAt: now,
        createdBy: uid,
    };
    if (email) {
        inviteDoc.emailLower = email.toLowerCase().trim();
    }
    await db.doc(`orgs/${orgId}/practices/${practiceId}/invites/${inviteId}`).set(inviteDoc);
    // Build invite link
    const baseUrl = process.env.APP_URL ?? 'https://docudent.app';
    const link = `${baseUrl}/accept-invite?orgId=${orgId}&practiceId=${practiceId}&inviteId=${inviteId}&token=${token}`;
    functions.logger.info(`Created invite ${inviteId} for role ${role} in practice ${practiceId}`);
    return { inviteId, token, link };
});
exports.acceptInvite = functions.https.onCall(async (data, context) => {
    // Auth required
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const uid = context.auth.uid;
    const userEmail = context.auth.token.email?.toLowerCase() ?? '';
    const now = admin.firestore.Timestamp.now();
    // Validate input
    const { orgId, practiceId, inviteId, token } = data;
    if (!orgId || !practiceId || !inviteId || !token) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    // Load invite
    const inviteRef = db.doc(`orgs/${orgId}/practices/${practiceId}/invites/${inviteId}`);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Invite not found');
    }
    const invite = inviteSnap.data();
    // Check if already consumed
    if (invite.consumedAt) {
        throw new functions.https.HttpsError('failed-precondition', 'Invite already used');
    }
    // Verify token
    const providedHash = hashToken(token);
    if (providedHash !== invite.tokenHash) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid invite token');
    }
    // Check email restriction if present
    if (invite.emailLower && invite.emailLower !== userEmail) {
        throw new functions.https.HttpsError('permission-denied', `This invite is restricted to ${invite.emailLower}`);
    }
    // Create org membership if not exists
    const orgMembershipRef = db.doc(`orgs/${orgId}/memberships/${uid}`);
    const orgMembershipSnap = await orgMembershipRef.get();
    if (!orgMembershipSnap.exists) {
        const orgMembership = {
            userId: uid,
            orgId,
            roles: ['member'],
            createdAt: now,
            createdBy: uid,
        };
        await orgMembershipRef.set(orgMembership);
    }
    // Create practice membership
    const practiceMembershipRef = db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`);
    const practiceMembershipSnap = await practiceMembershipRef.get();
    if (practiceMembershipSnap.exists) {
        // Already a member - add role if not present
        const existingData = practiceMembershipSnap.data();
        if (!existingData.roles.includes(invite.role)) {
            await practiceMembershipRef.update({
                roles: admin.firestore.FieldValue.arrayUnion(invite.role),
            });
        }
    }
    else {
        const practiceMembership = {
            userId: uid,
            orgId,
            practiceId,
            roles: [invite.role],
            createdAt: now,
            createdBy: uid,
        };
        await practiceMembershipRef.set(practiceMembership);
    }
    // If provider role, create provider doc
    if (invite.role === 'provider') {
        const providerId = generateId('prov');
        const user = await auth.getUser(uid);
        const providerDoc = {
            id: providerId,
            practiceId,
            orgId,
            userId: uid,
            displayName: user.displayName ?? user.email ?? 'Provider',
            createdAt: now,
            createdBy: uid,
        };
        await db.doc(`orgs/${orgId}/practices/${practiceId}/providers/${providerId}`).set(providerDoc);
    }
    // Mark invite as consumed
    await inviteRef.update({
        consumedAt: now,
        consumedBy: uid,
    });
    // Update custom claims
    const claims = await getUserClaims(uid);
    claims.orgs = claims.orgs ?? {};
    claims.practices = claims.practices ?? {};
    if (!claims.orgs[orgId]) {
        claims.orgs[orgId] = ['member'];
    }
    if (!claims.practices[practiceId]) {
        claims.practices[practiceId] = [invite.role];
    }
    else if (!claims.practices[practiceId].includes(invite.role)) {
        claims.practices[practiceId].push(invite.role);
    }
    await updateUserClaims(uid, claims);
    functions.logger.info(`User ${uid} accepted invite ${inviteId} with role ${invite.role}`);
    return { ok: true, role: invite.role };
});
const PREANALYSIS_PROMPT = `Du strukturierst zahnmedizinische Fliesstext-Diktate in Behandlungs-Intents.
Antworte NUR als JSON mit diesem Schema:
{
  "version": "1.0.0",
  "dictation": "<original>",
  "needsConfirmation": true|false,
  "intents": [
    {
      "intentId": "string",
      "treatmentId": "fuellung|endo|extraction|crown_prep",
      "tooth": "string optional",
      "phase": "string optional",
      "step": "string optional",
      "confidence": 0..1,
      "evidenceSpans": [{ "start": number, "end": number, "text": "string" }],
      "uncertainty": "classifier_low_confidence|candidate:crown_prep_no_pack|llm_low_confidence|llm_ambiguous_mapping|inferred_tooth_from_context|missing_tooth_reference optional"
    }
  ]
}
Regeln:
- Keine Erfindungen.
- Jeder Intent braucht mindestens einen evidenceSpan.
- Wenn unsicher: needsConfirmation=true.
- Wenn uncertainty gesetzt ist, muss needsConfirmation=true sein.
- Wenn tooth fehlt, uncertainty setzen (z.B. missing_tooth_reference).
- Keine Billing-Codes/Felder ausgeben (z.B. BEMA/GOZ/GOÄ/BEL, billingCodes, billingRefs).
- Nur treatmentIds verwenden, die im Schema stehen.`;
function getOpenAiApiKey() {
    const envKey = process.env.OPENAI_API_KEY?.trim();
    if (envKey)
        return envKey;
    const runtimeConfigKey = functions.config()?.openai?.key;
    if (typeof runtimeConfigKey === 'string' && runtimeConfigKey.trim().length > 0) {
        // Keep OPENAI_API_KEY as canonical runtime source for downstream checks.
        process.env.OPENAI_API_KEY = runtimeConfigKey.trim();
        return process.env.OPENAI_API_KEY;
    }
    return null;
}
exports.detectTreatmentIntentsV1 = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const dictation = (data?.dictation ?? '').trim();
    if (!dictation) {
        throw new functions.https.HttpsError('invalid-argument', 'dictation is required');
    }
    if (dictation.length > 4000) {
        throw new functions.https.HttpsError('invalid-argument', 'dictation exceeds max length');
    }
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.0,
            max_tokens: 900,
            messages: [
                { role: 'system', content: PREANALYSIS_PROMPT },
                { role: 'user', content: dictation },
            ],
        }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => 'no-details');
        functions.logger.error('detectTreatmentIntentsV1 upstream error', {
            status: response.status,
            details,
        });
        throw new functions.https.HttpsError('internal', `preanalysis upstream failed (${response.status})`);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        throw new functions.https.HttpsError('internal', 'preanalysis returned empty content');
    }
    return { content };
});
const EXTRACTION_PROMPT_V1 = `Du bist ein Extraktions-Assistent für zahnärztliche Diktate.

Extrahiere aus dem folgenden Diktat die strukturierten Daten.
Antworte NUR mit einem JSON-Objekt, keine Erklärungen.

Felder zum Extrahieren:
- tooth: Zahnnummer (z.B. "36", "15") oder null
- surfaces: Array von Flächen ["m", "o", "d", "b", "l", "i"] oder []
- diagnosis: Diagnose (z.B. "Caries profunda", "Caries media") oder null
- costs: Kosten in Euro als Zahl oder null
- klinischeZusatzinfos: Array kurzer Stichpunkte zu medizinischen Zusatzinfos oder []
- patientenangaben: Array kurzer Stichpunkte zu psychosozialen/patientenseitigen Angaben oder []
- zusatzinfos: (legacy) Array kurzer Stichpunkte, falls keine klare Zuordnung möglich
- mentioned.anesthesia: { type: "infiltr"|"leitung"|"keine", confidence: 0-1 } oder undefined
- mentioned.kofferdam: true/false oder undefined
- mentioned.capping: { type: "cp"|"p"|"none" } oder undefined
- mentioned.material: String oder undefined
- mentioned.vitality: "+"| "-" oder undefined
- mentioned.percussion: "+"| "-" oder undefined

Regeln:
1. Extrahiere NUR was explizit erwähnt wurde
2. Bei "tief" oder "profunda" → diagnosis: "Caries profunda"
3. "mod" = ["m", "o", "d"], "ob" = ["o", "b"], etc.
4. klinischeZusatzinfos nur bei expliziter, medizinisch relevanter Zusatzinfo (kurz, neutral, keine Mutmaßungen)
5. patientenangaben nur bei expliziter Patientenangabe (kurz, neutral, keine Mutmaßungen)
6. zusatzinfos nur wenn keine klare Zuordnung möglich ist
7. KEINE Annahmen über nicht erwähnte Felder

JSON-Antwort:`;
exports.extractFromDictationV1 = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const dictation = (data?.dictation ?? '').trim();
    if (!dictation) {
        throw new functions.https.HttpsError('invalid-argument', 'dictation is required');
    }
    if (dictation.length > 4000) {
        throw new functions.https.HttpsError('invalid-argument', 'dictation exceeds max length');
    }
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: EXTRACTION_PROMPT_V1 },
                { role: 'user', content: dictation },
            ],
            temperature: 0.1,
            max_tokens: 500,
        }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => 'no-details');
        functions.logger.error('extractFromDictationV1 upstream error', {
            status: response.status,
            details,
        });
        throw new functions.https.HttpsError('internal', `extraction upstream failed (${response.status})`);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        throw new functions.https.HttpsError('internal', 'extraction returned empty content');
    }
    return { content };
});
const TRANSCRIPTION_PROMPT_V1 = `Dies ist eine zahnärztliche Dokumentation.
Transkribiere präzise Fachbegriffe, Zahnnummern (FDI), Flächenkürzel und Materialnamen.
Keine Interpretationen, nur wörtlich transkribieren.`;
exports.transcribeAudioV1 = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const audioBase64 = String(data?.audioBase64 ?? '').trim();
    const mimeType = String(data?.mimeType ?? 'audio/webm').trim() || 'audio/webm';
    const fileName = String(data?.fileName ?? 'audio.webm').trim() || 'audio.webm';
    if (!audioBase64) {
        throw new functions.https.HttpsError('invalid-argument', 'audioBase64 is required');
    }
    let audioBuffer;
    try {
        audioBuffer = Buffer.from(audioBase64, 'base64');
    }
    catch {
        throw new functions.https.HttpsError('invalid-argument', 'audioBase64 is not valid base64');
    }
    if (!audioBuffer.length) {
        throw new functions.https.HttpsError('invalid-argument', 'decoded audio is empty');
    }
    if (audioBuffer.length > 8 * 1024 * 1024) {
        throw new functions.https.HttpsError('invalid-argument', 'audio payload exceeds 8MB limit');
    }
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    }
    const formData = new FormData();
    const audioBytes = Uint8Array.from(audioBuffer);
    const audioBlob = new Blob([audioBytes], { type: mimeType });
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'de');
    formData.append('response_format', 'text');
    formData.append('prompt', TRANSCRIPTION_PROMPT_V1);
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
    });
    if (!response.ok) {
        const details = await response.text().catch(() => 'no-details');
        functions.logger.error('transcribeAudioV1 upstream error', {
            status: response.status,
            details,
        });
        throw new functions.https.HttpsError('internal', `transcription upstream failed (${response.status})`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const text = contentType.includes('application/json')
        ? String((await response.json())?.text ?? '')
        : await response.text();
    const normalized = text.trim();
    if (!normalized) {
        throw new functions.https.HttpsError('internal', 'transcription returned empty text');
    }
    return { text: normalized };
});
const REFINER_PROMPT_V1 = [
    'Du bist ein medizinischer Korrektor.',
    'Korrigiere nur Grammatik, Rechtschreibung und Zeichensetzung.',
    'Aendere keine inhaltlichen Fakten, Zahlen, Zahnnummern oder Begriffe.',
    'Fuege keine neuen Saetze hinzu und entferne keine Saetze.',
    'Gib nur den korrigierten Text zurueck.',
].join('\n');
exports.refineDocumentationTextV1 = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const text = String(data?.text ?? '').trim();
    if (!text) {
        throw new functions.https.HttpsError('invalid-argument', 'text is required');
    }
    if (text.length > 8000) {
        throw new functions.https.HttpsError('invalid-argument', 'text exceeds max length');
    }
    const treatmentId = String(data?.treatmentId ?? '').trim() || 'unknown';
    const insuranceType = data?.insuranceType ?? 'GKV';
    const textLength = data?.textLength ?? 'mittel';
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 800,
            messages: [
                { role: 'system', content: REFINER_PROMPT_V1 },
                {
                    role: 'user',
                    content: [
                        `TREATMENT=${treatmentId}`,
                        `INSURANCE=${insuranceType}`,
                        `TEXT_LENGTH=${textLength}`,
                        '',
                        text,
                    ].join('\n'),
                },
            ],
        }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => 'no-details');
        functions.logger.error('refineDocumentationTextV1 upstream error', {
            status: response.status,
            details,
        });
        throw new functions.https.HttpsError('internal', `refiner upstream failed (${response.status})`);
    }
    const payload = await response.json();
    const content = String(payload?.choices?.[0]?.message?.content ?? '').trim();
    if (!content) {
        throw new functions.https.HttpsError('internal', 'refiner returned empty content');
    }
    return { text: content };
});
//# sourceMappingURL=index.js.map