"""Five original photos + volume 002, links, aspect ratios, touch and real v06 -> v07 SW.
Requires Python Playwright and Chromium; uses an isolated localhost origin.
"""
import json,os,hashlib,subprocess,threading
from functools import partial
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('MARIE_LEISURE_QA_OUTPUT',str(ROOT/'work'/'leisure-qa')));OUT.mkdir(parents=True,exist_ok=True)
BASE=subprocess.check_output(['git','rev-parse','03a57d2'],cwd=ROOT,text=True).strip()
names=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines()
OLD={n:subprocess.check_output(['git','show',f'{BASE}:{n}'],cwd=ROOT) for n in names if ('/' not in n and n.endswith(('.html','.js','.css'))) or (n.startswith('data/') and n.endswith(('.json','.md')))}
registry=json.loads((ROOT/'data/voyage_collections.json').read_text());album=json.loads((ROOT/'data/marie_leisure_gallery.json').read_text());volume=json.loads((ROOT/'data/voyage-002/entries.json').read_text());first=json.loads((ROOT/'data/voyage_entries.json').read_text())
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  key=self.path.split('?')[0].lstrip('/') or 'index.html'
  if self.server.old and key in OLD:
   b=OLD[key];self.send_response(200);self.send_header('Content-Type',self.guess_type(key));self.send_header('Cache-Control','no-store');self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));server.old=False
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/'
results=[];errors=[];http_errors=[]
def record(name,**details):
 results.append({'check':name,'status':'passed',**details});(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',name,details or '',flush=True)
def wire(page):
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:http_errors.append((r.status,r.url)) if r.status>=400 else None)
def enter(page):
 page.locator('[data-panel=diary]').click();page.locator('#voyageDiaryBtn').click();expect(page.locator('.voyage-card')).to_have_count(12)
def book(page,id,count):
 page.locator('#voyageVolume').select_option(id);expect(page.locator('#voyageCollection')).to_have_attribute('aria-busy','false');expect(page.locator('.voyage-card')).to_have_count(count)
def open_album(page):
 page.locator('#voyageAlbumBtn').click();expect(page.locator('.leisure-card')).to_have_count(5);expect(page.locator('#leisureAlbum')).to_be_visible()
def decode_all(page,selector):
 for im in page.locator(selector).all():im.scroll_into_view_if_needed();im.evaluate('im=>im.decode()')
def ratio(page,selector,expected):
 r=page.locator(selector).evaluate('im=>{const r=im.getBoundingClientRect();return {natural:[im.naturalWidth,im.naturalHeight],ratio:r.width/r.height,fit:getComputedStyle(im).objectFit}}')
 assert abs(r['ratio']-expected)<.01,r
 assert r['fit']=='contain',r
 return r
def matches_photo(page,photo):
 expect(page.locator('#voyageDialog')).to_have_attribute('data-viewer','photo');expect(page.locator('#voyageStoryTitle')).to_have_text(photo['title']);expect(page.locator('#voyageStoryBody')).to_contain_text(photo['caption'])
 page.locator('#voyageStoryImage img').evaluate('im=>im.decode()');r=ratio(page,'#voyageStoryImage img',4/3);assert r['natural']==[1448,1086]
 expect(page.locator('#voyageStoryImage img')).to_have_attribute('alt',photo['alt'])
 expect(page.locator('#voyageStoryMeta')).to_contain_text(('대략 ' if photo['time_approx'] else '')+photo['time'])
