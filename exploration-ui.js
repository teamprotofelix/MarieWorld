import './survival-ui.js';
import {game} from './game/session.js';
import {subscribeSimulation} from './game/runtime.js';
import {DEST} from './game/routes.js';
import {RESOURCE_INFO} from './game/resource-model.js';
import {MISSIONS,missionRisk,startMission,advanceMission,withdrawMission} from './game/mission-model.js';
import {TECHNOLOGIES,researchTech} from './game/research-model.js';
const $=id=>document.getElementById(id);let seconds=0,historySignature='';
const missionButtons=new Map(),techButtons=new Map();
function scene(name){const src=`assets/concepts/v2/${name}.webp`;if($('missionImage').getAttribute('src')!==src)$('missionImage').src=src;}
$('missionImage').addEventListener('error',()=>{if($('missionImage').getAttribute('src')?.includes('/concepts/')){$('missionImage').src='assets/observatory.webp';$('labMessage').textContent='생활 장면을 불러오지 못해 기존 관측실을 보여 드립니다. 임무 조작은 계속할 수 있어요.';}});
$('researchImage').addEventListener('error',()=>{$('researchImage').hidden=true;});
for(const [id,m]of Object.entries(MISSIONS)){
 const card=document.createElement('article');card.className='game-card';const h=document.createElement('h3'),p=document.createElement('p'),cost=document.createElement('p'),button=document.createElement('button');h.textContent=m.name;p.textContent=m.note;cost.id=`missionCost-${id}`;cost.className='game-note';button.className='secondary-btn';button.dataset.mission=id;button.textContent='임무 시작';button.onclick=()=>{try{game.apply(startMission,id,game.snapshot().session.destination,Math.random());scene(m.scene);$('labMessage').textContent='준비 비용을 사용했습니다. 완료 전에 철수할 수 있으며 준비 비용은 반환하지 않습니다.';}catch(e){$('labMessage').textContent=e.message==='Safety reserve required'?'안전 예비 재고 10 초과가 필요합니다.':e.message==='Mission already active'?'진행 중인 임무를 먼저 마치거나 철수해 주세요.':'자원 또는 모드를 확인해 주세요. 비용은 추가 차감되지 않았습니다.';}};missionButtons.set(id,button);card.append(h,p,cost,button);$('missionCards').append(card);
}
for(const [id,t]of Object.entries(TECHNOLOGIES)){
 const card=document.createElement('article');card.className='game-card';const h=document.createElement('h3'),p=document.createElement('p'),cost=document.createElement('p'),button=document.createElement('button');h.textContent=t.name;p.textContent=t.description;cost.className='game-note';cost.textContent=`연구 ${t.cost} · 선행: ${t.requires.map(r=>TECHNOLOGIES[r].name).join(', ')||'없음'}`;button.className='secondary-btn';button.dataset.research=id;button.onclick=()=>{try{game.apply(researchTech,id);$('labMessage').textContent=`${t.name} 연구를 완료했습니다. 건설 설계도는 게임 진행에만 적용됩니다.`;}catch{$('labMessage').textContent='선행 연구와 포인트를 확인해 주세요. 연구 포인트는 유지됩니다.';}};techButtons.set(id,button);card.append(h,p,cost,button);$('techCards').append(card);
}
$('missionWithdraw').onclick=()=>{game.apply(withdrawMission);$('labMessage').textContent='철수했습니다. 준비 비용은 사용되었으며 보상이나 추가 차감은 없습니다.';};
$('labPause').onclick=()=>game.update(d=>{d.auto=!d.auto;});
$('labHome').onclick=()=>{document.querySelector('[data-panel=home]').click();$('survivalPanel').scrollIntoView({block:'start',behavior:'instant'});};
$('researchDetails').addEventListener('toggle',()=>{if($('researchDetails').open&&!$('researchImage').src)$('researchImage').src=$('researchImage').dataset.src;});
function render(){
 const s=game.snapshot(),active=s.exploration.active;const route=s.session.destination;
 $('missionRoute').textContent=DEST[route][1];$('labResources').textContent=`소재 ${s.progress.materials} · 연구 ${s.research.points} · 전력 ${s.resources.amounts.power.toFixed(1)}`;
 $('labPause').textContent=s.session.auto?'생활 시간 멈추기':'생활 시간 계속';$('labPause').setAttribute('aria-pressed',String(!s.session.auto));
 $('missionStatus').textContent=active?`${MISSIONS[active.kind].name} · ${DEST[active.route][1]} · ${active.remaining}초 남음${s.session.auto?'':' · 일시정지'}`:'진행 중인 임무가 없습니다.';
 $('missionProgress').max=active?MISSIONS[active.kind].seconds:1;$('missionProgress').value=active?MISSIONS[active.kind].seconds-active.remaining:0;$('missionWithdraw').disabled=!active;
 for(const [id,button]of missionButtons){button.disabled=s.mode!=='survival'||!!active;const m=MISSIONS[id];$(`missionCost-${id}`).textContent=`${m.seconds}초 · 비용 ${Object.entries(m.cost).map(([k,n])=>`${RESOURCE_INFO[k].label} ${n}`).join(' / ')} · 실패 위험 ${Math.round(missionRisk(id,route)*100)}% · 성공 시 소재 ${m.materials}, 연구 ${m.points}`;}
 for(const [id,button]of techButtons){const t=TECHNOLOGIES[id],done=s.research.unlocked.includes(id);button.disabled=done||s.mode!=='survival'||t.requires.some(r=>!s.research.unlocked.includes(r))||s.research.points<t.cost;button.textContent=done?'연구 완료':'연구하기';}
 const signature=JSON.stringify(s.exploration.history);if(signature!==historySignature){historySignature=signature;$('missionLog').replaceChildren(...s.exploration.history.slice(0,8).map(h=>{const li=document.createElement('li');li.textContent=`게임 DAY ${h.day} · ${DEST[h.route][1]} · ${MISSIONS[h.kind].name} · ${{success:'성공, 보상 반영',failed:'안전 철수, 보상 없음',withdrawn:'사용자 철수, 보상 없음'}[h.status]}${h.kind==='observe'?' · 미지 신호 판별 보류':''}`;return li;}));}
}
document.addEventListener('marie:view',()=>{if($('explorationPanel').classList.contains('active')&&!$('missionImage').src)scene('06_observatory_voyage_diary');});
subscribeSimulation(dt=>{if(!game.snapshot().exploration.active){seconds=0;return;}seconds+=dt;while(seconds>=1){seconds-=1;game.apply(advanceMission,1);if(!game.snapshot().exploration.active){seconds=0;break;}}},()=>{seconds=0;});
game.subscribe(render);render();
