// THE KILN — the firing sim. §24 step 4.
// DOM-free, Node-importable, deterministic, seeded. NO Math.random in here, ever.
// Three controls, twelve hours, eight demand windows, one one-way door.
import { FIRE, POSITIONS } from './data.js';

export const lcg = seed => { let s=(seed>>>0)||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; };
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// heat work → the cone that's down. Cones integrate time AND temperature, which
// is why the pyrometer lies: the same peak reached slower is more heat work.
// ⚠️ NEVER iterate FIRE.cones with Object.entries and trust the order. JS hoists
// integer-like keys ('1','6','10') ahead of string keys ('012','010'), so the naive
// version reported cone 04 for a firing that reached cone 11. Sort by threshold.
export const CONE_ORDER = Object.entries(FIRE.cones).sort((a,b)=>a[1]-b[1]);
export function coneDown(hw){
  let last=null;
  for(const [c,th] of CONE_ORDER) if(hw>=th) last=c; else break;
  return last;
}
export function conePct(hw, cone){ return hw / FIRE.cones[cone]; }

export function newFiring(seed, load=[]){
  const rng=lcg(seed);
  const pick=a=>a[Math.floor(rng()*a.length)];
  // ⚠️ §4.2 — THE DICE GO IN FRONT OF THE DOOR. These are rolled and SHOWN before
  // a single decision is made. Everything after this point is near-deterministic.
  const cond={ kiln:pick(FIRE.conditions.kiln), draw:pick(FIRE.conditions.draw), fuel:pick(FIRE.conditions.fuel) };

  const S={
    seed, rng, load, cond,
    t:0, temp:FIRE.ambient + (cond.kiln[0]==='warm'?190:0), hw:0, rate:0, atm:0, ratio:1,
    fuel:0, hwRate:0, peakHwRate:0, redHeld:0,
    set:{gas:0,air:4,damper:10}, eff:{gas:0,air:4,damper:10},
    phase:'firing', log:[], touches:0, attended:0,
    win:{ i:0, openAt:null, cur:null, score:{} },
    flags:{ reductionStarted:false, redRun:0, missedReduction:false, blowouts:false, stalled:0, blackSmoke:0 },
    pos:{}, opened:false, openTemp:null,
  };
  for(const k of Object.keys(POSITIONS)) S.pos[k]={ hw:0, red:0, peak:0, coolRate:0 };
  logit(S,'cond',`${cond.kiln[1]} · ${cond.draw[1]} · ${cond.fuel[1]}`);
  return S;
}

