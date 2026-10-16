// Real WebGL smoke: compiled builds are preserved, not mocked. Requires installed Playwright/Chromium on the deployment host.
import assert from 'node:assert/strict';
import {chromium} from '/data/career-ops-runtime/node_modules/playwright/index.mjs';
import {createStaticServer} from '../server.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.env.MADONE_BUILD_ROOT||'dist'),out=process.env.MADONE_EVIDENCE_DIR;
const server=createStaticServer({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=process.env.MADONE_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium-browser',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const game of ['Archero','SurvivorIO','Sudoku','Tele_GameFI','TileCandy','Tilesmatch3','ToiletTapTap']){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],network=[],dialogs=[];
  page.on('console',m=>{if(m.type()==='error')console.error(game+' console: '+m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
  page.on('response',r=>{if(r.status()>=400)network.push({status:r.status(),url:new URL(r.url()).pathname});});
  await page.goto(`${origin}/Games/${game}/index.html`,{waitUntil:'domcontentloaded'});
  let ready=true;try{await page.waitForFunction(()=>Boolean(window.unityInstance),{timeout:180000});}catch{ready=false;}
  const result={game,ready,errors,network,dialogs,returnHref:await page.locator('.back-button').getAttribute('href')};results.push(result);
  await page.locator('.back-button').click();await page.locator('.game-card').first().waitFor();assert.equal(await page.locator('.game-card').count(),6,game+' returns to React home');
  console.log(JSON.stringify(result));await page.close();
 }
 if(out){await fs.mkdir(out,{recursive:true,mode:0o700});await fs.writeFile(path.join(out,'games.json'),JSON.stringify(results,null,2),{mode:0o600});}
 for(const result of results){assert.equal(result.ready,true,result.game+' Unity instance');assert.deepEqual(result.errors,[],result.game+' JS errors');assert.deepEqual(result.network,[],result.game+' asset requests');assert.deepEqual(result.dialogs,[],result.game+' dialogs');assert.equal(result.returnHref,'/#games');}
}finally{await browser.close();await new Promise(r=>server.close(r));}
