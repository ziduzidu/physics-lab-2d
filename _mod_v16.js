/* ==================================================================
   v16：爆炸焦痕不再残留 · 管理员分级与撤销 · 沙盒声音不再响个不停
   ================================================================== */

/* ==================================================================
   一、爆炸焦痕：几秒内淡出，不再留在原地变成一片阴影
   SYS.decal  0=关  1=淡出（默认）  2=一直留着
   ================================================================== */
sbScorch = function (x, y, r) {
  if (!SYS.decal) return;                       /* 0：干脆不留 */
  if (!SB.decals) SB.decals = [];
  var fd = (SYS.decal === 2) ? 0 : (3.8 + Math.min(6.5, (r || 1) * 0.55));
  SB.decals.push({
    x: x, y: y, r: (r || 1) * 0.8, a: 0.34,
    s: Math.random() * 6.28, t: 0, fd: fd
  });
  if (SB.decals.length > 70) SB.decals.splice(0, SB.decals.length - 70);
};
/* 焦痕随时间淡出：fd=0 表示永久保留 */
function sbDecalStep(dt) {
  var d = SB.decals;
  if (!d || !d.length) return;
  var i, out = [], ch = 0;
  for (i = 0; i < d.length; i++) {
    if (!d[i].fd) { out.push(d[i]); continue; }
    d[i].t += (dt || 0);
    if (d[i].t < d[i].fd) out.push(d[i]); else ch = 1;
  }
  if (ch) SB.decals = out;
}
sbDrawDecals = function (g) {
  if (!SYS.decal) return;
  if (!SB.decals || !SB.decals.length) return;
  var i, d, X, Y, R, gr, k, a;
  g.save();
  for (i = 0; i < SB.decals.length; i++) {
    d = SB.decals[i];
    X = sbX(d.x); Y = sbY(d.y); R = Math.max(d.r * SB.view.s, 1);
    if (X < -R || X > SB.view.W + R || Y < -R || Y > SB.view.H + R) continue;
    k = d.fd ? Math.max(0, 1 - d.t / d.fd) : 1;
    if (k <= 0.01) continue;
    a = d.a * k * (0.5 + 0.5 * k);            /* 越到后面淡得越快，不留残影 */
    gr = g.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, 'rgba(24,18,15,' + (a * 0.95).toFixed(3) + ')');
    gr.addColorStop(0.55, 'rgba(46,32,24,' + (a * 0.6).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(60,44,32,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(X, Y, R, R * 0.42, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};
var _sbStepV16 = sbStep;
sbStep = function (dt) {
  try { sbDecalStep(dt || 0); } catch (e) { }
  return _sbStepV16.apply(null, arguments);
};
/* 清空场景 / 换环境时，痕迹也一起清掉 */
var _sbClearV16 = sbClear;
sbClear = function () {
  var r = _sbClearV16.apply(null, arguments);
  if (SB.decals) SB.decals.length = 0;
  return r;
};
var _sbSetEnvV16 = sbSetEnv;
sbSetEnv = function () {
  var r = _sbSetEnvV16.apply(null, arguments);
  if (SB.decals) SB.decals.length = 0;
  return r;
};

/* ==================================================================
   二、管理员分级：最高权限 owner > 管理员 admin > 普通用户 user
   · 只有最高权限账号能把别人设成管理员，级别永远低于最高权限
   · 最高权限账号随时可以撤销管理员
   · 管理员可以管普通用户，但动不了同级管理员，更动不了最高权限账号
   ================================================================== */
var _accSetRoleV15 = ACC.setRole, _accSetBanV15 = ACC.setBan,
  _accDelV15 = ACC.del, _accSetPwV15 = ACC.setPw, _accSumV15 = ACC.sum;

ACC.setRole = function (n, role) {
  var a = this.cur(), t = this.get(n);
  if (!a || !t) return 0;
  if (String(role) === 'owner') return 0;                /* 最高权限授不出去 */
  if (role !== 'admin' && role !== 'user') return 0;      /* 只认这两个角色，别的一律不动 */
  var al = accLv(a), tl = accLv(t), nl = (role === 'admin') ? 2 : 1;
  if (al < 2) return 0;                                  /* 不是管理员就别想改 */
  if (tl >= 3) return 0;                                 /* 最高权限账号不可被改动 */
  if (String(t.name).toLowerCase() === String(a.name).toLowerCase()) return 0;  /* 不能改自己 */
  if (nl >= 3) return 0;                                 /* 谁都不能授出最高权限 */
  if (nl > al) return 0;                                 /* 不能授予比自己更高的级别 */
  if (nl < tl && al <= tl) return 0;                     /* 撤管理员要求级别严格更高 */
  if (nl >= tl && tl >= al) return 0;                    /* 不能给同级或更高级的人升权 */
  t.role = (nl === 2) ? 'admin' : 'user';
  this.save();
  return 1;
};
ACC.setBan = function (n, on, reason) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u) return 0;
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  this.save();
  return 1;
};
ACC.del = function (n) {
  if (!this.canOn(n)) return 0;
  var k = String(n || '').toLowerCase();
  this.load();
  if (!this.users[k]) return 0;
  delete this.users[k];
  if (this.sess && this.sess.toLowerCase() === k) this.logout();
  this.save();
  return 1;
};
ACC.setPw = function (n, pw) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u || String(pw || '').length < 4) return 0;
  u.salt = accSalt(); u.pw = accHash(String(pw), u.salt);
  this.save();
  return 1;
};
ACC.sum = function () {
  var s = _accSumV15.call(this), L = this.list(), i, o = 0, a = 0;
  for (i = 0; i < L.length; i++) {
    if (accLv(L[i]) >= 3) { o++; a++; }
    else if (accLv(L[i]) >= 2) a++;
  }
  s.owner = o; s.admin = a; s.user = L.length - a;
  return s;
};

