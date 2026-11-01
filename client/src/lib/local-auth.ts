/**
 * @file local-auth.ts
 * @description Local authentication mock for offline demo testing when Supabase backend is not configured.
 * 
 * SECURITY WARNING:
 * This module is provided SOLELY for local development and offline demo purposes.
 * In a production deployment:
 * 1. Plaintext or client-side authentication MUST NEVER be used as a security boundary.
 * 2. All user authentication must use Supabase Auth (server-side argon2/bcrypt with secure HTTP cookies/JWTs).
 * 3. Client-side storage (localStorage) cannot prevent local inspection or tampering.
 * 
 * For local demo accounts, passwords are now derived using PBKDF2 (100,000 iterations of SHA-256 with
 * a 16-byte cryptographically random salt per user). Legacy plaintext entries from earlier demo
 * versions are automatically migrated to PBKDF2 on first login and wiped from localStorage.
 */

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'organizer';
  createdAt: string;
}

interface StoredCredential {
  saltHex: string;
  hashHex: string;
  iterations: number;
  algorithm: 'PBKDF2-SHA-256';
  migratedAt?: string;
}

// Convert ArrayBuffer to Hex string
function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Timing-safe constant-time string comparison
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Derive PBKDF2 key using Web Crypto API
async function derivePasswordHash(password: string, salt: Uint8Array, iterations = 100000): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    256 // 32 bytes (256 bits)
  );

  return bufToHex(derivedBits);
}

export const localAuth = {
  /**
   * Identifies this provider as a non-production development fallback.
   */
  isDemoFallback: true,

  // Get all users from localStorage
  getUsers: (): LocalUser[] => {
    const users = localStorage.getItem('blocktix_users');
    return users ? JSON.parse(users) : [];
  },

  // Save users to localStorage
  saveUsers: (users: LocalUser[]) => {
    localStorage.setItem('blocktix_users', JSON.stringify(users));
  },

  // Helper to read credential store
  getCredentialStore: (): Record<string, StoredCredential> => {
    try {
      return JSON.parse(localStorage.getItem('blocktix_auth_credentials') || '{}');
    } catch {
      return {};
    }
  },

  // Helper to save credential store
  saveCredentialStore: (store: Record<string, StoredCredential>) => {
    localStorage.setItem('blocktix_auth_credentials', JSON.stringify(store));
  },

  // Sign up a new user (with PBKDF2 derivation & unique random salt)
  signup: async (email: string, password: string, name: string, role: 'user' | 'organizer'): Promise<LocalUser> => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = localAuth.getUsers();
    
    // Check if user already exists
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Generate a 16-byte cryptographically secure random salt
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const saltHex = bufToHex(saltBytes.buffer);

    // Derive hash using PBKDF2-SHA-256 (100,000 rounds)
    const hashHex = await derivePasswordHash(password, saltBytes, 100000);

    // Save salted hash in credentials store (NEVER plaintext)
    const store = localAuth.getCredentialStore();
    store[normalizedEmail] = {
      saltHex,
      hashHex,
      iterations: 100000,
      algorithm: 'PBKDF2-SHA-256'
    };
    localAuth.saveCredentialStore(store);

    // Clean up legacy plaintext store entry if one existed for this email
    try {
      const legacy = JSON.parse(localStorage.getItem('blocktix_passwords') || '{}');
      if (legacy[email] || legacy[normalizedEmail]) {
        delete legacy[email];
        delete legacy[normalizedEmail];
        if (Object.keys(legacy).length === 0) {
          localStorage.removeItem('blocktix_passwords');
        } else {
          localStorage.setItem('blocktix_passwords', JSON.stringify(legacy));
        }
      }
    } catch { /* ignore cleanup error */ }

    // Create new user record
    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localAuth.saveUsers(users);

    return newUser;
  },

  // Login user (verifies PBKDF2 salted hash; migrates legacy plaintext accounts)
  login: async (email: string, password: string): Promise<LocalUser> => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = localAuth.getUsers();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const store = localAuth.getCredentialStore();
    const credential = store[normalizedEmail];

    if (credential && credential.algorithm === 'PBKDF2-SHA-256') {
      // Verify using PBKDF2
      const saltBytes = hexToBuf(credential.saltHex);
      const computedHash = await derivePasswordHash(password, saltBytes, credential.iterations || 100000);

      if (!constantTimeEquals(computedHash, credential.hashHex)) {
        throw new Error('Invalid email or password');
      }

      return user;
    }

    // --- Legacy Account Migration Path ---
    // If no PBKDF2 credential exists yet, check legacy plaintext store
    try {
      const legacy = JSON.parse(localStorage.getItem('blocktix_passwords') || '{}');
      const legacyPassword = legacy[email] ?? legacy[normalizedEmail];

      if (legacyPassword !== undefined && legacyPassword === password) {
        // Credentials matched! Migrate this account to PBKDF2 immediately.
        const saltBytes = new Uint8Array(16);
        crypto.getRandomValues(saltBytes);
        const saltHex = bufToHex(saltBytes.buffer);
        const hashHex = await derivePasswordHash(password, saltBytes, 100000);

        store[normalizedEmail] = {
          saltHex,
          hashHex,
          iterations: 100000,
          algorithm: 'PBKDF2-SHA-256',
          migratedAt: new Date().toISOString()
        };
        localAuth.saveCredentialStore(store);

        // Delete legacy plaintext password immediately
        delete legacy[email];
        delete legacy[normalizedEmail];
        if (Object.keys(legacy).length === 0) {
          localStorage.removeItem('blocktix_passwords');
        } else {
          localStorage.setItem('blocktix_passwords', JSON.stringify(legacy));
        }

        console.info(`[localAuth] Successfully migrated demo account ${normalizedEmail} to PBKDF2-SHA-256.`);
        return user;
      }
    } catch (e) {
      console.warn('[localAuth] Failed to check legacy passwords:', e);
    }

    throw new Error('Invalid email or password');
  },

  // Get current user
  getCurrentUser: (): LocalUser | null => {
    const currentUser = localStorage.getItem('blocktix_current_user');
    return currentUser ? JSON.parse(currentUser) : null;
  },

  // Set current user (login)
  setCurrentUser: (user: LocalUser) => {
    localStorage.setItem('blocktix_current_user', JSON.stringify(user));
  },

  // Logout
  logout: () => {
    localStorage.removeItem('blocktix_current_user');
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return localAuth.getCurrentUser() !== null;
  }
};

