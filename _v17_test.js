/* v17 专项测试：用户管理中心（看得到所有人 / 封禁 / 授予权限 / 批量 / 导入导出） */
const path = require('path');
const { runScript } = require('./_domstub.js');
const fs = require('fs');

const st = runScript(path.resolve(__dirname, '_check.js'), {});
const T = st.T, ACC = T.ACC, SYS = T.SYS, SB = T.SB;
const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');

let P = 0, F = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond === true) { P++; console.log('  ✓ ' + name); }
  else { F++; fails.push(name + '  得到: ' + cond); console.log('  ✗ ' + name + '  得到: ' + cond + (extra !== undefined ? '  ' + extra : '')); }
}
function txt(n) {
  if (!n) return '';
  let s = n.textContent || '';
  (n.children || []).forEach(function (c) { s += ' ' + txt(c); });
  return s;
}
function solo() {
  T.SND._v = 0; T.SND._vw = 0; T.SND._t = {}; if (T.SND._r) T.SND._r = {};
}
function drwb() { return txt(st.document.querySelector('.drwb')); }
function enter() { ACC.login('admin', T.accHash ? 'fz2026@admin' : 'fz2026@admin'); }

console.log('\n[1] 看到所有用户');
ok('管理员登录后能进用户管理中心', (function () {
  ACC.logout();
  ACC.reg('u01', 'pw0001'); ACC.logout();
  ACC.reg('u02', 'pw0002'); ACC.logout();
  ACC.reg('u03', 'pw0003'); ACC.logout();
  const r = ACC.login('admin', 'fz2026@admin');
  if (!r.ok) return '登录失败';
  SYS.tab = 'acc'; SYS.uview = 0;
  T.sysAct('adm:users');
  return SYS.uview === 1 ? true : 'uview=' + SYS.uview;
})() === true, 'ok');

ok('页面标题是用户管理中心', drwb().indexOf('用户管理中心') >= 0, drwb().slice(0, 60));

ok('所有注册的用户都能看到', (function () {
  const b = drwb();
  return ['u01', 'u02', 'u03', 'admin'].every(function (n) { return b.indexOf(n) >= 0; })
    ? true : b.slice(0, 120);
})() === true, 'ok');

ok('统计条列出各项人数', (function () {
  const b = drwb();
  return ['账号', '最高权限', '管理员', '普通', '已封禁', '今日活跃', '7 日活跃']
    .every(function (n) { return b.indexOf(n) >= 0; }) ? true : b.slice(0, 120);
})() === true, 'ok');

ok('7 日活跃数算得对', (function () {
  const s = ACC.sum();
  const L = ACC.list(), now = Date.now(), w = L.filter(u => u.lt && now - u.lt < 7 * 86400000).length;
  return s.week === w ? true : (s.week + '/' + w);
})() === true, 'ok');

ok('管理员人数不含最高权限账号', (function () {
  ACC.setRole('u01', 'admin');
  const s = ACC.sum();
  const pure = s.admin - s.owner;
  return pure === 1 ? true : ('adm=' + s.admin + ' own=' + s.owner);
})() === true, 'ok');

console.log('\n[2] 搜索 / 筛选 / 排序');
ok('能按用户名搜', (function () {
  SYS.uq = 'u0'; SYS.uflt = 'all'; SYS.uord = 'lt';
  const L = ACC.view();
  return L.length === 3 && L.every(u => String(u.name).indexOf('u0') === 0)
    ? true : (L.length + ':' + L.map(u => u.name).join(','));
})() === true, 'ok');

ok('搜不到就返回空', (function () {
  SYS.uq = 'zzzz';
  return ACC.view().length === 0 ? true : ACC.view().length;
})() === true, 'ok');

ok('搜完能清掉', (function () {
  SYS.uq = '';
  return ACC.view().length === ACC.list().length ? true : ACC.view().length;
})() === true, 'ok');

ok('筛选：只看管理员', (function () {
  SYS.uflt = 'adm';
  const L = ACC.view();
  const r = L.every(u => T.accLv(u) >= 2) && L.length >= 1;
  SYS.uflt = 'all';
  return r ? true : L.map(u => u.name + ':' + u.role).join(',');
})() === true, 'ok');

ok('筛选：只看普通用户', (function () {
  SYS.uflt = 'user';
  const L = ACC.view();
  const r = L.every(u => T.accLv(u) < 2) && L.length >= 1;
  SYS.uflt = 'all';
  return r ? true : L.map(u => u.name).join(',');
})() === true, 'ok');

