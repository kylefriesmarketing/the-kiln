// THE KILN — the pot generator. §24 step 1, the render gate.
// Everything visible on a pot falls out of ONE scalar field: thickness(u,v).
// break / run / pool / crawl are all thickness. That's why it's honest.
import * as THREE from 'three';
import { FORMS, GLAZES, POSITIONS, EVENT_NAMES, ZONE_NAMES, TUNE } from './data.js';

// ---------- deterministic rng (victory-lap's LCG) ----------
export function lcg(seed){ let s=(seed>>>0)||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
// salted hash — per-pot variation WITHOUT advancing the firing stream
function h(str,salt){ let x=2166136261^(salt>>>0); for(let i=0;i<str.length;i++){ x^=str.charCodeAt(i); x=Math.imul(x,16777619);} return ((x>>>0)%100000)/100000; }
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);

// ---------- value noise ----------
function noise2(rng){ const g=[]; for(let i=0;i<256;i++) g.push(rng());
  return (x,y)=>{ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
    const at=(a,b)=>g[((a&15)+((b&15)<<4))&255];
    const u=smooth(xf),v=smooth(yf);
    return lerp(lerp(at(xi,yi),at(xi+1,yi),u), lerp(at(xi,yi+1),at(xi+1,yi+1),u), v); }; }

// ---------- profile ----------
function catmull(pts,n){
  const out=[], P=[pts[0],...pts,pts[pts.length-1]];
  for(let s=0;s<P.length-3;s++){
    const [p0,p1,p2,p3]=[P[s],P[s+1],P[s+2],P[s+3]];
    const steps=Math.max(2,Math.round(n/(P.length-3)));
    for(let i=0;i<steps;i++){ const t=i/steps,t2=t*t,t3=t2*t;
      out.push([ 0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                 0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3) ]); } }
  out.push(pts[pts.length-1]); return out;
}

function buildProfile(formKey, rng, N=120){
  const F=FORMS[formKey];
  // per-pot form variation: nobody throws the same bowl twice
  const ctl=F.ctl.map((p,i)=>{ if(i===0) return p.slice();
    const j=(rng()-0.5)*0.055*(i/F.ctl.length+0.4);
    return [Math.max(0.06,p[0]*(1+j)), p[1]*(1+(rng()-0.5)*0.02)]; });
  const pts=catmull(ctl,N);
  const ringPhase=rng()*Math.PI*2;

  // ⚠️ CURVATURE IS COMPUTED ON THE CLEAN PROFILE, BEFORE THE RINGS GO ON.
  // Applying rings first makes every ring crest register as a knife edge, so the
  // break map thins the glaze at every crest and the pot comes out a barber pole
  // that oscillates across the entire colour ramp. Cost an iteration at the render
  // gate, 2026-08-18. A throwing ring is an undulation, not an edge. Order matters.
  const curv=pts.map((p,i)=>{ const a=pts[Math.max(0,i-2)],b=pts[Math.min(pts.length-1,i+2)];
    const v1=[p[0]-a[0],p[1]-a[1]], v2=[b[0]-p[0],b[1]-p[1]];
    const l1=Math.hypot(...v1)||1e-6, l2=Math.hypot(...v2)||1e-6;
    const cross=Math.abs(v1[0]*v2[1]-v1[1]*v2[0])/(l1*l2);
    return clamp(cross*4,0,1); });
  // rim is always the sharpest edge on the pot
  for(let i=pts.length-4;i<pts.length;i++) curv[i]=Math.max(curv[i],0.85);
  // NOW the rings go on — geometry only, curvature already banked.
  pts.forEach((p,i)=>{ const v=i/(pts.length-1);
    if(v>0.10) p[0]+= Math.sin(v*F.rings*Math.PI*2+ringPhase)*TUNE.ringGeo*(0.5+v); });

  // ---- close the vessel ----
  // A lathe of the outer wall alone is a shell you can see straight through, and a
  // bowl viewed from above is a hole. Real profile: up the outside, over the rim,
  // back down the inside, close at the centre. This is also what gives `pool`
  // somewhere to gather. (render gate, 2026-08-18)
  const WALL=0.030+rng()*0.016, FLOOR=0.055+rng()*0.03;
  const rimR=pts[pts.length-1][0], rimY=pts[pts.length-1][1];
  const closed=pts.slice(), curvC=curv.slice(), inner=pts.map(()=>0);
  // over the rim
  const RN=5;
  for(let i=1;i<=RN;i++){ const t=i/RN;
    closed.push([rimR-WALL*t, rimY+Math.sin(t*Math.PI)*WALL*0.35]);
    curvC.push(0.95); inner.push(0.5); }
  // down the inside, mirroring the outer profile inward
  for(let i=pts.length-1;i>=0;i--){
    const o=pts[i], v=i/(pts.length-1);
    const r=Math.max(0, o[0]-WALL*(0.7+0.6*v));
    const y=Math.max(FLOOR, o[1]);
    if(r<=0.006){ break; }
    closed.push([r,y]); curvC.push(curv[i]*0.45); inner.push(1);
  }
  // the floor of the well, in to the axis
  const lastIn=closed[closed.length-1];
  for(let i=1;i<=6;i++){ const t=i/6;
    closed.push([lastIn[0]*(1-t), FLOOR]); curvC.push(0.15); inner.push(1); }

  const hgt=closed.map(q=>q[1]/F.h);
  return { pts:closed, curv:curvC, inner, hgt, form:F, ringPhase, scaleY:F.h, wall:WALL };
}

