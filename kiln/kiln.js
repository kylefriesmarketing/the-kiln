// THE KILN — the machine's own memory. §5.5.
// DOM-free, Node-importable, NO RNG. Everything here is a pure function of what
// you did to this kiln in previous firings.
//
// ⚠️ This is a SIM INPUT, never a source of randomness. Same kiln state + same
// seed produces the same firing, byte for byte — `tests/kiln.mjs` asserts it.
// And it must never ambush the player: every effect below is visible on the load
// screen BEFORE the door is bricked up (§19.3, §19.5).
import { POSITIONS, WEAR, FIRE, FORMS } from './data.js';

export function blankKiln() {
  const shelves = {};
  for (const k of Object.keys(POSITIONS)) shelves[k] = { warp: 0, glaze: 0, fires: 0 };
  return { fires: 0, shelves, flue: 0 };
}

// Old saves predate all of this, and mergeDefaults hands us whatever was there.
export function ensureKiln(k) {
  const out = (k && k.shelves) ? { fires: k.fires || 0, shelves: { ...k.shelves }, flue: k.flue || 0 }
                               : blankKiln();
  for (const key of Object.keys(POSITIONS))
    if (!out.shelves[key]) out.shelves[key] = { warp: 0, glaze: 0, fires: 0 };
  return out;
}

// ---------------------------------------------------------------------------
// What the wear DOES. Glazed brick reflects heat, so a shelf you have run glaze
// onto runs hotter than it used to — a hot spot becomes hotter, which is exactly
// what happens in a real kiln and is exactly the sort of thing you would rather
// have known about your own kiln.
// ---------------------------------------------------------------------------
export function shelfMods(kiln) {
  const K = ensureKiln(kiln), out = {};
  for (const [pos, s] of Object.entries(K.shelves))
    out[pos] = { heat: Math.min(s.glaze, WEAR.glazeMax) * WEAR.glazeHeat, red: 0 };
  return out;
}

// the flue remembers a hard reduction for a firing or two
export const drawShift = kiln => ensureKiln(kiln).flue;

// a warped shelf will not sit a tall piece flat
export function canTake(kiln, pos, formKey) {
  const s = ensureKiln(kiln).shelves[pos];
  if (!s) return true;
  if (s.warp < WEAR.warpBlocksTall) return true;
  return !WEAR.tallForms.includes(formKey);
}

// ---------------------------------------------------------------------------
// What a firing DOES to the kiln. Pure: (kiln, pots, firing) -> new kiln.
// ---------------------------------------------------------------------------
export function wearFrom(kiln, firedPots, S) {
  const K = ensureKiln(kiln);
  K.fires++;

  const cone11 = FIRE.cones['11'];
  for (const [pos, s] of Object.entries(K.shelves)) {
    const p = S.pos?.[pos];
    if (!p) continue;
    s.fires++;
    // a shelf worked hard at the top of the range warps a little more each time
    if (p.hw >= cone11 * WEAR.warpAtCone11) s.warp = Math.min(WEAR.warpMax, s.warp + 1);
  }
  // glaze that ran, ran onto something
  for (const pot of firedPots || []) {
    if (!pot.pos || !K.shelves[pot.pos]) continue;
    if ((pot.events || []).some(e => e.k === 'run'))
      K.shelves[pot.pos].glaze = Math.min(WEAR.glazeMax, K.shelves[pot.pos].glaze + WEAR.glazePerRun);
  }
  // and the flue carries a hard reduction forward, then forgets it
  const hard = (S.redHeld || 0) >= WEAR.flueHardRedMin;
  K.flue = Math.max(WEAR.flueFloor, (hard ? WEAR.fluePerHardRed : 0) + K.flue * WEAR.flueDecay);
  if (Math.abs(K.flue) < 0.01) K.flue = 0;
  return K;
}

export function repairShelf(kiln, pos) {
  const K = ensureKiln(kiln);
  if (K.shelves[pos]) K.shelves[pos] = { warp: 0, glaze: 0, fires: K.shelves[pos].fires };
  return K;
}

// ---------------------------------------------------------------------------
// How the wear READS. The load screen has to say this in words, before you
// commit, or it is a hidden variable and §19.5 forbids that.
// ---------------------------------------------------------------------------
export function describeShelf(kiln, pos) {
  const s = ensureKiln(kiln).shelves[pos];
  if (!s) return '';
  const bits = [];
  if (s.glaze >= 3)      bits.push('glazed over from old runs — it throws heat back now');
  else if (s.glaze > 0)  bits.push('a run got away on this one');
  if (s.warp >= WEAR.warpBlocksTall) bits.push('warped — nothing tall will sit flat');
  else if (s.warp > 0)   bits.push('going out of true');
  return bits.join(' · ');
}

export function kilnSummary(kiln) {
  const K = ensureKiln(kiln);
  const warped = Object.values(K.shelves).filter(s => s.warp >= WEAR.warpBlocksTall).length;
  const glazed = Object.values(K.shelves).filter(s => s.glaze > 0).length;
  const bits = [];
  if (K.fires) bits.push(`${K.fires} firing${K.fires === 1 ? '' : 's'} on it`);
  if (glazed) bits.push(`${glazed} ${glazed === 1 ? 'shelf' : 'shelves'} glazed`);
  if (warped) bits.push(`${warped} warped`);
  if (K.flue) bits.push(K.flue < 0 ? 'the flue is still sooty from last time' : 'the flue is drawing free');
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// §6.4 — THE DRAW TRIAL. Ten minutes of burners before you load: it costs fuel
// and half an hour, and it tells you tonight's kiln precisely instead of
// approximately. Deterministic — it REVEALS what is already fixed, it does not
// roll anything new.
// ---------------------------------------------------------------------------
export function drawTrial(S, kiln) {
  const sum = S.cond.kiln[2] + S.cond.draw[2] + S.cond.fuel[2] + drawShift(kiln);
  // a plain climb-rate prediction at a working gas setting, from the real constants
  const gas = 8, F = FIRE;
  const air = 5 * F.airPerNotch + 6 * F.airPerDamper * (1 + S.cond.draw[2]);
  const ratio = air / (gas * F.stoich);
  const d = ratio - F.effPeak;
  const eff = Math.exp(-(d * d) / (2 * (d < 0 ? F.effWidthLo : F.effWidthHi) ** 2));
  const T = 1600, above = T - F.ambient;
  const heatIn = gas * eff * F.calorific * (1 + S.cond.kiln[2] * 0.35);
  const flu = (F.fluLossBase + 6 * F.fluLossPerNotch * (1 + S.cond.draw[2])) * above / 100;
  const shell = F.shellLoss * Math.pow(above / 1000, F.shellPow) * 1000;
  const rate = Math.round((heatIn - flu - shell) / F.thermalMass * 60);
  return {
    sum: +sum.toFixed(3),
    kiln: S.cond.kiln[2], draw: +(S.cond.draw[2] + drawShift(kiln)).toFixed(3), fuel: S.cond.fuel[2],
    rateAt8: rate,
    line: rate < 90
      ? `at gas 8 this kiln climbs about ${rate}° an hour tonight. that is slow. start earlier than feels right.`
      : rate > 190
      ? `at gas 8 this kiln climbs about ${rate}° an hour tonight. that is quick — it will want less gas than you think.`
      : `at gas 8 this kiln climbs about ${rate}° an hour tonight. an ordinary night.`,
  };
}
