import {createGameState,freeze,SCHEMA_VERSION} from './game-state.js';
import {RESOURCE_IDS,ROOM_IDS,object,exact,identifier} from './game-events.js';
import {MISSIONS} from './mission-model.js';
import {TECHNOLOGIES} from './research-model.js';
import {MODULES} from './module-catalog.js';
export const FORMAT='marie-world-save',MAX_SAVE_BYTES=2*1024*1024;
export const SAVE_KEYS=Object.freeze({consent:'marie-world:v2:consent',data:'marie-world:v2:save'});
const integer=(n,min,max)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw new TypeError('Invalid integer');};
function missionNumber(id,sequence){if(typeof id!=='string'||!/^mission:[1-9]\d*$/.test(id))throw new TypeError('Invalid mission id');const n=Number(id.slice(8));integer(n,1,sequence);return n;}
function validateGame(g){
 exact(g,['day','minute','mode','room','speed','destination','resources','progress','research','installed','exploration','missions','receipts']);
 integer(g.day,1,1000000);integer(g.minute,0,1439);if(!['healing','survival'].includes(g.mode)||!ROOM_IDS.includes(g.room)||![1,2,4].includes(g.speed)||![0,1,2].includes(g.destination))throw new TypeError('Invalid play settings');
 exact(g.resources,['amounts','lastRescueAt']);exact(g.resources.amounts,RESOURCE_IDS);
 for(const n of Object.values(g.resources.amounts))if(!Number.isFinite(n)||n<0||n>100||(g.mode==='healing'&&(n<15||!Number.isInteger(n))))throw new TypeError('Invalid inventory');
 const now=(g.day-1)*1440+g.minute;if(g.resources.lastRescueAt!==null)integer(g.resources.lastRescueAt,0,now);
 exact(g.progress,['materials']);integer(g.progress.materials,0,1000000000);exact(g.research,['points','unlocked']);integer(g.research.points,0,1000000000);
 if(!Array.isArray(g.research.unlocked)||new Set(g.research.unlocked).size!==g.research.unlocked.length||g.research.unlocked.length>3)throw new TypeError('Invalid research');
 for(const id of g.research.unlocked)if(!Object.hasOwn(TECHNOLOGIES,id)||TECHNOLOGIES[id].requires.some(r=>!g.research.unlocked.includes(r)))throw new TypeError('Invalid research prerequisites');
 object(g.installed);const slots=new Set();for(const [id,m]of Object.entries(g.installed)){
  if(!Object.hasOwn(MODULES,id))throw new TypeError('Unknown facility');exact(m,['slot','room']);const spec=MODULES[id];if(m.slot!==spec.slot||m.room!==spec.room||!g.research.unlocked.includes(spec.tech)||slots.has(m.slot))throw new TypeError('Invalid facility connection');slots.add(m.slot);
 }
 if(!Array.isArray(g.receipts)||g.receipts.length>50000||new Set(g.receipts).size!==g.receipts.length)throw new TypeError('Invalid receipts');for(const id of g.receipts)identifier(id);const receipts=new Set(g.receipts);
 exact(g.exploration,['sequence','active','history']);integer(g.exploration.sequence,0,1000000000);
 const active=g.exploration.active;if(active!==null){
  exact(active,['id','kind','route','remaining','success']);missionNumber(active.id,g.exploration.sequence);
  if(g.mode!=='survival'||!Object.hasOwn(MISSIONS,active.kind)||receipts.has(active.id)||typeof active.success!=='boolean')throw new TypeError('Invalid active mission');integer(active.route,0,2);integer(active.remaining,1,MISSIONS[active.kind].seconds);
 }
 if(!Array.isArray(g.exploration.history)||g.exploration.history.length>24)throw new TypeError('Invalid mission history');const historyIds=new Set();
 for(const h of g.exploration.history){exact(h,['id','kind','route','status','day','minute']);missionNumber(h.id,g.exploration.sequence);if(!Object.hasOwn(MISSIONS,h.kind)||!['success','failed','withdrawn'].includes(h.status)||!receipts.has(h.id)||historyIds.has(h.id)||h.id===active?.id)throw new TypeError('Invalid mission history');historyIds.add(h.id);integer(h.route,0,2);integer(h.day,1,g.day);integer(h.minute,0,1439);if((h.day-1)*1440+h.minute>now)throw new TypeError('Future mission record');}
 object(g.missions);for(const [id,m]of Object.entries(g.missions)){missionNumber(id,g.exploration.sequence);exact(m,['status']);if(m.status!=='completed'||!receipts.has(id)||id===active?.id)throw new TypeError('Invalid completed mission');}
 for(const h of g.exploration.history)if((h.status==='success')!==Object.hasOwn(g.missions,h.id))throw new TypeError('Inconsistent mission outcome');
 for(const id of receipts)if(id.startsWith('mission:'))missionNumber(id,g.exploration.sequence);
 return g;
}
function dataFromState(s){return structuredClone({day:s.day,minute:s.minute,mode:s.mode,room:s.crew.marie.room,speed:s.session.speed,destination:s.session.destination,resources:s.resources,progress:s.progress,research:s.research,installed:s.modules.installed,exploration:s.exploration,missions:s.missions,receipts:s.processedEventIds});}
function stateFromData(g){
 validateGame(g);const base=createGameState(),next=structuredClone(base);next.day=g.day;next.minute=g.minute;next.mode=g.mode;next.crew.marie.room=g.room;next.session.speed=g.speed;next.session.destination=g.destination;next.session.auto=false;next.session.crewAutomation=false;next.features.newEconomy=g.mode==='survival';
 next.resources=structuredClone(g.resources);for(const key of RESOURCE_IDS)next.stats[key]=Math.round(g.resources.amounts[key]);next.progress=structuredClone(g.progress);next.research=structuredClone(g.research);next.modules.installed=structuredClone(g.installed);next.exploration=structuredClone(g.exploration);next.missions=structuredClone(g.missions);next.processedEventIds=[...g.receipts];return freeze(next);
}
// v1 is an explicitly tagged legacy snapshot fixture, not an earlier auto-save.
// The migration table makes future versions opt-in and rejects unknown versions.
const MIGRATIONS={1:data=>{
 exact(data,['day','minute','stats','room','destination','speed']);
 const source={day:data.day,minute:data.minute,stats:data.stats,room:data.room,destination:data.destination,speed:data.speed,auto:false,feed:[]};
 const base=createGameState(source);return dataFromState(base);
}};
export function encodeSave(state){const game=dataFromState(state);validateGame(game);const text=JSON.stringify({format:FORMAT,schemaVersion:SCHEMA_VERSION,game},null,2);if(new TextEncoder().encode(text).length>MAX_SAVE_BYTES)throw new Error('Save too large');return text;}
export function decodeSave(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SAVE_BYTES)throw new TypeError('Save too large');
 const envelope=JSON.parse(text);exact(envelope,['format','schemaVersion','game']);if(!Number.isSafeInteger(envelope.schemaVersion))throw new TypeError('Invalid save version');if(envelope.format!==FORMAT)throw new TypeError('Unknown save format');
 let data=envelope.game;if(envelope.schemaVersion!==SCHEMA_VERSION){if(!Object.hasOwn(MIGRATIONS,envelope.schemaVersion))throw new TypeError('Unsupported save version');data=MIGRATIONS[envelope.schemaVersion](data);}
 return stateFromData(data);
}
export function createLocalStore(storage){
 return Object.freeze({isEnabled:()=>storage.getItem(SAVE_KEYS.consent)==='yes',hasData:()=>storage.getItem(SAVE_KEYS.data)!==null,
  enable(){storage.setItem(SAVE_KEYS.consent,'yes');},disable(){storage.removeItem(SAVE_KEYS.consent);},
  save(state){if(storage.getItem(SAVE_KEYS.consent)!=='yes')throw new Error('Consent required');const text=encodeSave(state);storage.setItem(SAVE_KEYS.data,text);return text.length;},
  load(){const text=storage.getItem(SAVE_KEYS.data);if(text===null)throw new Error('No save');return decodeSave(text);},
  deleteAll(){storage.removeItem(SAVE_KEYS.data);storage.removeItem(SAVE_KEYS.consent);}
 });
}