/* ==================================================================
   三、账号管理页：显示级别，按权限给出可操作的按钮
   ================================================================== */
function sysRoleBadge(u) {
  var l = accLv(u);
  if (l >= 3) return '　<span class="sown">最高权限</span>';
  if (l >= 2) return '　<span class="sadm">管理员</span>';
  return '　<span class="susr2">普通用户</span>';
}
sysUserList = function (b) {
  var s = ACC.sum(), i, u, L = ACC.list(), me = ACC.cur(), al = accLv(me);
  b.appendChild(sysSec('账号管理 · 共 ' + s.all + ' 个账号'));
  b.appendChild(sysEl('div', 'stip',
    '最高权限 <b>' + s.owner + '</b> · 管理员 <b>' + s.admin + '</b> · 普通 <b>' + s.user +
    '</b> · 已封禁 <b>' + s.ban + '</b> · 今日活跃 <b>' + s.today + '</b>　（数据存在本机浏览器）'));
  b.appendChild(sysEl('div', 'stip',
    '级别：<b>最高权限 &gt; 管理员 &gt; 普通用户</b>。可以把别人设为管理员，' +
    '但级别永远低于最高权限账号；最高权限账号随时可以撤销管理员。'));
  var g0 = sysEl('div', 'sgrp');
  g0.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  g0.appendChild(sysBtn('刷新', 'adm:users'));
  b.appendChild(g0);
  for (i = 0; i < L.length; i++) {
    u = L[i];
    var tl = accLv(u), mine = me && String(u.name).toLowerCase() === String(me.name).toLowerCase();
    var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : ''));
    var top = sysEl('div', 'sutop');
    top.appendChild(sysEl('div', 'sava' + (tl >= 3 ? ' own' : (tl >= 2 ? ' adm' : '')),
      u.name.slice(0, 1).toUpperCase()));
    var inf = sysEl('div', 'sinfo');
    inf.appendChild(sysEl('b', '', u.name + sysRoleBadge(u) +
      (u.ban ? '　<span class="sbad">已封禁</span>' : '') + (mine ? '　<span class="smini">我自己</span>' : '')));
    var keys = [], kk, best = '', bn = 0;
    if (u.stat) for (kk in u.stat) if (Object.prototype.hasOwnProperty.call(u.stat, kk)) {
      keys.push(kk); if (u.stat[kk] > bn) { bn = u.stat[kk]; best = kk; }
    }
    inf.appendChild(sysEl('i', '', '登录 ' + (u.lg || 0) + ' 次 · 最近 ' + sysFmtT(u.lt) +
      ' · 创建 ' + sysFmtT(u.ct)));
    inf.appendChild(sysEl('i', '', '最近模块：' + (u.sc || '—') +
      (best ? ('　最常玩：' + (SHORT[best] || best) + ' ×' + bn) : '')));
    if (u.ban && u.banR) inf.appendChild(sysEl('i', '', '封禁理由：' + u.banR));
    top.appendChild(inf);
    cd.appendChild(top);

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

    var g = sysEl('div', 'sgrp'), kk2 = String(u.name), can = al > tl && tl < 3 && !mine;
    if (tl >= 3) {
      g.appendChild(sysEl('span', 'smini', '最高权限账号 · 不可封禁 / 删除 / 变动'));
    } else if (mine) {
      g.appendChild(sysEl('span', 'smini', '这是你自己 · 不能改自己的权限'));
    } else if (can) {
      if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', kk2));
      else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', kk2));
      g.appendChild(sysBtn('重置密码', 'adm:pw', '', kk2));
      g.appendChild(sysBtn('删号', 'adm:del', 'warn', kk2));
      if (tl >= 2) g.appendChild(sysBtn('撤销管理员', 'adm:role', 'warn', kk2));
      else if (al >= 2) g.appendChild(sysBtn('设为管理员', 'adm:role', 'pri', kk2));
    } else if (tl >= 2) {
      g.appendChild(sysEl('span', 'smini', '同级管理员 · 只有最高权限账号能撤销'));
    } else {
      g.appendChild(sysEl('span', 'smini', '权限不足'));
    }
    if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', kk2));
    cd.appendChild(g);

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
};

