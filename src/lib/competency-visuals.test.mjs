import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {competencyLabels} from './competency-labels.mjs';
import {competencyVisuals,competencyVisual} from './competency-visuals.mjs';
function luminance(hex){const rgb=hex.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;}
test('all official presentation IDs have distinct lightweight vector images and readable colour pairs',async()=>{
 assert.deepEqual(Object.keys(competencyVisuals),Object.keys(competencyLabels));
 assert.equal(new Set(Object.values(competencyVisuals).map(value=>value.foreground)).size,14);
 for(const id of Object.keys(competencyLabels)){
  const visual=competencyVisual(id);
  const svg=await readFile(new URL('../../public'+visual.image,import.meta.url),'utf8');
  assert.ok(Buffer.byteLength(svg)<1500);
  assert.match(svg,/viewBox="0 0 24 24"/);
  assert.ok(svg.includes(visual.foreground));
  assert.ok((luminance(visual.background)+0.05)/(luminance(visual.foreground)+0.05)>=4.5,id+' contrast');
 }
 assert.equal(competencyVisual('UNKNOWN'),null);
});
