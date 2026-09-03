// THE KILN — the game. Phase machine, UI, save.
// The sim is in sim.js and knows nothing about the DOM. This file is the only
// place that touches document, and the only place Math.random is allowed.
import * as THREE from 'three';
import { FIRE, FORMS, GLAZES, POSITIONS, EVENT_NAMES, ZONE_NAMES, ECON, MOOD, CLIENTS, GUIDE, PRIMER,
         INSTRUMENTS, REFIRE, GLOW, COOLING, OPENING, WEAR, CERTAINTY, KILN_GODS,
         FEN as FEN_DATA } from './data.js';
import { judge, counterfactuals, settle, offerCommissions } from './verdict.js';
import { ensureKiln, shelfMods, drawShift, canTake, wearFrom, repairShelf,
         describeShelf, kilnSummary, drawTrial } from './kiln.js';
import { rareOf, rareById, allRares, luckBias, ensureLuck, scoreNight, tickLuck } from './rare.js';
import { arcState, arcLine, memberSlots, pendingLesson, teach as teachFen, fenReady,
         fenPolicy, fenOutcome, ensureFen } from './arc.js';
import { logReading, truthOf, ensure as nbEnsure, isConfirmed, pagesFor,
         confirmedCount, totalInstruments, refirable } from './notebook.js';
import { newFiring, step, setControl, harvest, openKiln, coneDown, CONE_ORDER, hhmm, lcg } from './sim.js';
import { makePot, nameOf, firePot, drawPotFlat } from './pot.js';
import * as A from './audio.js';

const $ = s => document.querySelector(s);
const el = (t,c,h)=>{ const n=document.createElement(t); if(c)n.className=c; if(h!==undefined)n.innerHTML=h; return n; };
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------------------------------------------------------------------
// SAVE — deep-default migration, never a version wall. (§20)
// ---------------------------------------------------------------------------
const KEY='kiln-save';
const DEFAULTS={ started:true, firings:0, pots:[], broken:0, effects:{}, notebook:{},
                 members:{}, kiln:{scars:0}, settings:{mute:false},
                 money:ECON.startMoney, comDone:{}, ledger:[], taught:{}, carry:[],
                 rares:{}, luck:{dry:0,rich:0}, god:null, gods:[], fen:{here:false,taught:{},fired:false,met:false} };
// ⚠️ BUG FIXED (M1): an EMPTY object default ({} — effects, notebook, members, comDone)
// recursed into mergeDefaults(saved, {}), whose loop over Object.keys({}) does nothing,
// so it returned {} and silently WIPED the saved value on every reload. "17/16 effects
// seen" reset to zero every time the page was refreshed and nobody noticed because
// nothing else read those dicts yet. A free-form dict has no keys to merge — take it whole.
function mergeDefaults(s,d=DEFAULTS){ const o={...d};
  for(const k of Object.keys(d)){ if(s&&s[k]!==undefined)
    o[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])&&Object.keys(d[k]).length)
      ? mergeDefaults(s[k],d[k]) : s[k]; }
  return o; }
let SAVE=(()=>{ try{ return mergeDefaults(JSON.parse(localStorage.getItem(KEY)||'{}')); }
                catch(e){ return mergeDefaults({}); } })();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(SAVE)); }catch(e){} };

// ---------------------------------------------------------------------------
// THE STUDIO — eight members and you. (§14.2, §12.1)
// ---------------------------------------------------------------------------
const MEMBERS=[
  {id:'ruthie',    n:'Ruthie',     likes:'celadon',   makes:['widebowl','plate'],  line:'been here longest. fires nothing. gave you the job and never mentions it.'},
  {id:'marguerite',n:'Marguerite', likes:'copperred', makes:['bottle'],            line:'the same tall bottle, over and over, nearly right.'},
  {id:'desmond',   n:'Desmond',    likes:'shino',     makes:['mug','yunomi'],      line:'glazes everything like he is frosting it.'},
  {id:'hoa',       n:'Hoa',        likes:'clear',     makes:['mug','yunomi'],      line:'forty mugs at a time. wants reliability, finds the mystique tiresome.'},
  {id:'bram',      n:'Bram',       likes:'ash',       makes:['vase','jar'],        line:'makes enormous things and never asks whether they fit.'},
  {id:'ines',      n:'Ines',       likes:'chun',      makes:['teabowl','yunomi'],  line:'chemistry. tests, notes, a binder.'},
  {id:'sunny',     n:'Sunny',      likes:'oribe',     makes:['teabowl','mug'],     line:'fifteen. better than she should be.'},
  {id:'walt',      n:'Walt',       likes:'rutile',    makes:['plate','widebowl'],  line:'retired. comes for the company.'},
];
const YOURS=['tenmoku','celadon','copperred','oribe','shino','chun','ash','rutile','clear'];

// ---------------------------------------------------------------------------
// GAME STATE
// ---------------------------------------------------------------------------
let G={ phase:'title', S:null, damp:[], slots:{}, sel:null, flag:null,
        speed:1, acc:0, raf:0, results:[], unIdx:0, seed:0,
        offers:[], taken:null, fired:[], verdict:null, bill:null };

function show(id){ document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on')); $('#'+id).classList.add('on'); }

// ---------------------------------------------------------------------------
// TEACHING (§10). Ruthie says a thing ONCE, the first time you reach a screen,
// and then never again — but ? brings the whole primer back forever.
// ⚠️ NOT a tooltip and NOT a modal wall: it is an aside in a person's voice, and
// it never blocks the screen it is explaining. §10 bans tutorials in favour of
// diegetic teaching plus a consultable reference; this is both halves.
// ---------------------------------------------------------------------------
function teach(key, force){
  const g=GUIDE[key]; if(!g) return;
  const host=$('#g-'+key); if(!host) return;
  if(SAVE.taught[key] && !force){ host.classList.remove('on'); return; }
  host.innerHTML=`<div class="gw">${g.who}</div><div class="gt lc">${g.t.replace(/\s+/g,' ').trim()}</div>`;
  const b=el('button','gx lc','right, got it');
  b.onclick=()=>{ A.click(); SAVE.taught[key]=1; save(); host.classList.remove('on'); };
  host.appendChild(b); host.classList.add('on');
}
// ---------------------------------------------------------------------------
// THE NOTEBOOK ITSELF. §10 — the codex, the progression and the fairness artefact,
// all as a side effect of the player's own recorded observations.
// ⚠️ a locked page shows how many times you have LOGGED it and nothing else. Showing
// how close you are would leak correctness one reading at a time and kill the rule.
// ---------------------------------------------------------------------------
function showNotebook(){
  SAVE.notebook=nbEnsure(SAVE.notebook);
  const B=$('#nbbody'); B.innerHTML='';
  $('#nbsub').textContent=`${confirmedCount(SAVE.notebook)} of ${totalInstruments()} instruments settled · ${Object.keys(SAVE.effects).length} of 16 effects seen · ${SAVE.firings} firings`;
  for(const [key,inst] of Object.entries(INSTRUMENTS)){
    const done=isConfirmed(SAVE.notebook,key);
    const st=SAVE.notebook.inst[key];
    const d=el('div','nbpage'+(done?'':' locked'));
    d.innerHTML=`<h3 class="lc">${inst.name}</h3><div class="nbat lc">${inst.at}${done?` · settled on firing ${st.at}`:''}</div>`;
    if(done) for(const line of pagesFor(key)) d.appendChild(el('p','lc',line));
    else d.appendChild(el('p','lc', st.logged
      ? `you have written down ${st.logged} ${st.logged===1?'reading':'readings'} here and not yet settled it. three right in a row and the page fills.`
      : `nothing written here yet. log what you think it is doing while the kiln is running.`));
    B.appendChild(d);
  }
  // what the fire has actually shown you
  const fx=el('div','nbpage');
  fx.innerHTML='<h3 class="lc">what you have seen</h3><div class="nbat lc">the sixteen things a surface can do</div>';
  const chips=el('div','nbchips');
  for(const [k,label] of Object.entries(EVENT_NAMES)){
    const seen=SAVE.effects[k]; const c=el('div','nbchip'+(seen?' on':''), seen?`${label} ×${seen}`:'— — —');
    if(seen) c.title=k; chips.appendChild(c);
  }
  fx.appendChild(chips); B.appendChild(fx);
  // §8 — the landmarks. Six things the fire can do that no ordinary combination
  // reaches. Locked ones show only that they exist, never how to get them: the
  // whole reward is working the combination out.
  const rr=el('div','nbpage');
  rr.innerHTML='<h3 class="lc">what the fire can do</h3><div class="nbat lc">'
    +Object.keys(SAVE.rares).length+' of '+allRares().length+' found</div>';
  for(const r of allRares()){
    const got=SAVE.rares[r.id];
    const d=el('div','nbchip'+(got?' on':''));
    d.style.cssText='display:block;margin-bottom:6px;padding:8px 11px';
    d.innerHTML = got
      ? '<b>'+r.name+'</b> — '+r.of+'<br><span style="color:var(--dim2)">'+r.note
        +' · first on firing '+got.found+(got.n>1?', '+got.n+' since':'')+'</span>'
      : '<span style="color:var(--dim2)">— — — — — not yet</span>';
    rr.appendChild(d);
  }
  B.appendChild(rr);

  // the record
  const rec=el('div','nbpage');
  rec.innerHTML='<h3 class="lc">the record</h3><div class="nbat lc">every firing, and what it cost</div>';
  if(!SAVE.ledger.length) rec.appendChild(el('p','lc','nothing fired yet.'));
  for(const L of [...SAVE.ledger].reverse().slice(0,10))
    rec.appendChild(el('p','lc',`firing ${L.firing} — ${L.com?(L.met?'brief met':'brief missed'):'no commission'} · ${L.net<0?'−$':'+$'}${Math.abs(L.net)}`));
  B.appendChild(rec);
  $('#notebook').classList.add('on');
}
function hideNotebook(){ $('#notebook').classList.remove('on'); }

function showPrimer(){
  const B=$('#primerbody'); B.innerHTML='';
  for(const p of PRIMER){ const d=el('div','pg');
    d.innerHTML=`<h3 class="lc">${p.h}</h3><p class="lc">${p.t.replace(/\s+/g,' ').trim()}</p>`; B.appendChild(d); }
  $('#primer').classList.add('on');
}
function hidePrimer(){ $('#primer').classList.remove('on'); }
let toastT=0;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2600); }

