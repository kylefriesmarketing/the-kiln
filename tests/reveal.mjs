// THE KILN — the reveal. §9.
// Run: node tests/reveal.mjs
// Beats 1–3 are mostly presentation, but two things underneath them are real and
// both have already been wrong once: the colour-temperature bands, and the length
// of the cooling gate. A gate that elapses in eight seconds is not a gate.
import { GLOW, COOLING, FIRE } from '../kiln/data.js';
import { newFiring, step } from '../kiln/sim.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };
const bandAt = t => GLOW.find(b => t < b.max);

// ---------------------------------------------------------------------------
console.log('colour temperature — beat 2 (§9.2)');
// ---------------------------------------------------------------------------
{
  let mono = true, prev = -Infinity;
  for (const b of GLOW) { if (b.max <= prev) mono = false; prev = b.max; }
  ok('the bands are monotonic', mono);
  ok('...and cover every temperature a kiln reaches', bandAt(0) && bandAt(2600));
  ok('...with exactly one band per temperature',
     [0, 68, 400, 850, 1063, 1400, 1800, 2100, 2400].every(t => GLOW.filter(b => t < b.max)[0] === bandAt(t)));

  ok('a cold kiln shows no light at all', bandAt(FIRE.ambient).key === 'black' && bandAt(FIRE.ambient).lit === 0);
  ok('the safe-to-open threshold is dark', bandAt(FIRE.cool.targetOpenF).key === 'black',
     bandAt(FIRE.cool.targetOpenF).name);
  ok('a working kiln is not dark', bandAt(2200).lit > 0.8, bandAt(2200).name);
  ok('brightness rises with temperature',
     GLOW.every((b, i) => i === 0 || b.lit >= GLOW[i - 1].lit));
  // ⚠️ beat 2 gives colour and nothing else — no number may appear in the copy
  ok('no band leaks a temperature number into its line',
     GLOW.every(b => !/\d{3,}/.test(b.line + b.name)), GLOW.map(b => b.line).join(' | ').slice(0, 120));
}

// ---------------------------------------------------------------------------
console.log('\nthe room while it cools — beat 1');
// ---------------------------------------------------------------------------
{
  ok('a cooling line exists for every temperature',
     [68, 400, 700, 1100, 1500, 1900, 2400].every(t => COOLING.find(c => t < c.max)));
  ok('the lines are monotonic', COOLING.every((c, i) => i === 0 || c.max > COOLING[i - 1].max));
}

// ---------------------------------------------------------------------------
console.log('\nTHE COOLING GATE — beat 1, and the whole reason the reveal lands (§9.1)');
// ---------------------------------------------------------------------------
{
  // ⚠️ REGRESSION: the pump ran 9 sim-minutes per 80ms tick, so a full cool took
  // EIGHT SECONDS of real time. §18 asks for ~5 minutes, skippable to a floor.
  // The anticipation is the reward; there has to be something to sit through.
  const S = newFiring(17, []);
  S.temp = 2200; S.phase = 'cooling'; S.set.damper = 0; S.eff.damper = 0;
  let ticks = 0;
  while (S.temp > FIRE.cool.targetOpenF && ticks < 500000) { step(S, FIRE.cool.paceSimMin); ticks++; }
  const mins = ticks * 0.080 / 60;
  ok('a passive cool is a real wait, not a blink', mins > 1.2, `${mins.toFixed(1)} min`);
  ok('...and not a punishment either', mins < 6, `${mins.toFixed(1)} min`);
  ok('...and it does actually finish', S.temp <= FIRE.cool.targetOpenF, `${Math.round(S.temp)}°F`);

  // the door walks you down through the colours on the way
  const S2 = newFiring(17, []);
  S2.temp = 2200; S2.phase = 'cooling'; S2.set.damper = 0; S2.eff.damper = 0;
  const seen = []; let g = 0;
  while (S2.temp > FIRE.cool.targetOpenF && g++ < 500000) {
    const b = bandAt(S2.temp);
    if (!seen.length || seen[seen.length - 1] !== b.name) seen.push(b.name);
    step(S2, 2);
  }
  ok('the kiln passes through several visible colours on the way down', seen.length >= 5, seen.join(' → '));
  ok('...ending black', seen[seen.length - 1] === 'black', seen.join(' → '));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
