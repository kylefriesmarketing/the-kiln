// THE KILN — the verdict, judged against ground truth. §4.4, §4.5, §12.3.
// Run: node tests/verdict.mjs
// These are not smoke tests. Each one asserts the SPECIFIC sentence the player is
// shown, because "the failure names the position and the cause" is the whole
// contract of §4.4 and a green check that does not read the text proves nothing.
import { judge, counterfactuals, settle, offerCommissions, candidatesFor } from '../kiln/verdict.js';
import { COMMISSIONS, FIRE, ECON } from '../kiln/data.js';
import { newFiring, step, setControl, soakRun } from '../kiln/sim.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { console.log(`  ok   ${name}`); pass++; }
  else { console.log(`  FAIL ${name}${extra ? '\n       ' + extra : ''}`); fail++; }
};
const com = id => COMMISSIONS.find(c => c.id === id);

// a pot as the reveal hands it to the verdict
const P = (o = {}) => ({ mine: true, form: 'widebowl', glaze: 'tenmoku', effGlaze: 'tenmoku',
  copperFlip: false, pos: 'middle', events: [], sound: true, owner: 'you', ...o,
  events: (o.events || []).map(k => (typeof k === 'string' ? { k, zone: 'belly', i: 0.8 } : k)) });

// a finished firing, steered properly, so the sim numbers are real
function goodFiring() {
  const r = soakRun(17);   // reaches cone 10 and does NOT overfire to 11
  return r.S || r;
}
const GOOD = goodFiring();
ok('harness — a steered firing reaches cone 10', GOOD.hw >= FIRE.cones['10'], `hw=${GOOD.hw?.toFixed(0)}`);

// ---------------------------------------------------------------------------
console.log('\njudge — clause by clause (§4.4)');
// ---------------------------------------------------------------------------
{
  const c = com('okonkwo_bowls');   // 2 widebowl tenmoku, cone 10, break, no crawl, sound
  const good = [P({ events: ['break'] }), P({ events: ['break'] }), P({ mine: false, owner: 'hoa' })];
  const v = judge(c, good, GOOD);
  ok('a brief fully met passes every clause', v.passed, v.failed.map(f => f.text).join(' | '));
  ok('someone else\'s pot is not a candidate for your brief', v.cand.length === 2);
  ok('no clause carries a score, only pass/fail',
     v.clauses.every(cl => typeof cl.pass === 'boolean' && !/\d+\/\d+|score|quality|stars?\b/i.test(cl.text)));
}
{
  const c = com('okonkwo_bowls');
  const v = judge(c, [P({ events: ['break', 'crawl'], pos: 'coolbottom' }), P({ events: ['break'] })], GOOD);
  const crawl = v.clauses.find(cl => cl.text.includes('crawl'));
  ok('a crawl fails its clause', crawl && !crawl.pass);
  ok('...and the failure names the POSITION', crawl && /cool bottom/.test(crawl.why), crawl?.why);
  ok('...and the failure names the CAUSE', crawl && /thick glaze/.test(crawl.why), crawl?.why);
}
{
  const c = com('okonkwo_bowls');
  const v = judge(c, [P({ events: ['break'] })], GOOD);          // only one, brief wants two
  ok('too few pieces fails the count clause', !v.passed);
  ok('...and madeThem is false so no full fee is owed', v.madeThem === false);
  const cnt = v.clauses[0];
  ok('...and it says how many you actually fired', /you fired 1\./.test(cnt.why), cnt.why);
}
{
  const c = com('marg_copper');    // one bottle, copper red, must not flip
  const flip = judge(c, [P({ form: 'bottle', glaze: 'copperred', effGlaze: 'oribe', copperFlip: true })], GOOD);
  const cl = flip.clauses.find(x => x.text.includes('colour'));
  ok('a copper flip fails the colour clause', cl && !cl.pass);
  ok('...and explains the chemistry, not a dice roll',
     cl && /red in reduction and green in oxidation/.test(cl.why), cl?.why);
}
{
  const c = com('hollis_set');     // three mugs, same glaze
  const mixed = judge(c, [P({ form: 'mug', effGlaze: 'shino' }), P({ form: 'mug', effGlaze: 'ash' }), P({ form: 'mug', effGlaze: 'shino' })], GOOD);
  const cl = mixed.clauses.find(x => x.text.includes('same glaze'));
  ok('three mugs in two glazes fails "all the same glaze"', cl && !cl.pass);
  ok('...and names what they actually came out as', cl && /shino/.test(cl.why) && /ash/.test(cl.why), cl?.why);
}
{
  // a cracked piece, and the cause must be the player's own decision
  const hot = { ...GOOD, opened: true, openTemp: 720 };
  const c = com('walt_plate');
  const v = judge(c, [P({ form: 'plate', sound: false, events: ['dunt'], pos: 'flueshelf' })], hot);
  const cl = v.clauses.find(x => x.text.includes('sound'));
  ok('a dunted piece fails "sound"', cl && !cl.pass);
  const d = v.clauses.find(x => x.text.includes('dunt'));
  ok('...and opening hot is named as the cause, with the temperature',
     d && /opened at 720°/.test(d.why), d?.why);
}
{
  // the one-way door propagates into the brief, not just the log
  const missed = { ...GOOD, flags: { ...GOOD.flags, missedReduction: true }, redHeld: 0 };
  const v = judge(com('teashop_celadon'), [P({ form: 'teabowl', glaze: 'celadon' }), P({ form: 'teabowl', glaze: 'celadon' })], missed);
  const cl = v.clauses.find(x => x.text.includes('reduced'));
  ok('a missed one-way door fails the "actually reduced" clause', cl && !cl.pass);
  ok('...and points at cone 06', cl && /cone 06/.test(cl.why), cl?.why);
}