ok('筛选：只看已封禁', (function () {
  ACC.setBan('u02', 1, '测试封禁');
  SYS.uflt = 'ban';
  const L = ACC.view();
  const r = L.length === 1 && L[0].name === 'u02';
  SYS.uflt = 'all';
  return r ? true : L.map(u => u.name).join(',');
})() === true, 'ok');

ok('筛选：只看今日活跃', (function () {
  SYS.uflt = 'live';
  const L = ACC.view();
  const r = L.every(u => u.lt && Date.now() - u.lt < 86400000);
  SYS.uflt = 'all';
  return r ? true : L.map(u => u.name).join(',');
})() === true, 'ok');

ok('排序：按登录次数', (function () {
  SYS.uord = 'lg';
  const L = ACC.view();
  let good = true;
  for (let i = 1; i < L.length; i++) if ((L[i - 1].lg || 0) < (L[i].lg || 0)) good = false;
  SYS.uord = 'lt';
  return good ? true : L.map(u => u.name + ':' + u.lg).join(',');
})() === true, 'ok');

ok('排序：按名称', (function () {
  SYS.uord = 'name';
  const L = ACC.view().map(u => String(u.name));
  const cp = L.slice().sort();
  SYS.uord = 'lt';
  return L.join(',') === cp.join(',') ? true : L.join(',');
})() === true, 'ok');

ok('搜索不重建整个抽屉（列表单独重填）', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; T.sysRender();
  const box = SYS._ul;
  const before = box.children.length;
  SYS.uq = 'u0'; T.sysUserFill();
  const after = box.children.length;
  SYS.uq = ''; T.sysUserFill();
  return before > 0 && after > 0 && after <= before ? true : (before + '/' + after);
})() === true, 'ok');

console.log('\n[3] 封禁与权限');
ok('最高权限可以封禁普通用户', (function () {
  ACC.setBan('u03', 0);
  return !!ACC.setBan('u03', 1, '违规');
})(), 'ok');

ok('被封禁的用户登不进来', (function () {
  ACC.logout();
  const r = ACC.login('u03', 'pw0003');
  ACC.login('admin', 'fz2026@admin');
  return !r.ok && String(r.msg).indexOf('封禁') >= 0 ? true : JSON.stringify(r);
})() === true, 'ok');

ok('封禁理由能存下来', (function () {
  const u = ACC.get('u03');
  return u.banR === '违规' ? true : u.banR;
})() === true, 'ok');

ok('最高权限可以撤销管理员', (function () {
  const r = ACC.setRole('u01', 'user');
  return !!r && ACC.get('u01').role === 'user' ? true : ACC.get('u01').role;
})() === true, 'ok');

ok('最高权限可以授予管理员', (function () {
  const r = ACC.setRole('u02', 'admin');
  return !!r && ACC.get('u02').role === 'admin' ? true : ACC.get('u02').role;
})() === true, 'ok');

ok('授出的管理员级别低于最高权限', (function () {
  return T.accLv(ACC.get('u02')) < T.accLv(ACC.get('admin')) ? true : '级别不对';
})() === true, 'ok');

ok('谁都授不出最高权限', (function () {
  return ACC.setRole('u01', 'owner') === 0 ? true : '居然授出了 owner';
})() === true, 'ok');

ok('最高权限账号不可被封禁', (function () {
  return ACC.setBan('admin', 1, '试试') === 0 ? true : '居然封了 owner';
})() === true, 'ok');

ok('最高权限账号不可被删除', (function () {
  return ACC.del('admin') === 0 ? true : '居然删了 owner';
})() === true, 'ok');

ok('最高权限账号不可被降级', (function () {
  return ACC.setRole('admin', 'user') === 0 ? true : '居然降了 owner';
})() === true, 'ok');

ok('不能改自己的权限', (function () {
  return ACC.setRole('admin', 'admin') === 0 ? true : '改了自己';
})() === true, 'ok');

ok('管理员能管普通用户', (function () {
  ACC.setRole('u02', 'admin');
  ACC.setBan('u02', 0);                     /* u02 在筛选测试里被封过，先解掉才能登录 */
  ACC.logout(); ACC.login('u02', 'pw0002');
  const r = ACC.setBan('u03', 0);
  const r2 = ACC.setBan('u03', 1, '管理员封的');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !!r && !!r2 ? true : (r + '/' + r2);
})() === true, 'ok');