// ---------------------------------------------------------------------------
// 1. CONDITIONS — the dice, in front of the door. (§4.2)
// ---------------------------------------------------------------------------
function startFiring(){
  A.boot(); A.resume();
  G.seed = (SAVE.firings*7919 + 1013904223 + (SAVE.pots.length*31)) >>> 0;
  const rng=lcg(G.seed ^ 0xBEEF);
  G.damp=buildDampRoom(rng);
  G.slots={}; G.sel=null; G.flag=null; G.cracked=false;
  $('#crackwrap').style.display='none';
  $('#b-crack').textContent='crack the door'; $('#b-crack').disabled=false;
  // §5.5 — this is not A kiln, it is YOUR kiln, and it remembers. The wear is an
  // INPUT to the sim, so the firing stays deterministic (tests/kiln.mjs).
  SAVE.kiln=ensureKiln(SAVE.kiln); SAVE.luck=ensureLuck(SAVE.luck);
  G.S=newFiring(G.seed, [], { posMod:shelfMods(SAVE.kiln), flue:drawShift(SAVE.kiln),
                              luck:luckBias(SAVE.luck) });
  G.trial=null; G.rares=[];
  $('#firingno').textContent=`firing ${SAVE.firings+1}`;
  const C=$('#conds'); C.innerHTML='';
  const rows=[['the kiln',G.S.cond.kiln],['the flue',G.S.cond.draw],['the tank',G.S.cond.fuel]];
  for(const [k,c] of rows){
    const d=el('div','cond'); d.appendChild(el('div','k',k));
    d.appendChild(el('div','v lc',c[1]));
    const eff=c[2]===0?'no help, no harm':(c[2]>0?`it will run hot — ${(c[2]*100).toFixed(0)}%`:`it will fight you — ${(c[2]*100).toFixed(0)}%`);
    d.appendChild(el('div','d lc',eff)); C.appendChild(d);
  }
  const sum=G.S.cond.kiln[2]+G.S.cond.draw[2]+G.S.cond.fuel[2]+drawShift(SAVE.kiln);
  drawArc();
  drawKilnState();
  drawGodBox();
  drawBoard();
  $('#moneyline').textContent = `${SAVE.money<0?'−$':'$'}${Math.abs(SAVE.money)} in the tin`;
  $('#condread').textContent = sum>0.15 ? "it'll want less gas than you think tonight."
    : sum<-0.15 ? "this is a slow night. start earlier than feels right, and don't chase it with the gas."
    : "an ordinary night. nothing is doing you any favours and nothing is against you.";
  show('scr-cond'); teach('cond'); teach('board');
}

// ---------------------------------------------------------------------------
// §5.5 — what this kiln has BECOME, said out loud before you commit to anything.
// A wear effect the player cannot read before the door is bricked up would be a
// hidden variable, and §19.5 forbids those.
// §6.4 — and the draw trial, the one way to turn "approximately" into "precisely".
// It costs fuel and half an hour. Information costs production.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// §14.4 — THE KILN GOD. Potters make a small clay figure and set it on the kiln
// for luck, and afterwards it is variously kept, broken, thrown out, or quietly
// left there for years.
// ⚠️⚠️ §19.10 — IT DOES NOTHING. Not +5%, not +1%, not "slightly". It is never
// passed to newFiring, never read by the sim, and never touches a pot. The moment
// it grants anything you have destroyed the only genuinely superstitious thing in
// the design. It exists to be made, to sit there, and to be remembered afterwards.
// ---------------------------------------------------------------------------
function drawGodBox(){
  const B=$('#godbox'); if(!B) return;
  B.innerHTML="";
  B.appendChild(el("div","k","the kiln god"));
  if(SAVE.god){
    B.appendChild(el("div","godmade lc", SAVE.god.name+" is on the arch."));
    B.appendChild(el("div","godline lc", SAVE.god.line));
    return;
  }
  B.appendChild(el("div","godline lc","make something out of the scrap clay and put it on the arch, if you want. it will not help."));
  const row=el("div","godrow");
  for(const g of KILN_GODS){
    const b=el("button","lc",g.name);
    b.onclick=()=>{ A.click(); SAVE.god={...g}; save(); drawGodBox(); };
    row.appendChild(b);
  }
  B.appendChild(row);
}

const fmtPct = v => v===0 ? 'neutral' : (v>0?'+':'') + (v*100).toFixed(0) + '%';

// ---------------------------------------------------------------------------
// §13 — THE ARC. Where you are in this, said plainly, plus whatever Fen wants to
// know tonight. ⚠️ You can only be asked about an instrument you SETTLED in your
// own notebook (§10) — that join is the whole point, and it is why teaching
// arrives as a consequence of learning rather than as a timer.
// ⚠️ §13: "There is no victory." Nothing here counts down to an ending.
// ---------------------------------------------------------------------------
function drawArc(){
  const A2=$('#arcline'); if(!A2) return;
  SAVE.fen=ensureFen(SAVE.fen);
  const a=arcLine(SAVE);
  A2.innerHTML='';
  A2.appendChild(el('div','ah lc',a.head));
  A2.appendChild(el('div','al lc',a.line));

  // Fen's question, if there is one tonight
  const old=$('#lesson'); if(old) old.remove();
  const q=pendingLesson(SAVE);
  if(!q) return;
  const L=el('div','lesson'); L.id='lesson';
  L.appendChild(el('div','lw',FEN_NAME+' asks'));
  L.appendChild(el('div','lq lc',q.ask));
  const row=el('div','lo');
  for(const o of q.opts){
    const b=el('button','lc','“'+o.say+'”');
    b.onclick=()=>{
      A.click();
      const r=teachFen(SAVE,q.key,o.k);
      SAVE.fen=r.fen; save();
      L.querySelector('.lo').remove();
      L.appendChild(el('div','ln lc',r.note));
    };
    row.appendChild(b);
  }
  L.appendChild(row);
  A2.after(L);
}
const FEN_NAME='fen';

function drawKilnState(){
  const K=$('#kilnstate'); if(!K) return;
  K.innerHTML='';
  K.appendChild(el('div','k','the kiln itself'));
  K.appendChild(el('div','ksum lc', kilnSummary(SAVE.kiln) || 'new brick, true shelves, nothing on it yet.'));
  const worn=Object.keys(SAVE.kiln.shelves)
    .map(pos=>({pos, txt:describeShelf(SAVE.kiln,pos)})).filter(x=>x.txt);
  if(worn.length){
    const list=el('div','kwear');
    for(const w of worn){
      const row=el('div','kw lc');
      row.innerHTML='<b>'+POSITIONS[w.pos].name+'</b> — '+w.txt;
      // a warped shelf can be replaced, for money. that is the whole economy (§12.3).
      if(SAVE.kiln.shelves[w.pos].warp>=WEAR.warpBlocksTall){
        const b=el('button','lc','replace it — $'+WEAR.shelfCost);
        b.style.cssText='font-size:11px;padding:3px 9px;margin-left:9px';
        b.onclick=()=>{ A.click(); SAVE.money-=WEAR.shelfCost;
          SAVE.kiln=repairShelf(SAVE.kiln,w.pos); save();
          $('#moneyline').textContent=(SAVE.money<0?'−$':'$')+Math.abs(SAVE.money)+' in the tin';
          drawKilnState(); };
        row.appendChild(b);
      }
      list.appendChild(row);
    }
    K.appendChild(list);
  }
  const t=el('div','ktrial');
  if(G.trial){
    t.appendChild(el('div','tl lc', G.trial.line));
    t.appendChild(el('div','tn lc','the kiln '+fmtPct(G.trial.kiln)+' · the flue '+fmtPct(G.trial.draw)+' · the tank '+fmtPct(G.trial.fuel)));
  } else {
    const b=el('button','lc', CERTAINTY.trial.label+' — $'+CERTAINTY.trial.cost);
    b.onclick=()=>{ A.click(); SAVE.money-=CERTAINTY.trial.cost; save();
      G.trial=drawTrial(G.S, SAVE.kiln);
      $('#moneyline').textContent=(SAVE.money<0?'−$':'$')+Math.abs(SAVE.money)+' in the tin';
      drawKilnState(); };
    t.appendChild(b);
    t.appendChild(el('div','tn lc','ten minutes of burners on an empty kiln tells you exactly what tonight is, instead of roughly.'));
  }
  K.appendChild(t);
}

// The board. Deterministic per firing, so reloading cannot reroll an easier brief.
function drawBoard(){
  G.offers=offerCommissions(SAVE.firings+1, G.seed, SAVE.comDone); G.taken=null;
  const B=$('#board'); B.innerHTML='';
  for(const c of G.offers){
    const cl=CLIENTS[c.client];
    const d=el('div','brief');
    d.innerHTML=`<div class="bt lc">${c.title}</div>
      <div class="bc lc">${cl.n} · ${cl.of}</div>
      <div class="bb lc">${c.brief}</div>
      <div class="bf lc">$${c.fee}</div>
      <div class="bx lc">${cl.taste}</div>`;
    d.onclick=()=>{ A.click(); G.taken = G.taken===c.id ? null : c.id;
      [...B.children].forEach((x,i)=>x.classList.toggle('on', G.offers[i].id===G.taken)); };
    B.appendChild(d);
  }
}

