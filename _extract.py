# -*- coding: utf-8 -*-
"""从 index.html 抽出页面脚本，供 node 校验 / 测试。"""
import re, io, sys

src = open('index.html', encoding='utf-8').read()
blocks = re.findall(r'<script\b[^>]*>(.*?)</script>', src, re.S)
print('script blocks:', len(blocks))
out = '\n'.join(blocks)
open('_check.js', 'w', encoding='utf-8').write(out)
print('bytes:', len(out))
# 顺带检查是否存在外部资源引用
bad = re.findall(r'(?:src|href)\s*=\s*["\'](https?:)?//', src)
print('external refs:', len(bad))
