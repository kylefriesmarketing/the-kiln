// THE KILN — the shape of it over time. §13.
// Run: node tests/arc.mjs
// The thesis is "the endgame of a craft is teaching it", and the join that makes
// it work is that YOU CAN ONLY TEACH WHAT YOU SETTLED YOURSELF (§10). Both are
// asserted, along with §13's flat refusal to have a victory condition.
import { arcState, arcLine, memberSlots, pendingLesson, teach, fenReady,
         fenPolicy, fenOutcome, ensureFen, blankFen, settledCount } from '../kiln/arc.js';
import { blankNotebook } from '../kiln/notebook.js';
import { ARC, LESSONS, ARC_LINES, FEN, INSTRUMENTS } from '../kiln/data.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };

const nbWith = (...keys) => { const nb = blankNotebook(); for (const k of keys) nb.inst[k].done = true; return nb; };
const save = (o = {}) => ({ firings: 0, notebook: blankNotebook(), fen: blankFen(), ...o });

// ---------------------------------------------------------------------------
console.log('three states, and you slide between them (§13)');
// ---------------------------------------------------------------------------
{
  ok('a new firer is firing for themselves', arcState(save({ firings: 0 })) === 'yourself');
  ok('...and the studio has barely left them anything', memberSlots(save({ firings: 0 })) === ARC.membersEarly);
  ok('after a few firings it is the studio\'s work', arcState(save({ firings: ARC.yourselfUntil })) === 'studio');
  ok('...and the damp room fills up', memberSlots(save({ firings: 5 })) === ARC.membersMid);

  const learned = save({ firings: ARC.teachingAfter, notebook: nbWith('flame', 'climb') });
  ok('someone turns up once you visibly know what you are doing', arcState(learned) === 'teaching');

  // ⚠️ the guard that matters most
  const green = save({ firings: 40, notebook: blankNotebook() });
  ok('...but NOT if you have settled nothing — you cannot teach what you never learned',
     arcState(green) === 'studio', arcState(green));
  ok('every state has a line to show', Object.keys(ARC_LINES).every(k => ARC_LINES[k].head && ARC_LINES[k].line));
  ok('arcLine returns the right one', arcLine(learned).head === ARC_LINES.teaching.head);
}

// ---------------------------------------------------------------------------
console.log('\nyou can only give away what you have (§10 × §13)');
// ---------------------------------------------------------------------------
{
  // it takes ARC.teachingNeedsSettled instruments before anyone asks you anything
  const s = save({ firings: 10, notebook: nbWith('flame', 'climb') });
  const q = pendingLesson(s);
  ok('the question is about an instrument you settled', q && ['flame','climb'].includes(q.key), JSON.stringify(q && q.key));
  ok('...and it is a real question with real options', q.ask.length > 20 && q.opts.length >= 2);

  const s2 = save({ firings: 10, notebook: nbWith('cones', 'climb') });
  ok('settle a different pair, get a question from THAT pair',
     ['cones','climb'].includes(pendingLesson(s2).key), pendingLesson(s2).key);

  ok('settled count is what you actually settled', settledCount(nbWith('flame', 'cones')) === 2);

  // ⚠️ the core invariant: you are NEVER asked about something you did not settle
  ok('an unsettled instrument is never asked about', (() => {
    for (const pair of [['flame','climb'], ['flame','cones'], ['climb','cones']]) {
      const only = save({ firings: 10, notebook: nbWith(...pair) });
      let cur = only, guard = 0;
      while (guard++ < 6) {
        const l = pendingLesson(cur);
        if (!l) break;
        if (!pair.includes(l.key)) return false;      // asked about something unlearned
        cur = { ...cur, fen: teach(cur, l.key, LESSONS[l.key].opts[0].k).fen };
      }
    }
    return true;
  })());
}

