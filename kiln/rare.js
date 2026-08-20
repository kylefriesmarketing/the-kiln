// THE KILN — landmarks, and the fairness machinery around them. §8, §4.5.
// DOM-free, Node-importable, NO RNG.
//
// Two things live here and they belong together:
//   rareOf()  — the hand-authored tier. Deterministic. EARNED, never lucky.
//   luckBias()— the invisible two-sided protection on the conditions roll.
//
// ⚠️ They are deliberately separate mechanisms. The rare tier is not the pity
// system's payout — if a future session wires luck into rareOf(), a landmark
// stops being something you can produce on purpose and becomes a jackpot, and
// §8 is explicit that they are "not lucky".
import { RARES, LUCK } from './data.js';

// ---------------------------------------------------------------------------
// Did this pot land on a landmark? A pure function of what came out of the fire.
// ---------------------------------------------------------------------------
export function rareOf(pot, S) {
  if (!pot) return null;
  for (const r of RARES) {
    try { if (r.when(pot, S || {})) return r; }
    catch (e) { /* a malformed rare must never take the reveal down */ }
  }
  return null;
}

export const rareById = id => RARES.find(r => r.id === id) || null;
export const allRares = () => RARES.slice();

// ---------------------------------------------------------------------------
// §4.5 — the floor and the ceiling. Returns a bias in roughly [-0.22, +0.30]
// that leans the CONDITIONS ROLL, and nothing else, in the player's favour after
// a run of poor nights — and gently away after a remarkable one, so that
// remarkable stays rare enough to mean something.
//
// ⚠️ NEVER SURFACE THIS. §4.3: bend it in the player's favour and do not mention
// it. There is no UI for it and there should not be one.
// ---------------------------------------------------------------------------
export function blankLuck() { return { dry: 0, rich: 0 }; }
export function ensureLuck(l) {
  return (l && typeof l.dry === 'number') ? { dry: l.dry, rich: l.rich || 0 } : blankLuck();
}

export function luckBias(luck) {
  const L = ensureLuck(luck);
  if (L.rich > 0) return LUCK.richBias;
  if (L.dry >= LUCK.dryAfter) {
    const over = Math.min(L.dry, LUCK.maxDry) - LUCK.dryAfter + 1;
    return Math.min(LUCK.dryBias, LUCK.dryBias * over / (LUCK.maxDry - LUCK.dryAfter + 1));
  }
  return 0;
}

// Was that a good night? Deliberately coarse — this decides nothing the player
// sees, it only decides whether the invisible floor starts helping.
export function scoreNight({ reachedCone10, commissionMet, rares, broken, potCount }) {
  if (rares > 0) return 'rich';
  if (reachedCone10 && commissionMet !== false && broken === 0) return 'good';
  if (!reachedCone10 || broken >= Math.max(2, Math.ceil((potCount || 9) / 3))) return 'poor';
  return 'ok';
}

export function tickLuck(luck, verdictWord) {
  const L = ensureLuck(luck);
  if (verdictWord === 'rich') { L.rich = 2; L.dry = 0; }
  else {
    if (L.rich > 0) L.rich--;
    if (verdictWord === 'poor') L.dry = Math.min(LUCK.maxDry, L.dry + 1);
    else if (verdictWord === 'good') L.dry = 0;
  }
  return L;
}
