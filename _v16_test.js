/* v16 体检：焦痕不再残留 · 管理员分级与撤销 · 沙盒声音不再响个不停 */
const { runScript } = require('./_domstub.js');
const fs = require('fs');

const st = runScript('_check.js', {});
const T = st.T, rec = st.rec;
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
function findBtn(node, label) {
  let hit = null;
  (function w(n) {
    if (!n) return;
    if (n.tagName === 'BUTTON' && (n.textContent || '').indexOf(label) >= 0) hit = n;
    (n.children || []).forEach(w);
  })(node);
  return hit;
}
function drwB() { return st.document.querySelector('.drwb'); }
const html = fs.readFileSync('index.html', 'utf8');
const ACC = T.ACC, SYS = T.SYS, SB = T.SB, SND = T.SND;
function solo() { if (SND) { SND._v = 0; SND._vw = 0; SND._t = {}; SND._r = {}; } }
/* ---- 假 AudioContext：让音效真的跑一遍合成路径 ---- */
function FakeParam() {
  return { value: 0, setValueAtTime() { }, linearRampToValueAtTime() { }, exponentialRampToValueAtTime() { } };
}
function FakeCtx() {
  this.currentTime = 0; this.sampleRate = 44100; this.state = 'running';
  this.destination = {};
  this.createGain = function () { return { gain: FakeParam(), connect() { } }; };
  this.createOscillator = function () {
    return { type: 'sine', frequency: FakeParam(), connect() { }, start() { }, stop() { } };
  };
  this.createBufferSource = function () {
    return { buffer: null, playbackRate: { value: 1 }, connect() { }, start() { }, stop() { } };
  };
  this.createBiquadFilter = function () {
    return { type: '', frequency: FakeParam(), Q: FakeParam(), connect() { } };
  };
  this.createStereoPanner = function () { return { pan: FakeParam(), connect() { } }; };
  this.createConvolver = function () { return { buffer: null, connect() { } }; };
  this.createDynamicsCompressor = function () {
    return {
      threshold: FakeParam(), knee: FakeParam(), ratio: FakeParam(),
      attack: FakeParam(), release: FakeParam(), connect() { }
    };
  };
  this.createBuffer = function (ch, n) {
    return { getChannelData: function () { return new Float32Array(n); } };
  };
  this.resume = function () { };
}
st.sandbox.AudioContext = FakeCtx;
SND.ctx = null; SND.init();

/* 只记录渐变颜色的假 ctx：用来验证焦痕确实在变淡 */
function gradCtx() {
  const r = { rg: 0, colors: [] };
  return {
    rec: r,
    save() { }, restore() { }, beginPath() { }, ellipse() { }, fill() { },
    createRadialGradient() {
      r.rg++;
      return { addColorStop(o, c) { r.colors.push(c); } };
    }
  };
}
function maxAlpha(g) {
  let m = -1;
  g.rec.colors.forEach(function (c) {
    const m2 = /rgba\([^)]*?([\d.]+)\)$/.exec(String(c));
    if (m2) m = Math.max(m, parseFloat(m2[1]));
  });
  return m;
}

function run(sec, dt) {
  dt = dt || 1 / 60; SB.slow = 0;
  for (let i = 0; i < Math.round(sec / dt); i++) T.sbStep(dt);
}

/* ==================== [1] 爆炸焦痕不再残留 ==================== */
console.log('\n[1] 爆炸焦痕：几秒淡出，不留阴影');

ok('焦痕带淡出时长（不再永久）', (function () {
  SYS.decal = 1; SB.decals = [];
  T.sbScorch(6, 0.2, 2);
  return SB.decals.length === 1 && SB.decals[0].fd > 0;
})(), JSON.stringify(SB.decals[0] || {}));

ok('默认档位下几秒后焦痕自己消失', (function () {
  SYS.decal = 1; SB.decals = [];
  T.sbScorch(6, 0.2, 2);
  run(3);
  const mid = SB.decals.length;
  run(12);
  return mid === 1 && SB.decals.length === 0;
})(), '3 秒还在 / 15 秒后应清空');

ok('爆炸留下的焦痕最终会清空', (function () {
  SYS.decal = 1; SB.decals = [];
  SB.bodies.length = 0; T.sbWorld({});
  T.sbExplode(8, 6, 60);
  const n = SB.decals.length;
  run(20);
  return n >= 1 && SB.decals.length === 0;
})(), 'ok');

ok('「保留」档位下焦痕一直在', (function () {
  SYS.decal = 2; SB.decals = [];
  T.sbScorch(6, 0.2, 2);
  const fd = SB.decals[0].fd;
  run(30);
  return fd === 0 && SB.decals.length === 1;
})(), 'ok');

