// THE KILN — soak. `node tests/soak.mjs [nSeeds]`
// A green check is not a balanced game. READ THE DISTRIBUTIONS.
import { soakRun, coneDown, newFiring, step, setControl, harvest } from '../kiln/sim.js';
import { FIRE } from '../kiln/data.js';

const N = +(process.argv[2]||24);
const t0=Date.now(); let fail=0;
const say=(ok,msg)=>{ console.log((ok?'  ok   ':'  FAIL ')+msg); if(!ok) fail++; };

const runs=[];
for(let i=0;i<N;i++){ const seed=101+i*37; try{ runs.push(soakRun(seed)); }
  catch(e){ say(false,`seed ${seed} threw: ${e.message}`); } }

say(runs.length===N, `${runs.length}/${N} firings completed without throwing`);

// --- determinism: the same seed twice must be byte-identical ---
const fp=r=>[r.cone,Math.round(r.fired),r.hw,r.peak,r.missedRed,r.touches,
             ...r.pots.map(p=>`${p.pos}:${p.heat}:${p.red}:${p.cool}`)].join('|');
say(fp(soakRun(999))===fp(soakRun(999)), 'determinism — soakRun(999) twice is identical');
say(fp(soakRun(999))!==fp(soakRun(1000)), 'different seeds give different firings');

// --- the one-way door is real and irreversible ---
// Drive it by hand rather than through the bot: a fast gas ramp genuinely does go
// transiently rich, which is realistic but makes the bot a poor instrument here.
{ const S=newFiring(999, []);
  // gas 10 / air 8 / damper 5 → ratio 1.11, comfortably oxidising, and it climbs.
  // (damper wide at 10 throws so much heat up the flue the kiln plateaus at 1270F
  //  and never reaches cone 06 at all — which is itself a true thing about kilns.)
  setControl(S,'air',8); setControl(S,'damper',5);
  for(let i=0;i<900 && !S.flags.missedReduction; i++){ setControl(S,'gas',10); step(S); }
  say(S.flags.missedReduction===true, 'held oxidising past cone 06 → the door shuts');
  // and it does NOT reopen: reduce as hard as you like afterwards
  setControl(S,'air',0); setControl(S,'damper',0);
  for(let i=0;i<300;i++) step(S);
  say(S.flags.missedReduction===true, '...and no amount of later reduction reopens it');
  // The honest claim is comparative, not absolute: five hours of late reduction does
  // put SOME reduction on the glazes — what you lost is the body reduction, and you
  // lost it permanently. So measure it against a firing that reduced on time.
  const missed=harvest({...S, load:[{pos:'middle'}]})[0];
  const onTime=soakRun(999).pots.find(p=>p.pos==='middle');
  say(missed.red < onTime.red*0.55,
      `missed reduction costs most of it — ${missed.red.toFixed(2)} vs ${onTime.red.toFixed(2)} on time`); }
say(soakRun(999).missedRed===false, 'steering normally does not trip the door');

// --- position is chemistry: shelves must actually differ ---
const r0=runs[0];
const heats=r0.pots.map(p=>p.heat), spread=Math.max(...heats)-Math.min(...heats);
say(spread>0.03, `kiln geography — heat spread across shelves = ${spread.toFixed(3)} (must be >0.03)`);
const cool=r0.pots.find(p=>p.pos==='coolbottom'), flame=r0.pots.find(p=>p.pos==='flamelane');
say(cool.heat<flame.heat, 'the cool bottom really is cooler than the flame lane');

// --- control lag is present and is not instant ---
{ const S=newFiring(7,[]); setControl(S,'gas',12);
  step(S,1); const after1=S.eff.gas; for(let i=0;i<30;i++) step(S,1);
  say(after1<3 && S.eff.gas>9, `control lag — gas reads ${after1.toFixed(1)} after 1min, ${S.eff.gas.toFixed(1)} after 30`); }

// --- every fault in the log is a named one ---
const kinds=new Set(runs.flatMap(r=>r.S.log.map(l=>l.kind)));
say([...kinds].every(k=>['cond','control','beat','miss','window','cone','fault','door','noise'].includes(k)),
    `log kinds are all named: ${[...kinds].join(', ')}`);
say(runs.every(r=>r.S.log.every(l=>l.text&&l.text.length)), 'no unnamed log entries — nothing is silent noise');

// --- distributions. this is the part you actually read. ---
const dist={};
for(const r of runs) dist[r.cone]=(dist[r.cone]||0)+1;
console.log('\n  cone reached :', Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}×${v}`).join('  '));
const hrs=runs.map(r=>r.fired/60);
console.log('  firing hours :', `min ${Math.min(...hrs).toFixed(1)}  mean ${(hrs.reduce((a,b)=>a+b,0)/hrs.length).toFixed(1)}  max ${Math.max(...hrs).toFixed(1)}`);
for(const w of FIRE.windows){
  const v=runs.map(r=>r.windows[w.id]).filter(x=>x!==undefined);
  const held=v.filter(x=>x>=0.55).length;
  console.log(`  ${w.name.padEnd(22)} reached ${String(v.length).padStart(2)}/${N}  held ${String(held).padStart(2)}  mean ${(v.reduce((a,b)=>a+b,0)/(v.length||1)).toFixed(2)}`);
}
console.log(`\n${fail?`${fail} FAILED`:'all checks passed'} — ${N} firings in ${Date.now()-t0}ms`);
process.exit(fail?1:0);
