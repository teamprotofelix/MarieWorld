import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import vm from 'node:vm';
import {FlightModel, SCENERY} from '../flight-model.js';
const read = p => readFile(new URL('../'+p,import.meta.url),'utf8');

test('manual movement uses seconds and keeps the entire hull inside all tested viewports',()=>{
  for(const [w,h] of [[304,320],[344,320],[374,320],[396,320],[900,470]]) {
    const model=new FlightModel(()=>.5);model.setBounds(w,h);model.setMode('manual');
    const start=model.ship.x;model.step(.05,{right:true});assert(model.ship.x>start);
    for(let i=0;i<150;i++)model.step(.05,{right:true,up:true});
    assert(model.ship.x*w+model.shipWidth/2<=w-9);
    assert(model.ship.y*h-model.shipWidth*.32>=11);
  }
});
test('movement and encounter results are consistent at 30 and 60 Hz',()=>{
  const run=hz=>{const m=new FlightModel(()=>.4);m.setMode('manual');m.objects=[];
    for(let i=0;i<hz;i++)m.step(1/hz,{down:true});return m;};
  const a=run(30),b=run(60);
  assert(Math.abs(a.ship.y-b.ship.y)<.00001);assert(Math.abs(a.distance-b.distance)<.00001);
});
test('background gaps are capped and invalid deltas cannot poison state',()=>{
  const m=new FlightModel();m.step(100);assert.equal(m.time,.05);m.step(NaN);m.step(-1);assert.equal(m.time,.05);
});
test('fragments collect once; collision cooldown cushions repeated hits; recovery is local',()=>{
  const m=new FlightModel();m.setMode('manual');m.objects=[];
  m.spawn('fragment',m.ship.x,m.ship.y);m.step(.01);assert.equal(m.fragments,1);m.step(.01);assert.equal(m.fragments,1);
  m.spawn('asteroid',m.ship.x,m.ship.y);m.step(.01);assert.equal(m.shield,75);
  m.step(.01);assert.equal(m.shield,75);
  for(let i=0;i<3;i++){m.invincible=0;m.objects=[];m.spawn('asteroid',m.ship.x,m.ship.y);m.step(.01);}
  assert.equal(m.recoveries,1);assert.equal(m.shield,100);assert.equal(m.fragments,1);
});
test('auto pilot is safe, collects fragments, recovers shield and cycles eight scenic types',()=>{
  const m=new FlightModel(()=>.5);m.spawn('asteroid',m.ship.x,m.ship.y);m.shield=50;
  const seen=new Set(m.scenery.map(o=>o.kind));
  for(let i=0;i<6000;i++){m.step(.05);m.scenery.forEach(o=>seen.add(o.kind));assert(m.objects.length<=14);assert(m.scenery.length<=4);}
  assert.equal(m.shield,100);assert.equal(m.recoveries,0);assert(m.fragments>0);
  assert(SCENERY.every(x=>seen.has(x)));
});
test('reduced motion slows the scenery without slowing manual controls',()=>{
  const a=new FlightModel(),b=new FlightModel();a.setMode('manual');b.setMode('manual');
  a.step(.05,{right:true});b.step(.05,{right:true},true);
  assert.equal(a.ship.x,b.ship.x);assert(b.time<a.time);
});
test('every flight asset and module is precached, with a new SW version and unchanged approval flow',async()=>{
  const sw=await read('sw.js');
  const sandbox={self:{addEventListener(){}},URL};vm.createContext(sandbox);
  vm.runInContext(sw+';globalThis.paths=ASSETS;globalThis.version=VERSION;',sandbox);
  assert.equal(sandbox.version,'marie-v06-voyage-2');
  const flight=sandbox.paths.filter(p=>p.includes('flight'));
  assert.equal(flight.length,21);
  for(const path of sandbox.paths)if(path!=='./')assert((await stat(new URL('../'+path,import.meta.url))).size>0,path);
  assert((await read('pwa.js')).includes("userAcceptedUpdate=true"));
  assert(!/skipWaiting\(\)/.test(sw.split("self.addEventListener('message'")[0]));
  const code=await read('flight.js')+await read('flight-model.js');
  assert(!/localStorage|sessionStorage|fetch\(|\/api\//.test(code));
});
