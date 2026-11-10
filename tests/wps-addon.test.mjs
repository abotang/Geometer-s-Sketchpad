import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const code = await readFile(new URL('../wps-addon/main.js', import.meta.url), 'utf8');
function harness({supported=true, dialogResult=true}={}) {
  const alerts=[], urls=[], dialogs=[], events={}, shapes=[];
  const collection = {get Count(){return shapes.length},Item:n=>shapes[n-1]};
  if(supported) collection.AddWebShapeEx=url=>{urls.push(url);let shape={Left:0,Top:0,Width:0,Height:0};shapes.push(shape);return shape};
  const store=new Map();
  const window={location:{href:'http://127.0.0.1:4174/wps-addon/index.html'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},wps:{
    alert:message=>alerts.push(message),
    ActivePresentation:{PageSetup:{SlideWidth:960,SlideHeight:540}},
    ActiveWindow:{View:{Slide:{Shapes:collection}}},
    ApiEvent:{AddApiEventListener:(event,fn)=>events[event]=fn},
    ShowDialog:(...args)=>{dialogs.push(args);return dialogResult}
  }};
  vm.runInNewContext(code,{window,URL,Date,Math,JSON});
  return {window,alerts,urls,dialogs,events,shapes,store};
}
test('native insertion uses current slide and distinct scene IDs, fitted in points',()=>{
  const h=harness();
  assert.equal(h.window.OnGeometryInsert(),true);
  assert.equal(h.window.OnGeometryInsert(),true);
  const a=new URL(h.urls[0]),b=new URL(h.urls[1]);
  assert.equal(a.pathname,'/index.html');
  assert.equal(a.searchParams.get('host'),'wps');
  assert.equal(a.searchParams.get('surface'),'slide');
  assert.notEqual(a.searchParams.get('scene'),b.searchParams.get('scene'));
  assert.deepEqual(h.shapes[0],{Left:0,Top:0,Width:960,Height:540,LockAspectRatio:0,Rotation:0});
  assert.equal(h.dialogs.length,0);
});
test('unsupported native API reports failure without silently substituting a dialog',()=>{
  const h=harness({supported:false});
  assert.equal(h.window.OnGeometryInsert(),false);
  assert.match(h.alerts[0],/不支持/);
  assert.equal(h.dialogs.length,0);
});
test('no active presentation reports failure',()=>{
  const h=harness();h.window.wps.ActivePresentation=null;
  assert.equal(h.window.OnGeometryInsert(),false);
  assert.equal(h.shapes.length,0);
});
test('auto dialog is opt-in, registers once and avoids duplicate windows',()=>{
  const h=harness();
  h.window.OnGeometryLoad({});h.window.OnGeometryLoad({});
  h.events.SlideShowBegin();assert.equal(h.dialogs.length,0);
  h.window.OnGeometryToggleAuto(null,true);
  h.events.SlideShowBegin();h.events.SlideShowBegin();
  assert.equal(h.dialogs.length,1);
  assert.equal(new URL(h.dialogs[0][0]).searchParams.get('surface'),'dialog');
  assert.equal(h.dialogs[0][4],false);
  h.events.SlideShowEnd();
  assert.equal(JSON.parse(h.store.get('geometryLab.wps.dialogCommand')).action,'close');
});
test('failed dialog reports failure and can retry',()=>{
  const h=harness({dialogResult:false});
  assert.equal(h.window.OnGeometryOpen(),false);
  assert.equal(h.window.OnGeometryOpen(),false);
  assert.equal(h.dialogs.length,2);
  assert.match(h.alerts[0],/无法打开/);
});
test('help opens the packaged guide',()=>{
  const h=harness();h.window.OnGeometryHelp();
  assert.equal(new URL(h.dialogs[0][0]).pathname,'/wps-help.html');
});
test('existing object can be repaired without adding a new scene',()=>{
  const h=harness();
  const shape={Left:-200,Top:17,Width:700,Height:700,LockAspectRatio:-1,Rotation:15};
  h.window.wps.ActiveWindow.Selection={ShapeRange:{Count:1,Item:()=>shape}};
  assert.equal(h.window.OnGeometryFit(),true);
  assert.deepEqual(shape,{Left:0,Top:0,Width:960,Height:540,LockAspectRatio:0,Rotation:0});
  assert.equal(h.urls.length,0);
});
test('repair does not report success if the WPS host refuses dimensions',()=>{
  const h=harness();
  const shape={Left:0,Top:0,Height:100};
  Object.defineProperty(shape,'Width',{get:()=>100,set:()=>{}});
  h.window.wps.ActiveWindow.Selection={ShapeRange:{Count:1,Item:()=>shape}};
  assert.equal(h.window.OnGeometryFit(),false);
  assert.match(h.alerts[0],/未应用/);
});
test('widescreen conversion is explicit and preserves height',()=>{
  const h=harness();h.window.wps.ActivePresentation.PageSetup={SlideWidth:600,SlideHeight:600};
  assert.equal(h.window.OnGeometryWidescreen(),true);
  assert.equal(h.window.wps.ActivePresentation.PageSetup.SlideHeight,600);
  assert.equal(h.window.wps.ActivePresentation.PageSetup.SlideWidth,600*16/9);
  assert.equal(h.urls.length,0);
});
