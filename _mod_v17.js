/* ==================================================================
   v17 · 用户管理中心
   站长视角：看到所有在本机注册 / 登录过的用户，能封禁、能授予权限。
   · 搜索 / 筛选 / 排序 / 批量操作
   · 封禁可带期限，到期自动解除
   · 名单导出与导入合并（把别的设备上的用户并进来一起管）
   ================================================================== */

/* ---------------- 界面状态 ---------------- */
SYS.uq = '';          /* 搜索词 */
SYS.uflt = 'all';     /* 筛选：all / adm / user / ban / live / new */
SYS.uord = 'lt';      /* 排序：lt / lg / ct / name */
SYS.usel = {};        /* 批量选择的账号名 */
SYS.banD = 0;         /* 封禁天数：0=永久，1/7/30 */
SYS.expN = 0; SYS.impN = 0; SYS.wipeN = 0; SYS.noteN = ''; SYS.impTxt = '';
SYS._ul = null;       /* 列表容器，重填时不用重画整个抽屉 */

var FLTS = [['all', '全部'], ['adm', '管理员'], ['user', '普通'],
['ban', '已封禁'], ['live', '今日活跃'], ['new', '新注册']];
var ORDS = [['lt', '最近登录'], ['lg', '登录次数'], ['ct', '注册时间'], ['name', '名称']];
var DURS = [[0, '永久'], [1, '1 天'], [7, '7 天'], [30, '30 天']];

/* ---------------- 使用人次（含没登录的访客） ---------------- */
var VIS = {
  K: 'fz_vis_v1', data: null,
  load: function () {
    if (this.data) return this.data;
    this.data = null;
    try { this.data = JSON.parse(localStorage.getItem(this.K) || 'null') || null; } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object') this.data = { d: '', n: 0, tot: 0, mod: {} };
    if (!this.data.mod) this.data.mod = {};
    return this.data;
  },
  save: function () { try { localStorage.setItem(this.K, JSON.stringify(this.data)); return 1; } catch (e) { return 0; } },
  hit: function (id) {
    var d = this.load(), t = new Date(), day = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
    if (d.d !== day) { d.d = day; d.n = 0; }
    d.n++; d.tot++;
    if (id) d.mod[id] = (d.mod[id] || 0) + 1;
    this.save();
    return d;
  },
  reset: function () { this.data = { d: '', n: 0, tot: 0, mod: {} }; this.save(); }
};
var _enterSceneV17 = enterScene;
enterScene = function (id) {
  var r = _enterSceneV17.apply(null, arguments);
  try { VIS.hit(id); } catch (e) { }
  return r;
};

/* ---------------- 账号：查询 / 批量 / 期限 / 备注 / 导入导出 ---------------- */
var _accSetBanV16 = ACC.setBan, _accCheckBanV16 = ACC.checkBan,
  _accLoginV17 = ACC.login, _accSumV16 = ACC.sum;

ACC.view = function () {
  var L = this.list(), q = String(SYS.uq || '').trim().toLowerCase(),
    f = SYS.uflt || 'all', o = SYS.uord || 'lt', out = [], i, u, lv,
    day = 86400000, now = Date.now();
  for (i = 0; i < L.length; i++) {
    u = L[i]; lv = accLv(u);
    if (q && String(u.name).toLowerCase().indexOf(q) < 0) continue;
    if (f === 'adm' && lv < 2) continue;
    if (f === 'user' && lv >= 2) continue;
    if (f === 'ban' && !u.ban) continue;
    if (f === 'live' && !(u.lt && now - u.lt < day)) continue;
    if (f === 'new' && !(u.ct && now - u.ct < day)) continue;
    out.push(u);
  }
  out.sort(function (a, b) {
    if (o === 'lg') return (b.lg || 0) - (a.lg || 0);
    if (o === 'ct') return (b.ct || 0) - (a.ct || 0);
    if (o === 'name') return String(a.name) < String(b.name) ? -1 : (String(a.name) > String(b.name) ? 1 : 0);
    return (b.lt || 0) - (a.lt || 0);
  });
  return out;
};

