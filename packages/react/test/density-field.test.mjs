import test from 'node:test';
import assert from 'node:assert/strict';
import { densityFieldProfile, densityClearing, densityPresentation, densityAttenuation, densityBackgroundTransmission, densityColorWeight, stepDensitySettle } from '../src/renderer/density-field.js';
import { MOTION, sampleBezier } from '../src/renderer/motion.js';

test('a shared density region is a filled mass with a quiet plateau and soft shoulders', () => {
 const region={width:400,height:220,amount:1};
 const center=densityFieldProfile(0,0,region), edge=densityFieldProfile(200,0,region), outside=densityFieldProfile(240,0,region);
 assert.ok(center.height > edge.height, 'the mass fills the reading area instead of forming a hollow rim');
 assert.ok(center.height >= 3 && center.height <= 7);
 assert.ok(center.dx === 0 && center.dy === 0);
 let previous = center.height;
 for (let x=0;x<=240;x+=2) {
  const height=densityFieldProfile(x,0,region).height;
  assert.ok(height <= previous + 1e-8, 'no annular peak: density falls continuously toward the outside');
  previous=height;
 }
 assert.ok(Object.values(outside).every(value => value === 0));
 assert.ok(center.pigment <= .2, 'the filled center retains its pigment rather than clearing to white');
 assert.equal(densityFieldProfile(0,0,{...region,amount:0}).height,0);
 for (const x of [178,190,200,210,218]) {
  const p=densityFieldProfile(x,0,region), left=densityFieldProfile(x-.001,0,region), right=densityFieldProfile(x+.001,0,region);
  assert.ok(Math.abs(p.dx-(right.height-left.height)/.002)<.001, 'lighting normals follow the actual thickness gradient');
  assert.ok(Number.isFinite(p.dx)&&p.height>=0&&p.height<=5);
 }
 const inside=densityFieldProfile(223.999,0,region), seam=densityFieldProfile(224,0,region);
 assert.ok(Math.abs(inside.height-seam.height)<.0001);
 assert.ok(Math.abs(inside.dx)<.0001);
});

test('density clearing leaves every parent color unchanged at zero concentration', () => {
 for (const origin of [[0,0,0], [1,0,0], [.001,.2,.9], [1,1,1]]) {
  assert.deepEqual(densityClearing(origin, origin), [0,0,0]);
  const delta = densityClearing(origin, [.9,.95,1]);
  assert.ok(delta.every(Number.isFinite));
  assert.deepEqual(origin.map((value, i) => Math.round((value+delta[i])*100)), [90,95,100]);
 }
});


test('gathering draws from the surrounding film and melting returns it without moving the reading plateau', () => {
 const region={width:400,height:220};
 const gathering={...region,...densityPresentation(.6, 1)};
 const melting={...region,...densityPresentation(.6, -1)};
 assert.equal(densityFieldProfile(0,0,gathering).height,densityFieldProfile(0,0,melting).height);
 assert.ok(densityFieldProfile(220,0,gathering).height < 0, 'the surrounding film lends material during gathering');
 assert.ok(densityFieldProfile(220,0,melting).height > 0, 'the surrounding film receives material during melting');
 assert.equal(densityPresentation(1,.2).flow,0, 'settled geometry has no residual flow');
 assert.equal(densityPresentation(0,-.2).flow,0);
 const resting={...region,...densityPresentation(1,0)};
 assert.equal(densityFieldProfile(240,0,resting).height,0);
 assert.ok(resting.edge < densityPresentation(0,0).edge, 'the settled dense shoulder is clearer');
 for (const x of [190,200,210,220,230,250]) {
  const p=densityFieldProfile(x,0,gathering);
  const numerical=(densityFieldProfile(x+.001,0,gathering).height-densityFieldProfile(x-.001,0,gathering).height)/.002;
  assert.ok(Math.abs(p.dx-numerical)<.001, 'draw/melt lighting follows the shared height derivative');
 }
});


test('the filled interior carries the strongest absorption instead of an outline', () => {
 assert.equal(densityAttenuation(0,1),1);
 assert.equal(densityAttenuation(0,0),1);
 let previous=1;
 for(let coverage=0;coverage<=1;coverage+=.01) {
  const attenuation=densityAttenuation(.12*coverage*coverage,1);
  assert.ok(attenuation<=previous+1e-10, 'absorption grows across the entire mass, without an annular maximum');
  assert.ok(attenuation>.4, 'reading area remains transmitting');
  previous=attenuation;
 }
 assert.ok(densityAttenuation(.12,1)<densityAttenuation(.03,1));
});


