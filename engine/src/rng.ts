// mulberry32: tiny, fast, deterministic. The state is a single uint32 kept in GameState,
// so a game replays identically from its seed.

export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Mutable wrapper for code that draws several numbers in a row. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    const [value, state] = nextRandom(this.state);
    this.state = state;
    return value;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}