// ---------- the firing decides the events, causally ----------
export function firePot(seed, opts={}){
  const rng=lcg(seed);
  const formKey = opts.form ?? Object.keys(FORMS)[Math.floor(rng()*8)];
  const glazeKey= opts.glaze?? Object.keys(GLAZES)[Math.floor(rng()*9)];
  const posKey  = opts.pos  ?? Object.keys(POSITIONS)[Math.floor(rng()*9)];
  const G=GLAZES[glazeKey], P=POSITIONS[posKey];

  // the firing's own numbers — in the real game these come from the sim
  const heatwork  = clamp((opts.heat ?? 0.5+rng()*0.5) + P.heat*0.16, 0, 1.35);
  const reduction = clamp((opts.red  ?? rng()) + P.red*0.22, -0.3, 1.3);
  const coolRate  = opts.cool ?? rng();                  // 0 slow … 1 fast
  // how thick it was dipped. opts.thick is the POTTER's hand (§12.1): Desmond glazes
  // everything like he is frosting it, so his pieces crawl and run and that is legible.
  const applied   = clamp(G.base + (opts.thick ?? 0) + (rng()-0.5)*0.52, 0.10, 1.10);
  const flow      = clamp(G.flow*(0.55+heatwork*0.75)+P.flow, 0, 1.6);
  const flameU    = rng();                                // which way it faced

  // copper is the whole teaching mechanic: red in reduction, green in oxidation
  let effGlaze=glazeKey;
  if(glazeKey==='copperred' && reduction<0.42) effGlaze='oribe';
  if(glazeKey==='oribe'      && reduction>0.75) effGlaze='copperred';
  const copperFlip = effGlaze!==glazeKey;

  // ---- event selection: every event has a cause ----
  const ev=[]; const add=(k,zone,i)=>ev.push({k,zone,i:clamp(i,0.25,1)});
  if(heatwork>0.55 && applied<0.62) add('break','rim', (heatwork-0.5)*1.8);
  if(applied>TUNE.runThreshold && flow>0.62) add('run','belly',(applied-0.46)*2.4);
  if(FORMS[formKey].open && applied>0.5 && flow>0.6) add('pool','foot',flow*0.7);
  if(effGlaze==='tenmoku' && coolRate<0.62 && heatwork>0.60) add('harefur','belly',1-coolRate);
  if(effGlaze==='tenmoku' && coolRate<0.34 && heatwork>0.84 && rng()>0.35) add('oilspot','shoulder',0.9);
  if(effGlaze==='shino' && reduction>0.6) add('carbontrap','lee',reduction);
  if(applied>0.78 && P.heat<-0.45) add('crawl','belly',applied);
  if(effGlaze==='celadon'||effGlaze==='chun'||(effGlaze==='clear'&&rng()>0.5)) add('craze','belly',0.6+rng()*0.4);
  if(P.flash>0.3 && rng()<P.flash) add('flashing','flame',P.flash);
  if(P.ash>0.5 && rng()<P.ash) add('ashfly','flame',P.ash);
  if(rng()<0.16) add('kilnkiss','shoulder',0.7);
  if(heatwork<0.42 && rng()>0.4) add('pinhole','belly',0.6);
  if(reduction>1.05 && heatwork>0.95) add('blister','shoulder',reduction-0.9);
  if((effGlaze==='rutile'||effGlaze==='chun') && coolRate<0.3) add('crystal','belly',1-coolRate);
  if(rng()<0.10) add('shadow','lee',0.6);
  if(coolRate>0.88 && rng()<0.35) add('dunt','belly',1);
  // §8: 0–4 events, strongest first. more than four and it's soup.
  ev.sort((a,b)=>b.i-a.i);
  const events=ev.slice(0,4);

  return { seed, formKey, glazeKey, effGlaze, copperFlip, posKey,
           heatwork, reduction, coolRate, applied, flow, flameU, events, rng };
}