test('a dense reading region filters background artifacts while leaving the surrounding film intact', () => {
 assert.equal(densityBackgroundTransmission(0),1);
 assert.equal(densityBackgroundTransmission(-.1),1);
 let previous=1;
 for(let c=0;c<=.12;c+=.001) {
  const transmitted=densityBackgroundTransmission(c);
  assert.ok(transmitted<=previous && transmitted>=.15);
  previous=transmitted;
 }
 assert.ok(densityBackgroundTransmission(.1056)<.25, 'the open plateau quiets most background silhouettes');
 assert.ok(densityPresentation(1,0).edge<=8, 'a settled density shoulder is defined rather than broadly blurred');
});


test('the interior has a broad continuous optical crown as well as a clear shoulder', () => {
 const region={width:400,height:220,amount:1,edge:7};
 const center=densityFieldProfile(0,0,region), inner=densityFieldProfile(70,35,region);
 assert.ok(center.height>5 && center.height<7, 'the whole reading area has more material than a thin film');
 assert.ok(inner.height>4 && inner.height<center.height);
 assert.ok(inner.dx<0 && inner.dy<0, 'the interior itself carries broad lighting, not only a boundary highlight');
 for(const [x,y] of [[70,35],[150,50],[193,25],[205,30]]) {
  const actual=densityFieldProfile(x,y,region);
  const dx=(densityFieldProfile(x+.001,y,region).height-densityFieldProfile(x-.001,y,region).height)/.002;
  const dy=(densityFieldProfile(x,y+.001,region).height-densityFieldProfile(x,y-.001,region).height)/.002;
  assert.ok(Math.abs(dx-actual.dx)<.001 && Math.abs(dy-actual.dy)<.001, 'material highlights match the actual whole-area relief');
 }
});


test('full density reaches its neutral material pigment, including dark parent colors', () => {
 assert.equal(densityColorWeight(0),0);
 assert.equal(densityColorWeight(.12),1);
 assert.equal(densityColorWeight(.24),1);
 assert.ok(densityColorWeight(.1056)>.85, 'open interior owns a neutral body rather than inheriting the dark parent film');
});

test('a nested folder keeps a filled tab joined to its body, with analytic lighting normals', () => {
 const region={width:480,height:240,amount:.88,edge:5,fold:1,folder:true};
 // Positive Y is the top of the parent optical field.
 assert.ok(densityFieldProfile(-145,108,region).height>2, 'left tab retains substance');
 assert.equal(densityFieldProfile(150,115,region).pigment,0, 'right top retracts below the tab');
 assert.ok(densityFieldProfile(150,70,region).height>2, 'body remains filled below shoulder');
 for(const [x,y] of [[-35,108],[-20,100],[0,98],[210,60],[-215,100]]) {
  const p=densityFieldProfile(x,y,region);
  const dx=(densityFieldProfile(x+.001,y,region).height-densityFieldProfile(x-.001,y,region).height)/.002;
  const dy=(densityFieldProfile(x,y+.001,region).height-densityFieldProfile(x,y-.001,region).height)/.002;
  assert.ok(Math.abs(p.dx-dx)<.002&&Math.abs(p.dy-dy)<.002, 'folder shoulder highlights follow its material gradient');
 }
 const closed=densityPresentation(0,0);
 assert.ok(closed.amount>=.55&&closed.edge<=8, 'closed disclosure has a clear-water material body');
});


test('folder gathering remains continuous at intermediate phases and has finite support', () => {
 for(const fold of [0,.001,.3,.7,1]) {
  const region={width:280,height:180,amount:.94,edge:5,fold,folder:true,flow:.5};
  for(const [x,y] of [[-35,60],[15,65],[120,50],[-130,70]]) {
   const p=densityFieldProfile(x,y,region);
   const dx=(densityFieldProfile(x+.001,y,region).height-densityFieldProfile(x-.001,y,region).height)/.002;
   const dy=(densityFieldProfile(x,y+.001,region).height-densityFieldProfile(x,y-.001,region).height)/.002;
   assert.ok(Math.abs(dx-p.dx)<.002&&Math.abs(dy-p.dy)<.002);
   assert.ok(Object.values(p).every(Number.isFinite));
  }
  assert.deepEqual(densityFieldProfile(300,0,region),{height:0,dx:0,dy:0,pigment:0});
 }
 const point=[110,70], a=densityFieldProfile(...point,{width:280,height:180,fold:0,folder:true}).height;
 const b=densityFieldProfile(...point,{width:280,height:180,fold:.00001,folder:true}).height;
 assert.ok(Math.abs(a-b)<.001, 'entering the folder shape does not snap its material');
});

