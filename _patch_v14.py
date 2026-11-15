# -*- coding: utf-8 -*-
"""v14：隐藏最高权限账号 + 声音全方位升级（幂等注入 index.html）"""
import io, re, sys

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = []

# ================================================================ 1. CSS
CSSVER = u'SYS-CSS v14.1'      # 改 CSS 时把版本号加一，补丁就会自动整块替换
CSS = u"""
/* ===== SYS-CSS-BEGIN ===== */
/* """ + CSSVER + u""" */
.hacts{margin-left:auto;display:flex;align-items:center;gap:6px;flex:0 0 auto}
.bhome{flex:0 0 auto}
.ibtn{width:34px;height:34px;border-radius:11px;flex:0 0 auto;padding:0;display:flex;align-items:center;
  justify-content:center;background:rgba(255,255,255,.06);border:1px solid var(--edge);color:var(--hi2);
  cursor:pointer;transition:color .16s,background .16s,border-color .16s}
.ibtn:hover{color:var(--hi);background:rgba(255,255,255,.13);border-color:rgba(148,178,230,.36)}
.ibtn svg{width:17px;height:17px}
.ibtn.ava{border-radius:50%;font-size:13.5px;font-weight:700;color:#fff;border-color:transparent;
  background:linear-gradient(135deg,var(--acc2),var(--pri))}
.ibtn.ava.adm{background:linear-gradient(135deg,#b45309,#e11d48);
  box-shadow:0 0 0 1px rgba(225,29,72,.5),0 4px 14px rgba(225,29,72,.35)}
.tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.tabs::-webkit-scrollbar{display:none}
.tab{white-space:nowrap;flex:0 0 auto}
.msk{position:fixed;inset:0;z-index:60;background:rgba(2,6,18,.62);backdrop-filter:blur(3px);
  -webkit-backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .22s}
.msk.on{opacity:1;pointer-events:auto}
.drw{position:fixed;top:0;right:0;bottom:0;width:392px;max-width:92vw;z-index:61;display:flex;flex-direction:column;
  background:linear-gradient(180deg,#111c36,#0a1226);border-left:1px solid var(--edge);
  box-shadow:-26px 0 64px rgba(0,0,0,.55);transform:translateX(104%);
  transition:transform .27s cubic-bezier(.32,.72,0,1)}
.drw.on{transform:translateX(0)}
.drwt{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;
  border-bottom:1px solid var(--line);padding-top:max(12px,env(safe-area-inset-top))}
.drwt b{font-size:14.5px;color:#fff}
.drwtab{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid var(--line)}
.dtb{flex:1;padding:7px 0;border-radius:9px;border:1px solid var(--edge);background:rgba(255,255,255,.05);
  color:var(--hi2);font-size:12.5px;cursor:pointer;transition:.16s}
.dtb:hover{color:var(--hi)}
.dtb.on{background:linear-gradient(135deg,var(--acc2),var(--pri));color:#fff;border-color:transparent}
.drwb{flex:1 1 auto;overflow-y:auto;padding:12px 14px calc(20px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling:touch}
.ssec{font-size:11.5px;font-weight:700;letter-spacing:1.4px;color:var(--acc);margin:14px 0 8px}
.ssec:first-child{margin-top:0}
.slab{font-size:11px;font-weight:700;letter-spacing:.8px;color:#8fa6cc;margin:12px 0 0}
.srow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(148,178,230,.09)}
.sl{flex:1 1 auto;min-width:0}
.sl b{display:block;font-size:13px;color:var(--hi);font-weight:600}
.sl i{display:block;font-style:normal;font-size:11px;color:var(--hi2);margin-top:2px;line-height:1.5}
.sr{flex:0 0 auto;display:flex;align-items:center;gap:8px}
.sr input[type=range]{width:132px}
.sr input[type=checkbox]{width:18px;height:18px;accent-color:var(--acc)}
.sbtn{padding:8px 13px;border-radius:10px;border:1px solid var(--edge);background:rgba(255,255,255,.06);
  color:var(--hi2);font-size:12.5px;cursor:pointer;transition:.16s}
.sbtn:hover{color:var(--hi);border-color:rgba(148,178,230,.36);background:rgba(255,255,255,.11)}
.sbtn.pri{background:linear-gradient(135deg,var(--acc2),var(--pri));color:#fff;border-color:transparent;
  box-shadow:0 5px 16px rgba(37,99,235,.36)}
.sbtn.warn{color:#fda4af;border-color:rgba(225,29,72,.4);background:rgba(225,29,72,.1)}
.sbtn.mini{padding:4px 9px;font-size:11px}
.sbtn.tny{padding:6px 10px;font-size:11.5px;border-radius:9px}
.sgrp{display:flex;flex-wrap:wrap;gap:7px;margin:11px 0 4px}
.sgrp .sbtn.tny{margin:0}
.scar{display:flex;align-items:center;gap:11px;padding:11px;border-radius:12px;border:1px solid var(--edge);
  background:rgba(255,255,255,.045);-webkit-tap-highlight-color:transparent}
.sava{width:36px;height:36px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,var(--acc2),var(--pri))}
.sava.big{width:42px;height:42px;font-size:16px}
.sinfo{min-width:0}
.sinfo b{display:block;font-size:14px;color:#fff}
.sinfo i{display:block;font-style:normal;font-size:11.5px;color:var(--hi2);margin-top:2px}
.sadm{font-size:11px;color:#fca5a5;background:rgba(225,29,72,.14);border:1px solid rgba(225,29,72,.3);
  padding:3px 8px;border-radius:999px}
.sinp{width:150px;padding:7px 10px;border-radius:9px;border:1px solid var(--edge);background:rgba(255,255,255,.06);
  color:var(--hi);font-size:13px;outline:none}
.sinp:focus{border-color:var(--acc)}
.stip{margin:10px 0 2px;padding:10px 11px;border-radius:10px;font-size:11.5px;line-height:1.7;color:#b9c9e8;
  background:rgba(37,99,235,.1);border:1px solid rgba(148,178,230,.16)}
.stip b{color:var(--acc)}
.sempty{font-size:12px;color:var(--hi2);padding:8px 0}
.schips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.schip{padding:6px 11px;border-radius:999px;border:1px solid var(--edge);background:rgba(255,255,255,.05);
  color:var(--hi2);font-size:12px;cursor:pointer}
.schip.on{background:linear-gradient(135deg,var(--acc2),var(--pri));color:#fff;border-color:transparent}
.sta{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid var(--edge);
  background:rgba(255,255,255,.06);color:var(--hi);font-size:13px;line-height:1.6;resize:vertical;
  font-family:inherit;outline:none}
.sta:focus{border-color:var(--acc)}
.sbug{position:relative;padding:9px 10px;margin:7px 0;border-radius:10px;border:1px solid var(--edge);
  background:rgba(255,255,255,.04)}
.sbug b{font-size:12px;color:var(--acc)}
.sbug i{display:block;font-style:normal;font-size:10.5px;color:var(--hi2);margin:2px 0 5px}
.sbug p{margin:0;font-size:12.5px;color:var(--hi);line-height:1.6;word-break:break-word}
.sbug u{display:block;margin-top:5px;font-size:10px;color:#64748b;text-decoration:none;word-break:break-all}
.sbug .sbtn.mini{position:absolute;right:8px;bottom:8px}
@media(max-width:600px){
  header{flex-wrap:nowrap;gap:8px;padding:7px 10px;overflow:hidden}
  header h1{display:none}
  .bhome{padding:6px 8px;font-size:0}
  .bhome svg{width:15px;height:15px}
  .tabs{flex:1 1 auto;min-width:0}
  .hacts{gap:5px}
  .ibtn{width:32px;height:32px;border-radius:10px}
  .drw{top:auto;left:0;right:0;bottom:0;width:auto;max-width:none;height:88vh;
    border-left:none;border-top:1px solid var(--edge);border-radius:20px 20px 0 0;
    transform:translateY(104%);box-shadow:0 -20px 54px rgba(0,0,0,.6)}
  .drw.on{transform:translateY(0)}
  .drwt{padding-top:12px}
  .sr input[type=range]{width:104px}
  .sinp{width:130px}
}
/* ===== SYS-CSS-END ===== */
"""
if CSSVER not in src:
    src = re.sub(re.escape(u'/* ===== SYS-CSS-BEGIN ===== */') + u'[\\s\\S]*?' +
                 re.escape(u'/* ===== SYS-CSS-END ===== */') + u'\\n?', u'', src)
    i = src.find('</style>')
    assert i > 0, '</style> not found'
    src = src[:i] + CSS + src[i:]
    applied.append('css(%s)' % CSSVER)
else:
    applied.append('css(exists)')

# ================================================================ 2. 模块代码（幂等替换）
try:
    mod = io.open('_mod_sys.js', encoding='utf-8').read().rstrip() + u'\n'
except Exception as e:
    print('!! cannot read _mod_sys.js: %s' % e)
    sys.exit(1)

BEG = u'/* ===================== SYS-BEGIN ===================== */'
END = u'/* ===================== SYS-END ===================== */'
block = BEG + u'\n' + mod + END
pat = re.compile(re.escape(BEG) + u'[\\s\\S]*?' + re.escape(END))

if BEG in src:
    src = pat.sub(lambda m: block, src, count=1)   # 注意：必须用 lambda，repl 会吃掉字面 \\n
    applied.append('module(replace)')
else:
    ii = src.rfind('})();')
    assert ii > 0, 'IIFE end not found'
    src = src[:ii] + block + u'\n\n' + src[ii:]
    applied.append('module(insert)')

io.open(P, 'w', encoding='utf-8').write(src)
print('v14 patched: %s' % ', '.join(applied))
print('   %d -> %d bytes' % (orig_len, len(src)))
