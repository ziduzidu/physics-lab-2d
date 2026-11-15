/* ==================================================================
   v15：重力方向修复 · 爆炸与特效增强 · 强制登录门禁 · 管理员账号管理
   ================================================================== */

/* ==================================================================
   一、重力方向：受力箭头 / 罗盘 / 陀螺仪符号
   ================================================================== */

/* 重力相对"正下方"的偏角（°）：0=正下方，正=向右偏 */
function sbGDef() {
  var d = (SB.gdir + Math.PI / 2) * 180 / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
function sbGSet(v) {
  var d = ((((v + 180) % 360) + 360) % 360) - 180;
  SB.gdir = -Math.PI / 2 + d * Math.PI / 180;
  SB.tiltG = 0; sbUnTilt();
}
function sbGTxt() {
  var d = sbGDef(), a = Math.round(Math.abs(d));
  if (Math.abs(d) < 3) return '↓ 正下方';
  if (Math.abs(Math.abs(d) - 180) < 3) return '↑ 完全倒转（失重天花板）';
  return (d > 0 ? ('向右偏 ' + a + '°') : ('向左偏 ' + a + '°'));
}
/* 受力箭头：原版把重力写死成"世界系正下方"，改了重力方向后箭头不跟着歪，这里纠正 */
var _sbForceListV15 = sbForceList;
sbForceList = function (b) {
  var L = _sbForceListV15(b), i;
  for (i = 0; i < L.length; i++) {
    if (L[i].n === 'G') {
      L[i].x = b.m * SB.gx;
      L[i].y = b.m * SB.gy;
    }
  }
  return L;
};
/* 陀螺仪：原来符号写反了，手机右倾重力却往左跑 */
var _sbTiltApplyV15 = sbTiltApply;
sbTiltApply = function () {
  if (!SB.tiltG) return;
  var r = sbTiltRoll();
  if (SB.tiltBase === null) SB.tiltBase = r;
  var d = (r - SB.tiltBase);
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  SB.gdir = -Math.PI / 2 + SB.tiltFlip * d * Math.PI / 180;
  if (typeof _sbTiltApplyV15 === 'function' && _sbTiltApplyV15 !== sbTiltApply) { /* 已完全接管 */ }
};

/* 重力罗盘：右下角一个小仪表，箭头永远指着"真实的下面" */
function sbGCompass(g, W, H) {
  if (!SB.g || SB.g <= 0.001) return;
  var R = 23, cx = W - R - 16, cy = H - R - 16;
  g.save();
  g.beginPath(); g.arc(cx, cy, R + 5, 0, Math.PI * 2);
  g.fillStyle = (SB.dark ? 'rgba(10,17,33,.62)' : 'rgba(255,255,255,.62)'); g.fill();
  g.strokeStyle = 'rgba(148,178,230,.30)'; g.lineWidth = 1; g.stroke();
  /* 水平参照线 */
  g.strokeStyle = 'rgba(148,178,230,.26)';
  g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
  /* 刻度 */
  var i, a2;
  g.strokeStyle = 'rgba(148,178,230,.22)';
  for (i = 0; i < 12; i++) {
    a2 = i / 12 * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a2) * (R - 3), cy + Math.sin(a2) * (R - 3));
    g.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
    g.stroke();
  }
  /* 重力方向箭头（世界 y 向上 → 屏幕 y 向下） */
  var ux = SB.gx, uy = SB.gy, m = Math.sqrt(ux * ux + uy * uy) || 1;
  ux /= m; uy /= m;
  var ex = cx + ux * (R - 5), ey = cy - uy * (R - 5);
  g.strokeStyle = '#dc2626'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
  g.fillStyle = '#dc2626';
  g.beginPath();
  g.moveTo(ex + ux * 5, ey - uy * 5);
  g.lineTo(ex - uy * 4, ey - ux * 4);
  g.lineTo(ex + uy * 4, ey + ux * 4);
  g.closePath(); g.fill();
  g.lineCap = 'butt';
  g.beginPath(); g.arc(cx, cy, 2.6, 0, Math.PI * 2); g.fillStyle = '#dc2626'; g.fill();
  g.font = '600 10px system-ui,-apple-system,Segoe UI,sans-serif';
  g.fillStyle = (SB.dark ? 'rgba(226,232,240,.9)' : '#475569');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('g ' + Math.round(SB.g), cx, cy + R + 12);
  g.restore();
}

