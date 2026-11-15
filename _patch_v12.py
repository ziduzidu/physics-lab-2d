# -*- coding: utf-8 -*-
"""v12：注入「连接体与极值实验台」模块（含惯性力 / 非惯性系受力平衡按钮）"""
import io, re, os

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig = len(src)
applied = []

# ---------------------------------------------------------------- 1. 模块本体
mod = io.open('_mod_link.js', encoding='utf-8').read().strip()
block = re.search(r'/\* ===== LINK-BEGIN ===== \*/.*?/\* ===== LINK-END ===== \*/',
                  mod, re.S).group(0)
pat = re.compile(r'/\* ===== LINK-BEGIN ===== \*/.*?/\* ===== LINK-END ===== \*/\n?', re.S)
anchor = '/* ===================== \u5706\u5468\u8fd0\u52a8\u5b9e\u9a8c\u53f0 ===================== */'
if pat.search(src):
    # 必须用 lambda：re.sub 的替换串会把 JS 源码里的字面 \n 当成真换行
    src = pat.sub(lambda m: block + '\n\n', src)
    applied.append('module(replace)')
else:
    assert src.count(anchor) == 1, 'anchor %d' % src.count(anchor)
    src = src.replace(anchor, block + '\n\n' + anchor)
    applied.append('module(insert)')

# ---------------------------------------------------------------- 2. 图标
ICO_LINK = (" link:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.7\" "
            "stroke-linecap=\"round\" stroke-linejoin=\"round\">"
            "<rect x=\"2.2\" y=\"13.2\" width=\"7.6\" height=\"6.2\" rx=\"1.1\"/>"
            "<rect x=\"13.4\" y=\"4.4\" width=\"6.4\" height=\"5.4\" rx=\"1\"/>"
            "<path d=\"M12.4 7.1h1.6a2 2 0 012 2v6.2\"/>"
            "<path d=\"M9.8 16.3H8.2a2 2 0 01-2-2V9.8\"/></svg>',")
if " link:'<svg" not in src:
    old = " astro:'<svg"
    assert src.count(old) == 1, 'ico anchor %d' % src.count(old)
    src = src.replace(old, ICO_LINK + old)
    applied.append('ico')
else:
    applied.append('ico(exists)')

# ---------------------------------------------------------------- 3. 标签栏短名
if "link:'\u8fde\u63a5\u4f53'" not in src:
    old = "var SHORT={circ:"
    assert src.count(old) == 1, 'short anchor %d' % src.count(old)
    src = src.replace(old, "var SHORT={link:'\u8fde\u63a5\u4f53',circ:")
    applied.append('short')
else:
    applied.append('short(exists)')

# ---------------------------------------------------------------- 4. 首页卡片
CARD = (" {id:'link',name:'\u8fde\u63a5\u4f53\u4e0e\u6781\u503c\u5b9e\u9a8c\u53f0',\n"
        "  desc:'\u8fde\u63a5\u4f53\uff1a\u6574\u4f53\u6cd5\u6c42\u52a0\u901f\u5ea6\u3001\u9694\u79bb\u6cd5\u6c42\u5185\u529b\u3002\u6781\u503c\uff1a\u628a\u300c\u6070\u597d\u300d\u300c\u81f3\u5c11\u300d\u7ffb\u8bd1\u6210\u4e34\u754c\u6761\u4ef6\uff0c"
        "\u518d\u89e3\u4e0d\u7b49\u5f0f\u3002\u8fd8\u80fd\u5f00\u60ef\u6027\u529b\uff0c\u8df3\u8fdb\u52a0\u901f\u7684\u53c2\u8003\u7cfb\u5f53\u9759\u529b\u5e73\u8861\u6765\u505a\u3002',\n"
        "  tags:['\u6574\u4f53\u6cd5/\u9694\u79bb\u6cd5','\u4e34\u754c\u4e0e\u6781\u503c','\u60ef\u6027\u529b\u7cfb']},\n")
