import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGameState} from '../game/game-state.js';import {createLegacyAdapter} from '../game/legacy-adapter.js';
import {rates,levels,changeMode,changeResources,spendResources,advanceResources,emergencyRecovery,rewardMinigame,ROOM_REWARDS,RESOURCE_INFO} from '../game/resource-model.js';
const survival=()=>changeMode(createGameState(),'survival');
test('healing remains default and opt-in mode boundaries preserve legacy 15–100',()=>{
 const initial=createGameState();assert.equal(initial.mode,'healing');assert.equal(advanceResources(initial,60),initial);assert.equal(initial.features.newEconomy,false);
 const low=changeResources(survival(),{food:-100});assert.equal(low.stats.food,0);const back=changeMode(low,'healing');assert.equal(back.stats.food,15);assert.equal(back.features.newEconomy,false);assert.equal(back.progress.materials,8);
});
test('production minus consumption is deterministic, fractional and independent of time partition',()=>{
 let s=survival(),once=advanceResources(s,60);for(let i=0;i<60;i++)s=advanceResources(s,1);
 for(const key of Object.keys(RESOURCE_INFO))assert(Math.abs(s.resources.amounts[key]-once.resources.amounts[key])<1e-8);
 assert(Math.abs(s.resources.amounts.food-72.2)<1e-8);assert.equal(s.minute,440);assert.equal(s.stats.food,72);assert.equal(rates(s).power.production,.4);
});
test('legacy UI-only transactions preserve fractional stocks; real actions and travel change actual inventory',()=>{
 const g=createLegacyAdapter();g.apply(changeMode,'survival');g.apply(advanceResources,1);const stock=g.snapshot().resources.amounts.food;g.update(d=>{d.auto=false;d.speed=4;d.room='garden';});assert.equal(g.snapshot().resources.amounts.food,stock);g.crewAction('garden',{food:4,water:-1,power:-1});assert(Math.abs(g.snapshot().resources.amounts.food-stock-4)<1e-9);
});
test('garden completion pays the printed rule and material/research once, failure has no penalty',()=>{
 const s=survival(),next=rewardMinigame(s,'garden:1','garden',true);assert.equal(next.resources.amounts.food,81);assert.equal(next.resources.amounts.water,82);assert.equal(next.resources.amounts.power,85);assert.equal(next.research.points,1);assert.equal(next.progress.materials,9);assert.equal(rewardMinigame(next,'garden:1','garden',true),next);
 const failed=rewardMinigame(next,'garden:2','garden',false);assert.deepEqual(failed.stats,next.stats);assert.equal(failed.research.points,1);assert.equal(rewardMinigame(failed,'garden:2','garden',true),failed);
});
test('healing results are receipted without rewards and cannot be replayed after mode change',()=>{
 const base=createGameState(),healed=rewardMinigame(base,'old:1','garden',true);assert.deepEqual(healed.stats,base.stats);const switched=changeMode(healed,'survival');assert.equal(rewardMinigame(switched,'old:1','garden',true),switched);
});
test('warning, critical pause, emergency recovery and cooldown give safe choices without game over',()=>{
 let s=changeResources(survival(),{food:-53});assert.equal(levels(s),'warning');s=changeResources(s,{food:-15});assert.equal(levels(s),'critical');assert.equal(s.session.auto,false);s=emergencyRecovery(s);assert.equal(s.resources.amounts.food,35);assert.equal(s.session.auto,true);
 const low=changeResources(s,{food:-12});assert.throws(()=>emergencyRecovery(low),/cooldown/);const later=advanceResources(low,30);assert.equal(emergencyRecovery(later).resources.amounts.food,35);
 assert.throws(()=>emergencyRecovery(createGameState()),/Survival/);
});
test('costs fail atomically; invalid deltas, ids, rooms and modes cannot poison inventory',()=>{
 const s=survival();assert.throws(()=>spendResources(s,{power:100}),/Insufficient/);assert.throws(()=>spendResources(s,{power:-1}));assert.throws(()=>changeResources(s,{water:NaN}));assert.throws(()=>changeMode(s,'unsafe'));for(const n of [NaN,-1,.5,61])assert.throws(()=>advanceResources(s,n));assert.throws(()=>rewardMinigame(s,'bad space','garden',true));assert.throws(()=>rewardMinigame(s,'a','missing',true));assert.equal(s.stats.power,86);
});
test('all room reward rules reference existing stocks and cap rather than overflow',()=>{
 for(const changes of Object.values(ROOM_REWARDS))for(const key of Object.keys(changes))assert(Object.hasOwn(RESOURCE_INFO,key));
 const max=changeResources(survival(),{food:100,oxygen:100});const rewarded=rewardMinigame(max,'capped:1','garden',true);assert.equal(rewarded.stats.food,100);assert.equal(rewarded.resources.amounts.food,100);
});
