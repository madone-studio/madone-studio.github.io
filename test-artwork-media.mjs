import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
const items=JSON.parse(fs.readFileSync('src/data/artworks.json','utf8'));
test('all 28 source timelines have decodable silent loop videos and posters, without source publication',()=>{
 assert.equal(items.length,28);assert.equal(new Set(items.map(i=>i.id)).size,28);
 assert.deepEqual(['char1','char2','char3'].map(c=>items.filter(i=>i.character===c).length),[10,17,1]);
 const probe='/home/opc/.hermes/tools/ffmpeg-9.0.1-linux-arm64/bin/ffprobe';
 for(const item of items){
  assert.match(item.src,/^\/assets\/artwork\/char[123]\/[A-Za-z0-9_]+\.mp4$/);assert.match(item.poster,/\.jpg$/);
  const info=JSON.parse(execFileSync(probe,['-v','error','-show_streams','-show_format','-of','json',path.resolve('.'+item.src)],{encoding:'utf8'}));
  assert.equal(info.streams.length,1);const video=info.streams[0];assert.equal(video.codec_name,'h264');assert.equal(video.pix_fmt,'yuv420p');assert.equal(video.width,640);assert.equal(video.height,640);
  assert.ok(Math.abs(Number(info.format.duration)-item.duration)<0.08);assert.ok(Number(video.nb_frames)>1);assert.ok(fs.statSync('.'+item.poster).size>1000);
  const alternate=JSON.parse(execFileSync(probe,['-v','error','-show_streams','-of','json',path.resolve('.'+item.webm)],{encoding:'utf8'}));assert.equal(alternate.streams.length,1);assert.equal(alternate.streams[0].codec_name,'vp9');assert.equal(alternate.streams[0].width,640);
 }
 const output=process.env.MADONE_BUILD_DIR;
 if(output)for(const item of items){assert.ok(fs.existsSync(path.join(output,item.src)));assert.ok(fs.existsSync(path.join(output,item.poster)));assert.ok(fs.existsSync(path.join(output,item.webm)));}
});
