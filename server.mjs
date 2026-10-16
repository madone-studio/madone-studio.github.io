// ponytail: static production build only, GET/HEAD; no dev server or universal SPA fallback.
import http from 'node:http';
import fs from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const GAME=/^\/Games\/(?:Archero|SurvivorIO|Sudoku|Tele_GameFI|TileCandy|Tilesmatch3|ToiletTapTap)\/(?:index\.html|index\.js|manifest\.(?:json|webmanifest)|(?:Build|TemplateData|StreamingAssets)\/[^\\\0]+|icon-(?:192|512)\.png)$/;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm','.data':'application/octet-stream','.unityweb':'application/octet-stream','.json':'application/json','.webmanifest':'application/manifest+json'};
export function createStaticServer({root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist')}={}){
 const base=fs.realpathSync(root);
 return http.createServer(async(req,res)=>{
  const end=(code,text='',extra={})=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Content-Length':Buffer.byteLength(text),'Cache-Control':'no-store',...extra});res.end(req.method==='HEAD'?undefined:text);};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
  try{
   const host=String(req.headers.host||'').toLowerCase();if(!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)&&host!=='porfile-madonestudio.hollow-agent.xyz')return end(403,'Forbidden host');
   if(!['GET','HEAD'].includes(req.method))return end(405,'Method not allowed',{Allow:'GET, HEAD'});
   let url;try{url=decodeURIComponent(req.url.split('?')[0]);}catch{return end(400,'Malformed URL');}
   if(!url.startsWith('/')||url.startsWith('//')||/[\\\0]/.test(url)||url.split('/').some(p=>p==='.'||p==='..'||p.startsWith('.')))return end(404,'Not found');
   const game=GAME.test(url);
   const allowed=url==='/'||url==='/index.html'||game||/^\/assets\/(?:[^/]+\.(?:js|css)|artwork\/char[123]\/[A-Za-z0-9_]+\.(?:mp4|webm|jpg)|images\/[^\\\0]+|logoStudio(?:-[\w-]{8,})?\.png|thumbnail_[12]\.png)$/.test(url);
   const ext=path.extname(url==='/'?'index.html':url).toLowerCase();
   if(!allowed||!MIME[ext])return end(404,'Not found');
   let file,s;try{file=await realpath(path.join(base,url==='/'?'index.html':url.slice(1)));if(!file.startsWith(base+path.sep))return end(404,'Not found');s=await stat(file);}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return end(404,'Not found');throw e;}
   if(!s.isFile())return end(404,'Not found');
   // Unity needs WASM and blob workers; those capabilities are not granted to the React homepage.
   const csp=game?`default-src 'self'; script-src 'self' ${url.startsWith('/Games/ToiletTapTap/')?'blob: ':''}'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://config.uca.cloud.unity3d.com https://cdp.cloud.unity3d.com https://perf-events.cloud.unity3d.com; media-src 'self' blob:; worker-src 'self' blob:; base-uri 'none'; object-src 'none'; frame-ancestors 'self'`:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; media-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self' mailto:";
   res.setHeader('Content-Security-Policy',csp);
   let start=0,endByte=s.size-1,code=200;
   if(req.headers.range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const invalid=()=>end(416,'Range not satisfiable',{'Content-Range':`bytes */${s.size}`});
    if(!m||(!m[1]&&!m[2])||!s.size)return invalid();
    if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid();start=Math.max(0,s.size-suffix);}
    else{start=Number(m[1]);if(m[2])endByte=Math.min(Number(m[2]),endByte);}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(endByte)||start<0||start>=s.size||endByte<start)return invalid();code=206;
   }
   const headers={'Content-Type':MIME[ext],'Content-Length':Math.max(0,endByte-start+1),'Accept-Ranges':'bytes','Cache-Control':/^\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(url)?'public, max-age=31536000, immutable, no-transform':'no-cache, no-transform'};
   if(code===206)headers['Content-Range']=`bytes ${start}-${endByte}/${s.size}`;
   res.writeHead(code,headers);if(req.method==='HEAD'||!s.size){res.end();return;}
   const stream=fs.createReadStream(file,{start,end:endByte});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{if(res.headersSent)res.destroy();else end(500,'Static service unavailable');}
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const port=Number(process.env.PORT||6789);
 if(!Number.isSafeInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 // Existing tunnel resolves localhost to ::1: listen on both loopbacks, never on a public interface.
 for(const host of ['127.0.0.1','::1']){
  const server=createStaticServer();server.on('error',e=>{console.error('Static listener failed:',e.code);process.exit(1);});server.listen(port,host,()=>console.log(`MADONE React listening on ${host}:${port}`));
 }
}
