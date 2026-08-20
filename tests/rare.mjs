// THE KILN — the rare tier, and the invisible floor. §8, §4.5.
// Run: node tests/rare.mjs
// The two things that matter: every landmark must be REACHABLE (dead content is
// worse than no content), and no landmark may be reachable by accident.
import { rareOf, allRares, luckBias, blankLuck, ensureLuck, scoreNight, tickLuck } from '../kiln/rare.js';
import { firePot } from '../kiln/pot.js';
import { RARES, LUCK, GLAZES, FORMS, POSITIONS, KILN_GODS } from '../kiln/data.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };

const G = Object.keys(GLAZES), F = Object.keys(FORMS), P = Object.keys(POSITIONS);

// A broad, deterministic sweep of the whole parameter space.
// ⚠️ GLAZE AND POSITION MUST BE ITERATED INDEPENDENTLY. The first version drew
// both from one counter — glaze at (i*7)%9 and position at (i*5)%9 — and those
// are CORRELATED mod 9: shino only ever landed on the flue shelf and ash only
// ever landed on the middle, so two perfectly reachable landmarks reported zero
// hits and looked impossible. Coprime strides fix one dimension; they do not
// make two dimensions independent of each other. Nest the loops.
function sweep() {
  const hits = {};
  for (const r of RARES) hits[r.id] = 0;
  let n = 0, plain = 0;
  for (let gi = 0; gi < G.length; gi++)
    for (let pi = 0; pi < P.length; pi++)
      for (let v = 0; v < 340; v++) {
        const i = ((gi * 97 + pi) * 340 + v);
        const p = firePot((i * 2654435761) >>> 0, {
          form:  F[v % F.length],
          glaze: G[gi],
          pos:   P[pi],
          heat:  0.55 + ((v * 11) % 70) / 100,
          red:   ((v * 13) % 130) / 100,
          cool:  ((v * 17) % 100) / 100,
          thick: ((v * 19) % 40) / 100,
        });
        n++;
        const r = rareOf(p, {});
        if (r) hits[r.id]++; else plain++;
      }
  return { hits, plain, n };
}

console.log('reachability — a landmark nobody can reach is dead content');
const S = sweep();
for (const r of RARES) {
  const pct = (S.hits[r.id] / S.n * 100).toFixed(2);
  ok(`${r.id} is reachable`, S.hits[r.id] > 0, `0 hits in ${S.n} pots — the conditions may be impossible`);
  if (S.hits[r.id] > 0) console.log(`       ${pct}% of the sweep`);
}
{
  const total = Object.values(S.hits).reduce((a, b) => a + b, 0);
  const rate = total / S.n;
  ok('landmarks are rare across the whole space', rate < 0.10, `${(rate*100).toFixed(1)}% of all pots`);
  ok('...but not vanishing', rate > 0.0008, `${(rate*100).toFixed(3)}%`);
}

// ---------------------------------------------------------------------------
console.log('\nearned, not lucky (§8)');
// ---------------------------------------------------------------------------
{
  // the same pot, judged twice, is the same landmark — no roll anywhere
  const p = firePot(12345, { form:'teabowl', glaze:'tenmoku', pos:'frontmid', heat:1.05, red:1.0, cool:0.1, thick:0.2 });
  ok('rareOf is deterministic', JSON.stringify(rareOf(p, {})) === JSON.stringify(rareOf(p, {})));
  ok('...and it consumes no randomness', rareOf.toString().indexOf('random') === -1);

  // a deliberately-built oxblood: copper red, hard reduction, cone 10 not 11, front
  let found = null;
  for (let i = 0; i < 400 && !found; i++) {
    const q = firePot(i, { form:'bottle', glaze:'copperred', pos:'frontmid', heat:1.05, red:1.15, cool:0.4, thick:0.1 });
    if (rareOf(q, {})?.id === 'oxblood') found = q;
  }
  ok('a player who works out the combination gets it ON PURPOSE', !!found);
  if (found) ok('...and overfiring past cone 10 loses it',
    rareOf({ ...found, heatwork: 1.35 }, {}) === null || rareOf({ ...found, heatwork: 1.35 }, {}).id !== 'oxblood');
  ok('...and a flipped copper is not oxblood',
    rareOf({ ...(found||{}), copperFlip: true }, {})?.id !== 'oxblood');
}
{
  ok('a plain pot is not a landmark',
     rareOf({ glazeKey:'clear', effGlaze:'clear', copperFlip:false, posKey:'middle',
              heatwork:0.8, reduction:0.2, coolRate:0.5, applied:0.4, events:[] }, {}) === null);
  ok('a malformed pot does not take the reveal down', rareOf(null, {}) === null);
  ok('...nor does a pot with no events array', (()=>{ try{ rareOf({glazeKey:'ash'},{}); return true; }catch(e){ return false; } })());
}

