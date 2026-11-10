(function (root) {
  'use strict';
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const add = (a,b) => a.map((v,i) => v+b[i]);
  const mul = (v,s) => v.map(x => x*s);
  const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length = v => Math.hypot(...v);
  const clamp = x => Math.max(0,Math.min(1,x));
  function direction(a,b) {
    const v=sub(b,a), size=length(v);
    if (size < 1e-10) throw new Error('直线的两个端点重合，不能确定方向。');
    return {v,size,unit:mul(v,1/size)};
  }
  function plane(a,b,c) {
    const u=direction(a,b),v=direction(a,c),n=cross(u.unit,v.unit),size=length(n);
    if (size < 1e-9) throw new Error('平面的三个点共线或重合，请重新选点。');
    return {normal:mul(n,1/size),anchor:a};
  }
  function foot(p,pl) {return sub(p,mul(pl.normal,dot(sub(p,pl.anchor),pl.normal)));}
  function measure(kind,points) {
    const counts={distance:2,lines:4,linePlane:5,pointPlane:4};
    if (!counts[kind] || points.length!==counts[kind] || !points.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))) {
      throw new Error('请选齐有效的点；删除辅助点后需要重新选择。');
    }
    const [a,b,c,d,e]=points;
    if(kind==='distance')return {value:length(sub(b,a)),vector:sub(b,a)};
    if(kind==='lines') {
      const u=direction(a,b),v=direction(c,d),cos=clamp(Math.abs(dot(u.unit,v.unit)));
      return {value:Math.acos(cos)*180/Math.PI,u:u.v,v:v.v,ratio:cos};
    }
    let pl;
    try {pl=kind==='linePlane'?plane(c,d,e):plane(b,c,d);} catch (_) {throw new Error('平面的三个点共线或重合，请重新选点。');}
    if(kind==='pointPlane') {
      const h=foot(a,pl);
      return {value:length(sub(a,h)),foot:h,normal:pl.normal,offset:sub(a,b)};
    }
    const u=direction(a,b),sin=clamp(Math.abs(dot(u.unit,pl.normal)));
    return {value:Math.asin(sin)*180/Math.PI,u:u.v,normal:pl.normal,ratio:sin,
      feet:[foot(a,pl),foot(b,pl)],projection:add(a,sub(foot(b,pl),foot(a,pl)))};
  }
  const api={measure};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SolidMath=api;
})(typeof globalThis==='object'?globalThis:this);