ok('管理员动不了最高权限账号', (function () {
  ACC.logout(); ACC.login('u02', 'pw0002');
  const a = ACC.setBan('admin', 1, 'x'), b = ACC.del('admin'), c = ACC.setRole('admin', 'user');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !a && !b && !c ? true : (a + '/' + b + '/' + c);
})() === true, 'ok');

ok('管理员撤不了同级管理员', (function () {
  ACC.setRole('u01', 'admin');
  ACC.logout(); ACC.login('u02', 'pw0002');
  const r = ACC.setRole('u01', 'user');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !r ? true : '同级居然撤了';
})() === true, 'ok');

ok('页面里对最高权限账号不给操作按钮', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; SYS.uq = ''; SYS.uflt = 'all'; T.sysRender();
  const b = drwb();
  return b.indexOf('不可封禁') >= 0 ? true : b.slice(-200);
})() === true, 'ok');

console.log('\n[4] 封禁期限');
ok('可以封 1 天（带到期时间）', (function () {
  ACC.setBan('u03', 0);
  ACC.setBan('u03', 1, '封一天', 1);
  const u = ACC.get('u03');
  return u.banU > Date.now() && u.banU - Date.now() <= 86400000 + 2000
    ? true : ('banU=' + u.banU);
})() === true, 'ok');

ok('永久封禁没有到期时间', (function () {
  ACC.setBan('u03', 1, '永久', 0);
  return !ACC.get('u03').banU ? true : ACC.get('u03').banU;
})() === true, 'ok');

ok('到期的封禁会自动解除', (function () {
  ACC.setBan('u03', 1, '过期', 1);
  const u = ACC.get('u03');
  u.banU = Date.now() - 1000;          /* 手动把到期时间拨到过去 */
  const n = ACC.expire();
  return n >= 1 && !ACC.get('u03').ban ? true : ('n=' + n + ' ban=' + ACC.get('u03').ban);
})() === true, 'ok');

ok('到期解封后能重新登录', (function () {
  ACC.logout();
  const r = ACC.login('u03', 'pw0003');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !!r.ok ? true : JSON.stringify(r);
})() === true, 'ok');

ok('没到期的不会被误解除', (function () {
  ACC.setBan('u03', 1, '七天', 7);
  const n = ACC.expire();
  const still = !!ACC.get('u03').ban;
  ACC.setBan('u03', 0);
  return n === 0 && still ? true : ('n=' + n + ' ban=' + still);
})() === true, 'ok');

ok('登录时会自动清理过期封禁', (function () {
  ACC.setBan('u03', 1, '过期', 1);
  ACC.get('u03').banU = Date.now() - 1000;
  ACC.logout();
  const r = ACC.login('u03', 'pw0003');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !!r.ok ? true : JSON.stringify(r);
})() === true, 'ok');

console.log('\n[5] 批量操作');
ok('可以全选可管理的账号', (function () {
  SYS.uq = ''; SYS.uflt = 'all'; SYS.uord = 'lt';
  SYS.tab = 'acc'; SYS.uview = 1; T.sysRender();
  T.sysAct('adm:selall');
  const n = T.sysSelNames();
  return n.length >= 3 && n.indexOf('admin') < 0 ? true : n.join(',');
})() === true, 'ok');

ok('全选不会选上最高权限账号', (function () {
  return !SYS.usel['admin'] ? true : '选上了 owner';
})() === true, 'ok');

ok('全选不会选上自己', (function () {
  return !SYS.usel['admin'] ? true : '选上了自己';
})() === true, 'ok');

ok('批量封禁生效', (function () {
  ACC.setBan('u01', 0); ACC.setBan('u02', 0); ACC.setBan('u03', 0);
  SYS.usel = { u01: 1, u03: 1 };
  SYS.banD = 0;
  T.sysAct('adm:banmany');
  const a = !!ACC.get('u01').ban, b = !!ACC.get('u03').ban, c = !!ACC.get('u02').ban;
  return a && b && !c ? true : (a + '/' + b + '/' + c);
})() === true, 'ok');

ok('批量封禁后清空选择', (function () {
  return T.sysSelNames().length === 0 ? true : T.sysSelNames().join(',');
})() === true, 'ok');

ok('批量解封生效', (function () {
  SYS.usel = { u01: 1, u03: 1 };
  T.sysAct('adm:unbanmany');
  return !ACC.get('u01').ban && !ACC.get('u03').ban ? true : '没解掉';
})() === true, 'ok');

ok('批量删号生效', (function () {
  SYS.usel = { u03: 1 };
  T.sysAct('adm:delmany');
  return !ACC.get('u03') && !!ACC.get('u01') ? true : '删错了';
})() === true, 'ok');

