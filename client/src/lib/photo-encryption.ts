/**
 * @file photo-encryption.ts
 * @description Client-side photo encryption/decryption using Web Crypto API (AES-256-GCM).
 * 
 * ============================================================================
 * SECURITY AUDIT FINDING & ARCHITECTURE NOTICE (PHASE 1):
 * ============================================================================
 * Current Mechanism:
 * Attendee photos are encrypted on the client using AES-256-GCM before upload to
 * Supabase Storage ('enrollment-photos' bucket).
 * 
 * Architectural Vulnerability (Task 3 Remediation Analysis):
 * Currently, the raw symmetric AES encryption key and IV are stored in plaintext
 * database columns (`photo_encryption_key` and `photo_encryption_iv` in `enrollment_requests`
 * and `ticket_emails`). If Supabase Row-Level Security (RLS) is misconfigured or permits
 * public reads, any caller who reads the ticket or request row also acquires the key,
 * nullifying the encryption benefit.
 * 
 * Why this CANNOT be solved by a frontend-only change:
 * A client cannot securely hide a symmetric key from a database if the client must also
 * transmit that key to another client (the event organizer) without either:
 *   1. An asymmetric public/private key infrastructure (ECE/RSA key wrapping), OR
 *   2. A trusted backend service (Supabase Vault / Edge Function) that enforces access controls
 *      and never exposes the raw key to unauthorized frontend queries.
 * 
 * Required Phase 2 Remediation Architecture:
 * 1. Hybrid Asymmetric Key Wrapping:
 *    - Event organizers publish an ECDH or RSA public key in their `user_profiles`.
 *    - Attendees encrypt their photo with an ephemeral AES-256 session key.
 *    - Attendees encrypt the AES key with the organizer's public key (`organizer_wrapped_key`)
 *      and with their own public key (`attendee_wrapped_key`).
 *    - Supabase stores only ciphertext and wrapped keys; raw symmetric keys are never written to DB.
 * 2. Database Column Protection:
 *    - Deprecate public read access to `photo_encryption_key`.
 *    - Transition to Supabase Edge Functions with authenticated JWT verification for photo access.
 * 
 * Backwards Compatibility Guarantee (Phase 1):
 * The defensive routines below maintain 100% compatibility with currently stored demo
 * records while adding strict input sanitization and integrity error handling.
 * ============================================================================
 */

function isBase64(str: string): boolean {
  if (!str || typeof str !== 'string' || str.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (!isBase64(base64.trim())) {
    throw new Error('Invalid base64 encoding provided to photo encryption routine.');
  }
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a photo blob using AES-256-GCM.
 * Generates an ephemeral 256-bit symmetric key and 12-byte random IV.
 */
export async function encryptPhoto(
  blob: Blob
): Promise<{ encryptedBlob: Blob; key: string; iv: string }> {
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Invalid photo blob provided for encryption.');
  }

  // Generate a cryptographically secure random AES-256-GCM key
  const cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );

  // 12-byte IV is the standard recommended length for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Read the photo blob as an ArrayBuffer
  const plaintext = await blob.arrayBuffer();

  // Encrypt with authenticated tag
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext
  );

  // Export raw key bytes and encode as base64
  const rawKey = await crypto.subtle.exportKey('raw', cryptoKey);

  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    key: arrayBufferToBase64(rawKey),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt an AES-256-GCM encrypted photo blob.
 * Validates key and IV integrity before attempting decryption.
 */
export async function decryptPhoto(
  encryptedBlob: Blob,
  keyBase64: string,
  ivBase64: string
): Promise<Blob> {
  if (!encryptedBlob || !(encryptedBlob instanceof Blob)) {
    throw new Error('Invalid encrypted photo blob provided.');
  }

  if (!keyBase64 || typeof keyBase64 !== 'string') {
    throw new Error('Decryption aborted: Missing photo encryption key.');
  }

  if (!ivBase64 || typeof ivBase64 !== 'string') {
    throw new Error('Decryption aborted: Missing photo encryption initialization vector (IV).');
  }

  // Import raw key bytes
  let rawKey: ArrayBuffer;
  try {
    rawKey = base64ToArrayBuffer(keyBase64);
  } catch (err: any) {
    throw new Error(`Corrupted encryption key format: ${err.message}`);
  }

  // Verify key length (AES-256 requires exactly 32 bytes)
  if (rawKey.byteLength !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes (256 bits), got ${rawKey.byteLength} bytes.`);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode IV
  let iv: Uint8Array;
  try {
    iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  } catch (err: any) {
    throw new Error(`Corrupted encryption IV format: ${err.message}`);
  }

  if (iv.byteLength < 12) {
    throw new Error(`Invalid IV length: expected >= 12 bytes for AES-GCM, got ${iv.byteLength} bytes.`);
  }

  // Decrypt and verify authentication tag
  try {
    const ciphertext = await encryptedBlob.arrayBuffer();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    return new Blob([plaintext], { type: 'image/jpeg' });
  } catch (err: any) {
    throw new Error('Photo decryption failed: Authentication tag mismatch or corrupted ciphertext.');
  }
}