// ---------------------------------------------------------------------------
console.log('\ncounterfactuals — what + which input + how much (§4.5)');
// ---------------------------------------------------------------------------
{
  const cfs = counterfactuals(GOOD);
  ok('every card has all three parts of the fixed format',
     cfs.every(c => c.what && c.margin && c.magnitude), JSON.stringify(cfs));
  ok('no card says only "so close"', cfs.every(c => !/so close/i.test(c.what + c.margin + c.magnitude)));
  const nums = cfs.every(c => !/NaN|Infinity|undefined/.test(c.what + c.margin + c.magnitude));
  ok('no card leaks NaN/Infinity/undefined into the player\'s face', nums, JSON.stringify(cfs));
}
{
  // a firing that stalls short of cone 10 must produce the signature near-miss
  // seed 47 stalls the policy bot at cone 9 — hw 187 of 241, right in the near-miss band.
  const S = soakRun(47).S;
  const cfs = counterfactuals(S);
  const c10 = cfs.find(c => /cone 10 stayed up/.test(c.what));
  if (S.hw < FIRE.cones['10'] && S.hw > FIRE.cones['10'] * 0.70) {
    ok('an underfired load gets the "cone 10 stayed up" card', !!c10);
    ok('...and it quotes a MAGNITUDE in minutes', c10 && /\d+ more minutes/.test(c10.magnitude), c10?.magnitude);
  } else {
    ok('harness — underfire fixture landed in the near-miss band', false, `hw=${S.hw.toFixed(1)} of ${FIRE.cones['10']}`);
  }
}
{
  const hot = { ...GOOD, opened: true, openTemp: 700 };
  const c = counterfactuals(hot).find(x => /opened it at 700/.test(x.what));
  ok('opening hot gets its own card', !!c);
  ok('...and the magnitude is the degrees, with no other cause offered',
     c && /300°/.test(c.magnitude), c?.magnitude);
}
{
  // the door card must cite the real clock, not a guess
  const S = newFiring(77, []);
  setControl(S, 'gas', 9); setControl(S, 'air', 8); setControl(S, 'damper', 10);  // lean, never reduces
  for (let i = 0; i < 1400 && S.phase === 'firing'; i++) step(S);
  if (S.flags.missedReduction) {
    const c = counterfactuals(S).find(x => /no reduction in this firing/.test(x.what));
    ok('a missed door gets its card', !!c);
    ok('...and it cites the clock time cone 06 went down', c && /\d\d:\d\d/.test(c.margin), c?.margin);
  } else ok('harness — lean fixture missed reduction', false, 'it reduced anyway');
}

