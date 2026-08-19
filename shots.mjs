import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
const ROOT=fileURLToPath(new URL('.', import.meta.url));
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'};
const srv=http.createServer((q,s)=>{ let f=path.normalize(path.join(ROOT,decodeURIComponent(q.url.split('?')[0])));
  if(f.endsWith(path.sep)||!path.extname(f)) f=path.join(f,'index.html');
  fs.readFile(f,(e,d)=>{ if(e){s.writeHead(404);return s.end('404');}
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); s.end(d); }); });
await new Promise(r=>srv.listen(8466,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio']});
const p=await b.newPage({viewport:{width:1500,height:880}});
const shot=n=>p.screenshot({path:`ui-${n}.png`});
await p.goto('http://localhost:8466/',{waitUntil:'load'});
await p.waitForFunction('!!window.__kiln');
await shot('1-title');
await p.click('#b-new');  await p.waitForSelector('#scr-cond.on');  await shot('2-conditions');
await p.click('#b-toload'); await p.click('#b-auto'); await p.click('.slot.full'); await shot('3-load');
await p.click('#b-brick'); await p.waitForSelector('#scr-fire.on');
// drive it into the middle of the firing so the instruments have something to say
await p.evaluate(`(()=>{ const S=__kiln.G.S; let g=0;
  while(S.win.i<4 && g++<20000){ __kiln.sim.step(S,1);
    const w=S.win.i; __kiln.sim.setControl(S,'gas',[2,8,10,11,12,12,10,6][w]||6);
    const want=[null,-0.15,0.6,-0.05,0.45,0.12,0.15,-0.25][w];
    if(want!=null){ const e=want-S.atm; if(Math.abs(e)>0.06) __kiln.sim.setControl(S,'damper',S.set.damper-Math.sign(e)*2); } } })()`);
await p.waitForTimeout(900); await shot('4-fire');
await p.evaluate(`(()=>{ const S=__kiln.G.S; let g=0;
  while(S.phase==='firing' && g++<40000){ __kiln.sim.step(S,1);
    const w=S.win.i;
    if(w>=8){ __kiln.sim.setControl(S,'gas',0); __kiln.sim.setControl(S,'damper',0); }
    else { __kiln.sim.setControl(S,'gas',[2,8,10,11,12,12,10,6][w]);
      const want=[null,-0.15,0.6,-0.05,0.45,0.12,0.15,-0.25][w];
      if(want!=null){ const e=want-S.atm; if(Math.abs(e)>0.06) __kiln.sim.setControl(S,'damper',S.set.damper-Math.sign(e)*2); } } }
  S.phase='cooling'; })()`);
await p.waitForSelector('#scr-cool.on',{timeout:20000});
await p.waitForTimeout(500); await shot('5-cool');
await p.evaluate("while(__kiln.G.S.temp>400) __kiln.sim.step(__kiln.G.S,3)");
await p.waitForFunction("document.querySelector('#b-open').className.includes('prime')");
await p.click('#b-open'); await p.waitForSelector('#scr-unload.on');
await p.waitForTimeout(2500); await shot('6-unload');
for(let i=0;i<8;i++){ await p.click('#b-next'); await p.waitForTimeout(400); }
await p.waitForTimeout(2500); await shot('7-unload-last');
await p.click('#b-next'); await p.waitForSelector('#scr-shelf.on'); await p.waitForTimeout(400);
await shot('8-shelf');
await b.close(); srv.close(); console.log('shots done');
