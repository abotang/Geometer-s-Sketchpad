(function () {
  'use strict';
  const kinds={distance:['线段长度',['端点 U','端点 V']],lines:['线线角',['直线一 U','直线一 V','直线二 A','直线二 B']],linePlane:['线面角',['直线端点 U','直线端点 V','平面点 A','平面点 B','平面点 C']],pointPlane:['点到平面距离',['待测点 P','平面点 A','平面点 B','平面点 C']]};
  const card=$('#solidMeasurements'),kindSelect=$('#measurementKind'),fields=$('#measurementFields'),result=$('#measurementResult'),steps=$('#measurementSteps');
  let fieldSignature='';
  const f=n=>Number(n.toFixed(4)).toString();
  const vector=v=>'('+v.map(f).join(', ')+')';
  const coordinates=p=>vector(sub3(p,coordinateOrigin()));
  const lineName=(ids,i)=>labelOf(ids[i])+labelOf(ids[i+1]);
  function defaults(kind) {
    const ids=state.model.hideLabels?(state.model.keyPoints||[]).map((_,i)=>'k'+i):state.model.vertices.map((_,i)=>'v'+i);
    const patterns={distance:[0,1],lines:[0,1,2,3],linePlane:[0,1,0,1,2],pointPlane:[3,0,1,2]};
    return {kind,ids:patterns[kind].map(i=>ids[i]||'')};
  }
  kindSelect.onchange=()=>{state.measurement=kinds[kindSelect.value]?defaults(kindSelect.value):null;render();};
  fields.addEventListener('change',event=>{
    if(!state.measurement||!event.target.matches('select'))return;
    state.measurement.ids[Number(event.target.dataset.slot)]=event.target.value;render();
  });
  card.querySelectorAll('[data-example]').forEach(button=>button.onclick=()=>{
    const kind=button.dataset.example;
    // Examples use the current box dimensions and preserve the user's constructions.
    state.measurement={kind,ids:kind==='linePlane'?['v0','v6','v0','v1','v3']:kind==='lines'?['v0','v1','v2','v6']:['v6','v0','v1','v3']};
    render();
  });
  function draw(PC,config,data) {
    const frame=state.viewFrame,P=p=>project(p,frame.w,frame.h,frame.scale);
    const g=node('g',{'pointer-events':'none','aria-label':'测量辅助图',class:'measurement-overlay'});
    const line=(a,b,color,dashed=false)=>{const p=P(a),q=P(b);g.appendChild(node('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:color,'stroke-width':3,'stroke-dasharray':dashed?'7 5':'', 'vector-effect':'non-scaling-stroke'}));};
    const label=(p,text)=>{const q=P(p),t=node('text',{x:q.x+10,y:q.y-10,class:'vertex-label',fill:'#9a4b14'});t.textContent=text;g.appendChild(node('circle',{cx:q.x,cy:q.y,r:4,fill:'#fff',stroke:'#b96318','stroke-width':2}));g.appendChild(t);};
    const pts=config.ids.map(id=>PC[id]);
    if(config.kind.includes('Plane')) {
      const planePoints=pts.slice(config.kind==='linePlane'?2:1);
      g.appendChild(node('polygon',{points:planePoints.map(p=>{const q=P(p);return q.x+','+q.y}).join(' '),fill:'#e9a33a','fill-opacity':.18,stroke:'#b96318','stroke-width':1.5}));
    }
    if(config.kind==='distance'||config.kind==='lines'||config.kind==='linePlane')line(pts[0],pts[1],'#a451b5');
    if(config.kind==='lines')line(pts[2],pts[3],'#b96318');
    if(config.kind==='pointPlane'){line(pts[0],data.foot,'#b96318',true);label(data.foot,'H（垂足）');}
    if(config.kind==='linePlane') {
      line(pts[0],data.feet[0],'#b96318',true);line(pts[1],data.feet[1],'#b96318',true);
      line(data.feet[0],data.feet[1],'#16836d');label(data.feet[0],'H₁');
      if(Math.hypot(...sub3(data.feet[1],data.feet[0]))>1e-8)label(data.feet[1],'H₂');
    }
    svg.appendChild(g);
  }
  function update(PC) {
    const config=state.measurement,kind=config?.kind,definition=kinds[kind];
    kindSelect.value=definition?kind:'';
    $('#measurementExamples').hidden=!['cube','cuboid'].includes(state.key);
    fields.hidden=!definition;$('#measurementDerivation').hidden=!definition;
    if(!definition){result.textContent='选取点、线、面，观察长度、夹角和垂足随尺寸变化。';steps.textContent='';return;}
    const ids=Array.isArray(config.ids)?config.ids:[];
    const choices=(state.model.hideLabels?[]:state.model.vertices.map((_,i)=>'v'+i))
      .concat((state.model.keyPoints||[]).map((_,i)=>'k'+i),state.points.map(p=>p.id)).filter(id=>PC[id]);
    const signature=JSON.stringify([kind,choices.map(id=>[id,labelOf(id)])]);
    if(signature!==fieldSignature) {
      fieldSignature=signature;fields.replaceChildren();
      definition[1].forEach((text,i)=>{
        const label=document.createElement('label');label.append(document.createTextNode(text));
        const select=document.createElement('select');select.dataset.slot=i;select.setAttribute('aria-label',text);
        select.add(new Option('请选择',''));choices.forEach(id=>select.add(new Option(labelOf(id),id)));
        select.value=ids[i]||'';label.appendChild(select);fields.appendChild(label);
      });
    }
    fields.querySelectorAll('select').forEach((select,i)=>{select.value=ids[i]||'';});
    try {
      const pts=ids.map(id=>PC[id]),data=SolidMath.measure(kind,pts),angle=kind==='lines'||kind==='linePlane';
      const names=ids.map(labelOf),plName=names.slice(kind==='linePlane'?2:1).join('');
      result.classList.remove('measurement-error');
      result.textContent=definition[0]+' ≈ '+f(data.value)+(angle?'°':'（模型单位）');
      let explanation='';
      if(kind==='distance')explanation=`${lineName(ids,0)} 的向量 = ${vector(data.vector)}\n长度 = √(Δx² + Δy² + Δz²) ≈ ${f(data.value)}`;
      if(kind==='lines')explanation=`u = ${vector(data.u)}，v = ${vector(data.v)}\ncos θ = |u·v| / (|u||v|) ≈ ${f(data.ratio)}\nθ ≈ ${f(data.value)}°。取两条直线方向的较小夹角（0°～90°），也适用于异面直线。`;
      if(kind==='pointPlane')explanation=`平面 ${plName} 的单位法向量 n = ${vector(data.normal)}\nd = |${names[1]}${names[0]}·n| ≈ ${f(data.value)}\n垂足 H = ${coordinates(data.foot)}\n虚线连接待测点与垂足；测量到无限延伸平面的距离，垂足可以在着色三角形外。`;
      if(kind==='linePlane')explanation=`方向向量 u = ${vector(data.u)}\n平面 ${plName} 的单位法向量 n = ${vector(data.normal)}\nsin θ = |u·n| / |u| ≈ ${f(data.ratio)}\nθ ≈ ${f(data.value)}°（0°～90°）。绿色线段为正射影，虚线为垂线。${data.value>89.9999?'直线垂直于平面，正射影退化为一个点。':''}\n着色三角形仅标示平面位置，平面无限延伸。`;
      steps.textContent=ids.map((id,i)=>`${definition[1][i]}：${labelOf(id)} ${coordinates(pts[i])}`).join('\n')+'\n\n'+explanation+'\n\n坐标以底部原点为准；数值为近似值，不能代替证明。';
      draw(PC,config,data);
    } catch(error) {
      result.classList.add('measurement-error');result.textContent=error.message;steps.textContent='先选齐有效点。确定一条直线需要两个不同点，确定一个平面需要三个不共线点。';
    }
  }
  window.solidMeasurementTools={update};
  render();
})();
