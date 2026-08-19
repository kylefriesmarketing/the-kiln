import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('.', import.meta.url));   // never .pathname
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
const srv=http.createServer((q,s)=>{
  let f=path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0])));
  if(!f.startsWith(path.normalize(ROOT))) { s.writeHead(403); return s.end(); }
  if(f.endsWith('/')||!path.extname(f)) f=path.join(f,'index.html');
  fs.readFile(f,(e,d)=>{ if(e){s.writeHead(404);return s.end('404 '+f);} 
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); s.end(d); });
});
await new Promise(r=>srv.listen(8461,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const errs=[];
for (const [name,url,vp] of [['labelled','http://localhost:8461/gate.html',{width:1900,height:1700}],
                             ['squint','http://localhost:8461/gate.html?squint=1',{width:920,height:780}]]) {
  const p=await b.newPage({viewport:vp, deviceScaleFactor:1});
  p.on('console',m=>{ if(m.type()==='error') errs.push(name+': '+m.text()); });
  p.on('pageerror',e=>errs.push(name+' PAGEERROR: '+e.message));
  await p.goto(url,{waitUntil:'load'});
  await p.waitForFunction('window.__gateDone===true',{timeout:120000}).catch(e=>errs.push(name+' TIMEOUT'));
  await p.waitForTimeout(600);
  await p.screenshot({path:`shot-${name}.png`, fullPage:true});
  await p.close();
}
await b.close(); srv.close();
console.log(errs.length?('ERRORS:\n'+errs.join('\n')):'clean — 0 console errors');
