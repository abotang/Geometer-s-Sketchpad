import {test} from 'node:test';
import assert from 'node:assert/strict';
import math from '../solid-math.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const A=[0,0,0],B=[4,0,0],D=[0,4,0],C1=[4,4,4];
test('cube diagonal and base: standard high-school values',()=>{
  near(math.measure('distance',[A,C1]).value,4*Math.sqrt(3));
  const angle=math.measure('linePlane',[A,C1,A,B,D]);
  near(angle.value,35.264389682754654);
  assert.deepEqual(angle.feet,[[0,0,0],[4,4,0]]);
  const distance=math.measure('pointPlane',[C1,A,B,D]);
  near(distance.value,4);assert.deepEqual(distance.foot,[4,4,0]);
});
test('skew lines use directions, reversed endpoints give same acute angle',()=>{
  near(math.measure('lines',[A,B,[4,4,0],C1]).value,90);
  near(math.measure('lines',[A,B,[2,2,0],[1,1,0]]).value,45);
  near(math.measure('lines',[B,A,[1,1,0],[2,2,0]]).value,45);
});
test('parallel, contained, and perpendicular lines to plane',()=>{
  near(math.measure('linePlane',[[0,0,3],[4,0,3],A,B,D]).value,0);
  near(math.measure('linePlane',[A,B,A,B,D]).value,0);
  near(math.measure('linePlane',[A,[0,0,4],A,B,D]).value,90);
});
test('tilted plane x+y+z=1: projection and infinite plane distance',()=>{
  const plane=[[1,0,0],[0,1,0],[0,0,1]];
  const r=math.measure('pointPlane',[[3,3,3],...plane]);
  near(r.value,8/Math.sqrt(3));r.foot.forEach(x=>near(x,1/3));
  const outside=math.measure('pointPlane',[[10,10,3],A,B,D]);
  near(outside.value,3);assert.deepEqual(outside.foot,[10,10,0]);
});
test('translation and scale preserve angles and scale distances',()=>{
  const transform=p=>p.map((x,i)=>x*2+[19,-17,31][i]);
  near(math.measure('linePlane',[A,C1,A,B,D].map(transform)).value,35.264389682754654);
  near(math.measure('pointPlane',[C1,A,B,D].map(transform)).value,8);
});
test('degenerate lines, collinear planes, missing or invalid inputs are rejected',()=>{
  assert.throws(()=>math.measure('lines',[A,A,B,D]),/重合/);
  assert.throws(()=>math.measure('pointPlane',[C1,A,B,[8,0,0]]),/共线/);
  assert.throws(()=>math.measure('pointPlane',[C1,A,A,D]),/共线/);
  assert.throws(()=>math.measure('distance',[A,null]),/有效/);
  assert.throws(()=>math.measure('distance',[A,[NaN,0,0]]),/有效/);
  near(math.measure('distance',[A,A]).value,0);
});
