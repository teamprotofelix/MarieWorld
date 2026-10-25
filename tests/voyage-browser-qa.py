"""Voyage archive/reader, themes, mobile, errors and real v05 -> v06 PWA QA.
Python Playwright + Chromium. Starts an isolated localhost server; no production hooks.
"""
import json,os,subprocess,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('MARIE_VOYAGE_QA_OUTPUT',str(ROOT/'work'/'voyage-qa')));OUT.mkdir(parents=True,exist_ok=True)
# Merged room-events baseline.
BASE=subprocess.check_output(['git','rev-parse','1596e47'],cwd=ROOT,text=True).strip()
names=subprocess.check_output(['git','ls-tree','--name-only',BASE],cwd=ROOT,text=True).splitlines()
OLD={n:subprocess.check_output(['git','show',f'{BASE}:{n}'],cwd=ROOT) for n in names if n.endswith(('.html','.js','.css'))}
story=json.loads((ROOT/'data/voyage_entries.json').read_text());reg=json.loads((ROOT/'data/voyage_collections.json').read_text())
app=(ROOT/'app.js').read_text();literal=app[app.index('const MARIE_DIARIES='):app.index('\nfunction renderDiary')].split('=',1)[1].strip().rstrip(';');diaries=json.loads(literal)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  key=self.path.split('?')[0].lstrip('/') or 'index.html'
  if self.server.old and key in OLD:
   b=OLD[key];self.send_response(200);self.send_header('Content-Type',self.guess_type(key));self.send_header('Cache-Control','no-store');self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));server.old=False
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/'
results=[];errors=[];bad_http=[];requests=[]
def wire(pg):
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('response',lambda r:bad_http.append((r.status,r.url)) if r.status>=400 else None)
 pg.on('request',lambda r:requests.append(r.url))
