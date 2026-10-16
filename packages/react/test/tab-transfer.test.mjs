import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTabTransfer, primaryTabMerge } from '../src/renderer/tab-transfer.js';
const from = [{x:90,y:12,width:144,height:48,merge:1,label:1},{x:400,y:36,width:48,height:48,merge:0,label:0},{x:460,y:36,width:48,height:48,merge:0,label:0}];
const to = [{x:400,y:36,width:48,height:48},{x:90,y:12,width:144,height:48},{x:460,y:36,width:48,height:48}];
const run = p => sampleTabTransfer(from,to,0,1,p);

test('a committed tab retires its separate pill despite shifted layout anchors',()=>{
 const button={x:20,y:0,width:144,height:48,tabbed:true};
 const panel={x:0,y:0,tab:{centerX:92,centerY:12,engaged:true,attachment:1}};
 assert.equal(primaryTabMerge(button,panel),1,'ownership must not leave a translucent independent pill over the tab');
 assert.equal(primaryTabMerge({...button,merge:.34},panel),.34,'a running handoff retains its authored merge phase');
 assert.equal(primaryTabMerge({...button,merge:0},panel),0);
 assert.equal(primaryTabMerge({...button,tabbed:false},panel),0);
 assert.equal(primaryTabMerge(button,null),0);
});
test('old tab releases before travel; incoming pill joins only on arrival',()=>{
 const released=run(.2), arriving=run(.7);
 assert.ok(released.poses[0].merge<.1);
 assert.ok(released.poses[0].x<190);
 assert.equal(released.poses[1].merge,0);
 assert.ok(arriving.poses[1].width===144);
 assert.ok(arriving.poses[1].x<110);
 assert.ok(arriving.poses[1].merge>0);
});
test('interruption starts at every live pose and ends at the new identity',()=>{
 const live=run(.42), retarget=[to[0],from[1],{...from[0],width:144,height:48}];
 const initial=sampleTabTransfer(live.poses,retarget,1,2,0,live.attachment,live.neck);
 assert.deepEqual(initial.poses,live.poses);
 assert.deepEqual(initial.neck,live.neck);
 const end=sampleTabTransfer(live.poses,retarget,1,2,1,live.attachment,live.neck);
 end.poses.forEach((p,i)=>{assert.equal(p.x,retarget[i].x);assert.equal(p.width,retarget[i].width);assert.equal(p.merge,i===2?1:0);});
 assert.equal(end.attachment,1);
 assert.deepEqual(end.neck,{pull:0,pinch:0,wobble:0});
});
test('shallow connection survives ownership transfer, with bounded pigment and attachment',()=>{
 assert.equal(run(.12).mix,0);
 assert.ok(run(.35).attachment>=.3 && run(.35).attachment<.4);
 for(let p=0;p<=1;p+=.01){const frame=run(p); assert.ok(frame.attachment>=0&&frame.attachment<=1); assert.ok(frame.mix>=0&&frame.mix<=1);frame.poses.forEach(p=>assert.ok(p.width>=44&&p.height>=40&&p.merge>=0&&p.merge<=1));}
});

test('close/reopen continues the withdrawn attachment and each live volume', async()=>{
 const { sampleTabContinuation } = await import('../src/renderer/tab-transfer.js');
 const live=run(.49);
 const closing=sampleTabContinuation(live.poses,from,null,0,live.attachment,live.neck);
 assert.deepEqual(closing.poses,live.poses);
 assert.equal(closing.attachment,live.attachment);
 assert.deepEqual(closing.neck,live.neck);
 const closed=sampleTabContinuation(live.poses,from,null,1,live.attachment,live.neck);
 assert.deepEqual(closed.neck,{pull:0,pinch:0,wobble:0});
 assert.ok(closed.poses.every(p=>p.strain===0));
 assert.equal(sampleTabContinuation(live.poses,from,null,1,live.attachment,live.neck).attachment,0);
 const reopening=sampleTabContinuation(closing.poses,to,1,0,closing.attachment,closing.neck);
 assert.deepEqual(reopening.poses,closing.poses);
 assert.equal(reopening.attachment,closing.attachment);
 assert.deepEqual(reopening.neck,closing.neck);
});

test('editing pigment mid-transfer preserves the current color and reaches the latest endpoint',async()=>{
 const {createTabPigment,sampleTabPigment}=await import('../src/renderer/tab-pigment.js');
 const state=createTabPigment('#054af3','#ffd653');
 const current=sampleTabPigment(state,'#ffd653',.5);
 assert.equal(sampleTabPigment(state,'#a8e533',.5),current);
 assert.notEqual(sampleTabPigment(state,'#a8e533',.75),current);
 assert.equal(sampleTabPigment(state,'#a8e533',1),'#a8e533');
 assert.equal(sampleTabPigment(state,'#ff784b',1),'#ff784b');
});

