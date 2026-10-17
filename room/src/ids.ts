import { randomBytes, randomInt } from 'node:crypto';

// Consonants only: no accidental words on a projector, and no I/L/O to confuse with 1 and 0.
const CODE_ALPHABET = 'BCDFGHJKMNPQRSTVWXZ';

export function roomCode(): string {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

export const newId = () => randomBytes(9).toString('base64url');
export const newToken = () => randomBytes(18).toString('base64url');
export const newSeed = () => randomInt(2 ** 31);

/** Fixed-window counter per key, e.g. requests per IP per minute. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly max: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size > 10_000) this.sweep(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    return ++entry.count <= this.max;
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
