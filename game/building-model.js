import {freeze} from './game-state.js';
import {MODULES,BUILD_SLOTS} from './module-catalog.js';
import {spendResources,levels} from './resource-model.js';
export function installModule(state,id,slot){
 if(!Object.hasOwn(MODULES,id)||!Object.hasOwn(BUILD_SLOTS,slot))throw new TypeError('Unknown module or slot');const m=MODULES[id];
 if(state.mode!=='survival')throw new Error('Survival mode required');if(!state.research.unlocked.includes(m.tech))throw new Error('Research required');
 if(Object.hasOwn(state.modules.installed,id))throw new Error('Already installed');if(slot!==m.slot||BUILD_SLOTS[slot].room!==m.room||!state.modules.baseRooms.includes(m.room))throw new Error('Invalid connection');
 if(Object.values(state.modules.installed).some(v=>v.slot===slot))throw new Error('Slot occupied');if(state.progress.materials<m.materials)throw new Error('Insufficient materials');
 const paid=spendResources(state,{power:m.power});if(levels(paid)==='critical')throw new Error('Safety reserve required');
 const next=structuredClone(paid);next.progress.materials-=m.materials;next.modules.installed[id]={slot,room:m.room};return freeze(next);
}
export function removeModule(state,id){
 if(!Object.hasOwn(MODULES,id))throw new TypeError('Unknown module');if(state.mode!=='survival')throw new Error('Survival mode required');if(!Object.hasOwn(state.modules.installed,id))throw new Error('Not installed');
 const next=structuredClone(state);delete next.modules.installed[id];next.progress.materials+=Math.floor(MODULES[id].materials/2);return freeze(next);
}
