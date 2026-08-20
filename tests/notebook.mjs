// THE KILN — the notebook, judged against ground truth. §10, §4.5.
// Run: node tests/notebook.mjs
// The mechanism only works if it is silent, if it resets on a mistake, and if the
// answer key is the same state the player is looking at. All three are asserted.
import { truthOf, logReading, blankNotebook, ensure, isConfirmed, confirmedCount,
         refirable, RUN_NEEDED } from '../kiln/notebook.js';
import { INSTRUMENTS, FIRE } from '../kiln/data.js';
import { soakRun, newFiring } from '../kiln/sim.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };

const S = soakRun(17).S;

// ---------------------------------------------------------------------------
console.log('the answer key — read off the same state the player sees');
// ---------------------------------------------------------------------------
{
  ok('every instrument answers with one of its own options',
     Object.keys(INSTRUMENTS).every(k => INSTRUMENTS[k].opts.some(o => o.k === truthOf(k, S))),
     JSON.stringify(Object.keys(INSTRUMENTS).map(k => k + '=' + truthOf(k, S))));

  const ox = { ...S, atm: -0.4 }, neu = { ...S, atm: 0.2 }, red = { ...S, atm: 0.6 }, heavy = { ...S, atm: 1.1 };
  ok('the flame reads oxidising when the mix is lean',  truthOf('flame', ox) === 'ox');
  ok('...neutral in the middle',                        truthOf('flame', neu) === 'neutral');
  ok('...reducing when it is rich',                     truthOf('flame', red) === 'red');
  ok('...over-reduced when it is smoking',              truthOf('flame', heavy) === 'heavy');

  ok('the climb reads falling below zero',   truthOf('climb', { ...S, rate: -80 }) === 'falling');
  ok('...holding when flat',                 truthOf('climb', { ...S, rate: 10 }) === 'holding');
  ok('...climbing at the working rate',      truthOf('climb', { ...S, rate: 150 }) === 'steady');
  ok('...climbing hard when it is running',  truthOf('climb', { ...S, rate: 400 }) === 'hard');

  ok('the cones read nothing down at the start',  truthOf('cones', { ...S, hw: 0 }) === 'none');
  ok('...the low pack in reduction country',      truthOf('cones', { ...S, hw: FIRE.cones['010'] }) === 'low');
  ok('...past cone 10 when the work is done',     truthOf('cones', { ...S, hw: FIRE.cones['10'] + 1 }) === 'past');
}

// ---------------------------------------------------------------------------
console.log('\nconfirm-in-threes (§10)');
// ---------------------------------------------------------------------------
{
  let nb = blankNotebook();
  const right = truthOf('flame', S);
  let r;
  for (let i = 0; i < RUN_NEEDED - 1; i++) {
    r = logReading(nb, 'flame', right, S, 1); nb = r.state;
    ok(`reading ${i + 1} of ${RUN_NEEDED} says nothing`, r.silent && !r.justConfirmed);
  }
  r = logReading(nb, 'flame', right, S, 1); nb = r.state;
  ok('the third correct reading confirms the whole instrument at once', r.justConfirmed);
  ok('...and the page is open from then on', isConfirmed(nb, 'flame'));
  ok('...and nothing else was confirmed with it', confirmedCount(nb) === 1);
}
{
  // the anti-brute-force property: a wrong reading resets the run
  let nb = blankNotebook();
  const right = truthOf('climb', S);
  const wrong = INSTRUMENTS.climb.opts.map(o => o.k).find(k => k !== right);
  let r = logReading(nb, 'climb', right, S); nb = r.state;
  r = logReading(nb, 'climb', right, S); nb = r.state;
  ok('two correct leaves you one away', r.remaining === 1);
  r = logReading(nb, 'climb', wrong, S); nb = r.state;
  ok('one wrong reading resets the run to zero', r.remaining === RUN_NEEDED);
  ok('...and the instrument is still not confirmed', !isConfirmed(nb, 'climb'));
  r = logReading(nb, 'climb', right, S); nb = r.state;
  r = logReading(nb, 'climb', right, S); nb = r.state;
  ok('...so you must be right three times RUNNING, not three times total', !isConfirmed(nb, 'climb'));
  r = logReading(nb, 'climb', right, S); nb = r.state;
  ok('...and then it confirms', r.justConfirmed);
}
{
  // ⚠️ the mechanism dies the moment a single reading leaks its correctness
  const nb = blankNotebook();
  const right = truthOf('cones', S);
  const wrong = INSTRUMENTS.cones.opts.map(o => o.k).find(k => k !== right);
  const a = logReading(blankNotebook(), 'cones', right, S);
  const b = logReading(blankNotebook(), 'cones', wrong, S);
  ok('a correct reading and a wrong one are indistinguishable to the caller',
     a.silent === b.silent && a.justConfirmed === b.justConfirmed && !('correct' in a) && !('correct' in b),
     JSON.stringify({ a, b }));
  ok('...and neither returns a correctness field at all', !('correct' in a) && !('right' in a));
  void nb;
}
{
  let nb = blankNotebook();
  const right = truthOf('flame', S);
  for (let i = 0; i < 3; i++) nb = logReading(nb, 'flame', right, S).state;
  const after = logReading(nb, 'flame', right, S);
  ok('logging a confirmed instrument again is a no-op', after.alreadyKnown === true && !after.justConfirmed);
}
{
  const restored = ensure(JSON.parse(JSON.stringify(blankNotebook())));
  ok('the notebook round-trips through JSON', Object.keys(restored.inst).length === Object.keys(INSTRUMENTS).length);
  ok('an empty save from an older version is repaired, not crashed', ensure({}).inst.flame.run === 0);
  ok('...and ensure() never throws on undefined', ensure(undefined).inst.cones.done === false);
}

// ---------------------------------------------------------------------------
console.log('\nthe refire — §4.5\'s lever');
// ---------------------------------------------------------------------------
{
  const P = o => ({ mine: true, sound: true, form: 'mug', glaze: 'shino', pos: 'middle', events: [], ...o });
  const cold = { ...S, hw: FIRE.cones['9'] };                      // short of cone 10
  const r = refirable([P(), P({ mine: false }), P({ sound: false })], cold);
  ok('an underfired pot of yours can go back in', r.length === 1 && r[0].why === 'underfired');
  ok('...but not a cracked one — you cannot un-dunt a pot', !r.some(p => p.sound === false));
  ok('...and not somebody else\'s work', !r.some(p => p.mine === false));

  const dull = { ...S, hw: FIRE.cones['10'] + 5, flags: { ...S.flags, missedReduction: true } };
  ok('a firing that missed the door offers its pots back as dull',
     refirable([P()], dull)[0]?.why === 'dull');

  const dry = { ...S, hw: FIRE.cones['10'] + 5, flags: { ...S.flags, missedReduction: false },
                win: { ...S.win, score: { soak: { pct: 0.1 } } } };
  ok('a firing with no soak offers them back as dry', refirable([P()], dry)[0]?.why === 'dry');

  const good = { ...S, hw: FIRE.cones['10'] + 5, flags: { ...S.flags, missedReduction: false },
                 win: { ...S.win, score: { soak: { pct: 0.9 } } } };
  ok('a firing that did everything right offers nothing back', refirable([P()], good).length === 0);
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