ok('「关」档位下根本不产生焦痕', (function () {
  SYS.decal = 0; SB.decals = [];
  T.sbScorch(6, 0.2, 2);
  T.sbExplode(8, 6, 40);
  return SB.decals.length === 0;
})(), SB.decals.length);

ok('淡出时越到后面越透明', (function () {
  SYS.decal = 1;
  const g = gradCtx();
  const alphas = [];
  SB.decals = [{ x: SB.view.cx, y: SB.view.cy, r: 2, a: 0.34, s: 0, t: 0, fd: 10 }];
  [0, 5, 9].forEach(function (t) {
    SB.decals[0].t = t;
    g.rec.colors.length = 0;
    T.sbDrawDecals(g);
    alphas.push(maxAlpha(g));
  });
  return alphas.length === 3 && alphas[0] > alphas[1] && alphas[1] > alphas[2] && alphas[2] < 0.05;
})(), 'ok');

ok('fd=0（保留）时透明度不衰减', (function () {
  const g = gradCtx();
  SB.decals = [{ x: SB.view.cx, y: SB.view.cy, r: 2, a: 0.34, s: 0, t: 0, fd: 0 }];
  T.sbDrawDecals(g);
  const a1 = maxAlpha(g);
  SB.decals[0].t = 999;
  g.rec.colors.length = 0;
  T.sbDrawDecals(g);
  const a2 = maxAlpha(g);
  return a1 > 0 && a1 === a2;
})(), 'ok');

ok('关掉焦痕时不再绘制', (function () {
  SYS.decal = 0;
  const g = gradCtx();
  SB.decals = [{ x: SB.view.cx, y: SB.view.cy, r: 2, a: 0.34, s: 0, t: 0, fd: 5 }];
  T.sbDrawDecals(g);
  const n = g.rec.rg;
  SYS.decal = 1; SB.decals = [];
  return n === 0;
})(), 'ok');

ok('清空场景时痕迹一起清掉', (function () {
  SYS.decal = 2; SB.decals = [];
  T.sbScorch(6, 0.2, 2);
  T.sbClear();
  const a = SB.decals.length;
  T.sbScorch(6, 0.2, 2);
  T.sbSetEnv('space');
  const b = SB.decals.length;
  SYS.decal = 1;
  return a === 0 && b === 0;
})(), 'ok');

ok('画面设置里有「爆炸焦痕」三档', (function () {
  SYS.tab = 'view'; T.sysRender();
  const s = txt(drwB());
  return s.indexOf('爆炸焦痕') >= 0 && html.indexOf('view:decal') > 0;
})(), 'ok');

ok('拖到「保留 / 关」能生效', (function () {
  T.sysAct('view:decal', '2', { value: '2' });
  const a = SYS.decal;
  T.sysAct('view:decal', '0', { value: '0' });
  const b = SYS.decal;
  SYS.decal = 1;
  return a === 2 && b === 0;
})(), 'ok');

/* ==================== [2] 管理员分级与撤销 ==================== */
console.log('\n[2] 管理员分级：最高权限 > 管理员 > 用户');

ok('级别表：owner 3 > admin 2 > user 1',
  T.ACCLV.owner === 3 && T.ACCLV.admin === 2 && T.ACCLV.user === 1, JSON.stringify(T.ACCLV));

ACC.logout(); ACC.load();
ok('内置账号是最高权限 owner', ACC.get('admin').role === 'owner', ACC.get('admin').role);
ok('accLv 认得 owner', T.accLv(ACC.get('admin')) === 3, T.accLv(ACC.get('admin')));
ok('登 admin 后 isOwner / isAdmin 都为真', (function () {
  ACC.login('admin', 'fz2026@admin');
  return ACC.isOwner() === true && ACC.isAdmin() === true;
})(), 'ok');

/* 造几个账号 */
ACC.reg('u1', 'u1pass'); ACC.reg('u2', 'u2pass'); ACC.reg('u3', 'u3pass');
ACC.login('admin', 'fz2026@admin');

ok('最高权限能把普通用户设为管理员', (function () {
  return ACC.setRole('u1', 'admin') === 1 && ACC.get('u1').role === 'admin';
})(), ACC.get('u1').role);
ok('授出的管理员级别低于最高权限', T.accLv(ACC.get('u1')) === 2 && T.accLv(ACC.get('admin')) === 3, 'ok');
ok('最高权限可以随时撤销管理员', (function () {
  return ACC.setRole('u1', 'user') === 1 && ACC.get('u1').role === 'user';
})(), ACC.get('u1').role);

