"""All ten cutaway routes, focus, zoom, mobile, failures and optional offline art."""
import json,os,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('MARIE_CUTAWAY_QA_OUTPUT',str(ROOT/'work/v2-cutaway-qa')));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/';results=[];errors=[];requests=[]
IDS=['cockpit','garden','kitchen','lounge','bedroom','workshop','cargo','observatory','engine','corridor']
def passed(name,**values):
 results.append({'check':name,'status':'passed',**values});(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',name,values,flush=True)
def watch(page):page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
def enter(page):
 page.locator('#cutawayViewBtn').click();expect(page.locator('#cutawayStage')).to_be_visible();page.locator('#cutawayImage').evaluate('im=>im.decode()');expect(page.locator('#cutawayHotspots')).to_be_visible()
def room_state(page):return [page.locator(s).inner_text() for s in ['#roomTitle','#roomTag','#roomEventName']]+[page.locator('#roomImage').get_attribute('src')]
def photo(page):
 v=page.locator('#cutawayImage').evaluate('im=>{let r=im.getBoundingClientRect();return {natural:[im.naturalWidth,im.naturalHeight],ratio:r.width/r.height,fit:getComputedStyle(im).objectFit}}');assert v['natural']==[1672,941] and abs(v['ratio']-1672/941)<.01 and v['fit']=='contain',v
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');return v
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();watch(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload();page.locator('#autoBtn').click()
 assert not [u for u in requests if '/assets/concepts/v2/' in u]
 baseline={}
 for room in IDS:
  page.locator(f'.hotspot[data-room={room}]').click();baseline[room]=room_state(page);page.locator('#closeRoom').click()
 enter(page);photo(page);expect(page.locator('#cutawayHotspots button')).to_have_count(10);expect(page.locator('#cutawayRooms button')).to_have_count(10);expect(page.locator('#mapStage')).to_be_hidden()
 assert all('03_multideck_cross_section_cutaway.webp' in u for u in requests if '/assets/concepts/v2/' in u)
 page.locator('.ship-card').screenshot(path=str(OUT/'desktop-cutaway.png'))
 passed('initially no concept request; cutaway fetches only 03 intact, with ten hotspots and ten list alternatives')
 for room in IDS:
  button=page.locator(f'#cutawayHotspots [data-cutaway-room={room}]');button.click();expect(page.locator('#roomModal')).to_be_visible();assert room_state(page)==baseline[room]
  for _ in range(10):page.keyboard.press('Tab');assert page.evaluate("document.activeElement.closest('#roomModal')!==null")
  page.locator('#roomEventBtn').click();page.locator('#eventStart').click();expect(page.locator('#eventPhase')).to_have_text('플레이');page.keyboard.press('Escape');expect(page.locator('#roomModal')).to_be_visible();expect(page.locator('#roomEvent')).to_be_hidden();page.keyboard.press('Escape');expect(page.locator('#roomModal')).to_be_hidden();expect(button).to_be_focused();expect(page.locator('#cutawayStage')).to_be_visible()
 passed('all ten hotspots open exactly the legacy room/game; game starts, Tab trap and two-level Escape focus return')
 for room in IDS:
  button=page.locator(f'#cutawayRooms [data-cutaway-room={room}]');button.focus();page.keyboard.press('Enter');assert room_state(page)==baseline[room];page.locator('#roomNext').click();page.keyboard.press('Escape');expect(button).to_be_focused()
 passed('all ten list rooms work by keyboard; next-room navigation preserves original opener')
 base_width=page.locator('#cutawayCanvas').bounding_box()['width'];page.locator('#cutawayZoomIn').click();page.wait_for_function('(w)=>document.getElementById("cutawayCanvas").getBoundingClientRect().width>w*1.24',arg=base_width,timeout=5000);expect(page.locator('#cutawayZoomValue')).to_have_text('125%');photo(page);page.locator('#cutawayZoom').focus();page.keyboard.press('End');expect(page.locator('#cutawayZoomValue')).to_have_text('200%');photo(page);page.locator('#cutawayZoomReset').click();expect(page.locator('#cutawayZoomValue')).to_have_text('100%')
 page.locator('[data-panel=diary]').click();page.set_viewport_size({'width':1280,'height':900});page.locator('[data-panel=home]').click();page.wait_for_function('Math.abs(cutawayCanvas.getBoundingClientRect().width-Math.max(780,cutawayViewport.clientWidth))<1');page.set_viewport_size({'width':1440,'height':900});page.wait_for_function('Math.abs(cutawayCanvas.getBoundingClientRect().width-Math.max(780,cutawayViewport.clientWidth))<1')
 page.keyboard.press('Escape');expect(page.locator('#mapStage')).to_be_visible();expect(page.locator('#mapViewBtn')).to_be_focused();page.locator('.hotspot[data-room=garden]').click();assert room_state(page)==baseline['garden'];page.locator('#closeRoom').click();enter(page)
 for _ in range(12):page.locator('#exteriorViewBtn').click();page.locator('#flightViewBtn').click();page.locator('#cutawayViewBtn').click();expect(page.locator('#cutawayStage')).to_be_visible()
 page.locator('#installBtn').click();expect(page.locator('#pwaInstallModal')).to_be_visible();page.locator('#pwaInstallModal .backdrop').click(position={'x':5,'y':5});expect(page.locator('#pwaInstallModal')).to_be_hidden();expect(page.locator('#cutawayStage')).to_be_visible()
 passed('zoom by button/range keyboard, reset, Escape/map preservation, twelve view cycles and PWA backdrop ownership')
 page.wait_for_function("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.open(k).then(c=>c.keys().then(rs=>rs.some(r=>r.url.includes('03_multideck'))))))).then(v=>v.some(Boolean))")
 ctx.set_offline(True);page.reload();enter(page);photo(page)
 for room in IDS:
  page.locator(f'#cutawayRooms [data-cutaway-room={room}]').click();assert room_state(page)==baseline[room];page.locator('#roomEventBtn').click();page.locator('#eventStart').click();expect(page.locator('#eventPhase')).to_have_text('플레이');page.locator('#eventBack').click();page.locator('#closeRoom').click()
 ctx.close();passed('visited cutaway and all ten room/game starts survive offline reload')
 for width,height in [(768,1024),(390,844)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce');page=ctx.new_page();watch(page);page.goto(URL);page.locator('#cutawayViewBtn').tap();page.locator('#cutawayImage').evaluate('im=>im.decode()');photo(page)
  assert page.locator('#cutawayViewport').evaluate('el=>el.scrollWidth>=el.clientWidth')
  page.locator('#cutawayViewport').evaluate('el=>el.scrollLeft=el.scrollWidth');page.locator('#cutawayHotspots [data-cutaway-room=cockpit]').tap();assert room_state(page)==baseline['cockpit'];page.locator('#closeRoom').tap()
  for room in IDS:
   page.locator(f'#cutawayRooms [data-cutaway-room={room}]').tap();assert room_state(page)==baseline[room];page.locator('#closeRoom').tap()
  base_width=page.locator('#cutawayCanvas').bounding_box()['width'];page.locator('#cutawayZoomIn').tap();page.wait_for_function('(w)=>document.getElementById("cutawayCanvas").getBoundingClientRect().width>w*1.24',arg=base_width,timeout=5000);photo(page);page.locator('#cutawayZoomReset').tap();page.locator('.ship-card').screenshot(path=str(OUT/f'cutaway-{width}.png'));page.set_viewport_size({'width':height,'height':width});photo(page);ctx.close()
 passed('tablet/mobile: pan and hotspot touch, all ten large list routes, zoom, landscape and reduced motion (emulated)')
 ctx=browser.new_context(service_workers='block');page=ctx.new_page();watch(page);page.route('**/03_multideck_cross_section_cutaway.webp',lambda r:r.abort());page.goto(URL);page.locator('#cutawayViewBtn').click();expect(page.locator('#cutawayRetry')).to_be_visible();expect(page.locator('#cutawayViewport')).to_be_hidden()
 for room in IDS:
  page.locator(f'#cutawayRooms [data-cutaway-room={room}]').click();assert room_state(page)==baseline[room];page.locator('#closeRoom').click()
 page.unroute('**/03_multideck_cross_section_cutaway.webp');page.locator('#cutawayRetry').click();page.locator('#cutawayImage').evaluate('im=>im.decode()');expect(page.locator('#cutawayHotspots')).to_be_visible();ctx.close()
 passed('image failure leaves all ten accessible list routes; retry restores image and hotspots')
 ctx=browser.new_context(service_workers='block');page=ctx.new_page();watch(page);pending=[];page.route('**/03_multideck_cross_section_cutaway.webp',lambda r:pending.append(r));page.goto(URL);page.locator('#cutawayViewBtn').click();page.locator('#cutawayBack').click();assert pending;pending[0].fulfill(status=200,content_type='image/webp',body=(ROOT/'assets/concepts/v2/03_multideck_cross_section_cutaway.webp').read_bytes());expect(page.locator('#cutawayHotspots')).to_be_hidden();expect(page.locator('#mapStage')).to_be_visible();expect(page.locator('#mapViewBtn')).to_be_focused();enter(page);photo(page);ctx.close()
 passed('delayed image after leaving preserves map and focus; re-entry completes normally')
 ctx=browser.new_context();page=ctx.new_page();watch(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload();ctx.set_offline(True);page.locator('#cutawayViewBtn').click();expect(page.locator('#cutawayRetry')).to_be_visible();page.locator('#cutawayRooms [data-cutaway-room=garden]').click();assert room_state(page)==baseline['garden'];page.locator('#closeRoom').click();ctx.close()
 passed('never-visited optional art offline: clear fallback, cached room remains usable')
 browser.close()
assert not errors,errors
passed('no browser exceptions',errors=errors);server.shutdown()