// ---------------------------------------------------------------------------
console.log('\nthe invisible floor and ceiling (§4.5)');
// ---------------------------------------------------------------------------
{
  ok('a fresh player gets no nudge at all', luckBias(blankLuck()) === 0);
  ok('one poor night is not enough to trigger it', luckBias({ dry: 1, rich: 0 }) === 0);
  ok('a run of poor nights starts helping', luckBias({ dry: LUCK.dryAfter, rich: 0 }) > 0);
  ok('...and it is bounded', luckBias({ dry: 99, rich: 0 }) <= LUCK.dryBias + 1e-9,
     `${luckBias({dry:99,rich:0})}`);
  ok('a remarkable night leans back the other way', luckBias({ dry: 0, rich: 2 }) < 0);
  ok('...and the ceiling beats the floor while it lasts', luckBias({ dry: 99, rich: 1 }) < 0);

  ok('a night with a landmark reads as remarkable',
     scoreNight({ reachedCone10:true, commissionMet:true, rares:1, broken:0, potCount:9 }) === 'rich');
  ok('a clean cone-10 night reads as good',
     scoreNight({ reachedCone10:true, commissionMet:true, rares:0, broken:0, potCount:9 }) === 'good');
  ok('missing cone 10 reads as poor',
     scoreNight({ reachedCone10:false, commissionMet:false, rares:0, broken:0, potCount:9 }) === 'poor');
  ok('breaking a third of the load reads as poor',
     scoreNight({ reachedCone10:true, commissionMet:true, rares:0, broken:3, potCount:9 }) === 'poor');

  let L = blankLuck();
  for (let i = 0; i < 3; i++) L = tickLuck(L, 'poor');
  ok('three poor nights accumulate', L.dry === 3 && luckBias(L) > 0);
  L = tickLuck(L, 'good');
  ok('one good night clears the drought', L.dry === 0 && luckBias(L) === 0);
  L = tickLuck(L, 'rich');
  ok('a remarkable night sets the ceiling', L.rich > 0 && luckBias(L) < 0);
  L = tickLuck(L, 'ok'); L = tickLuck(L, 'ok');
  ok('...and the ceiling wears off', luckBias(L) === 0, JSON.stringify(L));
  ok('old saves are repaired', ensureLuck(undefined).dry === 0 && ensureLuck({}).rich === 0);
}

// ---------------------------------------------------------------------------
console.log('\nthe kiln god does NOTHING (§19.10)');
// ---------------------------------------------------------------------------
{
  ok('there are kiln gods to make', KILN_GODS.length >= 3);
  ok('every one has a name and a line', KILN_GODS.every(k => k.id && k.name && k.line));
  // the invariant, enforced structurally: no kiln god carries a numeric field at all
  ok('NONE of them carries a number — it can never be a buff',
     KILN_GODS.every(k => Object.values(k).every(v => typeof v !== 'number')),
     JSON.stringify(KILN_GODS.filter(k => Object.values(k).some(v => typeof v === 'number'))));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
