(function () {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  if (params.get('host') !== 'wps') return;
  const embedded = params.get('surface') === 'slide' || params.get('display') === 'embedded';
  const token = params.get('token') || '';
  const scene = params.get('scene') || '';
  const sceneKey = /^[a-zA-Z0-9_-]{1,100}$/.test(scene) ? 'geometryLab.wps.' + scene : null;
  const leaseKey = 'geometryLab.wps.dialogLease';
  document.body.classList.add('wps-host');
  if (embedded) document.body.classList.add('wps-embedded');
  const banner = document.createElement('div');
  banner.className = 'wps-host-bar';
  const title = document.createElement('strong');
  title.textContent = embedded ? 'WPS 幻灯片内交互' : 'WPS 交互窗口';
  const status = document.createElement('span');
  status.textContent = embedded ? '拖动旋转 · 本页场景保存在本机，换电脑请导出作图' : '独立浮窗 · 关闭窗口后继续放映';
  status.setAttribute('role', 'status');
  banner.append(title, status);
  document.body.prepend(banner);

  const lab = window.geometryLab;
  let saveTimer;
  function saveScene() {
    if (!sceneKey || !lab) return;
    try {
      const data = {version:1,solid:lab.exportSolid(),analytic:lab.exportAnalytic(),mode:lab.getMode()};
      const json = JSON.stringify(data, (key,value) => {
        if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('invalid number');
        return value;
      });
      localStorage.setItem(sceneKey,json);
    } catch (_) { status.textContent = '当前场景未能自动保存，请修正无效参数或使用“保存作图”导出。'; }
  }
  if (sceneKey && lab) {
    try {
      const saved = JSON.parse(localStorage.getItem(sceneKey) || 'null');
      if (saved && saved.version === 1) {
        lab.importSolid(saved.solid);
        lab.importAnalytic(saved.analytic);
        lab.setMode(saved.mode === 'analytic' ? 'analytic' : 'solid');
      }
    } catch (_) { status.textContent = '此页上次的场景无法恢复，已打开默认模型。'; }
    const queueSave = () => { window.clearTimeout(saveTimer);saveTimer=window.setTimeout(saveScene,250); };
    ['input','change','pointerup','keyup'].forEach(event=>document.addEventListener(event,queueSave));
    window.addEventListener('pagehide',saveScene);
  }

  function releaseLease() {
    try {
      const lease = JSON.parse(localStorage.getItem(leaseKey) || 'null');
      if (lease && lease.token === token) localStorage.removeItem(leaseKey);
    } catch (_) {}
  }
  function returnToShow() {
    // window.close is the standard web API. No unverified WPS window methods are used.
    saveScene();
    window.close();
    status.textContent = '若窗口仍在，请点击右上角 × 返回放映；如需保留构造，请先保存作图。';
  }
  if (!embedded) {
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '返回放映';
    back.addEventListener('click', returnToShow);
    banner.appendChild(back);
    const heartbeat = () => {
      try { localStorage.setItem(leaseKey, JSON.stringify({ token, time: Date.now() })); } catch (_) {}
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 2000);
    window.addEventListener('pagehide', () => { window.clearInterval(timer); releaseLease(); });
    window.addEventListener('storage', event => {
      if (event.key !== 'geometryLab.wps.dialogCommand') return;
      try { if (JSON.parse(event.newValue).action === 'close') returnToShow(); } catch (_) {}
    });
  }
})();
