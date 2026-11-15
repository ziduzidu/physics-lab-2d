# -*- coding: utf-8 -*-
"""v17 补丁：用户管理中心（看到所有用户 + 封禁 + 授予权限 + 批量 + 导入导出）"""
import io, re, sys

P = u'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied, fail = [], []

# ================================================================ 1. CSS
CSSVER = u'V17-CSS v17.0'
CSS = u"""
/* ===== V17-CSS-BEGIN ===== */
/* """ + CSSVER + u""" */
.ustat{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px}
.ustc{flex:1 1 62px;min-width:58px;padding:7px 4px;border-radius:11px;text-align:center;
  border:1px solid rgba(148,178,230,.14);background:rgba(255,255,255,.05)}
.ustc b{display:block;font-size:16px;color:var(--hi);line-height:1.25}
.ustc i{display:block;font-size:10.5px;color:#7f93b8;font-style:normal;margin-top:2px}
.ustc.warn b{color:#fda4af}
.utbar{display:flex;gap:6px;margin-bottom:7px}
.uq{width:100%;flex:1 1 auto;min-width:0}
.uchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:7px}
.uchips .sbtn{padding:5px 11px;font-size:11.5px;border-radius:9px}
.uchips .sbtn.on{background:linear-gradient(135deg,var(--acc2),var(--pri));color:#fff;border-color:transparent}
.ubulk{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:7px 9px;margin-bottom:8px;
  border-radius:11px;border:1px solid rgba(148,178,230,.14);background:rgba(255,255,255,.04)}
.ubulk .sbtn{padding:5px 10px;font-size:11.5px;border-radius:9px}
.uck{width:17px;height:17px;flex:0 0 auto;align-self:center;margin-right:4px;accent-color:var(--acc)}
.susr.sel{border-color:var(--acc);background:rgba(59,130,246,.1)}
.ulist{min-height:20px}
.sta{width:100%;min-height:76px;max-height:190px;resize:vertical;padding:8px 10px;border-radius:10px;
  border:1px solid var(--edge);background:rgba(255,255,255,.06);color:var(--hi);font-size:11px;
  font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.55;word-break:break-all}
.sta:focus{border-color:var(--acc)}
/* ===== V17-CSS-END ===== */
"""
if CSSVER not in src:
    src = re.sub(re.escape(u'/* ===== V17-CSS-BEGIN ===== */') + u'[\\s\\S]*?' +
                 re.escape(u'/* ===== V17-CSS-END ===== */') + u'\\n?', u'', src)
    i = src.find('</style>')
    if i <= 0:
        fail.append('!! 找不到 </style>')
    else:
        src = src[:i] + CSS + src[i:]
        applied.append('css(%s)' % CSSVER)
else:
    applied.append('css(exists)')

# ================================================================ 2. 注入模块
try:
    mod = io.open('_mod_v17.js', encoding='utf-8').read().rstrip() + u'\n'
except Exception as e:
    print('!! cannot read _mod_v17.js: %s' % e)
    sys.exit(1)

BEG = u'/* ===================== V17-BEGIN ===================== */'
END = u'/* ===================== V17-END ===================== */'
block = BEG + u'\n' + mod + END
pat = re.compile(re.escape(BEG) + u'[\\s\\S]*?' + re.escape(END))

V16END = u'/* ===================== V16-END ===================== */'
if BEG in src:
    src = pat.sub(lambda m: block, src, count=1)
    applied.append('module(replace)')
elif V16END in src:
    j = src.find(V16END) + len(V16END)
    src = src[:j] + u'\n' + block + src[j:]
    applied.append('module(after v16)')
else:
    fail.append('!! 找不到 V16-END，模块没注入')

io.open(P, 'w', encoding='utf-8').write(src)
print('v17 patched: %s' % ', '.join(applied))
if fail:
    print('!! 未匹配：%s' % ' | '.join(fail))
print('   %d -> %d bytes' % (orig_len, len(src)))
