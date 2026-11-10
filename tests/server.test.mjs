import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
let child, origin;
before(async () => {
  child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url)), '--port', '0'], { cwd: process.env.TEMP || '.', stdio: ['ignore', 'pipe', 'pipe'] });
  origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timeout')), 5000);
    child.stdout.on('data', data => { const match = String(data).match(/Local: (http:\/\/127\.0\.0\.1:\d+)/); if(match) { clearTimeout(timer); resolve(match[1]); } });
    child.on('error', reject);
  });
});
after(() => child?.kill());
test('serves host query from project root regardless of current directory', async () => {
  const response = await fetch(origin + '/?host=wps');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /geometryCanvas/);
  assert.deepEqual(await (await fetch(origin + '/health')).json(), { app: 'geometry-lab', version: 1 });
});
test('serves WPS ribbon as XML', async () => {
  const response = await fetch(origin + '/wps-addon/ribbon.xml');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/xml/);
});
test('online WPS bootstrap loads its callbacks', async () => {
  const response = await fetch(origin + '/wps-addon/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /script src="main.js"/);
});
test('offline guide, illustration and migration examples are available', async () => {
  const guide = await fetch(origin + '/wps-help.html');
  assert.equal(guide.status, 200);
  const html = await guide.text();
  assert.match(html, /旧电脑打包清单/);
  assert.match(html, /左键选点和右键连线/);
  const image = await fetch(origin + '/docs/assets/interface.jpg');
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/jpeg');
  const solid = await (await fetch(origin + '/examples/cube-diagonal.json')).json();
  assert.equal(solid.type, 'solid-geometry-scene');
  assert.equal(solid.measurement.kind, 'linePlane');
  const analytic = await (await fetch(origin + '/examples/line-circle.json')).json();
  assert.equal(analytic.type, 'analytic-geometry-scene');
  assert.deepEqual(analytic.objects.map(o=>o.type), ['circle','line']);
});
test('does not expose repository internals or write endpoints', async () => {
  for (const path of ['/.git/config', '/.local/wps-server.log', '/%2e%2e%5coutside.html', '/install-wps.ps1']) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
  assert.equal((await fetch(origin + '/', {method: 'POST'})).status, 405);
});
