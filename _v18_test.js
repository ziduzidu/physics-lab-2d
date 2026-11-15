/* v18 体检：取消强制登录 —— 不登录也能用全部功能 */
const { runScript } = require('./_domstub.js');
const fs = require('fs');

const st = runScript('_check.js', {});
const T = st.T;
let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}
function txt(node) {
  let s = '';
  (function w(n) {
    if (!n) return;
    if (n.innerHTML) s += n.innerHTML + ' ';
    if (n.textContent) s += n.textContent + ' ';
    (n.children || []).forEach(w);
  })(node);
  return s;
}
const html = fs.readFileSync('index.html', 'utf8');
const ACC = T.ACC, SYS = T.SYS, GATE = T.GATE, MODULES = T.MODULES;

/* ==================== [1] 源码层面已经没有拦人的逻辑 ==================== */
console.log('\n[1] 源码里不再有登录门禁');

ok('源码里没有「登录解锁」文案', html.indexOf('登录解锁') < 0,
  (html.match(/登录解锁/g) || []).length + ' 处');
ok('源码里没有「未登录时只能」文案', html.indexOf('未登录时只能') < 0);
ok('源码里没有「登录后才开放全部功能」', html.indexOf('登录后才开放全部功能') < 0);
ok('GATE 的白名单是空的（不再分游客模块）', GATE.FREE.length === 0, JSON.stringify(GATE.FREE));
ok('GATE.can 一律放行', GATE.can('sandbox') === true && GATE.can('cosmos') === true, 'ok');
ok('gateCan 一律放行', T.gateCan('sandbox') === true && T.gateCan('circ') === true, 'ok');
ok('进模块的包装函数里不再调 gateShow', (function () {
  const i = html.indexOf('_enterSceneV15(id)');
  if (i < 0) return '找不到包装';
  const seg = html.slice(Math.max(0, i - 420), i);
  return seg.indexOf('gateShow') < 0;
})(), 'ok');

/* ==================== [2] 没登录时每个模块都进得去 ==================== */
console.log('\n[2] 游客每个模块都进得去');

ACC.logout();
ok('当前确实是未登录状态', !ACC.cur(), 'ok');

const bad = [];
MODULES.forEach(function (m) {
  try {
    T.enterScene(m.id);
    if (!T.App.mode) bad.push(m.id + '→空模式');
  } catch (e) {
    bad.push(m.id + '→' + e.message);
  }
});
ok(MODULES.length + ' 个模块游客全部进得去（无异常）', bad.length === 0, bad.join(','));
ok('沙盒模式切换生效', (function () {
  T.enterScene('sandbox'); return T.App.mode === 'sandbox';
})(), T.App.mode);

ok('游客能真的操作沙盒（物体真的会往下掉）', (function () {
  T.enterScene('sandbox');
  T.sbWorld({});
  T.SB.bodies.length = 0;
  const b = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: 0, y: 6, mat: 'wood' });
  T.SB.bodies.push(b);
  const y0 = b.y;
  if (T.SYS) T.SYS.slowmo = 0;
  T.SB.slow = 0;
  for (let i = 0; i < 30; i++) T.sbStep(1 / 60);
  return b.y < y0 - 0.2 ? true : ('y0=' + y0 + ' y=' + b.y);
})() === true, 'ok');

ok('游客不进模块也能玩基础的运动图像', (function () {
  T.enterScene('kinema');
  return !!(T.App.scene && T.App.scene.id === 'kinema');
})(), 'ok');

/* ==================== [3] 界面上没有任何催登录的标记 ==================== */
console.log('\n[3] 界面上不催登录');

ok('首页卡片全部显示「进入 →」', (function () {
  ACC.logout();
  T.buildHome();
  const s = txt(st.document.getElementById('hgrid'));
  return s.indexOf('进入 →') >= 0 && s.indexOf('🔒') < 0 && s.indexOf('登录') < 0;
})(), txt(st.document.getElementById('hgrid')).slice(0, 80));

