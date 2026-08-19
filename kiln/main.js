// THE KILN — the game. Phase machine, UI, save.
// The sim is in sim.js and knows nothing about the DOM. This file is the only
// place that touches document, and the only place Math.random is allowed.
import * as THREE from 'three';
import { FIRE, FORMS, GLAZES, POSITIONS, EVENT_NAMES, ZONE_NAMES } from './data.js';
import { newFiring, step, setControl, harvest, openKiln, coneDown, CONE_ORDER, hhmm, lcg } from './sim.js';
import { makePot, nameOf } from './pot.js';
import * as A from './audio.js';

const $ = s => document.querySelector(s);
const el = (t,c,h)=>{ const n=document.createElement(t); if(c)n.className=c; if(h!==undefined)n.innerHTML=h; return n; };
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------------------------------------------------------------------
// SAVE — deep-default migration, never a version wall. (§20)
// ---------------------------------------------------------------------------
const KEY='kiln-save';
const DEFAULTS={ started:true, firings:0, pots:[], broken:0, effects:{}, notebook:{},
                 members:{}, kiln:{scars:0}, settings:{mute:false} };
function mergeDefaults(s,d=DEFAULTS){ const o={...d};
  for(const k of Object.keys(d)){ if(s&&s[k]!==undefined)
    o[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])) ? mergeDefaults(s[k],d[k]) : s[k]; }
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
        speed:1, acc:0, raf:0, results:[], unIdx:0, seed:0 };

function show(id){ document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on')); $('#'+id).classList.add('on'); }
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
  G.slots={}; G.sel=null; G.flag=null;
  G.S=newFiring(G.seed, []);
  $('#firingno').textContent=`firing ${SAVE.firings+1}`;
  const C=$('#conds'); C.innerHTML='';
  const rows=[['the kiln',G.S.cond.kiln],['the flue',G.S.cond.draw],['the tank',G.S.cond.fuel]];
  for(const [k,c] of rows){
    const d=el('div','cond'); d.appendChild(el('div','k',k));
    d.appendChild(el('div','v lc',c[1]));
    const eff=c[2]===0?'no help, no harm':(c[2]>0?`it will run hot — ${(c[2]*100).toFixed(0)}%`:`it will fight you — ${(c[2]*100).toFixed(0)}%`);
    d.appendChild(el('div','d lc',eff)); C.appendChild(d);
  }
  const sum=G.S.cond.kiln[2]+G.S.cond.draw[2]+G.S.cond.fuel[2];
  $('#condread').textContent = sum>0.15 ? "it'll want less gas than you think tonight."
    : sum<-0.15 ? "this is a slow night. start earlier than feels right, and don't chase it with the gas."
    : "an ordinary night. nothing is doing you any favours and nothing is against you.";
  show('scr-cond');
}

