
// Progressive Web App: installation is always user-initiated.
(()=>{
 let installPrompt=null, updateRegistration=null, userAcceptedUpdate=false;
 const installButton=document.getElementById('installBtn');
 const popup=document.getElementById('pwaInstallModal');
 const info=document.getElementById('installInstructions');
 const updateButton=document.getElementById('pwaUpdateBtn');
 function open(){popup.classList.remove('hidden');document.body.style.overflow='hidden'}
 function close(){popup.classList.add('hidden');document.body.style.overflow=''}
 function installed(){return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true}
 function instructions(){
   const apple=/iPad|iPhone|iPod/.test(navigator.userAgent);
   if(installed())return '이미 설치된 Marie World 앱으로 접속하셨습니다. ✦';
   if(apple)return 'Safari의 공유 버튼(□↑)을 누르고 “홈 화면에 추가”를 선택하세요.';
   return 'Chrome 또는 Edge 브라우저 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요.';
 }
 installButton?.addEventListener('click',async()=>{
   if(installed()){info.textContent=instructions();open();return}
   if(installPrompt){
     const event=installPrompt;installPrompt=null;
     await event.prompt();
     await event.userChoice;
     return;
   }
   info.textContent=instructions();open();
 });
 document.getElementById('closePwa')?.addEventListener('click',close);
 popup?.querySelector('[data-close="pwa"]')?.addEventListener('click',close);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.classList.contains('hidden'))close()});
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
 window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.textContent='✦ 설치 완료';close()});
 if(installed())installButton.textContent='✦ 설치됨';
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(userAcceptedUpdate)location.reload()});
 window.addEventListener('load',()=>{
   navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
     const check=()=>{
       if(reg.waiting&&navigator.serviceWorker.controller){
         updateRegistration=reg;
         updateButton.classList.remove('hidden');
         info.textContent='새 우주선 업데이트가 준비되었습니다. 진행 중인 입력이 없다면 아래 버튼으로 적용하세요.';
         installButton.textContent='✦ 업데이트';
       }
     };
     reg.addEventListener('updatefound',()=>{
       const worker=reg.installing;
       worker?.addEventListener('statechange',()=>{if(worker.state==='installed')check()});
     });
     check();
     document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
   }).catch(()=>{});
 });
 updateButton?.addEventListener('click',()=>{
   if(!updateRegistration?.waiting)return;
   userAcceptedUpdate=true;
   updateRegistration.waiting.postMessage({type:'SKIP_WAITING'});
 });
})();
