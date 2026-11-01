import {MODULES} from './module-catalog.js';
import { freeze } from './game-state.js';
import { RESOURCE_IDS, ROOM_IDS, identifier, resourceChanges } from './game-events.js';
export const RESOURCE_INFO=freeze({oxygen:{label:'산소',unit:'유지 단위',capacity:100},power:{label:'전력',unit:'축전 단위',capacity:100},food:{label:'식량',unit:'보급 단위',capacity:100},water:{label:'식수',unit:'회수 단위',capacity:100},hull:{label:'선체',unit:'정비 단위',capacity:100},mood:{label:'행복도',unit:'휴식 단위',capacity:100}});
export const ROOM_REWARDS=freeze({cockpit:{power:1,mood:1},garden:{food:4,oxygen:1,water:-1,power:-1},kitchen:{food:-1,mood:5},lounge:{mood:3},bedroom:{mood:3},workshop:{hull:3,power:-1},cargo:{food:2,water:2},observatory:{mood:2},engine:{power:5,hull:1},corridor:{hull:1,mood:1}});
export function rates(state){
 const flow={power:{production:.40,consumption:.32},oxygen:{production:.18,consumption:.16},food:{production:0,consumption:.08},water:{production:.12,consumption:.15},hull:{production:0,consumption:.01},mood:{production:.04,consumption:.06}};
 for(const id of Object.keys(state.modules.installed))if(Object.hasOwn(MODULES,id))for(const [resource,effect]of Object.entries(MODULES[id].effects))for(const [kind,n]of Object.entries(effect))flow[resource][kind]+=n;
 return flow;
}
export function levels(state){const v=Object.values(state.resources.amounts);return Math.min(...v)<=10?'critical':Math.min(...v)<=25?'warning':'normal';}
function syncStats(next){for(const key of RESOURCE_IDS){next.resources.amounts[key]=Math.min(100,Math.max(next.mode==='survival'?0:15,next.mode==='survival'?next.resources.amounts[key]:Math.round(next.resources.amounts[key])));next.stats[key]=Math.round(next.resources.amounts[key]);}return next;}
export function changeMode(state,mode){
 if(!['healing','survival'].includes(mode))throw new TypeError('Unknown mode');if(state.mode===mode)return state;
 if(state.exploration?.active)throw new Error('Withdraw the active mission first');
 const next=structuredClone(state);next.mode=mode;next.features.newEconomy=mode==='survival';return freeze(syncStats(next));
}
export function changeResources(state,changes){
 resourceChanges(changes);const next=structuredClone(state);
 for(const [key,value] of Object.entries(changes))next.resources.amounts[key]+=value;
 syncStats(next);if(next.mode==='survival'&&levels(next)==='critical')next.session.auto=false;return freeze(next);
}
export function spendResources(state,cost){
 resourceChanges(cost);if(Object.values(cost).some(n=>n<0))throw new TypeError('Negative cost');
 if(Object.entries(cost).some(([key,n])=>state.resources.amounts[key]<n))throw new Error('Insufficient resources');
 return changeResources(state,Object.fromEntries(Object.entries(cost).map(([k,n])=>[k,-n])));
}
export function advanceResources(state,minutes){
 if(!Number.isInteger(minutes)||minutes<0||minutes>60)throw new TypeError('Invalid game minutes');
 if(state.mode!=='survival'||minutes===0)return state;
 const next=structuredClone(state),flow=rates(state);
 for(const key of RESOURCE_IDS)next.resources.amounts[key]+=(flow[key].production-flow[key].consumption)*minutes;
 const absolute=(state.day-1)*1440+state.minute+minutes;next.day=Math.floor(absolute/1440)+1;next.minute=absolute%1440;
 syncStats(next);if(levels(next)==='critical')next.session.auto=false;
 return freeze(next);
}
export function emergencyRecovery(state){
 if(state.mode!=='survival')throw new Error('Survival mode required');
 const now=(state.day-1)*1440+state.minute;
 if(state.resources.lastRescueAt!==null&&now-state.resources.lastRescueAt<30)throw new Error('Recovery cooldown');
 if(Object.values(state.resources.amounts).every(n=>n>=35))throw new Error('Recovery not needed');
 const next=structuredClone(state);for(const key of RESOURCE_IDS)next.resources.amounts[key]=Math.max(35,next.resources.amounts[key]);
 next.resources.lastRescueAt=now;next.session.auto=true;return freeze(syncStats(next));
}
export function rewardMinigame(state,id,room,success){
 identifier(id);if(!ROOM_IDS.includes(room)||typeof success!=='boolean')throw new TypeError('Invalid game result');
 if(state.processedEventIds.includes(id))return state;
 let next=structuredClone(state);
 if(state.mode==='survival'&&success){
  next=structuredClone(changeResources(state,ROOM_REWARDS[room]));next.research.points+=1;next.progress.materials+=1;
 }
 next.processedEventIds.push(id);next.playLog=[...next.playLog,{id,type:'MinigameCompleted',day:state.day,minute:state.minute}].slice(-24);
 return freeze(next);
}