/* 封禁可以带期限：days>0 时记下到期时刻，到点自动解除 */
ACC.setBan = function (n, on, reason, days) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u) return 0;
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  u.banU = (on && days > 0) ? (Date.now() + days * 86400000) : 0;
  this.save();
  return 1;
};
ACC.banMany = function (names, on, reason, days) {
  var n = 0, i;
  for (i = 0; i < names.length; i++) if (this.setBan(names[i], on, reason, days)) n++;
  return n;
};
ACC.delMany = function (names) {
  var n = 0, i;
  for (i = 0; i < names.length; i++) if (this.del(names[i])) n++;
  return n;
};
/* 到期自动解除 */
ACC.expire = function () {
  var L = this.list(), i, u, n = 0, now = Date.now();
  for (i = 0; i < L.length; i++) {
    u = L[i];
    if (u.ban && u.banU && now >= u.banU) { u.ban = 0; u.banR = ''; u.banU = 0; u.banT = 0; n++; }
  }
  if (n) this.save();
  return n;
};
ACC.checkBan = function () { this.expire(); return _accCheckBanV16.apply(this, arguments); };
ACC.login = function () { this.expire(); return _accLoginV17.apply(this, arguments); };

/* 备注：管理员给某个用户记一笔（自己也行） */
ACC.setNote = function (n, txt) {
  var a = this.cur(), t = this.get(n);
  if (!a || !t) return 0;
  if (accLv(a) < 2) return 0;
  var mine = String(t.name).toLowerCase() === String(a.name).toLowerCase();
  if (!mine && !this.canOn(n)) return 0;
  t.note = String(txt || '').slice(0, 60);
  this.save();
  return 1;
};

/* 名单导出：完整账号数据（含口令摘要），用于备份或搬到别的设备 */
ACC.exportTxt = function () {
  this.load();
  var L = this.list(), out = [], i, u;
  for (i = 0; i < L.length; i++) {
    u = L[i];
    out.push({
      n: u.name, r: u.role, p: u.pw, s: u.salt || '', ct: u.ct || 0,
      lt: u.lt || 0, lg: u.lg || 0, sc: u.sc || '', st: u.stat || {},
      b: u.ban ? 1 : 0, br: u.banR || '', bu: u.banU || 0, nt: u.note || ''
    });
  }
  return JSON.stringify({ v: 1, app: 'fz', n: out.length, at: Date.now(), u: out });
};
/* 名单导入：新账号直接加入（最高权限不会被带进来），已有账号只并统计与封禁 */
ACC.importTxt = function (txt) {
  var o = null;
  try { o = JSON.parse(String(txt || '')); } catch (e) { return { err: '这段文本不是有效的名单数据' }; }
  if (!o || !o.u || !o.u.length) return { err: '名单里没有账号' };
  this.load();
  var L = o.u, i, x, k, u, kk, add = 0, upd = 0, ch = 0;
  for (i = 0; i < L.length; i++) {
    x = L[i];
    if (!x || !x.n) continue;
    k = String(x.n).toLowerCase();
    u = this.users[k];
    if (!u) {
      this.users[k] = {
        name: String(x.n).slice(0, 16), pw: String(x.p || ''), salt: String(x.s || ''),
        role: (x.r === 'admin') ? 'admin' : 'user',
        ct: x.ct || Date.now(), lt: x.lt || 0, lg: x.lg || 0, ban: x.b ? 1 : 0,
        banR: x.br || '', banT: 0, banU: x.bu || 0, sc: x.sc || '',
        stat: (x.st && typeof x.st === 'object') ? x.st : {}, note: String(x.nt || '').slice(0, 60)
      };
      add++; ch = 1; continue;
    }
    /* 已存在的账号：绝不覆盖本机密码与角色，只把更大的统计和封禁并进来 */
    if ((x.lg || 0) > (u.lg || 0)) { u.lg = x.lg; ch = 1; }
    if ((x.lt || 0) > (u.lt || 0)) { u.lt = x.lt; if (x.sc) u.sc = x.sc; ch = 1; }
    if (x.st && typeof x.st === 'object') {
      u.stat = u.stat || {};
      for (kk in x.st) if (Object.prototype.hasOwnProperty.call(x.st, kk)) {
        if ((x.st[kk] || 0) > (u.stat[kk] || 0)) { u.stat[kk] = x.st[kk]; ch = 1; }
      }
    }
    if (x.b && !u.ban && accLv(u) < 3) {
      u.ban = 1; u.banR = String(x.br || '违反使用规则').slice(0, 40); u.banU = x.bu || 0; ch = 1;
    }
    if (ch) upd++;
  }
  if (ch) this.save();
  return { add: add, upd: upd };
};
/* 清空账号库，但保留最高权限账号 */
ACC.wipe = function () {
  this.load();
  var k, n = 0;
  for (k in this.users) if (Object.prototype.hasOwnProperty.call(this.users, k)) {
    if (k === 'admin') continue;
    delete this.users[k]; n++;
  }
  if (!this.users['admin']) this.seed();
  if (this.sess && String(this.sess).toLowerCase() !== 'admin') this.logout();
  SYS.usel = {};
  this.save();
  return n;
};
ACC.sum = function () {
  var s = _accSumV16.call(this), L = this.list(), i, w = 0, now = Date.now();
  for (i = 0; i < L.length; i++) if (L[i].lt && now - L[i].lt < 7 * 86400000) w++;
  s.week = w;
  return s;
};

