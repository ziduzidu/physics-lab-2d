# -*- coding: utf-8 -*-
"""v20 补丁：3D 自由沙盒（free3d）
· 内联 cannon-es（MIT，github.com/pmndrs/cannon-es）作为三维刚体后端
· 注入 _mod_v20.js：自研 Canvas 2D 软件三维渲染 + 交互 + 材质 + 预设
· 首页/导航注册第 10 个模块、CSS、主循环与路由分发、版本号 v20

幂等：重复运行只会替换自己注入的块。
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


cannon = io.open('_cannon_inline.js', encoding='utf-8').read()
mod = io.open('_mod_v20.js', encoding='utf-8').read()

# ================================================================ 1. CSS
CSS = u"""
/* ===== V20-CSS-BEGIN ===== */
/* 3D 自由沙盒 · 材质色板与数据行 */
.f3mats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:2px 0 11px}
.f3m{display:flex;align-items:center;gap:6px;padding:7px 7px;border-radius:9px;
  border:1px solid rgba(148,163,184,.26);background:rgba(148,163,184,.06);
  cursor:pointer;font:inherit;font-size:12px;color:inherit;
  transition:background .16s,border-color .16s,box-shadow .16s,transform .12s}
.f3m i{width:13px;height:13px;flex:0 0 13px;border-radius:50%;background:var(--mc);
  box-shadow:inset -2px -2px 3px rgba(0,0,0,.34),inset 2px 2px 3px rgba(255,255,255,.42)}
.f3m b{font-weight:600}
.f3m:hover{background:rgba(56,189,248,.13);border-color:rgba(56,189,248,.46)}
.f3m:active{transform:scale(.96)}
.f3m.on{background:rgba(56,189,248,.19);border-color:rgba(56,189,248,.74);
  box-shadow:0 0 0 1px rgba(56,189,248,.3),0 5px 14px -6px rgba(56,189,248,.55)}