test('the compact disclosure grows from a fixed44px tab without a left-edge bulge', () => {
 const region={width:480,height:240,amount:.94,edge:5,folder:true};
 const closed={...region,fold:0};
 assert.ok(densityFieldProfile(-140,98,closed).height>2, 'the fixed top-left handle has material');
 assert.equal(densityFieldProfile(80,98,closed).pigment,0, 'closed state is the compact handle, not a full-width pill');
 assert.equal(densityFieldProfile(-140,0,closed).pigment,0, 'the closed mass does not fill the future content');
 for(let down=24;down<=100;down+=2) {
  const edge=densityFieldProfile(-240,120-down,{...region,fold:1});
  assert.ok(edge.pigment<=.12*.25*.94+1e-7, 'the blend cannot push the shared left edge outward');
 }
});

test('a half-open folder stretches a filled lobe from its pill instead of cutting across it', () => {
 const region={width:480,height:240,amount:.94,edge:5,folder:true,fold:.5};
 // A halfway reach must already carry real volume beyond the original handle.
 // Blending the two signed-distance fields cuts this connected lobe away.
 assert.ok(densityFieldProfile(80,50,region).height>2, 'the advancing lobe remains filled, not a diagonal fold');
 assert.ok(densityFieldProfile(-140,98,region).height>2, 'the anchored handle retains its substance');
});

test('gathering into the pill recoils both ways, then rests without a residual deformation', () => {
 let state=stepDensitySettle(null,1,0), after=[];
 for(let frame=1;frame<=120;frame++) {
  const elapsed=frame/60, phase=1-sampleBezier(MOTION.withdraw,Math.min(1,elapsed/(MOTION.densityMelt/1000)));
  state=stepDensitySettle(state,phase,1/60);
  assert.ok(Math.abs(state.strain)<=1 && Number.isFinite(state.velocity));
  if(elapsed>MOTION.densityMelt/1000) after.push(state.strain);
 }
 assert.ok(Math.min(...after)<-.02 && Math.max(...after)>.02, 'closed material compresses and rebounds instead of stopping dead');
 assert.equal(state.strain,0); assert.equal(state.velocity,0);
 const still=stepDensitySettle(state,0,1/60);
 assert.equal(still.strain,0, 'no idle jiggle after settling');
 const reduced=stepDensitySettle({phase:.1,strain:.7,velocity:8},0,1/60,true);
 assert.deepEqual(reduced,{phase:0,strain:0,velocity:0});
});

test('recoil keeps its current momentum on reversal and lighting follows the strained mass', () => {
 let state=stepDensitySettle(null,1,0);
 for(let i=1;i<=20;i++) state=stepDensitySettle(state,1-i/25,1/60);
 const before={...state};
 assert.deepEqual(stepDensitySettle(state,.3,0),before, 'retargeting does not erase the live strain/velocity');
 const reversed=stepDensitySettle(state,.3,1/120);
 assert.ok(reversed.strain!==0 && Number.isFinite(reversed.velocity));
 for(const fold of [0,.5,1]) for(const jiggle of [-.7,.7]) {
  const region={width:480,height:240,amount:.94,edge:5,folder:true,fold,jiggle};
  for(const [x,y] of [[-45,100],[40,60],[-220,95]]) {
   const actual=densityFieldProfile(x,y,region);
   const dx=(densityFieldProfile(x+.001,y,region).height-densityFieldProfile(x-.001,y,region).height)/.002;
   const dy=(densityFieldProfile(x,y+.001,region).height-densityFieldProfile(x,y-.001,region).height)/.002;
   assert.ok(Math.abs(actual.dx-dx)<.002 && Math.abs(actual.dy-dy)<.002, 'highlights follow the recoil volume');
  }
 }
});
