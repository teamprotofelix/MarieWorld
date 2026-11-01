import './app.js';
import {game} from './game/session.js';
import {subscribeSimulation} from './game/runtime.js';
import {RESOURCE_INFO,ROOM_REWARDS,rates,levels,changeMode,advanceResources,emergencyRecovery,rewardMinigame} from './game/resource-model.js';
const $=id=>document.getElementById(id);let minutes=0,currentRoom='cockpit',lastSignature='';
const dialog=$('survivalDialog');
function errorText(e){return e.message==='Recovery cooldown'?'긴급복구는 게임 시간 30분 뒤에 다시 사용할 수 있어요.':e.message==='Recovery not needed'?'모든 재고가 35 이상입니다.':e.message==='Withdraw the active mission first'?'진행 중인 임무를 먼저 철수해 주세요.':'변경하지 못했습니다. 현재 상태는 유지됩니다.';}
function requestMode(mode){$('survivalConfirm').dataset.mode=mode;$('survivalConfirmTitle').textContent=mode==='survival'?'생존 탐험을 시작할까요?':'힐링 모드로 돌아갈까요?';$('survivalConfirmText').textContent=mode==='survival'?'재고는 0–100 단위로 생산·소비되며 게임 1분은 약 1초입니다. 미니게임 성공 보상이 연결됩니다. 재고 25 이하는 경고, 10 이하는 시간 정지와 복구 선택을 제공합니다. 방·게임·읽기·숨김 탭에서는 생활 시간이 멈춥니다.':'기존 15–100 자동 회복 모드로 돌아갑니다. 현재 재고는 15 이상으로 맞추며 연구·소재·설비는 보존합니다. 자동 여행 버튼으로 시간을 다시 시작할 수 있어요.';dialog.showModal();$('survivalCancel').focus();}
$('survivalMode').addEventListener('click',()=>requestMode(game.snapshot().mode==='survival'?'healing':'survival'));
$('survivalWithdraw').addEventListener('click',()=>requestMode('healing'));
$('survivalCancel').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>$('survivalMode').focus({preventScroll:true}));
$('survivalConfirm').addEventListener('click',()=>{try{game.apply(changeMode,$('survivalConfirm').dataset.mode);minutes=0;dialog.close();$('survivalMessage').textContent='모드를 변경했습니다. 공식 항해 기록은 그대로입니다.';}catch(e){dialog.close();$('survivalMessage').textContent=errorText(e);}});
$('survivalRescue').addEventListener('click',()=>{try{game.apply(emergencyRecovery);$('survivalMessage').textContent='부족한 재고를 35로 복구하고 생활 시간을 다시 시작했습니다.';}catch(e){$('survivalMessage').textContent=errorText(e);}});
function render(){
 const s=game.snapshot(),survival=s.mode==='survival';$('survivalMode').textContent=survival?'힐링 모드로 돌아가기':'생존 탐험 모드 선택';$('modeLabel').textContent=survival?'생존 탐험 · 게임 기록':'힐링 모드 · 자동 회복';$('survivalDetails').hidden=!survival;
 if(!survival)return;
 const flow=rates(s),signature=JSON.stringify([s.stats,s.resources,s.research,s.progress,s.modules]);if(signature===lastSignature)return;lastSignature=signature;
 $('resourceRows').replaceChildren(...Object.entries(RESOURCE_INFO).map(([key,info])=>{const row=document.createElement('div');row.className='resource-row';const name=document.createElement('strong'),stock=document.createElement('span'),net=document.createElement('small');name.textContent=info.label;stock.textContent=`${s.resources.amounts[key].toFixed(1)} / ${info.capacity} ${info.unit} · 표시 ${s.stats[key]}%`;net.textContent=`게임 1분당 +${flow[key].production.toFixed(2)} 생산 −${flow[key].consumption.toFixed(2)} 소비 = ${(flow[key].production-flow[key].consumption>=0?'+':'')}${(flow[key].production-flow[key].consumption).toFixed(2)}`;row.append(name,stock,net);return row;}));
 $('survivalProgress').textContent=`소재 ${s.progress.materials} · 연구 ${s.research.points}`;
 const level=levels(s);$('resourceWarning').hidden=level==='normal';$('resourceWarningText').textContent=level==='critical'?'재고가 10 이하로 내려가 생활 시간을 멈췄어요. 긴급복구 또는 안전 복귀를 선택해 주세요.':'재고가 25 이하입니다. 생산·소비를 확인하고 복구나 안전 복귀를 선택할 수 있어요.';
 const hint=$('roomRewardHint');if(hint)hint.textContent='성공 규칙: '+Object.entries(ROOM_REWARDS[currentRoom]).map(([key,value])=>`${RESOURCE_INFO[key].label} ${value>0?'+':''}${value}`).join(' · ')+' · 소재/연구 각각 +1 (재고 최대 100). 실패·중단은 차감하지 않습니다.';
}
document.addEventListener('marie:room',e=>{currentRoom=e.detail.room;lastSignature='';if(game.snapshot().mode==='healing')$('roomRewardHint').textContent='힐링 모드에서는 기념 점수만 남고 자원은 바뀌지 않습니다.';render();});
document.addEventListener('marie:game-result',e=>{
 try{const before=game.snapshot();game.apply(rewardMinigame,e.detail.id,e.detail.room,e.detail.success);
 e.detail.message=before.mode==='survival'?(e.detail.success?'이번 판의 자원 규칙과 소재·연구 +1을 한 번 반영했습니다.':'안전하게 쉬어갑니다. 자원·연구 차감은 없습니다.'):'힐링 모드에서는 기념 점수만 남습니다. 공식 일기는 그대로예요.';
 }catch{e.detail.message='결과를 반영하지 못했습니다. 현재 자원은 유지됩니다.';}
});
subscribeSimulation(seconds=>{if(game.snapshot().mode!=='survival')return;minutes+=seconds;while(minutes>=1){minutes-=1;game.apply(advanceResources,1);if(!game.snapshot().session.auto){minutes=0;break;}}},()=>{minutes=0;});
game.subscribe(render);render();
