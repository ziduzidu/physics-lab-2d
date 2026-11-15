# -*- coding: utf-8 -*-
"""v19 补丁：3A 级精修
声效（闪避+触感+场景混响）/ 图形（高光+投影+暗角+色阶）/ 排版（字体+等宽数字）
美观（按压反馈+滚动条+微动效）+ 版本号 v19
"""
import io, re, sys

P = u'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied, fail = [], []

def rep(tag, old, new, must=1):
    global src
    if new in src:
        applied.append(tag + '(exists)')
        return
    n = src.count(old)
    if n != 1:
        if must:
            fail.append(u'!! %s 命中 %d 处（应为 1）' % (tag, n))
        else:
            applied.append(tag + '(skip %d)' % n)
        return
    src = src.replace(old, new, 1)
    applied.append(tag)

# ================================================================ 1. CSS（排版 + 美观）
CSSVER = u'V19-CSS v19.0'
CSS = u"""
/* ===== V19-CSS-BEGIN ===== */
/* """ + CSSVER + u""" */
/* ---- 排版：字体栈升级 + 全局等宽数字 ---- */
body{font-family:-apple-system,BlinkMacSystemFont,"HarmonyOS Sans SC","PingFang SC",
  "Noto Sans SC","Segoe UI","Microsoft YaHei",sans-serif;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
table.ro td:last-child,.stat b,.stagebar,#timeTag{font-variant-numeric:tabular-nums}
::selection{background:rgba(34,211,238,.30);color:inherit}
:focus-visible{outline:2px solid rgba(34,211,238,.62);outline-offset:2px;border-radius:6px}
/* ---- 美观：统一按压反馈 / 缓动曲线 ---- */
.btn,.sbtn,.tab,.bhome,.mcard,.mico,.mgo{transition-timing-function:cubic-bezier(.2,.8,.3,1)}
.btn,.sbtn,.tab,.bhome{transition-property:transform,background,border-color,color,box-shadow;
  transition-duration:.14s,.16s,.16s,.16s,.16s}
.btn:active,.sbtn:active,.bhome:active{transform:scale(.94)}
.tab:active{transform:scale(.93)}
/* ---- 美观：滚动条与细节 ---- */
*::-webkit-scrollbar{width:8px;height:8px}
*::-webkit-scrollbar-thumb{background:rgba(148,178,230,.22);border-radius:99px}
*::-webkit-scrollbar-thumb:hover{background:rgba(148,178,230,.36)}
*::-webkit-scrollbar-track{background:transparent}
.srow{transition:background .16s}
.srow:hover{background:rgba(255,255,255,.03)}
/* ---- 美观：首页卡片微动效 ---- */
.mcard .mico{transition:transform .22s cubic-bezier(.2,.8,.3,1),box-shadow .22s}
.mcard:hover .mico{transform:translateY(-1px) scale(1.06);box-shadow:0 8px 20px rgba(34,211,238,.22)}
.mcard .mgo{transition:letter-spacing .22s,opacity .22s}
.mcard:hover .mgo{letter-spacing:1.5px;opacity:1}
.mcard:hover .htitle{letter-spacing:.9px}
/* ---- 无障碍：跟随系统"减少动效" ---- */
@media (prefers-reduced-motion:reduce){
  .mcard,.btn,.sbtn,.tab,.bhome,.mico,.mgo,.srow{transition:none!important}
  .mcard:hover{transform:none}
}
/* ===== V19-CSS-END ===== */
"""
if CSSVER not in src:
    src = re.sub(re.escape(u'/* ===== V19-CSS-BEGIN ===== */') + u'[\\s\\S]*?' +
                 re.escape(u'/* ===== V19-CSS-END ===== */') + u'\\n?', u'', src)
    i = src.find('</style>')
    if i <= 0:
        fail.append(u'!! 找不到 </style>')
    else:
        src = src[:i] + CSS + src[i:]
        applied.append(u'css(%s)' % CSSVER)
else:
    applied.append(u'css(exists)')

# ================================================================ 2. 注入 v19 模块
try:
    mod = io.open('_mod_v19.js', encoding='utf-8').read().rstrip() + u'\n'
except Exception as e:
    print('!! cannot read _mod_v19.js: %s' % e)
    sys.exit(1)

BEG = u'/* ===================== V19-BEGIN ===================== */'
END = u'/* ===================== V19-END ===================== */'
block = BEG + u'\n' + mod + END
pat = re.compile(re.escape(BEG) + u'[\\s\\S]*?' + re.escape(END))

V17END = u'/* ===================== V17-END ===================== */'
if BEG in src:
    src = pat.sub(lambda m: block, src, count=1)
    applied.append(u'module(replace)')
elif V17END in src:
    j = src.find(V17END) + len(V17END)
    src = src[:j] + u'\n' + block + src[j:]
    applied.append(u'module(after v17)')
else:
    fail.append(u'!! 找不到 V17-END，模块没注入')

# ================================================================ 3. 绘制挂点（唯一性已在开发时校验）
rep(u'sbPaint 挂高光',
    u"  sbTex(g,b,X,Y,M,R);\n  g.strokeStyle=M.edge||'#0f172a';g.lineWidth=1.5;g.stroke();",
    u"  sbTex(g,b,X,Y,M,R);\n  if(typeof sbSheen==='function')sbSheen(g,b,X,Y,M,R);\n"
    u"  g.strokeStyle=M.edge||'#0f172a';g.lineWidth=1.5;g.stroke();")
rep(u'sbDrawBody 挂投影',
    u'function sbDrawBody(g,b){\n  if(b.ghost)return;                 // 空间边界是隐形的：参与碰撞但不画出来\n'
    u'  var X=sbX(b.x),Y=sbY(b.y);\n  var M=matDef(b.mat);',
    u'function sbDrawBody(g,b){\n  if(b.ghost)return;                 // 空间边界是隐形的：参与碰撞但不画出来\n'
    u'  var X=sbX(b.x),Y=sbY(b.y);\n  var M=matDef(b.mat);\n'
    u"  if(typeof sbDropShadow==='function')sbDropShadow(g,b,X,Y);")
rep(u'sbRender 挂色阶',
    u'  g.clearRect(0,0,W,H);\n  SB.view.W=W;SB.view.H=H;',
    u'  g.clearRect(0,0,W,H);\n  if(typeof V19!==\'undefined\'&&V19.grade){\n'
    u'    var bg19=g.createLinearGradient(0,0,0,H);\n'
    u"    if(SB.dark){bg19.addColorStop(0,'#0b1326');bg19.addColorStop(1,'#070b17');}\n"
    u"    else{bg19.addColorStop(0,'#f8fafd');bg19.addColorStop(1,'#edf2f9');}\n"
    u'    g.fillStyle=bg19;g.fillRect(0,0,W,H);\n  }\n'
    u'  SB.view.W=W;SB.view.H=H;')

# ================================================================ 4. 版本号
rep(u'版本号', u'v18 · 单文件离线版', u'v19 · 单文件离线版')

io.open(P, 'w', encoding='utf-8').write(src)
print(u'v19 patched: %s' % u', '.join(applied))
if fail:
    print(u'!! 未匹配：%s' % u' | '.join(fail))
print(u'   %d -> %d bytes' % (orig_len, len(src)))
