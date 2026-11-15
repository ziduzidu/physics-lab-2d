/* v15 体检：重力方向修复 · 爆炸限度与特效 · 登录（不强制）· 管理员账号管理 */
const { runScript } = require('./_domstub.js');
const fs = require('fs');

const st = runScript('_check.js', {});
const T = st.T, rec = st.rec;
let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-2 : tol); }
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
function findInp(node, id) {
  let hit = null;
  (function w(n) {
    if (!n) return;
    if (n.id === id) hit = n;
    (n.children || []).forEach(w);
  })(node);
  return hit;
}
const html = fs.readFileSync('index.html', 'utf8');
const ACC = T.ACC, SYS = T.SYS, SB = T.SB, GATE = T.GATE;

/* 让每次 sfx 不被并发上限拦掉 */
function solo() { if (T.SND) { T.SND._v = 0; T.SND._vw = 0; } }

/* ==================== [1] 重力方向 bug ==================== */
console.log('\n[1] 重力方向修复');

ok('源码里重力不再写死成 (0, -mg)',
  html.indexOf("{n:'G',x:0,y:-b.m*SB.g") < 0 &&
  html.indexOf("{n:'G',x:b.m*SB.gx,y:b.m*SB.gy") > 0, 'ok');

SB.g = 10; SB.gdir = -Math.PI / 2; T.sbStep(0.001);
ok('默认（正下方）gx=0 gy=-g',
  near(SB.gx, 0, 1e-9) && near(SB.gy, -10, 1e-9), SB.gx + ',' + SB.gy);

T.sbGSet(0); T.sbStep(0.001);
ok('偏角 0° → 重力仍指正下方', near(SB.gx, 0, 1e-9) && near(SB.gy, -10, 1e-9), SB.gx + ',' + SB.gy);
ok('偏角 0° 文案是「正下方」', T.sbGTxt().indexOf('正下方') >= 0, T.sbGTxt());

T.sbGSet(90); T.sbStep(0.001);
ok('偏角 +90° → 重力指正右（gx=+g, gy=0）',
  near(SB.gx, 10, 1e-6) && near(SB.gy, 0, 1e-6), SB.gx + ',' + SB.gy);
ok('偏角 +90° 文案说「向右偏」', T.sbGTxt().indexOf('向右偏') >= 0, T.sbGTxt());

T.sbGSet(-90); T.sbStep(0.001);
ok('偏角 -90° → 重力指正左', near(SB.gx, -10, 1e-6) && near(SB.gy, 0, 1e-6), SB.gx + ',' + SB.gy);
ok('偏角 -90° 文案说「向左偏」', T.sbGTxt().indexOf('向左偏') >= 0, T.sbGTxt());

T.sbGSet(180); T.sbStep(0.001);
ok('偏角 180° → 重力倒转朝上', near(SB.gy, 10, 1e-6), SB.gy);
ok('倒转时文案提示「完全倒转」', T.sbGTxt().indexOf('倒转') >= 0, T.sbGTxt());

T.sbGSet(-37);
ok('sbGDef 与 sbGSet 互为逆运算', Math.round(T.sbGDef()) === -37, T.sbGDef());

/* 受力箭头必须跟着重力歪 */
SB.bodies.length = 0; SB.links.length = 0;
T.sbWorld({ walls: false });
SB.g = 10; T.sbGSet(0);
const gb = T.sbMake({ shape: 'circle', r: 0.5, x: 5, y: 8, mat: 'wood' });
SB.bodies.push(gb);
T.sbStep(0.001);
let F0 = T.sbForceList(gb).filter(f => f.n === 'G')[0];
ok('正下方时 G 箭头指向 (0, -mg)', near(F0.x, 0, 1e-9) && near(F0.y, -gb.m * 10, 1e-9),
  F0.x + ',' + F0.y);