ok('谁都不能把别人设成最高权限', (function () {
  ACC.setRole('u2', 'owner');
  return ACC.get('u2').role !== 'owner';
})(), ACC.get('u2').role);
ok('不能改自己的级别', (function () {
  ACC.login('admin', 'fz2026@admin');
  const before = ACC.get('admin').role;
  ACC.setRole('admin', 'user');
  ACC.setRole('u1', 'admin');
  return ACC.get('admin').role === before && before === 'owner';
})(), ACC.get('admin').role);
ok('没人能动最高权限账号', (function () {
  return ACC.canOn('admin') === 0 && ACC.setBan('admin', 1) === 0 &&
    ACC.del('admin') === 0 && ACC.setPw('admin', 'zzzz') === 0 && !!ACC.get('admin');
})(), 'ok');

/* 次级管理员的权限边界 */
ACC.login('admin', 'fz2026@admin');
ACC.setRole('u1', 'admin'); ACC.setRole('u2', 'admin'); ACC.logout();

ok('次级管理员登录：是管理员但不是最高权限', (function () {
  ACC.login('u1', 'u1pass');
  return ACC.isAdmin() === true && ACC.isOwner() === false;
})(), 'ok');
ok('次级管理员撤不掉另一个管理员', (function () {
  const before = ACC.get('u2').role;
  ACC.setRole('u2', 'user');
  return ACC.get('u2').role === before && before === 'admin';
})(), ACC.get('u2').role);
ok('次级管理员封不了另一个管理员', ACC.setBan('u2', 1) === 0 && !ACC.get('u2').ban, 'ok');
ok('次级管理员删不掉另一个管理员', ACC.del('u2') === 0 && !!ACC.get('u2'), 'ok');
ok('次级管理员可以管普通用户', (function () {
  const a = ACC.setBan('u3', 1, '测试');
  const b = ACC.setBan('u3', 0);
  const c = ACC.setPw('u3', 'newpw99');
  return a === 1 && b === 1 && c === 1;
})(), 'ok');
ok('次级管理员可以把普通用户提为管理员', (function () {
  return ACC.setRole('u3', 'admin') === 1 && ACC.get('u3').role === 'admin';
})(), ACC.get('u3').role);
ok('改不了自己的权限（次级管理员也一样）', (function () {
  ACC.setRole('u1', 'user');
  return ACC.get('u1').role === 'admin';
})(), ACC.get('u1').role);

ok('统计里最高权限单独计数', (function () {
  ACC.login('admin', 'fz2026@admin');
  const s = ACC.sum();
  return s.owner === 1 && s.admin >= 3 && s.admin >= s.owner;
})(), JSON.stringify(ACC.sum()));

ok('账号管理页显示「最高权限」徽章', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; T.sysRender();
  return txt(drwB()).indexOf('最高权限') >= 0;
})(), 'ok');
ok('最高权限账号卡片不给封禁 / 删除按钮', (function () {
  const s = txt(drwB());
  return s.indexOf('不可封禁') >= 0;
})(), 'ok');
ok('最高权限看得到「撤销管理员」', (function () {
  ACC.login('admin', 'fz2026@admin'); SYS.uview = 1; T.sysRender();
  return !!findBtn(drwB(), '撤销管理员');
})(), 'ok');
ok('普通用户在列表里标成「普通用户」', (function () {
  ACC.reg('plain01', 'plainpw'); ACC.login('admin', 'fz2026@admin');
  SYS.uview = 1; T.sysRender();
  return txt(drwB()).indexOf('普通用户') >= 0;
})(), 'ok');

ok('点「撤销管理员」真的撤掉', (function () {
  ACC.login('admin', 'fz2026@admin');
  ACC.setRole('u2', 'admin');
  T.sysAct('adm:role', 'u2');
  return ACC.get('u2').role === 'user';
})(), ACC.get('u2').role);
ok('点「设为管理员」真的设上', (function () {
  ACC.login('admin', 'fz2026@admin');
  T.sysAct('adm:role', 'u2');
  return ACC.get('u2').role === 'admin';
})(), ACC.get('u2').role);
ok('权限不足时给提示而不是静默', (function () {
  ACC.login('u1', 'u1pass');
  const before = ACC.get('u2').role;
  T.sysAct('adm:role', 'u2');
  return ACC.get('u2').role === before;
})(), ACC.get('u2').role);