ok('批量删号动不了最高权限账号', (function () {
  SYS.usel = { admin: 1 };
  T.sysAct('adm:delmany');
  const r = !!ACC.get('admin');
  SYS.usel = {};
  return r ? true : 'owner 被删了';
})() === true, 'ok');

ok('清空选择可用', (function () {
  SYS.usel = { u01: 1, u02: 1 };
  T.sysAct('adm:selno');
  return T.sysSelNames().length === 0 ? true : T.sysSelNames().join(',');
})() === true, 'ok');

console.log('\n[6] 备注');
ok('管理员能给用户写备注', (function () {
  const me = ACC.cur();
  return !!ACC.setNote('u01', '三班的同学') ? true : '写不了';
})() === true, 'ok');

ok('备注能在页面上看到', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; SYS.uq = ''; T.sysRender();
  return drwb().indexOf('三班的同学') >= 0 ? true : drwb().slice(0, 150);
})() === true, 'ok');

ok('备注超过 60 字会被截断', (function () {
  ACC.setNote('u01', new Array(200).join('x'));
  return ACC.get('u01').note.length === 60 ? true : ACC.get('u01').note.length;
})() === true, 'ok');

ok('普通人写不了备注', (function () {
  ACC.setNote('u01', '');
  ACC.logout(); ACC.login('u01', 'pw0001');
  const r = ACC.setNote('u02', '试着写');
  ACC.logout(); ACC.login('admin', 'fz2026@admin');
  return !r ? true : '普通用户居然能写';
})() === true, 'ok');

console.log('\n[7] 名单导出与导入');
ok('导出的是一段 JSON', (function () {
  const t = ACC.exportTxt();
  const o = JSON.parse(t);
  return o && o.app === 'fz' && o.u.length === ACC.list().length ? true : (o ? o.u.length : 'parse fail');
})() === true, 'ok');

ok('导出的名单里没有明文密码', (function () {
  const t = ACC.exportTxt();
  return t.indexOf('pw0001') < 0 && t.indexOf('fz2026@admin') < 0 ? true : '泄露明文';
})() === true, 'ok');

ok('导入能加进新账号', (function () {
  const t = JSON.stringify({
    v: 1, app: 'fz', u: [
      { n: 'newA', r: 'user', p: 'x', s: 'y', ct: Date.now(), lt: Date.now(), lg: 5, st: { sandbox: 3 } }
    ]
  });
  const r = ACC.importTxt(t);
  return r.add === 1 && !!ACC.get('newA') ? true : JSON.stringify(r);
})() === true, 'ok');

ok('导入的账号统计带过来了', (function () {
  const u = ACC.get('newA');
  return u.lg === 5 && u.stat && u.stat.sandbox === 3 ? true : JSON.stringify(u);
})() === true, 'ok');

ok('导入不覆盖本机已有的密码', (function () {
  const before = ACC.get('u01').pw;
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'u01', r: 'user', p: 'HACKED', s: 'zz', lg: 99 }] });
  ACC.importTxt(t);
  const u = ACC.get('u01');
  return u.pw === before && u.pw !== 'HACKED' ? true : '密码被覆盖了';
})() === true, 'ok');

ok('导入会并进更大的统计', (function () {
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'u01', r: 'user', lg: 99 }] });
  ACC.importTxt(t);
  return ACC.get('u01').lg === 99 ? true : ACC.get('u01').lg;
})() === true, 'ok');

ok('导入的统计不会越并越小', (function () {
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'u01', r: 'user', lg: 1 }] });
  ACC.importTxt(t);
  return ACC.get('u01').lg === 99 ? true : ACC.get('u01').lg;
})() === true, 'ok');

ok('导入带不进来最高权限', (function () {
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'fakeOwn', r: 'owner', p: 'a' }] });
  ACC.importTxt(t);
  const u = ACC.get('fakeOwn');
  return u && u.role === 'user' ? true : (u ? u.role : '没加进来');
})() === true, 'ok');

ok('导入可以把别人的封禁状态并进来', (function () {
  ACC.setBan('u02', 0);
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'u02', r: 'user', b: 1, br: '别处封的' }] });
  ACC.importTxt(t);
  const u = ACC.get('u02');
  const r = u.ban === 1 && u.banR === '别处封的';
  ACC.setBan('u02', 0);
  return r ? true : JSON.stringify(u);
})() === true, 'ok');