ok('顶栏头像没有橙色提醒点', (function () {
  T.sysTopbar();
  return st.document.getElementById('sysAcc').className.indexOf('need') < 0;
})(), st.document.getElementById('sysAcc').className);

ok('打开页面没有自动弹出登录卡', (function () {
  const m = st.document.getElementById('gateMsk');
  return !m || !m.classList.contains('on');
})(), 'ok');

ok('启动函数里不再有自动弹卡', (function () {
  const i = html.indexOf('function v15Boot()');
  if (i < 0) return '找不到 v15Boot';
  const seg = html.slice(i, i + 400);
  return seg.indexOf('gateShow') < 0 && seg.indexOf('fz_gate_v1') < 0;
})(), 'ok');

/* ==================== [4] 登录功能本身还在（只是可选） ==================== */
console.log('\n[4] 登录仍然可用，只是不强制');

ok('账号页还能注册新用户', (function () {
  ACC.logout();
  const r = ACC.reg('guest18', 'pw1234');
  return r.ok ? true : r.msg;
})() === true, 'ok');

ok('注册后能登录', (function () {
  ACC.logout();
  return !!ACC.login('guest18', 'pw1234').ok;
})(), 'ok');

ok('登录后统计照常记', (function () {
  T.enterScene('link');
  const u = ACC.cur();
  return !!u && u.stat && u.stat.link >= 1;
})(), JSON.stringify((ACC.cur() || {}).stat));

ok('登录卡还能手动打开', (function () {
  T.gateShow('');
  const m = st.document.getElementById('gateMsk');
  return !!m && m.classList.contains('on');
})(), 'ok');

ok('登录卡文案不再说要解锁功能', (function () {
  const s = txt(st.document.getElementById('gateCard'));
  return s.indexOf('解锁') < 0 && s.indexOf('不登录也能用全部功能') >= 0;
})(), txt(st.document.getElementById('gateCard')).slice(0, 80));

ok('关掉登录卡不影响继续用', (function () {
  T.gateDo('later');
  T.enterScene('sandbox');
  return T.App.mode === 'sandbox';
})(), T.App.mode);

ok('退出登录后照样能用全部模块', (function () {
  ACC.logout();
  return MODULES.every(function (m) { return GATE.can(m.id); });
})(), 'ok');

/* ==================== [5] 封禁仍然有效（这条不能因为放开登录就失效） ==================== */
console.log('\n[5] 封禁依然生效');

ok('被封的账号登不进来', (function () {
  ACC.login('admin', 'fz2026@admin');
  ACC.reg('bad18', 'pw1234');                       /* 注册后会自动登录成 bad18 */
  ACC.login('admin', 'fz2026@admin');               /* 切回管理员才能封别人 */
  const ban = ACC.setBan('bad18', 1, '测试封禁');
  ACC.logout();
  const r = ACC.login('bad18', 'pw1234');
  ACC.login('admin', 'fz2026@admin');
  return ban && !r.ok && String(r.msg).indexOf('封禁') >= 0 ? true : JSON.stringify({ ban: ban, r: r });
})() === true, 'ok');

ok('解封后又能登录', (function () {
  ACC.setBan('bad18', 0);
  ACC.logout();
  const r = ACC.login('bad18', 'pw1234');
  ACC.login('admin', 'fz2026@admin');
  return !!r.ok;
})(), 'ok');

/* ==================== [6] 整洁度 ==================== */
console.log('\n[6] 整洁度');

ok('零外链', (html.match(/(src|href)\s*=\s*["']https?:\/\//gi) || []).length === 0, 'ok');
ok('源码里没有明文口令', html.indexOf('fz2026@admin') < 0, 'ok');
ok('版本号保持 vNN · 单文件离线版 格式', /v\d{2} · 单文件离线版/.test(html), 'ok');

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail === 0 ? 0 : 1);
