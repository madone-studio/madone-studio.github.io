import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '/data/career-ops-runtime/node_modules/playwright/index.mjs';
const origin='https://porfile-madonestudio.hollow-agent.xyz',root=path.resolve('dist'),out='/home/opc/.hermes/cache/scratch/madone-migration';
const sha=b=>createHash('sha256').update(b).digest('hex');
const summary={api:[],browser:[],services:[]};
for(const base of ['http://127.0.0.1:6789','http://[::1]:6789',origin]){
 const r=await fetch(base+'/',{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,base);const text=await r.text();assert.equal(sha(text),sha(await fs.readFile(path.join(root,'index.html'))),base+' HTML identity');
 const entries=[...text.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)].map(m=>m[1]);assert.ok(entries.length>=2);
 for(const asset of entries){const res=await fetch(base+asset,{signal:AbortSignal.timeout(30000)});assert.equal(res.status,200);assert.equal(sha(Buffer.from(await res.arrayBuffer())),sha(await fs.readFile(path.join(root,asset.slice(1)))));}
 for(const bad of ['/.env','/.git/config','/package.json','/src/main.jsx','/assets/js/script.js'])assert.equal((await fetch(base+bad,{signal:AbortSignal.timeout(20000)})).status,404,bad);
 summary.api.push({base,html_matches:true,entry_assets:entries,private_files_unavailable:true});
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium-browser',args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>network.push(r.url()+': '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)network.push(r.status()+' '+r.url());});
 await page.goto(origin,{waitUntil:'networkidle',timeout:60000});await page.locator('.game-card').first().waitFor();
 assert.equal(await page.locator('.game-card').count(),6);assert.equal(await page.locator('.team-card').count(),3);
 const games=await page.locator('.game-title').allTextContents();assert.deepEqual(games.map(s=>s.trim()),['Archero','SurvivorIO','Nekoverse','BikeTrail','Idle Cyber','MeowFlow']);
 if(width<600){const toggle=page.locator('#nav-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.locator('#nav-menu a[href="#games"]').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
 else await page.locator('#nav-menu a[href="#games"]').click();
 for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.images].filter(i=>i.getAttribute('src')?.startsWith('/assets/')).every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('a[href="#"]').count(),0,'No dead placeholder anchors');
 await page.screenshot({path:path.join(out,'live-'+width+'.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 summary.browser.push({width,games:games.length,team:3,menu:true,local_images_loaded:true,overflow:false,errors:0});await page.close();
}}finally{await browser.close();}
const baseline=JSON.parse(await fs.readFile(path.join(out,'baseline.json'),'utf8'));
for(const [unit,prior] of Object.entries(baseline.services)){
 const current=execFileSync('systemctl',['show',unit,'-p','MainPID','-p','ExecMainStartTimestamp','-p','ActiveState'],{encoding:'utf8'}).trim();assert.equal(current,prior,unit+' remained unchanged');summary.services.push({unit,unchanged:true});
}
await fs.writeFile(path.join(out,'live-verification.json'),JSON.stringify(summary,null,2),{mode:0o600});console.log(JSON.stringify(summary,null,2));