/* ==================================================================
   二、爆炸限度与特效增强
   ================================================================== */
function sbFxN2(n) {
  var p = SB.fxP;
  if (p === undefined || !isFinite(p)) p = 1;
  return Math.max(1, Math.round(n * Math.min(Math.max(p, 0.2), 4)));
}
/* 焦痕：世界坐标的持久贴花，画在最底层 */
function sbScorch(x, y, r) {
  if (!SB.decals) SB.decals = [];
  SB.decals.push({ x: x, y: y, r: r, a: 0.42, s: Math.random() * 6.28 });
  if (SB.decals.length > 70) SB.decals.splice(0, SB.decals.length - 70);
}
function sbDrawDecals(g) {
  if (!SB.decals || !SB.decals.length) return;
  var i, d, X, Y, R, gr;
  g.save();
  for (i = 0; i < SB.decals.length; i++) {
    d = SB.decals[i];
    X = sbX(d.x); Y = sbY(d.y); R = Math.max(d.r * SB.view.s, 1);
    if (X < -R || X > SB.view.W + R || Y < -R || Y > SB.view.H + R) continue;
    gr = g.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, 'rgba(24,18,15,' + (d.a * 0.95) + ')');
    gr.addColorStop(0.55, 'rgba(46,32,24,' + (d.a * 0.6) + ')');
    gr.addColorStop(1, 'rgba(60,44,32,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(X, Y, R, R * 0.42, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
/* 大爆炸的短暂子弹时间 */
function sbSlowmo(kg) {
  if (!SYS.slowmo) return;
  var k = Math.max(kg, 0.05);
  if (k < 6) return;
  var dur = Math.min(0.55, 0.16 + Math.log10(k / 5) * 0.34);
  SB.slow = Math.max(SB.slow || 0, dur);
  SB.slowR = Math.max(0.22, 0.5 - Math.min(0.24, Math.log10(k / 5) * 0.13));
}
var _sbStepV15 = sbStep;
sbStep = function (dt) {
  var d = dt;
  if (SB.slow > 0) { SB.slow -= dt; d = dt * (SB.slowR || 0.4); }
  else SB.slow = 0;
  _sbStepV15(d);
};

/* 在原有爆炸之上加一整套分层特效（不改动原物理冲量，只加视觉） */
function sbBoomPlus(x, y, kg, R) {
  R = R || sbBoomR(kg);
  var P = Math.pow(Math.max(kg, 0.05), 0.34), i, a0, s0;
  /* 白热核心 → 两层余晖 */
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 0.55, t: 0, life: 0.26 + 0.18 * Math.min(1, P / 3), hot: 1 });
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 1.7, t: 0, life: 0.85 + 0.7 * Math.min(1, P / 4) });
  /* 三道厚冲击波：快而薄 → 慢而宽 */
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 1.20, t: 0, life: 0.40, w: 0.9 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 1.95, t: 0, life: 0.88, w: 1.8 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 3.00, t: 0, life: 1.60, w: 2.8 });
  /* 火焰喷流：沿几个方向甩出去 */
  var nj = Math.max(4, Math.round(7 * Math.min(Math.max(SB.fxP || 1, 0.2), 4)));
  for (i = 0; i < nj; i++) {
    a0 = i / nj * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    s0 = (5 + Math.random() * 11) * P;
    SB.fx.push({
      k: 'jet', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 1.2,
      t: 0, life: 0.15 + Math.random() * 0.2, r0: R * 0.34
    });
  }
  /* 余烬：慢落、带余温的小火星 */
  var ne = sbFxN2(12 + Math.min(70, Math.round(kg * 4)));
  for (i = 0; i < ne; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (3 + Math.random() * 13) * P;
    SB.fx.push({
      k: 'ember', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 3,
      t: 0, life: 1.1 + Math.random() * 2.2, ph: Math.random() * 6.28
    });
  }
  /* 二次爆散：延迟一小会儿再向外飞，像礼花 */
  var nk = sbFxN2(5 + Math.min(34, Math.round(kg * 2)));
  for (i = 0; i < nk; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (2 + Math.random() * 7) * P;
    SB.fx.push({
      k: 'sparkle', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 2,
      t: 0, life: 0.7 + Math.random() * 0.9, d0: 0.10 + Math.random() * 0.34,
      c: (Math.random() < 0.5 ? '#fff7cc' : '#fdba74')
    });
  }
  /* 地面尘环 + 焦痕 */
  sbScorch(x, y, R * 1.05);
  if (SB.env === 'ground') {
    var nd = sbFxN2(9);
    for (i = 0; i < nd; i++) {
      var sgn = (i % 2) ? 1 : -1;
      SB.fx.push({
        k: 'dust', x: x + sgn * (0.2 + Math.random() * 0.6), y: y + 0.1,
        vx: sgn * (3 + Math.random() * 7) * P, vy: 0.4 + Math.random() * 1.4,
        t: 0, life: 0.8 + Math.random() * 0.7, r: 0.22 + Math.random() * 0.3
      });
    }
  }
  sbSlowmo(kg);
}
/* 核爆之上再叠一层：电磁脉冲环 + 热辐射线 + 余晖 + 余烬雨 */
function sbNukePlus(x, y, kt) {
  var R = sbNukeR(kt), i, a0, s0;
  var P = Math.pow(Math.max(kt, 0.02), 0.42);
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 0.9, t: 0, life: 0.5, hot: 1 });
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 3.4, t: 0, life: 2.6 });
  /* 电磁脉冲环（偏冷色，扩得极快） */
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 6.5, t: 0, life: 1.5, w: 3.4, emp: 1 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 4.2, t: 0, life: 2.2, w: 2.2 });
  /* 热辐射线：从爆心向外的放射亮线 */
  var nr = Math.max(6, Math.round(10 * Math.min(Math.max(SB.fxP || 1, 0.2), 4)));
  for (i = 0; i < nr; i++) {
    a0 = i / nr * Math.PI * 2 + Math.random() * 0.2;
    SB.fx.push({
      k: 'jet', x: x, y: y, vx: Math.cos(a0) * (16 + Math.random() * 12) * (0.6 + P * 0.2),
      vy: Math.sin(a0) * (16 + Math.random() * 12) * (0.6 + P * 0.2),
      t: 0, life: 0.22 + Math.random() * 0.18, r0: R * 0.5
    });
  }
  /* 余烬雨 */
  var ne = sbFxN2(26 + Math.min(90, Math.round(kt * 1.4)));
  for (i = 0; i < ne; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (2 + Math.random() * 16) * (0.6 + P * 0.3);
    SB.fx.push({
      k: 'ember', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 6,
      t: 0, life: 2.0 + Math.random() * 3.2, ph: Math.random() * 6.28
    });
  }
  sbScorch(x, y, R * 1.5);
  sbSlowmo(kt * 60);
}
var _sbExplodeV15 = sbExplode;
sbExplode = function (x, y, kg, R) {
  var r = _sbExplodeV15.apply(null, arguments);
  try { sbBoomPlus(x, y, kg, R || sbBoomR(kg)); } catch (e) { }
  return r;
};
var _sbNukeV15 = sbNuke;
sbNuke = function (x, y, kt) {
  var r = _sbNukeV15.apply(null, arguments);
  try { sbNukePlus(x, y, kt); } catch (e) { }
  return r;
};

