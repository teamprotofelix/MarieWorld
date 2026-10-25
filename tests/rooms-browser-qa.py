"""Ten real room flows, lifecycle, mobile input, offline and v04 -> rooms SW upgrade.
Run: python tests/rooms-browser-qa.py (Python Playwright + Chromium).
Time is advanced by Playwright's clock through real rAF ticks; no game-state hooks.
"""
import json,os,subprocess,threading
from datetime import datetime,timedelta,timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('MARIE_ROOMS_QA_OUTPUT',str(ROOT/'work'/'rooms-qa')));OUT.mkdir(parents=True,exist_ok=True)
# Baseline contains the merged flight view and v04 worker.
BASE=subprocess.check_output(['git','rev-parse','75c66b7'],cwd=ROOT,text=True).strip()
OLD={name:subprocess.check_output(['git','show',f'{BASE}:{name}'],cwd=ROOT) for name in ['index.html','app.js','styles.css','sw.js','pwa.js','flight.js','flight-model.js']}
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  key=self.path.split('?')[0].lstrip('/') or 'index.html'
  if self.server.old and key in OLD:
   b=OLD[key];self.send_response(200);self.send_header('Content-Type',self.guess_type(key));self.send_header('Cache-Control','no-store');self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));server.old=False
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/'
report=[];errors=[];missing=[]
def record(check,**details):
 report.append({'check':check,'status':'passed',**details});(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS:',check,details or '',flush=True)
PROBE='''(() => {
 const pending=new Set(),raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
 window.requestAnimationFrame=cb=>{let id=raf(t=>{pending.delete(id);cb(t)});pending.add(id);return id};
 window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)};window.__pendingFrames=pending;
 window.__shipDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(im,...a){if(im.src&&/flight\\/ship-/.test(im.src)){window.__shipDraws++;if(this.canvas.id==='missionCanvas')window.__missionX=this.getTransform().e/Math.min(devicePixelRatio,2);}return draw.call(this,im,...a)};
})();'''
def wire(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:missing.append(r.url) if r.status==404 else None)
def click(page,selector):page.locator(selector).click(force=True)
def tick(page,ms):
 if getattr(page,'_room_clock',False):page.clock.run_for(ms)
 else:page.wait_for_timeout(ms)
def action(page,name,value=None):
 selector=f'[data-action="{name}"]'+(f'[data-value="{value}"]' if value is not None else '')
 click(page,selector)
def open_room(page,room):
 click(page,f'[data-room="{room}"]');click(page,'#roomEventBtn');expect(page.locator('#eventPhase')).to_have_text('준비');click(page,'#eventStart');tick(page,80)
def result_return(page,room):
 expect(page.locator('#eventPhase')).to_have_text('결과');detail=page.locator('#eventResultDetail').inner_text()
 frozen=page.locator('#eventTime').inner_text();tick(page,1000);assert page.locator('#eventTime').inner_text()==frozen
 click(page,'#eventRetry');expect(page.locator('#eventPhase')).to_have_text('준비');click(page,'#eventStart');tick(page,100)
 click(page,'#eventBack');expect(page.locator('#roomEvent')).to_be_hidden();expect(page.locator('#roomModal')).to_be_visible()
 click(page,'#closeRoom');expect(page.locator('#roomModal')).to_be_hidden();assert page.evaluate('window.__pendingFrames.size')==0
 record('room flow: '+room,result=detail,retry_and_return=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce');ctx.add_init_script(PROBE);ctx.add_init_script('Math.random=()=>.9')
 page=ctx.new_page();wire(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload()
 page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page._room_clock=True;page.evaluate(PROBE);click(page,'#autoBtn');hull=page.locator('#stats').inner_text()
 open_room(page,'garden');action(page,'seed','basil');page.locator('[data-range=water]').fill('65');page.locator('[data-range=light]').fill('45');tick(page,31000)
 expect(page.locator('#growthText')).to_contain_text('3/3');page.screenshot(path=str(OUT/'desktop-garden.png'));action(page,'harvest');result_return(page,'garden')
 open_room(page,'kitchen');action(page,'ingredient','basil');expect(page.locator('#eventFeedback')).to_contain_text('물');
 for value in ['water','potato','basil']:action(page,'ingredient',value)
 for _ in range(3):
  while page.locator('#stirButton').is_disabled():tick(page,100)
  # Read the visible gauge needle, then act when it is inside the printed target.
  for i in range(80):
   v=float(page.locator('#gaugeNeedle').evaluate('(el)=>parseFloat(el.style.left)'))
   if 41<=v<=64:break
   tick(page,50)
  action(page,'stir')
 tick(page,31000);action(page,'plate');result_return(page,'kitchen')
 open_room(page,'workshop');action(page,'power');expect(page.locator('#eventFeedback')).to_contain_text('머리')
 for name in ['head','body','arms','move']:action(page,name,1)
 expect(page.locator('.made-robot')).to_have_class('made-robot head-1 body-1 arms-1 move-1 ')
 page.screenshot(path=str(OUT/'desktop-robot.png'));action(page,'power');tick(page,3200);result_return(page,'workshop')
 open_room(page,'engine')
 for circuit in range(4):
  while page.locator('#lockButton').is_disabled():tick(page,100)
  for i in range(100):
   target=page.locator('#gaugeTarget').evaluate('(el)=>[parseFloat(el.style.left),parseFloat(el.style.width)]')
   needle=page.locator('#gaugeNeedle').evaluate('(el)=>parseFloat(el.style.left)')
   if target[0]+1<=needle<=target[0]+target[1]-1:break
   tick(page,50)
  action(page,'lock')
 result_return(page,'engine')
 # Learn the pairs by flipping visible cards, using no production state hook.
 open_room(page,'observatory')
 for pair in range(6):
  hidden=[j for j in range(12) if not page.locator(f'[data-action=card][data-value="{j}"]').is_disabled()]
  first=hidden[0];action(page,'card',first)
  for second in hidden[1:]:
   action(page,'card',second)
   if page.locator('#eventPhase').inner_text()=='결과':break
   if page.locator(f'[data-action=card][data-value="{second}"]').is_disabled():break
   tick(page,1100);action(page,'card',first)
  if page.locator('#eventPhase').inner_text()=='결과':break
 result_return(page,'observatory')
 open_room(page,'bedroom')
 # Matching the printed preference uses the same native buttons as a player.
 wish=page.locator('.dream-wish').inner_text()
 for group in ['light','blanket','cushion']:
  for button in page.locator(f'[data-action={group}]').all():
   if button.inner_text() in wish:button.click(force=True);break
 action(page,'rest');result_return(page,'bedroom')
 open_room(page,'cargo');action(page,'item','tea');action(page,'bin','tools');expect(page.locator('#eventFeedback')).to_contain_text('식량')
 for item,kind in [('soup','food'),('tea','food'),('potato','food'),('bolt','tools'),('wire','tools'),('wrench','tools'),('oxygen','bio'),('water','bio'),('seed','bio')]:action(page,'item',item);action(page,'bin',kind)
 result_return(page,'cargo')
 open_room(page,'lounge');action(page,'tea','green');action(page,'brew');tick(page,25100);action(page,'brew');action(page,'snack','rice');action(page,'serve');result_return(page,'lounge')
 open_room(page,'cockpit');page.screenshot(path=str(OUT/'desktop-flight-mission.png'))
 page.locator('#missionCanvas').focus();page.keyboard.press('b');expect(page.locator('[data-action=shield]')).to_contain_text('1회')
 tick(page,46000);result_return(page,'cockpit')
 open_room(page,'corridor');page.locator('#patrolCanvas').focus();page.keyboard.press('Space');tick(page,200);action(page,'duck');tick(page,46000);result_return(page,'corridor')
 open_room(page,'corridor');page.locator('#patrolCanvas').focus();jumped=False
 for _ in range(500):
  if page.locator('#eventPhase').inner_text()=='결과':break
  next_text=page.locator('#patrolNext').inner_text()
  if '배관' in next_text:
   page.keyboard.down('ArrowDown');jumped=False
  elif '상자' in next_text:
   eta=float(next_text.split('·')[1].strip().replace('초',''))
   if eta<=.4 and not jumped:page.keyboard.up('ArrowDown');page.keyboard.press('Space');jumped=True
  tick(page,100)
 page.keyboard.up('ArrowDown')
 expect(page.locator('#eventResultDetail')).to_contain_text('270m')
 result_return(page,'corridor-success')
 assert page.locator('#stats').inner_text()==hull;record('all events leave existing survival resources unchanged')
 for i in range(12):
  room=['cockpit','corridor','garden','observatory'][i%4];open_room(page,room)
  assert page.evaluate('window.__pendingFrames.size')==1,{'room':room,'pending':page.evaluate('window.__pendingFrames.size'),'paused':page.locator('#eventPaused').is_visible()}
  page.keyboard.press('Escape');expect(page.locator('#roomEvent')).to_be_hidden();expect(page.locator('#roomModal')).to_be_visible()
  tick(page,100);assert page.evaluate('window.__pendingFrames.size')==0
  assert page.evaluate("document.getElementById('roomEventBtn').dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',key:'ArrowDown',bubbles:true,cancelable:true}))")
  click(page,'#closeRoom')
 record('12 repeated entries: one loop during play, zero after exit; Escape closes one level; keys released')
 open_room(page,'cockpit');tick(page,1000);click(page,'#eventPause');frozen=page.locator('#eventTime').inner_text();tick(page,5000);assert page.locator('#eventTime').inner_text()==frozen
 click(page,'#eventPause');tick(page,1000);assert page.locator('#eventTime').inner_text()!=frozen
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 expect(page.locator('#eventPaused')).to_be_visible();t=page.locator('#eventTime').inner_text();tick(page,5000);assert page.locator('#eventTime').inner_text()==t
 page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");expect(page.locator('#eventPaused')).to_be_visible();click(page,'#eventPause')
 page.set_viewport_size({'width':390,'height':844});tick(page,100);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.evaluate("document.getElementById('roomNext').click()");expect(page.locator('#roomEvent')).to_be_hidden();expect(page.locator('#roomTitle')).not_to_have_text('조종실');click(page,'#closeRoom')
 record('pause/resume, synthetic tab visibility, 390px action resize and different-room cleanup')
 page.set_viewport_size({'width':1440,'height':1100});tick(page,200);click(page,'#flightViewBtn');tick(page,200);assert page.locator('#flightStage').is_visible(),page.locator('#flightViewBtn').get_attribute('aria-pressed');page.locator('#flightCanvas').scroll_into_view_if_needed();tick(page,1000)
 assert page.evaluate('window.__pendingFrames.size')==1
 # Open a room programmatically because the normal MAP UI is hidden in FLIGHT.
 page.evaluate("document.querySelector('[data-room=cockpit]').click()");click(page,'#roomEventBtn');click(page,'#eventStart');tick(page,100)
 assert page.evaluate('window.__pendingFrames.size')==1
 click(page,'#eventBack');click(page,'#closeRoom');tick(page,500);assert page.evaluate('window.__pendingFrames.size')==1
 click(page,'#mapViewBtn');tick(page,100);assert page.evaluate('window.__pendingFrames.size')==0
 click(page,'[data-panel=diary]');expect(page.locator('.diary-card')).to_have_count(10);click(page,'[data-panel=home]');click(page,'#installBtn');expect(page.locator('#pwaInstallModal')).to_be_visible();click(page,'#closePwa')
 record('shared flight scene: home/mission never run two loops; map, diary, install regressions')
 # Once prepared, all ten room modules start while genuinely offline.
 ctx.set_offline(True);page.reload();page.evaluate(PROBE);tick(page,100)
 for room in ['cockpit','garden','kitchen','workshop','engine','observatory','bedroom','cargo','corridor','lounge']:
  open_room(page,room);assert page.locator('#eventBody button').count()>0;tick(page,200);click(page,'#eventBack');click(page,'#closeRoom')
 record('offline reload and playable start for all ten rooms')
 ctx.close()
 # Real emulated touch input and keyboard button navigation, at both phone widths.
 for width in [360,390]:
  mobile=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,device_scale_factor=3,reduced_motion='reduce');mobile.add_init_script(PROBE);mp=mobile.new_page();wire(mp);mp.goto(URL)
  mp.locator('[data-room=cargo]').tap();mp.locator('#roomEventBtn').tap();mp.locator('#eventStart').tap();mp.locator('[data-action=item][data-value=tea]').tap();mp.locator('[data-action=bin][data-value=food]').tap();expect(mp.locator('.cargo-items button')).to_have_count(8)
  assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth');mp.screenshot(path=str(OUT/f'mobile-cargo-{width}.png'))
  mp.keyboard.press('Escape');mp.locator('#closeRoom').tap();mp.locator('[data-room=observatory]').tap();mp.locator('#roomEventBtn').tap();mp.locator('#eventStart').tap();mp.locator('[data-action=card]').first.focus();mp.keyboard.press('Enter');expect(mp.locator('[data-action=card]').first).to_have_attribute('aria-pressed','true')
  mp.screenshot(path=str(OUT/f'mobile-memory-{width}.png'));mp.keyboard.press('Escape');mp.locator('#closeRoom').tap();mp.locator('[data-room=cockpit]').tap();mp.locator('#roomEventBtn').tap();mp.locator('#eventStart').tap()
  mp.locator('[data-move=right]').scroll_into_view_if_needed();mp.wait_for_timeout(250)
  x=mp.evaluate('window.__missionX');box=mp.locator('[data-move=right]').bounding_box();cdp=mobile.new_cdp_session(mp)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+20,'y':box['y']+20}]});mp.wait_for_timeout(250)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});mp.wait_for_timeout(100)
  assert mp.locator('.event-pad .pressed').count()==0
  assert mp.evaluate('window.__missionX')>x+15
  mp.set_viewport_size({'width':844,'height':width});assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.close()
 record('360/390px touch sorting, keyboard memory, pointer cancel and landscape layouts (emulated)')
 # Upgrade actual cached v04 page without interrupting a running mission.
 server.old=True;upgrade=browser.new_context();up=upgrade.new_page();wire(up);up.goto(URL);up.evaluate('navigator.serviceWorker.ready.then(()=>true)');up.reload();up.wait_for_function('navigator.serviceWorker.controller!==null');assert up.locator('#roomEventBtn').count()==0
 server.old=False;up.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');up.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')")
 assert up.locator('#roomEventBtn').count()==0;assert 'marie-v04-flight-1' in up.evaluate('caches.keys()')
 click(up,'#installBtn')
 with up.expect_navigation():click(up,'#pwaUpdateBtn')
 up.wait_for_function("caches.keys().then(k=>k.includes('marie-v06-voyage-1')&&!k.includes('marie-v04-flight-1'))")
 open_room(up,'workshop');action(up,'head',2);upgrade.set_offline(True);expect(up.locator('.robot-head')).to_contain_text('⌁');click(up,'#eventBack');click(up,'#closeRoom');up.reload();open_room(up,'lounge');action(up,'tea','rooibos');expect(up.locator('#teaTarget')).to_contain_text('30초')
 record('actual v04 -> rooms SW waits for consent; new module runs offline after update')
 upgrade.close();browser.close()
assert not errors,errors
assert not missing,missing
record('no browser exceptions or asset 404s',errors=errors,missing=missing)
server.shutdown();print('All room browser checks passed:',OUT,flush=True)