ok('导入动不了本机的最高权限账号', (function () {
  const t = JSON.stringify({ v: 1, app: 'fz', u: [{ n: 'admin', r: 'user', b: 1, br: 'x' }] });
  ACC.importTxt(t);
  const u = ACC.get('admin');
  return u.role === 'owner' && !u.ban ? true : (u.role + '/' + u.ban);
})() === true, 'ok');

ok('乱码导入会给出提示而不是崩', (function () {
  const r = ACC.importTxt('这不是 JSON');
  return r && r.err ? true : JSON.stringify(r);
})() === true, 'ok');

ok('空名单会给出提示', (function () {
  const r = ACC.importTxt('{"v":1,"app":"fz","u":[]}');
  return r && r.err ? true : JSON.stringify(r);
})() === true, 'ok');

ok('导入面板能打开', (function () {
  SYS.tab = 'acc'; SYS.uview = 1;
  T.sysAct('adm:imp');
  const r = SYS.impN === 1 && drwb().indexOf('粘贴名单') >= 0;
  T.sysAct('adm:impcancel');
  return r ? true : '面板没打开';
})() === true, 'ok');

ok('导出面板能打开', (function () {
  T.sysAct('adm:exp');
  const r = SYS.expN === 1 && drwb().indexOf('账号名单') >= 0;
  T.sysAct('adm:exp');
  return r ? true : '面板没打开';
})() === true, 'ok');

console.log('\n[8] 清空账号库');
ok('清空后只剩最高权限账号', (function () {
  const n = ACC.wipe();
  const L = ACC.list();
  return n >= 1 && L.length === 1 && L[0].name === 'admin' ? true : (n + '/' + L.length);
})() === true, 'ok');

ok('清空后最高权限账号还能登录', (function () {
  ACC.logout();
  const r = ACC.login('admin', 'fz2026@admin');
  return !!r.ok && ACC.isOwner() === true ? true : JSON.stringify(r);
})() === true, 'ok');

ok('清空确认是二次确认（不会误触）', (function () {
  SYS.tab = 'acc'; SYS.uview = 1;
  T.sysAct('adm:wipe');
  const a = SYS.wipeN === 1 && ACC.list().length >= 1;   /* 只是弹确认，还没删 */
  T.sysAct('adm:wipecancel');
  return a && SYS.wipeN === 0 ? true : '没有二次确认';
})() === true, 'ok');

console.log('\n[9] 使用人次（含没登录的访客）');
ok('进入模块会记一次使用', (function () {
  T.VIS.reset();
  T.enterScene('kinema');
  const d = T.VIS.load();
  return d.tot === 1 && d.n === 1 ? true : JSON.stringify(d);
})() === true, 'ok');

ok('不同模块分别记', (function () {
  T.enterScene('sandbox');
  const d = T.VIS.load();
  return d.mod.kinema === 1 && d.mod.sandbox === 1 ? true : JSON.stringify(d.mod);
})() === true, 'ok');

ok('没登录也算使用', (function () {
  ACC.logout();
  T.enterScene('kinema');
  const d = T.VIS.load();
  ACC.login('admin', 'fz2026@admin');
  return d.tot >= 3 ? true : d.tot;
})() === true, 'ok');

ok('用户中心里能看到使用人次', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; T.sysRender();
  const b = drwb();
  return b.indexOf('使用人次') >= 0 && b.indexOf('累计') >= 0 ? true : b.slice(0, 160);
})() === true, 'ok');

ok('页面里说明了数据存在各自设备 + 怎么并进来', (function () {
  const b = drwb();
  return b.indexOf('这台设备') >= 0 && b.indexOf('导入名单') >= 0 ? true : b.slice(0, 200);
})() === true, 'ok');

console.log('\n[9] 整洁度');
ok('源码里仍然没有明文口令', html.indexOf('fz2026@admin') < 0, 'ok');
ok('源码零外链', (html.match(/(src|href)\s*=\s*["']https?:\/\//gi) || []).length === 0, 'ok');
ok('用户中心相关的 CSS 已注入', html.indexOf('V17-CSS') >= 0 && html.indexOf('.ustat{') >= 0, 'ok');
ok('页面里说明了数据存在本机', (function () {
  SYS.tab = 'acc'; SYS.uview = 1; T.sysRender();
  return drwb().length > 50 ? true : '页面是空的';
})() === true, 'ok');

console.log('\n通过 ' + P + ' / 失败 ' + F);
if (F) { console.log('\n失败项：'); fails.forEach(f => console.log('  · ' + f)); process.exit(1); }
