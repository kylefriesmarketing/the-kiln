// THE KILN — browser smoke. Drives the real UI and fails on any console error.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
const ROOT=fileURLToPath(new URL('..', import.meta.url));
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,s)=>{ let f=path.normalize(path.join(ROOT,decodeURIComponent(q.url.split('?')[0])));
  if(!f.startsWith(path.normalize(ROOT))){s.writeHead(403);return s.end();}
  if(f.endsWith(path.sep)||!path.extname(f)) f=path.join(f,'index.html');
  fs.readFile(f,(e,d)=>{ if(e){s.writeHead(404);return s.end('404');}
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); s.end(d); }); });
await new Promise(r=>srv.listen(8462,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio']});
const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('console',m=>{ if(m.type()==='error' && !/favicon/i.test(m.text())) errs.push(m.text()); });
p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
const step=async(name,fn)=>{ try{ await fn(); console.log('  ok   '+name); }catch(e){ console.log('  FAIL '+name+' — '+e.message); errs.push(name); } };

await p.goto('http://localhost:8462/',{waitUntil:'load'});
await p.waitForFunction('!!window.__kiln',{timeout:15000});
await step('boots with the debug object', async()=>{});
await step('light the kiln → conditions', async()=>{ await p.click('#b-new');
  await p.waitForSelector('#scr-cond.on'); const n=await p.$$eval('.cond',e=>e.length); if(n!==3) throw new Error('conds='+n); });
await step('conditions → damp room', async()=>{ await p.click('#b-toload');
  await p.waitForSelector('#scr-load.on'); const n=await p.$$eval('.piece',e=>e.length); if(n!==9) throw new Error('pieces='+n); });
await step('auto-stack fills nine shelves', async()=>{ await p.click('#b-auto');
  const n=await p.$$eval('.slot.full',e=>e.length); if(n!==9) throw new Error('slots='+n); });
await step('flag a piece', async()=>{ await p.click('.slot.full'); await p.waitForSelector('.slot.flag'); });
await step('brick the door → firing', async()=>{ await p.click('#b-brick'); await p.waitForSelector('#scr-fire.on');
  await p.waitForFunction("document.querySelectorAll('.det b').length===30"); });
await step('controls respond and lag', async()=>{
  await p.click('.det b[data-k="gas"][data-v="8"]');
  const set=await p.$eval('#n-gas',e=>+e.textContent); if(set!==8) throw new Error('gas set='+set);
  const eff=await p.evaluate('__kiln.G.S.eff.gas'); if(eff>3) throw new Error('no lag, eff='+eff); });
await step('runs a full firing at speed', async()=>{
  await p.click('#speed b:nth-child(4)');
  await p.evaluate(`(async()=>{ const S=__kiln.G.S; let g=0;
     while(S.phase==='firing' && g++<20000){ __kiln.sim.step(S,1);
       if(S.win.i>=8){ __kiln.sim.setControl(S,'gas',0); __kiln.sim.setControl(S,'damper',0); }
       else { // crude autopilot: follow the schedule
         const w=S.win.i; __kiln.sim.setControl(S,'gas',[2,8,10,11,12,12,10,6][w]||6);
         const want=[null,-0.15,0.6,-0.05,0.45,0.12,0.15,-0.25][w];
         if(want!==null&&want!==undefined){ const err=want-S.atm;
           if(Math.abs(err)>0.06) __kiln.sim.setControl(S,'damper', S.set.damper - Math.sign(err)*2); } } }
     S.phase='cooling'; })()`);
  const ph=await p.evaluate('__kiln.G.S.phase'); if(ph!=='cooling') throw new Error('phase='+ph); });
await step('cooling gate refuses to be rushed', async()=>{ await p.waitForSelector('#scr-cool.on',{timeout:8000});
  const note=await p.$eval('#coolnote',e=>e.textContent); if(!note.length) throw new Error('no cool note'); });
await step('cools to openable', async()=>{ await p.evaluate("while(__kiln.G.S.temp>400) __kiln.sim.step(__kiln.G.S,3)");
  await p.waitForFunction("document.querySelector('#b-open').className.includes('prime')",{timeout:8000}); });
await step('unload: pot by pot, names generate', async()=>{ await p.click('#b-open');
  await p.waitForSelector('#scr-unload.on');
  for(let i=0;i<9;i++){ const nm=await p.$eval('#potname',e=>e.textContent);
    if(!nm||nm.length<6) throw new Error('empty name at '+i);
    await p.click('#b-next'); await p.waitForTimeout(90); } });
await step('lands on the shelf with nine pots saved', async()=>{ await p.waitForSelector('#scr-shelf.on',{timeout:8000});
  const n=await p.$$eval('.spot',e=>e.length); if(n!==9) throw new Error('shelf='+n);
  const saved=await p.evaluate("JSON.parse(localStorage.getItem('kiln-save')).pots.length");
  if(saved!==9) throw new Error('saved='+saved); });
await step('save survives a reload', async()=>{ await p.reload({waitUntil:'load'});
  await p.waitForFunction('!!window.__kiln');
  const n=await p.evaluate("__kiln.SAVE.pots.length"); if(n!==9) throw new Error('after reload='+n); });
await p.screenshot({path:'shot-shelf.png'});
await b.close(); srv.close();
console.log(errs.length?`\n${errs.length} PROBLEM(S):\n`+errs.slice(0,12).join('\n'):'\nclean — no console errors');
process.exit(errs.length?1:0);