// ---------- name it from its events (§8) ----------
export function nameOf(p){
  const form=FORMS[p.formKey].name, glaze=GLAZES[p.effGlaze].name;
  if(!p.events.length) return `${form} · ${glaze} · plain and sound`;
  const parts=p.events.slice(0,3).map(e=>`${EVENT_NAMES[e.k]} ${ZONE_NAMES[e.zone]}`);
  return `${form} · ${glaze} · ${parts.join(', ')}`;
}

// ---------- the thickness field, then everything else ----------
function buildMaps(p, prof){
  const W=TUNE.texW, H=TUNE.texH;
  const rng=lcg(p.seed^0x9e3779b9), n1=noise2(rng), n2=noise2(rng);
  const T=new Float32Array(W*H);          // thickness
  const gloss=new Float32Array(W*H).fill(1);
  const bare=new Uint8Array(W*H);         // crawl / dunt: no glaze
  const tint=new Float32Array(W*H*3);     // multiplicative overlay
  for(let i=0;i<W*H*3;i++) tint[i]=1;

  const F=prof.form, LEN=prof.curv.length-1;
  // v is a position along the PROFILE PATH, not a height — once the vessel is closed
  // the path runs up the outside and back down the inside. Height and inside-ness are
  // looked up, never inferred from v.
  const idxAt=v=>Math.min(LEN,Math.max(0,Math.round(v*LEN)));
  const HT=new Float32Array(H), INNER=new Float32Array(H);

  // ---- base field ----
  for(let y=0;y<H;y++){
    const v=1-y/(H-1);
    const j=idxAt(v), c=prof.curv[j], ht=prof.hgt[j], inn=prof.inner[j];
    HT[y]=ht; INNER[y]=inn;
    // gravity: glaze runs down the outside and POOLS in the well on the inside
    const grav=TUNE.gravity*p.flow*(inn>0.5 ? Math.pow(1-ht,3.0)*1.5 : Math.pow(1-ht,1.6));
    // an edge thins the glaze. this is "break", and it's free.
    const thin=TUNE.curveThin*c*(0.35+p.flow*0.5);
    // throwing rings modulate thickness — gently. see the warning in data.js.
    const ring=Math.sin(ht*F.rings*Math.PI*2+prof.ringPhase)*TUNE.ringAmp*(0.4+p.flow);
    for(let x=0;x<W;x++){
      const u=x/(W-1);
      const m=(n1(u*7.3,ht*9.1)-0.5)*TUNE.mottle + (n2(u*23,ht*31)-0.5)*TUNE.mottle*0.45;
      T[y*W+x]=clamp(p.applied+grav-thin+ring+m,0,1.25);
    }
  }
  // events that are gravity/flame phenomena belong on the OUTSIDE.
  const outFac=y=>1-INNER[y]*0.85;

  const rowOf=v=>(1-clamp(v,0,1))*(H-1)|0;
  const px=(u,v)=>{ const x=((u%1)+1)%1*(W-1)|0; return rowOf(v)*W+x; };
  const around=(u)=>((u%1)+1)%1;
  const isInner=v=>INNER[rowOf(v)]>0.5;

  // ---- events paint into the field ----
  for(const e of p.events){
    const R=lcg(p.seed ^ (e.k.charCodeAt(0)*7919) ^ (e.i*1000|0));
    switch(e.k){

      case 'run': { // vertical drips that travel and STOP. the fingerprint of a decision.
        const n=3+Math.round(e.i*5);
        for(let d=0;d<n;d++){
          const u0=R(), top=0.35+R()*0.45, len=(0.18+R()*0.5)*e.i, w=0.006+R()*0.014;
          for(let s=0;s<260;s++){
            const v=top-(s/260)*len; if(v<0.02||isInner(v)) break;
            const taper=1-Math.pow(s/260,2.0), wid=w*(0.6+taper*0.9);
            for(let dx=-wid*W;dx<=wid*W;dx++){
              const f=1-Math.abs(dx/(wid*W));
              const i=px(u0+dx/W, v); T[i]=clamp(T[i]+0.72*f*taper*e.i,0,1.4); gloss[i]=Math.min(1.15,gloss[i]+0.1*f);
            }
          }
          // the bead at the bottom of the run
          const vEnd=Math.max(0.02,top-len);
          for(let a=-14;a<=14;a++) for(let b=-9;b<=9;b++){
            const f=Math.max(0,1-Math.hypot(a/14,b/9)); const i=px(u0+a/W,vEnd+b/H);
            T[i]=clamp(T[i]+0.42*f*e.i,0,1.45);
          }
        } break; }

      // pooling happens in the WELL — the inside floor — and a little at the outer foot
      case 'pool': { for(let y=0;y<H;y++){ const ht=HT[y], inn=INNER[y];
          const f=(inn>0.5 ? Math.pow(Math.max(0,1-ht/0.30),1.3) : Math.pow(Math.max(0,1-ht/0.16),1.6)*0.45)*e.i;
          if(f<=0) continue;
          for(let x=0;x<W;x++) T[y*W+x]=clamp(T[y*W+x]+0.62*f,0,1.5); } break; }

      case 'harefur': { const n=90+Math.round(e.i*130);
        for(let d=0;d<n;d++){ const u0=R(), top=0.3+R()*0.6, len=0.1+R()*0.3;
          for(let s=0;s<120;s++){ const v=top-(s/120)*len; if(v<0.05||isInner(v)) break;
            const i=px(u0+Math.sin(s*0.06)*0.0015, v), f=(1-s/120)*0.30*e.i;
            T[i]=clamp(T[i]-f,0,1.4); gloss[i]=Math.min(1.2,gloss[i]+0.18*f);
            const j=px(u0+1/W,v); T[j]=clamp(T[j]-f*0.6,0,1.4); } } break; }

      case 'oilspot': { const n=40+Math.round(e.i*90);
        for(let d=0;d<n;d++){ const u0=R(), v0=0.15+R()*0.75, r=1.5+R()*4.5;
          for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++){ const dd=Math.hypot(a,b); if(dd>r) continue;
            const f=1-dd/r, i=px(u0+a/W,v0+b/H);
            tint[i*3]=lerp(tint[i*3],2.4,f*e.i); tint[i*3+1]=lerp(tint[i*3+1],2.5,f*e.i); tint[i*3+2]=lerp(tint[i*3+2],2.2,f*e.i);
            gloss[i]=Math.min(1.3,gloss[i]+0.4*f); } } break; }

      case 'carbontrap': { const cu=around(p.flameU+0.5);
        for(let y=0;y<H;y++){ const v=1-y/(H-1);
          for(let x=0;x<W;x++){ const u=x/(W-1); let d=Math.abs(u-cu); d=Math.min(d,1-d);
            const f=Math.max(0,1-d/0.34)*Math.max(0,1-Math.abs(HT[y]-0.45)/0.55)*e.i*outFac(y);
            const i=y*W+x; const k=1-0.72*f*f;
            tint[i*3]*=k; tint[i*3+1]*=k*0.97; tint[i*3+2]*=k*0.94; gloss[i]*=1-0.35*f; } } break; }

      case 'crawl': { const n=3+Math.round(e.i*7);
        for(let d=0;d<n;d++){ const u0=R(), v0=0.15+R()*0.7, r=(0.03+R()*0.06)*(0.5+e.i);
          for(let a=-r*W;a<=r*W;a++) for(let b=-r*H;b<=r*H;b++){
            const dd=Math.hypot(a/(r*W),b/(r*H)); if(dd>1.25) continue;
            const i=px(u0+a/W, v0+b/H);
            if(dd<0.82) bare[i]=1;                       // bare clay
            else T[i]=clamp(T[i]+0.5,0,1.5);             // rolled-back bead at the edge
          } } break; }

      case 'craze': { const n=Math.round(30+e.i*70);
        for(let d=0;d<n;d++){ let u0=R(), v0=R(), ang=R()*Math.PI*2;
          const segs=30+Math.round(R()*70);
          for(let s=0;s<segs;s++){ ang+=(R()-0.5)*0.65; u0+=Math.cos(ang)*0.0032; v0+=Math.sin(ang)*0.0032;
            if(v0<0.02||v0>0.99) break;
            for(let w=-1;w<=1;w++){ const i=px(u0,v0+w/H/2); const k=1-0.30*e.i;
              tint[i*3]*=k; tint[i*3+1]*=k; tint[i*3+2]*=k*1.02; } } } break; }

      case 'flashing': { const cu=p.flameU;
        for(let y=0;y<H;y++){ const v=1-y/(H-1);
          for(let x=0;x<W;x++){ const u=x/(W-1); let d=Math.abs(u-cu); d=Math.min(d,1-d);
            const f=Math.max(0,1-d/0.40)*(0.35+0.65*(1-HT[y]))*e.i*outFac(y), i=y*W+x;
            tint[i*3]=lerp(tint[i*3],1.46,f); tint[i*3+1]=lerp(tint[i*3+1],1.12,f); tint[i*3+2]=lerp(tint[i*3+2],0.80,f); } } break; }

      case 'ashfly': { const cu=p.flameU;
        for(let y=0;y<H;y++){ const v=1-y/(H-1);
          for(let x=0;x<W;x++){ const u=x/(W-1); let d=Math.abs(u-cu); d=Math.min(d,1-d);
            const f=Math.max(0,1-d/0.36)*Math.pow(HT[y],0.6)*e.i*outFac(y), i=y*W+x;
            T[i]=clamp(T[i]+0.30*f,0,1.5); gloss[i]=Math.min(1.35,gloss[i]+0.42*f);
            tint[i*3]=lerp(tint[i*3],1.22,f*0.7); tint[i*3+1]=lerp(tint[i*3+1],1.16,f*0.7); } } break; }

      case 'kilnkiss': { const u0=R(), v0=0.35+R()*0.5, r=7+R()*9;
        for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++){ const dd=Math.hypot(a,b); if(dd>r) continue;
          const f=Math.pow(1-dd/r,0.7), i=px(u0+a/W,v0+b/H);
          T[i]=clamp(T[i]+0.5*f,0,1.5);
          tint[i*3]*=1-0.45*f; tint[i*3+1]*=1-0.5*f; tint[i*3+2]*=1-0.4*f; } break; }

      case 'pinhole': { const n=180+Math.round(e.i*420);
        for(let d=0;d<n;d++){ const i=px(R(),0.06+R()*0.9);
          tint[i*3]*=0.52; tint[i*3+1]*=0.52; tint[i*3+2]*=0.55; gloss[i]*=0.7; } break; }

      case 'blister': { const n=8+Math.round(e.i*22);
        for(let d=0;d<n;d++){ const u0=R(), v0=0.2+R()*0.7, r=4+R()*10;
          for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++){ const dd=Math.hypot(a,b); if(dd>r) continue;
            const f=1-dd/r, i=px(u0+a/W,v0+b/H);
            T[i]=clamp(T[i]+0.55*f,0,1.6);
            if(dd>r*0.78){ tint[i*3]*=0.55; tint[i*3+1]*=0.55; tint[i*3+2]*=0.55; } } } break; }

      case 'crystal': { // Voronoi seeds, radial growth. genuinely new work per the audit.
        const n=14+Math.round(e.i*34), seeds=[];
        for(let d=0;d<n;d++) seeds.push([R(),0.1+R()*0.85, 0.05+R()*0.09]);
        for(const [su,sv,sr] of seeds){
          const arms=6+Math.round(R()*6), ph=R()*Math.PI*2;
          for(let a=0;a<Math.PI*2;a+=0.008){
            const rr=sr*(0.55+0.45*Math.abs(Math.cos((a+ph)*arms/2)));
            for(let t=0;t<1;t+=0.03){
              const i=px(su+Math.cos(a)*rr*t, sv+Math.sin(a)*rr*t*1.5);
              const f=(1-t)*e.i*0.9;
              tint[i*3]=lerp(tint[i*3],1.55,f); tint[i*3+1]=lerp(tint[i*3+1],1.52,f); tint[i*3+2]=lerp(tint[i*3+2],1.42,f);
              T[i]=clamp(T[i]+0.10*f,0,1.4); gloss[i]=Math.min(1.2,gloss[i]+0.2*f);
            } } } break; }

      case 'shadow': { const cu=around(p.flameU+0.42);
        for(let y=0;y<H;y++){ const v=1-y/(H-1);
          for(let x=0;x<W;x++){ const u=x/(W-1); let d=Math.abs(u-cu); d=Math.min(d,1-d);
            const f=Math.max(0,1-d/0.16)*Math.max(0,1-Math.abs(HT[y]-0.5)/0.4)*e.i*0.75*outFac(y), i=y*W+x;
            const k=1-0.34*f; tint[i*3]*=k; tint[i*3+1]*=k; tint[i*3+2]*=k; } } break; }

      case 'dunt': { // a crack. the pot is finished but it is not sound.
        let u0=R(), v0=0.95, ang=-Math.PI/2+(R()-0.5)*0.5;
        for(let s=0;s<600;s++){ ang+=(R()-0.5)*0.16; u0+=Math.cos(ang)*0.0016; v0+=Math.sin(ang)*0.0016;
          if(v0<0.03) break;
          for(let w=-2;w<=2;w++){ const i=px(u0+w/W*1.4,v0);
            const k=Math.abs(w)<=1?0.10:0.4; tint[i*3]*=k; tint[i*3+1]*=k; tint[i*3+2]*=k; bare[i]=Math.abs(w)<=1?2:bare[i]; } } break; }

      default: break;
    }
  }
  return { T, gloss, bare, tint, W, H };
}

