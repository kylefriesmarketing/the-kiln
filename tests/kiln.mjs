// THE KILN — the machine's own history. §5.5, §6.4.
// Run: node tests/kiln.mjs
// The whole point of wear is that it is something you CAUSED, that you can READ
// before you commit, and that does not secretly reroll the firing. All three are
// asserted here, and determinism is asserted hardest.
import { blankKiln, ensureKiln, shelfMods, drawShift, canTake, wearFrom,
         repairShelf, describeShelf, kilnSummary, drawTrial } from '../kiln/kiln.js';
import { newFiring, step, setControl, soakRun } from '../kiln/sim.js';
import { WEAR, FIRE, POSITIONS } from '../kiln/data.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };

// drive a firing to completion with a given kiln, and fingerprint the result
function fire(seed, kiln) {
  const wear = kiln ? { posMod: shelfMods(kiln), flue: drawShift(kiln) } : null;
  const S = newFiring(seed, [], wear);
  const TGT = [{gas:2,damper:9},{gas:8,atm:-0.15},{gas:10,atm:0.60},{gas:11,atm:-0.05},
               {gas:12,atm:0.45},{gas:12,atm:0.12},{gas:10,atm:0.15},{gas:6,atm:-0.25}];
  let g = 0;
  while (S.phase === 'firing' && g++ < 4000) {
    const t = TGT[Math.min(S.win.i, 7)];
    setControl(S, 'gas', t.gas);
    if (t.damper !== undefined) setControl(S, 'damper', t.damper);
    else { const e = t.atm - S.atm;
      if (Math.abs(e) > 0.06) setControl(S, 'damper', S.set.damper - Math.sign(e) * Math.max(1, Math.round(Math.abs(e) * 5))); }
    step(S); if (S.t > 1020) break;
  }
  return S;
}
const fp = S => `${S.hw.toFixed(4)}|${S.t}|${S.fuel.toFixed(3)}|${Object.values(S.pos).map(p=>p.hw.toFixed(2)).join(',')}`;

// ---------------------------------------------------------------------------
console.log('determinism — wear is an INPUT, never a die roll (§19.1)');
// ---------------------------------------------------------------------------
{
  const clean = blankKiln();
  ok('same seed + same clean kiln = identical firing', fp(fire(11, clean)) === fp(fire(11, clean)));

  const worn = blankKiln();
  worn.shelves.flamelane.glaze = 3; worn.flue = -0.10;
  ok('same seed + same WORN kiln = identical firing', fp(fire(11, worn)) === fp(fire(11, worn)));
  ok('...and a worn kiln fires DIFFERENTLY from a clean one', fp(fire(11, worn)) !== fp(fire(11, clean)));
  ok('no-wear and a blank kiln are the same thing', fp(fire(11, null)) === fp(fire(11, clean)));
}

