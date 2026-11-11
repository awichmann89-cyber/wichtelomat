// Statistischer Test des Auslosungsalgorithmus (läuft ohne Datenbank).
import { drawAssignments } from '../lib/draw.ts';

const ids = (n) => Array.from({ length: n }, (_, i) => `p${i}`);
let fails = 0;
const check = (name, cond) => { if (!cond) { fails++; console.log('FAIL', name); } };

for (let n = 3; n <= 30; n++) {
  for (let k = 0; k < 200; k++) {
    const list = ids(n);
    const ex = n >= 6 ? [['p0', 'p1'], ['p2', 'p3'], ['p4', 'p5']] : [];
    const m = drawAssignments(list, ex, true);
    check(`n=${n} result`, !!m);
    if (!m) continue;
    const receivers = new Set(m.values());
    check(`n=${n} bijective`, m.size === n && receivers.size === n);
    for (const [g, r] of m) {
      check(`n=${n} self`, g !== r);
      check(`n=${n} mutual`, m.get(r) !== g);
      for (const [a, b] of ex) check(`n=${n} excl`, !((g === a && r === b) || (g === b && r === a)));
    }
  }
}
// unmöglich: 3 Personen, A darf weder B noch C
check('impossible', drawAssignments(['A', 'B', 'C'], [['A', 'B'], ['A', 'C']]) === null);
// knapp machbar: 4 Personen, zwei Paare ausgeschlossen
for (let k = 0; k < 500; k++) {
  const m = drawAssignments(['A', 'B', 'C', 'D'], [['A', 'B'], ['C', 'D']]);
  check('tight', m && m.get('A') !== 'B' && m.get('C') !== 'D' && m.get('B') !== 'A');
}
// Gleichverteilung grob: wen zieht p0 bei n=5?
const freq = {};
for (let k = 0; k < 20000; k++) { const r = drawAssignments(ids(5)).get('p0'); freq[r] = (freq[r] || 0) + 1; }
console.log('Verteilung p0 →', freq);
console.log(fails ? `${fails} Fehler` : 'Alle Auslosungs-Tests bestanden');
process.exit(fails ? 1 : 0);
