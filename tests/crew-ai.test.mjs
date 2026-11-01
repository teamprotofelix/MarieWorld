import {test} from 'node:test';import assert from 'node:assert/strict';
import {ROOM_IDS} from '../game/rooms.js';
import {TASKS,ROOM_GRAPH,pathBetween,createCrew,enqueueTask,advanceCrew,setCrewAutomation,placeCrew} from '../game/crew-ai.js';
import {createLegacyAdapter} from '../game/legacy-adapter.js';

test('all ten rooms are connected by valid symmetric walking paths',()=>{
 for(const from of ROOM_IDS)for(const to of ROOM_IDS){const p=pathBetween(from,to);let previous=from;for(const room of p){assert(ROOM_GRAPH[previous].includes(room));assert(ROOM_GRAPH[room].includes(previous));previous=room;}assert.equal(previous,to);}
 assert.throws(()=>pathBetween('unknown','garden'));assert.throws(()=>createCrew('unknown'));
});
test('tasks travel before work, report completion only at the correct room and once',()=>{
 let s=enqueueTask(createCrew(),'garden','task:1');const original=s;
 s=advanceCrew(s,3).state;assert.equal(s.action,'walk');assert.notEqual(s.room,'garden');
 let r=advanceCrew(s,1);s=r.state;assert.equal(s.room,'garden');assert.equal(s.action,'garden');assert.equal(r.events.length,0);
 r=advanceCrew(s,12);assert.equal(r.events.length,1);assert.equal(r.events[0].payload.room,'garden');assert.equal(r.events[0].id,'task:1');
 assert.equal(advanceCrew(r.state,60).events.length,0);assert.equal(original.room,'lounge');assert.equal(original.current,null);
});
test('all work states are reachable and time partitioning preserves order and results',()=>{
 let s=createCrew();for(const [i,action]of Object.keys(TASKS).entries())s=enqueueTask(s,action,`job:${i}`);
 let coarse=s,fine=s,ce=[],fe=[];
 for(let i=0;i<4;i++){const r=advanceCrew(coarse,60);coarse=r.state;ce.push(...r.events);}
 for(let i=0;i<2400;i++){const r=advanceCrew(fine,.1);fine=r.state;fe.push(...r.events);}
 assert.deepEqual(ce,fe);assert.equal(ce.length,8);assert.equal(fine.action,'idle');assert.equal(coarse.room,fine.room);assert.equal(fine.queue.length,0);
});
test('invalid tasks, duplicate ids, queue overflow and invalid deltas leave input intact',()=>{
 const s=createCrew();for(const [action,id,room]of [['unknown','x','garden'],['garden','bad space','garden'],['garden','x','cargo']])assert.throws(()=>enqueueTask(s,action,id,room));
 let q=s;for(let i=0;i<8;i++)q=enqueueTask(q,'rest',`q:${i}`);assert.throws(()=>enqueueTask(q,'rest','extra'));assert.throws(()=>enqueueTask(q,'rest','q:1'));
 for(const n of [-1,NaN,Infinity,61])assert.throws(()=>advanceCrew(q,n));assert.equal(q.queue.length,8);assert(Object.isFrozen(q.queue));
});
test('inspection can target every legacy room; pose and crew flags survive legacy updates',()=>{
 for(const room of ROOM_IDS){let s=enqueueTask(createCrew(room),'inspect',`inspect:${room}`,room);let r=advanceCrew(s,10);assert.equal(r.events[0].payload.room,room);}
 const g=createLegacyAdapter();g.apply(setCrewAutomation,true);g.update(d=>{d.speed=2;});assert.equal(g.snapshot().session.crewAutomation,true);g.apply(placeCrew,'garden','garden');assert.equal(g.read().room,'garden');assert.equal(g.snapshot().crew.marie.action,'garden');
});
test('task completion events integrate with the owned event ledger without economic changes',()=>{
 const g=createLegacyAdapter(),initial=g.read().stats;const e=advanceCrew(enqueueTask(createCrew('garden'),'garden','done:1'),12).events[0];g.dispatch(e);g.dispatch(e);assert.deepEqual(g.read().stats,initial);assert.equal(g.snapshot().playLog.length,1);
});
