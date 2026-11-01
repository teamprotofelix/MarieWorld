import {freeze} from './game-state.js';
import {DEST} from './routes.js';
import {spendResources,levels} from './resource-model.js';
export const MISSIONS=freeze({observe:{name:'수동 전파 관측',seconds:8,cost:{power:2},risk:.05,materials:3,points:3,scene:'06_observatory_voyage_diary',note:'전파 침묵을 기록합니다. UNKNOWN-001의 정체는 판별 보류입니다.'},drone:{name:'드론 원격 시험 정찰',seconds:12,cost:{power:4,water:1},risk:.15,materials:5,points:5,scene:'05_workshop_drone_repair',note:'가상 장비 시험 임무입니다. 이야기 속 드론의 완전 수리를 확정하지 않습니다.'},sample:{name:'소행성 샘플 회수',seconds:14,cost:{power:5,hull:1},risk:.20,materials:6,points:6,scene:'06_observatory_voyage_diary',note:'선택한 항로의 소행성 표본을 게임 연구 자료로 회수합니다.'}});
export function missionRisk(kind,route){if(!Object.hasOwn(MISSIONS,kind)||!Number.isInteger(route)||route<0||route>=DEST.length)throw new TypeError('Unknown mission or route');return MISSIONS[kind].risk+[0,.05,.10][route];}
export function startMission(state,kind,route,roll){
 const risk=missionRisk(kind,route);if(!Number.isFinite(roll)||roll<0||roll>=1)throw new TypeError('Invalid random sample');
 if(state.mode!=='survival')throw new Error('Survival mode required');if(state.exploration.active)throw new Error('Mission already active');if(levels(state)==='critical')throw new Error('Safety reserve required');
 const mission=MISSIONS[kind],paid=spendResources(state,mission.cost);if(levels(paid)==='critical')throw new Error('Safety reserve required');
 const next=structuredClone(paid);const number=next.exploration.sequence+1;next.exploration.sequence=number;
 next.exploration.active={id:`mission:${number}`,kind,route,remaining:mission.seconds,success:roll>=risk};return freeze(next);
}
function finish(state,status){
 const active=state.exploration.active;if(!active)return state;
 if(state.processedEventIds.includes(active.id))throw new Error('Duplicate mission identity');
 const next=structuredClone(state),m=MISSIONS[active.kind];next.exploration.active=null;
 if(status==='success'){next.progress.materials+=m.materials;next.research.points+=m.points;next.missions[active.id]={status:'completed'};}
 next.exploration.history=[{id:active.id,kind:active.kind,route:active.route,status,day:state.day,minute:state.minute},...next.exploration.history].slice(0,24);
 next.processedEventIds.push(active.id);next.playLog=[...next.playLog,{id:active.id,type:'MissionCompleted',day:state.day,minute:state.minute}].slice(-24);return freeze(next);
}
export function advanceMission(state,seconds){
 if(!Number.isInteger(seconds)||seconds<0||seconds>60)throw new TypeError('Invalid mission time');if(!state.exploration.active||seconds===0)return state;
 const next=structuredClone(state);next.exploration.active.remaining=Math.max(0,next.exploration.active.remaining-seconds);
 return next.exploration.active.remaining===0?finish(next,next.exploration.active.success?'success':'failed'):freeze(next);
}
export function withdrawMission(state){return finish(state,'withdrawn');}
