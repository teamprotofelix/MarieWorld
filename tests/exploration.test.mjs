import {test}from'node:test';import assert from'node:assert/strict';
import{createGameState}from'../game/game-state.js';import{changeMode,changeResources}from'../game/resource-model.js';import{MISSIONS,missionRisk,startMission,advanceMission,withdrawMission}from'../game/mission-model.js';
import{researchTech}from'../game/research-model.js';
const initial=()=>changeMode(createGameState(),'survival');

test('three existing routes have explicit increasing risk; start costs are atomic',()=>{
 const s=initial();for(const kind of Object.keys(MISSIONS)){assert(missionRisk(kind,0)<missionRisk(kind,2));const n=startMission(s,kind,0,.99);assert.equal(n.resources.amounts.power,s.resources.amounts.power-MISSIONS[kind].cost.power);assert.equal(s.exploration.active,null);}
 assert.throws(()=>startMission(changeResources(s,{power:-80}),'sample',0,.99));assert.throws(()=>startMission(s,'unknown',0,.5));assert.throws(()=>startMission(s,'observe',3,.5));assert.throws(()=>startMission(s,'observe',0,1));assert.throws(()=>startMission(createGameState(),'observe',0,.5));
});
test('successful mission pays materials/research once and logs a separate play record',()=>{
 let s=startMission(initial(),'observe',0,.99);assert.throws(()=>startMission(s,'drone',0,.99));s=advanceMission(s,8);assert.equal(s.progress.materials,11);assert.equal(s.research.points,3);assert.equal(s.exploration.history[0].status,'success');assert.equal(s.processedEventIds.filter(id=>id==='mission:1').length,1);assert.equal(advanceMission(s,60),s);assert.equal(withdrawMission(s),s);
});
test('failure and voluntary withdrawal preserve cost, with no prize or additional damage',()=>{
 let s=startMission(initial(),'drone',1,0),cost=s.resources.amounts;s=advanceMission(s,12);assert.equal(s.exploration.history[0].status,'failed');assert.equal(s.progress.materials,8);assert.deepEqual(s.resources.amounts,cost);
 let w=startMission(s,'sample',0,.99),stock=w.resources.amounts;w=withdrawMission(w);assert.equal(w.exploration.history[0].status,'withdrawn');assert.deepEqual(w.resources.amounts,stock);assert.equal(w.research.points,0);
});
test('time partition and safe pause inputs never complete early or duplicate prizes',()=>{
 let coarse=startMission(initial(),'sample',2,.99),fine=coarse;coarse=advanceMission(coarse,14);for(let i=0;i<14;i++)fine=advanceMission(fine,1);assert.deepEqual(fine,coarse);
 const active=startMission(initial(),'observe',0,.99);assert.equal(advanceMission(active,0),active);assert.throws(()=>advanceMission(active,-1));assert.throws(()=>advanceMission(active,Infinity));assert.throws(()=>changeMode(active,'healing'));
});
test('three research steps validate points, prerequisites and duplicate unlocks',()=>{
 let s=initial();assert.throws(()=>researchTech(s,'scanner'));assert.throws(()=>researchTech(s,'habitat'));assert.throws(()=>researchTech(s,'unknown'));
 for(let i=0;i<8;i++)s=advanceMission(startMission(s,'observe',0,.99),8);
 for(const id of ['scanner','habitat','recycling'])s=researchTech(s,id);assert.deepEqual(s.research.unlocked,['scanner','habitat','recycling']);assert.equal(s.research.points,6);assert.throws(()=>researchTech(s,'scanner'));
});
test('all mission outcomes remain game records with finite balances and no identity declaration',()=>{
 const s=advanceMission(startMission(initial(),'observe',0,.99),8);assert(s.exploration.history.every(h=>h.day===1));assert(!JSON.stringify(s).includes('VOYAGE'));assert(MISSIONS.observe.note.includes('판별 보류'));assert(MISSIONS.drone.note.includes('확정하지'));
});
