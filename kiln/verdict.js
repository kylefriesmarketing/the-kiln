// THE KILN — the verdict. §4.3, §4.4, §4.5, §12.
// DOM-free, Node-importable, no rng. Given a finished firing and the pots that came
// out of it, this file answers three questions and no others:
//
//   1. did you fulfil the brief?      judge()          — clause by clause, never a score
//   2. what was the margin?           counterfactuals()— what happened + which input + how much
//   3. what did the night cost?       settle()         — metered, small, never the score
//
// ⚠️ THE GAME NEVER SCORES A POT (§19.6). There is deliberately no function in this
// file that takes a pot and returns a quality. A commission is an external brief with
// a person's name on it; the object is unscored and kept forever either way (§19.8).
// If a future session adds `potQuality()` here, it has broken the game's spine.
import { FIRE, COMMISSIONS, CLIENTS, ECON, EVENT_NAMES, GLAZES, FORMS, POSITIONS } from './data.js';
import { coneDown, hhmm } from './sim.js';

const WIN_NAME = Object.fromEntries(FIRE.windows.map(w => [w.id, w.name]));
const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;
const listPos = ps => ps.map(p => POSITIONS[p].name).join(' and ');

// ---------------------------------------------------------------------------
// Which of YOUR pieces even count toward this brief. A brief that asks for wide
// bowls in tenmoku is judged on the wide bowls in tenmoku — everything else you
// fired is still yours, still on the shelf, and simply not part of this contract.
// ---------------------------------------------------------------------------
export function candidatesFor(com, pots) {
  return pots.filter(p => p.mine
    && (!com.want.form  || p.form === com.want.form)
    && (!com.want.glaze || p.glaze === com.want.glaze));
}

const has = (p, k) => p.events.some(e => e.k === k);

