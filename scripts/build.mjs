// ponytail: build once, copy only reviewed public media/game runtimes; no legacy scripts or repository root exposure.
import {build} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.resolve(process.env.MADONE_BUILD_DIR||path.join(root,'dist'));
await build({root,publicDir:false,build:{outDir:out,emptyOutDir:true,sourcemap:false}});
for(const name of ['assets/images','assets/artwork','assets/logoStudio.png','assets/thumbnail_1.png','assets/thumbnail_2.png','Games']){
 await fs.cp(path.join(root,name),path.join(out,name),{recursive:true,filter:async file=>{
  const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw new Error('Do not publish symbolic links: '+file);
  if(stat.isDirectory())return true;
  if(file.endsWith('ServiceWorker.js'))return false;
  const ext=path.extname(file).toLowerCase();return ['.html','.js','.css','.png','.jpg','.jpeg','.webp','.svg','.ico','.mp4','.webm','.data','.wasm','.unityweb','.json','.webmanifest'].includes(ext);
 }});
}
console.log('Public media and seven Unity demo folders copied; no old homepage JS or service workers published.');