def record(name,**details):
 results.append({'check':name,'status':'passed',**details});(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',name,details or '',flush=True)
def enter(pg):
 pg.locator('[data-panel=diary]').click();pg.locator('#voyageDiaryBtn').click();expect(pg.locator('.voyage-card')).to_have_count(12)
def overflow(pg):assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
def reader_matches(pg,e):
 expect(pg.locator('#voyageStoryTitle')).to_have_text(e['title']);expect(pg.locator('#voyageStoryMeta')).to_contain_text(('대략 ' if e['scene_time_is_approximate'] else '')+e['time'])
 parts=pg.locator('#voyageStoryBody p').all_text_contents();assert '\n\n'.join(parts)==e['body']
 expect(pg.locator('#voyageStoryImage img')).to_have_attribute('alt',e['alt']);pg.wait_for_function("document.querySelector('#voyageStoryImage img').naturalWidth>0")
 assert pg.locator('.voyage-inner').inner_text().startswith('(')
def contrast(pg):
 colors=pg.evaluate("[getComputedStyle(document.querySelector('.voyage-paragraph')).color,getComputedStyle(document.getElementById('voyageDialog')).backgroundColor]")
 import re
 def luminance(rgb):
  c=[int(x)/255 for x in re.findall(r'\d+',rgb)[:3]];c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c];return .2126*c[0]+.7152*c[1]+.0722*c[2]
 a,b=sorted(map(luminance,colors));return (b+.05)/(a+.05)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':900},color_scheme='dark',permissions=['clipboard-read','clipboard-write'])
 page=ctx.new_page();wire(page);page.goto(URL+'#diary');page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.reload()
 expect(page.locator('#marieDiaryCollection')).to_be_visible();expect(page.locator('#voyageCollection')).to_be_hidden()
 assert page.locator('.diary-card h3').all_text_contents()==[d['title'] for d in reversed(diaries)]
 assert page.locator('.diary-body').all_text_contents()==[d['body'] for d in reversed(diaries)]
 page.locator('#voyageDiaryBtn').focus();page.keyboard.press('Enter');expect(page.locator('.voyage-card')).to_have_count(12)
 assert page.locator('.voyage-card').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.entryId)')==[e['id'] for e in story['entries']]
 expect(page.locator('#diaryCount')).to_contain_text('12편');expect(page.locator('#voyageCollection')).to_have_attribute('data-reader-theme','dark')
 assert '나는 원래 인간' not in page.locator('#voyageCollection').inner_text()
 page.locator('#voyageCover').scroll_into_view_if_needed();page.wait_for_timeout(350);page.screenshot(path=str(OUT/'desktop-archive-1440-dark.png'))
 record('legacy 10 diary texts/order unchanged; keyboard selection opens separate 12-entry archive')
 for e in story['entries']:
  button=page.locator(f'[data-open-entry="{e["id"]}"]');button.click();reader_matches(page,e)
  for _ in range(6):page.keyboard.press('Tab');assert page.evaluate("document.activeElement.closest('#voyageDialog')!==null")
  page.keyboard.press('Escape');expect(page.locator('#voyageDialog')).not_to_be_visible()
  assert page.evaluate('document.activeElement.dataset.openEntry')==e['id'];assert page.evaluate('document.body.style.overflow')==''
 record('all 12 detail titles, clocks, complete body, dialogue then inner thought; focus trap and Escape return')
 page.locator('[data-open-entry="V001-01"]').click();expect(page.locator('#voyagePrevious')).to_be_disabled()
 for _ in range(11):page.locator('#voyageNext').click()
 expect(page.locator('#voyageNext')).to_be_disabled();expect(page.locator('#voyageStoryPosition')).to_have_text('12 / 12');expect(page.locator('#voyageStoryMeta')).to_contain_text('대략 14:35')
 page.locator('#voyagePrevious').click();expect(page.locator('#voyageStoryTitle')).to_have_text(story['entries'][10]['title'])
 page.locator('#voyageStoryClose').click()
 # Cover + twelve record illustrations + three optional illustrations use every supplied image.
 page.locator('.voyage-extra>summary').click()
 for image in page.locator('#voyageCollection img').all():image.scroll_into_view_if_needed();image.evaluate("im=>im.decode()")
 assert page.locator('#voyageCollection img').count()==16
 record('previous/next bounds and all 16 illustrated scenes decode with alt text')
 page.locator('.voyage-snapshot>summary').click();fixed=page.locator('#voyageSnapshotValues').inner_text()
 expect(page.locator('#voyageSnapshotMeta')).to_contain_text('고정 스냅샷');expect(page.locator('#voyageUnknowns')).to_contain_text('미확정')
 page.locator('[data-panel=home]').click();page.locator('#jumpBtn').click();page.locator('#speedBtn').click();page.locator('[data-panel=diary]').click()
 assert page.locator('#voyageSnapshotValues').inner_text()==fixed;expect(page.locator('#diaryCount')).to_contain_text('12편')
 page.locator('.voyage-memory>summary').click();page.locator('#voyageCopyMemory').click();expect(page.locator('#voyageCopyStatus')).to_contain_text('복사했습니다')
 clipboard=page.evaluate('navigator.clipboard.readText()');assert '고정된 저장 스냅샷' in clipboard and '미확정' in clipboard and '자동으로 저장·동기화되지 않습니다' in clipboard
 page.locator('.voyage-canon>summary').click()
 with page.expect_download() as pending:page.locator('#voyageCanonLink').click()
 download=pending.value;download.save_as(OUT/'CANON_MEMORY.download.md');assert (OUT/'CANON_MEMORY.download.md').read_bytes()==(ROOT/'data/CANON_MEMORY.md').read_bytes()
 record('snapshot remains fixed after live travel; copy and opt-in canon download; no automatic sync claim')
 page.locator('[data-open-entry="V001-04"]').click();reader_matches(page,story['entries'][3]);dark_ratio=contrast(page);assert dark_ratio>=4.5
 page.screenshot(path=str(OUT/'desktop-reader-1440-dark.png'));page.locator('#voyageDialog [data-voyage-theme]').click();expect(page.locator('#voyageDialog')).to_have_attribute('data-reader-theme','light');light_ratio=contrast(page);assert light_ratio>=4.5
 page.screenshot(path=str(OUT/'desktop-reader-1440-light.png'));page.locator('#voyageStoryClose').click();expect(page.locator('#voyageCollection')).to_have_attribute('data-reader-theme','light')
 record('scoped dark/light reader themes and text contrast',dark_text_contrast=round(dark_ratio,2),light_text_contrast=round(light_ratio,2))
 for i in range(12):
  page.locator(f'[data-open-entry="V001-{i%12+1:02}"]').click();page.locator('#voyageStoryClose').click()
 expect(page.locator('#voyageDialog')).not_to_be_visible();assert page.evaluate('document.body.style.overflow')==''
 page.locator('#marieDiaryBtn').click();expect(page.locator('#diaryCount')).to_contain_text('10편');expect(page.locator('#marieDiaryCollection')).to_be_visible()
 record('12 repeated open/close cycles release focus/scroll; return to original 10 diaries')
 for width,height in [(768,1024),(390,844)]:
  mobile=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=2,color_scheme='light',reduced_motion='reduce');mp=mobile.new_page();wire(mp);mp.goto(URL+'#diary');mp.locator('#voyageDiaryBtn').tap();expect(mp.locator('.voyage-card')).to_have_count(12);overflow(mp)
  expect(mp.locator('#voyageCollection')).to_have_attribute('data-reader-theme','light')
  mp.locator('[data-open-entry="V001-03"]').tap();reader_matches(mp,story['entries'][2]);overflow(mp)
  mp.wait_for_timeout(400);mp.screenshot(path=str(OUT/f'{"tablet" if width==768 else "mobile"}-reader-{width}-light.png'))
  assert mp.locator('#voyageStoryClose').bounding_box()['height']>=44
  mp.locator('#voyageDialog [data-voyage-theme]').tap();expect(mp.locator('#voyageDialog')).to_have_attribute('data-reader-theme','dark');mp.locator('#voyageStoryClose').tap()
  assert mp.evaluate('document.activeElement.dataset.openEntry')=='V001-03'
  mp.set_viewport_size({'width':height,'height':width});overflow(mp);mobile.close()
 record('768x1024 tablet and 390x844 mobile: touch, theme, focus return, landscape and reduced motion (emulated)')
 ctx.close()
 # Errors are expected and kept separate from clean-run HTTP/console results.
 failure=browser.new_context(service_workers='block');fp=failure.new_page();fp.on('pageerror',lambda e:errors.append(str(e)))
 fp.route('**/data/voyage_collections.json',lambda route:route.fulfill(status=503,body='unavailable'));fp.route('**/assets/voyage-001/01_launch.webp',lambda route:route.abort());fp.goto(URL+'#diary');fp.locator('#voyageDiaryBtn').click();expect(fp.locator('#voyageError')).to_be_visible();fp.unroute('**/data/voyage_collections.json');fp.locator('#voyageRetry').click();expect(fp.locator('.voyage-card')).to_have_count(12)
 fp.locator('[data-open-entry="V001-01"]').click();expect(fp.locator('#voyageStoryImage .voyage-image-fallback')).to_be_visible();expect(fp.locator('#voyageStoryBody')).to_contain_text('출항');fp.locator('#voyageStoryClose').click();fp.locator('.voyage-memory>summary').click();fp.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}})");fp.locator('#voyageCopyMemory').click();expect(fp.locator('#voyageCopyStatus')).to_contain_text('요약을 선택했습니다');assert fp.evaluate('getSelection().toString().length')>20;failure.close()
 record('JSON retry, missing-image fallback and clipboard-denial text selection')
 # Actual cached v05 -> v06 update while an old room game remains open.
 server.old=True;upgrade=browser.new_context(viewport={'width':1440,'height':900});up=upgrade.new_page();wire(up);up.goto(URL);up.evaluate('navigator.serviceWorker.ready.then(()=>true)');up.reload();up.wait_for_function('navigator.serviceWorker.controller!==null')
 assert up.locator('#voyageDiaryBtn').count()==0
 up.locator('[data-room=workshop]').click();up.locator('#roomEventBtn').click();up.locator('#eventStart').click();up.locator('[data-action=head][data-value="2"]').click()
 server.old=False;up.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');up.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')")
 expect(up.locator('#eventPhase')).to_have_text('플레이');expect(up.locator('.robot-head')).to_contain_text('⌁');assert up.locator('#voyageDiaryBtn').count()==0
 up.locator('#eventBack').click();up.locator('#closeRoom').click();up.locator('#installBtn').click()
 with up.expect_navigation():up.locator('#pwaUpdateBtn').click()
 up.wait_for_function("caches.keys().then(k=>k.includes('marie-v06-voyage-1')&&!k.includes('marie-v05-rooms-1'))")
 expect(up.locator('#voyageDiaryBtn')).to_have_count(1);enter(up)
 record('real v05 -> v06 SW waits for consent without resetting active room game; old cache removed after approval')
 upgrade.set_offline(True);up.reload();enter(up)
 for e in story['entries']:
  up.locator(f'[data-open-entry="{e["id"]}"]').click();reader_matches(up,e);up.locator('#voyageStoryClose').click()
 up.locator('.voyage-extra>summary').click()
 for image in up.locator('#voyageCollection img').all():image.scroll_into_view_if_needed();image.evaluate('im=>im.decode()')
 up.locator('#marieDiaryBtn').click();expect(up.locator('.diary-card')).to_have_count(10);up.locator('.diary-details summary').first.click();expect(up.locator('.diary-body').first).to_be_visible()
 record('offline reload after upgrade: 12 complete new records, 16 images and all 10 original diaries')
 # Existing room entry, flight, route and resources also work in the upgraded offline app.
 up.locator('[data-panel=home]').click()
 for room in ['cockpit','garden','kitchen','workshop','engine','observatory','bedroom','cargo','corridor','lounge']:
  up.locator(f'[data-room={room}]').click();up.locator('#roomEventBtn').click();up.locator('#eventStart').click();expect(up.locator('#eventPhase')).to_have_text('플레이');up.locator('#eventBack').click();up.locator('#closeRoom').click()
 up.locator('#flightViewBtn').click();up.locator('#flightCanvas').scroll_into_view_if_needed();initial=up.locator('#flightDistance').inner_text();up.wait_for_timeout(700);assert up.locator('#flightDistance').inner_text()!=initial
 up.locator('#manualPilotBtn').click();expect(up.locator('#flightControls')).to_be_visible();up.locator('[data-panel=route]').click();expect(up.locator('.destination')).to_have_count(3);up.locator('[data-panel=home]').click();expect(up.locator('#stats .stat')).to_have_count(6)
 record('upgraded offline app retains ten room events, animated Auto/Manual flight, route map and six resources')
 upgrade.close();browser.close()
assert not errors,errors
assert not bad_http,bad_http
assert not any('/reference/' in url for url in requests)
record('clean-run browser exceptions/HTTP errors absent; no reference-board requests',errors=errors,http_errors=bad_http)
server.shutdown();print('Voyage browser QA passed:',OUT,flush=True)
