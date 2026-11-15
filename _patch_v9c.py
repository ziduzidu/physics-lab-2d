# -*- coding: utf-8 -*-
"""v9c: 空间模式的落点范围跟着放开（挡墙是 y=-30..44，别再被地面下限 -2 卡住）"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = 0


def rep(old, new, cnt=1):
    global src, applied
    c = src.count(old)
    assert c == cnt, 'expect %d got %d for %r' % (cnt, c, old[:70])
    src = src.replace(old, new)
    applied += 1


rep("""    tx=clamp(tx,-30,52);ty=clamp(ty,-2,40);""",
    """    tx=clamp(tx,-30,52);
    ty=clamp(ty,(SB.env==='space'?-26:-2),(SB.env==='space'?41:40));""")

rep("""  for(gy2=lo;gy2<=34;gy2+=0.55){""",
    """  for(gy2=(SB.env==='space'?-26:lo);gy2<=(SB.env==='space'?38:34);gy2+=0.55){""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v9c: %d ops, %d -> %d bytes' % (applied, orig_len, len(src)))
