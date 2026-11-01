import './building-ui.js';
import {game} from './game/session.js';
import {encodeSave,decodeSave,createLocalStore,MAX_SAVE_BYTES} from './game/save-manager.js';
const $=id=>document.getElementById(id);let store=null,enabled=false,autosaveReady=false,timer=0,pending=null,confirmAction=null,returnFocus=null;
try{store=createLocalStore(window.localStorage);}catch{}
function message(text){$('saveStatus').textContent=text;}
function stop(){autosaveReady=false;if(timer)clearInterval(timer);timer=0;}
function controls(){
 $('saveEnable').disabled=!store;$('saveEnable').textContent=enabled?'자동 저장 사용 중지':'이 브라우저 자동 저장 켜기';$('saveEnable').setAttribute('aria-pressed',String(enabled));$('saveNow').disabled=!enabled;$('saveDelete').disabled=!store;
 try{$('saveLoad').disabled=!store?.hasData();}catch{$('saveLoad').disabled=true;}
}
function applySaved(next){game.apply(()=>next);document.dispatchEvent(new Event('marie:restore'));message('게임을 복원했습니다. 자동 여행은 OFF이며 생활 일과는 대기 상태입니다. 진행 임무는 생활 시간 계속을 눌러 이어 갑니다.');}
function saveNow(){
 if(!enabled||!store)return;
 try{store.save(game.snapshot());message('이 브라우저에 게임 진행을 저장했습니다. 공식 항해 원문이나 대화는 포함하지 않습니다.');controls();return true;}
 catch{stop();message('저장 공간 또는 데이터 제한으로 저장하지 못했습니다. 이전 저장은 유지하며 파일 백업을 사용할 수 있어요.');return false;}
}
function startTimer(){stop();if(enabled){autosaveReady=true;timer=setInterval(saveNow,10000);}}
function confirm(title,text,action,focus){$('saveConfirmTitle').textContent=title;$('saveConfirmText').textContent=text;confirmAction=action;returnFocus=focus;$('saveDialog').showModal();$('saveCancel').focus();}
$('saveCancel').onclick=()=>{$('saveDialog').close();};
$('saveDialog').addEventListener('close',()=>{pending=null;confirmAction=null;returnFocus?.focus({preventScroll:true});});
$('saveConfirm').onclick=()=>{const action=confirmAction;$('saveDialog').close();try{action?.();}catch{message('저장 작업을 완료하지 못했습니다. 현재 게임과 이전 파일은 유지됩니다.');}controls();};
$('saveEnable').onclick=()=>{
 if(enabled){enabled=false;stop();try{store.disable();}catch{}message('자동 저장과 다음 방문의 자동 복원을 중지했습니다. 기존 게임 파일은 전체 삭제를 누를 때까지 이 브라우저에 남습니다.');controls();return;}
 confirm('이 기기에 게임을 저장할까요?','현재 진행을 지금 저장합니다. 이전 저장이 있으면 대체하므로 필요하면 먼저 저장 불러오기를 선택하세요. 이후 약 10초마다 자동 저장합니다. 다음 방문에는 저장을 읽어 자동 여행 OFF로 복원합니다. 저장되는 것은 게임 시간·재고·연구·설비·임무뿐입니다. 외부 전송은 없으며 이 브라우저를 지우면 저장도 삭제됩니다.',()=>{store.enable();try{store.save(game.snapshot());enabled=true;startTimer();message('자동 저장을 켰습니다. 현재 게임을 저장했고 다음 방문에 복원합니다.');}catch(e){try{store.disable();}catch{}throw e;}},$('saveEnable'));
};
$('saveNow').onclick=()=>{if(saveNow())startTimer();};
$('saveLoad').onclick=()=>{try{const next=store.load();confirm('저장된 게임으로 돌아갈까요?','현재 진행을 저장된 진행으로 교체합니다. 생활 일과는 비우고 자동 여행 OFF로 복원하며, 진행 임무는 남은 시간을 이어 갑니다.',()=>applySaved(next),$('saveLoad'));}catch{message('저장을 읽지 못했습니다. 현재 게임을 바꾸지 않았습니다. 파일 백업이나 전체 삭제를 사용할 수 있어요.');}};
$('saveDelete').onclick=()=>confirm('이 브라우저의 게임 저장을 삭제할까요?','이 앱의 저장과 저장 동의를 삭제합니다. 현재 열린 게임은 계속되며 다시 켜기 전까지 자동 저장하지 않습니다. 다른 앱의 데이터와 내려받은 파일은 건드리지 않습니다.',()=>{enabled=false;stop();store?.deleteAll();message('이 앱의 브라우저 저장과 동의를 삭제했습니다. 현재 게임은 메모리에만 남습니다.');},$('saveDelete'));
$('saveExport').onclick=()=>{try{const text=encodeSave(game.snapshot()),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MarieWorld_game_v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('게임 JSON 백업을 내려받았습니다. 이 파일은 직접 보관해 주세요.');}catch{message('게임을 백업하지 못했습니다. 현재 진행은 바뀌지 않았습니다.');}};
$('saveImport').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>MAX_SAVE_BYTES)throw new Error('File too large');pending=decodeSave(await file.text());const next=pending;confirm('검증한 게임 파일을 불러올까요?',`게임 DAY ${next.day}, ${next.mode==='survival'?'생존 탐험':'힐링'} 모드, 소재 ${next.progress.materials}, 설비 ${Object.keys(next.modules.installed).length}개입니다. 현재 진행을 교체하며 자동 여행 OFF와 생활 일과 대기로 복원합니다.`,()=>applySaved(next),$('saveImport'));}
 catch{message('지원하지 않거나 손상된 게임 파일입니다. 현재 게임과 기존 저장을 바꾸지 않았습니다.');}
 e.target.value='';
});
$('resetBtn').onclick=()=>{if(window.confirm(store?'현재 플레이와 이 앱의 브라우저 저장을 삭제하고 새 게임을 시작할까요? 내려받은 파일은 남습니다.':'기기 저장에 접근할 수 없어 이전 저장은 삭제할 수 없습니다. 현재 메모리의 게임만 다시 시작할까요?')){enabled=false;stop();try{store?.deleteAll();location.reload();}catch{message('브라우저 저장을 지우지 못했습니다. 파일 백업 후 브라우저 저장 설정을 확인해 주세요.');}}};
window.addEventListener('pagehide',()=>{if(enabled&&autosaveReady)saveNow();});
try{
 if(store?.isEnabled()){
  enabled=true;
  try{applySaved(store.load());startTimer();}catch{message('이전 저장이 손상되었거나 지원되지 않습니다. 자동 저장을 멈췄고 이전 데이터는 보존했습니다. 파일 백업/지금 저장/전체 삭제 중에서 선택해 주세요.');}
 }else if(!store)message('이 브라우저에서 기기 저장을 사용할 수 없습니다. JSON 백업과 가져오기는 이용할 수 있어요.');
}catch{store=null;enabled=false;message('이 브라우저에서 기기 저장을 읽을 수 없습니다. JSON 백업을 사용할 수 있어요.');}
controls();