/* 渲染挂钩：焦痕画在网格之上、液体与刚体之下；重力罗盘画在读数那一步（不受震动影响） */
var _sbDrawFieldV15 = sbDrawField;
sbDrawField = function (g, W, H) {
  try { if (SB.decals && SB.decals.length) sbDrawDecals(g); } catch (e) { }
  return _sbDrawFieldV15.apply(null, arguments);
};
var _sbReadoutV15 = sbReadout;
sbReadout = function () {
  var r = _sbReadoutV15.apply(null, arguments);
  try {
    var cv = $('#scene');
    if (cv) sbGCompass(cv.getContext('2d'), SB.view.W, SB.view.H);
  } catch (e) { }
  return r;
};

/* ==================================================================
   三、账号 v2：统计 / 封禁 / 管理员管理
   ================================================================== */
var _accRegV15 = ACC.reg, _accLoginV15 = ACC.login, _accCurV15 = ACC.cur;

ACC.mk = function (name, pw, role) {
  var salt = accSalt();
  return {
    name: name, pw: accHash(pw, salt), role: role || 'user', salt: salt,
    ct: Date.now(), lt: 0, lg: 0, ban: 0, banR: '', banT: 0, sc: '', stat: {}, note: ''
  };
};
ACC.reg = function (name, pw) {
  var r = _accRegV15.call(this, name, pw);
  if (r.ok) {
    var u = this.get(name);
    if (u) { u.lt = Date.now(); u.lg = 1; u.ct = u.ct || Date.now(); if (!u.stat) u.stat = {}; this.save(); }
    gateAfter();
  }
  return r;
};
ACC.login = function (name, pw) {
  var u = this.get(name);
  if (u && u.ban) return { ok: 0, msg: '这个账号已被封禁' + (u.banR ? ('（' + u.banR + '）') : '') };
  var r = _accLoginV15.apply(this, arguments);
  if (r.ok && u) {
    u.lt = Date.now(); u.lg = (u.lg || 0) + 1;
    if (!u.stat) u.stat = {};
    this.save();
    gateAfter();
  }
  return r;
};
/* 每次进入一个模块记一笔，管理员能看到大家都在玩什么 */
ACC.touch = function (id) {
  var u = this.cur();
  if (!u || !id) return;
  u.sc = id; u.lt = Date.now();
  if (!u.stat) u.stat = {};
  u.stat[id] = (u.stat[id] || 0) + 1;
  this.save();
};
ACC.checkBan = function () {
  var u = this.cur();
  if (!u) return 0;
  if (u.ban) {
    this.logout();
    try { sfx('err'); } catch (e) { }
    try { sbToast('账号已被封禁' + (u.banR ? ('：' + u.banR) : '')); } catch (e2) { }
    return 1;
  }
  return 0;
};
ACC.list = function () {
  this.load();
  var out = [], k;
  for (k in this.users) if (Object.prototype.hasOwnProperty.call(this.users, k)) out.push(this.users[k]);
  out.sort(function (a, b) { return (b.ct || 0) - (a.ct || 0); });
  return out;
};
ACC.setBan = function (n, on, reason) {
  var u = this.get(n);
  if (!u || u.role === 'admin') return 0;      /* 内置管理员不可封禁 */
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  this.save();
  return 1;
};
ACC.del = function (n) {
  var k = String(n || '').toLowerCase();
  if (k === 'admin') return 0;
  this.load();
  if (!this.users[k]) return 0;
  delete this.users[k];
  if (this.sess && this.sess.toLowerCase() === k) this.logout();
  this.save();
  return 1;
};
ACC.setRole = function (n, role) {
  var u = this.get(n);
  if (!u) return 0;
  u.role = (role === 'admin') ? 'admin' : 'user';
  this.save();
  return 1;
};
ACC.setPw = function (n, pw) {
  var u = this.get(n);
  if (!u || String(pw || '').length < 4) return 0;
  u.salt = accSalt(); u.pw = accHash(String(pw), u.salt);
  this.save();
  return 1;
};
ACC.sum = function () {
  var L = this.list(), i, s = { all: L.length, admin: 0, user: 0, ban: 0, today: 0 };
  var d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (i = 0; i < L.length; i++) {
    if (L[i].role === 'admin') s.admin++; else s.user++;
    if (L[i].ban) s.ban++;
    if ((L[i].lt || 0) >= d0.getTime()) s.today++;
  }
  return s;
};