/* sysAct：adm:role 改成带级别的判断，其余分支照旧 */
var _sysActV16 = sysAct;
sysAct = function (a, v, el) {
  if (a === 'adm:role') {
    var u = ACC.get(v);
    if (!u) { sfx('err'); sbToast('账号不存在'); }
    else if (accLv(u) >= 2) {
      if (ACC.setRole(v, 'user')) { sfx('ok'); sbToast('已撤销 ' + v + ' 的管理员'); }
      else { sfx('err'); sbToast('撤不了：只有最高权限账号能撤销管理员'); }
    } else {
      if (ACC.setRole(v, 'admin')) { sfx('unlock'); sbToast(v + ' 已是管理员（级别低于最高权限）'); }
      else { sfx('err'); sbToast('设不了：权限不足'); }
    }
    sysRender(); return;
  }
  if (a === 'adm:banok' || a === 'adm:unban' || a === 'adm:del' || a === 'adm:pwok') {
    /* 这几个操作现在可能被权限挡下，失败时给一句明确的提示 */
    var nm = String(v || ''), ok = 0;
    if (a === 'adm:banok') {
      var ip = document.getElementById('sysBanR');
      ok = ACC.setBan(nm, 1, ip ? ip.value : '');
      SYS.banN = '';
      if (ok) { sfx('err'); sbToast('已封禁 ' + nm); } else { sfx('err'); sbToast('封不了：只能封级别比自己低的账号'); }
    } else if (a === 'adm:unban') {
      ok = ACC.setBan(nm, 0);
      if (ok) { sfx('ok'); sbToast('已解除封禁 ' + nm); } else { sfx('err'); sbToast('解不了：权限不足'); }
    } else if (a === 'adm:del') {
      ok = ACC.del(nm);
      if (ok) { sfx('del'); sbToast('已删除账号 ' + nm); } else { sfx('err'); sbToast('删不了：只能删级别比自己低的账号'); }
    } else {
      var ip2 = document.getElementById('sysNewPw');
      ok = ACC.setPw(nm, ip2 ? ip2.value : '');
      SYS.pwN = '';
      if (ok) { sfx('ok'); sbToast('已重置 ' + nm + ' 的密码'); }
      else { sfx('err'); sbToast('改不了：权限不足，或新密码少于 4 位'); }
    }
    sysRender(); return;
  }
  _sysActV16(a, v, el);
};

/* 老账号库迁移：内置账号统一升成最高权限 */
ACC.load();
if (ACC.users && ACC.users['admin'] && ACC.users['admin'].role !== 'owner') {
  ACC.users['admin'].role = 'owner'; ACC.save();
}