function rampColor(G,t){
  const r=G.ramp; t=clamp(t,0,1);
  for(let i=0;i<r.length-1;i++){ if(t<=r[i+1][0]){
    const f=(t-r[i][0])/((r[i+1][0]-r[i][0])||1);
    return [lerp(r[i][1][0],r[i+1][1][0],f), lerp(r[i][1][1],r[i+1][1][1],f), lerp(r[i][1][2],r[i+1][1][2],f)]; } }
  return r[r.length-1][1];
}

export function makePot(seed, opts={}){
  const p=firePot(seed,opts);
  const prof=buildProfile(p.formKey, lcg(seed^0x51ed270b));
  const maps=buildMaps(p, prof);
  const {T,gloss,bare,tint,W,H}=maps;
  const G=GLAZES[p.effGlaze];

  // ---- colour + roughness from the thickness field ----
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const cx=cv.getContext('2d'), img=cx.createImageData(W,H);
  const rv=document.createElement('canvas'); rv.width=W; rv.height=H;
  const rx=rv.getContext('2d'), rimg=rx.createImageData(W,H);
  const CLAY=[176,150,128];
  for(let i=0;i<W*H;i++){
    let c;
    if(bare[i]===1) c=CLAY.slice();
    else if(bare[i]===2) c=[28,22,20];
    else c=rampColor(G, (T[i]-TUNE.contrastLo)/(TUNE.contrastHi-TUNE.contrastLo));
    c[0]*=tint[i*3]; c[1]*=tint[i*3+1]; c[2]*=tint[i*3+2];
    img.data[i*4]=clamp(c[0],0,255); img.data[i*4+1]=clamp(c[1],0,255); img.data[i*4+2]=clamp(c[2],0,255); img.data[i*4+3]=255;
    // rough: glossy where thick and glassy, matte where bare/thin
    let rough = bare[i] ? 0.92 : clamp(1-(G.gloss*gloss[i])*clamp(0.35+T[i],0,1), 0.04, 0.98);
    const rr=clamp(rough*255,0,255);
    rimg.data[i*4]=rr; rimg.data[i*4+1]=rr; rimg.data[i*4+2]=rr; rimg.data[i*4+3]=255;
  }
  cx.putImageData(img,0,0); rx.putImageData(rimg,0,0);

  // ---- normal map: Sobel on the thickness field (my-brew's trick, STR from data) ----
  const nv=document.createElement('canvas'); nv.width=W; nv.height=H;
  const nxx=nv.getContext('2d'), nimg=nxx.createImageData(W,H), STR=6.0;
  const at=(x,y)=>T[clamp(y,0,H-1)*W+((x%W)+W)%W];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const gx=(at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x-1,y)+at(x-1,y+1));
    const gy=(at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x,y-1)+at(x+1,y-1));
    let nx=-gx*STR, ny=-gy*STR, nz=1, l=Math.hypot(nx,ny,nz);
    const i=(y*W+x)*4;
    nimg.data[i]=(nx/l*0.5+0.5)*255; nimg.data[i+1]=(ny/l*0.5+0.5)*255; nimg.data[i+2]=(nz/l*0.5+0.5)*255; nimg.data[i+3]=255;
  }
  nxx.putImageData(nimg,0,0);

  const mk=(c,srgb)=>{ const t=new THREE.CanvasTexture(c); if(srgb) t.colorSpace=THREE.SRGBColorSpace; t.wrapS=THREE.RepeatWrapping; t.anisotropy=8; return t; };
  const mat=new THREE.MeshPhysicalMaterial({
    map:mk(cv,true), roughnessMap:mk(rv,false), normalMap:mk(nv,false),
    normalScale:new THREE.Vector2(0.85,0.85), metalness:0.0, roughness:1.0,
    clearcoat:G.gloss*0.55, clearcoatRoughness:0.35,
  });

  const pts=prof.pts.map(q=>new THREE.Vector2(q[0], q[1]*prof.scaleY));
  const geo=new THREE.LatheGeometry(pts, 128);
  const mesh=new THREE.Mesh(geo, mat);
  const maxR = prof.pts.reduce((m,q)=>Math.max(m,q[0]),0);
  mesh.userData={ pot:p, name:nameOf(p), height:prof.scaleY, maxR };
  return mesh;
}

