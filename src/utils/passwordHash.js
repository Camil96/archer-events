export async function hashPasswordSha256(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Beveiligde hashing is niet beschikbaar in deze browser.");
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(password || "")));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPasswordWithHash(password, storedHash) {
  const cleanStoredHash = String(storedHash || "").trim();
  if (!cleanStoredHash) return false;
  if (cleanStoredHash === String(password || "")) return true; // Legacy plain-text fallback

  const hashed = await hashPasswordSha256(password);
  return hashed.toLowerCase() === cleanStoredHash.toLowerCase();
}
