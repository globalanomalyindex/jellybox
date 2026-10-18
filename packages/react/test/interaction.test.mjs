import { stepAttraction, MOTION } from '../src/renderer/motion.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { assistTarget, scrubRange, advanceScrub, scrollFrame, rangePointValue, rangeTravelValue, rangeDragValue } from '../src/interaction.js';
import { sliderHoverTarget } from '../src/interaction.js';

test('slider hover belongs to the round bulb or value bubble, never the rail, label or row gap', () => {
 const bounds = { thumb: { left: 100, top: 200, width: 28, height: 28 }, value: { left: 260, top: 192, width: 58, height: 44 } };
 assert.equal(sliderHoverTarget({ x: 114, y: 214 }, bounds), 'thumb');
 assert.equal(sliderHoverTarget({ x: 289, y: 214 }, bounds), 'value');
 assert.equal(sliderHoverTarget({ x: 180, y: 214 }, bounds), null, 'an empty part of the rail is not a hover zone');
 assert.equal(sliderHoverTarget({ x: 180, y: 214 }, { ...bounds, thumb: { ...bounds.thumb, left: 166 } }), 'thumb', 'moving the bulb under a stationary pointer changes its actual hover zone');
 assert.equal(sliderHoverTarget({ x: 50, y: 214 }, bounds), null, 'the label does not wake the material');
 assert.equal(sliderHoverTarget({ x: 250, y: 214 }, bounds), null, 'the gap before the value stays quiet');
 assert.equal(sliderHoverTarget({ x: 101, y: 201 }, bounds), null, 'the bulb hit follows its round surface, not its bounding corner');
 assert.equal(sliderHoverTarget({ x: 261, y: 193 }, bounds), null, 'the value bubble keeps its rounded ends');
 assert.equal(sliderHoverTarget({ x: 114, y: 214 }, { thumb: { ...bounds.thumb, width: 0 } }), null);
 assert.equal(sliderHoverTarget({ x: NaN, y: 214 }, bounds), null);
});

test('pointer assistance selects one nearby eligible target and never follows a distant pointer', () => {
 const boxes=[{x:0,y:0,width:44,height:44},{x:60,y:0,width:44,height:44}];
 assert.equal(assistTarget(boxes,{x:50,y:20}).index,0);
 assert.equal(assistTarget(boxes,{x:58,y:20}).index,1);
 assert.equal(assistTarget(boxes,{x:500,y:20}),null);
 assert.equal(assistTarget([{...boxes[0],disabled:true}],{x:20,y:20}),null);
 const thumb=assistTarget([{x:0,y:0,width:28,height:28,assistLimit:5}],{x:24,y:14}); assert.ok(thumb.x>0 && thumb.x<=5);
 const a=assistTarget(boxes,{x:50,y:20});assert.ok(Math.hypot(a.x,a.y)<=3);
});
test('scrubbing clamps, respect direction, step, and fine adjustment', () => {
 assert.equal(scrubRange(50,20,{min:0,max:100,step:1}),60);
 assert.equal(scrubRange(50,20,{min:0,max:100,step:1,fine:true}),51);
 assert.equal(scrubRange(99,80,{min:0,max:100,step:1}),100);
 assert.equal(scrubRange(.2,20,{min:0,max:1,step:.01}),.3);
});
test('document-attached canvas holds its anchor during ordinary scrolling and covers each rebase', () => {
 const first=scrollFrame(null,300,720);
 const next=scrollFrame(first,330,720);
 assert.equal(next.top,first.top);
 for(const y of [0,100,450,900,2500]){
  const f=scrollFrame(next,y,720);assert.ok(f.top<=y);assert.ok(f.top+f.height>=y+720);
  const docY=500,screenY=docY-f.top+(f.top-y);assert.equal(screenY,docY-y);
 }
 assert.ok(first.height<=720+320);
});

