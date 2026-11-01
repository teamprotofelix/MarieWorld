import './app.js';
import { game, eventId } from './game/session.js';
import { subscribeSimulation, simulationPaused } from './game/runtime.js';
import { TASKS, createCrew, enqueueTask, advanceCrew, setCrewAutomation, placeCrew } from './game/crew-ai.js';
import { ROOMS } from './game/rooms.js';
const $=id=>document.getElementById(id),roomName=id=>ROOMS.find(r=>r[0]===id)?.[1]||'';
const media=matchMedia('(prefers-reduced-motion: reduce)');
let crew=createCrew(game.snapshot().crew.marie.room),viewRoom='cockpit',concept=false,paint=0;
const SCENES={garden:'01_hydroponic_garden_marie',kitchen:'04_galley_kitchen_teatime',workshop:'05_workshop_drone_repair',observatory:'06_observatory_voyage_diary'};
const ROOM_TASK={cockpit:'inspect',garden:'garden',kitchen:'cook',lounge:'tea',bedroom:'rest',workshop:'repair',cargo:'inspect',observatory:'record',engine:'inspect',corridor:'inspect'};
for(const [id,task] of Object.entries(TASKS)){const option=document.createElement('option');option.value=id;option.textContent=`${task.label} · ${roomName(task.room)}`;$('crewTask').append(option);}
function addTask(action,room=TASKS[action].room){
 try{crew=enqueueTask(crew,action,eventId('crew'),room);$('crewFeedback').textContent='일과에 추가했습니다. 방을 닫으면 이어 갑니다.';render();}
 catch(e){$('crewFeedback').textContent=e.message==='Queue is full'?'대기 일과는 8개까지 담을 수 있어요.':'일과를 추가하지 못했습니다.';}
}
function showScene(){
 const available=!!SCENES[viewRoom];$('roomSceneToggle').hidden=!available;
 $('roomSceneToggle').setAttribute('aria-pressed',String(available&&concept));
 $('roomSceneToggle').textContent=concept?'기존 방 배경 보기':'생활 장면 보기';
 $('roomSceneNote').textContent=available&&concept?'생활 장면 콘셉트 · 정지 그림입니다. 실제 작업 상태는 위 표시를 확인해 주세요.':'';
 const src=available&&concept?`assets/concepts/v2/${SCENES[viewRoom]}.webp`:`assets/${viewRoom}.webp`;
 if($('roomImage').getAttribute('src')!==src)$('roomImage').src=src;
}
$('roomImage').addEventListener('error',()=>{
 if(concept&&$('roomImage').getAttribute('src')?.includes('/concepts/')){
  $('roomImage').src=`assets/${viewRoom}.webp`;$('roomSceneNote').textContent='생활 그림을 불러오지 못해 기존 방 배경을 보여 드립니다.';
 }
});
$('roomSceneToggle').addEventListener('click',()=>{concept=!concept;showScene();});
function render(){
 const enabled=!!game.snapshot().session.crewAutomation,paused=simulationPaused();
 $('crewToggle').setAttribute('aria-pressed',String(enabled));$('crewToggle').textContent=enabled?'생활 일과 끄기':'생활 일과 켜기';
 for(const id of ['crewEnqueue','crewPlan','crewClear'])$(id).disabled=!enabled;
 $('crewPlan').disabled=!enabled||crew.queue.length>4;
 $('mapMarie').toggleAttribute('data-life',enabled);
 const sprite=document.querySelector('.room-sprite');sprite.toggleAttribute('data-life',enabled);sprite.hidden=enabled&&crew.room!==viewRoom;
 if(!enabled){$('crewState').textContent='일과를 켜고 함께할 일을 골라 주세요.';$('crewLine').textContent='정원, 따뜻한 수프, 책 한 장과 별빛.';$('crewProgress').value=0;$('roomCrewState').textContent='';return;}
 const task=crew.current?TASKS[crew.current.action]:null;
 const status=crew.action==='walk'?`${roomName(crew.room)} → ${roomName(crew.route[0])} 이동`:task?`${roomName(crew.room)} · ${task.label}`:`${roomName(crew.room)} · 잠깐 대기`;
 const line=crew.action==='walk'?`E, ${roomName(crew.route[0])} 쪽으로 걸어가고 있어요.`:task?.line||'다음 일을 함께 골라 볼까요?';
 $('crewState').textContent=(paused?'Ⅱ 잠시 멈춤 · ':'')+status;$('crewState').dataset.action=crew.action;
 $('crewLine').textContent=line;$('crewSymbol').textContent=crew.action==='walk'?'↝':task?.symbol||'♡';
 $('crewProgress').value=task?crew.elapsed/(crew.action==='walk'?2:task.seconds):0;
 $('crewQueue').textContent=crew.queue.length?`다음 일과 ${crew.queue.length}/8 · `+crew.queue.map(t=>TASKS[t.action].label).join(' → '):'대기 중인 일과가 없습니다.';
 $('roomCrewState').textContent=`마리의 현재 위치: ${roomName(crew.room)} · ${status}. 방을 둘러보는 동안 일과는 멈춥니다.`;
 $('activityLabel').textContent=status;$('marieSpeech').textContent=`“${line}”`;
 const source=ROOMS.find(r=>r[0]===crew.room),target=ROOMS.find(r=>r[0]===crew.route[0]);
 const t=crew.action==='walk'&&!media.matches?crew.elapsed/2:0;
 $('mapMarie').style.left=(source[5]+((target?.[5]??source[5])-source[5])*t)+'%';
 $('mapMarie').style.top=(source[6]+((target?.[6]??source[6])-source[6])*t)+'%';
 for(const node of [$('mapMarie'),sprite]){node.dataset.action=crew.action;node.dataset.paused=String(paused);}
 $('moodEmote').textContent=crew.action==='walk'?'↝':task?.symbol||'♡';
}
$('crewToggle').addEventListener('click',()=>{
 const enabled=!game.snapshot().session.crewAutomation;crew=createCrew(game.snapshot().crew.marie.room);
 game.apply(setCrewAutomation,enabled);if(!enabled){const r=ROOMS.find(r=>r[0]===crew.room);$('mapMarie').style.left=r[5]+'%';$('mapMarie').style.top=r[6]+'%';$('activityLabel').textContent=r[2];}render();
});
$('crewEnqueue').addEventListener('click',()=>addTask($('crewTask').value));
$('crewPlan').addEventListener('click',()=>{for(const task of ['garden','cook','repair','record'])addTask(task);});
$('crewClear').addEventListener('click',()=>{crew=createCrew(crew.room);game.apply(placeCrew,crew.room,'idle');render();});
document.addEventListener('marie:crew-request',e=>{if(game.snapshot().session.crewAutomation){const action=ROOM_TASK[e.detail.room];addTask(action,e.detail.room);}});
document.addEventListener('marie:room',e=>{viewRoom=e.detail.room;showScene();render();});
document.addEventListener('marie:restore',()=>{crew=createCrew(game.snapshot().crew.marie.room);render();});
subscribeSimulation(seconds=>{
 if(!game.snapshot().session.crewAutomation)return;
 const next=advanceCrew(crew,seconds);crew=next.state;
 for(const event of next.events)game.dispatch(event);
 game.apply(placeCrew,crew.room,crew.action);
 paint+=seconds;if(paint>=.1){paint=0;render();}
},()=>{paint=0;render();});
game.subscribe(render);media.addEventListener('change',render);render();