function buildDampRoom(rng){
  const out=[]; let n=0;
  // three of yours, unglazed — you choose
  for(let i=0;i<3;i++){
    const forms=Object.keys(FORMS);
    out.push({ id:'y'+(n++), form:forms[Math.floor(rng()*forms.length)],
               glaze:YOURS[Math.floor(rng()*YOURS.length)], owner:'you', mine:true });
  }
  // six from the members
  const pool=[...MEMBERS].sort(()=>rng()-0.5).slice(0,6);
  for(const m of pool){
    out.push({ id:'m'+(n++), form:m.makes[Math.floor(rng()*m.makes.length)],
               glaze: rng()<0.72 ? m.likes : YOURS[Math.floor(rng()*YOURS.length)],
               owner:m.id, mine:false });
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
    const d=el('div','piece'+(placed?' placed':'')+(G.sel===p.id?' sel':''));
    d.innerHTML=`<div class="n lc">${FORMS[p.form].name}</div>
      <div class="g lc">${GLAZES[p.glaze].name}${p.mine?' ▾':''}</div>
      <div class="o lc">${who}</div>`;
    d.onclick=e=>{ A.click();
      if(p.mine && e.target.classList.contains('g')){
        p.glaze=YOURS[(YOURS.indexOf(p.glaze)+1)%YOURS.length]; drawLoad(); return; }
      G.sel = G.sel===p.id?null:p.id; drawLoad(); };
    D.appendChild(d);
  }
  const K=$('#kilngrid'); K.innerHTML='';
  for(const [key,P] of Object.entries(POSITIONS)){
    const it=G.slots[key];
    const s=el('div','slot'+(it?' full':'')+(G.flag===key?' flag':''));
    s.innerHTML=`<div class="pn">${P.name}</div>`+
      (it?`<div class="it lc">${FORMS[it.form].name}</div><div class="ig lc">${GLAZES[it.glaze].name}</div>`
         :`<div class="hint lc">${shelfHint(P)}</div>`);
    s.onclick=()=>{ A.click(0.5);
      if(G.sel){ const p=G.damp.find(x=>x.id===G.sel);
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
function shelfHint(P){
  if(P.heat>0.8) return 'hottest. heaviest reduction.';
  if(P.heat<-1.2) return 'cold and still. nothing likes it here.';
  if(P.heat<-0.8) return 'runs cool. crawls things.';
  if(P.red<-0.8) return 'oxidises up here.';
  if(P.ash>0.8) return 'fast air. it dries the surface.';
  if(P.heat===0) return 'even. honest. unspectacular.';
  return 'good atmosphere.';
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
  G.speed=1; drawSpeed();
  A.burnersOn();
  show('scr-fire'); loop();
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

const SPEEDS=[[1,'1×'],[30,'30×'],[120,'120×'],[600,'600×']];
function drawSpeed(){ const S=$('#speed'); S.innerHTML='';
  for(const [v,l] of SPEEDS){ const b=el('b',G.speed===v?'on':'',l);
    b.onclick=()=>{ G.speed=v; A.click(); drawSpeed(); }; S.appendChild(b); } }

function loop(){
  G.raf=requestAnimationFrame(loop);
  const S=G.S;
  if(S.phase==='firing'||S.phase==='cooling'){
    const before=S.win.cur, beforeLog=S.log.length;
    let n=Math.max(1,Math.round(G.speed/6));
    for(let i=0;i<n;i++){ step(S, S.phase==='cooling'?3:1); if(S.phase==='open') break; }
    // ⚠️ hard drop to 1× the moment a window opens. The player never watches nothing.
    if(!before && S.win.cur && G.speed>1){ G.speed=1; drawSpeed(); A.chime(true); toast('the kiln wants something'); }
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
  const w=S.win.cur ? FIRE.windows.find(x=>x.id===S.win.cur) : null;
  const box=$('#win');
  if(w){ box.className='window'; $('#winname').textContent=w.name;
    $('#winwant').textContent=wantText(w);
    $('#winbar').style.width=clamp((S.t-S.win.openAt)/w.hold*100,0,100)+'%';
  } else {
    box.className='window idle';
    const nx=FIRE.windows[S.win.i];
    $('#winname').textContent = nx? 'next: '+nx.name : 'the schedule is done';
    $('#winwant').textContent = nx? telegraph(nx) : 'shut the gas and close the damper.';
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
  if(w.want.rate) p.push(`climb ${w.want.rate[0]}–${w.want.rate[1]}°/hr`);
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
  const cx=W*0.5, cy=H*0.56, r=64;
  const g=x.createRadialGradient(cx,cy,2,cx,cy,r*2.4);
  const core = hot<0.25? '#2a0d04' : hot<0.5? '#8a2f06' : hot<0.75? '#e07414' : '#ffd89a';
  g.addColorStop(0,core); g.addColorStop(0.35,`rgba(255,${120+hot*90|0},40,${0.5+hot*0.4})`);
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.beginPath(); x.arc(cx,cy,r*2.4,0,7); x.fill();
  // the flame licking out — long/orange when reducing, short/blue/bushy when lean
  if(S.eff.gas>0.4){
    const t=performance.now()/380;
    const len = 16 + rich*140 + hot*30;
    const n = lean>0.25? 11 : 6;
    for(let i=0;i<n;i++){
      const a=-Math.PI/2 + (i/(n-1)-0.5)*(lean>0.25?1.5:0.65);
      const l=len*(0.55+0.45*Math.sin(t*2.1+i*1.7));
      const gr=x.createLinearGradient(cx,cy,cx+Math.cos(a)*l,cy+Math.sin(a)*l);
      const c1 = lean>0.25 ? 'rgba(150,190,255,0.85)' : 'rgba(255,170,60,0.9)';
      const c2 = lean>0.25 ? 'rgba(90,140,255,0)'     : 'rgba(255,90,20,0)';
      gr.addColorStop(0,c1); gr.addColorStop(1,c2);
      x.strokeStyle=gr; x.lineWidth= lean>0.25? 11 : 6+rich*8; x.lineCap='round';
      x.beginPath(); x.moveTo(cx,cy);
      x.quadraticCurveTo(cx+Math.cos(a)*l*0.5+Math.sin(t*3+i)*7, cy+Math.sin(a)*l*0.6,
                         cx+Math.cos(a)*l, cy+Math.sin(a)*l); x.stroke();
    }
  }
  // the brick surround
  x.fillStyle='#000'; x.globalCompositeOperation='destination-over';
  x.fillRect(0,0,W,H); x.globalCompositeOperation='source-over';
  x.strokeStyle='#241f1b'; x.lineWidth=3; x.beginPath(); x.arc(cx,cy,r,0,7); x.stroke();
  x.fillStyle='#6b6157'; x.font='21px ui-monospace,monospace';
  const read = S.atm>0.5?'long, orange, licking': S.atm>0.15?'soft and orange':
               S.atm>-0.05?'green-tinted — neutral': S.eff.gas<0.5?'nothing to see':'short, blue, bushy';
  x.fillText(read, 18, H-18);
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
    x.fillStyle='#3f3ا'.slice(0,7); x.font='18px ui-monospace,monospace';
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
function toCool(){ cancelAnimationFrame(G.raf); G.raf=0; show('scr-cool'); A.doorCrack(); }
function paintCool(){
  const S=G.S; if(!$('#scr-cool').classList.contains('on')) return;
  $('#cooltemp').textContent=Math.round(S.temp)+'°F';
  const p=clamp(1-(S.temp-FIRE.cool.targetOpenF)/(2300-FIRE.cool.targetOpenF),0,1);
  $('#coolbar').firstElementChild.style.width=(p*100)+'%';
  const safe=S.temp<=FIRE.cool.targetOpenF;
  $('#coolnote').textContent = safe
    ? 'cool enough. nothing will crack now.'
    : `too hot. open it at ${Math.round(S.temp)}° and you will dunt what you made — and it will be your fault, not the kiln's.`;
  $('#b-open').className='lc'+(safe?' prime':'');
  if(Math.random()<0.06*(S.temp>500?1:0.3)) A.tick();
}

// ---------------------------------------------------------------------------
// 5. THE UNLOAD — five beats, flagged piece last. (§9.2)
// ---------------------------------------------------------------------------
let three=null;
function initThree(){
  const cv=$('#potcv');
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  r.setPixelRatio(Math.min(2,devicePixelRatio)); r.toneMapping=THREE.ACESFilmicToneMapping;
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
  three={r,sc,cam,holder};
  const resize=()=>{ const w=cv.clientWidth,h=cv.clientHeight;
    r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(cv); resize();
  (function spin(){ requestAnimationFrame(spin);
     if(!document.getElementById('scr-unload').classList.contains('on')) return;
     holder.rotation.y+=0.0035; r.render(sc,cam); })();
}

function toUnload(){
  openKiln(G.S);
  const raw=harvest(G.S);
  // physical unload order: shelves come out as you stacked them, and the piece you
  // flagged comes out LAST. peak-end — the conclusion is what they'll remember.
  const order=Object.keys(POSITIONS);
  raw.sort((a,b)=>order.indexOf(a.pos)-order.indexOf(b.pos));
  if(G.flag){ const i=raw.findIndex(p=>p.pos===G.flag); if(i>=0) raw.push(raw.splice(i,1)[0]); }
  G.results=raw; G.unIdx=-1;
  if(!three) initThree();
  show('scr-unload'); nextPot();
}

function nextPot(){
  G.unIdx++;
  if(G.unIdx>=G.results.length){ finish(); return; }
  const p=G.results[G.unIdx];
  // ⚠️ dispose the previous pot FIRST. Each one owns three 768² canvas textures;
  // nine of them undisposed is ~60MB of GPU memory and it took the tab down under
  // swiftshader. clear() detaches but does not free.
  three.holder.traverse(o=>{ if(o.geometry) o.geometry.dispose();
    if(o.material){ for(const k of ['map','roughnessMap','normalMap']) o.material[k]?.dispose();
      o.material.dispose(); } });
  three.holder.clear();
  const mesh=makePot(p.seed,{ form:p.form, glaze:p.glaze, pos:p.pos,
                              heat:p.heat, red:p.red, cool:p.cool });
  three.holder.add(mesh);
  const hg=mesh.userData.height; mesh.position.y=-hg/2;
  const halfTan=Math.tan(26*Math.PI/360), maxR=mesh.userData.maxR;
  const d=Math.max(hg/2/halfTan,maxR/halfTan)*1.3;
  const squat=Math.min(1,(2*maxR)/Math.max(hg,1e-3)/2.2);
  three.cam.position.set(0,hg*0.10+d*squat*0.5,d*(1-squat*0.18));
  three.cam.lookAt(0,0,0); three.cam.updateProjectionMatrix();

  const pot=mesh.userData.pot;
  const dunted=pot.events.some(e=>e.k==='dunt');
  A.potRing(!dunted);
  const owner = p.mine?'yours':(MEMBERS.find(m=>m.id===p.owner)||{n:'the studio'}).n;
  const [form,glaze,...rest]=mesh.userData.name.split(' · ');
  $('#unprog').textContent=`${G.unIdx+1} of ${G.results.length}`;
  $('#beatline').textContent = G.unIdx===G.results.length-1 && G.flag ? '★ the one you were hoping for' : `${POSITIONS[p.pos].name} · ${owner}`;
  $('#potname').textContent=`${form} · ${glaze}`;
  $('#potev').textContent = rest.join(', ')||'plain and sound';
  $('#potprov').textContent=provenance(p,pot);
  $('#b-next').textContent = G.unIdx>=G.results.length-1 ? 'that’s the load' : 'take it out';
  // record it. the pot regenerates from seed + firing, never from pixels.
  SAVE.pots.push({ seed:p.seed, form:p.form, glaze:p.glaze, eff:pot.effGlaze, pos:p.pos,
                   name:mesh.userData.name, events:pot.events.map(e=>e.k), sound:!dunted,
                   firing:SAVE.firings+1, prov:provenance(p,pot), owner:p.owner||'you' });
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
  if(S.opened&&S.openTemp>FIRE.cool.targetOpenF) bits.push(`opened hot, at ${Math.round(S.openTemp)}°.`);
  return bits.join(' ');
}

function finish(){
  SAVE.firings++;
  // the collectible: a firing where nothing broke. (§20)
  const perfect=G.results.every((p,i)=>SAVE.pots[SAVE.pots.length-G.results.length+i].sound);
  if(perfect){ SAVE.kilnGod=true; toast('nothing broke. the kiln god stays on the arch.'); A.chime(true); }
  save(); drawShelf(); show('scr-shelf');
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
    d.innerHTML=`<div class="sn lc">${form} · ${glaze}</div>
      <div class="se lc">${rest.join(', ')||'plain and sound'}</div>
      <div class="sp2 lc">${p.prov||''}</div>`;
    G2.appendChild(d);
  }
}

// ---------------------------------------------------------------------------
// WIRING
// ---------------------------------------------------------------------------
$('#b-new').onclick=()=>{ startFiring(); };
$('#b-shelf0').onclick=()=>{ drawShelf(); show('scr-shelf'); };
$('#b-toload').onclick=()=>{ drawLoad(); show('scr-load'); };
$('#b-auto').onclick=autoStack;
$('#b-brick').onclick=()=>{ A.damper(); beginFire(); };
$('#b-shutdown').onclick=()=>{ setControl(G.S,'gas',0); setControl(G.S,'damper',0);
  G.S.phase='cooling'; A.burnersOff(); toast('burners off. now it cools.'); };
$('#b-wait').onclick=()=>{ for(let i=0;i<220;i++) step(G.S,3); paintCool(); };
$('#b-open').onclick=toUnload;
$('#b-next').onclick=()=>{ A.click(); nextPot(); };
$('#b-again').onclick=()=>{ cancelAnimationFrame(G.raf); startFiring(); };
setInterval(()=>{ if($('#scr-cool').classList.contains('on')){ for(let i=0;i<3;i++) step(G.S,3); paintCool(); } },80);
addEventListener('keydown',e=>{ if(e.key==='m'){ SAVE.settings.mute=!SAVE.settings.mute; A.setMute(SAVE.settings.mute); save(); toast(SAVE.settings.mute?'muted':'sound on'); }});
A.setMute(SAVE.settings.mute);

// debug object from day one (§24.10)
window.__kiln={ G, SAVE, sim:{newFiring,step,setControl,harvest,coneDown}, makePot,
  wipe(){ localStorage.removeItem(KEY); location.reload(); },
  skip(){ while(G.S.phase==='firing') step(G.S); } };
console.log('[cone 10] ready · window.__kiln');