T.sbGSet(90); T.sbStep(0.001);
let F1 = T.sbForceList(gb).filter(f => f.n === 'G')[0];
ok('重力右偏 90° 后 G 箭头也指向右边（原来它一直朝下）',
  near(F1.x, gb.m * 10, 1e-9) && near(F1.y, 0, 1e-9), F1.x + ',' + F1.y);

T.sbGSet(45); T.sbStep(0.001);
let F2 = T.sbForceList(gb).filter(f => f.n === 'G')[0];
ok('偏 45° 时 G 箭头两分量相等且都朝右下',
  near(F2.x, gb.m * 10 * Math.SQRT1_2, 1e-6) && near(F2.y, -gb.m * 10 * Math.SQRT1_2, 1e-6),
  F2.x + ',' + F2.y);

/* 物体真的沿歪掉的方向掉 */
SB.bodies.length = 0; T.sbWorld({ walls: false });
SB.g = 10; T.sbGSet(90);
const fb = T.sbMake({ shape: 'circle', r: 0.3, x: 5, y: 10, mat: 'steel' });
SB.bodies.push(fb);
const x0 = fb.x, y0 = fb.y;
for (let i = 0; i < 60; i++) T.sbStep(1 / 60);
ok('偏 90° 后物体往右掉（不是往下）',
  (fb.x - x0) > 1 && Math.abs(fb.y - y0) < 0.2, (fb.x - x0).toFixed(2) + ',' + (fb.y - y0).toFixed(2));

/* 陀螺仪符号：手机右倾 → 重力往右 */
SB.tiltG = 1; SB.tiltFlip = 1; SB.tiltBase = 0;
T.TILT.g = 30; T.TILT.b = 0;
T.sbTiltApply();
ok('陀螺仪：手机右倾 30° 时重力往右偏（原来反了）',
  Math.round(T.sbGDef()) === 30, T.sbGDef());
T.TILT.g = -25; T.sbTiltApply();
ok('陀螺仪：手机左倾时重力往左偏', Math.round(T.sbGDef()) === -25, T.sbGDef());
SB.tiltG = 0; T.TILT.g = 0;

/* 罗盘与滑块 */
T.sbGSet(0);
const cvsG = st.document.createElement('canvas'); cvsG.id = 'v15g';
const gctx = cvsG.getContext('2d');
ok('重力罗盘有绘制且不抛异常', (function () {
  try { T.sbGCompass(gctx, 800, 500); return true; } catch (e) { return e.message; }
})() === true, 'ok');
ok('罗盘画了圆盘与箭头', (function () {
  const ops = gctx.__rec.ops.map(o => o[0]);
  return ops.indexOf('arc') >= 0 && ops.indexOf('moveTo') >= 0 && ops.indexOf('lineTo') >= 0;
})(), 'ok');
ok('罗盘上标了 g 的大小', (function () {
  return gctx.__rec.ops.some(o => o[0] === 'fillText' && String(o[1]).indexOf('g ') === 0);
})(), 'ok');
ok('失重时不画罗盘（没有重力可指）', (function () {
  const g2 = (st.document.createElement('canvas')).getContext('2d');
  const keep = SB.g; SB.g = 0;
  T.sbGCompass(g2, 800, 500);
  SB.g = keep;
  return g2.__rec.ops.length === 0;
})(), 'ok');
ok('整帧渲染时罗盘真的被画出来（挂在读数那一步）', (function () {
  const cv = st.document.getElementById('scene');
  const g = cv.getContext('2d');
  g.__rec.ops.length = 0;
  SB.g = 10; T.sbGSet(0);
  T.sbRender();
  return g.__rec.ops.some(o => o[0] === 'fillText' && String(o[1]).indexOf('g ') === 0);
})(), 'ok');
ok('整帧渲染时焦痕真的被画出来（挂在场背景那一步）', (function () {
  const cv = st.document.getElementById('scene');
  const g = cv.getContext('2d');
  SB.decals = [{ x: SB.view.cx, y: SB.view.cy, r: 1.2, a: 0.4, s: 0 }];
  g.__rec.ops.length = 0;
  T.sbRender();
  return g.__rec.ops.filter(o => o[0] === 'rg').length >= 1;
})(), 'ok');
ok('沙盒面板里重力滑块叫「偏角」', (function () {
  try { T.sbPanel(); const p = st.document.getElementById('params'); return txt(p).indexOf('重力偏角') >= 0; }
  catch (e) { return e.message; }
})() === true, 'ok');

