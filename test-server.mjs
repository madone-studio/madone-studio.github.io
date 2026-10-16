import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const module=await import('./server.mjs').catch(()=>({}));

test('production origin: public allowlist, MIME, HEAD/range, strict headers, traversal and symlink rejection',async()=>{
 assert.equal(typeof module.createStaticServer,'function','real production origin is implemented');
 const dir=await fs.mkdtemp(path.join(process.env.TMPDIR||os.tmpdir(),'madone-origin-')),root=path.join(dir,'dist');
 await fs.mkdir(path.join(root,'assets'),{recursive:true});await fs.mkdir(path.join(root,'Games','Archero','Build'),{recursive:true});
 await fs.mkdir(path.join(root,'assets','images'),{recursive:true});
 await fs.writeFile(path.join(root,'index.html'),'<title>MADONE React</title>');await fs.writeFile(path.join(root,'assets','entry-abc12345.js'),'0123456789');await fs.writeFile(path.join(root,'assets','images','movie.mp4'),'0123456789');
 await fs.writeFile(path.join(root,'Games','Archero','Build','demo.wasm'),'wasm-fixture');await fs.writeFile(path.join(root,'package.json'),'private');await fs.writeFile(path.join(dir,'secret.txt'),'private');await fs.symlink(path.join(dir,'secret.txt'),path.join(root,'assets','images','escape.png'));
 const server=module.createStaticServer({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const req=(url,method='GET',headers={})=>new Promise((resolve,reject)=>{
  const q=http.request({hostname:'127.0.0.1',port:server.address().port,path:url,method,headers},r=>{let text='';r.on('data',b=>text+=b);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,text}));});q.on('error',reject);q.end();
 });
 try{
  let r=await req('/');assert.equal(r.status,200);assert.match(r.text,/MADONE React/);assert.match(r.headers['cache-control'],/no-cache/);assert.match(r.headers['content-security-policy'],/script-src 'self'/);assert.equal(r.headers['x-content-type-options'],'nosniff');
  r=await req('/assets/entry-abc12345.js');assert.equal(r.status,200);assert.match(r.headers['content-type'],/javascript/);assert.match(r.headers['cache-control'],/immutable/);
  await fs.writeFile(path.join(root,'assets','logoStudio-abc12345.png'),'image');
  assert.equal((await req('/assets/logoStudio-abc12345.png')).status,200,'Vite-bundled favicon is public');
  r=await req('/assets/images/movie.mp4');assert.match(r.headers['content-type'],/video\/mp4/);assert.equal(r.headers['accept-ranges'],'bytes');
  for(const [range,want] of [['bytes=2-4','234'],['bytes=7-','789'],['bytes=-2','89']]){r=await req('/assets/images/movie.mp4','GET',{Range:range});assert.equal(r.status,206);assert.equal(r.text,want);assert.equal(Number(r.headers['content-length']),want.length);}
  for(const range of ['bytes=10-','bytes=8-2','bytes=-0','bytes=0-1,3-4','bytes=wat','bytes=9999999999999999999999999-'])assert.equal((await req('/assets/images/movie.mp4','GET',{Range:range})).status,416,range);
  r=await req('/assets/images/movie.mp4','HEAD',{Range:'bytes=2-4'});assert.equal(r.status,206);assert.equal(r.text,'');assert.equal(r.headers['content-length'],'3');
  r=await req('/Games/Archero/Build/demo.wasm');assert.equal(r.status,200);assert.equal(r.headers['content-type'],'application/wasm');assert.match(r.headers['content-security-policy'],/wasm-unsafe-eval/);assert.match(r.headers['content-security-policy'],/media-src 'self' blob:/);assert.match(r.headers['content-security-policy'],/https:\/\/config\.uca\.cloud\.unity3d\.com/);
  await fs.mkdir(path.join(root,'Games','ToiletTapTap'),{recursive:true});await fs.writeFile(path.join(root,'Games','ToiletTapTap','index.html'),'<canvas></canvas>');
  assert.match((await req('/Games/ToiletTapTap/index.html')).headers['content-security-policy'],/script-src 'self' blob:/,'Unity decompression needs blob scripts on this game only');
  assert.doesNotMatch((await req('/')).headers['content-security-policy'],/blob:/);
  await fs.mkdir(path.join(root,'assets','artwork','char1'),{recursive:true});await fs.writeFile(path.join(root,'assets','artwork','char1','attack.mp4'),'0123456789');
  r=await req('/assets/artwork/char1/attack.mp4','GET',{Range:'bytes=2-4'});assert.equal(r.status,206);assert.match(r.headers['content-type'],/video\/mp4/);assert.equal(r.text,'234');
  assert.match(r.headers['content-security-policy'],/media-src 'self'/,'Artwork can play same-origin videos');
  await fs.writeFile(path.join(root,'assets','artwork','char1','attack.webm'),'webm');r=await req('/assets/artwork/char1/attack.webm');assert.equal(r.status,200);assert.equal(r.headers['content-type'],'video/webm');
  for(const url of ['/assets/artwork/char1/original.json','/assets/artwork/char1/source.atlas','/assets/artwork/private.txt'])assert.equal((await req(url)).status,404);
  for(const url of ['/missing','/assets/missing.png','/assets','/.git/config','/.env','/package.json','/server.mjs','/src/main.jsx','/assets/script.map','/assets/js/script.js','/assets/images/escape.png','/Games/Bad/index.html','/Games/Archero/ServiceWorker.js','/../secret.txt','/%2e%2e/secret.txt','/assets/%2e%2e/index.html','/assets/%5cescape.png','/assets/%00x.png'])assert.equal((await req(url)).status,404,url);
  assert.equal((await req('/%zz')).status,400);assert.equal((await req('/','POST')).status,405);assert.equal((await req('/','GET',{Host:'foreign.example'})).status,403);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
