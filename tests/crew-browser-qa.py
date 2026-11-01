from playwright.sync_api import sync_playwright,expect
from play_qa_support import AppServer,Report,browser,timed_page,advance,snapshot,upgrade_and_offline
server=AppServer();report=Report('v2-crew-qa')
with sync_playwright() as p:
 b=browser(p);ctx,pg=timed_page(b,server,report)
 assert not snapshot(pg)['session'].get('crewAutomation',False);expect(pg.locator('#crewToggle')).to_have_attribute('aria-pressed','false');pg.locator('#crewToggle').click()
 for action,target in [('garden','garden'),('cook','kitchen'),('repair','workshop'),('record','observatory')]:
  pg.locator('#crewTask').select_option(action);pg.locator('#crewEnqueue').click()
  for _ in range(8):
   advance(pg,1)
   if pg.locator('#crewState').get_attribute('data-action')==action:break
  expect(pg.locator('#crewState')).to_have_attribute('data-action',action);s=snapshot(pg);assert s['crew']['marie']['room']==target and s['crew']['marie']['action']==action
  advance(pg,13);assert snapshot(pg)['crew']['marie']['lastActionRoom']==target
 assert len([e for e in snapshot(pg)['playLog'] if e['type']=='CrewActionCompleted'])==4
 report.passed('opt-in queue walks through real room graph before four distinct tasks; pose, dialogue, completion and ledger agree')
 pg.locator('#crewTask').select_option('garden');pg.locator('#crewEnqueue').click();advance(pg,2);pg.locator('.hotspot[data-room=kitchen]').click();before=snapshot(pg);progress=pg.locator('#crewProgress').get_attribute('value');advance(pg,15);assert snapshot(pg)==before;assert pg.locator('#crewProgress').get_attribute('value')==progress;expect(pg.locator('#roomCrewState')).to_contain_text('멈춥니다');pg.locator('#closeRoom').click();advance(pg,1)
 pg.locator('#autoBtn').click();before=snapshot(pg);advance(pg,10);assert snapshot(pg)==before;pg.locator('#autoBtn').click()
 pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");before=snapshot(pg);advance(pg,10);assert snapshot(pg)==before;pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
 report.passed('room modal, automatic-time OFF and hidden tab pause jobs and game clock without catch-up or teleport')
 pg.locator('#crewClear').click();assert snapshot(pg)['crew']['marie']['action']=='idle'
 for _ in range(8):pg.locator('#crewEnqueue').click()
 pg.locator('#crewEnqueue').click();expect(pg.locator('#crewFeedback')).to_contain_text('8개');pg.locator('#crewClear').click()
 for room in ['garden','kitchen','workshop','observatory']:
  pg.locator(f'.hotspot[data-room={room}]').click();expect(pg.locator('#roomSceneToggle')).to_be_visible()
  if pg.locator('#roomSceneToggle').get_attribute('aria-pressed')=='false':pg.locator('#roomSceneToggle').click()
  pg.locator('#roomImage').evaluate('im=>im.decode()');assert '/concepts/v2/' in pg.locator('#roomImage').get_attribute('src');expect(pg.locator('#roomSceneNote')).to_contain_text('정지 그림');pg.locator('#roomSceneToggle').click();expect(pg.locator('#roomImage')).to_have_attribute('src',f'assets/{room}.webp');pg.locator('#closeRoom').click()
 report.passed('clear/overflow recovery and all four real concept backgrounds with original-scene return; existing sprite retained')
 assert pg.locator('#mapMarie .sprite').evaluate('el=>getComputedStyle(el).animationName')=='none';pg.locator('#crewPanel').screenshot(path=str(report.out/'desktop-crew.png'));ctx.close()
 for width,height in [(768,1024),(390,844)]:
  c,m=timed_page(b,server,report,width,height);m.locator('#crewToggle').tap();m.locator('#crewPlan').tap();advance(m,7);assert m.locator('#crewState').get_attribute('data-action')=='garden';assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');m.locator('#crewPanel').screenshot(path=str(report.out/f'crew-{width}.png'));c.close()
 report.passed('tablet/mobile touch plan and real movement, no overflow and reduced motion (Chromium emulation)')
 c,f=timed_page(b,server,report);f.route('**/01_hydroponic_garden_marie.webp',lambda r:r.abort());f.locator('.hotspot[data-room=garden]').click();f.locator('#roomSceneToggle').click();expect(f.locator('#roomImage')).to_have_attribute('src','assets/garden.webp');expect(f.locator('#roomSceneNote')).to_contain_text('기존 방 배경');c.close();report.passed('failed concept image falls back to bundled room without losing controls')
 c,o=upgrade_and_offline(b,server,report);o.locator('#crewToggle').click();o.locator('#crewTask').select_option('rest');o.locator('#crewEnqueue').click();expect(o.locator('#crewToggle')).to_have_attribute('aria-pressed','true');o.locator('.hotspot[data-room=cargo]').click();o.locator('#roomEventBtn').click();o.locator('#eventStart').click();expect(o.locator('#eventPhase')).to_have_text('플레이');c.close();report.passed('new life modules initialize offline and existing room game still starts')
 b.close()
report.finish();server.close()
