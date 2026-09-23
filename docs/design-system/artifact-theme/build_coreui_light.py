#!/usr/bin/env python3
"""Rebuild coreui-light.min.css from @coreui/coreui dist. Usage: build_coreui_light.py SRC_coreui.min.css OUT"""
import sys
src=open(sys.argv[1],encoding='utf-8').read()
def mb(s,st):
    d=0
    for j in range(st,len(s)):
        if s[j]=='{':d+=1
        elif s[j]=='}':
            d-=1
            if d==0:return j
def split_sel(sel):
    parts=[];d=0;cur=''
    for ch in sel:
        if ch in '([':d+=1
        elif ch in ')]':d-=1
        if ch==',' and d==0: parts.append(cur);cur=''
        else: cur+=ch
    parts.append(cur);return parts
out=[];i=0;dropped=0;rewritten=0
while True:
    b=src.find('{',i)
    if b<0: out.append(src[i:]);break
    sel=src[i:b];e=mb(src,b)
    if 'data-coreui-theme=dark' in sel and not sel.lstrip().startswith('@'):
        lead=sel[:len(sel)-len(sel.lstrip())]
        keep=[p for p in split_sel(sel.lstrip()) if 'data-coreui-theme=dark' not in p]
        if keep: out.append(lead+','.join(keep)+src[b:e+1]);rewritten+=1
        else: dropped+=1
    else: out.append(src[i:e+1])
    i=e+1
css=''.join(out).replace(':root,[data-coreui-theme=light]',':root',1)
open(sys.argv[2],'w',encoding='utf-8').write(css)
print('dropped',dropped,'rewritten',rewritten,len(src),'->',len(css))