// ---------------------------------------------------------------------------
// judge — clause by clause, pass/fail, and EVERY failure names the position and
// the cause (§4.4). "two crawled. both on the cool bottom." is survivable.
// "quality: 2/5" is not.
// ---------------------------------------------------------------------------
export function judge(com, pots, S) {
  const cand = candidatesFor(com, pots);
  const need = com.need;
  const out = [];
  let countPass = true;   // did you even MAKE them. drives the kill fee in settle().
  const say = (text, pass, why) => out.push({ text, pass, why: pass ? '' : why });

  // ⚠️ VACUOUS TRUTH IS A LIE ON THIS SCREEN. Every clause about the pieces —
  // sound, the events, the colour, the matching — is trivially TRUE over an empty
  // candidate set, so a brief you ignored completely used to come back with a column
  // of green ticks under a failed count. A clause about pots that do not exist has
  // not been satisfied; it has not been ASSESSED, and it must not read as passed.
  // Clauses about the FIRING (cone, reduced) are still judged honestly — those are
  // facts about the night whether or not you made anything.
  const short = cand.length < need;
  const sayCand = (text, pass, why) => short
    ? out.push({ text, pass: false, why: 'you did not make them, so there was nothing to judge.' })
    : say(text, pass, why);

  for (const c of com.clauses) {
    switch (c.k) {

      case 'count': {
        const want = [com.want.glaze && GLAZES[com.want.glaze].name, com.want.form && FORMS[com.want.form].name]
          .filter(Boolean).join(' ') || 'pieces';
        countPass = cand.length >= need;
        say(`${plural(need, 'piece')} — ${want}`, countPass,
          cand.length === 0 ? `you fired none that answer the brief.`
                            : `you fired ${cand.length}. the brief asked for ${need}.`);
        break;
      }

      case 'cone': {
        const reached = coneDown(S.hw);
        say(`fired to cone ${c.v}`, S.hw >= FIRE.cones[c.v],
          `cone ${c.v} stayed up. the load reached ${reached ? 'cone ' + reached : 'no cone at all'}.`);
        break;
      }

      case 'sound': {
        const bad = cand.filter(p => !p.sound);
        sayCand('sound — no cracks', bad.length === 0,
          `${plural(bad.length, 'piece')} came out cracked, on the ${listPos(bad.map(p => p.pos))}.`);
        break;
      }

      case 'event': {
        const hit = cand.filter(p => has(p, c.v));
        const missed = cand.filter(p => !has(p, c.v));
        sayCand(`showing ${EVENT_NAMES[c.v]}`, hit.length >= need,
          missed.length === cand.length
            ? `none of them did. ${causeOf(c.v, S, cand)}`
            : `only ${hit.length} did. the ${listPos(missed.map(p => p.pos))} did not. ${causeOf(c.v, S, cand)}`);
        break;
      }

      case 'anyevent': {
        const hit = cand.filter(p => c.v.some(k => has(p, k)));
        sayCand(`something happening on the surface`, hit.length >= need,
          `${plural(cand.length - hit.length, 'piece')} came out plain — nothing on the ${listPos(cand.filter(p => !c.v.some(k => has(p, k))).map(p => p.pos))}.`);
        break;
      }

      case 'noevent': {
        const bad = cand.filter(p => has(p, c.v));
        sayCand(`no ${EVENT_NAMES[c.v]}`, bad.length === 0,
          `${plural(bad.length, 'piece')} ${bad.length === 1 ? 'did' : 'did'}, on the ${listPos(bad.map(p => p.pos))}. ${causeOf(c.v, S, bad)}`);
        break;
      }

      case 'reduced': {
        const ok = !S.flags.missedReduction && S.redHeld >= 20;
        say('actually reduced', ok, S.flags.missedReduction
          ? `there was no reduction in this firing. cone 06 went down before you started.`
          : `the kiln held reduction for ${Math.round(S.redHeld)} minutes. that is not enough to show.`);
        break;
      }

      case 'noflip': {
        const flipped = cand.filter(p => p.copperFlip);
        const wanted = com.want.glaze === 'oribe' ? 'green' : 'red';
        sayCand(`the colour asked for`, flipped.length === 0,
          `it came out ${wanted === 'red' ? 'green' : 'brown-red'}. copper is red in reduction and green in oxidation — same element, opposite result. ${S.flags.missedReduction ? 'there was no reduction in this firing at all.' : 'the atmosphere at the top of the firing decided it.'}`);
        break;
      }

      case 'sameglaze': {
        const set = new Set(cand.slice(0, need).map(p => p.effGlaze));
        sayCand('all the same glaze', set.size === 1,
          cand.length < need ? `there were not enough to compare.`
            : `they came out ${set.size} different ways: ${[...set].map(g => GLAZES[g].name).join(', ')}.`);
        break;
      }

      case 'sameform': {
        const set = new Set(cand.slice(0, need).map(p => p.form));
        sayCand('all the same form', set.size === 1,
          cand.length < need ? `there were not enough to compare.`
            : `you sent ${[...set].map(f => FORMS[f].name).join(' and ')}.`);
        break;
      }

      default: say(c.k, true, '');
    }
  }

  const passed = out.every(c => c.pass);
  return { com, client: CLIENTS[com.client], clauses: out, cand, passed, madeThem: countPass,
           failed: out.filter(c => !c.pass) };
}

// Why an effect did or did not happen — always traceable to a decision (§4.3, §19.5).
function causeOf(k, S, pots) {
  const cold = pots.filter(p => POSITIONS[p.pos].heat < -0.4).length;
  switch (k) {
    case 'break':      return 'break needs the glaze thin over an edge and the heat to pull it there.';
    case 'crawl':      return cold ? 'crawling is thick glaze on a cold shelf.' : 'crawling is a thick coat that let go.';
    case 'carbontrap': return 'carbon trap wants shino and reduction started early, while the body is still open.';
    case 'harefur':    return "hare's fur wants tenmoku and a slow cool. shut the damper and let it down gently.";
    case 'crystal':    return 'crystals grow on the way down. they need a slow cool, not a fast one.';
    case 'dunt':       return S.openTemp > FIRE.cool.targetOpenF
                          ? `you opened at ${Math.round(S.openTemp)}°. that is what cracked them.`
                          : 'it cooled through the inversion too fast.';
    case 'pinhole':    return 'pinholes are trapped gas — a fast climb, or a cold shelf.';
    default:           return '';
  }
}

