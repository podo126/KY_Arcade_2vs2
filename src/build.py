#!/usr/bin/env python3
"""index.html 만들기:  python3 build.py   (games 폴더의 게임을 순서대로 모두 넣음)
   특정 게임만:      python3 build.py punch chop
   게임 순서는 GAME_ORDER, 새 게임은 games/새이름.js 를 추가하면 자동 포함"""
import os,sys
D=os.path.dirname(os.path.abspath(__file__));r=lambda f:open(os.path.join(D,f),encoding='utf8').read()
GAME_ORDER=['punch','chop','serve']
have=[f[:-3] for f in sorted(os.listdir(os.path.join(D,'games'))) if f.endswith('.js')]
args=[a for a in sys.argv[1:] if not a.startswith('--')];RELEASE='--release' in sys.argv   # --release: 테스트 기능(core/test.js) 빼고 빌드
games=args or [g for g in GAME_ORDER if g in have]+[g for g in have if g not in GAME_ORDER]
for g in games:
    if g not in have:sys.exit(f'게임 파일이 없습니다: games/{g}.js')
h=r('core/shell.html');app=r('core/registry.js')+'\n'.join(r(f'games/{g}.js') for g in games)+'\n'+r('core/core.js')+('' if RELEASE else '\n'+r('core/test.js'))
for k,v in [('/*@FONTS*/',r('core/fonts.css')),('/*@ROOT*/',r('core/root.css')),('/*@CSS*/',r('core/app.css')),('/*@ASSETS*/',r('core/assets.js')),('/*@VENDOR*/',r('core/vendor/supabase-js-2.119.0.umd.js')),('/*@APP*/',app)]:
    assert k in h,k;h=h.replace(k,v.replace('</script','<\\/script'))
root=os.path.dirname(D)
if '--both' in sys.argv:   # 리포지토리용: index.html = 행사용(테스트 기능 없음) · test.html = 리허설용(혼자 연습 · ?fakert=1)
    rel=h.replace(r('core/test.js').replace('</script','<\\/script'),'')
    open(os.path.join(root,'index.html'),'w',encoding='utf8').write(rel);open(os.path.join(root,'test.html'),'w',encoding='utf8').write(h)
    print('완료: index.html (행사용) · test.html (리허설용) · 게임:',', '.join(games));sys.exit()
out=os.path.join(root,'index.html');open(out,'w',encoding='utf8').write(h)
print('완료: index.html  · 게임:',', '.join(games),'· 테스트 기능 '+('제외' if RELEASE else '포함'),f'({len(h.encode())//1024} KB)')
