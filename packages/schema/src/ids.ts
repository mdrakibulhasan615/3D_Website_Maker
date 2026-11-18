const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short random id like "n_k3j9x0q2ma". Uses the crypto API (available in browsers and Node). */
export function createId(prefix = "n"): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${id}`;
}
