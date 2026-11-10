(function () {
  'use strict';
  const button = document.querySelector('#presentationToggle');
  let requestedFullscreen = false;
  let noticeTimer;
  function notice(text) {
    let box = document.querySelector('.lecture-notice');
    if (!box) { box = document.createElement('div');box.className = 'lecture-notice';box.setAttribute('role','status');document.body.appendChild(box); }
    box.textContent = text;clearTimeout(noticeTimer);noticeTimer = setTimeout(() => box.remove(), 6500);
  }
  function setLecture(on) {
    document.body.classList.toggle('lecture-mode', on);
    document.querySelectorAll('.panel.open').forEach(panel => panel.classList.remove('open'));
    document.querySelector('#drawerOverlay').classList.remove('show');
    document.querySelectorAll('[aria-controls$="Panel"]').forEach(b => b.setAttribute('aria-expanded','false'));
    button.textContent = on ? '退出全屏讲解' : '全屏讲解';
    button.setAttribute('aria-pressed', String(on));
    window.dispatchEvent(new Event('resize'));
  }
  button.addEventListener('click', async () => {
    const on = !document.body.classList.contains('lecture-mode');
    setLecture(on);
    if (on) {
      try {
        if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
        await document.documentElement.requestFullscreen();
        requestedFullscreen = true;
      } catch (_) {
        notice('已铺满网页区域。若 WPS 外侧仍有黑边，退出放映后将网页对象铺满幻灯片，并检查页面比例。');
      }
    } else if (requestedFullscreen && document.fullscreenElement) {
      requestedFullscreen = false;
      await document.exitFullscreen().catch(() => {});
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && requestedFullscreen) { requestedFullscreen = false;setLecture(false); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.fullscreenElement) setLecture(false);
  });
  // Model selection can be dismissed without covering the permanent tool panel.
  document.querySelectorAll('.analytic-left').forEach(panel => {
    const close = document.createElement('button');close.className = 'panel-close mobile-only';
    close.textContent = '×';close.setAttribute('aria-label','关闭面板');
    close.onclick = () => { panel.classList.remove('open');document.querySelector('#drawerOverlay').classList.remove('show'); };
    panel.prepend(close);
  });
})();
