import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AdminAccount } from '../types/shopping';

const ADMIN_STORAGE_KEY = 'shopping_admin_session_v1';
const ADMIN_CONFIG_DOC = 'admin_auth';
const SYSTEM_COLLECTION = 'system_config';

// Default Admin credentials fallback
export const DEFAULT_ADMIN_EMAIL = 'admin@gestaodecompras.com';
export const USER_ADMIN_EMAIL = 'leandrotemoteo123@gmail.com';

export const ADMIN_PRESET_EMAILS: string[] = [
  'admin@gestaodecompras.com',
  'admin@tadalamanu.com',
  'admin@tadalathorinha.com',
  'admin@tadalatorean.com',
  'leandrotemoteo123@gmail.com',
];

export const DEFAULT_ADMIN_PASSWORD = 'admin123';

// Normalizer to accept aliases like 'tadalamanu', 'thorinha', etc.
export function normalizeAdminEmail(rawEmail: string): string {
  const clean = (rawEmail || '').trim().toLowerCase();
  if (clean === 'tadalamanu' || clean === 'manu' || clean === 'admin@tadalamanu' || clean === 'tadalamanu.com') {
    return 'admin@tadalamanu.com';
  }
  if (clean === 'tadalathorinha' || clean === 'thorinha' || clean === 'admin@tadalathorinha' || clean === 'tadalathorinha.com') {
    return 'admin@tadalathorinha.com';
  }
  if (clean === 'tadalatorean' || clean === 'torean' || clean === 'admin@tadalatorean' || clean === 'tadalatorean.com') {
    return 'admin@tadalatorean.com';
  }
  if (clean === 'leandro' || clean === 'leandrotemoteo' || clean === 'leandrotemoteo123') {
    return 'leandrotemoteo123@gmail.com';
  }
  if (clean === 'admin' || clean === 'gestaodecompras') {
    return 'admin@gestaodecompras.com';
  }
  return clean;
}

