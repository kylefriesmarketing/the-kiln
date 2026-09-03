// THE KILN — the load puzzle. §5.4, §7.1, §19.5.
// Run: node tests/fit.mjs
// The load is where the bible says most of the decision weight lives. These
// assert that the decision is (a) informed, (b) not solved for you, and (c) that
// the copper conflict — the bible's "best teaching mechanic in the game" — reads.
import { fit, fitAll, spread, wantsOf, isFlexible } from '../kiln/fit.js';
import { GLAZES, POSITIONS, WANTS } from '../kiln/data.js';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { console.log(`  ok   ${n}`); pass++; }
  else { console.log(`  FAIL ${n}${x ? '\n       ' + x : ''}`); fail++; } };
const G = Object.keys(GLAZES), P = Object.keys(POSITIONS);

// ---------------------------------------------------------------------------
console.log('every glaze states what it wants (§19.5 — no hidden variables)');
// ---------------------------------------------------------------------------
{
  ok('every glaze has a want', G.every(g => WANTS[g]));
  ok('...and says it in a sentence a person can act on',
     G.every(g => wantsOf(g).line.length > 30 && !/undefined|NaN/.test(wantsOf(g).line)));
  ok('every glaze × shelf pair has a verdict and a reason',
     G.every(g => P.every(p => { const f = fit(g, p); return ['good','ok','bad'].includes(f.rank) && f.why.length > 5; })));
}

// ---------------------------------------------------------------------------
console.log('\nit gives a DIRECTION, never a solution');
// ---------------------------------------------------------------------------
{
  // ⚠️ a glaze with no good shelf gives the player nothing to reason about;
  // a glaze where everything is good removes the decision entirely.
  const opinionated = G.filter(g => !isFlexible(g));
  for (const g of opinionated) {
    const s = spread(g);
    ok(`${GLAZES[g].name} has somewhere it wants to be`, s.good >= 1, JSON.stringify(s));
  }
  ok('...and nothing is good everywhere',
     opinionated.every(g => spread(g).good <= 4), JSON.stringify(opinionated.map(g => [g, spread(g).good])));

  // the flexible ones are flexible ON PURPOSE — rutile wants a slow COOL, which is
  // a firing decision, not a shelf. Saying so identifies the pieces you can spend.
  const flex = G.filter(isFlexible);
  ok('the ones that do not care are named as such', flex.length > 0 && flex.includes('clear'), flex.join(','));
  ok('...and they say so rather than faking a recommendation',
     flex.every(g => /does not mind|dull in the dead corner/.test(fit(g, 'middle').why + fit(g, 'deadcorner').why)));
}

// ---------------------------------------------------------------------------
console.log('\nthe copper conflict — §7.1 calls it the best teaching mechanic here');
// ---------------------------------------------------------------------------
{
  ok('copper red wants the reducing shelves', fit('copperred', 'flamelane').rank === 'good');
  ok('oribe is RUINED there', fit('oribe', 'flamelane').rank === 'bad', fit('oribe','flamelane').why);
  ok('oribe wants the oxidising back top', fit('oribe', 'backtop').rank === 'good');
  ok('...and copper red is ruined THERE', fit('copperred', 'backtop').rank === 'bad');
  ok('the two are opposites on every shelf that matters',
     ['flamelane','frontmid','backtop'].every(p =>
       fit('copperred', p).rank !== fit('oribe', p).rank));
  ok('and the reason names the chemistry, not a number',
     /oxidis/.test(fit('oribe','backtop').why) && !/\d/.test(fit('oribe','backtop').why),
     fit('oribe','backtop').why);
}

// ---------------------------------------------------------------------------
console.log('\nthe dead corner is honest about itself');
// ---------------------------------------------------------------------------
{
  ok('nothing opinionated does well in the dead corner',
     G.filter(g => !isFlexible(g)).every(g => fit(g, 'deadcorner').rank !== 'good'));
  ok('...and it says why', /cold and still|dull/.test(fit('tenmoku','deadcorner').why));
  ok('the ash glaze wants flame contact', fit('ash','flueshelf').rank === 'good' || fit('ash','flamelane').rank === 'good');
}

// ---------------------------------------------------------------------------
console.log('\nnothing here scores a POT (§4.4)');
// ---------------------------------------------------------------------------
{
  // fit() takes a glaze KEY and a shelf, never a fired pot — it judges the plan
  ok('fit takes a plan, not a pot', fit.length === 2);
  ok('no verdict is a number the player sees',
     G.every(g => P.every(p => typeof fit(g,p).rank === 'string')));
  ok('a shelf verdict never mentions quality or stars',
     G.every(g => P.every(p => !/quality|score|star|\/5|rating/i.test(fit(g,p).why))));
}

// ---------------------------------------------------------------------------
console.log('\nevery shelf is a DIFFERENT shelf (§5.4)');
// ---------------------------------------------------------------------------
{
  // ⚠️ this existed because it FAILED: a threshold ladder in main.js collapsed
  // front middle, front top and back middle onto the identical string
  // 'good atmosphere.' — a third of the kiln was not a choice at all.
  ok('every shelf says something about itself', P.every(p => POSITIONS[p].hint));
  const hints = P.map(p => POSITIONS[p].hint);
  ok('...and no two shelves say the same thing', new Set(hints).size === P.length,
     hints.filter((h,i) => hints.indexOf(h) !== i).join(' | '));
  ok('...in words, never numbers', hints.every(h => !/\d/.test(h)));

  // the line has to be true of the numbers sitting beside it
  const hottest = P.reduce((a,b) => POSITIONS[a].heat > POSITIONS[b].heat ? a : b);
  const coldest = P.reduce((a,b) => POSITIONS[a].heat < POSITIONS[b].heat ? a : b);
  const oxid    = P.reduce((a,b) => POSITIONS[a].red  < POSITIONS[b].red  ? a : b);
  const ashiest = P.reduce((a,b) => POSITIONS[a].ash  > POSITIONS[b].ash  ? a : b);
  ok('the hottest shelf says so', /hot/.test(POSITIONS[hottest].hint), hottest);
  ok('the coldest shelf says so', /cold|cool/.test(POSITIONS[coldest].hint), coldest);
  ok('the oxidising shelf says so', /oxidis/.test(POSITIONS[oxid].hint), oxid);
  ok('the flue shelf names what the fire carries past it',
     /flame|fire/.test(POSITIONS[ashiest].hint), ashiest);
  ok('the flat shelf admits it is unremarkable',
     /unspectacular|even|honest/.test(POSITIONS[P.find(p => POSITIONS[p].heat === 0 && POSITIONS[p].red === 0)].hint));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
