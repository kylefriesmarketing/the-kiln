// THE KILN — the shape of it over time. §13.
// DOM-free, Node-importable, no rng.
//
// Three states, and you slide between them: firing for yourself, firing for the
// studio, and firing for someone else to learn. The last one is the point —
// "the endgame of a craft is teaching it, and this is the only honest ending a
// game about a kiln has."
//
// ⚠️ §13: "There is no victory. There is a firing where everything you intended
// happened, and it will not be the one you remember." Nothing in this file
// returns a score, a completion percentage, or a win condition, and nothing
// should be added that does.
import { ARC, LESSONS, ARC_LINES, FEN, INSTRUMENTS } from './data.js';
import { isConfirmed, ensure as nbEnsure } from './notebook.js';

export function blankFen() { return { here: false, taught: {}, fired: false, met: false }; }
export function ensureFen(f) {
  return (f && typeof f === 'object') ? { here: !!f.here, taught: { ...(f.taught || {}) },
                                          fired: !!f.fired, met: !!f.met } : blankFen();
}

// how many instruments YOU have settled — this is what you have to give away
export const settledCount = notebook =>
  Object.keys(INSTRUMENTS).filter(k => isConfirmed(notebook, k)).length;

// ---------------------------------------------------------------------------
// Which state are you in? Slides, never jumps — the thresholds overlap the way
// the bible describes rather than gating hard.
// ---------------------------------------------------------------------------
export function arcState(save) {
  const firings = save?.firings || 0;
  const fen = ensureFen(save?.fen);
  if (fen.here || (firings >= ARC.teachingAfter && settledCount(save?.notebook) >= ARC.teachingNeedsSettled))
    return 'teaching';
  if (firings < ARC.yourselfUntil) return 'yourself';
  return 'studio';
}

export const arcLine = save => ARC_LINES[arcState(save)];

// early on, most of the studio has not decided to trust you with their work yet
export function memberSlots(save) {
  return arcState(save) === 'yourself' ? ARC.membersEarly : ARC.membersMid;
}

// ---------------------------------------------------------------------------
// What does Fen want to know tonight?
// ⚠️ You can only be asked about an instrument you have SETTLED yourself (§10).
// That is the join: three correct readings in a row earned you the page, and the
// page is the only thing you have to hand over.
// ---------------------------------------------------------------------------
export function pendingLesson(save) {
  if (arcState(save) !== 'teaching') return null;
  const fen = ensureFen(save?.fen);
  if (fen.fired) return null;
  for (const key of Object.keys(LESSONS)) {
    if (fen.taught[key]) continue;
    if (!isConfirmed(save?.notebook, key)) continue;   // you cannot teach what you never settled
    return { key, ...LESSONS[key] };
  }
  return null;
}

// What you say is what they believe — including if you tell them wrong.
export function teach(save, key, optK) {
  const fen = ensureFen(save?.fen);
  const lesson = LESSONS[key];
  if (!lesson) return { fen, opt: null };
  const opt = lesson.opts.find(o => o.k === optK) || lesson.opts[0];
  fen.taught[key] = { k: opt.k, right: !!opt.right };
  fen.here = true; fen.met = true;
  return { fen, opt, note: opt.right ? lesson.learnt : lesson.wrong };
}

// Fen is ready once you have given them everything you actually know — capped at
// the three lessons that exist.
export function fenReady(save) {
  const fen = ensureFen(save?.fen);
  if (fen.fired) return false;
  const teachable = Object.keys(LESSONS).filter(k => isConfirmed(save?.notebook, k)).length;
  const taught = Object.keys(fen.taught).length;
  return fen.met && taught > 0 && taught >= Math.min(teachable, Object.keys(LESSONS).length);
}

// ---------------------------------------------------------------------------
// How Fen fires, given what you told them. This is not a roll — it is a policy
// built from your own teaching, so the result is honestly yours.
// Returns the control targets a firing harness can drive.
// ---------------------------------------------------------------------------
export function fenPolicy(save) {
  const fen = ensureFen(save?.fen);
  const got = k => fen.taught[k]?.right === true;
  const told = k => fen.taught[k]?.k;
  return {
    // if you taught the flame wrong, they chase a clean blue flame and never reduce
    reduceTarget: got('flame') ? 0.55 : (told('flame') === 'ox' ? -0.20 : 0.10),
    // if you taught the climb wrong, they run it up hard or crawl
    climbGas:     got('climb') ? 9 : (told('climb') === 'hard' ? 12 : 5),
    // if you taught the cones wrong, they shut down on the dial and underfire
    stopOnCones:  got('cones'),
    knows: Object.fromEntries(Object.keys(LESSONS).map(k => [k, got(k)])),
    rightCount: Object.keys(LESSONS).filter(got).length,
  };
}

export function fenOutcome(save, S) {
  const p = fenPolicy(save);
  const good = p.rightCount >= 2 && !S?.flags?.missedReduction;
  return { good, line: good ? FEN.afterGood : FEN.afterBad, close: FEN.close };
}