if "{id:'link'" not in src:
    old = " {id:'astro',name:'\u5929\u4f53\u7269\u7406\u6a21\u578b\u53f0',"
    assert src.count(old) == 1, 'card anchor %d' % src.count(old)
    src = src.replace(old, CARD + old)
    applied.append('card')
else:
    applied.append('card(exists)')

# ---------------------------------------------------------------- 5. 面板上的开关按钮
old = ("  $('#brief').textContent=sc.brief||'';\n"
       "  sc.params.forEach(function(p){")
new = ("  $('#brief').textContent=sc.brief||'';\n"
       "  /* \u6a21\u5757\u4e13\u5c5e\u5f00\u5173\uff08\u4f8b\u5982\u60ef\u6027\u529b / \u975e\u60ef\u6027\u7cfb\uff09\uff1a\u6a21\u5757\u58f0\u660e sc.toggles \u5c31\u4f1a\u51fa\u73b0\u4e00\u884c\u6309\u94ae */\n"
       "  if(sc.toggles&&sc.toggles.length){\n"
       "    var tw=document.createElement('div');tw.className='toggles';\n"
       "    sc.toggles.forEach(function(t){\n"
       "      if(App.P[t.key]===undefined)App.P[t.key]=t.def?1:0;\n"
       "      var b=document.createElement('button');\n"
       "      b.className='tgl'+(App.P[t.key]?' on':'');\n"
       "      b.textContent=t.label;\n"
       "      b.onclick=function(){\n"
       "        App.P[t.key]=App.P[t.key]?0:1;\n"
       "        b.className='tgl'+(App.P[t.key]?' on':'');\n"
       "        var wp=App.playing;App.playing=false;resetSim();render();App.playing=wp;\n"
       "      };\n"
       "      tw.appendChild(b);\n"
       "    });\n"
       "    box.appendChild(tw);\n"
       "  }\n"
       "  sc.params.forEach(function(p){")
if "sc.toggles&&sc.toggles.length" not in src:
    assert src.count(old) == 1, 'buildParams anchor %d' % src.count(old)
    src = src.replace(old, new)
    applied.append('buildParams')
else:
    applied.append('buildParams(exists)')

# ---------------------------------------------------------------- 6. 切模块时把开关置为默认
MARK = "if(sc.toggles)sc.toggles.forEach(function(t){App.P[t.key]=t.def?1:0;});"
if MARK not in src:
    old = ("  App.P={};\n"
           "  sc.params.forEach(function(p){App.P[p.key]=p.def;});")
    assert src.count(old) == 1, 'loadScene anchor %d' % src.count(old)
    new = ("  App.P={};\n"
           "  sc.params.forEach(function(p){App.P[p.key]=p.def;});\n"
           "  if(sc.toggles)sc.toggles.forEach(function(t){App.P[t.key]=t.def?1:0;});")
    src = src.replace(old, new)
    applied.append('loadScene')
else:
    applied.append('loadScene(exists)')

# ---------------------------------------------------------------- 7. 按钮样式
old = ".prow input[type=number]{width:66px;padding:2px 4px;border:1px solid var(--line);border-radius:4px;font-size:12.5px}"
assert src.count(old) == 1, 'css anchor %d' % src.count(old)
new = old + ("\n.toggles{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 9px}\n"
             ".tgl{font:12px/1.3 -apple-system,\"Microsoft YaHei\",sans-serif;padding:6px 9px;"
             "border:1px solid var(--line);background:#fff;color:var(--sub);border-radius:8px;cursor:pointer;text-align:left}\n"
             ".tgl.on{background:#ecfeff;border-color:#22d3ee;color:#0e7490;font-weight:700}")
if '.toggles{' not in src:
    src = src.replace(old, new)
    applied.append('css')
else:
    applied.append('css(exists)')

io.open(P, 'w', encoding='utf-8').write(src)
print('v12: %s | %d -> %d bytes' % (', '.join(applied), orig, len(src)))
