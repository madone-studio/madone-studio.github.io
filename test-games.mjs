import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
const names=['Archero','SurvivorIO','Sudoku','Tele_GameFI','TileCandy','Tilesmatch3','ToiletTapTap'];
test('all seven original demo wrappers return to this origin; no inline script, SW registration or unsafe banner HTML',()=>{
 for(const name of names){const dir=path.resolve('Games',name),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),js=fs.readFileSync(path.join(dir,'index.js'),'utf8');
  assert.match(html,/href="\/#games"/,name+' same-origin return');assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/i,name+' inline');
  assert.doesNotMatch(js,/serviceWorker\.register|\.innerHTML\s*=|Cannot get Telegram Data/,name+' old worker/banner');
  for(const m of js.matchAll(/(?:dataUrl|frameworkUrl|codeUrl):\s*buildUrl\s*\+\s*"([^"]+)"/g))assert.ok(fs.existsSync(path.join(dir,'Build',m[1])),name+' build media exists');
 }
});