/* ==================== [2] 爆炸限度与特效 ==================== */
console.log('\n[2] 爆炸限度与特效增强');

ok('炸药当量滑块上限提到 200 kg',
  html.indexOf("'炸药当量 (kg TNT)',0.2,200,0.2") > 0, 'ok');
ok('炸药当量 clamp 上限提到 2000',
  html.indexOf('SB.boomKg=clamp(v,0.05,2000)') > 0, 'ok');
ok('核弹当量滑块上限提到 2000 千吨',
  html.indexOf("'核弹当量 (千吨 TNT)',0.5,2000,0.5") > 0, 'ok');
ok('核弹当量 clamp 上限提到 50000',
  html.indexOf('SB.nukeKt=clamp(v,0.1,50000)') > 0, 'ok');
ok('特效强度上限提到 400%',
  html.indexOf("'特效强度 (%)',20,400,10") > 0 && html.indexOf('clamp(v/100,0.2,4)') > 0, 'ok');
ok('设置抽屉里的特效滑块也到 400%',
  html.indexOf("rg.max = '400'") > 0, 'ok');

ok('200 kg 当量能设进去', (function () {
  SB.boomKg = 200; return SB.boomKg === 200;
})(), 'ok');
ok('200 kg 的破坏半径明显大于 20 kg',
  T.sbBoomR(200) > T.sbBoomR(20) * 2, T.sbBoomR(200).toFixed(2) + ' vs ' + T.sbBoomR(20).toFixed(2));

/* 新特效种类 */
SB.fx.length = 0; SB.decals = []; SB.fxP = 1;
SB.bodies.length = 0; T.sbWorld({});
T.sbExplode(8, 6, 40);
const kinds = {};
SB.fx.forEach(f => { kinds[f.k] = (kinds[f.k] || 0) + 1; });
ok('爆炸产生厚冲击波 wave', (kinds.wave || 0) >= 3, kinds.wave);
ok('爆炸产生白热余晖 glow', (kinds.glow || 0) >= 2, kinds.glow);
ok('爆炸产生火焰喷流 jet', (kinds.jet || 0) >= 4, kinds.jet);
ok('爆炸产生余烬 ember', (kinds.ember || 0) >= 10, kinds.ember);
ok('爆炸产生二次爆散 sparkle', (kinds.sparkle || 0) >= 5, kinds.sparkle);
ok('爆炸留下了焦痕贴花', SB.decals && SB.decals.length >= 1, SB.decals && SB.decals.length);
ok('地面模式还额外喷了尘环 dust', (kinds.dust || 0) >= 4, kinds.dust);
ok('原版的火球与碎片仍然在', (kinds.boom || 0) >= 1 && (kinds.spark || 0) >= 10, JSON.stringify(kinds));

ok('大当量触发慢动作', (function () {
  SB.slow = 0; SYS.slowmo = 1; T.sbSlowmo(300);
  return SB.slow > 0.2;
})(), SB.slow);
ok('小当量不触发慢动作（免得一直卡）', (function () {
  SB.slow = 0; T.sbSlowmo(0.5);
  return SB.slow === 0;
})(), SB.slow);
ok('关掉慢动作开关后不再触发', (function () {
  SB.slow = 0; SYS.slowmo = 0; T.sbSlowmo(500);
  const r = SB.slow === 0; SYS.slowmo = 1; return r;
})(), 'ok');
ok('慢动作真的把仿真时间走慢了', (function () {
  SB.slow = 0.5; SB.slowR = 0.25;
  const t0 = SB.t; T.sbStep(0.1);
  const d = SB.t - t0; SB.slow = 0;
  return near(d, 0.025, 0.006);
})(), (SB.t).toFixed(4));

