import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';

let pendingAuthReady: Promise<void> | null = null;

/**
 * Best-effort guard for Firebase callable calls from browser UI:
 * waits shortly for an authenticated user/token so callables with context.auth
 * don't fail on initial race right after app boot.
 */
export async function ensureCallableAuthReady(timeoutMs = 2500): Promise<void> {
    if (typeof window === 'undefined') return;

    if (auth.currentUser) {
        await auth.currentUser.getIdToken().catch(() => undefined);
        return;
    }

    if (pendingAuthReady) {
        return pendingAuthReady;
    }

    pendingAuthReady = new Promise<void>((resolve) => {
        let done = false;
        let unsubscribe: (() => void) | null = null;

        const finish = () => {
            if (done) return;
            done = true;
            try {
                unsubscribe?.();
            } catch {
                // noop
            }
            pendingAuthReady = null;
            resolve();
        };

        const timer = setTimeout(finish, Math.max(250, timeoutMs));

        unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            await user.getIdToken().catch(() => undefined);
            clearTimeout(timer);
            finish();
        });
    });

    return pendingAuthReady;
}