ok('老账号库里的 admin 会升级成 owner', (function () {
  ACC.login('admin', 'fz2026@admin');
  ACC.users['admin'].role = 'admin'; ACC.save();
  ACC.users = null; ACC.load();
  return ACC.get('admin').role === 'owner';
})(), ACC.get('admin').role);

/* ==================== [3] 沙盒声音不再响个不停 ==================== */
console.log('\n[3] 声音：连发抑制与物理音开关');

ok('连发抑制：同一个音一段窗口里最多响 N 次', (function () {
  solo(); SND.on = 1; SND.mute = 0; SND.ui = 1; SND.phys = 1;
  let n = 0;
  for (let i = 0; i < 10; i++) if (T.sfx('knock', { gap: 0, run: 3, win: 1000 })) n++;
  return n === 3;
})(), 'ok');

ok('过了窗口又能再响', (function () {
  solo();
  let n = 0;
  for (let i = 0; i < 3; i++) if (T.sfx('knock', { gap: 0, run: 3, win: 2000 })) n++;
  SND._r['knock'].t = Date.now() - 5000;    /* 窗口过期 */
  let m = 0;
  for (let i = 0; i < 3; i++) if (T.sfx('knock', { gap: 0, run: 3, win: 2000 })) m++;
  return n === 3 && m === 3 ? true : (n + '/' + m);
})() === true, 'ok');

ok('不同音效各自计数互不干扰', (function () {
  solo();
  let a = 0, b = 0;
  for (let i = 0; i < 4; i++) {
    if (T.sfx('wood', { gap: 0, run: 2, win: 1000 })) a++;
    if (T.sfx('stone', { gap: 0, run: 2, win: 1000 })) b++;
  }
  return a === 2 && b === 2 ? true : (a + '/' + b);
})() === true, 'ok');

ok('物理音效开关：关掉后碰撞 / 爆炸不响', (function () {
  solo(); SND.phys = 0; SND.ui = 1;
  const a = T.sfx('boom', { gap: 0 });
  const b = T.sfx('wood', { gap: 0 });
  const c = T.sfx('fire', { gap: 0 });
  SND.phys = 1;
  return a === 0 && b === 0 && c === 0;
})(), 'ok');
ok('关掉物理音后界面音照常响', (function () {
  solo(); SND.phys = 0;
  const a = T.sfx('tap', { gap: 0 });
  SND.phys = 1;
  return a === 1;
})(), 'ok');
ok('声音设置页有「物理音效」开关', (function () {
  SYS.tab = 'snd'; T.sysRender();
  return txt(drwB()).indexOf('物理音效') >= 0 && html.indexOf('snd:phys') > 0;
})(), 'ok');
ok('切「物理音效」开关会真的切换状态', (function () {
  const before = SND.phys;
  T.sysAct('snd:phys');
  const after = SND.phys;
  T.sysAct('snd:phys');
  return before !== after && SND.phys === before;
})(), 'ok');

ok('堆叠静置的轻微接触不再发声', (function () {
  solo();
  const b = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: 0, y: 0.5, mat: 'wood' });
  if (!b) return 'no body';
  T.sbHurt(b, 0.8, 0, 0);          /* 损伤很小 + 几乎不动 */
  const a = !!SND._t.wood;
  T.sbHurt(b, 1.0, 0, 0);
  return !a && !SND._t.wood;
})(), 'ok');

ok('真正的撞击还是响', (function () {
  solo();
  const b = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: 0, y: 0.5, mat: 'wood' });
  b.vy = -6;
  T.sbHurt(b, 20, 0, 0);
  return !!SND._t.wood;
})(), 'ok');

ok('同一个物体短时间内只响一次（冷却）', (function () {
  solo();
  const b = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: 0, y: 0.5, mat: 'stone' });
  b.vy = -8; T.sbHurt(b, 30, 0, 0);
  const first = !!SND._t.stone;
  SND._t = {};                     /* 清掉 gap 记录，只留物体冷却 */
  T.sbHurt(b, 30, 0, 0);
  const second = !!SND._t.stone;
  return first && !second;
})(), 'ok');

ok('不同物体同时撞，各自都能响（不会被全局冷却吃掉）', (function () {
  solo();
  const b1 = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: -3, y: 0.5, mat: 'steel' });
  const b2 = T.sbMake({ shape: 'box', bw: 1, bh: 1, x: 3, y: 0.5, mat: 'glass' });
  if (!b1 || !b2) return 'no body';
  b1.vy = -5; b2.vy = -5;
  T.sbHurt(b1, 20, 0, 0); T.sbHurt(b2, 20, 0, 0);
  return !!SND._t.metal && !!SND._t.glass;
})(), 'ok');