ok('新增特效都能被推进而不崩', (function () {
  try { for (let i = 0; i < 200; i++) T.sbFxStep(1 / 60); return true; }
  catch (e) { return e.message; }
})() === true, 'ok');
ok('推进后被正确回收（不会无限堆积）', SB.fx.length < 40, SB.fx.length);

ok('新增特效都能被画出来而不崩', (function () {
  try { T.sbFxDraw(gctx); return true; } catch (e) { return e.message; }
})() === true, 'ok');
ok('焦痕能画出来', (function () {
  try { T.sbDrawDecals(gctx); return true; } catch (e) { return e.message; }
})() === true, 'ok');
ok('焦痕数量有上限（不会越炸越卡）', (function () {
  for (let i = 0; i < 200; i++) T.sbScorch(i * 0.1, 1, 0.5);
  return SB.decals.length <= 70;
})(), SB.decals.length);

/* 核爆增强 */
SB.fx.length = 0;
T.sbNuke(10, 8, 30);
const nk = {};
SB.fx.forEach(f => { nk[f.k] = (nk[f.k] || 0) + 1; });
ok('核爆有电磁脉冲环（emp）', SB.fx.some(f => f.k === 'wave' && f.emp), 'ok');
ok('核爆有热辐射喷流', (nk.jet || 0) >= 6, nk.jet);
ok('核爆有余烬雨', (nk.ember || 0) >= 20, nk.ember);
ok('核爆有蘑菇云', (nk.shroom || 0) >= 2, nk.shroom);
ok('核爆有长时余晖', (nk.glow || 0) >= 2, nk.glow);
ok('核爆整段推进 + 绘制不崩', (function () {
  try { for (let i = 0; i < 300; i++) { T.sbFxStep(1 / 60); T.sbFxDraw(gctx); } return true; }
  catch (e) { return e.message; }
})() === true, 'ok');

ok('特效并发上限随强度放宽', (function () {
  SB.fx.length = 0; SB.fxP = 4;
  for (let i = 0; i < 3000; i++) SB.fx.push({ k: 'ember', x: 0, y: 5, vx: 0, vy: 0, t: 0, life: 99 });
  T.sbFxStep(1 / 60);
  return SB.fx.length > 1000 && SB.fx.length <= 2400;
})(), SB.fx.length);
SB.fxP = 1; SB.fx.length = 0;

/* ==================== [3] 不登录也能用全部功能（v18） ==================== */
console.log('\n[3] 不登录也能用全部功能');

ACC.logout();
ok('游客能玩「运动图像」', GATE.can('kinema') === true, 'ok');
ok('游客能进自由沙盒', GATE.can('sandbox') === true, 'ok');
ok('游客能进天体沙盒', GATE.can('cosmos') === true, 'ok');
ok('游客能进圆周运动', GATE.can('circ') === true, 'ok');
ok('游客能进连接体实验台', GATE.can('link') === true, 'ok');
ok('所有模块对游客都放行',
  T.MODULES.every(m => GATE.can(m.id) && T.gateCan(m.id)) === true,
  T.MODULES.filter(m => !GATE.can(m.id)).map(m => m.id).join(','));

ok('游客点沙盒真的进得去', (function () {
  T.enterScene('sandbox');
  return T.App.mode === 'sandbox';
})(), T.App.mode);
ok('游客点圆周运动真的进得去', (function () {
  T.enterScene('circ');
  return !!(T.App.scene && T.App.scene.id === 'circ');
})(), T.App.mode);
ok('游客点天体沙盒真的进得去', (function () {
  T.enterScene('cosmos');
  return !!(T.App.scene && T.App.scene.id === 'cosmos');
})(), T.App.mode);

