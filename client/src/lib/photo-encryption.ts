/**
 * Client-side photo encryption/decryption using Web Crypto API (AES-256-GCM).
 * Photos are encrypted before upload to Supabase Storage so they are
 * unreadable at rest — only someone with the per-request key can view them.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptPhoto(
  blob: Blob
): Promise<{ encryptedBlob: Blob; key: string; iv: string }> {
  // Generate a random AES-256-GCM key
  const cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export it
    ['encrypt', 'decrypt']
  );

  // Generate a random 12-byte IV (recommended size for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Read the photo blob as an ArrayBuffer
  const plaintext = await blob.arrayBuffer();

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext
  );

  // Export the key as raw bytes → base64
  const rawKey = await crypto.subtle.exportKey('raw', cryptoKey);

  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    key: arrayBufferToBase64(rawKey),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptPhoto(
  encryptedBlob: Blob,
  keyBase64: string,
  ivBase64: string
): Promise<Blob> {
  // Import the key from base64
  const rawKey = base64ToArrayBuffer(keyBase64);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode IV
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  // Decrypt
  const ciphertext = await encryptedBlob.arrayBuffer();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new Blob([plaintext], { type: 'image/jpeg' });
}