// ---------------------------------------------------------------------------
// counterfactuals — §4.5. THE FORMAT IS FIXED and it is not negotiable:
//   what happened + WHICH OF YOUR INPUTS was the margin + HOW MUCH change crosses it.
// A near-miss you can act on is a lesson. A near-miss you can only feel is a taunt.
// Every number below is measured off the firing, never invented.
// ---------------------------------------------------------------------------
export function counterfactuals(S) {
  const out = [];
  const c10 = FIRE.cones['10'], c11 = FIRE.cones['11'];
  const worst = worstWindow(S);

  // 1. cone 10 stayed up — the signature near-miss of a reduction firing
  if (S.hw < c10 && S.hw > c10 * 0.70) {
    const rate = Math.max(S.peakHwRate, 1e-6) / 60;          // heat work per sim-minute
    const mins = Math.round((c10 - S.hw) / rate);
    out.push({
      what: `cone 10 stayed up. the load finished at ${coneDown(S.hw) ? 'cone ' + coneDown(S.hw) : 'no cone down'}.`,
      margin: worst ? `${WIN_NAME[worst.id]} held ${Math.round(worst.pct * 100)}% of the time. the bar is 55%.`
                    : `the top of the firing is where it was lost.`,
      magnitude: mins > 0 && mins < 900
        ? `about ${mins} more minutes at the rate you were making heat work and it goes down.`
        : `it was not climbing any more when you shut the burners off.`,
    });
  }

  // 2. the one-way door — real, sourced, irreversible (§6.2)
  if (S.flags.missedReduction) {
    const doorT = S.win.doneAt?.['06'];
    const began = S.log.find(l => l.kind === 'beat' && l.text === 'reduction begun');
    out.push({
      what: `there was no reduction in this firing.`,
      margin: doorT !== undefined
        ? `cone 06 went down at ${hhmm(doorT)}${began ? `, and you began reducing at ${hhmm(began.t)}` : ' while the kiln was still oxidising'}.`
        : `the kiln passed cone 06 while it was still burning clean.`,
      magnitude: (doorT !== undefined && began)
        ? `${Math.round(began.t - doorT)} minutes earlier on the damper and the door would still have been open.`
        : `closing the damper before cone 06 is the whole of it. nothing after that reopens it.`,
    });
  }

  // 3. every demand window that did not hold.
  // ⚠️ this used to fire ONLY between 30% and 55%, so a window you missed COMPLETELY
  // scored no card at all and the screen said "nothing came down to a margin tonight"
  // after a firing that dropped two windows. §4.3 is explicit that a bad result gets
  // a COMPLETE causal account — a total miss needs more explanation than a near miss,
  // not less. Caught by driving a real firing, not by the unit tests.
  const failed = Object.entries(S.win.score || {})
    .filter(([, sc]) => sc.pct !== undefined && sc.pct < 0.55)
    .sort((a, b) => a[1].pct - b[1].pct).slice(0, 2);
  for (const [id, sc] of failed) {
    const w = FIRE.windows.find(x => x.id === id);
    const mins = Math.max(1, Math.round((0.55 - sc.pct) * (w?.hold || 30)));
    out.push({
      what: `${WIN_NAME[id]} did not hold.`,
      margin: sc.pct > 0
        ? `you were inside the band ${Math.round(sc.pct * 100)}% of that window. 55% is where it counts as held.`
        : `you were never inside the band for that window. not once.`,
      magnitude: sc.pct > 0
        ? `about ${mins} more minutes ${wantPhrase(w)} and it holds.`
        : `it wanted ${wantPhrase(w)}${w?.miss ? `, and what you got was: ${w.miss}` : ''}.`,
    });
  }

  // 4. opened hot. the game let you, and it said so at the time.
  if (S.opened && S.openTemp > FIRE.cool.targetOpenF) {
    const over = Math.round(S.openTemp - FIRE.cool.targetOpenF);
    out.push({
      what: `you opened it at ${Math.round(S.openTemp)}°.`,
      margin: `below ${FIRE.cool.targetOpenF}° nothing dunts. you were ${over}° above that.`,
      magnitude: `the cracks are that ${over}°. there is no other cause and there was no hurry.`,
    });
  }

  // 5. overfired — the other side of the same coin
  if (S.hw >= c11) {
    out.push({
      what: `cone 11 went down as well.`,
      margin: `the soak carried past where the glazes wanted to stop.`,
      magnitude: `shutting down when cone 10 touched, rather than after, is the difference.`,
    });
  }
  return out;
}