function buildDampRoom(rng){
  const out=[]; let n=0;
  // §4.5 — what you carried out of the last firing to try again. it keeps its
  // history, so a pot that took on the third go says so.
  for(const c of (SAVE.carry||[])){
    out.push({ id:'r'+(n++), form:c.form, glaze:c.glaze, owner:'you', mine:true,
               refires:c.refires||1, thick:0 });
  }
  // three of yours, unglazed — you choose
  for(let i=0;i<3;i++){
    const forms=Object.keys(FORMS);
    out.push({ id:'y'+(n++), form:forms[Math.floor(rng()*forms.length)],
               glaze:YOURS[Math.floor(rng()*YOURS.length)], owner:'you', mine:true });
  }
  // ⚠️ §12.1 — THIS IS PILLAR 4 AND IT IS THE CORE LOOP. A member whose work keeps
  // coming out badly stops leaving it for you, and the only way you find out is that
  // the damp room is emptier. There is no reputation bar. Nobody says "that was not
  // very kind." Do not add a number to this.
  const willing=MEMBERS.filter(m=>(SAVE.members[m.id]?.mood||0) > -3);
  // §13 — early on the studio has barely left you anything. They start leaving
  // work once you have shown you can be trusted with it.
  const pool=[...willing].sort(()=>rng()-0.5).slice(0, memberSlots(SAVE));
  for(const m of pool){
    out.push({ id:'m'+(n++), form:m.makes[Math.floor(rng()*m.makes.length)],
               glaze: rng()<0.72 ? m.likes : YOURS[Math.floor(rng()*YOURS.length)],
               owner:m.id, mine:false,
               // the potter's hand. desmond's pieces crawl and run and it is legible.
               thick: m.id==='desmond' ? MOOD.thickHand : 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. THE LOAD
// ---------------------------------------------------------------------------
function drawLoad(){
  const D=$('#damproom'); D.innerHTML='';
  for(const p of G.damp){
    const placed=Object.values(G.slots).some(x=>x&&x.id===p.id);
    const who = p.mine?'yours':(MEMBERS.find(m=>m.id===p.owner)||{}).n;
    const d=el('div','piece'+(p.tile?' tile':'')+(placed?' placed':'')+(G.sel===p.id?' sel':''));
    d.innerHTML=`<div class="n lc">${p.tile?'test tile':FORMS[p.form].name}${(p.mine&&!p.tile)?" ▾":""}</div>
      <div class="g lc">${GLAZES[p.glaze].name}${p.mine?' ▾':''}</div>
      <div class="o lc">${who}</div>`;
    d.onclick=e=>{ A.click();
      if(p.mine && e.target.classList.contains('g')){
        p.glaze=YOURS[(YOURS.indexOf(p.glaze)+1)%YOURS.length]; drawLoad(); return; }
      // you MADE these three. a brief that asks for wide bowls is unfillable if the
      // game picks your forms for you, so the form cycles too.
      if(p.mine && e.target.classList.contains('n')){
        const F=Object.keys(FORMS); p.form=F[(F.indexOf(p.form)+1)%F.length]; drawLoad(); return; }
      G.sel = G.sel===p.id?null:p.id; drawLoad(); };
    D.appendChild(d);
  }
  const K=$('#kilngrid'); K.innerHTML='';
  for(const [key,P] of Object.entries(POSITIONS)){
    const it=G.slots[key];
    const s=el('div','slot'+(it?' full':'')+(G.flag===key?' flag':''));
    s.innerHTML=`<div class="pn">${P.name}</div>`+
      (it?`<div class="it lc${it.tile?' tile':''}">${it.tile?'test tile':FORMS[it.form].name}</div><div class="ig lc">${it.tile?'pull it later':GLAZES[it.glaze].name}</div>`
         :`<div class="hint lc">${shelfHint(P,key)}</div>`);
    s.onclick=()=>{ A.click(0.5);
      if(G.sel){ const p=G.damp.find(x=>x.id===G.sel);
        // §5.5 — a warped shelf will not sit a tall piece flat, and it says why
        if(!canTake(SAVE.kiln, key, p.form)){
          toast('the '+POSITIONS[key].name+' is warped. nothing that tall will sit flat on it.'); return; }
        for(const k of Object.keys(G.slots)) if(G.slots[k]&&G.slots[k].id===p.id) delete G.slots[k];
        G.slots[key]=p; G.sel=null; }
      else if(it){ G.flag = G.flag===key?null:key; }
      drawLoad(); };
    K.appendChild(s);
  }
  const n=Object.values(G.slots).filter(Boolean).length;
  $('#loadcount').textContent=`${n} of 9 shelves filled · ${G.damp.length-n} still in the damp room`;
  $('#b-brick').disabled = n===0;
  $('#flagname').textContent = G.flag ? `${FORMS[G.slots[G.flag].form].name} on the ${POSITIONS[G.flag].name}` : 'click a placed piece to flag it. it comes out last.';
}
// a shelf that has been WORKED says that first — its general character second
function shelfHint(P, key){
  const worn = key ? describeShelf(SAVE.kiln, key) : '';
  return worn || shelfCharacter(P);
}
function shelfCharacter(P){
  if(P.heat>0.8) return 'hottest. heaviest reduction.';
  if(P.heat<-1.2) return 'cold and still. nothing likes it here.';
  if(P.heat<-0.8) return 'runs cool. crawls things.';
  if(P.red<-0.8) return 'oxidises up here.';
  if(P.ash>0.8) return 'fast air. it dries the surface.';
  if(P.heat===0) return 'even. honest. unspectacular.';
  return 'good atmosphere.';
}

// ---------------------------------------------------------------------------
// §6.4 — TEST TILES. A tile occupies a shelf a pot could have had, and can be
// pulled through the spyhole mid-firing with long tongs for ONE real,
// unambiguous observation of what that shelf has actually been doing.
// That is the trade the bible names: information costs production.
// ---------------------------------------------------------------------------
function addTile(){
  const have=G.damp.filter(p=>p.tile).length;
  if(have>=CERTAINTY.tile.max){ toast('three tiles is plenty. they are taking shelves off you.'); return; }
  A.click(); SAVE.money-=CERTAINTY.tile.cost; save();
  G.damp.push({ id:'tile'+have, tile:true, form:'teabowl', glaze:'clear', owner:'you', mine:false });
  drawLoad();
}

// what the tile actually tells you: what THAT shelf has done, in plain words.
function pullTile(){
  const S=G.S;
  const entry=Object.entries(G.slots).find(([,v])=>v&&v.tile&&!v.pulled);
  if(!entry){ $('#b-pull').style.display='none'; return; }
  const [pos,tile]=entry; tile.pulled=true;
  const p=S.pos[pos]||S.pos.middle;
  const cone=coneDown(p.hw);
  const atm = S.atm>0.85?'over-reduced, and smoking' : S.atm>0.30?'properly reducing'
            : S.atm>0.08?'about neutral' : 'burning clean — no reduction there at all';
  A.doorCrack();
  toast('tile out of the '+POSITIONS[pos].name+': '+(cone?'cone '+cone+' down':'no cone down yet')+', '+atm+'.');
  // it goes in the log too, because §4.3 says nothing important should be transient
  S.log.push({ t:Math.round(S.t), kind:'beat',
    text:'pulled a tile from the '+POSITIONS[pos].name+' — '+(cone?'cone '+cone+' down':'no cone down')+', '+atm });
  lastLog=Math.min(lastLog,S.log.length-1);
  paintLog();
  if(!Object.values(G.slots).some(v=>v&&v.tile&&!v.pulled)) $('#b-pull').style.display='none';
}

function autoStack(){
  const free=G.damp.filter(p=>!Object.values(G.slots).some(x=>x&&x.id===p.id));
  const keys=Object.keys(POSITIONS).filter(k=>!G.slots[k]);
  for(let i=0;i<Math.min(free.length,keys.length);i++) G.slots[keys[i]]=free[i];
  A.click(); drawLoad();
}

// ---------------------------------------------------------------------------
// 3. THE FIRE
// ---------------------------------------------------------------------------
const CTRL=[['gas','gas valve',FIRE.gasMax],['air','primary air',FIRE.airMax],['damper','the damper',FIRE.damperMax]];
let lastLog=0;

function beginFire(){
  const load=Object.entries(G.slots).filter(([,v])=>v).map(([pos,v])=>({...v,pos}));
  G.S.load=load;
  buildCtrls(); $('#log').innerHTML=''; lastLog=0;
  G.speed=FIRE.pace.attend; G.lastT=0; drawSpeed();
  A.burnersOn();
  // ⚠️ this is the note that matters most — control lag and the one-way door are the
  // two things a first-timer cannot possibly infer, and both are unforgiving.
  buildReadRows(); $('#readbox').classList.remove('open');
  $('#b-pull').style.display = Object.values(G.slots).some(v=>v&&v.tile) ? '' : 'none';
  show('scr-fire'); teach('fire'); loop();
}

// ---------------------------------------------------------------------------
// LOGGING A READING (§10). You write down what you believe. The game says
// NOTHING — not a tick, not a colour, not a sound — until three correct in a row
// open the instrument's page for good. Silence is the mechanism, not an oversight.
// ---------------------------------------------------------------------------
function buildReadRows(){
  const R=$('#readrows'); R.innerHTML='';
  for(const [key,inst] of Object.entries(INSTRUMENTS)){
    const done=isConfirmed(SAVE.notebook,key);
    const d=el('div','rinst'+(done?' done':''));
    d.innerHTML=`<div class="rn lc">${inst.name}</div><div class="rk lc">${done?inst.at:inst.ask}</div>`;
    if(done){ d.appendChild(el('div','settled lc','settled — it is in the notebook')); }
    else {
      const row=el('div','ro');
      for(const o of inst.opts){
        const b=el('button','lc',o.label); b.title=o.hint;
        b.onclick=()=>{
          A.click();
          const r=logReading(SAVE.notebook,key,o.k,G.S,SAVE.firings+1);
          SAVE.notebook=r.state; save();
          // ⚠️ the ONLY thing the player may be told is that it was written down.
          // Never surface r.remaining here — that leaks correctness one bit at a time.
          if(r.justConfirmed){
            A.chime(true);
            toast(`${inst.name} — you have it. it is in the notebook now.`);
            buildReadRows();
          } else toast('written down.');
        };
        row.appendChild(b);
      }
      d.appendChild(row);
    }
    R.appendChild(d);
  }
}

function buildCtrls(){
  const C=$('#ctrls'); C.innerHTML='';
  for(const [k,label,max] of CTRL){
    const w=el('div','ctrl');
    w.innerHTML=`<div class="top"><span class="nm">${label}</span><span class="num" id="n-${k}">0</span></div>`;
    const d=el('div','det');
    for(let i=1;i<=max;i++){ const b=el('b'); b.dataset.k=k; b.dataset.v=i;
      b.onclick=()=>{ setControl(G.S,k, G.S.set[k]===i?i-1:i); if(k==='damper')A.damper(); else A.click(); paintCtrls(); };
      d.appendChild(b); }
    w.appendChild(d);
    w.appendChild(el('div','lagnote lc','',''));
    w.querySelector('.lagnote').id='lag-'+k;
    C.appendChild(w);
  }
  paintCtrls();
}
function paintCtrls(){
  for(const [k] of CTRL){
    $('#n-'+k).textContent=G.S.set[k];
    document.querySelectorAll(`.det b[data-k="${k}"]`).forEach(b=>{
      const v=+b.dataset.v;
      b.className = v<=G.S.set[k] ? 'on' : '';
      // ⚠️ the ghost: where your last adjustment is still propagating. §5.3
      if(Math.abs(G.S.eff[k]-G.S.set[k])>0.25 && v<=Math.round(G.S.eff[k]) && v>G.S.set[k]) b.className='eff';
      if(Math.abs(G.S.eff[k]-G.S.set[k])>0.25 && v<=G.S.set[k] && v>Math.round(G.S.eff[k])) b.className='on';
    });
    const d=Math.abs(G.S.eff[k]-G.S.set[k]);
    $('#lag-'+k).textContent = d>0.3 ? `still moving — reads ${G.S.eff[k].toFixed(1)}` : '';
  }
}

// the speeds a player picks, in sim-minutes per real second. "attend" is the one
// the kiln drops you to the moment it wants something.
const SPEEDS=[[FIRE.pace.attend,'attend'],[FIRE.pace.brisk,'brisk'],[FIRE.pace.fast,'skip ahead']];
function drawSpeed(){ const S=$('#speed'); S.innerHTML='';
  for(const [v,l] of SPEEDS){ const b=el('b',G.speed===v?'on':'',l);
    b.onclick=()=>{ G.speed=v; A.click(); drawSpeed(); }; S.appendChild(b); } }

function loop(){
  G.raf=requestAnimationFrame(loop);
  const S=G.S;
  // ⚠️ REAL ELAPSED TIME, not frames. The old version stepped a fixed number of
  // sim-minutes per rAF frame, so the firing ran at 60 sim-min/sec (21 seconds for
  // the whole night) AND ran at half that on a 30fps machine. G.speed is now
  // sim-minutes per real second and the clock is the clock.
  const now=performance.now();
  const dtReal=Math.min(0.25,(now-(G.lastT||now))/1000); G.lastT=now;
  if(S.phase==='firing'||S.phase==='cooling'){
    const before=S.win.cur, beforeLog=S.log.length;
    // chunk to <=1 sim-minute a step so the integration stays as accurate as the
    // headless harness, which always steps 1.
    let rem=dtReal*G.speed*(S.phase==='cooling'?3:1);
    let guard=0;
    while(rem>0 && guard++<600){ const d=Math.min(1,rem); step(S,d); rem-=d; if(S.phase==='open') break; }
    // ⚠️ hard drop to 1× the moment a window opens. The player never watches nothing.
    // §6.1 — hard drop to the attending pace the moment a window opens.
    if(!before && S.win.cur && G.speed>FIRE.pace.attend){
      G.speed=FIRE.pace.attend; drawSpeed(); A.chime(true); toast('the kiln wants something'); }
    if(S.log.length>beforeLog) paintLog();
  }
  if(S.phase==='cooling' && $('#scr-fire').classList.contains('on')){ A.burnersOff(); toCool(); return; }
  if($('#scr-fire').classList.contains('on')) paintFire();
}

function paintFire(){
  const S=G.S;
  $('#clock').textContent = `${hhmm(S.t)} in · ${coneDown(S.hw)?('cone '+coneDown(S.hw)+' down'):'no cones down'}`;
  $('#pyro').textContent = Math.round(S.temp)+'°F';
  $('#pyro').className = 'val'+(S.temp>2200?' warn':'');
  $('#rate').textContent = (S.rate>=0?'+':'')+Math.round(S.rate);
  paintCtrls(); drawSpy(); drawCones();
  const fr=flameRead(S);
  $('#flame1').textContent=fr.a;
  $('#flame2').textContent=fr.b;
  const w=S.win.cur ? FIRE.windows.find(x=>x.id===S.win.cur) : null;
  const box=$('#win');
  if(w){ box.className='window'; $('#winname').textContent=`${w.name}   (${S.win.i+1} of ${FIRE.windows.length})`;
    $('#winwant').textContent=wantText(w);
    $('#winplain').textContent=w.plain||'';
    $('#winbar').style.width=clamp((S.t-S.win.openAt)/w.hold*100,0,100)+'%';
  } else {
    box.className='window idle';
    const nx=FIRE.windows[S.win.i];
    $('#winname').textContent = nx? 'next: '+nx.name : 'the schedule is done';
    $('#winwant').textContent = nx? telegraph(nx) : 'shut the gas and close the damper.';
    $('#winplain').textContent = nx? 'coming up — '+(nx.plain||'') : 'that is the whole schedule. shut it down when you are ready.';
    $('#winbar').style.width='0';
  }
  A.burners(S.eff.gas/FIRE.gasMax, S.atm);
  $('#firehint').textContent = S.flags.missedReduction ? 'the door is shut. there will be no reduction in this firing.' : '';
}
function wantText(w){
  const p=[];
  if(w.want.gas) p.push(`gas ${w.want.gas[0]}–${w.want.gas[1]}`);
  if(w.want.damper) p.push(`damper ${w.want.damper[0]}–${w.want.damper[1]}`);
  if(w.want.atm) p.push(w.want.atm[0]>0.2?'reducing — long orange flame':'clean burn — short blue flame');
  // a range that straddles zero is not a climb rate, it is a HOLD — and printing
  // "climb -18–18°/hr" at the most important moment of the firing helps nobody.
  if(w.want.rate) p.push(w.want.rate[0] < 0
    ? 'hold steady — stop climbing'
    : `climb ${w.want.rate[0]}–${w.want.rate[1]}°/hr`);
  return p.join(' · ');
}
function telegraph(w){
  if(w.at.t!==undefined) return `at ${hhmm(w.at.t)}`;
  if(w.at.cone) return `when cone ${w.at.cone} goes down`;
  return '';
}
function paintLog(){
  const L=$('#log'), S=G.S;
  for(;lastLog<S.log.length;lastLog++){ const e=S.log[lastLog];
    if(e.kind==='control') continue;
    const d=el('div',e.kind,`<span class="t">${hhmm(e.t)}</span>${e.text}`);
    L.appendChild(d);
    if(e.kind==='door'){ A.chime(false); toast('cone 06 went down. no reduction tonight.'); }
  }
  L.scrollTop=L.scrollHeight;
}

// --- the spyhole. the flame IS the readout. ---
function drawSpy(){
  const c=$('#spy'), x=c.getContext('2d'), W=c.width,H=c.height, S=G.S;
  x.fillStyle='#000'; x.fillRect(0,0,W,H);
  const hot=clamp((S.temp-500)/1900,0,1), rich=clamp(S.atm,0,1.2), lean=clamp(-S.atm,0,1);
  // the hole
  // the canvas is 900x520 now; scale everything off its size instead of pixels
  const R=Math.min(W,H);
  const cx=W*0.5, cy=H*0.60, r=R*0.14;
  const g=x.createRadialGradient(cx,cy,2,cx,cy,r*2.4);
  const core = hot<0.25? '#2a0d04' : hot<0.5? '#8a2f06' : hot<0.75? '#e07414' : '#ffd89a';
  g.addColorStop(0,core); g.addColorStop(0.35,`rgba(255,${120+hot*90|0},40,${0.5+hot*0.4})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.beginPath(); x.arc(cx,cy,r*2.4,0,7); x.fill();
  // the flame licking out — long/orange when reducing, short/blue/bushy when lean
  if(S.eff.gas>0.4){
    const t=performance.now()/380;
    const len = R*(0.05 + rich*0.42 + hot*0.10);
    const n = lean>0.25? 11 : 6;
    for(let i=0;i<n;i++){
      const a=-Math.PI/2 + (i/(n-1)-0.5)*(lean>0.25?1.5:0.65);
      const l=len*(0.55+0.45*Math.sin(t*2.1+i*1.7));
      const gr=x.createLinearGradient(cx,cy,cx+Math.cos(a)*l,cy+Math.sin(a)*l);
      const c1 = lean>0.25 ? 'rgba(150,190,255,0.85)' : 'rgba(255,170,60,0.9)';
      const c2 = lean>0.25 ? 'rgba(90,140,255,0)'     : 'rgba(255,90,20,0)';
      gr.addColorStop(0,c1); gr.addColorStop(1,c2);
      x.strokeStyle=gr; x.lineWidth= (lean>0.25? 11 : 6+rich*8)*(R/300); x.lineCap='round';
      x.beginPath(); x.moveTo(cx,cy);
      x.quadraticCurveTo(cx+Math.cos(a)*l*0.5+Math.sin(t*3+i)*(R*0.02), cy+Math.sin(a)*l*0.6,
                         cx+Math.cos(a)*l, cy+Math.sin(a)*l); x.stroke();
    }
  }
  // the brick surround
  x.fillStyle='#000'; x.globalCompositeOperation='destination-over';
  x.fillRect(0,0,W,H); x.globalCompositeOperation='source-over';
  x.strokeStyle='#241f1b'; x.lineWidth=R*0.008; x.beginPath(); x.arc(cx,cy,r,0,7); x.stroke();
}

// ---------------------------------------------------------------------------
// WHAT THE FLAME MEANS, IN WORDS, RIGHT NOW.
// ⚠️ This is the legibility fix (Kyle, 2026-08-19: "doesn't make any sense...
// too literal"). The flame is the real instrument (§6.3) and it is beautiful,
// but "long, orange, licking" only means something if you already do pottery.
// The second line says what that IS and what it is doing to the pots — so a
// player learns the vocabulary by seeing it next to its consequence, rather
// than being handed a glossary.
// ---------------------------------------------------------------------------
function flameRead(S){
  if(S.eff.gas<0.5) return { a:'nothing to see', b:'the burners are as good as off.' };
  if(S.atm>0.85)    return { a:'smoking',        b:'too rich. that is fuel going up the stack and carbon going into the clay.' };
  if(S.atm>0.30)    return { a:'reducing',       b:'long, soft, licking orange. the fire is hungry and it is taking oxygen out of the glaze. this is the part that makes the colours.' };
  if(S.atm>0.08)    return { a:'about neutral',  b:'green-tinted. neither pulling on the glaze nor burning clean.' };
  return              { a:'burning clean',       b:'short, blue and bushy. plenty of air. good for climbing, and it will not reduce anything.' };
}

// --- the cone packs. you read a cone by how far it has bent, not by a number. ---
function drawCones(){
  const c=$('#conecv'), x=c.getContext('2d'), W=c.width,H=c.height, S=G.S;
  x.fillStyle='#0f0d0c'; x.fillRect(0,0,W,H);
  const packs=[{t:'reduction',cs:['012','010','08','06']},{t:'maturity',cs:['6','9','10','11']}];
  const CH=92, base=H-52, pad=34, colW=(W-pad*2)/8;
  packs.forEach((pk,pi)=>{
    const x0=pad+pi*colW*4;
    // the shelf they sit on
    x.strokeStyle='#2b2724'; x.lineWidth=3;
    x.beginPath(); x.moveTo(x0-8,base+2); x.lineTo(x0+colW*4-14,base+2); x.stroke();
    // ⚠️ this was '#3f3ا'.slice(0,7) — a stray Arabic character made it an INVALID
    // colour, canvas silently keeps the previous fillStyle (the background), and both
    // pack labels have been painted invisible since the render gate.
    x.fillStyle='#8d8377'; x.font='18px ui-monospace,monospace';
    x.fillText(pk.t, x0-6, 26);
    pk.cs.forEach((cn,i)=>{
      const th=FIRE.cones[cn], pct=clamp(S.hw/th,0,1.5);
      // standing → soft → half → touching. a cone bends from its base, tip to the right.
      const bend=clamp((pct-0.70)/0.40,0,1);
      const ang=bend*Math.PI*0.47;
      const px=x0+i*colW+colW*0.35, down=pct>=1;
      x.save(); x.translate(px,base); x.rotate(ang);
      x.fillStyle=down?'#d9c49a':'#8d8377';
      x.beginPath(); x.moveTo(-9,0); x.lineTo(9,0); x.lineTo(3,-CH); x.lineTo(-3,-CH); x.closePath(); x.fill();
      x.fillStyle='rgba(0,0,0,0.30)';
      x.beginPath(); x.moveTo(2,0); x.lineTo(9,0); x.lineTo(3,-CH); x.lineTo(1,-CH); x.closePath(); x.fill();
      x.restore();
      x.fillStyle=down?'#d9c49a':'#4e4842'; x.font='20px ui-monospace,monospace';
      x.fillText(cn, px-(cn.length>2?16:10), base+28);
    });
  });
}

// ---------------------------------------------------------------------------
// 4. COOLING — the gate you agree with. (§9.1)
// ---------------------------------------------------------------------------
let coolTick=0;
function toCool(){ cancelAnimationFrame(G.raf); G.raf=0; show('scr-cool'); teach('cool'); A.doorCrack(); }
// ---------------------------------------------------------------------------
// BEAT 1 — THE TICK. §9.2. The kiln cooling, out loud, in the dark, and you can
// leave whenever you want. The cooling takes longer than the firing did and the
// game deliberately lets you sit with that: the anticipation IS the reward, and
// the wait is enforced by a mechanic the player agrees with (dunting), not by a
// designer teasing them. ⚠️ never add a "skip to results" button (§9.1).
// ---------------------------------------------------------------------------
const glowOf = t => GLOW.find(b => t < b.max) || GLOW[GLOW.length-1];

function paintCool(){
  const S=G.S; if(!$('#scr-cool').classList.contains('on')) return;
  $('#cooltemp').textContent=Math.round(S.temp)+'°F';
  const p=clamp(1-(S.temp-FIRE.cool.targetOpenF)/(2300-FIRE.cool.targetOpenF),0,1);
  $('#coolbar').firstElementChild.style.width=(p*100)+'%';
  const safe=S.temp<=FIRE.cool.targetOpenF;
  // the room, keyed to how far down it has come
  const room=(COOLING.find(c=>S.temp<c.max)||COOLING[COOLING.length-1]).t;
  $('#coolnote').textContent = safe
    ? 'cool enough. nothing will crack now. ' + room
    : `${room} open it at ${Math.round(S.temp)}° and you will dunt what you made — and it will be your fault, not the kiln's.`;
  $('#b-open').className='lc'+(safe?' prime':'');
  if(G.cracked) paintCrack();
  // the ticking spreads out as it cools — sparse, irregular, and it slows down
  if(Math.random() < (S.temp>1400?0.10:S.temp>700?0.05:0.018)) A.tick();
}

// ---------------------------------------------------------------------------
// BEAT 2 — CRACK THE DOOR. One brick out. COLOUR TEMPERATURE ONLY, which is the
// one bit of information a potter actually reads first. You get no pot, no name,
// no surface: a sliver of light and what colour it is.
// ⚠️ this is also the only honest moment for the pyrometer. It lies about heat
// work all firing long (§6.3) because heat work is not temperature — but on the
// way down, temperature IS the question, so the number and the colour finally agree.
// ---------------------------------------------------------------------------
function crackDoor(){
  if(!G.cracked){ A.doorCrack(); G.cracked=true; $('#crackwrap').style.display='flex';
    $('#b-crack').textContent='the brick is out'; $('#b-crack').disabled=true; }
  paintCrack();
}
function paintCrack(){
  const S=G.S, g=glowOf(S.temp);
  const peep=$('#peepglow');
  peep.style.setProperty('--gl', g.col);
  peep.style.setProperty('--glo', g.lit.toFixed(2));
  $('#crackname').textContent=g.name;
  $('#crackline').textContent=g.line;
  const safe=S.temp<=FIRE.cool.targetOpenF;
  const v=$('#crackverdict');
  v.className=safe?'cok lc':'cwarn lc';
  v.textContent=safe
    ? 'black, and cool enough. you can take the door off.'
    : 'there is still light in there. that is your answer.';
}

// ---------------------------------------------------------------------------
// 5. THE UNLOAD — five beats, flagged piece last. (§9.2)
// ---------------------------------------------------------------------------
let three=null;
function initThree(){
  const cv=$('#potcv');
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  r.setPixelRatio(Math.min(1.5,devicePixelRatio||1)); r.toneMapping=THREE.ACESFilmicToneMapping;
  r.toneMappingExposure=1.15; r.outputColorSpace=THREE.SRGBColorSpace;
  const sc=new THREE.Scene(); sc.background=new THREE.Color(0x0a0908);
  const ec=document.createElement('canvas'); ec.width=512; ec.height=256;
  const ex=ec.getContext('2d'); const g=ex.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#232833'); g.addColorStop(0.5,'#6a5a44'); g.addColorStop(1,'#0e0d0c');
  ex.fillStyle=g; ex.fillRect(0,0,512,256);
  const et=new THREE.CanvasTexture(ec); et.mapping=THREE.EquirectangularReflectionMapping; et.colorSpace=THREE.SRGBColorSpace;
  const pm=new THREE.PMREMGenerator(r); sc.environment=pm.fromEquirectangular(et).texture;
  const key=new THREE.DirectionalLight(0xffd9a8,2.4); key.position.set(-2.4,2.6,2.0); sc.add(key);
  const fill=new THREE.DirectionalLight(0x93b0d0,0.5); fill.position.set(2.8,1.2,-1.4); sc.add(fill);
  sc.add(new THREE.HemisphereLight(0x4a4640,0x141210,0.35));
  const cam=new THREE.PerspectiveCamera(26,1,0.05,100);
  const holder=new THREE.Group(); sc.add(holder);
  three={r,sc,cam,holder,dead:false};
  // a lost context is recoverable as far as the PLAYER is concerned: switch to the
  // flat painter and carry on. Losing the GPU must never cost them the reveal.
  cv.addEventListener('webglcontextlost', e=>{ e.preventDefault(); three.dead=true;
    const p=G.results[G.unIdx];
    if(p) flatPot(p, firePot(p.seed,{form:p.form,glaze:p.glaze,pos:p.pos,heat:p.heat,red:p.red,cool:p.cool,thick:p.thick||0}));
    toast('the renderer dropped out. showing them flat instead.');
  });
  // ⚠️⚠️ THE UNLOAD WAS A BLACK SCREEN, AND THIS IS WHERE IT LIVED. (Kyle, 2026-08-19)
  // The renderer used to be built while #scr-unload was still display:none, so the
  // canvas measured 0×0. That does three separate fatal things at once:
  //   1. setSize(0,0) sets canvas.width=0 — the canvas has NO backing store, which
  //      the browser stretches over the CSS box as pure black.
  //   2. aspect = 0/0 = NaN, so the projection matrix is NaN and nothing projects.
  //   3. the ONLY render() call was inside a requestAnimationFrame loop, so the
  //      first frame was hostage to an async ResizeObserver arriving first.
  // Never size a renderer off a hidden element. Never divide to get an aspect
  // without guarding the denominator. Never let the first frame depend on rAF.
  // ⚠️ measure the BOX, never the canvas. Measuring the canvas means measuring a
  // thing whose size we are about to set, which is how a resize loop starts.
  const box=cv.parentElement;
  let lastW=0, lastH=0;
  const resize=()=>{
    const w=Math.max(160,Math.min(3840, box.clientWidth||960));
    const h=Math.max(120,Math.min(2160, box.clientHeight||620));
    if(w===lastW && h===lastH) return;      // idempotent: a no-op cannot oscillate
    lastW=w; lastH=h;
    r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
  };
  three.resize=resize;
  // observe the BOX, and cap the pixel ratio — a 4K DPR-2 buffer is 33M pixels
  // per pot and this scene does not need it.
  new ResizeObserver(resize).observe(box); resize();
  (function spin(){ requestAnimationFrame(spin);
     if(!document.getElementById('scr-unload').classList.contains('on')) return;
     holder.rotation.y+=0.0035; r.render(sc,cam); })();
}

// ---------------------------------------------------------------------------
// BEAT 3 — OPEN. Everything at once, still warm, and NONE of it in your hands.
// You get the shape and the heat and nothing else — no glaze, no events, no
// names. That is what makes beat 4 worth doing slowly, and it is also true: a
// kiln at 380° is still glowing enough that you cannot read a surface in it.
// ---------------------------------------------------------------------------
function toOpen(){
  openKiln(G.S);
  // a test tile is not a pot — it never reaches the unload (§6.4)
  const raw=harvest(G.S).filter(r=>!r.tile);
  const order=Object.keys(POSITIONS);
  raw.sort((a,b)=>order.indexOf(a.pos)-order.indexOf(b.pos));
  if(G.flag){ const i=raw.findIndex(p=>p.pos===G.flag); if(i>=0) raw.push(raw.splice(i,1)[0]); }
  G.results=raw; G.unIdx=-1; G.fired=[];

  const g=glowOf(G.S.temp);
  $('#openhead').textContent=OPENING.head;
  $('#opensub').textContent=OPENING.sub;
  $('#openline').textContent=OPENING.line;
  const K=$('#openkiln'); K.innerHTML='';
  for(const [key,P] of Object.entries(POSITIONS)){
    const it=G.results.find(r=>r.pos===key);
    const d=el('div','oslot'+(it?'':' empty')+(G.flag===key?' flag':''));
    d.innerHTML=`<div class="opn">${P.name}${G.flag===key?' ★':''}</div>`;
    if(it){
      const glow=el('div','oglow'); glow.style.setProperty('--gl',g.col);
      glow.style.opacity=(0.22+g.lit*0.5).toFixed(2);
      d.appendChild(glow);
      // the FORM and the owner only. never the glaze, never the events. (§9.2 beat 3)
      d.appendChild(el('div','oform lc',FORMS[it.form].name));
      d.appendChild(el('div','owho lc',it.mine?'yours':(MEMBERS.find(m=>m.id===it.owner)||{n:'the studio'}).n));
    }
    K.appendChild(d);
  }
  $('#openflag').textContent = G.flag
    ? `${FORMS[G.slots[G.flag].form].name}, on the ${POSITIONS[G.flag].name}. it comes out last.`
    : OPENING.noflag;
  show('scr-open'); A.doorCrack();
}

function toUnload(){
  // beat 3 already opened the kiln and ordered the shelves — the flagged piece is
  // last and stays last. Re-harvesting here would re-run openKiln and double-log it.
  G.unIdx=-1; G.fired=[];
  // ⚠️ show() FIRST. initThree() measures the canvas, and a display:none canvas
  // measures 0×0 — that was the black screen. Order here is load-bearing.
  show('scr-unload'); teach('unload');
  // ⚠️ never let a GPU failure throw out of here — the unload is the payoff.
  try{ if(!three) initThree(); else three.resize(); }
  catch(e){ console.warn('[the kiln] no webgl, drawing flat:', e.message); three={dead:true}; }
  nextPot();
}

// ---------------------------------------------------------------------------
// The no-GPU path. Same seed, same profile, same ramp, same events — the same
// pot, photographed flat instead of lit. This exists because a lost WebGL
// context used to mean every pot after it was a black rectangle. (Kyle, 08-19)
// ---------------------------------------------------------------------------
function flatPot(p, pot){
  const box=$('#potbox'), fc=$('#potflat');
  box.classList.add('flat');
  const w=Math.max(160,box.clientWidth||900), h=Math.max(120,box.clientHeight||600);
  fc.width=w; fc.height=h;
  drawPotFlat(fc.getContext('2d'), pot, w, h);
}

function nextPot(){
  G.unIdx++;
  if(G.unIdx>=G.results.length){ finish(); return; }
  const p=G.results[G.unIdx];

  // ⚠️ THE POT IS DATA. It exists whether or not a GPU does, so it is computed
  // FIRST and the renderer is only ever asked to draw it. The previous version
  // read the pot back out of mesh.userData, which meant every failure in the 3D
  // path took the name, the events and the provenance down with it — and a lost
  // context turned the entire reveal into a stuck black rectangle. (Kyle, 08-19)
  const opts={ form:p.form, glaze:p.glaze, pos:p.pos,
               heat:p.heat, red:p.red, cool:p.cool, thick:p.thick||0 };
  const pot=firePot(p.seed, opts);
  // §8 — is this one of the six landmarks? Deterministic: a specific, hard,
  // discoverable combination of things you did, never a roll. The name it earns
  // REPLACES the generated one, because that is the whole reward.
  const rare=rareOf(pot, G.S);
  const potName = rare ? `${FORMS[pot.formKey].name} · ${rare.name}` : nameOf(pot);
  if(rare){
    G.rares.push(rare.id);
    if(!SAVE.rares[rare.id]){ SAVE.rares[rare.id]={ found:SAVE.firings+1, n:0 }; }
    SAVE.rares[rare.id].n++;
  }
  const dunted=pot.events.some(e=>e.k==='dunt');

  // draw it — in 3D if there is a live context, flat if there is not. Either way
  // it is the same pot: same seed, same profile, same ramp, same events.
  let drew3D=false;
  const alive = three && !three.dead && three.holder && three.r &&
                !(three.r.getContext && three.r.getContext()?.isContextLost?.());
  if(alive){
    try{
      // dispose the previous pot FIRST. Each owns three 768² canvas textures, and
      // nine undisposed is ~60MB of GPU memory — it took the tab down under swiftshader.
      three.holder.traverse(o=>{ if(o.geometry) o.geometry.dispose();
        if(o.material){ for(const k of ['map','roughnessMap','normalMap']) o.material[k]?.dispose();
          o.material.dispose(); } });
      three.holder.clear();
      const mesh=makePot(p.seed, opts);
      three.holder.add(mesh);
      const hg=mesh.userData.height; mesh.position.y=-hg/2;
      const halfTan=Math.tan(26*Math.PI/360), maxR=mesh.userData.maxR;
      const d=Math.max(hg/2/halfTan,maxR/halfTan)*1.3;
      const squat=Math.min(1,(2*maxR)/Math.max(hg,1e-3)/2.2);
      three.cam.position.set(0,hg*0.10+d*squat*0.5,d*(1-squat*0.18));
      three.cam.lookAt(0,0,0);
      // re-measure, THEN project, THEN draw one frame right now. rAF is suspended in
      // a hidden pane and ResizeObserver is async; neither is reliable for frame one.
      three.resize();
      three.cam.updateProjectionMatrix();
      three.r.render(three.sc, three.cam);
      drew3D=true;
    }catch(e){ console.warn('[the kiln] 3D pot failed, drawing flat:', e.message); if(three) three.dead=true; }
  }
  if(drew3D) $('#potbox').classList.remove('flat');
  else flatPot(p, pot);
  // the verdict judges exactly the objects that came out of the door — same seed,
  // same opts, so this is the pot on screen and not a second roll of it.
  G.fired.push({ mine:!!p.mine, owner:p.owner||'you', form:p.form, glaze:p.glaze,
                 effGlaze:pot.effGlaze, copperFlip:pot.copperFlip, pos:p.pos,
                 events:pot.events, sound:!dunted, name:potName });
  A.potRing(!dunted);
  const owner = p.mine?'yours':(MEMBERS.find(m=>m.id===p.owner)||{n:'the studio'}).n;
  const [form,glaze,...rest]=potName.split(' · ');
  $('#unprog').textContent=`${G.unIdx+1} of ${G.results.length}`;
  $('#beatline').textContent = G.unIdx===G.results.length-1 && G.flag ? '★ the one you were hoping for' : `${POSITIONS[p.pos].name} · ${owner}`;
  $('#potname').textContent=`${form} · ${glaze}`;
  $('#potev').textContent = rest.join(', ')||'plain and sound';
  // a landmark gets its own beat — it is the thing you were hoping for, and the
  // reveal should stop for it rather than let it slide past in a list.
  const rc=$('#potrare');
  if(rare){
    rc.style.display='';
    rc.innerHTML='';
    rc.appendChild(el('div','rl lc', rare.of));
    rc.appendChild(el('div','rn lc', rare.note));
    if(SAVE.rares[rare.id].n===1) rc.appendChild(el('div','rf lc','first one. it is in the notebook now.'));
    A.chime(true);
  } else rc.style.display='none';
  $('#potprov').textContent=provenance(p,pot);
  $('#b-next').textContent = G.unIdx>=G.results.length-1 ? 'that’s the load' : 'take it out';
  // record it. the pot regenerates from seed + firing, never from pixels.
  // §11 — storage is seed + recipe + what the fire did, NEVER pixels, so the pot
  // regenerates identically. heat/red/cool/thick are what firePot needs to rebuild
  // this exact object later; without them the shelf could only approximate it.
  SAVE.pots.push({ seed:p.seed, form:p.form, glaze:p.glaze, eff:pot.effGlaze, pos:p.pos,
                   name:potName, events:pot.events.map(e=>e.k), sound:!dunted,
                   firing:SAVE.firings+1, prov:provenance(p,pot), owner:p.owner||'you',
                   heat:p.heat, red:p.red, cool:p.cool, thick:p.thick||0, refires:p.refires||0 });
  if(dunted) SAVE.broken++;
  for(const e of pot.events) SAVE.effects[e.k]=(SAVE.effects[e.k]||0)+1;
}

function provenance(p,pot){
  const S=G.S, c=coneDown(S.hw);
  const bits=[];
  bits.push(`fired ${S.cond.kiln[1]}, ${S.cond.draw[1]}.`);
  bits.push(S.flags.missedReduction ? 'reduction was missed — cone 06 went down first.'
    : `reduction begun and held.`);
  const soak=S.win.score.soak;
  bits.push(c?`cone ${c} down.`:'no cones down.');
  if(soak&&soak.pct<0.55) bits.push('no soak to speak of.');
  bits.push(`${POSITIONS[p.pos].name} shelf.`);
  if(p.refires) bits.push(p.refires===1?'refired once.':`refired ${p.refires} times.`);
  if(S.opened&&S.openTemp>FIRE.cool.targetOpenF) bits.push(`opened hot, at ${Math.round(S.openTemp)}°.`);
  return bits.join(' ');
}

function finish(){
  SAVE.firings++;
  // the collectible: a firing where nothing broke. (§20)
  // ⚠️ this used to index SAVE.pots by arithmetic on its length, which throws the
  // moment a single pot's push is skipped for any reason. Count what this firing
  // actually produced instead.
  const mine=SAVE.pots.filter(x=>x.firing===SAVE.firings);
  const perfect=mine.length>0 && mine.every(x=>x.sound);
  // §14.4 — the kiln god that sat on the arch through it all. It did nothing,
  // which is the point (§19.10), but it was there and it is remembered.
  if(SAVE.god){ SAVE.gods.push({ ...SAVE.god, firing:SAVE.firings, perfect:false }); SAVE.god=null; }
  if(perfect){ SAVE.kilnGod=true;
    if(SAVE.gods.length) SAVE.gods[SAVE.gods.length-1].perfect=true; toast('nothing broke. the kiln god stays on the arch.'); A.chime(true); }
  drawVerdict(); save(); show('scr-verdict'); teach('verdict');
}

// ---------------------------------------------------------------------------
// 6. THE VERDICT — §4.4, §4.5, §12. In this order, and the order is the point:
//    the pots first (already seen, unscored, kept), THEN the brief, THEN the
//    counterfactual with its lever, THEN what the night cost.
// ⚠️ Nothing on this screen scores an object. It scores a CONTRACT. (§19.6)
// ---------------------------------------------------------------------------
function drawVerdict(){
  const com=G.offers.find(c=>c.id===G.taken)||null;
  const mine=G.fired.filter(p=>p.mine).length;
  const members=G.fired.filter(p=>!p.mine).length;
  const V=com?judge(com,G.fired,G.S):null;
  const bill=settle(G.S,{commission:com,verdict:V,mineCount:mine,memberCount:members});
  G.verdict=V; G.bill=bill;

  SAVE.money+=bill.net;
  if(V&&V.passed) SAVE.comDone[com.id]=1;
  SAVE.ledger.push({ firing:SAVE.firings, net:bill.net, com:com?com.id:null, met:!!(V&&V.passed) });
  SAVE.notebook=nbEnsure(SAVE.notebook);
  applyMoods();
  // §5.5 — and the kiln itself is a different kiln tomorrow because of tonight
  SAVE.kiln = wearFrom(SAVE.kiln, G.fired, G.S);
  // §4.5 — score the night and tick the two-sided protection. Coarse on purpose:
  // this decides nothing the player sees, only whether the invisible floor starts
  // helping. ⚠️ never surface it (§4.3).
  SAVE.luck = tickLuck(SAVE.luck, scoreNight({
    reachedCone10: G.S.hw >= FIRE.cones["10"],
    commissionMet: V ? V.passed : undefined,
    rares: G.rares.length,
    broken: G.fired.filter(p=>!p.sound).length,
    potCount: G.fired.length }));

  $('#vsub').textContent=`firing ${SAVE.firings} · ${G.fired.length} pieces out`;

  // --- the brief, clause by clause ---
  const C=$('#v-com'); C.innerHTML='';
  if(!com){
    C.innerHTML='<h3>the brief</h3><div class="vsay lc">you took no work this firing. the pots are yours and nobody is waiting on them.</div>';
  } else {
    const cl=CLIENTS[com.client];
    C.innerHTML=`<h3>${cl.n} — ${com.title}</h3>`;
    for(const c of V.clauses){
      const d=el('div','clause '+(c.pass?'y':'n'));
      d.innerHTML=`<div class="mk">${c.pass?'✓':'✕'}</div><div><div class="ct lc">${c.text}</div>${c.why?`<div class="cw lc">${c.why}</div>`:''}</div>`;
      C.appendChild(d);
    }
    const say=el('div','vsay lc');
    say.style.marginTop='12px';
    // ⚠️ attributed to a PERSON with taste, never to a universal standard (§4.4)
    say.textContent = V.passed
      ? `${cl.n} took them without comment, which from ${cl.n} is the review.`
      : `${cl.n} is not taking them as the brief. the pots are still yours — they go on the shelf like everything else.`;
    C.appendChild(say);
  }

  // --- the counterfactual, with its lever ---
  const F=$('#v-cf'); F.innerHTML='<h3>the margin</h3>';
  const cfs=counterfactuals(G.S);
  if(!cfs.length) F.innerHTML+='<div class="vsay lc">nothing came down to a margin tonight. the firing did what you told it to.</div>';
  for(const c of cfs){
    const d=el('div','cf');
    d.innerHTML=`<div class="cfw lc">${c.what}</div><div class="cfm lc">${c.margin}</div><div class="cfg lc">${c.magnitude}</div>`;
    F.appendChild(d);
  }

  // --- what the night cost. small, metered, never the score (§12.3) ---
  const L=$('#v-led'); L.innerHTML='<h3>the tin</h3>';
  const row=(k,v,cls)=>{ const d=el('div','led'+(cls?' '+cls:'')); d.innerHTML=`<span>${k}</span><b>${v}</b>`; L.appendChild(d); };
  // ⚠️ a bare '$'+n prints "$-52" when the tin is empty. Sign goes OUTSIDE the symbol.
  const money=v=>(v<0?'−$':'$')+Math.abs(v);
  if(com) row(`${CLIENTS[com.client].n} — ${bill.feeNote}`, (bill.fee?'+':'')+money(bill.fee));
  row(`firing fees · ${members} pieces`, '+'+money(bill.fees));
  row(`gas · ${Math.round(G.S.fuel).toLocaleString()} gas-minutes`, '−'+money(bill.gas));
  row(`clay · ${mine} of your own`, '−'+money(bill.clay));
  row('the night', (bill.net<0?'':'+')+money(bill.net), 'tot'+(bill.net<0?' neg':''));
  row('in the tin', money(SAVE.money), SAVE.money<0?'neg':'');

  // --- §4.5's LEVER. the counterfactual above named the margin; this is the offer.
  // a near-miss you can act on is a lesson. one you can only feel is a taunt. ---
  const RF=$('#v-cf');
  const back=refirable(G.fired,G.S);
  SAVE.carry=[];
  if(back.length){
    const h=el('div','nbpage'); h.style.borderBottom='0'; h.style.marginTop='6px'; h.style.paddingBottom='0';
    h.innerHTML='<h3 class="lc">put it back in</h3><div class="nbat lc">these are not finished. fire them again and try the adjustment.</div>';
    RF.appendChild(h);
    for(const pot of back.slice(0,6)){
      const d=el('div','refire');
      d.innerHTML=`<div class="rfn lc">${pot.name.split(' · ').slice(0,2).join(' · ')}</div>
        <div class="rfw lc">${REFIRE.reasons[pot.why]}</div>`;
      d.onclick=()=>{ A.click();
        const i=SAVE.carry.findIndex(c=>c.name===pot.name);
        if(i>=0) SAVE.carry.splice(i,1);
        else { if(SAVE.carry.length>=REFIRE.maxCarried){ toast(`you can carry ${REFIRE.maxCarried} into the next firing, no more.`); return; }
               SAVE.carry.push({ form:pot.form, glaze:pot.glaze, why:pot.why, refires:(pot.refires||0)+1, name:pot.name }); }
        d.classList.toggle('on', SAVE.carry.some(c=>c.name===pot.name)); save(); };
      RF.appendChild(d);
    }
  }

  // --- §13 — and if you have taught Fen everything you know, they ask for the
  // next one. The firing they run is driven by fenPolicy(), which is built ENTIRELY
  // from what you told them, so the result is honestly yours either way. ---
  // --- the studio. no bar, no number, just who said what. ---
  const T=$('#v-studio'); T.innerHTML='<h3>the studio</h3>';
  const lines=studioLines();
  if(!lines.length) T.innerHTML+='<div class="vsay lc">nobody said anything. they will have looked, though.</div>';
  for(const t of lines){ const d=el('div','vsay lc'); d.style.marginBottom='9px'; d.textContent=t; T.appendChild(d); }

  // --- §13 — and if you have taught Fen everything you know, they ask for the next
  // one. The firing they run is driven by fenPolicy(), built ENTIRELY from what you
  // told them, so the result is honestly yours either way.
  // ⚠️ this must come AFTER the studio block above sets innerHTML, or it is wiped.
  if(fenReady(SAVE)){
    const F2=el('div','lesson'); F2.id='fenbox'; F2.style.marginTop='14px';
    F2.appendChild(el('div','lw','fen'));
    F2.appendChild(el('div','lq lc',FEN_DATA.readyToFire));
    const b=el('button','lc prime','stand at the back and let them');
    b.style.marginTop='12px';
    b.onclick=()=>{ A.click(); runFenFiring(F2); };
    F2.appendChild(b);
    T.appendChild(F2);
  }
}

// ---------------------------------------------------------------------------
// §13 — Fen fires one, and you stand at the back. The policy comes ENTIRELY from
// what you taught them (arc.js fenPolicy), driven through the same sim you use.
// It is not a cutscene and it is not a roll: if they never reduce, it is because
// you told them a short blue flame was a rich fire.
// ⚠️ §13: "There is no victory." What comes back is a paragraph, not a score.
// ---------------------------------------------------------------------------
function runFenFiring(host){
  const p=fenPolicy(SAVE);
  const S=newFiring((G.seed ^ 0x5EED1E)>>>0, [],
    { posMod:shelfMods(SAVE.kiln), flue:drawShift(SAVE.kiln), luck:0 });
  let guard=0;
  while(S.phase==='firing' && guard++<4000){
    setControl(S,'gas', S.win.i<1 ? 2 : p.climbGas);
    if(S.win.i<1) setControl(S,'damper',9);
    else {
      const err=p.reduceTarget - S.atm;
      if(Math.abs(err)>0.06)
        setControl(S,'damper', S.set.damper - Math.sign(err)*Math.max(1,Math.round(Math.abs(err)*5)));
    }
    // taught to read the cones, they stop when the WORK is done; taught to read the
    // dial, they stop on temperature and underfire — exactly as you told them to.
    const done = p.stopOnCones ? S.hw>=FIRE.cones['10'] : S.temp>=2280;
    if(done){ setControl(S,'gas',0); setControl(S,'damper',0); if(S.eff.gas<0.6) S.phase='cooling'; }
    step(S); if(S.t>1020) break;
  }
  S.phase='cooling'; setControl(S,'gas',0); setControl(S,'damper',0);
  let c=0; while(S.temp>FIRE.cool.targetOpenF && c++<40000) step(S,3);
  const out=fenOutcome(SAVE,S);
  SAVE.fen.fired=true; save();

  host.innerHTML='';
  host.appendChild(el('div','lw','fen'));
  host.appendChild(el('div','lq lc',out.line));
  const cone=coneDown(S.hw);
  host.appendChild(el('div','ln lc',
    (cone?'they took it to cone '+cone+'. ':'they never got a cone down. ')
    + (S.flags.missedReduction?'no reduction — the door shut on them at 06. ':'reduction begun and held. ')
    + Object.values(p.knows).filter(Boolean).length+' of the 3 things you told them were right.'));
  const cl=el('div','lq lc',out.close);
  cl.style.cssText='margin-top:14px;color:var(--hot)';
  host.appendChild(cl);
}

// §12.1 — the members remember. Mood is never displayed; it only changes what turns
// up in the damp room, and what somebody says to you afterwards.
function applyMoods(){
  for(const p of G.fired){
    if(p.mine) continue;
    const m=SAVE.members[p.owner]||(SAVE.members[p.owner]={mood:0,fired:0,lost:0});
    m.fired++;
    const ruined=!p.sound;
    const rough=p.events.some(e=>e.k==='crawl'||e.k==='blister');
    if(ruined){ m.lost++; m.mood+=MOOD.bad; }
    else if(rough) m.mood+=MOOD.bad;
    else m.mood+=MOOD.good;
    m.mood=Math.max(MOOD.min,Math.min(MOOD.max,m.mood));
  }
}

// ⚠️ ONE sentence per outcome read as a form letter the moment three people's work
// broke in the same firing — the identical line, three times, one under the other.
// Variants are chosen by a stable hash of the member, so a given person always reacts
// the same way and it reads as character instead of as a shuffle.
// Warm, flat, never moralising: nobody ever says "that was not very kind." (§12.1)
const BROKE_LINES=[
  n=>`${n} picked up the pieces and said it was fine, it was an experiment anyway.`,
  n=>`${n} turned the cracked one over twice, put it in their bag, and said nothing.`,
  n=>`${n} said not to worry about it, in the voice people use when it is worth worrying about.`,
  n=>`${n} asked which shelf it had been on. you told them. they nodded and let it go.`,
];
const WARM_LINES=[
  n=>`${n} left something else in the damp room on the way out.`,
  n=>`${n} said the good one was the best thing out of that kiln in a year, and meant it.`,
  n=>`${n} has started asking when the next firing is before you have finished this one.`,
];
const COLD_LINES=[
  n=>`${n} took what was left and did not say when they would be back.`,
  n=>`${n} has stopped leaving the good pieces on your shelf. only the ones they can afford to lose.`,
];
const pickLine=(arr,id)=>{ let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return arr[h%arr.length]; };

function studioLines(){
  const out=[];
  for(const mem of MEMBERS){
    const m=SAVE.members[mem.id]; if(!m||!m.fired) continue;
    const theirs=G.fired.filter(p=>p.owner===mem.id);
    if(!theirs.length) continue;
    if(theirs.some(p=>!p.sound)) out.push(pickLine(BROKE_LINES,mem.id)(mem.n));
    else if(m.mood>=3)           out.push(pickLine(WARM_LINES,mem.id)(mem.n));
    else if(m.mood<=-3)          out.push(pickLine(COLD_LINES,mem.id)(mem.n));
  }
  return out.slice(0,4);
}

// ---------------------------------------------------------------------------
// 6. THE SHELF — everything is kept. including the failures. (§11, §19.8)
// ---------------------------------------------------------------------------
function drawShelf(){
  const G2=$('#shelfgrid'); G2.innerHTML='';
  const pots=[...SAVE.pots].reverse();
  $('#shelfsub').textContent=`${SAVE.pots.length} pieces · ${SAVE.firings} firings · ${SAVE.broken} not sound · ${Object.keys(SAVE.effects).length}/16 effects seen`;
  if(!pots.length) G2.appendChild(el('div','note lc','nothing on it yet.'));
  for(const p of pots){
    const d=el('div','spot'+(p.sound?'':' broken'));
    const [form,glaze,...rest]=p.name.split(' · ');
    // the pot itself, regenerated from its seed. a shelf of names is not a collection.
    const cv=el('canvas'); cv.width=340; cv.height=300;
    try{
      const pot = p.heat!==undefined
        ? firePot(p.seed,{ form:p.form, glaze:p.glaze, pos:p.pos, heat:p.heat, red:p.red, cool:p.cool, thick:p.thick||0 })
        // older saves predate heat/red/cool — draw what we know rather than nothing
        : { formKey:p.form, effGlaze:p.eff||p.glaze, applied:0.55,
            events:(p.events||[]).map(k=>({k,zone:'belly',i:0.72})) };
      drawPotFlat(cv.getContext('2d'), pot, cv.width, cv.height);
    }catch(e){ /* a shelf that cannot draw one pot must still show the rest */ }
    d.appendChild(cv);
    d.appendChild(el('div','sn lc',`${form} · ${glaze}`));
    d.appendChild(el('div','se lc',rest.join(', ')||'plain and sound'));
    d.appendChild(el('div','sp2 lc',p.prov||''));
    G2.appendChild(d);
  }
}

// ---------------------------------------------------------------------------
// WIRING
// ---------------------------------------------------------------------------
$('#b-new').onclick=()=>{ startFiring(); };
$('#b-shelf0').onclick=()=>{ drawShelf(); show('scr-shelf'); };
$('#b-toload').onclick=()=>{ drawLoad(); show('scr-load'); teach('load'); };
$('#b-auto').onclick=autoStack;
$('#b-tile').onclick=addTile;
$('#b-pull').onclick=()=>{ A.click(); pullTile(); };
$('#b-brick').onclick=()=>{ A.damper(); beginFire(); };
$('#b-shutdown').onclick=()=>{ setControl(G.S,'gas',0); setControl(G.S,'damper',0);
  G.S.phase='cooling'; A.burnersOff(); toast('burners off. now it cools.'); };
// waiting is chunked by the kiln's OWN visible states: each press takes you to the
// next colour the door would show you, and the last one takes you to safe. That makes
// the skip a choice about what is worth looking at rather than a button that ends the beat.
$('#b-wait').onclick=()=>{
  const S=G.S, start=glowOf(S.temp).key;
  let guard=0;
  while(guard++ < 20000 && S.temp > FIRE.cool.targetOpenF && glowOf(S.temp).key===start) step(S,2);
  A.tick(); paintCool();
};
$('#b-crack').onclick=()=>{ A.click(); crackDoor(); };
$('#b-open').onclick=toOpen;
$('#b-startunload').onclick=()=>{ A.click(); toUnload(); };
$('#b-next').onclick=()=>{ A.click(); nextPot(); };
$('#b-toshelf').onclick=()=>{ A.click(); drawShelf(); show('scr-shelf'); };
$('#b-again').onclick=()=>{ cancelAnimationFrame(G.raf); startFiring(); };
setInterval(()=>{ if($('#scr-cool').classList.contains('on')){ step(G.S, FIRE.cool.paceSimMin); paintCool(); } },80);
$('#b-read').onclick=()=>{ A.click(); $('#readbox').classList.toggle('open'); };
$('#b-nbclose').onclick=()=>{ A.click(); hideNotebook(); };
$('#b-notebook').onclick=()=>{ A.click(); showNotebook(); };
$('#b-nb2').onclick=()=>{ A.click(); showNotebook(); };
$('#b-primer').onclick=()=>{ A.click(); showPrimer(); };
$('#b-primerclose').onclick=()=>{ A.click(); hidePrimer(); };
addEventListener('keydown',e=>{
  if(e.key==='?'||e.key==='/'){ $('#primer').classList.contains('on')?hidePrimer():showPrimer(); return; }
  if(e.key==='n'||e.key==='N'){ $('#notebook').classList.contains('on')?hideNotebook():showNotebook(); return; }
  if(e.key==='Escape'&&$('#notebook').classList.contains('on')){ hideNotebook(); return; }
  if(e.key==='Escape'&&$('#primer').classList.contains('on')){ hidePrimer(); return; }
});
addEventListener('keydown',e=>{ if(e.key==='m'){ SAVE.settings.mute=!SAVE.settings.mute; A.setMute(SAVE.settings.mute); save(); toast(SAVE.settings.mute?'muted':'sound on'); }});
A.setMute(SAVE.settings.mute);

// debug object from day one (§24.10)
window.__kiln={ G, SAVE, sim:{newFiring,step,setControl,harvest,coneDown}, makePot,
  verdict:{judge,counterfactuals,settle,offerCommissions},
  // teaching hooks — rAF is suspended in a hidden pane, so toCool()/loop() never run
  // under headless verification. These let a test reach the notes directly.
  teach, showPrimer, hidePrimer, retaught(){ SAVE.taught={}; save(); },
  notebook:{ showNotebook, logReading, truthOf, refirable, buildReadRows },
  kilnwear:{ drawKilnState, wearFrom, shelfMods, drawShift, describeShelf, repairShelf },
  arc:{ drawArc, arcState, pendingLesson, fenReady, fenPolicy, fenOutcome },
  reveal:{ toOpen, toUnload, crackDoor, glowOf },
  // the fire screen repaints from rAF only, which a hidden pane suspends — expose
  // the painter so a headless check can prove what the player would actually see.
  paint:{ paintFire, paintCool, paintCrack },
  wipe(){ localStorage.removeItem(KEY); location.reload(); },
  skip(){ while(G.S.phase==='firing') step(G.S); } };
// The menu should know you have been here. A returning player wants to see that
// the shelf and the tin carried over, not a cold start. (Kyle, 2026-08-19)
(function frontDoor(){
  const r=$('#resume'); if(!r) return;
  if(!SAVE.firings){ r.innerHTML=''; return; }
  const bits=[`${SAVE.firings} firing${SAVE.firings===1?'':'s'}`,
              `${SAVE.pots.length} piece${SAVE.pots.length===1?'':'s'} on the shelf`,
              `${SAVE.money<0?'−$':'$'}${Math.abs(SAVE.money)} in the tin`];
  if(SAVE.kilnGod) bits.push('the kiln god is on the arch');
  r.innerHTML='<div class="resume lc">'+bits.join(' · ')+'</div>';
  $('#b-new').textContent='fire it again';
})();

console.log('[the kiln] ready · window.__kiln');