/* ==================================================================
   四、登录（不再强制）：任何人打开就能用全部模块，
   登录只用来保存个人设置、参与反馈、领取管理员授权。
   ================================================================== */
var GATE = {
  FREE: [],                          /* v18：取消强制登录，不再有只能游客试用的模块 */
  want: '',
  built: 0,
  can: function (id) { return true; },
  closed: 1                          /* 已不再自动弹登录卡 */
};
/* 首页卡片在脚本初始化时就会渲染，那时 GATE 还没赋值；用函数声明保证它一定存在 */
function gateCan(id) { return true; }
function gateBuild() {
  if (GATE.built) return;
  if (document.getElementById('gateMsk')) { GATE.built = 1; return; }
  GATE.built = 1;
  var m = document.createElement('div');
  m.id = 'gateMsk'; m.className = 'msk gmsk';
  m.innerHTML = '<div class="gcard" id="gateCard"></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function (e) {
    if (e.target === m) gateClose();
  });
  document.addEventListener('keydown', function (e) {
    var mm = document.getElementById('gateMsk');
    if (e.key === 'Escape' && mm && mm.classList.contains('on')) gateClose();
  });
}
function gateShow(why, want) {
  gateBuild();
  GATE.want = want || '';
  var m = document.getElementById('gateMsk');
  if (!m) return;
  gateRender(why);
  m.classList.add('on');
  try { sfx('open'); } catch (e) { }
  setTimeout(function () {
    var u = document.getElementById('gateUser');
    if (u && !('ontouchstart' in window)) u.focus();
  }, 260);
}
function gateClose() {
  var m = document.getElementById('gateMsk');
  if (m) m.classList.remove('on');
  GATE.closed++;
  try { sfx('close'); } catch (e) { }
}
function gateRender(why) {
  var c = document.getElementById('gateCard');
  if (!c) return;
  c.innerHTML =
    '<div class="glogo">' + (typeof ICO !== 'undefined' && ICO.logo ? ICO.logo : '物') + '</div>' +
    '<div class="gtitle">登录（可选）</div>' +
    '<div class="gsub">' + (why ? ('「' + why + '」<br>') : '') +
    '不登录也能用全部功能。登录后会保存你的个人设置、使用记录，' +
    '也可以提交反馈让管理员看到。</div>' +
    '<div class="gf"><label>用户名</label><input id="gateUser" class="ginp" placeholder="2~16 字，中英文数字" autocomplete="username"></div>' +
    '<div class="gf"><label>密码</label><input id="gatePw" class="ginp" type="password" placeholder="至少 4 位" autocomplete="current-password"></div>' +
    '<div class="gerr" id="gateErr"></div>' +
    '<div class="gbtns">' +
    '<button class="gbtn pri" data-g="login">登录</button>' +
    '<button class="gbtn" data-g="reg">注册并登录</button>' +
    '</div>' +
    '<button class="glater" data-g="later">不用了，直接用 →</button>' +
    '<div class="gtip">账号保存在<b>这台设备的浏览器</b>里，不上传服务器，也不要求邮箱手机。</div>';
  var pw = document.getElementById('gatePw');
  if (pw) pw.onkeydown = function (e) { if (e.key === 'Enter') gateDo('login'); };
}
function gateErr(msg) {
  var e = document.getElementById('gateErr');
  if (e) e.textContent = msg || '';
}
function gateDo(a) {
  var u = document.getElementById('gateUser'), p = document.getElementById('gatePw');
  var un = u ? (u.value || '').trim() : '', pw = p ? (p.value || '') : '';
  if (a === 'later') { gateClose(); return; }
  if (!un) { gateErr('先填个用户名'); try { sfx('err'); } catch (e) { } return; }
  if (String(pw).length < 4) { gateErr('密码至少 4 位'); try { sfx('err'); } catch (e) { } return; }
  var r = (a === 'login') ? ACC.login(un, pw) : ACC.reg(un, pw);
  if (!r.ok) { gateErr(r.msg); try { sfx('err'); } catch (e) { } return; }
  gateErr('');
  try { sfx(r.role === 'admin' ? 'unlock' : 'login'); } catch (e) { }
  try { sbToast(r.msg); } catch (e2) { }
  gateAfter();
}
/* 登录成功后：关卡片 → 补进之前被拦下的模块 */
function gateAfter() {
  var m = document.getElementById('gateMsk');
  if (m) m.classList.remove('on');
  try { sysTopbar(); } catch (e) { }
  try { sysRender(); } catch (e2) { }
  try { buildHome(); } catch (e3) { }
  var w = GATE.want;
  GATE.want = '';
  if (w && GATE.can(w)) { try { enterScene(w); } catch (e4) { } }
}
document.addEventListener('click', function (e) {
  var t = e.target, g = null, i = 0;
  while (t && i < 5) {
    if (t.getAttribute && t.getAttribute('data-g')) { g = t.getAttribute('data-g'); break; }
    t = t.parentNode; i++;
  }
  if (g) { e.preventDefault(); gateDo(g); }
});

