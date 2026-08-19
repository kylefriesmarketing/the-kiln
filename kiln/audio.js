// THE KILN — audio. WebAudio, zero files. §16.
// The burner mix is an instrument: lean burns hiss, rich burns roar. You can hear
// reduction before you can see it. And a dunted pot rings dead when you lift it.
let AC=null, dead=false, master, bus={};
const now=()=>AC.currentTime;

export function boot(){
  if(AC||dead) return AC;
  try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ dead=true; return null; }
  master=AC.createGain(); master.gain.value=0.85; master.connect(AC.destination);
  for(const k of ['burn','room','ui']){ bus[k]=AC.createGain(); bus[k].connect(master); }
  bus.burn.gain.value=0.75; bus.room.gain.value=0.6; bus.ui.gain.value=0.8;
  return AC;
}
export function resume(){ if(AC&&AC.state==='suspended') AC.resume(); }
export function setMute(m){ if(master) master.gain.value=m?0:0.85; }

let noiseBuf=null;
function noise(){
  if(!noiseBuf){ noiseBuf=AC.createBuffer(1,AC.sampleRate*1.5,AC.sampleRate);
    const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; return s;
}
function env(g,a,peak,d){ const t=now();
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }

// ---------- the burners ----------
const B={ on:false };
export function burnersOn(){
  if(!boot()||B.on) return; B.on=true;
  B.src=noise(); B.bp=AC.createBiquadFilter(); B.bp.type='bandpass'; B.bp.frequency.value=520; B.bp.Q.value=0.8;
  B.lp=AC.createBiquadFilter(); B.lp.type='lowpass'; B.lp.frequency.value=900;
  B.g=AC.createGain(); B.g.gain.value=0.0001;
  B.rumble=AC.createOscillator(); B.rumble.type='sawtooth'; B.rumble.frequency.value=48;
  B.rg=AC.createGain(); B.rg.gain.value=0.0001;
  B.src.connect(B.bp); B.bp.connect(B.lp); B.lp.connect(B.g); B.g.connect(bus.burn);
  B.rumble.connect(B.rg); B.rg.connect(bus.burn);
  B.src.start(); B.rumble.start();
}
export function burnersOff(){ if(!B.on) return; try{B.src.stop();B.rumble.stop();}catch(e){} B.on=false; }

// gas 0..1, atm -1..1 (positive = reducing). rich = low roar, lean = high hiss.
export function burners(gas, atm){
  if(!B.on) return;
  const t=now(), rich=Math.max(0,atm);
  B.g.gain.setTargetAtTime(0.0001+gas*0.16, t, 0.35);
  B.bp.frequency.setTargetAtTime(300+ (1-rich)*760 + gas*140, t, 0.5);
  B.bp.Q.setTargetAtTime(0.6+rich*2.2, t, 0.5);
  B.lp.frequency.setTargetAtTime(420+ (1-rich)*1500, t, 0.5);
  B.rg.gain.setTargetAtTime(0.0001+gas*rich*0.075, t, 0.4);
  B.rumble.frequency.setTargetAtTime(38+gas*16, t, 0.6);
}

// ---------- one-shots ----------
export function damper(){ if(!boot())return;
  const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='lowpass'; f.frequency.setValueAtTime(1400,now()); f.frequency.exponentialRampToValueAtTime(180,now()+0.28);
  s.connect(f); f.connect(g); g.connect(bus.ui); env(g,0.004,0.5,0.3); s.start(); s.stop(now()+0.4);
  const o=AC.createOscillator(), og=AC.createGain(); o.type='sine'; o.frequency.setValueAtTime(96,now());
  o.frequency.exponentialRampToValueAtTime(52,now()+0.2); o.connect(og); og.connect(bus.ui);
  env(og,0.003,0.35,0.22); o.start(); o.stop(now()+0.3);
}
export function click(v=1){ if(!boot())return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='square'; o.frequency.value=180+v*40; o.connect(g); g.connect(bus.ui);
  env(g,0.002,0.10,0.045); o.start(); o.stop(now()+0.09);
}
// the kiln cooling, out loud. irregular, and it slows as it cools.
export function tick(){ if(!boot())return;
  const o=AC.createOscillator(), g=AC.createGain(), f=AC.createBiquadFilter();
  f.type='bandpass'; f.frequency.value=1400+Math.random()*2200; f.Q.value=6;
  o.type='square'; o.frequency.value=900+Math.random()*900;
  o.connect(f); f.connect(g); g.connect(bus.room);
  env(g,0.001,0.055,0.05); o.start(); o.stop(now()+0.09);
}
// a pot lifted off a shelf. sound=1 rings; a dunted one thuds.
export function potRing(sound=true){ if(!boot())return;
  const base=sound?(560+Math.random()*260):150;
  const parts=sound?[1,2.76,5.4]:[1,1.9];
  parts.forEach((m,i)=>{ const o=AC.createOscillator(), g=AC.createGain();
    o.type='sine'; o.frequency.value=base*m; o.connect(g); g.connect(bus.ui);
    env(g, 0.002, (sound?0.22:0.18)/(i+1), sound?(1.9/(i+1)):0.16);
    o.start(); o.stop(now()+ (sound?2.2:0.3)); });
}
export function doorCrack(){ if(!boot())return;
  const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='highpass'; f.frequency.value=1100;
  s.connect(f); f.connect(g); g.connect(bus.room); env(g,0.02,0.20,1.3);
  s.start(); s.stop(now()+1.5);
}
export function chime(good=true){ if(!boot())return;
  const seq=good?[523,659,784]:[392,349];
  seq.forEach((f,i)=>{ const o=AC.createOscillator(), g=AC.createGain();
    o.type='triangle'; o.frequency.value=f; o.connect(g); g.connect(bus.ui);
    const t=now()+i*0.10; g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(0.13,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);
    o.start(t); o.stop(t+0.75); });
}
