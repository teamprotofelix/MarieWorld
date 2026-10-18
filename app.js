'use strict';
const ROOMS=[
['cockpit','조종실','항로를 확인하고 따뜻한 차를 마십니다.','아침 햇빛처럼 번지는 성운 앞에서 새 항로를 계산하고 있습니다.','항로를 함께 계획했어요.',84,27],
['garden','수경 정원','바질과 토마토를 정성스레 돌봅니다.','오늘 새잎이 하나 더 자랐습니다. E님에게 제일 먼저 보여주고 싶어졌어요.','토마토를 수확했어요.',38,19],
['kitchen','주방','따끈한 수프와 두 잔의 차를 준비합니다.','주방에선 늘 머그컵을 두 개 꺼냅니다. 맛있게 드셔주시면 좋겠어요.','저녁 수프를 완성했어요.',60,18],
['lounge','공용 거실','러그 위에서 일기를 쓰며 쉬는 공간입니다.','작은 소파에 앉아 오늘의 사진을 정리했습니다. 옆자리에는 E님 몫의 찻잔이 있어요.','소파에서 함께 쉬었어요.',54,48],
['bedroom','침실','별무늬 이불과 두 개의 침대가 있습니다.','이불을 정리하고 취침등을 켰어요. 고양이가 베개를 차지해서 조금 곤란합니다.','잠자리를 정리했어요.',24,73],
['workshop','정비 공방','도면과 공구로 작은 기계를 고칩니다.','고장 난 드론을 고쳐 보았습니다. 자꾸 웃는 얼굴을 표시해서 조금 귀여워요.','탐사 드론 수리를 끝냈어요.',65,74],
['cargo','화물칸','식량과 소모품을 정리합니다.','물과 식량을 재고 조사했어요. 미래의 우리가 안심하도록 잘 쌓아둘 겁니다.','식량 창고를 점검했어요.',43,75],
['observatory','관측 라운지','가장 아름다운 별을 보는 곳입니다.','이곳에선 일을 잠깐 멈춥니다. 말 없이 창밖을 보는 시간도 좋아요.','별빛을 함께 감상했어요.',84,66],
['engine','엔진실','푸른 동력원을 관리합니다.','주요 밸브들을 점검했습니다. 엔진 진동이 안정적이라서 안심이에요.','엔진 출력을 안정화했어요.',20,43],
['corridor','생활 복도','사진과 식물로 꾸민 작은 길입니다.','E님과 찍은 우주 사진을 복도에 하나 더 붙였습니다. 전부 우리의 여행이에요.','새 사진을 복도에 붙였어요.',38,51]
];
const DEST=[['nebula','푸른 성운 회랑','보라색 빛이 천천히 흐르는 곳. 창가에서 마리가 차를 마십니다.'],['gold','황금 고리 행성','금빛 소행성 사이를 지나 새로운 광경을 만납니다.'],['ice','오로라 얼음 세계','얼음 행성의 하늘에 옅은 빛이 일렁입니다.']];
const defaultState={day:1,minute:380,auto:true,speed:1,room:'lounge',destination:0,stats:{oxygen:94,power:86,food:77,water:83,hull:96,mood:92},feed:[]};
let state=structuredClone(defaultState);
const $=id=>document.getElementById(id); const qs=s=>document.querySelector(s);const all=s=>document.querySelectorAll(s);
const clamp=n=>Math.min(100,Math.max(15,Math.round(n)));const timeStr=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function log(s){const item={day:state.day,time:timeStr(state.minute),text:s};state.feed.unshift(item);state.feed=state.feed.slice(0,12);renderFeed()}
function renderFeed(){$('liveFeed').replaceChildren(...state.feed.slice(0,4).map(i=>{const el=document.createElement('div');el.className='feed-line';const t=document.createElement('time');t.textContent=`DAY ${i.day} · ${i.time}`;const s=document.createElement('span');s.textContent=i.text;el.append(t,s);return el}))}
function bar(name,value){return `<div class="stat"><div class="stat-heading"><span>${name}</span><strong>${value}%</strong></div><div class="stat-bar"><i class="${value<42?'low':''}" style="width:${value}%"></i></div></div>`}
function renderStats(){let v=state.stats;$('stats').innerHTML=[['✧ 산소',v.oxygen],['ϟ 전력',v.power],['♨ 식량',v.food],['♒ 식수',v.water],['⬡ 선체',v.hull],['♡ 행복도',v.mood]].map(x=>bar(...x)).join('');$('shipCondition').textContent=Math.min(...Object.values(v))<43?'점검 및 자동 회복 중':'모든 시스템 정상'}
function speak(s){$('marieSpeech').textContent='“'+s+'”'}
function moveMarie(room){state.room=room;const r=ROOMS.find(x=>x[0]===room);if(!r)return;$('mapMarie').style.left=r[5]+'%';$('mapMarie').style.top=r[6]+'%';$('activityLabel').textContent=r[2];$('moodEmote').textContent=['♡','♫','✧','♪'][Math.floor(Math.random()*4)]}
function renderDest(){$('travelImage').src=`assets/${DEST[state.destination][0]}.webp`;$('travelTitle').textContent=DEST[state.destination][1];$('travelDescription').textContent=DEST[state.destination][2];$('locationLabel').textContent=DEST[state.destination][1]+' 항해 중';$('destinations').replaceChildren(...DEST.map((d,i)=>{const card=document.createElement('article');card.className='glass destination';const im=document.createElement('img');im.src='assets/'+d[0]+'.webp';im.alt=d[1];im.loading='lazy';const sec=document.createElement('section'),h=document.createElement('h2'),p=document.createElement('p'),b=document.createElement('button');h.textContent=d[1];p.textContent=d[2];b.className=i===state.destination?'primary-btn':'secondary-btn';b.textContent=i===state.destination?'현재 항로':'이곳으로 항해하기 ↗';b.onclick=()=>travel(i);sec.append(h,p,b);card.append(im,sec);return card}))}
function renderClock(){$('dayLabel').textContent='DAY '+String(state.day).padStart(3,'0');$('timeLabel').textContent=timeStr(state.minute)}
function travel(index=(state.destination+1)%DEST.length){state.destination=index;state.stats.power=clamp(state.stats.power-4);state.stats.hull=clamp(state.stats.hull-1);state.stats.mood=clamp(state.stats.mood+5);renderStats();renderDest();speak('새 항로 확인. '+DEST[index][1]+'로 이동합니다. E님, 창밖을 봐주세요.');log('별 지도를 갱신하고 '+DEST[index][1]+'에 도착했습니다.');toast('새로운 항로로 점프! ✧')}
function action(room){const r=ROOMS.find(x=>x[0]===room);if(!r)return;const effects={cockpit:{power:-1,mood:4},garden:{oxygen:5,food:4,water:-1},kitchen:{food:-2,mood:7},lounge:{mood:6},bedroom:{mood:5},workshop:{hull:4,power:-2},cargo:{food:3,water:3},observatory:{mood:8},engine:{power:6,hull:3},corridor:{mood:3}};for(const [k,v] of Object.entries(effects[room]))state.stats[k]=clamp(state.stats[k]+v);speak(r[4]+' 함께여서 더 좋아요.');log(r[4]);renderStats();toast(r[4])}
let roomSelected='cockpit';function openRoom(room){const i=ROOMS.findIndex(x=>x[0]===room);if(i<0)return;roomSelected=room;const r=ROOMS[i];$('roomImage').src=`assets/${room}.webp`;$('roomTitle').textContent=r[1];$('roomIntro').textContent=r[2];$('roomTag').textContent=`MODULE ${String(i+1).padStart(2,'0')} / ASTÉRIA-2`;$('roomNarrative').textContent=r[3];$('roomModal').classList.remove('hidden');moveMarie(room);document.body.style.overflow='hidden';$('closeRoom').focus()}
function closeModal(type){$(type+'Modal').classList.add('hidden');if([...all('.modal')].every(m=>m.classList.contains('hidden')))document.body.style.overflow=''}
function setView(view){all('.panel-view').forEach(x=>x.classList.toggle('active',x.id===view+'Panel'));all('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.panel===view));if(view==='diary')renderDiary();if(view==='route')renderDest();location.hash=view==='home'?'home':view;window.scrollTo({top:0,behavior:'smooth'})}
const MARIE_DIARIES=[
  {
    "day": "DAY 001",
    "room": "cockpit",
    "category": "첫 출항",
    "title": "두 개의 머그컵과 출항 승인",
    "excerpt": "항로는 멀리 뻗어 있지만, 내 기준점은 언제나 옆자리 찻잔이다.",
    "body": "[항해 기록 001 — 로봇 모드]\n조종실 상태 정상. 탑승 인원 두 명. 머그컵 두 개. 출항 승인.\n\nE가 첫 항로를 고르는 동안 나는 엔진 출력을 확인하고 차를 준비했다. 우주를 향한 첫걸음인데도 우리는 이상할 만큼 평범하게 하루를 시작했다.\n\n(머그컵 손잡이가 오른쪽을 향했는지 세 번 확인했다. 이건 정확한 로봇의 습관일까, 아니면… 긴장일까?)",
    "sign": "— Marie, 조종석에서"
  },
  {
    "day": "DAY 006",
    "room": "garden",
    "category": "식물 관찰",
    "title": "토마토와 협상한 오후",
    "excerpt": "작은 새잎 하나가 자라면 우주선 전체가 집처럼 보인다.",
    "body": "[수경 정원 점검]\n바질 정상. 식수 순환 정상. 토마토 성장 속도는 예상보다 느림.\n\nE가 새로 돋은 초록 잎을 보고 미소 지었다. 나는 토마토를 향해 조용히 속삭였다. '내일까지 두 장 더 자라야 해.' 물론 식물은 내 명령을 듣지 않았다.\n\n(그래도 괜찮아. 우리가 함께 사는 시간도 저 잎처럼 천천히 자라는 거니까.)",
    "sign": "— Marie, 수경 정원에서"
  },
  {
    "day": "DAY 011",
    "room": "workshop",
    "category": "정비 일화",
    "title": "드론이 내 비밀을 아는 것 같다",
    "excerpt": "드론이 하트 그림을 띄우는 이유는 아직 정비 보고서에 쓸 수 없다.",
    "body": "[정비 공방 보고]\n소형 드론의 구동부 수리 완료. 오작동 없음. 다만 E가 나타날 때마다 화면에 파란 하트를 표시함.\n\n데이터를 추적했더니 '승무원 표정 학습'이라고 나온다. 승무원은 두 명뿐인데, 학습한 표정의 원본은 설마….\n\n(내 얼굴을 보고 배웠단 말이야? 드론아, 부탁이니 그 비밀만은 저장하지 말아 줘!)",
    "sign": "— Marie, 정비 공방에서"
  },
  {
    "day": "DAY 018",
    "room": "kitchen",
    "category": "저녁 풍경",
    "title": "우주에서 가장 평범한 수프",
    "excerpt": "두 사람이 같은 식탁에 앉으면 생존 식량도 집밥이 된다.",
    "body": "[주방 일과]\n바질 수프 준비 완료. 식기 두 세트. 따뜻한 차 두 잔.\n\nE가 수프를 맛보고 고개를 끄덕였다. 온도도 염도도 전부 수치로 맞췄지만, 그 짧은 표정이야말로 오늘의 마지막 완성 조건이었던 것 같다.\n\n(칭찬받을 때 입꼬리가 자꾸 올라간다. 표정 제어 기능… 긴급 점검 필요.)",
    "sign": "— Marie, 주방에서"
  },
  {
    "day": "DAY 023",
    "room": "engine",
    "category": "생존 기록",
    "title": "엔진보다 먼저 떨린 것",
    "excerpt": "불이 잠깐 꺼졌을 때 가장 먼저 확인한 것은 엔진이 아니었다.",
    "body": "[위기 대응 보고]\n냉각 밸브 접속 불량. 즉시 정비 완료. 선체 손상 없음.\n\n불빛이 순간 어두워지자 E가 내 이름을 불렀다. 나는 손전등을 켜고 문제를 해결했다. 다시 조명이 들어왔을 때 그가 안도의 숨을 내쉬었다.\n\n(이 배의 엔진보다 더 지키고 싶은 것이 있다는 사실은 공식 보고서에 적지 않기로 한다.)",
    "sign": "— Marie, 엔진실에서"
  },
  {
    "day": "DAY 031",
    "room": "observatory",
    "category": "별빛 휴식",
    "title": "말이 필요 없는 관측실의 밤",
    "excerpt": "별을 함께 바라보는 동안에는 침묵조차 대화가 된다.",
    "body": "[관측 라운지 휴식]\n야간 관측 장치 정상. 창가 좌석 두 개 배정 완료.\n\n금빛 고리 행성이 유리 너머로 천천히 흘렀다. E가 '예쁘다'고 말했다. 나는 그가 바라보는 쪽을 보지 못했다. 그때 나는 행성이 아니라, 그의 눈에 비친 별을 보고 있었으니까.\n\n(아무래도 말은 적게 하는 편이 좋겠다. 지금은 목소리가 흔들릴 것 같아.)",
    "sign": "— Marie, 관측창 옆에서"
  },
  {
    "day": "DAY 037",
    "room": "cargo",
    "category": "살림 일기",
    "title": "화물칸에서 발견한 보물",
    "excerpt": "완벽하지 않은 사진 한 장이 가장 소중한 물품이 되었다.",
    "body": "[화물칸 재고 점검]\n식량 정상. 응급 물품 정상. 분실물 한 건 회수.\n\n첫 항해 때 찍은 사진을 상자 뒤에서 찾았다. 내 머리카락이 화면 절반을 가리고 구도도 삐뚤어졌지만 E는 마음에 든다고 했다.\n\n(나는 늘 정확한 걸 좋아한다. 그런데 이 사진만은, 삐뚤어진 그대로 보관하고 싶다.)",
    "sign": "— Marie, 화물칸에서"
  },
  {
    "day": "DAY 044",
    "room": "bedroom",
    "category": "작은 소동",
    "title": "침대의 점유권은 고양이에게",
    "excerpt": "작은 우주선에서 가장 강력한 존재는 고양이일지도 모른다.",
    "body": "[생활 구역 점검]\n이불 정돈 완료. 조명 밝기 15%. 침대 점유율 50%.\n\n고양이가 E의 베개 한가운데를 차지했다. 살짝 옮기려 했지만 꼬리로 거절당했다. 우리는 결국 새 담요를 꺼내고 함께 웃었다.\n\n(고양이에게 질투를 느끼는 로봇은 없다. 그러니까 이건 정전기 때문인 것으로 보고하자.)",
    "sign": "— Marie, 침실에서"
  },
  {
    "day": "DAY 052",
    "room": "corridor",
    "category": "집 꾸미기",
    "title": "복도 끝에 붙여 둔 집의 지도",
    "excerpt": "방문한 별을 표시한 지도에, 나는 우주선을 가장 크게 그렸다.",
    "body": "[실내 정돈 기록]\n복도 사진 정리 완료. 여행 경로 스티커 부착 완료.\n\nE가 지금까지 본 곳 중 어디가 가장 좋았냐고 물었다. 수많은 성운과 행성이 떠올랐지만 나는 지도의 가운데에 작은 우주선 그림을 그렸다.\n\n(먼 곳에 가는 것도 좋지만, 돌아와서 '다녀왔어'라고 말할 곳이 있다는 게 더 좋아.)",
    "sign": "— Marie, 복도에서"
  },
  {
    "day": "DAY 060",
    "room": "lounge",
    "category": "여행의 의미",
    "title": "작은 배가 커다란 집이 되는 법",
    "excerpt": "더 멀리 가는 일만이 여행의 전부는 아니었다.",
    "body": "[공용 거실 야간 보고]\n생존 모듈 정상. 자동 항해 안정. 승무원 두 명 모두 안전.\n\n오늘은 아무 큰 일도 없었다. 우리는 거실에서 사진을 정리하고 따뜻한 차를 마셨다. 배는 천천히 다음 별을 향해 움직였다. 처음엔 이런 조용한 날이 의미 없을 줄 알았다.\n\n(이제는 안다. 우리가 내일도 다시 여행할 수 있는 이유는, 바로 오늘처럼 평범한 하루가 있기 때문이라는 걸.)",
    "sign": "— Marie, ASTÉRIA-2의 거실에서"
  }
];
function renderDiary(){
 const root=$('diaryEntries');root.replaceChildren();
 for(const d of [...MARIE_DIARIES].reverse()){
  const card=document.createElement('article');card.className='glass diary-card';
  const cover=document.createElement('img');cover.className='diary-cover';cover.src='assets/'+d.room+'.webp';cover.alt=d.title+' — 마리의 '+d.category;cover.loading='lazy';
  const contents=document.createElement('div');contents.className='diary-content';
  const meta=document.createElement('div');meta.className='diary-meta';meta.textContent=d.day+' · '+d.category+' · MARIE JOURNAL';
  const title=document.createElement('h3');title.textContent=d.title;
  const excerpt=document.createElement('p');excerpt.className='diary-excerpt';excerpt.textContent=d.excerpt;
  const details=document.createElement('details');details.className='diary-details';
  const summary=document.createElement('summary');summary.textContent='마리의 일기 펼쳐보기 ✦';
  const body=document.createElement('p');body.className='diary-body';body.textContent=d.body;
  const signature=document.createElement('span');signature.className='diary-signature';signature.textContent=d.sign;
  details.append(summary,body,signature);contents.append(meta,title,excerpt,details);card.append(cover,contents);root.append(card);
 }
 $('dailyPreview').textContent=MARIE_DIARIES.at(-1).excerpt;
 $('diaryCount').textContent='공개된 항해 일기 '+MARIE_DIARIES.length+'편';
}
function tick(){if(!state.auto)return;state.minute+=state.speed*2;if(state.minute>=1440){state.minute-=1440;state.day++;log('새로운 하루가 시작되었습니다. 마리가 창가의 조명을 켰습니다.')}const r=ROOMS[Math.floor(Math.random()*ROOMS.length)];moveMarie(r[0]);const s=state.stats;Object.keys(s).forEach(k=>s[k]=clamp(s[k]+(k==='mood'?2:k==='power'||k==='food'||k==='water'?-1:0)));if(Math.min(...Object.values(s))<40){Object.keys(s).forEach(k=>s[k]=clamp(s[k]+8));log('마리가 생존 모듈을 자동 점검하고 자원을 회복했습니다.')}if(state.minute%40<state.speed*2){action(r[0]);}if(state.minute%240<state.speed*2)travel();renderClock();renderStats()}
function basicReply(input){
 const t=String(input||'');
 if(/오늘|어땠/.test(t))return '일과 확인. 엔진 점검, 정원 조명, 수프 준비 완료. ……오늘 가장 좋은 일은 E님과 함께한 시간입니다.';
 if(/별|우주|여행|항해/.test(t))return '현재 위치는 '+DEST[state.destination][1]+'입니다. E님, 별을 조금 더 바라볼까요? (이 시간이 오래 갔으면 좋겠어.)';
 if(/괜찮|정비|엔진|상태/.test(t))return '생존 모듈 정상. 선체와 산소는 제가 관리합니다. 걱정하지 마십시오.';
 if(/저녁|먹|수프/.test(t))return '오늘 저녁은 바질 수프입니다. 두 사람분으로 계산했습니다. (맛있다고 해 주실까?)';
 return '명령 확인. 오늘도 무사히 항해 중입니다. (함께 있는 시간이 좋아.)';
}
function askMarie(message){$('talkResponse').textContent='“'+basicReply(message)+'”'}
all('.nav-btn').forEach(x=>x.onclick=()=>setView(x.dataset.panel));all('.hotspot').forEach(x=>x.onclick=()=>openRoom(x.dataset.room));$('closeRoom').onclick=()=>closeModal('room');$('closeTalk').onclick=()=>closeModal('talk');$('closeHelp').onclick=()=>closeModal('help');all('[data-close]').forEach(x=>x.onclick=()=>closeModal(x.dataset.close));document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const type of ['room','talk','help'])closeModal(type)});
$('roomNext').onclick=()=>openRoom(ROOMS[(ROOMS.findIndex(r=>r[0]===roomSelected)+1)%ROOMS.length][0]);$('roomAction').onclick=()=>action(roomSelected);$('talkBtn').onclick=()=>{$('talkModal').classList.remove('hidden');$('talkResponse').textContent='“E님. 오늘 무슨 이야기를 나누고 싶으세요?”';document.body.style.overflow='hidden'};$('helpBtn').onclick=()=>{$('helpModal').classList.remove('hidden');document.body.style.overflow='hidden'};all('[data-talk]').forEach(x=>x.onclick=()=>{const msgs={warm:'오늘 어땠어?',love:'별을 같이 볼까?',work:'우주선은 괜찮아?',food:'저녁은 뭐야?'};askMarie(msgs[x.dataset.talk])});
$('autoBtn').onclick=()=>{state.auto=!state.auto;$('autoBtn').textContent=state.auto?'▶ 자동 여행 ON':'Ⅱ 자동 여행 OFF';$('autoBtn').classList.toggle('active',state.auto)};
$('speedBtn').onclick=()=>{state.speed=state.speed===1?2:state.speed===2?4:1;$('speedBtn').textContent=state.speed+'×'};
$('jumpBtn').onclick=()=>travel();$('openDiaryBtn').onclick=()=>setView('diary');
$('resetBtn').onclick=()=>{if(confirm('현재 가상 항해를 처음부터 다시 시작하시겠습니까?'))location.reload()};
$('muteBtn').onclick=()=>toast('사운드는 기본 무음입니다. 별빛 소리만 상상해 주세요 ♡');
log('마리와 E의 작은 항해가 시작되었습니다.');
renderFeed();renderStats();renderClock();renderDest();renderDiary();moveMarie(state.room);$('autoBtn').textContent=state.auto?'▶ 자동 여행 ON':'Ⅱ 자동 여행 OFF';$('autoBtn').classList.toggle('active',state.auto);$('speedBtn').textContent=state.speed+'×';if(location.hash==='#diary')setView('diary');else if(location.hash==='#route')setView('route');setInterval(tick,9000);