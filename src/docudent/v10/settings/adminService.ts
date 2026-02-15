import { doc, setDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { PracticeRole } from '../../core/auth/authTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CreatePracticeResult {
    success: boolean;
    id?: string;
    error?: string;
}

export interface CreateUserResult {
    success: boolean;
    id?: string;
    error?: string;
}

export interface NewPracticeData {
    name: string;
    id?: string;
}

export interface NewUserData {
    name: string;
    role: PracticeRole;
    email?: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

export const adminService = {
    /**
     * Creates a new Practice in Firestore.
     * Path: Praxen/{id}
     */
    async createPractice(data: NewPracticeData): Promise<CreatePracticeResult> {
        try {
            // Generate ID if not provided: normalize name to kebab-case
            const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            if (!id || id.length < 3) {
                return { success: false, error: 'Praxis-ID muss mindestens 3 Zeichen lang sein.' };
            }

            const ref = doc(db, 'Praxen', id);
            const snap = await getDoc(ref);

            if (snap.exists()) {
                return { success: false, error: `Praxis mit ID "${id}" existiert bereits.` };
            }

            await setDoc(ref, {
                name: data.name,
                createdAt: new Date().toISOString(),
                version: '1.0.0'
            });

            return { success: true, id };
        } catch (e) {
            console.error('[adminService] createPractice failed:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    },

    /**
     * Creates a new User in a Practice.
     * Path: Praxen/{practiceId}/Benutzer/{autoId}
     */
    async createUser(practiceId: string, data: NewUserData): Promise<CreateUserResult> {
        try {
            if (!practiceId) {
                return { success: false, error: 'Keine Praxis ausgewählt.' };
            }

            const usersRef = collection(db, 'Praxen', practiceId, 'Benutzer');

            const docRef = await addDoc(usersRef, {
                name: data.name,
                role: data.role, // "role" is standard, legacy uses "Rolle" sometimes, we stick to "role"
                email: data.email || null,
                createdAt: new Date().toISOString(),
                active: true,
                avatarColor: getRandomAvatarColor(),
            });

            return { success: true, id: docRef.id };
        } catch (e) {
            console.error('[adminService] createUser failed:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    }
};

function getRandomAvatarColor(): string {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