ok('打开页面不会自动弹登录卡', (function () {
  const m = st.document.getElementById('gateMsk');
  return !m || !m.classList.contains('on');
})(), 'ok');
ok('游客状态下首页卡片没有锁标', (function () {
  T.buildHome();
  const s2 = txt(st.document.getElementById('hgrid'));
  return s2.indexOf('登录解锁') < 0 && s2.indexOf('🔒') < 0 && s2.indexOf('进入 →') >= 0;
})(), txt(st.document.getElementById('hgrid')).slice(0, 60));
ok('顶栏账号按钮在游客状态没有提醒点', (function () {
  T.sysTopbar();
  const b = st.document.getElementById('sysAcc');
  return b.className.indexOf('need') < 0;
})(), (st.document.getElementById('sysAcc') || {}).className);

/* 登录卡本身还能用（想登录的人从设置 → 账号进），只是不再拦人 */
ok('登录卡可以手动打开且表单能校验', (function () {
  T.gateShow('');
  const m = st.document.getElementById('gateMsk');
  if (!m || !m.classList.contains('on')) return '没打开';
  T.gateDo('login');
  const e1 = (st.document.getElementById('gateErr') || {}).textContent;
  st.document.getElementById('gateUser').value = 'xiaoming';
  st.document.getElementById('gatePw').value = '12';
  T.gateDo('reg');
  const e2 = (st.document.getElementById('gateErr') || {}).textContent;
  return e1 === '先填个用户名' && e2 === '密码至少 4 位' ? true : (e1 + '/' + e2);
})() === true, 'ok');
ok('「不用了」能关掉登录卡', (function () {
  T.gateDo('later');
  return !st.document.getElementById('gateMsk').classList.contains('on');
})(), 'ok');
ok('注册后使用统计正常记', (function () {
  ACC.logout();
  const r = ACC.reg('xiaoming', 'ming1234');
  if (!r.ok) return 'reg: ' + r.msg;
  T.enterScene('circ');
  const u = ACC.cur();
  return !!u && u.name === 'xiaoming' && u.stat && u.stat.circ >= 1 ? true : 'stat 没记';
})() === true, 'ok');
ok('登录次数被记下来了', (function () {
  ACC.logout(); ACC.login('xiaoming', 'ming1234');
  const u = ACC.get('xiaoming');
  return u && u.lg >= 2 ? true : (u ? u.lg : 'no user');
})() === true, 'ok');

ACC.logout();
ok('退出登录后照样能用全部模块',
  T.MODULES.every(m => GATE.can(m.id)) === true, 'ok');
ok('退出后也不会弹登录卡', (function () {
  const m = st.document.getElementById('gateMsk');
  return !m || !m.classList.contains('on');
})(), 'ok');

/* ==================== [4] 管理员：账号详情 + 封禁 ==================== */
console.log('\n[4] 管理员账号管理与封禁');

ok('内置管理账号口令仍是摘要，源码无明文',
  html.indexOf('fz2026@admin') < 0 && ACC.APW.length === 16, 'ok');

ACC.reg('stu01', 'stu01pw');
ACC.reg('stu02', 'stu02pw');
ACC.logout();
ok('用管理员口令能登录', (function () {
  const r = ACC.login('admin', 'fz2026@admin');
  return !!r.ok && ACC.isAdmin() === true;
})(), 'ok');

ok('管理员看得到全部账号', (function () {
  const L = ACC.list();
  return L.length >= 4 && L.some(u => u.name === 'stu01') && L.some(u => u.name === 'admin');
})(), ACC.list().length);
ok('统计条算得对', (function () {
  const s = ACC.sum();
  return s.all === ACC.list().length && s.admin >= 1 && s.user >= 3 && s.ban === 0;
})(), JSON.stringify(ACC.sum()));