test('join strain pinches and recoils while settled label anchors stay fixed',()=>{
 const release=run(.18), join=run(.48), wobble=Array.from({length:39},(_,i)=>run(.62+i*.01));
 assert.ok(release.neck.pull>12 && release.neck.pinch>0);
 assert.ok(join.neck.pull>30 && join.neck.pinch>0);
 assert.ok(wobble.some(f=>f.neck.wobble>1));
 assert.ok(wobble.some(f=>f.neck.wobble<-.5));
 for(const frame of wobble) for(let i=0;i<3;i++) {
   assert.equal(frame.poses[i].x,to[i].x);
   assert.equal(frame.poses[i].y,to[i].y);
 }
 assert.deepEqual(run(1).neck,{pull:0,pinch:0,wobble:0});
});

test('pill opens as one continuous carrier, reverses from its live shape, and closes exactly', async()=>{
 const {sampleWindowMorph}=await import('../src/renderer/tab-transfer.js');
 assert.equal(typeof sampleWindowMorph,'function');
 const pill={x:600,y:360,width:180,height:90,radius:45,openness:0,attachment:0,neck:{pull:0,pinch:0,wobble:0}};
 const window={x:600,y:600,width:580,height:480,radius:30,openness:1,attachment:1,neck:{pull:0,pinch:0,wobble:0}};
 assert.deepEqual(sampleWindowMorph(pill,window,0,true).shell,pill);
 const live=sampleWindowMorph(pill,window,.48,true);
 assert.ok(live.shell.width>pill.width && live.shell.height<window.height);
 assert.ok(live.shell.neck.pull>0 && live.shell.neck.pinch>0);
 assert.deepEqual(sampleWindowMorph(live.shell,pill,0,false).shell,live.shell);
 assert.deepEqual(sampleWindowMorph(live.shell,pill,1,false).shell,pill);
 assert.deepEqual(sampleWindowMorph(pill,window,1,true).shell,window);
 assert.equal(sampleWindowMorph(window,pill,.18,false).contentOpacity,0);
 assert.equal(sampleWindowMorph(pill,window,.3,true).contentOpacity,0);
 for(let p=0;p<=1;p+=.01){
   const f=sampleWindowMorph(live.shell,pill,p,false);
   assert.ok(f.shell.width>=44 && f.shell.height>=44);
   assert.ok(f.shell.openness>=0 && f.shell.openness<=1);
   assert.ok(Object.values(f.shell.neck).every(Number.isFinite));
 }
});

test('reversing a partially revealed reading film never flashes or blanks the content', async()=>{
 const {sampleWindowMorph}=await import('../src/renderer/tab-transfer.js');
 const pill={x:200,y:150,width:180,height:90,radius:45,openness:0,attachment:0,neck:{pull:0,pinch:0,wobble:0}};
 const window={...pill,width:580,height:480,radius:30,openness:1,attachment:1};
 const opening=sampleWindowMorph(pill,window,.3,true);
 assert.equal(opening.contentOpacity,0);
 assert.equal(sampleWindowMorph(opening.shell,pill,0,false,opening.contentOpacity).contentOpacity,0);
 const closing=sampleWindowMorph(window,pill,.06,false);
 assert.ok(closing.contentOpacity>0 && closing.contentOpacity<1);
 assert.equal(sampleWindowMorph(closing.shell,window,0,true,closing.contentOpacity).contentOpacity,closing.contentOpacity);
 assert.equal(sampleWindowMorph(closing.shell,window,1,true,closing.contentOpacity).contentOpacity,1);
});


test('closing eases away from the window without a held frame or a fast initial collapse', async () => {
  const { sampleWindowMorph } = await import('../src/renderer/tab-transfer.js');
  const window = { x: 300, y: 500, width: 580, height: 500, radius: 30, openness: 1, attachment: 1, neck: {} };
  const pill = { x: 300, y: 260, width: 92, height: 92, radius: 46, openness: 0, attachment: 0, neck: {} };
  const early = sampleWindowMorph(window, pill, .10, false).shell;
  assert.ok(early.width < 580, 'withdrawal responds before the old 14 percent hold');
  assert.ok(early.width > 555, 'initial withdrawal is gentle, not an ease-out lurch');
  const middle = sampleWindowMorph(window, pill, .5, false).shell;
  assert.ok(middle.width > 180 && middle.width < 430, 'volume keeps gathering through the middle');
  const frames = Array.from({ length: 101 }, (_, i) => sampleWindowMorph(window, pill, i / 100, false));
  frames.slice(1).forEach((frame, i) => assert.ok(frame.shell.width <= frames[i].shell.width));
  assert.ok(frames[100].shell.width - frames[99].shell.width > -1, 'no final geometric snap');
});
