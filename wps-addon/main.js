/* WPS JS add-in entry point. WPS generates index.html beside this file. */
(function (root) {
  'use strict';
  var ribbon = null;
  var autoOpen = false;
  var eventsRegistered = false;
  var pendingUntil = 0;
  var LEASE_KEY = 'geometryLab.wps.dialogLease';

  function application() { return root.wps || root.Application; }
  function url(path) { return new URL(path, root.location.href).href; }
  function notify(message) {
    var app = application();
    if (app && typeof app.alert === 'function') app.alert(message);
    else if (typeof root.alert === 'function') root.alert(message);
  }
  function refreshToggle() {
    if (ribbon && typeof ribbon.InvalidateControl === 'function') ribbon.InvalidateControl('geometryAutoOpen');
  }
  function fitShape(shape, presentation) {
    var setup = presentation.PageSetup;
    var width = Number(setup.SlideWidth), height = Number(setup.SlideHeight);
    if (!(width > 0 && height > 0)) throw new Error('无法读取幻灯片尺寸');
    // COM properties may be numeric proxies. Assign directly, without typeof guards.
    shape.LockAspectRatio = 0;
    shape.Rotation = 0;
    shape.Width = width;
    shape.Height = height;
    shape.Left = 0;
    shape.Top = 0;
    if (Math.abs(Number(shape.Width) - width) > 1 || Math.abs(Number(shape.Height) - height) > 1 ||
        Math.abs(Number(shape.Left)) > 1 || Math.abs(Number(shape.Top)) > 1) {
      throw new Error('WPS 未应用铺满尺寸，请在对象大小设置中取消锁定纵横比后重试');
    }
  }
  root.OnGeometryFit = function () {
    try {
      var app = application(), selection = app.ActiveWindow.Selection.ShapeRange;
      if (Number(selection.Count) !== 1) throw new Error('请先退出放映，单击选中一个几何网页对象');
      fitShape(selection.Item(1), app.ActivePresentation);
      notify('已将选中对象铺满当前页。若放映仍有黑边，请检查幻灯片与屏幕的宽高比。');
      return true;
    } catch (error) { notify('铺满未完成：' + error.message); return false; }
  };
  root.OnGeometryWidescreen = function () {
    try {
      var app = application(), setup = app.ActivePresentation.PageSetup;
      var height = Number(setup.SlideHeight);
      if (!(height > 0)) throw new Error('请先打开课件');
      setup.SlideWidth = height * 16 / 9;
      setup.SlideHeight = height;
      notify('整份课件已设为 16:9。请选中几何网页，再点“铺满选中对象”；其他页的排版请检查。');
      return true;
    } catch (error) { notify('宽屏设置未完成：' + error.message); return false; }
  };
  function dialogIsOpen() {
    if (Date.now() < pendingUntil) return true;
    try {
      var lease = JSON.parse(root.localStorage.getItem(LEASE_KEY) || 'null');
      return !!lease && Date.now() - lease.time < 10000;
    } catch (_) { return false; }
  }
  function openDialog(silent) {
    if (dialogIsOpen()) {
      if (!silent) notify('几何交互窗口已经打开，请切换到该窗口继续操作。');
      return true;
    }
    var app = application();
    if (!app || typeof app.ShowDialog !== 'function') {
      if (!silent) notify('当前 WPS 未提供网页交互窗口接口，请查看使用说明。');
      return false;
    }
    var token = Date.now().toString(36) + Math.random().toString(36).slice(2);
    pendingUntil = Date.now() + 10000;
    try {
      var opened = app.ShowDialog(url('../index.html?host=wps&surface=dialog&scene=dialog&token=' + token), '几何实验室 · WPS 交互窗口', 1200, 820, false, true, 2, '', 0, false, false, true);
      if (opened === false) throw new Error('窗口未能创建');
      try { root.localStorage.setItem(LEASE_KEY, JSON.stringify({ token: token, time: Date.now() })); } catch (_) {}
      return true;
    } catch (error) {
      pendingUntil = 0;
      if (!silent) notify('无法打开几何交互窗口：' + error.message);
      return false;
    }
  }

  root.OnGeometryLoad = function (ribbonUI) {
    ribbon = ribbonUI;
    var app = application();
    if (!eventsRegistered && app && app.ApiEvent && typeof app.ApiEvent.AddApiEventListener === 'function') {
      try {
        app.ApiEvent.AddApiEventListener('SlideShowBegin', function () { if (autoOpen) openDialog(true); });
        app.ApiEvent.AddApiEventListener('SlideShowEnd', function () {
          try { root.localStorage.setItem('geometryLab.wps.dialogCommand', JSON.stringify({ action: 'close', time: Date.now() })); } catch (_) {}
        });
        eventsRegistered = true;
      } catch (_) { /* Manual insertion and dialog opening remain available. */ }
    }
    return true;
  };
  root.OnGeometryInsert = function () {
    var app = application(), slide, presentation;
    try {
      if (!app) throw new Error('请在 WPS 演示中使用此按钮');
      presentation = app.ActivePresentation;
      slide = app.ActiveWindow.View.Slide;
      if (!presentation || !slide || !slide.Shapes) throw new Error('请先在普通视图中选中一张幻灯片');
      if (typeof slide.Shapes.AddWebShapeEx !== 'function') throw new Error('当前 WPS 版本不支持网页图形。可另行点击“打开交互窗口”使用浮窗模式');
      var scene = 'slide-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      var previousCount = Number(slide.Shapes.Count);
      var webShape = slide.Shapes.AddWebShapeEx(url('../index.html?host=wps&surface=slide&scene=' + scene));
      // WPS exposes geometry through the containing Shape in the slide's collection.
      var shape = Number(slide.Shapes.Count) > previousCount ? slide.Shapes.Item(slide.Shapes.Count) : webShape;
      if (!shape) throw new Error('WPS 未返回网页图形，请检查是否出现网页信任提示');
      fitShape(shape, presentation);
      notify('已插入几何网页并铺满当前页。按 F5 放映，点网页中的“全屏讲解”扩大操作区域，工具栏保持可见。播放时请保持本机服务运行。');
      return true;
    } catch (error) { notify('插入未完成：' + error.message); return false; }
  };
  root.OnGeometryOpen = function () { return openDialog(false); };
  root.OnGeometryGetAuto = function () { return autoOpen; };
  root.OnGeometryToggleAuto = function (control, pressed) {
    autoOpen = typeof pressed === 'boolean' ? pressed : !autoOpen;
    if (autoOpen && !eventsRegistered) {
      autoOpen = false;
      notify('当前 WPS 未提供放映事件通知，请手动打开交互窗口。');
    }
    refreshToggle();
    return true;
  };
  root.OnGeometryHelp = function () {
    var app = application();
    if (!app || typeof app.ShowDialog !== 'function') { notify('请打开项目中的 wps-help.html。'); return false; }
    return app.ShowDialog(url('../wps-help.html'), '几何实验室 · 使用说明', 860, 700, false, true, 2, '', 0, false, false, true);
  };
})(window);