function wantPhrase(w) {
  if (!w) return 'the demand';
  if (w.want.atm) return w.want.atm[0] > 0.2 ? 'richer, damper down' : 'cleaner, damper open';
  if (w.want.rate) return `climbing ${w.want.rate[0]}–${w.want.rate[1]}°/hr`;
  if (w.want.gas) return `gas ${w.want.gas[0]}–${w.want.gas[1]}`;
  return 'the demand';
}

function worstWindow(S) {
  let worst = null;
  for (const [id, sc] of Object.entries(S.win.score || {})) {
    if (!sc.pct && sc.pct !== 0) continue;
    if (!worst || sc.pct < worst.pct) worst = { id, pct: sc.pct };
  }
  return worst;
}

// ---------------------------------------------------------------------------
// settle — §12.3. Money is small, metered, and NEVER the score. It buys clay and
// gas and a replacement shelf. There is no storefront and there never will be (§19.9).
// ---------------------------------------------------------------------------
export function settle(S, { commission = null, verdict = null, mineCount = 0, memberCount = 0 } = {}) {
  const gas  = Math.round(S.fuel * ECON.gasPerUnit);
  const clay = mineCount * ECON.clayPerPiece;
  const fees = memberCount * ECON.memberFee;

  // ⚠️ §4.3 — bend it in the player's favour and do not announce it. A client who
  // gets a genuine near-miss takes the work at a discount rather than paying nothing;
  // only failing to MAKE the pieces pays nothing at all. The UI never says "partial
  // credit" and never shows this ratio.
  let fee = 0, feeNote = '';
  if (commission && verdict) {
    if (verdict.passed) { fee = commission.fee; feeNote = 'paid in full.'; }
    else if (verdict.madeThem) { fee = Math.round(commission.fee * 0.35); feeNote = 'took them anyway, at their price.'; }
    else { fee = 0; feeNote = 'nothing to deliver.'; }
  }
  return { gas, clay, fees, fee, feeNote, net: fee + fees - gas - clay, cost: gas + clay };
}

// The commission board. Deterministic per firing — no Math.random, so a reload
// offers the same work and the player cannot reroll for an easier brief.
export function offerCommissions(firingNo, seed, done = {}) {
  let x = (seed ^ (firingNo * 2654435761)) >>> 0;
  const next = () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
  const draw = (bag, n, into) => { while (into.length < n && bag.length) into.push(bag.splice(Math.floor(next() * bag.length), 1)[0]); };
  const out = [];
  draw(COMMISSIONS.filter(c => !done[c.id]), 3, out);   // work you have not done yet comes first
  draw(COMMISSIONS.filter(c => done[c.id]), 3, out);    // ...then repeats, so the board never runs dry
  return out;
}