// ---------------------------------------------------------------------------
console.log('\nsettle — metered, small, never the score (§12.3)');
// ---------------------------------------------------------------------------
{
  const c = com('okonkwo_bowls');
  const won = judge(c, [P({ events: ['break'] }), P({ events: ['break'] })], GOOD);
  const s = settle(GOOD, { commission: c, verdict: won, mineCount: 3, memberCount: 6 });
  ok('gas is metered off the firing, not estimated', s.gas === Math.round(GOOD.fuel * ECON.gasPerUnit), `${s.gas}`);
  ok('gas actually costs something real', s.gas > 40 && s.gas < 400, `$${s.gas}`);
  ok('clay + member fees are per piece', s.clay === 12 && s.fees === 54, `${s.clay}/${s.fees}`);
  ok('a fulfilled brief pays in full', s.fee === c.fee);
  ok('a good night clears the break-even line', s.net > 0, `net ${s.net}`);

  const lost = judge(c, [P({ events: ['break', 'crawl'] }), P({ events: ['break'] })], GOOD);
  const s2 = settle(GOOD, { commission: c, verdict: lost, mineCount: 3, memberCount: 6 });
  ok('a failed brief pays less than a met one', s2.fee < s.fee && s2.fee > 0, `${s2.fee}`);
  ok('...and the player is not told it was bent for them',
     !/partial|discount|bonus|pity/i.test(s2.feeNote), s2.feeNote);

  const none = judge(c, [], GOOD);
  const s3 = settle(GOOD, { commission: c, verdict: none, mineCount: 3, memberCount: 6 });
  ok('making none of them pays nothing', s3.fee === 0);
  ok('...and that night loses money', s3.net < 0, `net ${s3.net}`);
}

// ---------------------------------------------------------------------------
console.log('\nthe board — deterministic, so you cannot reroll for an easy brief');
// ---------------------------------------------------------------------------
{
  const a = offerCommissions(1, 12345).map(c => c.id);
  const b = offerCommissions(1, 12345).map(c => c.id);
  const c = offerCommissions(2, 12345).map(x => x.id);
  ok('same firing + seed offers the same board', a.join() === b.join(), a.join());
  ok('a different firing offers a different board', a.join() !== c.join());
  ok('the board is three distinct briefs', new Set(a).size === 3, a.join());
  const done = Object.fromEntries(COMMISSIONS.slice(0, 12).map(x => [x.id, 1]));
  const off = offerCommissions(3, 9, done).map(x => x.id);
  const left = COMMISSIONS.filter(x => !done[x.id]).map(x => x.id);
  ok('undone briefs are offered before repeats', left.every(id => off.includes(id)), off.join());
}

// ---------------------------------------------------------------------------
// A window missed COMPLETELY must still be explained (§4.3). Regression: the
// near-miss band was 30–55%, so a window sitting at 0% produced no card at all and
// the screen read "nothing came down to a margin tonight" after a firing that had
// dropped two whole windows. Found by driving a real firing, not by these tests.
// ---------------------------------------------------------------------------
{
  const S = { ...GOOD, win: { ...GOOD.win, score: { reox: { pct: 0, n: 90, good: 0 }, soak: { pct: 0, n: 25, good: 0 } } } };
  const cfs = counterfactuals(S);
  const dropped = cfs.filter(c => /did not hold/.test(c.what));
  ok('a window missed completely still gets a card', dropped.length >= 1, JSON.stringify(cfs.map(c => c.what)));
  ok('...and says plainly you were never in the band',
     dropped.some(c => /never inside the band/.test(c.margin)), dropped[0]?.margin);
  ok('...and still names what that window wanted',
     dropped.every(c => c.magnitude.length > 20 && !/NaN|undefined/.test(c.magnitude)), JSON.stringify(dropped));
  ok('a firing that drops two windows is never told "nothing came down to a margin"', cfs.length > 0);
}

// ---------------------------------------------------------------------------
// Vacuous truth. Regression: a brief you ignored entirely came back with a column
// of GREEN TICKS — "the colour asked for ✓", "sound — no cracks ✓" — because every
// clause about the pieces is trivially true over an empty candidate set. Found by
// playing a firing and taking a brief I made nothing for.
// ---------------------------------------------------------------------------
{
  const c = com('marg_copper');        // one copper red bottle: colour + cone + sound
  const v = judge(c, [P({ form: 'mug', glaze: 'shino' })], GOOD);   // made nothing that answers it
  ok('a brief with no candidates fails its count', !v.clauses[0].pass);
  ok('...and NO clause about the pieces reads as passed',
     v.clauses.every(cl => !cl.pass || /cone|reduced/.test(cl.text)),
     v.clauses.map(cl => (cl.pass ? 'PASS ' : 'fail ') + cl.text).join(' | '));
  ok('...and each says plainly there was nothing to judge',
     v.clauses.filter(cl => !/cone|reduced|piece/.test(cl.text)).every(cl => /nothing to judge/.test(cl.why)),
     JSON.stringify(v.clauses.map(cl => cl.why)));
  // a fact about the FIRING is still judged honestly, made or not
  const coneClause = v.clauses.find(cl => /fired to cone/.test(cl.text));
  ok('...but a fact about the night itself is still judged on its merits', coneClause.pass === (GOOD.hw >= FIRE.cones['10']));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