test('changing scrub precision re-anchors without a value jump and keeps its cancellation origin', () => {
 const range = {min:0,max:100,step:1};
 let gesture = {x:0,value:50,current:50,origin:50,fine:false};
 gesture = advanceScrub(gesture,20,false,range); assert.equal(gesture.current,60);
 gesture = advanceScrub(gesture,22,true,range); assert.equal(gesture.current,60);
 gesture = advanceScrub(gesture,42,true,range); assert.equal(gesture.current,61);
 gesture = advanceScrub(gesture,44,false,range); assert.equal(gesture.current,61);
 gesture = advanceScrub(gesture,64,false,range); assert.equal(gesture.current,71);
 assert.equal(gesture.origin,50);
});


test('material attraction waits for the local rise, releases continuously and resets for a new target', () => {
 const body={};
 assert.equal(stepAttraction(body,true,0),0);
 assert.equal(stepAttraction(body,true,(MOTION.magnetRise-1)/1000),0);
 const partial=stepAttraction(body,true,.05);
 assert.ok(partial>0 && partial<1);
 assert.equal(stepAttraction(body,true,1),1);
 const released=stepAttraction(body,false,.03);
 assert.ok(released>0 && released<1);
 assert.equal(stepAttraction(body,false,1),0);
 assert.equal(stepAttraction(body,true,.02),0);
 assert.equal(stepAttraction(body,true,1,{disabled:true}),0);
 assert.equal(stepAttraction(body,true,.02),0, 're-enabled movement begins with a rise rather than a jump');
});

test('a rail click maps to the native thumb endpoints, including RTL and fractional steps', () => {
 const range={left:100,width:128,min:0,max:1,step:.05};
 assert.equal(rangePointValue(114,range),0);
 assert.equal(rangePointValue(214,range),1);
 assert.equal(rangePointValue(167,range),.55);
 assert.equal(rangePointValue(167,{...range,rtl:true}),.45);
 assert.equal(rangePointValue(-200,range),0);
 assert.equal(rangePointValue(500,range),1);
 assert.equal(rangePointValue(500,{...range,min:0,max:11,step:3}),9,'an unaligned maximum still lands on a native-valid step');
});

test('click travel supplies one bounded, stepped value for every native/display/material sample', () => {
 const range={min:0,max:100,step:1};
 const samples=Array.from({length:17},(_,i)=>rangeTravelValue(10,90,i*16,range));
 assert.equal(samples[0],10);
 assert.ok(samples[1]>10 && samples[1]<90);
 assert.ok(samples.every((v,i)=>Number.isInteger(v) && v>=10 && v<=90 && (!i || v>=samples[i-1])));
 assert.equal(samples.at(-1),90);
 const displayed=samples[3];
 assert.equal(rangeTravelValue(displayed,0,0,range),displayed,'reversal begins from the current actual value');
 assert.equal(rangeTravelValue(displayed,0,MOTION.sliderTravel,range),0);
 const continuous=rangeTravelValue(.1,.9,120,{min:0,max:1,step:'any'});
 assert.ok(continuous>.1 && continuous<.9);
 assert.ok(Math.abs(continuous*20-Math.round(continuous*20))>.001,'continuous ranges do not acquire an arbitrary step');
});

test('taking over partial click travel re-anchors to the accepted value instead of the distant clicked point', () => {
 const range={left:100,width:128,min:0,max:100,step:1};
 const anchor={value:35,x:180,origin:10};
 assert.equal(rangeDragValue(anchor.value,180-anchor.x,range),35,'the takeover event does not advance the current value');
 assert.equal(rangeDragValue(anchor.value,190-anchor.x,range),45);
 assert.equal(rangeDragValue(anchor.value,190-anchor.x,{...range,rtl:true}),25);
 assert.equal(anchor.origin,10,'the original cancellation origin survives takeover');
 assert.equal(rangeDragValue(35,400,range),100);
});
