import { ROOM_IDS } from './rooms.js';
import { freeze } from './game-state.js';
import { identifier } from './game-events.js';
export const ROOM_GRAPH = freeze({ cockpit:['corridor','observatory'], garden:['corridor','kitchen'], kitchen:['garden','lounge'], lounge:['kitchen','corridor','bedroom','observatory'], bedroom:['lounge','cargo'], workshop:['cargo','engine','corridor'], cargo:['bedroom','workshop','corridor'], observatory:['lounge','cockpit'], engine:['workshop','corridor'], corridor:['cockpit','garden','lounge','workshop','cargo','engine'] });
export const TASKS = freeze({
  garden:{room:'garden',seconds:12,label:'정원 돌보기',symbol:'♧',line:'기존 정원의 조명과 순환수를 확인하고 있어요.'},
  cook:{room:'kitchen',seconds:10,label:'수프 준비',symbol:'♨',line:'따뜻한 수프 두 그릇을 준비하고 있어요.'},
  repair:{room:'workshop',seconds:12,label:'드론 정비',symbol:'⚒',line:'드론의 연결부를 살펴보고 있어요. 시험은 아직 남아 있어요.'},
  read:{room:'lounge',seconds:8,label:'함께 읽기',symbol:'▤',line:'책의 다음 장을 천천히 넘겨 보고 있어요.'},
  tea:{room:'lounge',seconds:10,label:'차 우리기',symbol:'♨',line:'E 몫의 찻잔도 따뜻하게 데우고 있어요.'},
  record:{room:'observatory',seconds:10,label:'관측 메모',symbol:'✎',line:'방금 본 별빛을 플레이 메모로 정리하고 있어요.'},
  rest:{room:'bedroom',seconds:8,label:'잠깐 쉬기',symbol:'☾',line:'잠시 쉬고 나면 다시 함께 걸을 수 있어요.'},
  inspect:{room:'engine',seconds:10,label:'설비 점검',symbol:'✧',line:'생활 설비의 상태를 차례로 확인하고 있어요.'},
});
export function pathBetween(from,to) {
  if (!ROOM_IDS.includes(from)||!ROOM_IDS.includes(to)) throw new TypeError('Unknown room');
  const paths=[[from]],seen=new Set([from]);
  for (let i=0;i<paths.length;i++) {
    const path=paths[i],last=path.at(-1);if(last===to)return path.slice(1);
    for(const next of ROOM_GRAPH[last])if(!seen.has(next)){seen.add(next);paths.push([...path,next]);}
  }
  throw new Error('Disconnected room');
}
export function createCrew(room='lounge') {
  if(!ROOM_IDS.includes(room))throw new TypeError('Unknown room');
  return freeze({room,action:'idle',current:null,queue:[],route:[],elapsed:0});
}
export function enqueueTask(state,action,id,room=TASKS[action]?.room) {
  if(!Object.hasOwn(TASKS,action))throw new TypeError('Unknown task');identifier(id);
  if(!ROOM_IDS.includes(room)||(action!=='inspect'&&room!==TASKS[action].room))throw new TypeError('Invalid task room');
  if(state.queue.length>=8)throw new Error('Queue is full');
  if(state.current?.id===id||state.queue.some(t=>t.id===id))throw new Error('Duplicate task');
  return freeze({...state,queue:[...state.queue,{action,id,room}]});
}
export function advanceCrew(state,seconds) {
  if(!Number.isFinite(seconds)||seconds<0||seconds>60)throw new TypeError('Invalid elapsed time');
  const next=structuredClone(state),events=[];
  let remaining=seconds;
  for(let guard=0;guard<64;guard++) {
    if(!next.current) {
      if(!next.queue.length){next.action='idle';next.elapsed=0;break;}
      next.current=next.queue.shift();next.route=pathBetween(next.room,next.current.room);next.elapsed=0;
      next.action=next.route.length?'walk':next.current.action;
    }
    const duration=next.action==='walk'?2:TASKS[next.current.action].seconds;
    const dt=Math.min(remaining,duration-next.elapsed);next.elapsed+=dt;remaining-=dt;
    if(next.elapsed+1e-9<duration)break;
    next.elapsed=0;
    if(next.action==='walk') {
      next.room=next.route.shift();next.action=next.route.length?'walk':next.current.action;
    } else {
      events.push({id:next.current.id,type:'CrewActionCompleted',payload:{room:next.room,action:next.current.action,changes:{mood:0}}});
      next.current=null;next.action='idle';
    }
    if(remaining<=1e-9)break;
  }
  return {state:freeze(next),events:freeze(events)};
}
export function setCrewAutomation(state,enabled) {
  if(typeof enabled!=='boolean')throw new TypeError('Expected boolean');
  return freeze({...state,session:{...state.session,crewAutomation:enabled},crew:{...state.crew,marie:{...state.crew.marie,action:'idle'}}});
}
export function placeCrew(state,room,action) {
  if(!ROOM_IDS.includes(room)||!['idle','walk',...Object.keys(TASKS)].includes(action))throw new TypeError('Invalid crew pose');
  if(state.crew.marie.room===room&&state.crew.marie.action===action)return state;
  return freeze({...state,crew:{...state.crew,marie:{...state.crew.marie,room,action}}});
}