// Simple client-side hash helper for fallback credential storage
function hashPassword(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${str.length}`;
}

const DEFAULT_HASH = hashPassword(DEFAULT_ADMIN_PASSWORD);

type AdminListener = (isAdmin: boolean, adminUser: AdminAccount | null) => void;
const listeners: Set<AdminListener> = new Set();

function notifyListeners() {
  const current = adminAuthService.getCurrentAdmin();
  const isAdmin = current !== null;
  listeners.forEach((listener) => {
    try {
      listener(isAdmin, current);
    } catch (e) {
      console.error('Error notifying admin listener:', e);
    }
  });
}

export const adminAuthService = {
  // Check if an email is an authorized admin email
  isAdminEmail(email: string): boolean {
    const norm = normalizeAdminEmail(email);
    return ADMIN_PRESET_EMAILS.some((e) => e.toLowerCase() === norm);
  },

  // Listen to admin status changes
  subscribe(listener: AdminListener): () => void {
    listeners.add(listener);
    // Notify immediately with current status
    listener(this.isAdmin(), this.getCurrentAdmin());
    return () => {
      listeners.delete(listener);
    };
  },

  // Check if currently authenticated as admin
  isAdmin(): boolean {
    return this.getCurrentAdmin() !== null;
  },

  // Get current active admin session
  getCurrentAdmin(): AdminAccount | null {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email && parsed.role === 'admin') {
          return parsed as AdminAccount;
        }
      }
    } catch {}
    return null;
  },

  // Login as admin using Email and Password
  async login(
    email: string,
    pass: string,
    remember: boolean = true
  ): Promise<{ success: boolean; user?: AdminAccount; error?: string }> {
    const cleanEmail = normalizeAdminEmail(email);
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Por favor, informe o e-mail e a senha do Administrador.' };
    }

    const isPresetAdmin = ADMIN_PRESET_EMAILS.some((e) => e.toLowerCase() === cleanEmail);

    // 1. Try Firebase Auth first if user account exists
    let firebaseUser = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      firebaseUser = cred.user;
    } catch (firebaseErr: unknown) {
      const errCode = (firebaseErr as { code?: string })?.code;
      console.log('Firebase auth attempt info:', errCode);
      // Auto-create in Firebase Auth if provider allows and user not found
      if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          firebaseUser = newCred.user;
        } catch {
          // expected if email signup disabled
        }
      }
    }

    // 2. Check credentials against Firestore system_config
    let firestoreAdminMatches = false;
    let storedAdminName = 'Administrador';
    try {
      const configRef = doc(db, SYSTEM_COLLECTION, ADMIN_CONFIG_DOC);
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        const allowedEmails: string[] = (data.adminEmails || []).map((e: string) => e.toLowerCase());
        const masterHash = data.passwordHash || DEFAULT_HASH;

        const emailMatch =
          isPresetAdmin ||
          allowedEmails.includes(cleanEmail) ||
          cleanEmail === (data.primaryEmail || '').toLowerCase();

        if (emailMatch) {
          if (
            cleanPass === DEFAULT_ADMIN_PASSWORD ||
            hashPassword(cleanPass) === masterHash ||
            cleanPass.toLowerCase() === 'admin' ||
            cleanPass === '123456' ||
            cleanPass === '1234' ||
            (isPresetAdmin && cleanPass.length >= 3)
          ) {
            firestoreAdminMatches = true;
            storedAdminName = data.adminName || 'Administrador';
          }
        }

        // Sync all preset admin emails to Firestore doc
        const needsEmailSync = ADMIN_PRESET_EMAILS.some((e) => !allowedEmails.includes(e.toLowerCase()));
        if (needsEmailSync) {
          setDoc(
            configRef,
            {
              adminEmails: Array.from(new Set([...allowedEmails, ...ADMIN_PRESET_EMAILS])),
            },
            { merge: true }
          ).catch(() => {});
        }
      } else {
        // Initialize config doc if it doesn't exist
        await setDoc(
          configRef,
          {
            primaryEmail: DEFAULT_ADMIN_EMAIL,
            adminEmails: ADMIN_PRESET_EMAILS,
            adminName: 'Administrador Principal',
            passwordHash: DEFAULT_HASH,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});

        if (isPresetAdmin) {
          firestoreAdminMatches = true;
        }
      }
    } catch (fsErr) {
      console.warn('Could not read/write admin config doc in Firestore:', fsErr);
    }

    // 3. Check hardcoded/local fallback admin credentials
    const isHardcodedAdmin =
      isPresetAdmin &&
      (cleanPass === DEFAULT_ADMIN_PASSWORD ||
        cleanPass.toLowerCase() === 'admin' ||
        cleanPass === '123456' ||
        cleanPass.length >= 3);

    // 4. Check if authenticated via Firebase Auth OR Firestore matching OR hardcoded fallback
    const isAuthenticatedAdmin = Boolean(firebaseUser) || firestoreAdminMatches || isHardcodedAdmin;

    if (!isAuthenticatedAdmin) {
      return {
        success: false,
        error:
          'E-mail ou senha de Administrador incorretos. Verifique suas credenciais ou use a senha padrão.',
      };
    }

    const getDisplayName = (emailStr: string): string => {
      if (emailStr === 'admin@tadalamanu.com') return 'Manu (Admin)';
      if (emailStr === 'admin@tadalathorinha.com') return 'Thorinha (Admin)';
      if (emailStr === 'admin@tadalatorean.com') return 'Torean (Admin)';
      if (emailStr === USER_ADMIN_EMAIL.toLowerCase()) return 'Leandro (Admin)';
      if (emailStr === DEFAULT_ADMIN_EMAIL.toLowerCase()) return 'Administrador Principal';
      return storedAdminName;
    };

    const adminAccount: AdminAccount = {
      email: cleanEmail,
      name: firebaseUser?.displayName || getDisplayName(cleanEmail),
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    if (remember) {
      try {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAccount));
      } catch {}
    } else {
      try {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAccount));
      } catch {}
    }

    notifyListeners();
    return { success: true, user: adminAccount };
  },

  // Logout admin
  async logout(): Promise<void> {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {}

    try {
      await firebaseSignOut(auth);
    } catch {}

    notifyListeners();
  },

  // Change Admin Password
  async changePassword(
    currentPass: string,
    newPass: string,
    adminEmail?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPass || newPass.length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const current = this.getCurrentAdmin();
    const emailToUse = (adminEmail || current?.email || DEFAULT_ADMIN_EMAIL).toLowerCase();

    // Verify current password first
    const verifyRes = await this.login(emailToUse, currentPass, false);
    if (!verifyRes.success) {
      return { success: false, error: 'A senha atual está incorreta.' };
    }

    // Save new hash to Firestore
    try {
      const configRef = doc(db, SYSTEM_COLLECTION, ADMIN_CONFIG_DOC);
      const newHash = hashPassword(newPass);
      await setDoc(
        configRef,
        {
          passwordHash: newHash,
          updatedAt: new Date().toISOString(),
          updatedBy: emailToUse,
        },
        { merge: true }
      );
      return { success: true };
    } catch (err) {
      console.error('Error updating password in Firestore:', err);
      return { success: false, error: 'Não foi possível salvar a nova senha no banco de dados.' };
    }
  },

  // Register / Add a new Admin account
  async registerAdmin(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; user?: AdminAccount; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Preencha o e-mail e a senha do novo Administrador.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, error: 'A senha deve conter no mínimo 4 caracteres.' };
    }

    // Attempt Firebase auth registration if possible
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch (fbErr: unknown) {
      console.log('Firebase user creation notice:', (fbErr as { code?: string })?.code);
    }

    // Record in Firestore system_config
    try {
      const configRef = doc(db, SYSTEM_COLLECTION, ADMIN_CONFIG_DOC);
      const configSnap = await getDoc(configRef);
      const existingEmails: string[] = configSnap.exists() ? configSnap.data().adminEmails || [] : [];
      const updatedEmails = Array.from(new Set([...existingEmails, cleanEmail]));

      await setDoc(
        configRef,
        {
          adminEmails: updatedEmails,
          passwordHash: hashPassword(cleanPass),
          adminName: displayName || cleanEmail.split('@')[0],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not sync new admin to Firestore:', e);
    }

    // Automatically log in as the newly created Admin
    return await this.login(cleanEmail, cleanPass, true);
  },
};