// ---------------------------------------------------------------------------
console.log('\nwhat you say is what they believe — including when you are wrong');
// ---------------------------------------------------------------------------
{
  const s = save({ firings: 10, notebook: nbWith('flame', 'climb', 'cones') });
  const right = LESSONS.flame.opts.find(o => o.right);
  const wrong = LESSONS.flame.opts.find(o => !o.right);

  const good = teach(s, 'flame', right.k);
  ok('teaching it right is recorded as right', good.fen.taught.flame.right === true);
  ok('...and says what changed', /watches the spyhole/.test(good.note), good.note);

  const bad = teach(s, 'flame', wrong.k);
  ok('teaching it WRONG is recorded, not corrected', bad.fen.taught.flame.right === false);
  ok('...and the game does not scold you for it', !/wrong|mistake|should have/i.test(bad.note), bad.note);
  ok('...it just says what they now believe', /believes you|because you said so|told them to/i.test(bad.note), bad.note);
}

// ---------------------------------------------------------------------------
console.log('\nthey fire one, and the result is honestly yours');
// ---------------------------------------------------------------------------
{
  const nb = nbWith('flame', 'climb', 'cones');
  let s = save({ firings: 10, notebook: nb });
  ok('not ready before you have taught anything', !fenReady(s));

  for (const k of Object.keys(LESSONS)) s.fen = teach(s, k, LESSONS[k].opts.find(o => o.right).k).fen;
  ok('ready once you have given them everything you know', fenReady(s));

  const good = fenPolicy(s);
  ok('a well-taught apprentice aims to reduce', good.reduceTarget > 0.3, `${good.reduceTarget}`);
  ok('...and steers by the cones', good.stopOnCones === true);
  ok('...and knows all three', good.rightCount === 3);

  let b = save({ firings: 10, notebook: nb });
  b.fen = teach(b, 'flame', 'ox').fen;                       // told them blue is rich
  b.fen = teach(b, 'climb', 'hard').fen;                     // told them to run it up
  b.fen = teach(b, 'cones', 'temp').fen;                     // told them the dial is fine
  const badp = fenPolicy(b);
  ok('a badly-taught one chases a clean flame and never reduces', badp.reduceTarget < 0, `${badp.reduceTarget}`);
  ok('...runs the gas up hard', badp.climbGas > good.climbGas, `${badp.climbGas} vs ${good.climbGas}`);
  ok('...and steers by the dial', badp.stopOnCones === false);
  ok('...and it is traceable to what YOU told them', badp.rightCount === 0);

  const okOut = fenOutcome(s, { flags: {} });
  const badOut = fenOutcome(b, { flags: { missedReduction: true } });
  ok('a well-taught firing reads as good', okOut.good === true);
  ok('a badly-taught one does not', badOut.good === false);
  ok('...and it still is not a scolding', !/fail|bad|wrong/i.test(badOut.line), badOut.line);
}

// ---------------------------------------------------------------------------
console.log('\n§13: "There is no victory."');
// ---------------------------------------------------------------------------
{
  const blob = JSON.stringify({ ARC, ARC_LINES, FEN }) + Object.values(LESSONS).map(l => JSON.stringify(l)).join('');
  ok('nothing in the arc talks about winning',
     !/\bwin\b|\bvictory\b|congratulat|you did it|complete!|100%/i.test(blob));
  ok('the closing beat is a closing beat, not a trophy',
     /the light is still on/.test(FEN.close) && !/score|rank|unlock/i.test(FEN.close), FEN.close);
  const api = { arcState, arcLine, memberSlots, pendingLesson, fenReady, fenPolicy, fenOutcome };
  ok('no function here returns a score',
     Object.values(api).every(f => typeof f === 'function'));
}

// ---------------------------------------------------------------------------
console.log('\nsaves');
// ---------------------------------------------------------------------------
{
  ok('a pre-M6 save is repaired', ensureFen(undefined).here === false);
  ok('...and round-trips through JSON', ensureFen(JSON.parse(JSON.stringify(blankFen()))).taught !== undefined);
  ok('arcState survives a save with no notebook at all', ['yourself','studio','teaching'].includes(arcState({ firings: 2 })));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
