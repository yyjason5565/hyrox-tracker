export interface LocalLock {
  salt: string;
  digest: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function digestPassword(password: string, salt: Uint8Array): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const combined = new Uint8Array(salt.length + encoded.length);
  combined.set(salt, 0);
  combined.set(encoded, salt.length);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return bytesToBase64(new Uint8Array(digest));
}

function sameText(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function createLocalLock(password: string): Promise<LocalLock> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: bytesToBase64(salt), digest: await digestPassword(password, salt) };
}

export async function localLockMatches(lock: LocalLock, password: string): Promise<boolean> {
  const digest = await digestPassword(password, base64ToBytes(lock.salt));
  return sameText(digest, lock.digest);
}

export const LOCAL_LOCK_NOTICE =
  "This is a local screen lock for this browser, not an account and not a security boundary. It does not encrypt the sessions. They stay readable in this device's saved site data and in any JSON backup. There is no server and no way to recover a forgotten passphrase.";