.f3kv{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;
  padding:5px 2px;border-bottom:1px dashed rgba(148,163,184,.30);color:#475569}
.f3kv span{opacity:.72}
.f3kv b{font-weight:600;font-variant-numeric:tabular-nums;color:#0f172a}
.f3tip{margin-top:11px;font-size:12px;line-height:1.72;color:#334155;
  padding:9px 11px;border-radius:9px;background:rgba(56,189,248,.09);
  border-left:2px solid rgba(56,189,248,.55)}
.f3tip b{color:#0c4a6e}
.f3m b{color:#334155}
@media (prefers-reduced-motion:reduce){.f3m{transition:none}.f3m:active{transform:none}}
/* 手机底部导航：11 项均分会溢出，改成「能均分就均分，放不下就横向滚」 */
@media(max-width:600px){
  .tabbar{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .tabbar::-webkit-scrollbar{display:none}
  .tabbar div{flex:1 0 50px;min-width:50px;padding:3px 2px}
}
/* ===== V20-CSS-END ===== */
"""
if u'V20-CSS-BEGIN' in src:
    src = re.sub(r'\n/\* ===== V20-CSS-BEGIN ===== \*/.*?/\* ===== V20-CSS-END ===== \*/',
                 CSS, src, count=1, flags=re.S)
    applied.append(u'css(replace)')
else:
    rep(u'css', u'/* ===== V19-CSS-END ===== */', u'/* ===== V19-CSS-END ===== */' + CSS)

# ================================================================ 2. CANNON（IIFE 内联）
CAN_TAG_B = u'/* ===== V20-CANNON-BEGIN ===== */'
CAN_TAG_E = u'/* ===== V20-CANNON-END ===== */'
can_block = CAN_TAG_B + u'\n' + cannon + u'\n' + CAN_TAG_E
if CAN_TAG_B in src:
    src = re.sub(re.escape(CAN_TAG_B) + r'.*?' + re.escape(CAN_TAG_E),
                 lambda m: can_block, src, count=1, flags=re.S)
    applied.append(u'cannon(replace)')
else:
    # 紧跟在严格模式声明之后
    anchor = u"(function(){\n'use strict';\n"
    rep(u'cannon', anchor, anchor + can_block + u'\n')

# ================================================================ 3. 模块主体
MOD_TAG_B = u'/* ===================== V20-BEGIN ===================== */'
MOD_TAG_E = u'/* ===================== V20-END ===================== */'
mod_block = MOD_TAG_B + u'\n' + mod + u'\n' + MOD_TAG_E
if MOD_TAG_B in src:
    src = re.sub(re.escape(MOD_TAG_B) + r'.*?' + re.escape(MOD_TAG_E),
                 lambda m: mod_block, src, count=1, flags=re.S)
    applied.append(u'module(replace)')
else:
    anchor = u'/* ===================== V19-END ===================== */'
    rep(u'module', anchor, anchor + u'\n\n' + mod_block)

# ================================================================ 4. Scenes 注册（须早于 buildTabs）
SC_ANCHOR = u"""/* ==================================================================
   板块二：天体沙盒（三维） Scenes.cosmos"""
SC_LINE = u"Scenes.free3d={id:'free3d',name:'3D 自由沙盒',params:[],examples:[]};"
SC_NOTE = u"""/* free3d 走独立实时分支（App.mode='free3d'），这里只为导航与通用遍历登记
   params / examples 留空，避免 buildParams 与冒烟测试把它当成纯函数场景 */
""" + SC_LINE + u"""

/* ==================================================================
   板块二：天体沙盒（三维） Scenes.cosmos"""
if u"Scenes.free3d={" in src:
    src = re.sub(r"Scenes\.free3d=\{[^}]*\};", lambda m: SC_LINE, src, count=1)
    applied.append(u'scenes(replace)')
else:
    rep(u'scenes', SC_ANCHOR, SC_NOTE)

# ================================================================ 5. 首页卡片
MOD_ANCHOR = u"""  tags:['N 体积分','自己搭系统','碰撞合并']}
];"""
MOD_NEW = u"""  tags:['N 体积分','自己搭系统','碰撞合并']},
 {id:'free3d',name:'3D 自由沙盒',
  desc:'真正能转着看的三维沙盒：往里面扔方块、球、圆柱、长板，搭塔、摆多米诺、做斜坡弹珠台。六种材质各有密度与摩擦，按住物体就能拖，点一下看它实时速度动能，还能一炮掀翻整座塔。',
  tags:['三维刚体','手拖 + 爆炸','六种材质']}
];"""
rep(u'modules', MOD_ANCHOR, MOD_NEW)

# ================================================================ 6. SHORT / ICO
rep(u'short',
    u"cosmos:'星系'}",
    u"cosmos:'星系',free3d:'3D'}")
rep(u'ico',
    u"cosmos:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.6\" stroke-linecap=\"round\">",
    u"free3d:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2.9l8.4 4.8v9.6L12 22.1 3.6 17.3V7.7z\"/><path d=\"M12 12.1l8.4-4.8M12 12.1L3.6 7.3M12 12.1v9.6\"/></svg>',\n  cosmos:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.6\" stroke-linecap=\"round\">")

# ================================================================ 7. 主循环
rep(u'loop',
    u"""  if(App.mode==='sandbox'){
    var now=(window.performance&&performance.now)?performance.now():Date.now();""",
    u"""  if(App.mode==='free3d'){ f3Frame(); return; }
  if(App.mode==='sandbox'){
    var now=(window.performance&&performance.now)?performance.now():Date.now();""")

# ================================================================ 8. render 分发
rep(u'render',
    u"""function render(){
  if(App.mode==='sandbox'){sbRender();return;}""",
    u"""function render(){
  if(App.mode==='sandbox'){sbRender();return;}
  if(App.mode==='free3d'){f3Render();return;}""")

# ================================================================ 9. 路由
rep(u'loadScene',
    u"""function loadScene(id){
  if(id==='sandbox'){App.mode='sandbox';sbEnter();return;}
  App.mode='scene';sbLeaveUI();""",
    u"""function loadScene(id){
  if(App.mode==='free3d' && id!=='free3d') f3Leave();
  if(id==='sandbox'){App.mode='sandbox';sbEnter();return;}
  if(id==='free3d'){App.mode='free3d';f3Enter();return;}
  App.mode='scene';sbLeaveUI();""")

# ================================================================ 10. 版本号 + 标题
rep(u'version',
    u"'<i>v19 · 单文件离线版</i>",
    u"'<i>v20 · 单文件离线版</i>")
rep(u'title',
    u'<h1>高考物理 <em>·</em> 力学与能量动量 2D 仿真实验室</h1>',
    u'<h1>高考物理 <em>·</em> 力学与能量动量仿真实验室</h1>')


# ================================================================ 11. route 直链改延迟
ROUTE_OLD = u"""(function route(){
  var h=location.hash||'';
  if(h.indexOf('#m=')===0&&Scenes[h.slice(3)]){enterScene(h.slice(3));return;}
  if(h.indexOf('#s=')===0){enterScene('sandbox');return;}
  showHome();
})();"""
ROUTE_NEW = u"""(function route(){
  /* 直链路由推迟到同步代码结束之后：v17/v19/v20 的模块体都在 route 之后
     才执行，同步 enterScene 会让新模块的 var 还没赋值，还会因异常终止整个脚本 */
  var h=location.hash||'';
  if(h.indexOf('#m=')===0&&Scenes[h.slice(3)]){
    var mid=h.slice(3);
    setTimeout(function(){ try{ enterScene(mid); }catch(e){} }, 0);
    return;
  }
  if(h.indexOf('#s=')===0){ setTimeout(function(){ try{ enterScene('sandbox'); }catch(e){} }, 0); return; }
  showHome();
})();"""
if u'setTimeout(function(){ try{ enterScene(mid); }catch(e){} }, 0);' in src and u'(function route(){' in src:
    applied.append(u'route(upgrade)')
elif ROUTE_NEW in src:
    applied.append(u'route(exists)')
else:
    rep(u'route', ROUTE_OLD, ROUTE_NEW)

# ================================================================ 写回
if fail:
    print('\n'.join(fail))
    print('\n!! 有 %d 处失败，未写回' % len(fail))
    sys.exit(1)

io.open(P, 'w', encoding='utf-8', newline='\n').write(src)
print('applied:', ', '.join(applied))
print('bytes: %d -> %d (+%d)' % (orig_len, len(src), len(src)-orig_len))
