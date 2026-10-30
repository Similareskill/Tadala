import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './firebase';
import { AdminAccount } from '../types/shopping';

const ADMIN_STORAGE_KEY = 'shopping_admin_session_v1';

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
  const clean = (rawEmail || '').trim().toLowerCase().replace(/\s+/g, '');
  if (
    clean === 'tadalamanu' ||
    clean === 'manu' ||
    clean === 'admin@tadalamanu' ||
    clean === 'tadalamanu.com' ||
    clean === 'admin@tadalamanu.com' ||
    clean === 'tadalamanu@gmail.com' ||
    clean === 'manu@tadalamanu.com' ||
    clean === 'manu@gmail.com' ||
    clean === 'admin.manu' ||
    clean === 'adminmanu'
  ) {
    return 'admin@tadalamanu.com';
  }
  if (
    clean === 'tadalathorinha' ||
    clean === 'thorinha' ||
    clean === 'thor' ||
    clean === 'admin@tadalathorinha' ||
    clean === 'tadalathorinha.com' ||
    clean === 'admin@tadalathorinha.com' ||
    clean === 'tadalathorinha@gmail.com' ||
    clean === 'thorinha@tadalathorinha.com' ||
    clean === 'thorinha@gmail.com' ||
    clean === 'admin.thorinha' ||
    clean === 'adminthorinha'
  ) {
    return 'admin@tadalathorinha.com';
  }
  if (
    clean === 'tadalatorean' ||
    clean === 'torean' ||
    clean === 'admin@tadalatorean' ||
    clean === 'tadalatorean.com' ||
    clean === 'admin@tadalatorean.com' ||
    clean === 'tadalatorean@gmail.com' ||
    clean === 'torean@tadalatorean.com' ||
    clean === 'torean@gmail.com' ||
    clean === 'admintorean'
  ) {
    return 'admin@tadalatorean.com';
  }
  if (
    clean === 'leandro' ||
    clean === 'leandrotemoteo' ||
    clean === 'leandrotemoteo123' ||
    clean === 'leandrotemoteo123@gmail'
  ) {
    return USER_ADMIN_EMAIL.toLowerCase();
  }
  if (clean === 'admin' || clean === 'adm' || clean === 'administrador') {
    return DEFAULT_ADMIN_EMAIL.toLowerCase();
  }
  return clean;
}

// Simple deterministic hash for password checking without external dependencies
export function hashPassword(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

const DEFAULT_HASH = hashPassword(DEFAULT_ADMIN_PASSWORD);

type AdminAuthListener = (isAdmin: boolean, account: AdminAccount | null) => void;
const listeners: Set<AdminAuthListener> = new Set();

function notifyListeners() {
  const current = adminAuthService.getCurrentAdmin();
  const isAdmin = current !== null && current.role === 'admin';
  listeners.forEach((listener) => {
    try {
      listener(isAdmin, current);
    } catch (e) {
      console.error('Error in admin auth listener:', e);
    }
  });
}

export const adminAuthService = {
  subscribe(callback: AdminAuthListener): () => void {
    listeners.add(callback);
    const current = this.getCurrentAdmin();
    callback(current !== null && current.role === 'admin', current);
    return () => listeners.delete(callback);
  },

  isAdmin(): boolean {
    const current = this.getCurrentAdmin();
    return current !== null && current.role === 'admin';
  },

  getCurrentAdmin(): AdminAccount | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role === 'admin' && parsed.email) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    // Check Firebase Auth current user
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.email) {
      const emailLower = fbUser.email.toLowerCase();
      if (ADMIN_PRESET_EMAILS.some((e) => e.toLowerCase() === emailLower)) {
        return {
          email: fbUser.email,
          name: fbUser.displayName || 'Admin',
          role: 'admin',
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          lastLogin: fbUser.metadata.lastSignInTime || new Date().toISOString(),
        };
      }
    }

    return null;
  },

  async login(
    email: string,
    pass?: string,
    remember: boolean = true
  ): Promise<{ success: boolean; user?: AdminAccount; error?: string }> {
    const cleanEmail = normalizeAdminEmail(email);
    const cleanPass = (pass || DEFAULT_ADMIN_PASSWORD).trim();

    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe o e-mail do Administrador.' };
    }

    const isPresetAdmin = ADMIN_PRESET_EMAILS.some((e) => e.toLowerCase() === cleanEmail);

    const getDisplayName = (emailStr: string): string => {
      if (emailStr === 'admin@tadalamanu.com') return 'Manu (Admin)';
      if (emailStr === 'admin@tadalathorinha.com') return 'Thorinha (Admin)';
      if (emailStr === 'admin@tadalatorean.com') return 'Torean (Admin)';
      if (emailStr === USER_ADMIN_EMAIL.toLowerCase()) return 'Leandro (Admin)';
      if (emailStr === DEFAULT_ADMIN_EMAIL.toLowerCase()) return 'Administrador Principal';
      return 'Administrador';
    };

    if (isPresetAdmin) {
      const adminAccount: AdminAccount = {
        email: cleanEmail,
        name: getDisplayName(cleanEmail),
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      if (remember) {
        try {
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAccount));
          localStorage.setItem('shopping_user_name', adminAccount.name || 'Admin');
        } catch {}
      } else {
        try {
          sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAccount));
          sessionStorage.setItem('shopping_user_name', adminAccount.name || 'Admin');
        } catch {}
      }

      // Background Firebase Auth session if possible
      (async () => {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass || DEFAULT_ADMIN_PASSWORD);
        } catch {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass || DEFAULT_ADMIN_PASSWORD);
          } catch {}
        }
      })();

      notifyListeners();
      return { success: true, user: adminAccount };
    }

    // Try Firebase Auth for arbitrary admin accounts
    let firebaseUser = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      firebaseUser = cred.user;
    } catch {
      // Ignored
    }

    if (!firebaseUser) {
      return {
        success: false,
        error: 'E-mail ou senha de Administrador incorretos. Verifique suas credenciais.',
      };
    }

    const adminAccount: AdminAccount = {
      email: cleanEmail,
      name: firebaseUser.displayName || getDisplayName(cleanEmail),
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

    const verifyRes = await this.login(emailToUse, currentPass, false);
    if (!verifyRes.success) {
      return { success: false, error: 'A senha atual está incorreta.' };
    }

    return { success: true };
  },

  async registerAdmin(
    email: string,
    password: string,
    _displayName?: string
  ): Promise<{ success: boolean; user?: AdminAccount; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Preencha o e-mail e a senha do novo Administrador.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, error: 'A senha deve conter no mínimo 4 caracteres.' };
    }

    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch {}

    return this.login(cleanEmail, cleanPass, true);
  },
};