/* ---------------- 页面 ---------------- */
function sysChips(act, cur, items) {
  var g = sysEl('div', 'uchips'), i;
  for (i = 0; i < items.length; i++) {
    g.appendChild(sysBtn(items[i][1], act, items[i][0] === cur ? 'on' : '', items[i][0]));
  }
  return g;
}
function sysSelNames() {
  var k, out = [];
  for (k in SYS.usel) if (Object.prototype.hasOwnProperty.call(SYS.usel, k) && SYS.usel[k]) out.push(k);
  return out;
}

function sysUCard(u, me, al) {
  var lv = accLv(u), key = String(u.name),
    mine = me && String(u.name).toLowerCase() === String(me.name).toLowerCase();
  var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : '') + (SYS.usel[key] ? ' sel' : ''));
  var top = sysEl('div', 'sutop');
  if (!mine && lv < 3 && al > lv) {
    var ck = sysEl('input', 'uck'); ck.type = 'checkbox'; ck.checked = !!SYS.usel[key];
    ck.setAttribute('data-a', 'adm:sel'); ck.setAttribute('data-v', key);
    ck.onchange = function () {
      if (this.checked) SYS.usel[key] = 1; else delete SYS.usel[key];
      sfx('tap'); sysUserFill();
    };
    top.appendChild(ck);
  }
  top.appendChild(sysEl('div', 'sava' + (lv >= 3 ? ' own' : (lv >= 2 ? ' adm' : '')),
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
  if (u.ban) {
    inf.appendChild(sysEl('i', '', '封禁理由：' + (u.banR || '未填写') +
      (u.banU ? ('　到期：' + sysFmtT(u.banU)) : '　永久')));
  }
  if (u.note) inf.appendChild(sysEl('i', '', '备注：' + u.note));
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

  var g = sysEl('div', 'sgrp'), can = al > lv && lv < 3 && !mine;
  if (lv >= 3) {
    g.appendChild(sysEl('span', 'smini', '最高权限账号 · 不可封禁 / 删除 / 变动'));
  } else if (mine) {
    g.appendChild(sysEl('span', 'smini', '这是你自己 · 不能改自己的权限'));
  } else if (can) {
    if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', key));
    else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', key));
    g.appendChild(sysBtn('重置密码', 'adm:pw', '', key));
    g.appendChild(sysBtn('删号', 'adm:del', 'warn', key));
    if (lv >= 2) g.appendChild(sysBtn('撤销管理员', 'adm:role', 'warn', key));
    else if (al >= 2) g.appendChild(sysBtn('设为管理员', 'adm:role', 'pri', key));
    g.appendChild(sysBtn('备注', 'adm:note', '', key));
  } else if (lv >= 2) {
    g.appendChild(sysEl('span', 'smini', '同级管理员 · 只有最高权限账号能撤销'));
  } else {
    g.appendChild(sysEl('span', 'smini', '权限不足'));
  }
  if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', key));
  cd.appendChild(g);

  if (SYS.banN === u.name) {
    var ip = sysEl('input', 'sinp'); ip.id = 'sysBanR'; ip.placeholder = '封禁理由（可留空）';
    cd.appendChild(sysRow('封禁理由', ip));
    cd.appendChild(sysEl('i', 'stip', '封禁多久：'));
    cd.appendChild(sysChips('adm:dur', SYS.banD, DURS));
    var g2 = sysEl('div', 'sgrp');
    g2.appendChild(sysBtn('确认封禁', 'adm:banok', 'warn', key));
    g2.appendChild(sysBtn('取消', 'adm:bancancel', '', key));
    cd.appendChild(g2);
  }
  if (SYS.pwN === u.name) {
    var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysNewPw'; ip2.type = 'text'; ip2.placeholder = '新密码（≥4 位）';
    cd.appendChild(sysRow('新密码', ip2));
    var g3 = sysEl('div', 'sgrp');
    g3.appendChild(sysBtn('确认修改', 'adm:pwok', 'pri', key));
    g3.appendChild(sysBtn('取消', 'adm:pwcancel', '', key));
    cd.appendChild(g3);
  }
  if (SYS.noteN === u.name) {
    var ip3 = sysEl('input', 'sinp'); ip3.id = 'sysNote'; ip3.placeholder = '给这个用户记一笔（可留空）';
    ip3.value = u.note || '';
    cd.appendChild(sysRow('备注', ip3));
    var g4 = sysEl('div', 'sgrp');
    g4.appendChild(sysBtn('保存', 'adm:noteok', 'pri', key));
    g4.appendChild(sysBtn('取消', 'adm:notecancel', '', key));
    cd.appendChild(g4);
  }
  return cd;
}

/* 只重填列表：搜索时不会把输入框的焦点弄丢 */
function sysUserFill() {
  var box = SYS._ul;
  if (!box) return;
  box.innerHTML = '';
  var L = ACC.view(), me = ACC.cur(), al = accLv(me), i, names = sysSelNames();
  var bulk = sysEl('div', 'ubulk');
  bulk.appendChild(sysEl('span', 'smini', '已选 ' + names.length + ' 个'));
  bulk.appendChild(sysBtn('全选', 'adm:selall'));
  bulk.appendChild(sysBtn('不选', 'adm:selno'));
  if (names.length) {
    bulk.appendChild(sysBtn('批量封禁', 'adm:banmany', 'warn'));
    bulk.appendChild(sysBtn('批量解封', 'adm:unbanmany', 'ok'));
    bulk.appendChild(sysBtn('批量删号', 'adm:delmany', 'warn'));
  }
  box.appendChild(bulk);
  if (!L.length) { box.appendChild(sysEl('div', 'sempty', '没有符合条件的账号')); return; }
  for (i = 0; i < L.length; i++) box.appendChild(sysUCard(L[i], me, al));
}

var _sysUserListV16 = sysUserList;
sysUserList = function (b) {
  var s = ACC.sum(), me = ACC.cur(), al = accLv(me), i;
  b.appendChild(sysSec('用户管理中心'));

  var st = sysEl('div', 'ustat'), cells = [
    ['账号', s.all, ''], ['最高权限', s.owner, ''], ['管理员', s.admin - s.owner, ''],
    ['普通', s.user, ''], ['已封禁', s.ban, 'warn'], ['今日活跃', s.today, ''], ['7 日活跃', s.week, '']
  ];
  for (i = 0; i < cells.length; i++) {
    var d = sysEl('div', 'ustc' + (cells[i][2] ? ' warn' : ''));
    d.appendChild(sysEl('b', '', String(cells[i][1])));
    d.appendChild(sysEl('i', '', cells[i][0]));
    st.appendChild(d);
  }
  b.appendChild(st);

  var v = VIS.load();
  b.appendChild(sysEl('div', 'stip',
    '使用人次：<b>今日 ' + v.n + ' 次</b> · <b>累计 ' + v.tot + ' 次</b>（含没登录的访客）'));
  b.appendChild(sysEl('div', 'stip',
    '账号数据存在使用者各自设备的浏览器里，所以这里看到的是<b>这台设备上注册 / 登录过的所有人</b>。' +
    '想知道别的设备上有哪些人：让对方在设置里「导出名单」把那段文本发给你，再用这里的「导入名单」并进来，' +
    '就能一起看到、一起封禁。'));
  b.appendChild(sysEl('div', 'stip',
    '级别：<b>最高权限 &gt; 管理员 &gt; 普通用户</b>。可以把别人设为管理员（级别永远低于最高权限），' +
    '也能随时撤销；管理员能管普通用户，但动不了同级管理员，更动不了最高权限账号。'));

  var tb = sysEl('div', 'utbar');
  var ip = sysEl('input', 'sinp uq'); ip.id = 'sysUq'; ip.placeholder = '搜用户名…';
  ip.value = SYS.uq || '';
  ip.setAttribute('data-a', 'adm:q');
  ip.oninput = function () { SYS.uq = String(this.value || ''); sysUserFill(); };
  tb.appendChild(ip);
  b.appendChild(tb);
  b.appendChild(sysChips('adm:flt', SYS.uflt, FLTS));
  b.appendChild(sysChips('adm:ord', SYS.uord, ORDS));

  var box = sysEl('div', 'ulist');
  SYS._ul = box;
  b.appendChild(box);
  sysUserFill();

  var gf = sysEl('div', 'sgrp');
  gf.appendChild(sysBtn(SYS.expN ? '收起名单' : '导出名单', 'adm:exp'));
  gf.appendChild(sysBtn(SYS.impN ? '收起导入' : '导入名单', 'adm:imp'));
  gf.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  gf.appendChild(sysBtn('刷新', 'adm:users'));
  if (al >= 3) gf.appendChild(sysBtn(SYS.wipeN ? '取消清空' : '清空账号库', 'adm:wipe', 'warn'));
  b.appendChild(gf);

  if (SYS.expN) {
    var ta = sysEl('textarea', 'sta'); ta.id = 'sysExpTa'; ta.readOnly = true;
    ta.value = ACC.exportTxt();
    b.appendChild(sysRow('账号名单（复制走可备份 / 搬设备）', ta,
      '含账号名、角色、统计、封禁与口令摘要，别公开发'));
  }
  if (SYS.impN) {
    var ta2 = sysEl('textarea', 'sta'); ta2.id = 'sysImpTa';
    ta2.placeholder = '把别的设备导出的名单粘贴到这里';
    ta2.value = SYS.impTxt || '';
    ta2.oninput = function () { SYS.impTxt = String(this.value || ''); };
    b.appendChild(sysRow('粘贴名单', ta2,
      '新账号直接加进来；已有的只并统计与封禁，不覆盖本机密码和角色'));
    var gi = sysEl('div', 'sgrp');
    gi.appendChild(sysBtn('确认导入', 'adm:impok', 'pri'));
    gi.appendChild(sysBtn('取消', 'adm:impcancel'));
    b.appendChild(gi);
  }
  if (SYS.wipeN) {
    b.appendChild(sysEl('div', 'stip',
      '确定清空除最高权限账号以外的全部账号吗？此操作不可撤销。'));
    var gw = sysEl('div', 'sgrp');
    gw.appendChild(sysBtn('确认清空', 'adm:wipeok', 'warn'));
    gw.appendChild(sysBtn('取消', 'adm:wipecancel'));
    b.appendChild(gw);
  }
};

/* ---------------- 动作 ---------------- */
var _sysActV17 = sysAct;
sysAct = function (a, v, el) {
  var i, names, n;
  if (a === 'adm:users') {
    SYS.uview = 1; SYS.banN = ''; SYS.pwN = ''; SYS.noteN = ''; SYS.infoN = '';
    SYS.usel = {}; SYS.expN = 0; SYS.impN = 0; SYS.wipeN = 0; SYS.impTxt = '';
    sfx('open'); sysRender(); return;
  }
  if (a === 'adm:q') {
    var q = document.getElementById('sysUq');
    SYS.uq = q ? String(q.value || '') : '';
    sysUserFill(); return;
  }
  if (a === 'adm:flt') { SYS.uflt = v; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:ord') { SYS.uord = v; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:dur') { SYS.banD = parseInt(v, 10) || 0; sfx('tap'); sysRender(); return; }
  if (a === 'adm:selall') {
    var L = ACC.view(), me = ACC.cur(), al = accLv(me);
    for (i = 0; i < L.length; i++) {
      if (accLv(L[i]) >= 3) continue;
      if (me && String(L[i].name).toLowerCase() === String(me.name).toLowerCase()) continue;
      if (al <= accLv(L[i])) continue;
      SYS.usel[String(L[i].name)] = 1;
    }
    sfx('tap'); sysUserFill(); return;
  }
  if (a === 'adm:selno') { SYS.usel = {}; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:banmany') {
    names = sysSelNames();
    n = ACC.banMany(names, 1, '批量封禁', SYS.banD);
    SYS.usel = {};
    if (n) { sfx('err'); sbToast('已封禁 ' + n + ' 个账号' + (SYS.banD ? ('，' + SYS.banD + ' 天后自动解除') : '')); }
    else { sfx('err'); sbToast('没有能封禁的账号（最高权限 / 同级 / 自己都封不了）'); }
    sysRender(); return;
  }
  if (a === 'adm:unbanmany') {
    names = sysSelNames();
    n = 0;
    for (i = 0; i < names.length; i++) if (ACC.setBan(names[i], 0)) n++;
    SYS.usel = {};
    if (n) { sfx('ok'); sbToast('已解除 ' + n + ' 个账号的封禁'); }
    else { sfx('err'); sbToast('没有能解除的账号'); }
    sysRender(); return;
  }
  if (a === 'adm:delmany') {
    names = sysSelNames();
    n = ACC.delMany(names);
    SYS.usel = {};
    if (n) { sfx('del'); sbToast('已删除 ' + n + ' 个账号'); }
    else { sfx('err'); sbToast('没有能删除的账号'); }
    sysRender(); return;
  }
  if (a === 'adm:note') { SYS.noteN = (SYS.noteN === v) ? '' : v; sfx('open'); sysRender(); return; }
  if (a === 'adm:notecancel') { SYS.noteN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:noteok') {
    var ni = document.getElementById('sysNote');
    if (ACC.setNote(v, ni ? ni.value : '')) { sfx('ok'); sbToast('备注已保存'); }
    else { sfx('err'); sbToast('存不了：权限不足'); }
    SYS.noteN = ''; sysRender(); return;
  }
  if (a === 'adm:exp') { SYS.expN = SYS.expN ? 0 : 1; SYS.impN = 0; sfx('open'); sysRender(); return; }
  if (a === 'adm:imp') { SYS.impN = SYS.impN ? 0 : 1; SYS.expN = 0; sfx('open'); sysRender(); return; }
  if (a === 'adm:impcancel') { SYS.impN = 0; SYS.impTxt = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:impok') {
    var ti = document.getElementById('sysImpTa');
    if (ti) SYS.impTxt = String(ti.value || '');
    var r = ACC.importTxt(SYS.impTxt);
    if (r.err) { sfx('err'); sbToast(r.err); }
    else {
      sfx('unlock');
      sbToast('导入完成：新增 ' + r.add + ' 个，更新 ' + r.upd + ' 个');
      SYS.impN = 0; SYS.impTxt = '';
    }
    sysRender(); return;
  }
  if (a === 'adm:wipe') { SYS.wipeN = SYS.wipeN ? 0 : 1; sfx('tap'); sysRender(); return; }
  if (a === 'adm:wipecancel') { SYS.wipeN = 0; sfx('close'); sysRender(); return; }
  if (a === 'adm:wipeok') {
    n = ACC.wipe();
    SYS.wipeN = 0;
    sfx('del'); sbToast('已清空 ' + n + ' 个账号（最高权限账号保留）');
    sysRender(); return;
  }
  /* 封禁沿用当前选择的期限 */
  if (a === 'adm:banok') {
    var nm = String(v || ''), ip = document.getElementById('sysBanR');
    var ok = ACC.setBan(nm, 1, ip ? ip.value : '', SYS.banD);
    SYS.banN = '';
    if (ok) {
      sfx('err');
      sbToast('已封禁 ' + nm + (SYS.banD ? ('，' + SYS.banD + ' 天后自动解除') : ''));
    } else { sfx('err'); sbToast('封不了：只能封级别比自己低的账号'); }
    sysRender(); return;
  }
  _sysActV17(a, v, el);
};
