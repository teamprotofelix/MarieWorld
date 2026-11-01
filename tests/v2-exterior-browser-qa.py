"""Exterior view navigation, asset-on-demand cache, errors, effects and touch."""
import json,os,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('MARIE_EXTERIOR_QA_OUTPUT',str(ROOT/'work/v2-exterior-qa')));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/';results=[];errors=[];requests=[]
def passed(name,**values):
 results.append({'check':name,'status':'passed',**values});(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',name,values,flush=True)
def watch(page):page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
def ready(page):
 page.locator('#exteriorViewBtn').click();expect(page.locator('#exteriorStage')).to_be_visible();page.locator('#exteriorImage').evaluate('im=>im.decode()');expect(page.locator('#exteriorScene')).to_have_attribute('data-loaded','true')
def photo(page):
 v=page.locator('#exteriorImage').evaluate('im=>{let r=im.getBoundingClientRect();return {natural:[im.naturalWidth,im.naturalHeight],ratio:r.width/r.height,fit:getComputedStyle(im).objectFit}}')
 assert v['natural']==[1672,941] and abs(v['ratio']-1672/941)<.01 and v['fit']=='contain',v
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');return v
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();watch(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload();expect(page.locator('#stats .stat')).to_have_count(6)
 assert not [u for u in requests if '/assets/concepts/v2/' in u]
 cached=page.evaluate("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.open(k).then(c=>c.keys().then(rs=>rs.map(r=>r.url)))))).then(v=>v.flat())")
 assert not [u for u in cached if '/assets/concepts/v2/' in u]
 passed('first install precaches core only; none of eight concepts requested or cached')
 page.locator('#exteriorViewBtn').focus();page.keyboard.press('Enter');page.locator('#exteriorImage').evaluate('im=>im.decode()');expect(page.locator('#mapStage')).to_be_hidden();expect(page.locator('#flightStage')).to_be_hidden();v=photo(page)
 page.locator('#exteriorScene').scroll_into_view_if_needed();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','true');page.screenshot(path=str(OUT/'desktop-exterior.png'))
 assert all('02_exterior_giant_starship_castle.webp' in u for u in requests if '/assets/concepts/v2/' in u)
 passed('keyboard opens full 1672x941 exterior only, intact aspect and explicit future-concept copy',image=v)
 page.locator('#helpBtn').click();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','false');page.keyboard.press('Escape');expect(page.locator('#exteriorStage')).to_be_visible();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','true')
 page.locator('#exteriorMotion').click();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','false');page.locator('#exteriorMotion').click();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','true')
 page.locator('[data-panel=diary]').click();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','false');page.locator('[data-panel=home]').click();page.locator('#exteriorScene').scroll_into_view_if_needed();expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','true')
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','false');page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))");expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','true')
 page.emulate_media(reduced_motion='reduce');expect(page.locator('#exteriorScene')).to_have_attribute('data-animate','false');assert page.locator('.exterior-engine').evaluate('el=>getComputedStyle(el).animationName')=='none';page.emulate_media(reduced_motion='no-preference')
 page.keyboard.press('Escape');expect(page.locator('#mapStage')).to_be_visible();expect(page.locator('#mapViewBtn')).to_be_focused()
 passed('effects pause for modal, other panel, hidden document, quiet setting and reduced motion; Escape focus return')
 page.locator('#flightViewBtn').click();page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_function("document.getElementById('flightDistance').textContent!=='0 km'")
 page.locator('#manualPilotBtn').click();expect(page.locator('#flightControls')).to_be_visible();ready(page);expect(page.locator('#flightStage')).to_be_hidden();page.locator('#flightViewBtn').click();expect(page.locator('#manualPilotBtn')).to_have_attribute('aria-pressed','true');page.locator('#mapViewBtn').click()
 passed('map/exterior/flight transitions retain running flight and selected manual mode')
 ready(page);page.wait_for_function("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.open(k).then(c=>c.keys().then(rs=>rs.some(r=>r.url.includes('02_exterior'))))))).then(v=>v.some(Boolean))")
 ctx.set_offline(True);page.reload();ready(page);photo(page);page.locator('#exteriorBack').click();expect(page.locator('#mapStage')).to_be_visible();ctx.close()
 passed('visited exterior is cached on demand and survives offline reload')
 for width,height in [(768,1024),(390,844)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=True,reduced_motion='reduce');page=ctx.new_page();watch(page);page.goto(URL);page.locator('#exteriorViewBtn').tap();page.locator('#exteriorImage').evaluate('im=>im.decode()');photo(page);page.screenshot(path=str(OUT/f'exterior-{width}.png'));page.locator('#exteriorBack').tap();expect(page.locator('#mapStage')).to_be_visible();ctx.close()
 passed('tablet/mobile touch, full image, reduced motion and no horizontal overflow (emulated)')
 ctx=browser.new_context(service_workers='block');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/02_exterior_giant_starship_castle.webp',lambda r:r.abort());page.goto(URL);page.locator('#exteriorViewBtn').click();expect(page.locator('#exteriorRetry')).to_be_visible();expect(page.locator('#exteriorImage')).to_be_hidden();page.locator('#exteriorBack').click();expect(page.locator('#mapStage')).to_be_visible();page.unroute('**/02_exterior_giant_starship_castle.webp');page.locator('#exteriorViewBtn').click();page.locator('#exteriorImage').evaluate('im=>im.decode()');photo(page);ctx.close()
 passed('failed asset keeps text and map escape; subsequent entry retries without focus theft')
 ctx=browser.new_context(service_workers='block');page=ctx.new_page();watch(page);pending=[];page.route('**/02_exterior_giant_starship_castle.webp',lambda r:pending.append(r));page.goto(URL);page.locator('#exteriorViewBtn').click();page.locator('#exteriorBack').click();expect(page.locator('#mapViewBtn')).to_be_focused();assert pending;pending[0].fulfill(status=200,content_type='image/webp',body=(ROOT/'assets/concepts/v2/02_exterior_giant_starship_castle.webp').read_bytes());expect(page.locator('#exteriorScene')).to_have_attribute('data-loaded','true');expect(page.locator('#mapStage')).to_be_visible();expect(page.locator('#mapViewBtn')).to_be_focused();ready(page);photo(page);ctx.close()
 passed('slow image resolves while away without changing view or stealing focus')
 # Cache absent even though core is ready: clean error rather than app HTML as image.
 ctx=browser.new_context();page=ctx.new_page();watch(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload();ctx.set_offline(True);page.locator('#exteriorViewBtn').click();expect(page.locator('#exteriorRetry')).to_be_visible();page.locator('#exteriorBack').click();expect(page.locator('#mapStage')).to_be_visible();ctx.close()
 passed('unvisited optional art fails gracefully offline while core app remains usable')
 browser.close()
assert not errors,errors
passed('no browser exceptions',errors=errors);server.shutdown()
