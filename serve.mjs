// THE KILN — dev server. Pure node, no PowerShell, space-safe path.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
// ⚠️ fileURLToPath, NEVER new URL('.',import.meta.url).pathname — the workspace path
// has a space in it and .pathname leaves it as %20, which 404s every single file
// while the server looks perfectly healthy.
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const PORT = process.env.PORT || 8461;
http.createServer((q,s)=>{
  let f=path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0])));
  if(!f.startsWith(path.normalize(ROOT))) { s.writeHead(403); return s.end(); }
  if(f.endsWith(path.sep)||!path.extname(f)) f=path.join(f,'index.html');
  fs.readFile(f,(e,d)=>{ if(e){s.writeHead(404);return s.end('404 '+f);}
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); s.end(d); });
}).listen(PORT, ()=>console.log('THE KILN → http://localhost:'+PORT));