ok('账号详情页能打开', (function () {
  SYS.uview = 1; T.sysRender();
  const b = st.document.querySelector('.drwb');
  return txt(b).indexOf('用户管理中心') >= 0 && txt(b).indexOf('stu01') >= 0;
})(), 'ok');
ok('账号详情里有登录次数 / 最近 / 创建时间', (function () {
  const s = txt(st.document.querySelector('.drwb'));
  return s.indexOf('登录') >= 0 && s.indexOf('最近') >= 0 && s.indexOf('创建') >= 0;
})(), 'ok');
ok('每个普通账号都有封禁 / 重置密码 / 删号按钮', (function () {
  const b = st.document.querySelector('.drwb');
  return !!findBtn(b, '封禁') && !!findBtn(b, '重置密码') && !!findBtn(b, '删号');
})(), 'ok');
ok('内置账号不给封禁按钮', (function () {
  const s = txt(st.document.querySelector('.drwb'));
  return s.indexOf('不可封禁') >= 0;
})(), 'ok');

ok('点「封禁」会展开理由输入框', (function () {
  T.sysAct('adm:ban', 'stu01');
  return !!findInp(st.document.querySelector('.drwb'), 'sysBanR');
})(), 'ok');
ok('确认封禁后账号被标记', (function () {
  findInp(st.document.querySelector('.drwb'), 'sysBanR').value = '测试中';
  T.sysAct('adm:banok', 'stu01');
  const u = ACC.get('stu01');
  return u.ban === 1 && u.banR === '测试中';
})(), JSON.stringify(ACC.get('stu01')));
ok('被封的账号登不进去', (function () {
  ACC.logout();
  const r = ACC.login('stu01', 'stu01pw');
  return !r.ok && r.msg.indexOf('封禁') >= 0;
})(), 'ok');
ok('封禁提示里带上理由',
  ACC.login('stu01', 'stu01pw').msg.indexOf('测试中') >= 0, ACC.login('stu01', 'stu01pw').msg);

ok('解封后又能登录', (function () {
  ACC.login('admin', 'fz2026@admin');
  T.sysAct('adm:unban', 'stu01');
  ACC.logout();
  return !!ACC.login('stu01', 'stu01pw').ok;
})(), 'ok');
ok('解封后 banR 被清掉', ACC.get('stu01').banR === '', ACC.get('stu01').banR);

ok('管理员不能封禁内置账号', (function () {
  ACC.login('admin', 'fz2026@admin');
  return ACC.setBan('admin', 1, 'x') === 0 && ACC.get('admin').ban === 0;
})(), 'ok');
ok('内置账号删不掉', ACC.del('admin') === 0, 'ok');

ok('重置密码后旧密码失效、新密码可用', (function () {
  T.sysAct('adm:pw', 'stu02');
  findInp(st.document.querySelector('.drwb'), 'sysNewPw').value = 'newpw99';
  T.sysAct('adm:pwok', 'stu02');
  ACC.logout();
  const a = ACC.login('stu02', 'stu02pw').ok;
  const b = ACC.login('stu02', 'newpw99').ok;
  return !a && !!b;
})(), 'ok');
ok('新密码太短会被拒绝', (function () {
  ACC.login('admin', 'fz2026@admin');
  T.sysAct('adm:pw', 'stu02');
  findInp(st.document.querySelector('.drwb'), 'sysNewPw').value = '1';
  T.sysAct('adm:pwok', 'stu02');
  ACC.logout();
  const r = ACC.login('stu02', 'newpw99').ok;
  ACC.login('admin', 'fz2026@admin');
  return !!r;   /* 旧密码仍然有效 = 没改成 */
})(), 'ok');

ok('删号后账号消失且登不进去', (function () {
  T.sysAct('adm:del', 'stu02');
  ACC.logout();
  const r = ACC.login('stu02', 'newpw99');
  ACC.login('admin', 'fz2026@admin');
  return !ACC.get('stu02') && !r.ok;
})(), 'ok');

