import {freeze} from './game-state.js';
export const TECHNOLOGIES=freeze({scanner:{name:'기초 분광 관측',cost:4,requires:[],description:'예비 관측 자료를 분석합니다. 미지 신호의 정체는 확정하지 않습니다.'},habitat:{name:'온실 환경 제어',cost:6,requires:['scanner'],description:'온실 확장 설비의 게임 설계도를 엽니다.'},recycling:{name:'폐회로 회수',cost:8,requires:['habitat'],description:'재활용 설비의 게임 설계도를 엽니다.'}});
export function researchTech(state,id){
 if(!Object.hasOwn(TECHNOLOGIES,id))throw new TypeError('Unknown technology');const tech=TECHNOLOGIES[id];
 if(state.mode!=='survival')throw new Error('Survival mode required');if(state.research.unlocked.includes(id))throw new Error('Already researched');
 if(tech.requires.some(r=>!state.research.unlocked.includes(r)))throw new Error('Missing prerequisite');if(state.research.points<tech.cost)throw new Error('Insufficient research');
 const next=structuredClone(state);next.research.points-=tech.cost;next.research.unlocked.push(id);return freeze(next);
}
