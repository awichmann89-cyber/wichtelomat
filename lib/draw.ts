import { randomInt } from 'node:crypto';

export type Pair = readonly [string, string];
export type Rand = (n: number) => number;

/**
 * Lost aus, wer wen beschenkt.
 * 1. Bevorzugt einen einzigen großen Kreis (A→B→C→…→A): keine Pärchen-Tausche, schöne „Wichtelkette“.
 * 2. Klappt das wegen vieler Ausschlüsse nicht, sucht ein Backtracking eine gültige Zuordnung.
 * Ausschlüsse gelten immer in beide Richtungen.
 */
export function drawAssignments(
  ids: readonly string[],
  exclusions: readonly Pair[] = [],
  avoidMutual = true,
  rand: Rand = (n) => randomInt(n),
): Map<string, string> | null {
  const n = ids.length;
  if (n < 2 || new Set(ids).size !== n) return null;

  const forbidden = new Set<string>();
  for (const [a, b] of exclusions) {
    forbidden.add(`${a}>${b}`);
    forbidden.add(`${b}>${a}`);
  }
  const ok = (g: string, r: string) => g !== r && !forbidden.has(`${g}>${r}`);

  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 1) Zufälliger Hamilton-Kreis
  for (let attempt = 0; attempt < 3000; attempt++) {
    const p = shuffle(ids);
    let valid = true;
    for (let i = 0; i < n && valid; i++) valid = ok(p[i], p[(i + 1) % n]);
    if (valid && !(avoidMutual && n === 2)) {
      return new Map(p.map((g, i) => [g, p[(i + 1) % n]]));
    }
  }

  // 2) Backtracking (erlaubt mehrere Kreise)
  const backtrack = (noMutual: boolean): Map<string, string> | null => {
    const cand = new Map(ids.map((g) => [g, ids.filter((r) => ok(g, r))]));
    if ([...cand.values()].some((c) => c.length === 0)) return null;
    const order = shuffle(ids).sort((a, b) => cand.get(a)!.length - cand.get(b)!.length);
    const assign = new Map<string, string>();
    const used = new Set<string>();
    let steps = 0;
    const rec = (i: number): boolean => {
      if (i === order.length) return true;
      if (++steps > 250_000) return false;
      const g = order[i];
      for (const r of shuffle(cand.get(g)!)) {
        if (used.has(r)) continue;
        if (noMutual && assign.get(r) === g) continue;
        assign.set(g, r);
        used.add(r);
        if (rec(i + 1)) return true;
        assign.delete(g);
        used.delete(r);
      }
      return false;
    };
    return rec(0) ? assign : null;
  };

  return backtrack(avoidMutual) ?? (avoidMutual ? backtrack(false) : null);
}

/** Zerlegt die Zuordnung in Ketten für die Auflösung (A → B → C → A). */
export function chains(assign: Map<string, string>): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of assign.keys()) {
    if (seen.has(start)) continue;
    const chain: string[] = [];
    let cur: string | undefined = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      chain.push(cur);
      cur = assign.get(cur);
    }
    out.push(chain);
  }
  return out;
}