// ---------------------------------------------------------------------------
// THE FLAT PAINTER — a pot drawn with 2D canvas and no WebGL at all.
// ⚠️ WHY THIS EXISTS (Kyle, 2026-08-19): "i cant see the rewards, it doesnt show
// me any of the cool pottery we made." A resize loop had been growing the WebGL
// drawing buffer until the context died, and once a context is lost EVERY pot
// after it is black. The pots are the entire payoff of this game (§4.6, §8), so
// the payoff must not depend on a GPU staying alive. This path uses the same
// seed, the same profile, the same glaze ramp and the same events as the 3D one,
// so it is the same pot — just photographed flat.
// It is also what the shelf uses, because a shelf of names is not a collection.
// ---------------------------------------------------------------------------
export function drawPotFlat(ctx, p, W, H){
  const F=FORMS[p.formKey], G=GLAZES[p.effGlaze];
  const pts=catmull(F.ctl, 90);
  const maxR=Math.max(...pts.map(q=>q[0])), worldH=F.h;
  const s=Math.min((W*0.60)/(2*maxR), (H*0.74)/worldH);
  const cx=W/2, base=H*0.87;
  const X=r=>cx+r*s, Y=t=>base-t*worldH*s;
  const has=k=>p.events.find(e=>e.k===k);
  const ev=k=>{ const e=has(k); return e?e.i:0; };
  const rgb=c=>'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';
  // the same thickness→colour ramp the 3D surface uses, so the two agree
  const at=t=>rgb(rampColor(G,(clamp(t,0,1)-TUNE.contrastLo)/(TUNE.contrastHi-TUNE.contrastLo)));

  ctx.clearRect(0,0,W,H);

  // the shelf it is standing on
  ctx.fillStyle='rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.ellipse(cx,base+3,maxR*s*1.25,maxR*s*0.24,0,0,7); ctx.fill();

  // the silhouette: up the right side, mirrored down the left
  const outline=()=>{ ctx.beginPath();
    ctx.moveTo(X(pts[0][0]),Y(pts[0][1]));
    for(const q of pts) ctx.lineTo(X(q[0]),Y(q[1]));
    for(let i=pts.length-1;i>=0;i--) ctx.lineTo(X(-pts[i][0]),Y(pts[i][1]));
    ctx.closePath(); };

  // glaze gathers downward, so it reads thin over the rim and thick at the foot
  const thick=clamp(p.applied,0.12,1.05);
  const g=ctx.createLinearGradient(0,Y(1),0,Y(0));
  g.addColorStop(0.00, at(thick*0.52));
  g.addColorStop(0.28, at(thick*0.78));
  g.addColorStop(0.62, at(thick));
  g.addColorStop(1.00, at(thick*(1+TUNE.gravity*0.42)));
  outline(); ctx.fillStyle=g; ctx.fill();

  ctx.save(); outline(); ctx.clip();

  // form shading — lit left shoulder, dark right flank, so it reads round
  const rd=ctx.createLinearGradient(X(-maxR),0,X(maxR),0);
  rd.addColorStop(0,'rgba(255,236,205,0.20)'); rd.addColorStop(0.34,'rgba(255,255,255,0.05)');
  rd.addColorStop(0.72,'rgba(0,0,0,0.20)');    rd.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=rd; ctx.fillRect(0,0,W,H);

  // throwing rings
  ctx.strokeStyle='rgba(0,0,0,0.10)'; ctx.lineWidth=Math.max(1,H/300);
  for(let i=1;i<F.rings;i++){ const t=i/F.rings;
    ctx.beginPath(); ctx.moveTo(X(-maxR),Y(t)); ctx.lineTo(X(maxR),Y(t)); ctx.stroke(); }

  // flashing / ash fly — a warm blush down the side the flame touched
  if(ev('flashing')||ev('ashfly')){
    const f=ctx.createLinearGradient(X(-maxR),0,X(maxR*0.2),0);
    f.addColorStop(0,'rgba(255,168,86,'+(0.16+0.26*Math.max(ev('flashing'),ev('ashfly'))).toFixed(2)+')');
    f.addColorStop(1,'rgba(255,168,86,0)');
    ctx.fillStyle=f; ctx.fillRect(0,0,W,H);
  }
  // carbon trap — a soft grey-black shadow on the lee side
  if(ev('carbontrap')){
    const f=ctx.createLinearGradient(X(maxR),0,X(-maxR*0.1),0);
    f.addColorStop(0,'rgba(26,24,24,'+(0.30+0.40*ev('carbontrap')).toFixed(2)+')');
    f.addColorStop(1,'rgba(26,24,24,0)');
    ctx.fillStyle=f; ctx.fillRect(0,0,W,H);
  }
  // runs — §8 calls a drip the visible fingerprint of a decision you made blind
  if(ev('run')){
    const n=2+Math.round(ev('run')*3);
    for(let i=0;i<n;i++){
      const u=(i+0.5)/n, rx=X((u*2-1)*maxR*0.82);
      const top=Y(0.62-0.22*u), len=(0.26+0.34*ev('run'))*worldH*s;
      const w=Math.max(1.5,(W/150)*(0.7+ev('run')));
      const gr=ctx.createLinearGradient(0,top,0,top+len);
      gr.addColorStop(0,at(thick*1.12)); gr.addColorStop(1,at(thick*(1+TUNE.gravity*0.6)));
      ctx.fillStyle=gr; ctx.fillRect(rx-w/2,top,w,len);
      ctx.beginPath(); ctx.ellipse(rx,top+len,w*0.85,w*1.15,0,0,7); ctx.fill();
    }
  }
  // pooling in the well
  if(ev('pool')&&F.open){
    ctx.fillStyle=at(thick*1.3); ctx.globalAlpha=0.55;
    ctx.beginPath(); ctx.ellipse(cx,Y(0.10),maxR*s*0.52,maxR*s*0.14,0,0,7); ctx.fill();
    ctx.globalAlpha=1;
  }
  // crawling — bare clay where a thick coat let go
  if(ev('crawl')){
    const n=3+Math.round(ev('crawl')*5);
    ctx.fillStyle='rgb(176,150,128)';
    for(let i=0;i<n;i++){ const a=(i*2.7)%1, b=(i*0.61)%1;
      ctx.beginPath(); ctx.ellipse(X((a*2-1)*maxR*0.8),Y(0.18+b*0.6),
        W/60*(0.6+b), W/70*(0.6+a),0,0,7); ctx.fill(); }
  }
  // crystals
  if(ev('crystal')){
    ctx.fillStyle='rgba(255,248,225,0.72)';
    for(let i=0;i<70;i++){ const a=(i*0.732)%1, b=(i*0.317)%1;
      ctx.beginPath(); ctx.arc(X((a*2-1)*maxR*0.86),Y(0.12+b*0.76),Math.max(0.7,W/260),0,7); ctx.fill(); }
  }
  // oil spot and hare's fur — iron doing what iron does
  if(ev('oilspot')){ ctx.fillStyle='rgba(226,222,210,0.66)';
    for(let i=0;i<26;i++){ const a=(i*0.51)%1,b=(i*0.83)%1;
      ctx.beginPath(); ctx.arc(X((a*2-1)*maxR*0.8),Y(0.28+b*0.5),W/150,0,7); ctx.fill(); } }
  if(ev('harefur')){ ctx.strokeStyle='rgba(214,164,110,0.42)'; ctx.lineWidth=Math.max(0.8,W/300);
    for(let i=0;i<34;i++){ const a=(i*0.394)%1;
      const x=X((a*2-1)*maxR*0.88); ctx.beginPath();
      ctx.moveTo(x,Y(0.74)); ctx.lineTo(x+(a-0.5)*W/40,Y(0.20)); ctx.stroke(); } }
  // crazing
  if(ev('craze')){ ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=Math.max(0.6,W/420);
    for(let i=0;i<40;i++){ const a=(i*0.618)%1,b=(i*0.241)%1;
      const x=X((a*2-1)*maxR*0.9), y=Y(0.12+b*0.8);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(b-0.5)*W/22,y+(a-0.5)*H/22); ctx.stroke(); } }
  // break over the rim — thin glaze at every edge, the signature of a good iron glaze
  if(ev('break')){
    ctx.strokeStyle=at(thick*0.30); ctx.lineWidth=Math.max(2,H/90);
    ctx.beginPath(); ctx.moveTo(X(-pts[pts.length-1][0]),Y(1));
    ctx.lineTo(X(pts[pts.length-1][0]),Y(1)); ctx.stroke();
  }
  ctx.restore();

  // the mouth, for an open form — you should be able to see it is a bowl
  if(F.open){
    const rimR=pts[pts.length-1][0];
    ctx.beginPath(); ctx.ellipse(cx,Y(1),rimR*s,rimR*s*0.26,0,0,7);
    ctx.fillStyle=at(thick*1.18); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=Math.max(1,H/220); ctx.stroke();
  }

  // a dunt is a crack, and it is the one mark here that is not decoration
  if(ev('dunt')){
    ctx.strokeStyle='rgba(18,14,12,0.92)'; ctx.lineWidth=Math.max(1.4,H/160);
    ctx.beginPath(); let x=cx+maxR*s*0.12, y=Y(0.94);
    ctx.moveTo(x,y);
    for(let i=0;i<7;i++){ x+=((i*37%11)/11-0.5)*W/16; y+=worldH*s*0.12; ctx.lineTo(x,y); }
    ctx.stroke();
  }
  // outline last, so the form always reads even under a heavy surface
  outline(); ctx.strokeStyle='rgba(12,10,9,0.65)'; ctx.lineWidth=Math.max(1,H/260); ctx.stroke();
}
