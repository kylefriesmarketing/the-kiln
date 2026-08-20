// THE KILN — the notebook. §10.
// DOM-free, Node-importable, no rng. Obra Dinn's confirm-in-threes, applied to
// instruments instead of corpses.
//
// The contract, and every line of it matters:
//   · you log what you BELIEVE the kiln is doing, while it is doing it
//   · nothing is confirmed individually, ever — the caller is told `silent`
//   · three CORRECT IN A ROW confirms the instrument and opens its page forever
//   · one wrong reading resets that run to zero, which is what makes brute force
//     cost more than actually learning to read the thing
import { INSTRUMENTS, NOTEBOOK_PAGES, FIRE } from './data.js';

export const RUN_NEEDED = 3;

// ---------------------------------------------------------------------------
// What the kiln is ACTUALLY doing, per instrument. This is the answer key, and
// it reads the same sim state the player is looking at on screen — no hidden
// variable is ever the difference between right and wrong (§19.5).
// ---------------------------------------------------------------------------
export function truthOf(key, S) {
  const inst = INSTRUMENTS[key];
  if (!inst) return null;
  if (inst.read === 'hw') {
    for (const o of inst.opts) {
      if (o.cone === null) return o.k;              // the open-ended last band
      if (S.hw < FIRE.cones[o.cone]) return o.k;
    }
    return inst.opts[inst.opts.length - 1].k;
  }
  const v = inst.read === 'atm' ? S.atm : S.rate;
  for (const o of inst.opts) if (v <= o.max) return o.k;
  return inst.opts[inst.opts.length - 1].k;
}

export function blankNotebook() {
  const nb = { inst: {}, seen: 0 };
  for (const k of Object.keys(INSTRUMENTS)) nb.inst[k] = { run: 0, logged: 0, wrong: 0, done: false, at: null };
  return nb;
}

// mergeDefaults gives us `{}` for a fresh save, and old saves predate this entirely.
export function ensure(nb) {
  const out = (nb && nb.inst) ? nb : blankNotebook();
  for (const k of Object.keys(INSTRUMENTS))
    if (!out.inst[k]) out.inst[k] = { run: 0, logged: 0, wrong: 0, done: false, at: null };
  return out;
}

// ---------------------------------------------------------------------------
// Log one reading. Returns what the UI is allowed to know — which is almost
// nothing until the moment it becomes everything.
// ⚠️ `correct` is deliberately NOT returned. The caller cannot leak it even by
// accident, because it never has it. Only `justConfirmed` is observable.
// ---------------------------------------------------------------------------
export function logReading(nb, key, choice, S, firingNo = 0) {
  const N = ensure(nb);
  const st = N.inst[key];
  if (!st || st.done) return { state: N, justConfirmed: false, silent: true, alreadyKnown: !!st?.done };

  const right = choice === truthOf(key, S);
  st.logged++;
  if (right) st.run++; else { st.run = 0; st.wrong++; }

  let justConfirmed = false;
  if (st.run >= RUN_NEEDED) { st.done = true; st.at = firingNo; justConfirmed = true; N.seen++; }
  return { state: N, justConfirmed, silent: !justConfirmed, remaining: Math.max(0, RUN_NEEDED - st.run) };
}

export const isConfirmed = (nb, key) => !!ensure(nb).inst[key]?.done;
export const pagesFor = key => NOTEBOOK_PAGES[key] || [];
export const confirmedCount = nb => Object.values(ensure(nb).inst).filter(i => i.done).length;
export const totalInstruments = () => Object.keys(INSTRUMENTS).length;

// ---------------------------------------------------------------------------
// §4.5's lever. Which pots out of this firing are worth putting back in, and why.
// A cracked pot is finished — you cannot un-dunt it, and pretending otherwise
// would be the game lying to make itself kinder.
// ---------------------------------------------------------------------------
export function refirable(firedPots, S) {
  const out = [];
  const cone10 = FIRE.cones['10'];
  const soak = S.win?.score?.soak;
  for (const p of firedPots) {
    if (!p.mine || !p.sound) continue;              // only yours, and only the intact
    let why = null;
    if (S.hw < cone10) why = 'underfired';
    else if (S.flags?.missedReduction) why = 'dull';
    else if (soak && soak.pct !== undefined && soak.pct < 0.55) why = 'dry';
    if (why) out.push({ ...p, why });
  }
  return out;
}
