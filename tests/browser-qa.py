"""Real Chromium regression checks. Run: python tests/browser-qa.py
Requires Python Playwright and Chromium. No production test hooks or npm deps.
Starts an isolated localhost server and simulates an old PWA -> new PWA update.
"""
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('MARIE_QA_OUTPUT', str(ROOT / 'work' / 'qa')))
OUT.mkdir(parents=True, exist_ok=True)
BASE = '0775ec0667e8d38ac04689efcd7aededbf2a86ac'
OLD = {name: subprocess.check_output(['git', 'show', f'{BASE}:{name}'], cwd=ROOT)
       for name in ['index.html', 'app.js', 'styles.css', 'sw.js', 'pwa.js']}
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        key = self.path.split('?')[0].lstrip('/') or 'index.html'
        if self.server.old and key in OLD:
            body = OLD[key]
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(key))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', len(body))
            self.end_headers(); self.wfile.write(body)
        else: super().do_GET()

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
server.old = False
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/'
results = []
def passed(name, **details):
    results.append({'check': name, 'status': 'passed', **details})
    (OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print('PASS:', name, details or '', flush=True)

PROBE = """(() => {
 window.__flightProbe={draws:0, x:0, y:0, frames:[]};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(im,...args){
   if(im.src && /flight\\/ship-/.test(im.src)) {
     const p=window.__flightProbe,t=this.getTransform();
     p.draws++;p.x=t.e/Math.min(devicePixelRatio,2);p.y=t.f/Math.min(devicePixelRatio,2);
     if(!p.frames.includes(im.src))p.frames.push(im.src);
   }
   return draw.call(this,im,...args);
 };
})();"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1100}, device_scale_factor=1)
    context.add_init_script(PROBE)
    page = context.new_page(); errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    expect(page.locator('#mapStage')).to_be_visible();expect(page.locator('#flightStage')).to_be_hidden()
    for i in range(10):
        page.locator('.hotspot').nth(i).click()
        expect(page.locator('#roomModal')).to_be_visible()
        page.locator('#roomAction').click();page.locator('#closeRoom').click()
    page.locator('[data-panel=diary]').click();expect(page.locator('.diary-card')).to_have_count(10)
    page.locator('.diary-details summary').first.click();expect(page.locator('.diary-body').first).to_be_visible()
    page.locator('[data-panel=route]').click();expect(page.locator('.destination')).to_have_count(3)
    page.locator('.destination button').nth(1).click();page.locator('[data-panel=home]').click()
    expect(page.locator('#travelTitle')).to_have_text('황금 고리 행성')
    page.locator('#autoBtn').click();expect(page.locator('#autoBtn')).to_contain_text('OFF')
    page.locator('#speedBtn').click();expect(page.locator('#speedBtn')).to_have_text('2×')
    page.locator('#installBtn').click();expect(page.locator('#pwaInstallModal')).to_be_visible();page.locator('#closePwa').click()
    passed('10 rooms/actions, 10 diaries, 3 destinations, journey controls and install UI')

    page.locator('#flightViewBtn').click();page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_timeout(1200)
    expect(page.locator('#mapStage')).to_be_hidden();expect(page.locator('#flightRegion')).to_have_text('황금 고리 행성')
    first=page.locator('#flightDistance').inner_text();page.wait_for_timeout(600);assert page.locator('#flightDistance').inner_text()!=first
    assert len(page.evaluate('window.__flightProbe.frames'))==8
    page.locator('.ship-card').screenshot(path=str(OUT/'desktop-auto-1440.png'))
    page.locator('#manualPilotBtn').click();page.locator('#flightCanvas').focus()
    start=page.evaluate('window.__flightProbe.y');page.keyboard.down('ArrowDown');page.wait_for_timeout(300);page.keyboard.up('ArrowDown')
    assert page.evaluate('window.__flightProbe.y')>start+25
    page.locator('#flightCanvas').focus();start=page.evaluate('window.__flightProbe.x');page.keyboard.down('D');page.wait_for_timeout(250);page.keyboard.up('D')
    assert page.evaluate('window.__flightProbe.x')>start+20
    page.locator('.ship-card').screenshot(path=str(OUT/'desktop-manual-1440.png'))
    passed('MAP/FLIGHT, AUTO/MANUAL, region integration, all eight frames, arrows and WASD')

    # Explicit focus ownership: keys outside flight keep their normal browser behavior.
    page.locator('#autoBtn').focus()
    assert page.evaluate("document.getElementById('autoBtn').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}))")
    page.locator('#helpBtn').click();page.wait_for_timeout(200)
    draws=page.evaluate('window.__flightProbe.draws');page.wait_for_timeout(350)
    assert page.evaluate('window.__flightProbe.draws')==draws
    page.locator('#closeHelp').click();page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_timeout(200)
    assert page.evaluate('window.__flightProbe.draws')>draws
    # Hold a key across leaving the view; returning must never continue steering.
    page.locator('#flightCanvas').focus();page.keyboard.down('ArrowRight');page.wait_for_timeout(100)
    page.locator('#mapViewBtn').click();page.wait_for_timeout(100);draws=page.evaluate('window.__flightProbe.draws');page.wait_for_timeout(250)
    assert page.evaluate('window.__flightProbe.draws')==draws
    page.keyboard.up('ArrowRight');page.locator('#flightViewBtn').click();page.wait_for_timeout(150)
    x=page.evaluate('window.__flightProbe.x');page.wait_for_timeout(250);assert abs(page.evaluate('window.__flightProbe.x')-x)<2
    page.locator('[data-panel=diary]').click();page.wait_for_timeout(150);draws=page.evaluate('window.__flightProbe.draws');page.wait_for_timeout(300)
    assert page.evaluate('window.__flightProbe.draws')==draws
    page.locator('[data-panel=home]').click();page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_timeout(200)
    passed('input focus isolation, modal/view pause, return without stuck keys')

    # Visibility lifecycle through the same browser event branch, plus focus blur.
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(100);draws=page.evaluate('window.__flightProbe.draws');page.wait_for_timeout(250);assert page.evaluate('window.__flightProbe.draws')==draws
    page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(250);assert page.evaluate('window.__flightProbe.draws')>draws
    passed('visibilitychange pause/resume (synthetic hidden state)')

    page.emulate_media(reduced_motion='reduce');expect(page.locator('#motionNote')).to_be_visible();expect(page.locator('#flightSpeed')).to_contain_text('저속')
    page.locator('#flightCanvas').focus()
    assert page.evaluate("document.getElementById('flightCanvas').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',ctrlKey:true,bubbles:true,cancelable:true}))")
    y=page.evaluate('window.__flightProbe.y');page.keyboard.down('ArrowUp');page.wait_for_timeout(250);page.keyboard.up('ArrowUp');page.wait_for_timeout(100)
    assert page.evaluate('window.__flightProbe.y')<y-35

    page.emulate_media(reduced_motion='no-preference')
    for size in [320,360,390,412,768,1440]:
        page.set_viewport_size({'width':size,'height':1000});page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_timeout(150)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),size
        assert page.locator('#flightCanvas').bounding_box()['width']<=size
    passed('reduced-motion UI; no overflow at 320, 360, 390, 412, 768, 1440 px')

    touch = browser.new_context(viewport={'width':360,'height':1000},is_mobile=True,has_touch=True,device_scale_factor=3)
    touch.add_init_script(PROBE);mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.goto(URL);mobile.locator('#flightViewBtn').tap();mobile.locator('#flightCanvas').scroll_into_view_if_needed();mobile.wait_for_timeout(600)
    mobile.locator('.ship-card').screenshot(path=str(OUT/'mobile-auto-360.png'))
    mobile.locator('#manualPilotBtn').tap();mobile.locator('#flightControls').scroll_into_view_if_needed();mobile.wait_for_timeout(200)
    start=mobile.evaluate('window.__flightProbe.y');box=mobile.locator('[data-steer=down]').bounding_box()
    cdp=touch.new_cdp_session(mobile)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+20,'y':box['y']+20}]})
    mobile.wait_for_timeout(300);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});mobile.wait_for_timeout(100)
    assert mobile.evaluate('window.__flightProbe.y')>start+15
    assert mobile.evaluate('document.querySelectorAll(".flight-controls .pressed").length')==0
    assert mobile.evaluate('document.getElementById("flightCanvas").width')==round(mobile.locator('#flightCanvas').bounding_box()['width']*2)
    mobile.locator('.ship-card').screenshot(path=str(OUT/'mobile-manual-360.png'))
    passed('360px emulated touch controls, pointer release, DPR 3 capped at 2')
    touch.close()

    # Missing image requests preserve the playable vector fallback.
    fail = browser.new_context(service_workers='block');fp=fail.new_page();fp.on('pageerror',lambda e:errors.append(str(e)))
    fp.route('**/assets/flight/*.webp',lambda route:route.abort());fp.goto(URL);fp.locator('#flightViewBtn').click();fp.wait_for_timeout(600)
    assert fp.locator('#flightDistance').inner_text()!='0 km';fp.locator('#manualPilotBtn').click()
    expect(fp.locator('#flightControls')).to_be_visible();fail.close()
    passed('all flight images fail: fallback keeps simulation and controls usable')

    # Drive the production UI into the known first collectible and first asteroid.
    encounter = browser.new_context(viewport={'width':1440,'height':1100})
    encounter.add_init_script('Math.random = () => .5')
    ep=encounter.new_page();ep.on('pageerror',lambda e:errors.append(str(e)))
    ep.goto(URL);ep.locator('#autoBtn').click();hull=ep.locator('#stats').inner_text()
    ep.locator('#flightViewBtn').click();ep.locator('#manualPilotBtn').click();ep.locator('#flightCanvas').scroll_into_view_if_needed()
    ep.wait_for_function("Number(document.getElementById('flightScore').textContent)>=1",timeout=6000)
    ep.locator('#flightCanvas').focus();h=ep.locator('#flightCanvas').bounding_box()['height']
    ep.keyboard.down('ArrowDown');ep.wait_for_timeout(h*.25/240*1000);ep.keyboard.up('ArrowDown')
    ep.wait_for_function("document.getElementById('flightShield').textContent!=='100%'",timeout=10000)
    shield=ep.locator('#flightShield').inner_text();ep.wait_for_timeout(300)
    assert ep.locator('#flightShield').inner_text()==shield
    assert ep.locator('#stats').inner_text()==hull
    encounter.close()
    passed('production manual HUD: collection, asteroid collision, cooldown, unchanged ship resources')

    # 150 seconds of real wall-clock auto flight; compare frame and DOM counters.
    page.set_viewport_size({'width':1440,'height':1100});page.locator('#autoPilotBtn').click();page.locator('#flightCanvas').scroll_into_view_if_needed();page.wait_for_timeout(300)
    cdp=context.new_cdp_session(page);cdp.send('Performance.enable')
    before={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    draw0=page.evaluate('window.__flightProbe.draws');start=time.monotonic()
    for i in range(5):
        page.wait_for_timeout(30000)
        print('SOAK:',int(time.monotonic()-start),'seconds',flush=True)
    after={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    draw_delta=page.evaluate('window.__flightProbe.draws')-draw0
    assert draw_delta>500;assert not errors,errors
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    passed('150-second real auto-flight soak', wall_seconds=round(time.monotonic()-start,1),ship_draws=draw_delta,
           heap_before=before.get('JSHeapUsedSize'),heap_after=after.get('JSHeapUsedSize'),
           dom_nodes_before=before.get('Nodes'),dom_nodes_after=after.get('Nodes'),page_errors=errors)
    context.close()

    # Same origin, old worker installed first. Verify consent gates activation.
    server.old=True
    upgrade=browser.new_context();up=upgrade.new_page();up.on('pageerror',lambda e:errors.append(str(e)))
    up.goto(URL);up.evaluate("navigator.serviceWorker.ready.then(()=>true)");up.reload()
    up.wait_for_function('navigator.serviceWorker.controller !== null')
    assert not up.locator('#flightViewBtn').count()
    server.old=False
    up.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>true)')
    up.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')")
    assert not up.locator('#flightViewBtn').count(),'old page remains until approval'
    assert 'marie-v2' in up.evaluate('caches.keys()')
    up.locator('#installBtn').click()
    with up.expect_navigation():up.locator('#pwaUpdateBtn').click()
    expect(up.locator('#flightViewBtn')).to_be_visible()
    up.wait_for_function("caches.keys().then(k=>k.includes('marie-v06-voyage-2')&&!k.includes('marie-v2'))")
    passed('real old v2 worker -> current update, approval required, old cache removed')
    upgrade.set_offline(True);up.reload();expect(up.locator('#mapStage')).to_be_visible()
    up.locator('#flightViewBtn').click();up.locator('#flightCanvas').scroll_into_view_if_needed();up.wait_for_timeout(600)
    assert up.locator('#flightDistance').inner_text()!='0 km'
    loaded=up.evaluate("caches.open('marie-v06-voyage-2').then(async c=>(await c.keys()).filter(r=>r.url.includes('assets/flight/')).length)")
    assert loaded==18
    up.locator('#manualPilotBtn').click();expect(up.locator('#flightControls')).to_be_visible()
    up.locator('[data-panel=diary]').click();expect(up.locator('.diary-card')).to_have_count(10)
    assert not errors,errors
    passed('offline reload: MAP, FLIGHT animation, manual controls, 18 flight images, 10 diaries')
    upgrade.close();browser.close()
server.shutdown()
print('All browser checks passed. Results:',OUT,flush=True)