def matches_entry(page,e):
 expect(page.locator('#voyageDialog')).to_have_attribute('data-viewer','story');expect(page.locator('#voyageStoryTitle')).to_have_text(e['title']);assert '\n\n'.join(page.locator('#voyageStoryBody p').all_text_contents())==e['body']
 page.locator('#voyageStoryImage img').evaluate('im=>im.decode()');r=ratio(page,'#voyageStoryImage img',16/9);assert r['natural']==[960,540]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':900},color_scheme='dark',permissions=['clipboard-read','clipboard-write']);page=ctx.new_page();wire(page);page.goto(URL);page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload();enter(page)
 assert page.locator('#voyageVolume option').evaluate_all('(ns)=>ns.map(n=>n.value)')==['AST2-VOYAGE-001','AST2-VOYAGE-002']
 book(page,'AST2-VOYAGE-002',5)
 for e in volume['entries']:
  page.locator(f'[data-open-entry="{e["id"]}"]').click();matches_entry(page,e);page.keyboard.press('Escape');assert page.evaluate('document.activeElement.dataset.openEntry')==e['id']
 page.locator('.voyage-snapshot>summary').click();snap=page.locator('#voyageSnapshotValues').inner_text();expect(page.locator('#voyageSnapshotMeta')).to_contain_text('DAY 001 14:58');assert '2,037,120' in snap
 page.locator('[data-panel=home]').click();page.locator('#jumpBtn').click();page.locator('[data-panel=diary]').click();assert page.locator('#voyageSnapshotValues').inner_text()==snap
 page.locator('.voyage-memory>summary').click();page.locator('#voyageCopyMemory').click();expect(page.locator('#voyageCopyStatus')).to_contain_text('복사했습니다');assert 'DAY 001 14:58' in page.evaluate('navigator.clipboard.readText()')
 page.locator('.voyage-canon>summary').click()
 with page.expect_download() as pending:page.locator('#voyageCanonLink').click()
 pending.value.save_as(OUT/'CANON002.download.md');assert (OUT/'CANON002.download.md').read_bytes()==(ROOT/'data/voyage-002/CANON_MEMORY.md').read_bytes()
 record('002 five exact journal bodies and 16:9 frames, approximate clocks, DAY001 fixed snapshot and canon')
 book(page,'AST2-VOYAGE-001',12);assert page.locator('.voyage-card h3').all_text_contents()==[e['title']+' ↗' for e in first['entries']]
 open_album(page);decode_all(page,'.leisure-card img')
 for photo in album['photos']:
  selector=f'[data-photo-id="{photo["id"]}"] img';assert ratio(page,selector,4/3)['natural']==[1448,1086]
 assert '실제 인간' not in page.locator('#leisureAlbum').inner_text()
 page.locator('#leisureAlbum').evaluate("el=>el.scrollIntoView({block:'start',behavior:'instant'})");page.wait_for_timeout(400);page.screenshot(path=str(OUT/'desktop-album-1440.png'))
 record('001 remains 12 records; album has five independent 1448x1086 images with complete 4:3 layout')
 for photo in album['photos']:
  page.locator(f'[data-photo-open="{photo["id"]}"]').click();matches_photo(page,photo)
  for _ in range(8):page.keyboard.press('Tab');assert page.evaluate("document.activeElement.closest('#voyageDialog')!==null")
  page.keyboard.press('Escape');assert page.evaluate('document.activeElement.dataset.photoOpen')==photo['id']
 record('all five enlarged photos: title/activity/caption/alt, Tab trap, Escape and opener focus')
 page.locator('[data-photo-open="MARIE-LEISURE-01"]').click();expect(page.locator('#voyagePrevious')).to_be_disabled()
 for _ in range(4):page.locator('#voyageNext').click()
 expect(page.locator('#voyageNext')).to_be_disabled();expect(page.locator('#voyageStoryPosition')).to_have_text('5 / 5');page.locator('#voyageStoryClose').click()
 mapping=[]
 for photo in album['photos']:
  page.locator(f'[data-photo-open="{photo["id"]}"]').click();page.locator('#voyageRelatedEntry').click();e=next(e for e in volume['entries'] if e['image']==photo['diary_image']);matches_entry(page,e);mapping.append([photo['id'],e['id']]);assert page.locator('#voyageVolume').input_value()=='AST2-VOYAGE-002'
  page.locator('#voyageRelatedPhoto').click();matches_photo(page,photo);page.locator('#voyageStoryClose').click();assert page.evaluate('document.activeElement.dataset.photoOpen')==photo['id']
 assert mapping[2][1]=='V002-05' and mapping[4][1]=='V002-02'
 record('all five bidirectional photo/journal links and previous/next boundaries',mapping=mapping)
 page.locator('[data-photo-open="MARIE-LEISURE-01"]').click();matches_photo(page,album['photos'][0]);page.locator('#voyageDialog [data-voyage-theme]').click();expect(page.locator('#voyageDialog')).to_have_attribute('data-reader-theme','light');page.screenshot(path=str(OUT/'desktop-photo-1440-light.png'))
 with page.expect_download() as pending:page.locator('#leisureOriginal').click()
 pending.value.save_as(OUT/'original-download.webp');assert (OUT/'original-download.webp').read_bytes()==(ROOT/album['photos'][0]['image']).read_bytes();page.locator('#voyageStoryClose').click()
 for i in range(12):
  photo=album['photos'][i%5];page.locator(f'[data-photo-open="{photo["id"]}"]').click();page.locator('#voyageStoryClose').click()
 assert page.evaluate('document.body.style.overflow')=='';page.locator('#leisureBack').click();expect(page.locator('#voyageArchive')).to_be_visible();expect(page.locator('#diaryCount')).to_contain_text('5편')
 record('light/dark shared reader, original WebP download, 12 repeat cycles, scroll release and archive return')
 for width,height in [(768,1024),(390,844)]:
  mobile=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=2,color_scheme='light',reduced_motion='reduce');mp=mobile.new_page();wire(mp);mp.goto(URL+'#diary');mp.locator('#voyageDiaryBtn').tap();expect(mp.locator('.voyage-card')).to_have_count(12);mp.locator('#voyageAlbumBtn').tap();expect(mp.locator('.leisure-card')).to_have_count(5);decode_all(mp,'.leisure-card img');assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
  mp.locator('[data-photo-open="MARIE-LEISURE-02"]').tap();matches_photo(mp,album['photos'][1]);mp.wait_for_timeout(450);mp.screenshot(path=str(OUT/f'{"tablet" if width==768 else "mobile"}-photo-{width}.png'));mp.locator('#voyageDialog [data-voyage-theme]').tap();mp.locator('#voyageRelatedEntry').tap();matches_entry(mp,volume['entries'][2]);mp.locator('#voyageStoryClose').tap()
  mp.set_viewport_size({'width':height,'height':width});assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.close()
 record('768x1024 and 390x844 touch: independent photos, linked diaries, themes, landscape, reduced motion (emulated)')
 ctx.close()
 # Expected network failures stay outside clean-run HTTP results.
 failure=browser.new_context(service_workers='block');fp=failure.new_page();fp.on('pageerror',lambda e:errors.append(str(e)));fp.route('**/data/marie_leisure_gallery.json',lambda r:r.fulfill(status=503,body='unavailable'));fp.route('**/assets/marie-leisure/01_garden.webp',lambda r:r.abort());fp.goto(URL+'#diary');fp.locator('#voyageDiaryBtn').click();expect(fp.locator('.voyage-card')).to_have_count(12);fp.locator('#voyageAlbumBtn').click();expect(fp.locator('#leisureError')).to_be_visible();fp.locator('#leisureBack').click();expect(fp.locator('#voyageArchive')).to_be_visible()
 fp.unroute('**/data/marie_leisure_gallery.json');fp.locator('#voyageAlbumBtn').click();expect(fp.locator('.leisure-card')).to_have_count(5);fp.locator('[data-photo-open="MARIE-LEISURE-01"]').click();expect(fp.locator('#voyageStoryImage .voyage-image-fallback')).to_be_visible();expect(fp.locator('#voyageStoryBody')).to_contain_text(album['photos'][0]['caption']);fp.locator('#voyageRelatedEntry').click();matches_entry(fp,volume['entries'][0]);failure.close()
 record('album JSON failure preserves archive; retry and missing original-image fallback retain diary links')
 # Actual current-main v06.2 cache -> new v07, without resetting an open reader.
 server.old=True;upgrade=browser.new_context(viewport={'width':1440,'height':900});up=upgrade.new_page();wire(up);up.goto(URL);up.evaluate('navigator.serviceWorker.ready.then(()=>true)');up.reload();up.wait_for_function('navigator.serviceWorker.controller!==null');enter(up);assert up.locator('#voyageAlbumBtn').count()==0;up.locator('[data-open-entry="V001-01"]').click()
 server.old=False;up.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');up.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')");expect(up.locator('#voyageDialog')).to_be_visible();expect(up.locator('#voyageStoryTitle')).to_have_text(first['entries'][0]['title']);assert up.locator('#voyageAlbumBtn').count()==0
 up.locator('#voyageStoryClose').click();up.locator('#installBtn').click()
 with up.expect_navigation():up.locator('#pwaUpdateBtn').click()
 up.wait_for_function("caches.keys().then(k=>k.includes('marie-v07-leisure-1')&&!k.includes('marie-v06-voyage-2'))")
 record('actual v06-voyage-2 -> v07 SW keeps open reader until user approval; old cache removed')
 upgrade.set_offline(True);up.reload();enter(up);book(up,'AST2-VOYAGE-002',5)
 for e in volume['entries']:
  up.locator(f'[data-open-entry="{e["id"]}"]').click();matches_entry(up,e);up.locator('#voyageStoryClose').click()
 open_album(up);decode_all(up,'.leisure-card img')
 for photo in album['photos']:
  up.locator(f'[data-photo-open="{photo["id"]}"]').click();matches_photo(up,photo);up.locator('#voyageRelatedEntry').click();matches_entry(up,next(e for e in volume['entries'] if e['image']==photo['diary_image']));up.locator('#voyageStoryClose').click();up.locator('#voyageAlbumBtn').click()
 up.locator('#leisureBack').click();book(up,'AST2-VOYAGE-001',12)
 for e in first['entries']:
  up.locator(f'[data-open-entry="{e["id"]}"]').click();expect(up.locator('#voyageStoryTitle')).to_have_text(e['title']);up.locator('#voyageStoryImage img').evaluate('im=>im.decode()');up.locator('#voyageStoryClose').click()
 up.locator('#marieDiaryBtn').click();expect(up.locator('.diary-card')).to_have_count(10)
 record('offline after upgrade: all 002 journals, all five originals, mutual links, 001 twelve records and original ten diaries')
 up.locator('[data-panel=home]').click()
 for room in ['cockpit','garden','kitchen','workshop','engine','observatory','bedroom','cargo','corridor','lounge']:
  up.locator(f'[data-room={room}]').click();up.locator('#roomEventBtn').click();up.locator('#eventStart').click();expect(up.locator('#eventPhase')).to_have_text('플레이');up.locator('#eventBack').click();up.locator('#closeRoom').click()
 up.locator('#flightViewBtn').click();up.locator('#flightCanvas').scroll_into_view_if_needed();v=up.locator('#flightDistance').inner_text();up.wait_for_timeout(700);assert up.locator('#flightDistance').inner_text()!=v;up.locator('#manualPilotBtn').click();expect(up.locator('#flightControls')).to_be_visible();up.locator('[data-panel=route]').click();expect(up.locator('.destination')).to_have_count(3);up.locator('[data-panel=home]').click();expect(up.locator('#stats .stat')).to_have_count(6)
 record('upgraded offline app retains ten room starts, animated Auto/Manual flight, routes and resources')
 upgrade.close();browser.close()
assert not errors,errors
assert not http_errors,http_errors
record('clean-run browser exceptions and HTTP errors absent',errors=errors,http_errors=http_errors)
server.shutdown();print('Leisure browser QA passed:',OUT,flush=True)
