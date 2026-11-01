"""Shared real-browser harness for v2 gameplay steps; no production test hooks."""
import json,os,subprocess,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from datetime import datetime,timezone
from playwright.sync_api import expect
ROOT=Path(__file__).resolve().parents[1]
BASE='7581fbbcbc15fcdf87a9f17b31e539faf7046a21'
class AppServer:
 def __init__(self):
  names=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines()
  old={n:subprocess.check_output(['git','show',f'{BASE}:{n}'],cwd=ROOT) for n in names if n.endswith(('.js','.css','.html','.json','.md')) and not n.startswith(('docs/','tests/'))}
  owner=self
  class Handler(SimpleHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):
    key=self.path.split('?')[0].lstrip('/') or 'index.html'
    if owner.old and key in old:
     b=old[key];self.send_response(200);self.send_header('Content-Type',self.guess_type(key));self.send_header('Cache-Control','no-store');self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
    else:super().do_GET()
  self.old=False;self.server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));threading.Thread(target=self.server.serve_forever,daemon=True).start();self.url=f'http://127.0.0.1:{self.server.server_port}/'
 def close(self):self.server.shutdown()
class Report:
 def __init__(self,name):self.out=ROOT/'work'/name;self.out.mkdir(parents=True,exist_ok=True);self.results=[];self.errors=[]
 def wire(self,page):page.on('pageerror',lambda e:self.errors.append(str(e)))
 def passed(self,name,**data):
  self.results.append({'check':name,'status':'passed',**data});(self.out/'results.json').write_text(json.dumps(self.results,ensure_ascii=False,indent=2));print('PASS:',name,data,flush=True)
 def finish(self):assert not self.errors,self.errors;self.passed('no browser exceptions',errors=self.errors)
def browser(p):return p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
def timed_page(b,server,report,width=1440,height=900):
 ctx=b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',has_touch=width<1000,is_mobile=width<1000,service_workers='block');pg=ctx.new_page();report.wire(pg);t=datetime(2026,11,1,tzinfo=timezone.utc);pg.clock.install(time=t);pg.clock.pause_at(t);pg.goto(server.url);expect(pg.locator('#stats .stat')).to_have_count(6);return ctx,pg
def advance(pg,seconds):pg.clock.run_for(round(seconds*1000))
def snapshot(pg):return pg.evaluate("import('./game/session.js').then(({game})=>game.snapshot())")
def upgrade_and_offline(b,server,report):
 server.old=True;ctx=b.new_context(viewport={'width':1440,'height':900});pg=ctx.new_page();report.wire(pg);pg.goto(server.url);pg.evaluate('navigator.serviceWorker.ready.then(()=>true)');pg.reload();pg.locator('[data-panel=diary]').click();pg.locator('#voyageDiaryBtn').click();expect(pg.locator('.voyage-card')).to_have_count(12);pg.locator('[data-open-entry="V001-01"]').click()
 server.old=False;pg.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');pg.wait_for_function("!document.getElementById('pwaUpdateBtn').classList.contains('hidden')");expect(pg.locator('#voyageDialog')).to_be_visible();assert pg.evaluate("caches.keys().then(k=>k.includes('marie-v2-cutaway-1'))")
 pg.locator('#voyageStoryClose').click();pg.locator('#installBtn').click()
 with pg.expect_navigation():pg.locator('#pwaUpdateBtn').click()
 pg.wait_for_function("caches.keys().then(k=>!k.includes('marie-v2-cutaway-1'))")
 ctx.set_offline(True);pg.reload();pg.locator('[data-panel=diary]').click();pg.locator('#voyageDiaryBtn').click();expect(pg.locator('.voyage-card')).to_have_count(12);pg.locator('#voyageVolume').select_option('AST2-VOYAGE-002');expect(pg.locator('.voyage-card')).to_have_count(5);pg.locator('#voyageAlbumBtn').click();expect(pg.locator('.leisure-card')).to_have_count(5);pg.locator('[data-photo-open="MARIE-LEISURE-01"]').click();pg.locator('#voyageStoryImage img').evaluate('im=>im.decode()');assert pg.locator('#voyageStoryImage img').evaluate('im=>[im.naturalWidth,im.naturalHeight]')==[1448,1086];pg.locator('#voyageRelatedEntry').click();expect(pg.locator('#voyageStoryTitle')).not_to_be_empty();pg.locator('#voyageStoryClose').click();pg.locator('[data-panel=home]').click()
 report.passed('latest merged cutaway worker -> current waits for approval; 001/002 and full 4:3 photo/journal link work offline')
 return ctx,pg
def enable_survival(pg):
 pg.locator('#survivalMode').click();pg.locator('#survivalConfirm').click();expect(pg.locator('#modeLabel')).to_contain_text('생존 탐험')
def enter_lab(pg):pg.locator('[data-panel=exploration]').click();expect(pg.locator('#explorationPanel')).to_be_visible()
def run_mission(pg,kind):
 duration={'observe':8,'drone':12,'sample':14}[kind];pg.locator(f'[data-mission={kind}]').click();advance(pg,duration+2);assert snapshot(pg)['exploration']['active'] is None

def unlock_all(pg):
 pg.evaluate('Math.random=()=>.99');enter_lab(pg);pg.locator('#researchDetails>summary').click()
 run_mission(pg,'observe');run_mission(pg,'observe');pg.locator('[data-research=scanner]').click();run_mission(pg,'drone');pg.locator('[data-research=habitat]').click();run_mission(pg,'sample');run_mission(pg,'sample');pg.locator('[data-research=recycling]').click()
 assert snapshot(pg)['research']['unlocked']==['scanner','habitat','recycling']