// ---------------------------------------------------------------------------
console.log('\nwhat the wear does');
// ---------------------------------------------------------------------------
{
  const clean = blankKiln(), glazed = blankKiln();
  glazed.shelves.coolbottom.glaze = 4;
  const a = fire(31, clean), b = fire(31, glazed);
  ok('a glazed shelf really does run hotter', b.pos.coolbottom.hw > a.pos.coolbottom.hw,
     `${a.pos.coolbottom.hw.toFixed(1)} → ${b.pos.coolbottom.hw.toFixed(1)}`);
  ok('...and the shelves you did not glaze are untouched',
     Math.abs(b.pos.fronttop.hw - a.pos.fronttop.hw) < 1e-6);

  const sooty = blankKiln(); sooty.flue = WEAR.flueFloor;
  const c = fire(31, sooty);
  ok('a sooty flue changes the firing', Math.abs(c.hw - a.hw) > 1e-6, `${a.hw.toFixed(1)} vs ${c.hw.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
console.log('\nwear is CAUSED, and it accumulates');
// ---------------------------------------------------------------------------
{
  const S = soakRun(11).S;
  const pots = [{ pos:'flamelane', events:[{k:'run'}] }, { pos:'middle', events:[{k:'break'}] }];
  const K = wearFrom(blankKiln(), pots, S);
  ok('a run glazes the shelf it ran on', K.shelves.flamelane.glaze === WEAR.glazePerRun);
  ok('...and only that shelf', K.shelves.middle.glaze === 0);
  ok('the kiln counts its firings', K.fires === 1);

  let K2 = blankKiln();
  for (let i = 0; i < 8; i++) K2 = wearFrom(K2, pots, S);
  ok('glaze accumulates but is capped', K2.shelves.flamelane.glaze === WEAR.glazeMax);
  ok('shelves that fire hard warp, and warp is capped', K2.shelves.flamelane.warp <= WEAR.warpMax);

  const hard = { ...S, redHeld: WEAR.flueHardRedMin + 50 };
  const K3 = wearFrom(blankKiln(), [], hard);
  ok('a hard reduction soots the flue', K3.flue < 0, `${K3.flue}`);
  const K4 = wearFrom(K3, [], { ...S, redHeld: 0 });
  ok('...and the flue forgets it over the next firings', K4.flue > K3.flue && K4.flue <= 0,
     `${K3.flue} → ${K4.flue}`);
}

// ---------------------------------------------------------------------------
console.log('\nwear is READABLE before you commit (§19.5 — never a hidden variable)');
// ---------------------------------------------------------------------------
{
  const K = blankKiln();
  ok('a clean shelf says nothing', describeShelf(K, 'middle') === '');
  K.shelves.middle.glaze = 3;
  ok('a glazed shelf says so, in words', /glazed over/.test(describeShelf(K, 'middle')), describeShelf(K,'middle'));
  K.shelves.middle.warp = WEAR.warpBlocksTall;
  ok('a warped shelf says so too', /warped/.test(describeShelf(K, 'middle')));
  ok('...and it actually refuses a tall piece', !canTake(K, 'middle', 'bottle'));
  ok('...while still taking a low one', canTake(K, 'middle', 'teabowl'));
  ok('every position is describable', Object.keys(POSITIONS).every(p => typeof describeShelf(K, p) === 'string'));
  ok('the kiln can summarise itself', /glazed/.test(kilnSummary(K)), kilnSummary(K));

  const fixed = repairShelf(K, 'middle');
  ok('a shelf can be replaced', fixed.shelves.middle.warp === 0 && fixed.shelves.middle.glaze === 0);
  ok('...and it remembers how many firings it has seen', fixed.shelves.middle.fires === K.shelves.middle.fires);
}

// ---------------------------------------------------------------------------
console.log('\nthe draw trial — §6.4, buying certainty');
// ---------------------------------------------------------------------------
{
  const K = blankKiln();
  const S = newFiring(47, [], { posMod: shelfMods(K), flue: drawShift(K) });
  const a = drawTrial(S, K), b = drawTrial(S, K);
  ok('the trial is deterministic — it reveals, it does not roll', JSON.stringify(a) === JSON.stringify(b));
  ok('...it predicts a climb rate in real degrees', Number.isFinite(a.rateAt8) && a.rateAt8 > 0, `${a.rateAt8}`);
  ok('...and says it in a sentence', a.line.length > 30 && !/NaN|undefined/.test(a.line), a.line);

  const sooty = blankKiln(); sooty.flue = WEAR.flueFloor;
  const c = drawTrial(newFiring(47, [], { posMod: shelfMods(sooty), flue: drawShift(sooty) }), sooty);
  ok('a sooty flue shows up in the trial', c.draw !== a.draw, `${a.draw} vs ${c.draw}`);
}

// ---------------------------------------------------------------------------
console.log('\nold saves');
// ---------------------------------------------------------------------------
{
  ok('a pre-M4 save is repaired, not crashed', ensureKiln({ scars: 0 }).shelves.middle.warp === 0);
  ok('undefined is repaired too', ensureKiln(undefined).fires === 0);
  ok('and it round-trips through JSON', ensureKiln(JSON.parse(JSON.stringify(blankKiln()))).shelves.flueshelf.glaze === 0);
}

// ---------------------------------------------------------------------------
// ⚠️ THE WARP RATE, PINNED. Regression: the threshold was 0.94 × cone 10, which
// 71% of shelves cross in any decent firing — so EVERY shelf warped EVERY night
// and within three firings the kiln refused all tall work. Warping is meant to
// punish genuine overfiring, not ordinary competence.
// ---------------------------------------------------------------------------
{
  const seeds = [11, 17, 23, 31, 47, 101, 202, 303, 404, 505];
  let shelves = 0, warped = 0;
  for (const s of seeds) {
    const S = soakRun(s).S;
    const K = wearFrom(blankKiln(), [], S);
    for (const sh of Object.values(K.shelves)) { shelves++; if (sh.warp) warped++; }
  }
  const rate = warped / shelves;
  ok('a shelf warping is uncommon, not routine', rate < 0.25, `${(rate*100).toFixed(0)}% of shelves per firing`);
  ok('...but it does happen — overfiring has to cost something', rate > 0.02, `${(rate*100).toFixed(0)}%`);
  // and the kiln must still be usable after a long career
  let K = blankKiln();
  for (const s of [...seeds, ...seeds]) K = wearFrom(K, [], soakRun(s).S);
  const dead = Object.values(K.shelves).filter(sh => sh.warp >= WEAR.warpBlocksTall).length;
  ok('after 20 firings the kiln is worn, not unusable', dead < Object.keys(POSITIONS).length,
     `${dead} of ${Object.keys(POSITIONS).length} shelves refuse tall work`);
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
