// Derive the physical constants instead of guessing them.
// 1) shellK so the kiln plateaus at a real cone 10 ceiling
// 2) cone heat-work thresholds from a reference ramp at real cone temperatures
import { FIRE } from '../kiln/data.js';

// Orton self-supporting cones, ~108F/hr. These are the real numbers.
const CONE_F = {'012':1582,'010':1657,'08':1728,'06':1828,'04':1945,'1':2109,
                '6':2232,'8':2280,'9':2300,'10':2345,'11':2361};

const A=FIRE.hwA, T0=FIRE.hwT0;
const shellPow=3.2;

// --- 1) equilibrium ---
// heatIn(gas12, clean burn) = flu(damper) + shell  at TARGET
const TARGET=2420, above=TARGET-FIRE.ambient;
const heatIn=12*1.0*FIRE.calorific;
const damper=3;
const flu=(FIRE.fluLossBase+damper*FIRE.fluLossPerNotch)*above/100;
const shellK=(heatIn-flu)/(Math.pow(above/1000,shellPow)*1000);
console.log(`shellK = ${shellK.toFixed(5)}   (plateau ${TARGET}F at gas 12 / damper ${damper})`);

// --- 2) climb rate sanity at mid-firing ---
function dT(gas,damp,T,mass,cal){
  const ab=T-FIRE.ambient;
  const hin=gas*cal;
  const f=(FIRE.fluLossBase+damp*FIRE.fluLossPerNotch)*ab/100;
  const s=shellK*Math.pow(ab/1000,shellPow)*1000;
  return (hin-f-s)/mass*60;
}
for(const mass of [70,95,120,138]) {
  console.log(`mass ${mass}: @1600F gas8 = ${dT(8,5,1600,mass,FIRE.calorific).toFixed(0)}F/hr   @2200F gas11 = ${dT(11,4,2200,mass,FIRE.calorific).toFixed(0)}F/hr`);
}

// --- 3) cone thresholds from the reference ramp ---
// climb at 108F/hr from 1000F, integrating heat work; record hw at each cone temp.
let T=1000, hw=0, out={}, dt=1/60; // hours
const targets=Object.entries(CONE_F).sort((a,b)=>a[1]-b[1]);
let ti=0;
for(let h=0; h<40 && ti<targets.length; h+=dt){
  T+=108*dt;
  if(T>1000) hw += Math.exp((T-T0)/A)*dt;
  while(ti<targets.length && T>=targets[ti][1]){ out[targets[ti][0]]=+hw.toFixed(2); ti++; }
}
console.log('\ncones:', JSON.stringify(out));
