// THE KILN — does this glaze want this shelf? §5.4, §7.1, §19.5.
// DOM-free, Node-importable, no rng.
//
// ⚠️ This is GUIDANCE SHOWN BEFORE THE DOOR IS BRICKED UP, not a score. §19.5
// forbids failing a player on a variable they had no instrument for, and a
// glaze's preference is exactly that. §4.4 forbids scoring the finished object —
// nothing here ever touches a fired pot, only the plan.
//
// And it must never collapse into one right answer: there are nine pieces and
// nine shelves, so somebody's work HAS to go somewhere it will not love. Choosing
// whose is the decision the whole load phase exists for.
import { WANTS, POSITIONS, GLAZES } from './data.js';

export const wantsOf = glazeKey => WANTS[glazeKey] || WANTS.clear;

// ---------------------------------------------------------------------------
// How well a shelf answers what a glaze is asking for. Returns a verdict a
// player can act on and the ONE reason that dominated it.
// ---------------------------------------------------------------------------
// A glaze with no positional preference at all. ⚠️ Do NOT force these to have a
// "good" shelf: rutile and clear genuinely do not care where they sit — what
// rutile wants is a slow COOL, which is a firing decision, not a shelf. Saying so
// is more useful than a fake recommendation, because it identifies the pieces you
// can afford to spend on the dead corner. That is a real placement decision.
export const isFlexible = glazeKey => {
  const w = wantsOf(glazeKey);
  return w.red === 0 && w.heat === 0 && w.ash === 0;
};

export function fit(glazeKey, posKey) {
  const w = wantsOf(glazeKey), P = POSITIONS[posKey];
  if (!P) return { rank: 'ok', why: '' };

  if (isFlexible(glazeKey)) {
    return P.heat <= -1.2
      ? { rank: 'ok', why: 'even this one will be dull in the dead corner', score: 0 }
      : { rank: 'ok', why: 'does not mind the shelf — spend it on one nothing else wants', score: 0 };
  }

  let score = 0;
  let why = '', worst = 0;
  const note = (v, text) => { if (Math.abs(v) > Math.abs(worst)) { worst = v; why = text; } };

  // atmosphere is the one that actually decides colours, so it weighs most
  if (w.red > 0) {
    const v = P.red;                       // wants reduction
    score += v * 2;
    if (v <= -0.5) note(-2, 'this shelf oxidises — the colour will not come');
    else if (v >= 0.5) note(2, 'the atmosphere here is what it wants');
  } else if (w.red < 0) {
    const v = -P.red;                      // wants OXIDATION (oribe)
    score += v * 2.4;
    if (P.red >= 0.5) note(-2.4, 'far too much reduction — this is where oribe dies');
    else if (P.red <= -0.5) note(2.4, 'oxidising up here, which is the whole trick with oribe');
  }

  // heat
  if (w.heat > 0) {
    score += P.heat;
    if (P.heat <= -0.9) note(-1.6, 'runs cold, and this one needs the heat');
    else if (P.heat >= 0.5) note(1.2, 'plenty of heat');
  } else if (w.heat < 0) {
    // ⚠️ weighted 1.2, not 0.7. At 0.7 SHINO — which wants reduction AND a cooler
    // shelf, and whose home is the back middle — scored 1.14 against a 1.4 bar and
    // had ZERO good shelves in the whole kiln, so the piece gave no guidance at all.
    score += -P.heat * 1.2;
    if (P.heat <= -0.15) note(1.4, 'cooler back here, which is what it is after');
  }

  // flame contact, for the ash glazes
  if (w.ash > 0) {
    score += P.ash * 1.8;
    if (P.ash >= 0.6) note(1.8, 'the flame really touches here');
    else if (P.ash <= 0.1) note(-1.2, 'no flame contact — nothing will happen to it');
  }

  // the dead corner is bad for everything, and should say so
  if (P.heat <= -1.2) { score -= 1.2; note(-2.6, 'cold and still. nothing does well here'); }

  // ⚠️ 1.2, chosen by sweeping every glaze × shelf. At 1.3 and above SHINO has no
  // home anywhere in the kiln (its best, the back middle, scores 1.24 — reduction
  // AND a cooler shelf is a combination this kiln barely offers), and a piece with
  // no good shelf gives the player nothing to reason about. At 1.2 every
  // opinionated glaze has between one and three, and none has six or more, so the
  // placement still costs something. Re-sweep if POSITIONS or WANTS change.
  const rank = score >= 1.2 ? 'good' : score <= -1.0 ? 'bad' : 'ok';
  if (!why) why = rank === 'good' ? 'this suits it' : rank === 'bad' ? 'this fights it' : 'it will be fine here, not remarkable';
  return { rank, why, score: +score.toFixed(2) };
}

// the whole board for one piece, so the load screen can light up at a glance
export function fitAll(glazeKey) {
  const out = {};
  for (const pos of Object.keys(POSITIONS)) out[pos] = fit(glazeKey, pos);
  return out;
}

// ⚠️ a sanity property the tests lean on: no glaze may find EVERY shelf good,
// and none may find every shelf bad — either would mean the placement carries
// no decision at all.
export function spread(glazeKey) {
  const all = Object.values(fitAll(glazeKey));
  return { good: all.filter(f => f.rank === 'good').length,
           ok:   all.filter(f => f.rank === 'ok').length,
           bad:  all.filter(f => f.rank === 'bad').length };
}
