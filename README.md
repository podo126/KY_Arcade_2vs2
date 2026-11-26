# KY_Arcade_2vs2 — 시연용 (무대) · v1.1.30

YouTube Creator Club 무대에서 크리에이터 2:2 대결에 쓰는 미니게임 3판 (쿵야 펀치 → 쿵야 주방 난타 → 쿵야 서빙).

## 운영 구성
| 구분 | 시연용 (이 리포지토리) | 부스용 (운영 중) |
|---|---|---|
| 내용 | 2:2 미니게임 3판 연속 · 최종 결과만 표시 | 아케이드 3종 · 로그인 · 랭킹 |
| GitHub | `KY_Arcade_2vs2` | 별도 리포지토리 |
| Supabase | KY_Arcade (공용) — **Realtime만 사용, DB·로그인 안 씀** | KY_Arcade (공용) — 테이블·함수·로그인 |
| Cloudflare | Pages 프로젝트 **새로 생성** | 운영 중 |

시연용은 Supabase의 테이블·함수·로그인 설정을 **읽지도 바꾸지도 않으므로** 부스 서버에 영향이 없습니다.

## 파일
```
index.html     행사용 (배포되는 파일, 테스트 기능 없음)
test.html      리허설용 (혼자 연습 · ?fakert=1 오프라인 방 테스트)
_headers       Cloudflare Pages 캐시 설정 (HTML 캐시 안 함 → 수정이 바로 반영)
src/           수정용 원본 → cd src && python3 build.py --both  로 index.html · test.html 다시 만듦
  core/        공통 틀 · core.js 맨 위 SB_URL · SB_KEY (Supabase 연결) · vendor/ (supabase-js 2.119.0 내장)
  games/       punch.js · chop.js · serve.js
```

## Cloudflare Pages 만들기 (처음 한 번)
1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. GitHub 연결 → 리포지토리 **KY_Arcade_2vs2** 선택
3. 설정
   - Project name: `ky-arcade-2vs2` (밑줄은 못 써서 하이픈) → 주소 `https://ky-arcade-2vs2.pages.dev`
   - Production branch: `main`
   - Framework preset: **None** · Build command: **비움** · Build output directory: **/** (루트)
4. **Save and Deploy** → 이후 `main`에 push 할 때마다 자동 배포
5. 리허설 주소: `https://ky-arcade-2vs2.pages.dev/test.html`

## Supabase 확인 (처음 한 번)
- KY_Arcade → **Project Settings → Realtime → Allow public access** 가 **켜져 있어야** 합니다. 시연용은 로그인 없이 공개 채널(`kyb-room-코드`, `kyb-in-코드`)을 씁니다.
- 부스용 로그인 때문에 이 설정을 끈 상태라면 시연용 방 만들기가 "서버에 연결할 수 없습니다"로 실패합니다. 이때는 알려 주세요 (부스용 로그인과 함께 쓰는 방식으로 바꿔야 함).
- 사용량: 무료 플랜 기준 초당 메시지 100 · 동시 접속 200 · 월 200만 메시지. 한 경기(약 10분) ≈ 3~4만 메시지.

## 작업 흐름
```bash
git pull
# src/ 수정 후
cd src && python3 build.py --both && cd ..
git add . && git commit -m "v1.1.31: 수정 내용"
git tag v1.1.31
git push && git push --tags          # → Pages 자동 배포
```

## 작업 복구
| 상황 | 명령 |
|---|---|
| 상태 확인 | `git status` · `git log --oneline -10` |
| 커밋 전 수정 취소 | `git restore 파일` |
| add 취소 | `git restore --staged 파일` |
| 파일만 예전 버전으로 | `git restore --source v1.1.30 -- index.html test.html` |
| 올린 커밋 되돌리기 (안전) | `git revert 커밋ID` → `git push` |
| 예전 버전에서 새로 시작 | `git switch -c fix-130 v1.1.30` |
| 내 PC를 GitHub와 똑같이 | `git fetch origin && git reset --hard origin/main` |
| 지운 커밋·리셋 되살리기 | `git reflog` → `git reset --hard HEAD@{번호}` |

`git reset --hard` 는 저장 안 한 수정을 지웁니다. 보통은 `git revert` · `git restore --source` 를 쓰세요.

**행사 중 가장 빠른 복구**: Cloudflare → Pages → ky-arcade-2vs2 → **Deployments** → 이전 배포 → **Rollback** (코드 수정 없이 즉시 이전 화면으로).

## 처음 올리기 (리포지토리가 비어 있을 때)
```bash
cd KY_Arcade_2vs2
git init -b main
git add .
git commit -m "시연용 v1.1.30"
git tag v1.1.30
git remote add origin https://github.com/<계정>/KY_Arcade_2vs2.git
git push -u origin main --tags
```