/* 进模块：不再拦登录，只记录使用统计 + 检查封禁 */
var _enterSceneV15 = enterScene;
enterScene = function (id) {
  ACC.checkBan();
  _enterSceneV15(id);
  ACC.touch(id);
  try { sysTopbar(); } catch (e) { }
};

/* ==================================================================
   五、管理员：账号管理页
   ================================================================== */
SYS.uview = 0; SYS.banN = ''; SYS.infoN = '';
function sysFmtT(ms) {
  if (!ms) return '从未';
  var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function sysUserList(b) {
  var s = ACC.sum(), i, u, L = ACC.list();
  b.appendChild(sysSec('账号管理 · 共 ' + s.all + ' 个账号'));
  var st = sysEl('div', 'stip',
    '管理员 <b>' + s.admin + '</b> · 普通 <b>' + s.user + '</b> · 已封禁 <b>' + s.ban +
    '</b> · 今日活跃 <b>' + s.today + '</b>　（数据存在本机浏览器）');
  b.appendChild(st);
  var g0 = sysEl('div', 'sgrp');
  g0.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  g0.appendChild(sysBtn('刷新', 'adm:users'));
  b.appendChild(g0);
  for (i = 0; i < L.length; i++) {
    u = L[i];
    var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : ''));
    var top = sysEl('div', 'sutop');
    top.appendChild(sysEl('div', 'sava' + (u.role === 'admin' ? ' adm' : ''), u.name.slice(0, 1).toUpperCase()));
    var inf = sysEl('div', 'sinfo');
    inf.appendChild(sysEl('b', '', u.name +
      (u.role === 'admin' ? '　<span class="sadm">管理员</span>' : '') +
      (u.ban ? '　<span class="sbad">已封禁</span>' : '')));
    var keys = [], kk, best = '', bn = 0;
    if (u.stat) for (kk in u.stat) if (Object.prototype.hasOwnProperty.call(u.stat, kk)) {
      keys.push(kk); if (u.stat[kk] > bn) { bn = u.stat[kk]; best = kk; }
    }
    inf.appendChild(sysEl('i', '', '登录 ' + (u.lg || 0) + ' 次 · 最近 ' + sysFmtT(u.lt) +
      ' · 创建 ' + sysFmtT(u.ct)));
    inf.appendChild(sysEl('i', '', '最近模块：' + (u.sc || '—') + (best ? ('　最常玩：' + (SHORT[best] || best) + ' ×' + bn) : '')));
    if (u.ban && u.banR) inf.appendChild(sysEl('i', '', '封禁理由：' + u.banR));
    top.appendChild(inf);
    cd.appendChild(top);

    /* 使用明细（展开） */
    if (SYS.infoN === u.name && keys.length) {
      var bars = sysEl('div', 'sstat');
      keys.sort(function (a2, b2) { return u.stat[b2] - u.stat[a2]; });
      var mx = Math.max(u.stat[keys[0]], 1), j;
      for (j = 0; j < keys.length && j < 10; j++) {
        var row = sysEl('div', 'ssrow');
        row.appendChild(sysEl('span', 'ssn', SHORT[keys[j]] || keys[j]));
        var bar = sysEl('span', 'ssb');
        var fill = sysEl('i', 'ssf');
        fill.style.width = Math.round(u.stat[keys[j]] / mx * 100) + '%';
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(sysEl('span', 'ssv', String(u.stat[keys[j]])));
        bars.appendChild(row);
      }
      cd.appendChild(bars);
    }

    /* 操作 */
    var g = sysEl('div', 'sgrp');
    var kk2 = String(u.name);
    if (u.role !== 'admin') {
      if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', kk2));
      else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', kk2));
      g.appendChild(sysBtn('重置密码', 'adm:pw', '', kk2));
      g.appendChild(sysBtn('删号', 'adm:del', 'warn', kk2));
      g.appendChild(sysBtn(u.role === 'admin' ? '取消管理' : '设为管理', 'adm:role', '', kk2));
    } else {
      g.appendChild(sysEl('span', 'smini', '内置账号 · 不可封禁 / 删除'));
    }
    if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', kk2));
    cd.appendChild(g);

    /* 封禁理由输入 */
    if (SYS.banN === u.name) {
      var ip = sysEl('input', 'sinp'); ip.id = 'sysBanR'; ip.placeholder = '封禁理由（可留空）';
      cd.appendChild(sysRow('封禁理由', ip));
      var g2 = sysEl('div', 'sgrp');
      g2.appendChild(sysBtn('确认封禁', 'adm:banok', 'warn', kk2));
      g2.appendChild(sysBtn('取消', 'adm:bancancel', '', kk2));
      cd.appendChild(g2);
    }
    if (SYS.pwN === u.name) {
      var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysNewPw'; ip2.type = 'text'; ip2.placeholder = '新密码（≥4 位）';
      cd.appendChild(sysRow('新密码', ip2));
      var g3 = sysEl('div', 'sgrp');
      g3.appendChild(sysBtn('确认修改', 'adm:pwok', 'pri', kk2));
      g3.appendChild(sysBtn('取消', 'adm:pwcancel', '', kk2));
      cd.appendChild(g3);
    }
    b.appendChild(cd);
  }
  if (!L.length) b.appendChild(sysEl('div', 'sempty', '还没有账号。'));
}
/* 账号页：管理员多一个「账号管理」入口 */
var _sysRenderAccV15 = sysRenderAcc;
sysRenderAcc = function (b) {
  if (SYS.uview && ACC.isAdmin()) { sysUserList(b); return; }
  _sysRenderAccV15(b);
  if (ACC.isAdmin()) {
    var g = sysEl('div', 'sgrp');
    g.appendChild(sysBtn('账号管理（' + ACC.count() + ' 个账号）', 'adm:users', 'pri'));
    b.appendChild(g);
  }
};
/* sysAct 扩展：adm:* 走 v15 的分支 */
var _sysActV15 = sysAct;
sysAct = function (a, v, el) {
  if (a === 'adm:users') { SYS.uview = 1; SYS.banN = ''; SYS.pwN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:back') { SYS.uview = 0; SYS.banN = ''; SYS.pwN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:ban') { SYS.banN = v; SYS.pwN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:bancancel') { SYS.banN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:banok') {
    var ip = document.getElementById('sysBanR');
    ACC.setBan(v, 1, ip ? ip.value : '');
    SYS.banN = ''; sfx('err'); sbToast('已封禁 ' + v); sysRender(); return;
  }
  if (a === 'adm:unban') { ACC.setBan(v, 0); sfx('ok'); sbToast('已解除封禁 ' + v); sysRender(); return; }
  if (a === 'adm:pw') { SYS.pwN = v; SYS.banN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:pwcancel') { SYS.pwN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:pwok') {
    var ip2 = document.getElementById('sysNewPw');
    var r = ACC.setPw(v, ip2 ? ip2.value : '');
    SYS.pwN = '';
    if (r) { sfx('ok'); sbToast('已重置 ' + v + ' 的密码'); }
    else { sfx('err'); sbToast('新密码至少 4 位'); }
    sysRender(); return;
  }
  if (a === 'adm:del') {
    if (ACC.del(v)) { sfx('del'); sbToast('已删除账号 ' + v); }
    else { sfx('err'); sbToast('删不掉（内置账号不可删）'); }
    sysRender(); return;
  }
  if (a === 'adm:role') {
    var u = ACC.get(v);
    if (u && u.role !== 'admin') { ACC.setRole(v, 'admin'); sfx('unlock'); sbToast(v + ' 已是管理员'); }
    else if (u) { ACC.setRole(v, 'user'); sfx('ok'); sbToast(v + ' 已取消管理员'); }
    sysRender(); return;
  }
  if (a === 'adm:info') { SYS.infoN = (SYS.infoN === v) ? '' : v; sfx('tap'); sysRender(); return; }
  _sysActV15(a, v, el);
  /* 抽屉里登录 / 退出后，首页的锁标和顶栏也要跟着变 */
  if (a === 'login' || a === 'reg' || a === 'logout' || a === 'adm:key' || a === 'adm:reset') {
    try { buildHome(); } catch (e) { }
    try { sysTopbar(); } catch (e2) { }
  }
};
/* 顶栏账号按钮：未登录加个提示点 */
var _sysTopbarV15 = sysTopbar;
sysTopbar = function () {
  _sysTopbarV15();
  var b = document.getElementById('sysAcc');
  if (!b) return;
  var u = ACC.cur();
  if (!u) { b.classList.remove('need'); b.title = '未登录 · 点这里可以注册或登录（不登录也能用全部功能）'; }
  else b.classList.remove('need');
};

/* ==================================================================
   六、启动：首次进入弹登录卡片；封禁秒踢
   ================================================================== */
function v15Boot() {
  ACC.checkBan();
  sysTopbar();
  /* v18：不再自动弹登录卡，打开即用；想登录的话去设置 → 账号 */
  try { buildHome(); } catch (e2) { }
}
if (typeof document !== 'undefined' && document.body) v15Boot();
else if (typeof window !== 'undefined') window.addEventListener('load', v15Boot);