function logit(S,kind,text,extra){ S.log.push({ t:Math.round(S.t), kind, text, ...(extra||{}) }); }
export const hhmm = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.round(t)%60).padStart(2,'0')}`;

export function setControl(S,k,v){
  const max={gas:FIRE.gasMax,air:FIRE.airMax,damper:FIRE.damperMax}[k];
  const nv=clamp(Math.round(v),0,max);
  if(nv===S.set[k]) return;
  S.set[k]=nv; S.touches++;
  logit(S,'control',`${k} → ${nv}`);
}

export function step(S, dt=FIRE.tick){
  if(S.phase==='open') return S;
  const F=FIRE;

  // ---- control lag. the whole skill of the game lives in these three lines. ----
  for(const k of ['gas','air','damper']){
    const tau=F.lag[k]; S.eff[k]+= (S.set[k]-S.eff[k])*(1-Math.exp(-dt/tau));
  }

  if(S.phase==='cooling'){
    const openness=0.25+S.eff.damper/F.damperMax;
    const r=(F.cool.base+openness*F.cool.ratePerNotch)*(S.temp-F.ambient)/100;
    const prev=S.temp; S.temp=Math.max(F.ambient,S.temp-r*dt); S.rate=-r*60;
    // dunting happens on the way DOWN, through the inversions
    for(const k of Object.keys(S.pos)){
      const p=S.pos[k];
      if((prev>F.cool.duntF&&S.temp<=F.cool.duntF)||(prev>F.cool.duntF2&&S.temp<=F.cool.duntF2))
        p.coolRate=clamp(r/2.6,0,1);
    }
    S.t+=dt; return S;
  }

  // ---- combustion ----
  const fuelCap = F.gasMax * (1 + S.cond.fuel[2]);
  const gas  = Math.min(S.eff.gas, fuelCap);
  S.fuel += gas*dt;                       // gas-minutes burned. the bill is metered, not guessed.
  const need = gas*F.stoich;
  const air  = S.eff.air*F.airPerNotch + S.eff.damper*F.airPerDamper*(1+S.cond.draw[2]);
  const ratio= need>0.001 ? air/need : 4;
  S.ratio=ratio;
  const d = ratio-F.effPeak;
  const combEff = Math.exp(-(d*d)/(2*(d<0?F.effWidthLo:F.effWidthHi)**2));
  // atmosphere: positive is reducing. this is what the flame at the spyhole shows.
  S.atm = clamp(F.effPeak-ratio, -1, 1.3);

  // ---- heat balance ----
  const heatIn = gas*combEff*F.calorific*(1+S.cond.kiln[2]*0.35);
  const above  = Math.max(0,S.temp-F.ambient);
  const flu    = (F.fluLossBase + S.eff.damper*F.fluLossPerNotch*(1+S.cond.draw[2]))*above/100;
  const shell  = F.shellLoss*Math.pow(above/1000,F.shellPow)*1000;  // radiative, derived in tests/calibrate.mjs
  const dT     = (heatIn-flu-shell)/F.thermalMass;
  S.temp = Math.max(F.ambient, S.temp+dT*dt);
  S.rate = dT*60;

  // ---- named perturbation (§19.3: bounded, and NEVER unnamed) ----
  if(S.rng()<0.0012 && S.temp>800){
    const kick=(S.rng()-0.35)*26; S.temp+=kick;
    logit(S,'noise',`burner surge, ${kick>0?'+':''}${kick.toFixed(0)}°`);
  }

  // ---- heat work, global and per position ----
  const hwRate = S.temp>1200 ? Math.exp((S.temp-F.hwT0)/F.hwA) : 0;
  S.hwRate = hwRate; if(hwRate>S.peakHwRate) S.peakHwRate = hwRate;
  if(S.atm>0.30) S.redHeld += dt;         // total minutes actually held in reduction
  const prevHW=S.hw; S.hw += hwRate*dt/60;
  // circulation: air and damper both stir the kiln, which flattens the spread
  const stir = clamp((S.eff.air/F.airMax)*0.6 + (S.eff.damper/F.damperMax)*0.4, 0, 1);
  for(const [k,P] of Object.entries(POSITIONS)){
    const p=S.pos[k];
    const off = P.heat*(1-stir*0.55)*46;                 // °F offset for this shelf
    const pt  = S.temp+off;
    p.peak=Math.max(p.peak,pt);
    p.hw += (pt>1200 ? Math.exp((pt-F.hwT0)/F.hwA) : 0)*dt/60;
    if(S.atm>0.05) p.red += S.atm*(1+P.red*(1-stir*0.4)*0.55)*dt/60;
  }

  // ---- faults, each with an observable precursor (§4.3) ----
  if(S.atm>0.85 && gas>7){ S.flags.blackSmoke+=dt;
    if(S.flags.blackSmoke>25 && S.flags.blackSmoke-dt<=25) logit(S,'fault','black smoke at the chimney — over-reduction'); }
  if(S.temp>2000 && Math.abs(S.rate)<6 && gas>9){ S.flags.stalled+=dt;
    if(S.flags.stalled>40 && S.flags.stalled-dt<=40) logit(S,'fault','stalled. gas is wide open and nothing is moving — try LESS gas'); }

  // ---- THE ONE-WAY DOOR (§6.2) ----
  S.flags.redRun = S.atm>0.30 ? (S.flags.redRun||0)+dt : 0;
  if(!S.flags.reductionStarted && S.flags.redRun>=6) {
    S.flags.reductionStarted=true; logit(S,'beat','reduction begun'); }
  if(!S.flags.missedReduction && !S.flags.reductionStarted &&
      prevHW<F.cones[F.reductionDeadlineCone] && S.hw>=F.cones[F.reductionDeadlineCone]){
    S.flags.missedReduction=true;
    logit(S,'door',`cone 06 went down and you had not begun reducing. there will be no reduction in this firing.`);
  }

  // ---- demand windows (§6.1) ----
  tickWindows(S,dt,prevHW);

  S.t+=dt;
  return S;
}

function trigMet(S,w,prevHW){
  const a=w.at;
  if(a.t!==undefined) return S.t>=a.t;
  if(a.cone!==undefined){
    const th=FIRE.cones[a.cone];
    if(a.off!==undefined) return S.win.doneAt?.[a.cone]!==undefined && S.t>=S.win.doneAt[a.cone]+a.off;
    return S.hw>=th;
  }
  return false;
}

function tickWindows(S,dt,prevHW){
  const W=FIRE.windows;
  // remember when each cone went down, so `off`-triggered windows can chain
  S.win.doneAt=S.win.doneAt||{};
  for(const [c,th] of CONE_ORDER)
    if(prevHW<th && S.hw>=th){ S.win.doneAt[c]=S.t; logit(S,'cone',`cone ${c} is down`); }

  if(S.win.cur){
    const w=W[S.win.i];
    // accumulate whether the demand is being met
    const sc=S.win.score[w.id];
    sc.n++;
    let ok=true;
    if(w.want.gas)    ok = ok && S.set.gas>=w.want.gas[0] && S.set.gas<=w.want.gas[1];
    if(w.want.damper) ok = ok && S.set.damper>=w.want.damper[0] && S.set.damper<=w.want.damper[1];
    if(w.want.atm)    ok = ok && S.atm>=w.want.atm[0] && S.atm<=w.want.atm[1];
    if(w.want.rate)   ok = ok && S.rate>=w.want.rate[0] && S.rate<=w.want.rate[1];
    if(ok) sc.good++;
    if(S.t-S.win.openAt>=w.hold){
      sc.pct=sc.good/Math.max(1,sc.n);
      const pass=sc.pct>=0.55;
      logit(S, pass?'beat':'miss', pass?`${w.name}: held (${Math.round(sc.pct*100)}%)`:`${w.name}: ${w.miss} (${Math.round(sc.pct*100)}%)`);
      S.win.cur=null; S.win.i++;
    }
    return;
  }
  if(S.win.i>=W.length){
    if(S.phase==='firing' && S.set.gas===0){ S.phase='cooling'; logit(S,'beat','burners off. damper shut. now it cools.'); }
    return;
  }
  const w=W[S.win.i];
  if(trigMet(S,w,prevHW)){
    S.win.cur=w.id; S.win.openAt=S.t; S.win.score[w.id]={n:0,good:0,pct:0};
    logit(S,'window',`${w.name}`);
  }
}

// ---------------------------------------------------------------------------
// What each pot in the load actually experienced. This is what feeds the
// generator — so a pot's surface is a REPORT, not a roll. (§4.2, §11)
// ---------------------------------------------------------------------------
export function harvest(S){
  const cone10=FIRE.cones['10'];
  return S.load.map((item,i)=>{
    const p=S.pos[item.pos]||S.pos.middle;
    const heat = clamp(p.hw/cone10, 0, 1.9);
    const redRaw = S.flags.missedReduction ? p.red*0.18 : p.red;
    const red  = clamp(redRaw/3.2, 0, 1.3);
    const cool = clamp(p.coolRate + (S.opened&&S.openTemp>FIRE.cool.targetOpenF ? 0.55 : 0), 0, 1);
    return { ...item, heat, red, cool, pos:item.pos,
             seed:(S.seed ^ ((i+1)*2654435761))>>>0 };
  });
}

export function openKiln(S){
  S.opened=true; S.openTemp=S.temp;
  if(S.temp>FIRE.cool.targetOpenF)
    logit(S,'fault',`opened at ${Math.round(S.temp)}°F. that is too hot and you knew it.`);
  else logit(S,'beat',`opened at ${Math.round(S.temp)}°F.`);
  S.phase='open'; return S;
}

// ---------------------------------------------------------------------------
// The policy bot. A scripted mid-skill potter who steers ATMOSPHERE, not knobs —
// which is what a real one does, and what makes the harness robust to retuning.
// soak + trial drive this, so the harness always exercises the real code path.
// ---------------------------------------------------------------------------
const STAGE = [
  // per window. atm=steer atmosphere · damper=hold a position · rate=throttle gas to a climb rate
  { gas:2,  damper:9            },   // candle      — low and open. atmosphere is irrelevant.
  { gas:8,  rate:340, atm:-0.15 },   // the climb   — hold ~150F/hr by throttling gas
  { gas:10, atm: 0.60           },   // BODY REDUCTION
  { gas:11, atm:-0.05, rate:210 },   // reoxidise & climb
  { gas:12, atm: 0.45           },   // glaze reduction
  { gas:12, atm: 0.12           },   // the approach
  { gas:10, atm: 0.15, rate:0   },   // the soak    — hold, don't climb
  { gas:6,  atm:-0.25           },   // clean-up
];

export function soakRun(seed, opts={}){
  const P={ sloppy:0, skipReduction:false, gasBias:0, atmBias:0, ...opts };
  const load=opts.load || defaultLoad();
  const S=newFiring(seed, load);
  const R=lcg(seed^0xC0FFEE);
  const j=n=>P.sloppy?(R()-0.5)*2*P.sloppy*n:0;

  let guard=0;
  while(S.phase==='firing' && guard++ < 4000){
    const st=STAGE[Math.min(S.win.i,STAGE.length-1)];
    // gas: either a fixed setting, or throttled to hold a climb rate
    if(st.rate!==undefined){
      const err=st.rate-S.rate;
      setControl(S,'gas', S.set.gas + (Math.abs(err)>22 ? Math.sign(err) : 0));
    } else setControl(S,'gas', st.gas+P.gasBias+j(2));
    if(st.damper!==undefined) setControl(S,'damper', st.damper);
    if(st.atm!==undefined){
      let wantAtm=st.atm+P.atmBias+j(0.25);
      if(P.skipReduction && wantAtm>0) wantAtm=-0.2;
      // proportional steering: atmosphere is set by AIR and DAMPER against the gas.
      const err=wantAtm-S.atm;
      if(Math.abs(err)>0.06){
        setControl(S,'damper', S.set.damper - Math.sign(err)*Math.max(1,Math.round(Math.abs(err)*5)));
        if(S.set.damper<=0 || S.set.damper>=FIRE.damperMax)
          setControl(S,'air', S.set.air - Math.sign(err)*1);
      }
    }
    // shut down when cone 10 is down and the soak has been served. Running past
    // that is how you overfire — and it pins every shelf at the same ceiling.
    if(S.win.i>=FIRE.windows.length){
      setControl(S,'gas',0); setControl(S,'damper',0);
      if(S.set.gas===0 && S.eff.gas<0.6){ S.phase='cooling'; }
    }
    step(S);
    if(S.t>1020) break;
  }
  // force the phase — otherwise a firing that bailed on the guard keeps HEATING
  // through the cool loop and runs for three hundred sim-hours.
  S.phase='cooling'; setControl(S,'gas',0); setControl(S,'damper',0);
  let c=0; while(S.temp>FIRE.cool.targetOpenF && c++<4000) step(S,4);
  openKiln(S);
  const pots=harvest(S);
  return {
    seed, fired:S.t, cone:coneDown(S.hw), hw:+S.hw.toFixed(1), peak:Math.round(S.pos.middle.peak),
    missedRed:S.flags.missedReduction, touches:S.touches,
    windows:Object.fromEntries(Object.entries(S.win.score).map(([k,v])=>[k,+(v.pct||0).toFixed(2)])),
    pots: pots.map(p=>({pos:p.pos, heat:+p.heat.toFixed(3), red:+p.red.toFixed(3), cool:+p.cool.toFixed(3)})),
    logLen:S.log.length, S,
  };
}

export function defaultLoad(){
  const P=Object.keys(POSITIONS);
  return P.map((pos,i)=>({ pos, glaze:['tenmoku','celadon','copperred','shino','chun','ash','rutile','clear','oribe'][i],
                           form:['teabowl','yunomi','mug','widebowl','plate','bottle','jar','vase','mug'][i], owner:'studio' }));
}
