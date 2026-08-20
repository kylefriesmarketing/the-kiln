// Event census — proves the render-gate weaknesses actually moved.
// ⚠️ stride matters: G[(i*3)%9] only ever hits 3 of 9 glazes (gcd(3,9)=3) and four
// events read as dead. Keep strides COPRIME to the list length.
// Not a pass/fail gate: a DISTRIBUTION you read. (README: "a green check is not a balanced game")
import { firePot } from '../kiln/pot.js';
import { GLAZES, FORMS, POSITIONS } from '../kiln/data.js';
const G=Object.keys(GLAZES), F=Object.keys(FORMS), P=Object.keys(POSITIONS);
const c={}; let n=0;
for(let i=0;i<1800;i++){
  const p=firePot((i*2654435761)>>>0,{ form:F[i%F.length], glaze:G[i%G.length], pos:P[(i*5)%P.length],
    heat:0.55+((i*7)%40)/60, red:((i*11)%30)/22, cool:((i*13)%37)/37 });
  n++; for(const e of p.events) c[e.k]=(c[e.k]||0)+1;
}
console.log(`${n} pots, evenly swept across glaze × form × position × firing\n`);
for(const [k,v] of Object.entries(c).sort((a,b)=>b[1]-a[1]))
  console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}  ${(v/n*100).toFixed(1)}%`);
const ALL=['break','run','pool','harefur','oilspot','carbontrap','crawl','craze','flashing','ashfly','kilnkiss','pinhole','blister','crystal','shadow','dunt'];
const miss=ALL.filter(k=>!c[k]);
console.log('\n'+(miss.length?'⚠️ NEVER FIRED: '+miss.join(', '):'all 16 events fire.'));

// ---- the potter's hand: does thickness actually drive crawl/run/pool? (§12.1) ----
console.log('\nthick    crawl    run    pool   (cold shelves only — crawl needs a cool position)');
for(const thick of [0, 0.12, 0.25, 0.38]){
  const k={crawl:0,run:0,pool:0}; let m=0;
  for(let i=0;i<900;i++){
    const p=firePot((i*40503+7)>>>0,{ form:F[i%F.length], glaze:G[i%G.length],
      pos:['coolbottom','deadcorner','middle'][i%3], thick,
      heat:0.6+((i*7)%40)/60, red:((i*11)%30)/22, cool:((i*13)%37)/37 });
    m++; for(const e of p.events) if(k[e.k]!==undefined) k[e.k]++;
  }
  console.log(`  +${thick.toFixed(2)}  ${(k.crawl/m*100).toFixed(1).padStart(5)}%  ${(k.run/m*100).toFixed(1).padStart(5)}%  ${(k.pool/m*100).toFixed(1).padStart(5)}%`);
}
