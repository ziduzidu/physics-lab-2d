# -*- coding: utf-8 -*-
"""v16：焦痕淡出 · 管理员分级与撤销 · 沙盒声音不再响个不停"""
import io, re, sys

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = []
fail = []


def rep(tag, old, new, cnt=1):
    global src
    if old in src:
        src = src.replace(old, new, cnt)
        applied.append(tag)
    else:
        fail.append(tag)


# ================================================================ 1. CSS
CSSVER = u'V16-CSS v16.1'
CSS = u"""
/* ===== V16-CSS-BEGIN ===== */
/* """ + CSSVER + u""" */
.sown{font-size:10.5px;color:#fde68a;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.38);
  padding:2px 7px;border-radius:999px}
.susr2{font-size:10.5px;color:#9db2d8;background:rgba(148,178,230,.12);border:1px solid rgba(148,178,230,.22);
  padding:2px 7px;border-radius:999px}
.sava.own{background:linear-gradient(135deg,#b45309,#f59e0b)}
/* ===== V16-CSS-END ===== */
"""
if CSSVER not in src:
    src = re.sub(re.escape(u'/* ===== V16-CSS-BEGIN ===== */') + u'[\\s\\S]*?' +
                 re.escape(u'/* ===== V16-CSS-END ===== */') + u'\\n?', u'', src)
    i = src.find('</style>')
    assert i > 0, '</style> not found'
    src = src[:i] + CSS + src[i:]
    applied.append('css(%s)' % CSSVER)
else:
    applied.append('css(exists)')

# ================================================================ 2. 注入模块
try:
    mod = io.open('_mod_v16.js', encoding='utf-8').read().rstrip() + u'\n'
except Exception as e:
    print('!! cannot read _mod_v16.js: %s' % e)
    sys.exit(1)

BEG = u'/* ===================== V16-BEGIN ===================== */'
END = u'/* ===================== V16-END ===================== */'
block = BEG + u'\n' + mod + END
pat = re.compile(re.escape(BEG) + u'[\\s\\S]*?' + re.escape(END))

V15END = u'/* ===================== V15-END ===================== */'
if BEG in src:
    src = pat.sub(lambda m: block, src, count=1)
    applied.append('module(replace)')
elif V15END in src:
    j = src.find(V15END) + len(V15END)
    src = src[:j] + u'\n' + block + src[j:]
    applied.append('module(after v15)')
else:
    fail.append('!! 找不到 V15-END，模块没注入')

io.open(P, 'w', encoding='utf-8').write(src)
print('v16 patched: %s' % ', '.join(applied))
if fail:
    print('!! 未匹配：%s' % ' | '.join(fail))
print('   %d -> %d bytes' % (orig_len, len(src)))
