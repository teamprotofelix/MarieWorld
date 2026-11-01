"""Compare actual baseline/current UI under the same controls and virtual clock.
Also tests current-main consent upgrade and module loading after offline restart.
"""
import json, os, subprocess, threading
from datetime import datetime, timezone
from functools import partial
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('MARIE_STATE_QA_OUTPUT',str(ROOT/'work/v2-state-qa')));OUT.mkdir(parents=True,exist_ok=True)
BASE='d6c72f5adc12bdbb76f8dd8be7d30af657348a04'
OLD={n:subprocess.check_output(['git','show',f'{BASE}:{n}'],cwd=ROOT) for n in ['index.html','app.js','sw.js']}
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  key=self.path.split('?')[0].lstrip('/') or 'index.html'
  if self.server.old and key in OLD:
   b=OLD[key];self.send_response(200);self.send_header('Content-Type',self.guess_type(key));self.send_header('Cache-Control','no-store');self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));server.old=False
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/'
results=[];errors=[]
def passed(name,**values):
 results.append({'check':name,'status':'passed',**values});(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',name,values,flush=True)
def observe(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
def snapshot(page):
 return page.evaluate("""() => ({stats:[...document.querySelectorAll('#stats strong')].map(n=>n.textContent),day:dayLabel.textContent,time:timeLabel.textContent,room:[mapMarie.style.left,mapMarie.style.top],activity:activityLabel.textContent,speech:marieSpeech.textContent,destination:travelTitle.textContent,feed:liveFeed.textContent,auto:autoBtn.textContent,speed:speedBtn.textContent})""")
def exercise(browser,old):
 server.old=old;ctx=browser.new_context(service_workers='block',viewport={'width':1440,'height':900});page=ctx.new_page();observe(page)
 page.add_init_script('Math.random=(()=>{let n=12345;return ()=>((n=(n*1664525+1013904223)>>>0)/4294967296)})();')
 at=datetime(2026,11,1,tzinfo=timezone.utc);page.clock.install(time=at);page.clock.pause_at(at);page.goto(URL)
 expect(page.locator('#stats .stat')).to_have_count(6);states=[snapshot(page)]
 page.locator('#autoBtn').click();states.append(snapshot(page))
 for room in ['cockpit','garden','kitchen','lounge','bedroom','workshop','cargo','observatory','engine','corridor']:
  page.locator(f'.hotspot[data-room={room}]').click();page.locator('#roomAction').click();page.locator('#closeRoom').click();states.append(snapshot(page))
 for _ in range(3):page.locator('#jumpBtn').click();states.append(snapshot(page))
 page.locator('#speedBtn').click();page.locator('#speedBtn').click();page.locator('#autoBtn').click()
 # Cross a game-day boundary, recurring room actions, route changes and recovery.
 for _ in range(140):page.clock.run_for(9000);states.append(snapshot(page))
 if not old:page.screenshot(path=str(OUT/'desktop-state.png'))
 ctx.close();return states
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 old=exercise(browser,True);new=exercise(browser,False)
 for i,(a,b) in enumerate(zip(old,new)):
  assert a==b,{'step':i,'baseline':a,'current':b}
 assert len(old)==len(new)==155
 passed('baseline and current UI parity: all ten actions, three routes, 140 auto ticks, day rollover, healing recovery',snapshots=len(new))
 # Upgrade from the actual current-main v0.7 worker; do not reset an open reader.
 server.old=True;ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();observe(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload()
 page.locator('[data-panel=diary]').click();page.locator('#voyageDiaryBtn').click();expect(page.locator('.voyage-card')).to_have_count(12);page.locator('[data-open-entry="V001-01"]').click()
 server.old=False;page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');page.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')")
 expect(page.locator('#voyageDialog')).to_be_visible();assert page.evaluate("navigator.serviceWorker.controller.scriptURL.endsWith('/sw.js')")
 assert page.evaluate("caches.keys().then(k=>k.includes('marie-v07-leisure-1'))")
 page.locator('#voyageStoryClose').click();page.locator('#installBtn').click()
 with page.expect_navigation():page.locator('#pwaUpdateBtn').click()
 page.wait_for_function("caches.keys().then(k=>k.includes('marie-v2-crew-1')&&!k.includes('marie-v07-leisure-1'))")
 passed('actual v0.7 -> state worker waits for consent and retains open 001 reader')
 ctx.set_offline(True);page.reload();page.locator('[data-panel=home]').click();expect(page.locator('#stats .stat')).to_have_count(6);page.locator('#autoBtn').click();page.locator('.hotspot[data-room=garden]').click();page.locator('#roomAction').click();expect(page.locator('#stats strong').nth(2)).to_have_text('81%');page.locator('#closeRoom').click()
 page.locator('#jumpBtn').click();expect(page.locator('#travelTitle')).to_have_text('황금 고리 행성')
 passed('offline reload loads full ES-module graph and updates actual healing UI')
 ctx.close()
 for width,height in [(768,1024),(390,844)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=True,reduced_motion='reduce');page=ctx.new_page();observe(page);page.goto(URL);page.locator('#autoBtn').tap();page.locator('.hotspot[data-room=garden]').tap();page.locator('#roomAction').tap();expect(page.locator('#stats strong').nth(2)).to_have_text('81%');page.locator('#closeRoom').tap()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(OUT/f'state-{width}.png'));ctx.close()
 passed('tablet/mobile actual action and layout, reduced motion and touch (Chromium emulation)')
 browser.close()
assert not errors,errors
passed('no page exceptions',errors=errors)
server.shutdown()
