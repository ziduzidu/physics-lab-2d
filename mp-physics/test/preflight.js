/* 发布前自检：JSON、页面完整性、WXML 语法禁区、包体大小、外链 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}
function walk(dir, out) {
  out = out || [];
  fs.readdirSync(dir).forEach(function (f) {
    if (f === 'node_modules' || f === '.workbuddy') return;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  });
  return out;
}
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

console.log('\n[1] 配置文件');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
ok('app.json 是严格 JSON 且能解析', !!appJson);
ok('declares lazyCodeLoading', appJson.lazyCodeLoading === 'requiredComponents', appJson.lazyCodeLoading);
ok('pages 非空', Array.isArray(appJson.pages) && appJson.pages.length > 0, appJson.pages && appJson.pages.length);
ok('首页是 pages/index/index', appJson.pages[0] === 'pages/index/index', appJson.pages[0]);

const proj = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'));
ok('project.config.json 可解析', !!proj);
ok('compileType 是 miniprogram', proj.compileType === 'miniprogram', proj.compileType);
ok('sitemap 存在', fs.existsSync(path.join(ROOT, 'sitemap.json')));

console.log('\n[2] 页面文件完整性');
appJson.pages.forEach(function (p) {
  ['js', 'json', 'wxml', 'wxss'].forEach(function (ext) {
    const f = path.join(ROOT, p + '.' + ext);
    ok(p + '.' + ext + ' 存在', fs.existsSync(f), rel(f));
  });
});

console.log('\n[3] WXML 语法禁区');
const wxmls = walk(path.join(ROOT, 'pages')).filter(f => f.endsWith('.wxml'));
wxmls.forEach(function (f) {
  const s = fs.readFileSync(f, 'utf8');
  const bad = [];
  if (/\?\./.test(s)) bad.push('可选链 ?.');
  if (/\?\?/.test(s)) bad.push('空值合并 ??');
  if (/=>/.test(s)) bad.push('箭头函数');
  if (/<div|<span|<canvas(?!\s)/.test(s)) bad.push('HTML 标签');
  if (/\{\{[^}]*\([^}]*\)/.test(s)) bad.push('表达式里调函数');
  ok(rel(f) + ' 无非法写法', bad.length === 0, bad.join(','));
});

console.log('\n[4] 画布 id 与代码一致');
const sceneWxml = fs.readFileSync(path.join(ROOT, 'pages/scene/scene.wxml'), 'utf8');
const sceneJs = fs.readFileSync(path.join(ROOT, 'pages/scene/scene.js'), 'utf8');
['scene', 'chV', 'chE'].forEach(function (id) {
  ok('wxml 里有 canvas#' + id, new RegExp('id="' + id + '"').test(sceneWxml));
  ok('js 里绑定了 ' + id, new RegExp("bindCanvas\\('" + id + "'").test(sceneJs));
});

console.log('\n[5] 包体大小');
const files = walk(ROOT);
let total = 0;
let biggest = { f: '', n: 0 };
files.forEach(function (f) {
  const n = fs.statSync(f).size;
  total += n;
  if (n > biggest.n) biggest = { f: rel(f), n: n };
});
ok('主包总大小 < 2MB', total < 2 * 1024 * 1024, (total / 1024).toFixed(0) + ' KB');
ok('单文件 < 1MB', biggest.n < 1024 * 1024, biggest.f + ' ' + (biggest.n / 1024).toFixed(0) + ' KB');
console.log('    总计 ' + (total / 1024).toFixed(1) + ' KB，最大 ' + biggest.f);

console.log('\n[6] 无外链、无浏览器专有 API 泄漏到页面');
const srcs = files.filter(f => /\.(js|wxml|wxss|json)$/.test(f));
let ext = 0, domUse = 0;
srcs.forEach(function (f) {
  const s = fs.readFileSync(f, 'utf8');
  if (/(src|href)\s*=\s*["']https?:\/\//i.test(s)) ext++;
  if (f.indexOf('utils') < 0 && /\bdocument\.(getElementById|querySelector|body)/.test(s)) domUse++;
});
ok('没有外链资源', ext === 0, ext);
ok('页面代码没有直接摸 DOM', domUse === 0, domUse);

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail === 0 ? 0 : 1);