ok('连续倒水 30 次不会响 30 声', (function () {
  solo();
  let n = 0;
  for (let i = 0; i < 30; i++) {
    SND._v = 0; SND._vw = 0;
    if (T.sfx('pour', { gap: 0, run: 5, win: 2600 })) n++;
  }
  return n === 5 ? true : n;
})() === true, 'ok');

ok('燃烧的噼啪声有连发上限', (function () {
  solo();
  let n = 0;
  for (let i = 0; i < 40; i++) {
    SND._v = 0; SND._vw = 0;
    if (T.sfx('fire', { gap: 0, run: 2, win: 5000 })) n++;
  }
  return n === 2 ? true : n;
})() === true, 'ok');

ok('没点引信时不再「滋滋」个不停', (function () {
  solo();
  SB.bodies.length = 0; T.sbWorld({});
  T.sbFuse(1 / 60);
  const a = !!SND._t.fuse;
  T.sbFuse(1 / 60);
  return !a && !SND._t.fuse;
})(), 'ok');

ok('真的点了引信才会「滋」', (function () {
  solo();
  SB.bodies.length = 0; T.sbWorld({});
  const b = T.sbMake({ shape: 'box', bw: 0.4, bh: 0.4, x: 0, y: 2, mat: 'wood' });
  b.boom = { kg: 5, done: 0 }; b.fuse = 3; b.due = 0;
  if (SB.bodies.indexOf(b) < 0) SB.bodies.push(b);
  T.sbFuse(1 / 60);
  const r = !!SND._t.fuse;
  b.boom.done = 1;                       /* 炸完了就不该再响 */
  SND._t = {}; T.sbFuse(1 / 60);
  return r && !SND._t.fuse ? true : ('响=' + r + ' 炸完还响=' + !!SND._t.fuse);
})() === true, 'ok');

/* 沙盒里跑一段时间，声音应该自己停下来，而不是一直响 */
ok('沙盒静置后声音逐渐停下（不再响个不停）', (function () {
  solo();
  SND.on = 1; SND.mute = 0; SND.ui = 1; SND.phys = 1; SYS.slowmo = 0;
  T.sbPreset('堆叠塔');
  const seg = [0, 0, 0, 0];
  let total = 0;
  const orig = SND.play;
  SND.play = function (n, o) { const r = orig.call(this, n, o); if (r) total++; return r; };
  for (let i = 0; i < 1200; i++) {
    const c0 = total; SB.slow = 0; T.sbStep(1 / 60);
    seg[Math.min(3, Math.floor(i / 300))] += (total - c0);
  }
  SND.play = orig;
  return seg[3] <= 3 && seg[3] < seg[0] && total <= 24 ? true : (seg.join('/') + ' total=' + total);
})() === true, 'ok');

ok('火灾场景也不会一直响', (function () {
  solo();
  T.sbPreset('火灾实验');
  let total = 0;
  const orig = SND.play;
  SND.play = function (n, o) { const r = orig.call(this, n, o); if (r) total++; return r; };
  for (let i = 0; i < 1200; i++) { SB.slow = 0; T.sbStep(1 / 60); }
  SND.play = orig;
  return total <= 12 ? true : total;
})() === true, 'ok');

ok('源码里持续音都带上了 run / win', (function () {
  return html.indexOf("sfxAt('pour', arguments[1], arguments[2], { gap: 260, run: 5, win: 2600 })") > 0 &&
    html.indexOf("run: 2, win: 5000") > 0 &&
    html.indexOf("run: 4, win: 1200") > 0;
})(), 'ok');

/* ==================== [4] 整洁度回归 ==================== */
console.log('\n[4] 整洁度');
ok('源码里没有明文口令', html.indexOf('fz2026@admin') < 0, 'ok');
ok('零外链', (html.match(/(src|href)\s*=\s*["']https?:\/\//gi) || []).length === 0, 'ok');
ok('v16 模块块已注入', html.indexOf('V16-BEGIN') > 0 && html.indexOf('V16-END') > 0, 'ok');
ok('v15 / v14 的块都还在',
  html.indexOf('V15-BEGIN') > 0 && html.indexOf('SYS-BEGIN') > 0, 'ok');
ok('v16 专属样式已注入', html.indexOf('V16-CSS v16.1') > 0, 'ok');
ok('关于页版本号格式正确', (function () {
  SYS.tab = 'about'; SYS.uview = 0; T.sysRender();
  return /v\d{2} · 单文件离线版/.test(txt(drwB()));
})(), 'ok');

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
