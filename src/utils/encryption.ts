/**
 * Encryption utility for secure storage of API keys
 * Uses Web Crypto API with AES-GCM algorithm
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV (Initialization Vector)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import the password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hash the password for verification (not for encryption)
 */
export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return arrayBufferToBase64(hashBuffer);
}

/**
 * Encrypt a string using AES-GCM
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateIV();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a string using AES-GCM
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = base64ToArrayBuffer(ciphertext);
  const combinedArray = new Uint8Array(combined);

  // Extract IV and encrypted data
  const iv = combinedArray.slice(0, IV_LENGTH);
  const encryptedData = combinedArray.slice(IV_LENGTH);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if a string is encrypted (base64 encoded with proper length)
 */
export function isEncrypted(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const decoded = atob(value);
    // Encrypted data should be at least IV_LENGTH + some data
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}

// Encryption state management
let encryptionKey: CryptoKey | null = null;
let encryptionSalt: Uint8Array | null = null;

const SALT_STORAGE_KEY = 'encryption-salt';
const HASH_STORAGE_KEY = 'encryption-hash';

/**
 * Initialize encryption with a master password
 * Returns true if successful, false if password is incorrect
 */
export async function initializeEncryption(password: string): Promise<boolean> {
  const storedSaltBase64 = localStorage.getItem(SALT_STORAGE_KEY);
  const storedHash = localStorage.getItem(HASH_STORAGE_KEY);

  if (storedSaltBase64 && storedHash) {
    // Existing setup - verify password
    const salt = new Uint8Array(base64ToArrayBuffer(storedSaltBase64));
    const hash = await hashPassword(password, salt);

    if (hash !== storedHash) {
      return false; // Wrong password
    }

    encryptionSalt = salt;
    encryptionKey = await deriveKeyFromPassword(password, salt);
    return true;
  } else {
    // First time setup
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    localStorage.setItem(SALT_STORAGE_KEY, arrayBufferToBase64(salt.buffer));
    localStorage.setItem(HASH_STORAGE_KEY, hash);

    encryptionSalt = salt;
    encryptionKey = await deriveKeyFromPassword(password, salt);
    return true;
  }
}

/**
 * Check if encryption is initialized
 */
export function isEncryptionInitialized(): boolean {
  return encryptionKey !== null;
}

/**
 * Check if master password is set up
 */
export function isMasterPasswordSet(): boolean {
  return localStorage.getItem(SALT_STORAGE_KEY) !== null;
}

/**
 * Encrypt sensitive data (API key, secret, password)
 */
export async function encryptSensitiveData(data: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized. Please set up master password first.');
  }
  return encrypt(data, encryptionKey);
}

/**
 * Decrypt sensitive data
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized. Please unlock with master password first.');
  }
  return decrypt(encryptedData, encryptionKey);
}

/**
 * Lock encryption (clear key from memory)
 */
export function lockEncryption(): void {
  encryptionKey = null;
}

/**
 * Change master password
 */
export async function changeMasterPassword(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  // Verify old password first
  const storedSaltBase64 = localStorage.getItem(SALT_STORAGE_KEY);
  const storedHash = localStorage.getItem(HASH_STORAGE_KEY);

  if (!storedSaltBase64 || !storedHash) {
    return false;
  }

  const oldSalt = new Uint8Array(base64ToArrayBuffer(storedSaltBase64));
  const oldHash = await hashPassword(oldPassword, oldSalt);

  if (oldHash !== storedHash) {
    return false; // Wrong old password
  }

  // Generate new salt and hash
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  // Update stored values
  localStorage.setItem(SALT_STORAGE_KEY, arrayBufferToBase64(newSalt.buffer));
  localStorage.setItem(HASH_STORAGE_KEY, newHash);

  // Update encryption key
  encryptionSalt = newSalt;
  encryptionKey = await deriveKeyFromPassword(newPassword, newSalt);

  return true;
}

/**
 * Reset encryption (clears all encrypted data references)
 * WARNING: This will make all stored encrypted data unrecoverable
 */
export function resetEncryption(): void {
  localStorage.removeItem(SALT_STORAGE_KEY);
  localStorage.removeItem(HASH_STORAGE_KEY);
  encryptionKey = null;
  encryptionSalt = null;
}