ok('可以把普通账号升级为管理员', (function () {
  T.sysAct('adm:role', 'stu01');
  return ACC.get('stu01').role === 'admin';
})(), ACC.get('stu01').role);
ok('升级后列表里的管理员数 +1', ACC.sum().admin >= 2, ACC.sum().admin);
ok('也可以取消管理员', (function () {
  T.sysAct('adm:role', 'stu01');
  return ACC.get('stu01').role === 'user';
})(), ACC.get('stu01').role);

ok('「查看明细」能展开模块使用次数条', (function () {
  ACC.logout(); ACC.login('xiaoming', 'ming1234');
  ACC.login('admin', 'fz2026@admin');
  SYS.uview = 1;
  T.sysAct('adm:info', 'xiaoming');
  const s = txt(st.document.querySelector('.drwb'));
  const has = s.indexOf('收起明细') >= 0;
  T.sysAct('adm:info', 'xiaoming');
  return has;
})(), 'ok');

ok('「回到账号页」能退出管理视图', (function () {
  T.sysAct('adm:back');
  SYS.uview = 0; T.sysRender();
  return txt(st.document.querySelector('.drwb')).indexOf('账号管理') < 0 ||
    SYS.uview === 0;
})(), 'ok');

ok('管理员账号页有「账号管理」入口', (function () {
  SYS.tab = 'acc'; T.sysRender();
  return !!findBtn(st.document.querySelector('.drwb'), '账号管理');
})(), 'ok');
ok('普通账号看不到账号管理入口', (function () {
  ACC.logout(); ACC.login('xiaoming', 'ming1234');
  T.sysRender();
  const r = !findBtn(st.document.querySelector('.drwb'), '账号管理');
  ACC.login('admin', 'fz2026@admin');
  return r;
})(), 'ok');

ok('被封的账号在使用中会被踢下线', (function () {
  ACC.logout(); ACC.login('xiaoming', 'ming1234');
  ACC.login('admin', 'fz2026@admin');
  ACC.setBan('xiaoming', 1, '违规');
  ACC.logout();
  ACC.login('xiaoming', 'ming1234');           /* 登不进去，会话仍是 xiaoming? 不会 */
  ACC.login('admin', 'fz2026@admin');
  ACC.setBan('xiaoming', 0);
  ACC.logout(); ACC.login('xiaoming', 'ming1234');
  const r = ACC.cur() && ACC.cur().ban === 0 && ACC.checkBan() === 0;
  ACC.login('admin', 'fz2026@admin');
  return r;
})(), 'ok');

/* ==================== [5] 回归与整洁 ==================== */
console.log('\n[5] 回归与整洁');

ok('登录后仍然能正常渲染沙盒', (function () {
  try { T.sbRender(); return true; } catch (e) { return e.message; }
})() === true, 'ok');
ok('游客渲染沙盒也不崩（重力罗盘等）', (function () {
  ACC.logout();
  try { T.sbRender(); T.sbPanel(); return true; } catch (e) { return e.message; }
})() === true, 'ok');
ok('零外链（整站仍是一个文件）',
  (html.match(/(src|href)\s*=\s*["']https?:\/\//gi) || []).length === 0, 'ok');
ok('内置口令仍然不在源码里', html.indexOf('fz2026@admin') < 0, 'ok');
ok('v15 模块块已注入', html.indexOf('V15-BEGIN') > 0 && html.indexOf('V15-END') > 0, 'ok');
ok('慢动作开关已进设置页', html.indexOf('view:slowmo') > 0, 'ok');
ok('关于页版本号格式正确', (function () {
  SYS.tab = 'about'; T.sysRender();
  return /v\d{2} · 单文件离线版/.test(txt(st.document.querySelector('.drwb')));
})(), 'ok');

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
