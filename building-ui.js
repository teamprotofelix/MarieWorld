import './exploration-ui.js';
import {game} from './game/session.js';
import {MODULES,BUILD_SLOTS} from './game/module-catalog.js';
import {installModule,removeModule} from './game/building-model.js';
import {RESOURCE_INFO} from './game/resource-model.js';
import {TECHNOLOGIES} from './game/research-model.js';
const $=id=>document.getElementById(id);const controls=new Map();let lastBadges='';
function preview(scene){$('buildImage').hidden=false;$('buildImage').src=`assets/concepts/v2/${scene}.webp`;}
$('constructionDetails').addEventListener('toggle',()=>{if($('constructionDetails').open&&!$('buildImage').src)preview('07_hangar_expansion_module');});
$('buildImage').addEventListener('error',()=>{$('buildImage').hidden=true;$('buildMessage').textContent='프리뷰 그림 없이도 설치 규칙과 현재 설비를 확인할 수 있어요.';});
for(const [id,m]of Object.entries(MODULES)){
 const card=document.createElement('article');card.className='game-card';const h=document.createElement('h3'),description=document.createElement('p'),effect=document.createElement('p'),label=document.createElement('label'),slot=document.createElement('select'),install=document.createElement('button'),remove=document.createElement('button'),view=document.createElement('button'),actions=document.createElement('div');
 h.textContent=m.name;description.textContent=`선행 ${TECHNOLOGIES[m.tech].name} · 소재 ${m.materials} / 전력 ${m.power} · ${BUILD_SLOTS[m.slot].name}에서 ${m.room==='garden'?'정원':'엔진실'}에 연결`;
 effect.className='game-note';effect.textContent='분당 '+Object.entries(m.effects).flatMap(([resource,delta])=>Object.entries(delta).map(([kind,value])=>`${RESOURCE_INFO[resource].label} ${kind==='production'?'생산':'소비'} +${value.toFixed(2)}`)).join(' · ');
 label.textContent='설치 위치 ';label.htmlFor=`slot-${id}`;slot.id=`slot-${id}`;slot.className='game-select';slot.dataset.buildSlot=id;
 for(const [key,s]of Object.entries(BUILD_SLOTS)){const o=document.createElement('option');o.value=key;o.textContent=s.name;slot.append(o);}slot.value=m.slot;
 install.dataset.build=id;install.textContent='설치하기';remove.dataset.remove=id;remove.textContent=`해체 · 소재 ${Math.floor(m.materials/2)} 환급`;view.textContent='설비 그림 보기';
 for(const button of [install,remove,view])button.className='secondary-btn';actions.className='game-actions';actions.append(install,remove,view);
 install.onclick=()=>{try{game.apply(installModule,id,slot.value);$('buildMessage').textContent=`${m.name} 설치 완료. 생산·소비와 선실/단면 표시를 갱신했습니다.`;}catch(e){$('buildMessage').textContent=e.message==='Invalid connection'?'이 설비에 맞는 위치와 기본 방 연결을 확인해 주세요.':e.message==='Research required'?'선행 연구를 먼저 완료해 주세요.':'소재·전력·중복 설치·안전 예비 재고를 확인해 주세요. 비용은 추가 차감되지 않았습니다.';}};
 remove.onclick=()=>{try{game.apply(removeModule,id);$('buildMessage').textContent=`해체했습니다. 소재 ${Math.floor(m.materials/2)}를 환급하며 사용한 전력은 반환하지 않습니다.`;}catch{$('buildMessage').textContent='설치된 설비만 해체할 수 있습니다.';}};
 view.onclick=()=>preview(m.scene);controls.set(id,{install,remove});card.append(h,description,effect,label,slot,actions);$('buildCards').append(card);
}
function render(){
 const s=game.snapshot();$('buildWallet').textContent=`소재 ${s.progress.materials} · 전력 ${s.resources.amounts.power.toFixed(1)}`;
 for(const [id,c]of controls){const installed=Object.hasOwn(s.modules.installed,id);c.install.disabled=s.mode!=='survival'||installed;c.remove.disabled=s.mode!=='survival'||!installed;c.install.textContent=installed?'설치됨':'설치하기';}
 const signature=JSON.stringify(s.modules.installed);if(signature===lastBadges)return;lastBadges=signature;
 for(const target of ['mapFacilities','cutawayFacilities','exteriorFacilities']){
  const container=$(target);container.hidden=!Object.keys(s.modules.installed).length;
  container.replaceChildren(...Object.keys(s.modules.installed).map(id=>{const badge=document.createElement('span');badge.dataset.facility=id;badge.textContent=`게임 설비 · ${MODULES[id].name}`;return badge;}));
 }
}
game.subscribe(render);render();
