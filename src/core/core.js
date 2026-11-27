/* ┌─────────────────────────────────────────────────────────
   │ 미니게임 배틀 공통 틀 (core)
   │ 메인(닉네임 · 비밀번호) · 대기방(개인전 4칸, 모두 READY → 3초 뒤 시작) · 게임 3종 연속 + 개인 점수표 · 최종 결과 → 대기방 · 설정
   │ 게임은 games/*.js 가 regGame({...}) 로 등록합니다 (규칙은 games/README 참고).
   └───────────────────────────────────────────────────────── */
/* GAMES · regGame 은 core/registry.js (게임 파일보다 먼저 로드) */
const GW=480,GH=270;   // 모든 게임 공통 캔버스 도트 크기 (4K 6배 · 1080p 3배)
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem('kyb_'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('kyb_'+k,JSON.stringify(v));}catch(e){}}};
/* 방 연결: Supabase Realtime (KY_Arcade 프로젝트). 바꿀 일이 있으면 이 두 줄만 수정 · 공개용(publishable) 키라 페이지에 넣어도 되는 키 */
const SB_URL='https://bocghvafjcxhgxuwwrts.supabase.co',SB_KEY='sb_publishable_0rgqKtLgUIosom5C8j_SBw_MsgdLSDb';
const SNAP_EVERY=6;   /* 방장 화면 전송 간격(프레임): 6 = 초당 10번 (무료 플랜 초당 메시지 한도 안쪽) */
const CFG={char:LS.get('char','yk'),filter:LS.get('filter2',false),sound:LS.get('sound',true),name:LS.get('name','')};
/* 개인전: 1P~4P 고유 색 (캐릭터 테두리 · 점수표 · 대기방 칸) */
const PCOL=['#00ccf3','#fff419','#ff5ad0','#58d838'];
/* 세로 4분할 화면 (1vs1vs1vs1): i번 플레이어 칸 = 가로 120 x 세로 270, 왼쪽부터 1P 2P 3P 4P · 맨 위 QB 도트 = 이름 · 점수 띠 */
const QW=120,QH=270,QB=36,qx=i=>i*QW,qy=i=>0;
/* 세로 4분할 공통 틀: 칸 사이 선 · 위쪽 띠(이름 · 점수, 아래에 플레이어 색 줄) */
function quadFrame(i,S,me){const x=qx(i),y=qy(i),c=PCOL[i],sl=GAME&&GAME.slots&&GAME.slots[i];
  R(x,y,QW,QB,MAP.ink);R(x,y+QB-2,QW,2,c);R(x+4,y+4,6,6,c);K(sl?sl.name.slice(0,6):'',x+QW/2+3,y+2,c,'center',8);
  txt(String(S.ps?S.ps[i]:0),x+QW-6,y+19,'#fff','right',8);
  R(x,y,1,QH,MAP.ink);R(x+QW-1,y,1,QH,MAP.ink);
  if(me>=0&&i!==me)R(x+1,y+QB,QW-2,QH-QB-1,'rgba(20,30,40,.14)');   /* 내 칸이 있으면 다른 칸은 살짝 어둡게 */
  if(i===me){const Y=MAP.yellow;R(x,y,QW,2,Y);R(x,y+QH-2,QW,2,Y);R(x,y,2,QH,Y);R(x+QW-2,y,2,QH,Y);R(x,y+QB-2,QW,2,Y);}}   /* 내 칸: 노란 2도트 테두리 */
/* 맵 색: 진한 색 = 포인트, 연한 색 = 바탕 (logo_yellow · logo_blue · restaurant_floor01/02 · restaurant_wall) */
const MAP={yellow:'#fff419',blue:'#00ccf3',mint:'#a3e4d5',green:'#f6fef3',cream:'#fefcdd',shade:'#f0edc7',hi:'#fffef0',ink:'#2a3a48'};
function wallTiles(x,y,w,h){const t=IMG.tile_wall25;R(x,y,w,h,MAP.cream);if(!t||!t.complete)return;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();for(let yy=y;yy<y+h;yy+=16)for(let xx=x;xx<x+w;xx+=16)g.drawImage(t,xx,yy);g.restore();}
/* 캐릭터: big = 비율 조정한 원본 그림 (선택 화면 · 게임 속 모두 이 그림 하나) */
const CHARS=[{id:'yk',name:'양파쿵야',short:'양',big:'big_yk'},{id:'jm',name:'주먹밥쿵야',short:'주',big:'big_jm'},
  {id:'sk',name:'샐쿵',short:'샐',big:'big_sk'},{id:'mk',name:'무쿵',short:'무',big:'big_mk'},{id:'bk',name:'반계',short:'반',big:'big_bk'}];
const charOf=id=>CHARS.find(c=>c.id===id)||CHARS[0];
/* ---------- 이미지 (core/assets.js 의 CHS) ---------- */
const IMG={};for(const k in CHS){const v=CHS[k],im=new Image();im.src=typeof v==='string'?v:v.src;IMG[k]=im;}
const OUTL={};
/* 테두리(팀 색) + 색 덧칠이 들어간 스프라이트 캐시 */
function outlined(key,sx,sy,w,h,col,tint){const k=[key,sx,sy,w,h,col,tint].join();if(OUTL[k])return OUTL[k];const im=IMG[key];if(!im||!im.complete||!im.naturalWidth)return null;
  const c=document.createElement('canvas');c.width=w+2;c.height=h+2;const x=c.getContext('2d');
  const m=document.createElement('canvas');m.width=w;m.height=h;const mx=m.getContext('2d');mx.drawImage(im,sx,sy,w,h,0,0,w,h);
  if(tint){mx.globalCompositeOperation='source-atop';mx.fillStyle=tint;mx.globalAlpha=.75;mx.fillRect(0,0,w,h);mx.globalAlpha=1;}
  if(col){const s=document.createElement('canvas');s.width=w;s.height=h;const s2=s.getContext('2d');s2.drawImage(im,sx,sy,w,h,0,0,w,h);s2.globalCompositeOperation='source-in';s2.fillStyle=col;s2.fillRect(0,0,w,h);
    for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])x.drawImage(s,dx,dy);}
  x.drawImage(m,1,1);return OUTL[k]=c;}
/* 쿵야 그리기: 모든 게임에서 비율 조정한 원본 그림(big_*)을 1배로 · 팀 색 테두리 · 발 밑 가운데가 (x,y).
   o={tint:덧칠 색, a:투명도, flip} (원본은 프레임이 1장이라 움직임은 위치·다리 모션으로 표현) */
function koongC(i){const sl=GAME&&GAME.slots&&GAME.slots[i];return charOf(sl&&sl.ch||(i%2?'jm':'yk'));}
function koongCv(i,tint){const C=koongC(i),B=CHS[C.big];return outlined(C.big,0,0,B.w,B.h,PCOL[i]||PCOL[0],tint);}
function koongSize(i){const B=CHS[koongC(i).big];return{w:B.w+2,h:B.h+2};}
function koong(i,x,y,o={}){const c=koongCv(i,o.tint);if(!c)return;g.save();if(o.a!=null)g.globalAlpha=o.a;
  if(o.flip){g.translate(Math.round(x),0);g.scale(-1,1);g.drawImage(c,-Math.round(c.width/2),Math.round(y)-c.height);}
  else g.drawImage(c,Math.round(x)-Math.round(c.width/2),Math.round(y)-c.height);g.restore();}
/* 다리 정보: 아래쪽에서 두 발이 갈라져 있는 줄들(top~끝)과 두 발을 나누는 세로 줄(split) — 테두리 그림 기준, 처음 한 번만 계산 */
function legInfo(c){if(c._leg)return c._leg;
  const W=c.width,H=c.height,D=c.getContext('2d').getImageData(0,0,W,H).data,runs=y=>{const R=[];let s=-1;for(let x=0;x<=W;x++){const on=x<W&&D[(y*W+x)*4+3]>0;if(on&&s<0)s=x;if(!on&&s>=0){R.push([s,x]);s=-1;}}return R;};
  let bot=H-1;while(bot>0&&!runs(bot).length)bot--;let top=bot;while(top>0&&runs(top-1).length>=2)top--;
  const r=runs(bot),mid=W/2;let split=Math.round(mid);if(r.length>=2){let best=1e9;for(let k=0;k<r.length-1;k++){const gx=Math.round((r[k][1]+r[k+1][0])/2);if(Math.abs(gx-mid)<best){best=Math.abs(gx-mid);split=gx;}}}
  if(bot-top<2)top=Math.max(0,bot-4);return c._leg={top,bot,split};}
/* 걷는 쿵야: 몸통은 그대로, 다리만 따로 휘청 (CLOP 느낌) — 다리 줄마다 1도트씩만 어긋나게 기울여서 몸통과 다리가 끊어지지 않음.
   sw0·sw1 = 두 발 끝이 앞뒤로 나간 도트 수, st = 다리가 늘어나는 도트 수(몸통이 그만큼 들림) · 모두 정수 */
function koongWalk(i,x,y,sw0,sw1,st,o={}){const c=koongCv(i,o.tint);if(!c)return;const L=legInfo(c),X=Math.round(x)-Math.round(c.width/2),Y=Math.round(y)-c.height,lh=L.bot-L.top+1;
  st=Math.max(0,st|0);g.drawImage(c,0,0,c.width,L.top,X,Y-st,c.width,L.top);   /* 몸통 */
  const n=lh+st;for(let r=0;r<n;r++){const sy=r<st?L.top:L.top+r-st,dy=Y-st+L.top+r,k=n>1?r/(n-1):1;   /* 늘어난 만큼 다리 첫 줄을 반복 */
    for(const[sx,sw,ww]of[[0,sw0,L.split],[L.split,sw1,c.width-L.split]]){const off=Math.round(sw*k*k);g.drawImage(c,sx,sy,ww,1,X+sx+off,dy,ww,1);}}}
function meMark(x,y){R(x-3,y,7,2,'#fff419');R(x-2,y+2,5,1,'#fff419');R(x-1,y+3,3,1,'#fff419');R(x,y+4,1,1,'#fff419');}
/* ---------- 화면 맞춤: 무대 1280x720, 게임 캔버스 960x540 (도트 480x270 → 4K 6배 · 1080p 3배) ---------- */
let CS=4,FS=1;const gc=$('gc');let g=gc.getContext('2d');
/* 화면 맞춤: 항상 화면을 꽉 채움. 표준 해상도(1080p · 1440p · 4K 전체 화면)에서는 배율이 정확히 맞아 도트가 정사각형,
   그 밖의 크기(창 모드 등)는 꽉 채우는 것을 우선 — 3% 이내 차이일 때만 정수 배율로 맞춤 */
let SC=1;
function fit(){const dpr=devicePixelRatio||1,raw=Math.min(innerWidth/1280,innerHeight/720)*dpr,q=Math.floor(raw*2)/2,use=(q>=.5&&raw-q<=raw*.03)?q:raw;SC=use/dpr;
  $('stage').style.transform=`translate(-50%,-50%) scale(${SC})`;CS=Math.max(1,Math.ceil(960/GW*use-1e-6));gc.width=GW*CS;gc.height=GH*CS;g=gc.getContext('2d');g.imageSmoothingEnabled=false;}
addEventListener('resize',fit);
$('stage').addEventListener('scroll',e=>{e.target.scrollLeft=0;e.target.scrollTop=0;});addEventListener('scroll',()=>{if(scrollX||scrollY)scrollTo(0,0);});document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.scrollLeft!=null&&t!==document&&(t.scrollLeft||t.scrollTop)&&!/INPUT|TEXTAREA/.test(t.tagName)){t.scrollLeft=0;t.scrollTop=0;}},true);   /* 포커스 이동으로 화면이 밀리는 것 방지 */
function applyFilter(){$('stage').classList.toggle('nofilter',!CFG.filter);}
/* ---------- 캔버스 글자 ---------- */
function R(x,y,w,h,c){const X=Math.round(x),Y=Math.round(y);g.fillStyle=c;g.fillRect(X,Y,Math.round(x+w)-X,Math.round(y+h)-Y);}   /* 모든 사각형을 도트 격자에 맞춤 */
/* 픽셀 폰트: Neo둥근모 하나로 통일 (한글 16x16 · 영문 8x16 도트) → 16px · 32px 만 사용해서 글자 도트도 정사각
   sz = 예전 크기 표기(작은 글씨 8~12 · 큰 글씨 14 이상) → 14 미만은 16px, 14 이상은 32px */
const FONT='NeoDunggeunmo';
function pxFont(sz,kr,str){const n=sz>=14?32:16;return[n+'px '+FONT,n];}
/* 글씨 도트 그림: 글자를 8배 크기로 그린 뒤 도트 한 칸마다 가운데 한 점만 읽어 칠함/안 칠함을 정함 → 1:1 정사각 도트 · 획이 빠지지 않음
   (브라우저는 픽셀 폰트도 가장자리를 반투명하게 그려서, 1배로 그려 자르면 획이 지워짐) · 폰트마다 도트 격자 위치는 처음 한 번 자동으로 맞춤
   + 검정 테두리 1도트 → 캔버스 정수 배율로 찍어서 어느 화면에서도 깨짐 없음 · 같은 글씨는 저장해 두고 다시 씀 */
const TXC=new Map(),PXC=document.createElement('canvas').getContext('2d',{willReadFrequently:true}),TXS=8,TXPH={};
function pxRGB(c){PXC.fillStyle='#000';PXC.fillStyle=c;const v=PXC.fillStyle;if(v[0]==='#')return[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];const m=v.match(/[\d.]+/g)||[0,0,0];return[+m[0],+m[1],+m[2]];}
const bigFont=(font,n)=>font.replace(n+'px',n*TXS+'px');
function txBig(s,font,n){PXC.font=font;const tw=Math.max(1,Math.ceil(PXC.measureText(s).width)),W=tw+4,H=n+Math.ceil(n/2)+4;
  const cv=document.createElement('canvas');cv.width=W*TXS;cv.height=H*TXS;const x=cv.getContext('2d',{willReadFrequently:true});x.font=bigFont(font,n);x.textBaseline='top';x.fillStyle='#fff';x.fillText(s,2*TXS,2*TXS);
  return{tw,W,H,a:x.getImageData(0,0,cv.width,cv.height).data,BW:cv.width};}
/* 도트 격자 위치(칸 안 어느 점을 읽을지): 읽은 값이 반투명인 경우가 가장 적은 위치 */
function txPhase(font,n){if(TXPH[font])return TXPH[font];const T=txBig('맨 아래 틀리면 ABC 12?',font,n);let best=[TXS>>1,TXS>>1],bc=1e9;
  for(let py=0;py<TXS;py++)for(let px=0;px<TXS;px++){let c=0;for(let y=0;y<T.H;y++)for(let x=0;x<T.W;x++){const v=T.a[((y*TXS+py)*T.BW+x*TXS+px)*4+3];if(v>40&&v<215)c++;}if(c<bc){bc=c;best=[px,py];}}
  if(!document.fonts||document.fonts.check(font))TXPH[font]=best;return best;}
function textBmp(s,font,n,col,ol=true){const key=font+'|'+col+'|'+(ol?1:0)+'|'+s,hit=TXC.get(key);if(hit)return hit;
  const T=txBig(s,font,n),[px,py]=txPhase(font,n),W=T.W,H=T.H,M=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)M[y*W+x]=T.a[((y*TXS+py)*T.BW+x*TXS+px)*4+3]>=128?1:0;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),D=x.createImageData(W,H),a=D.data,[r,gg,b]=pxRGB(col);
  for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){const i=yy*W+xx,o=i*4;
    if(M[i]){a[o]=r;a[o+1]=gg;a[o+2]=b;a[o+3]=255;}
    else if(ol&&((xx>0&&M[i-1])||(xx<W-1&&M[i+1])||(yy>0&&M[i-W])||(yy<H-1&&M[i+W]))){a[o+3]=255;}}
  x.putImageData(D,0,0);cv.tw=T.tw;if(!document.fonts||document.fonts.check(font)){if(TXC.size>4000)TXC.clear();TXC.set(key,cv);}return cv;}   /* 폰트가 다 불러와진 뒤에만 저장 */
function txt(s,x,y,c='#fff',al='left',sz=8,kr){s=String(s);const[f,n]=pxFont(sz,kr,s),b=textBmp(s,f,n,c),w=b.tw;
  const X=Math.round(al==='center'?x-w/2:al==='right'?x-w:x),Y=Math.round(y);g.drawImage(b,X-2,Y-2);}   /* 가운데 정렬도 정수 위치 */
/* 딤드 안내 창: 글자 크기에 맞춰 상자 크기를 정함 · lines = [[글, 색, 크기, 한글?(기본 true)], …] · (cx, cy) 가 가운데 */
function banner(lines,cx=240,cy=135){const B=lines.map(([t,c,sz,kr=true])=>{t=String(t);const[f,n]=pxFont(sz,kr,t);return{t,c,sz,kr,n,w:textBmp(t,f,n,c).tw};});
  const gap=6,px=14,py=10,w=Math.max(...B.map(b=>b.w))+px*2,h=B.reduce((a,b)=>a+b.n,0)+gap*(B.length-1)+py*2,x0=Math.round(cx-w/2);let y=Math.round(cy-h/2);
  pxBox(x0,y,w,h,'rgba(30,44,58,.94)',MAP.ink);R(x0+2,y+1,w-4,1,'rgba(255,255,255,.16)');y+=py;for(const b of B){txt(b.t,cx,y,b.c,'center',b.sz,b.kr);y+=b.n+gap;}}
/* 도트 상자: 모서리 1도트 깎기 + 1도트 테두리 + 아래 2도트 그림자 (UI 창과 같은 모양) */
function pxBox(x,y,w,h,fill,line){R(x+1,y+h+1,w-2,2,'rgba(0,20,40,.3)');R(x+1,y-1,w-2,1,line);R(x+1,y+h,w-2,1,line);R(x-1,y+1,1,h-2,line);R(x+w,y+1,1,h-2,line);
  R(x,y,1,1,line);R(x+w-1,y,1,1,line);R(x,y+h-1,1,1,line);R(x+w-1,y+h-1,1,1,line);R(x+1,y,w-2,h,fill);R(x,y+1,1,h-2,fill);R(x+w-1,y+1,1,h-2,fill);}
/* 시작 표시 (3종 공통): 3 → 2 → 1 → START! 만 · 카운트다운은 프레임 0~180, START! 는 시작 뒤 0.75초 */
const CD_F=180;
function cdBanner(S,cy=135){if(S.ph==='cd')banner([[Math.max(1,Math.ceil(S.t/60)),'#fff',24,false]],240,cy);else if(S.ph==='play'&&S.f-CD_F<45)banner([['START!','#fff419',24,false]],240,cy);}
/* DOM 에 쓰는 큰 도트 글자(대기방 빈 자리 ? · 시작 카운트다운): Neo둥근모 16도트로 그린 그림을 정수배로 확대한 이미지 → 눌림 · 번짐 없음 */
const GLY={};
function glyphImg(t,k,col){const F='16px '+FONT,key=t+'|'+k+'|'+col;let G=GLY[key];
  if(!G){const b=textBmp(String(t),F,16,col,false);G={u:b.toDataURL(),w:b.width,h:b.height-2};if(!document.fonts||document.fonts.check(F))GLY[key]=G;}   /* 테두리 없이 (획 사이 1도트 틈이 메워지지 않게) */
  const sh=Math.max(4,Math.round(k*.75));   /* 대신 딱딱한 그림자 (번짐 0) */
  return `<img class="pxg" src="${G.u}" style="width:${G.w*k}px;height:${G.h*k}px;filter:drop-shadow(${sh}px ${sh}px 0 rgba(0,20,40,.6))" alt="${esc(t)}">`;}
/* 폰트를 다 불러오면 저장해 둔 글씨를 지우고 다시 그림 */
if(document.fonts)Promise.all(['16px '+FONT,'32px '+FONT].map(f=>document.fonts.load(f))).then(()=>{TXC.clear();for(const k in TXPH)delete TXPH[k];for(const k in GLY)delete GLY[k];if(typeof screen!=='undefined'&&screen==='lobby')renderLobby();}).catch(()=>{});
const K=(s,x,y,c,al,sz=12)=>txt(s,x,y,c,al,sz,true);
/* ---------- 소리 ---------- */
const AU=(()=>{let ac=null,master=null,bgmG=null,bgmS=null,want=false;const BUF={};
  function init(){if(ac){if(ac.state==='suspended')ac.resume();return;}try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=CFG.sound?.5:0;master.connect(ac.destination);
    bgmG=ac.createGain();bgmG.gain.value=.35;bgmG.connect(master);
    for(const k in SND){const b=Uint8Array.from(atob(SND[k]),c=>c.charCodeAt(0)).buffer;ac.decodeAudioData(b).then(x=>{BUF[k]=x;if(k==='bgm'&&want)bgm(true);}).catch(()=>{});}}catch(e){}}
  function bgm(on){want=on;if(bgmS){try{bgmS.stop();}catch(e){}bgmS=null;}if(!on||!ac||!BUF.bgm)return;bgmS=ac.createBufferSource();bgmS.buffer=BUF.bgm;bgmS.loop=true;bgmS.connect(bgmG);bgmS.start();}
  function tone(f,d,type='square',v=.06,f2){if(!ac)return;const o=ac.createOscillator(),gg=ac.createGain(),t=ac.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.linearRampToValueAtTime(f2,t+d);
    gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gg);gg.connect(master);o.start(t);o.stop(t+d);}
  function noise(d,v=.15,hp=800){if(!ac)return;const n=ac.sampleRate*d,b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),gg=ac.createGain();f.type='highpass';f.frequency.value=hp;gg.gain.value=v;s.buffer=b;s.connect(f);f.connect(gg);gg.connect(master);s.start();}
  function sample(k,v=.6){if(!ac||!BUF[k])return;const s=ac.createBufferSource(),gg=ac.createGain();gg.gain.value=v;s.buffer=BUF[k];s.connect(gg);gg.connect(master);s.start();}
  let waka=0;
  /* 게임에서 쓰는 소리 이름: 필요하면 여기에 추가 */
  const S={pickup(){waka^=1;tone(waka?520:390,.07,'square',.035);},power(){tone(300,.4,'square',.05,900);},combo(){[600,800,1000,1300].forEach((f,i)=>setTimeout(()=>tone(f,.08),i*50));},
    ouch(){sample('death',.7);},move(){tone(700,.04,'square',.03);},ok(){tone(880,.08);setTimeout(()=>tone(1320,.1),70);},start(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.12),i*110));},
    beep(){tone(660,.12);},go(){tone(990,.3);},end(){[784,659,523,392].forEach((f,i)=>setTimeout(()=>tone(f,.15,'triangle',.08),i*140));},jump(){sample('pjump',.3);},
    hit(){noise(.06,.18,1200);tone(180,.06,'square',.06,90);},big(){noise(.25,.3,300);tone(120,.25,'sawtooth',.1,40);},tap(){tone(1100,.03,'square',.025);},win(){[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.14),i*90));}};
  return{init,bgm,sfx:n=>{if(S[n])S[n]();},vol(){if(master)master.gain.value=CFG.sound?.5:0;}};})();
/* ---------- 입력: 방향(누르고 있는 마지막 방향) + A 버튼(누를 때마다) ---------- */
/* 키 한정: 화면에 표기된 단축키만 받음 (키보드 · 마우스 기준)
   방향키 ← ↑ → ↓ · Enter 결정 · Esc 닫기(게임 설명 · 설정) · 게임 중 Z / Space = A 버튼 · 관전 중 숫자 1~4
   그 밖의 키(WASD · J · K · X · Backspace · Tab …)와 마우스 오른쪽 메뉴는 무시 · 입력칸에 글자 입력은 그대로 */
const DIRK={ArrowUp:1,ArrowRight:2,ArrowDown:3,ArrowLeft:4};
const AKEYS=new Set(['KeyZ','Space']);
const held=new Set();
function curDir(){let d=0;for(const k of held)d=k;return d;}
addEventListener('keydown',e=>{AU.init();const inInput=e.target&&e.target.tagName==='INPUT';
  if(e.code==='Tab'){e.preventDefault();return;}   /* Tab 으로 포커스가 옮겨 가지 않게 */
  if(DIRK[e.code]){held.delete(DIRK[e.code]);held.add(DIRK[e.code]);if(!e.repeat)onDir(DIRK[e.code]);if(!inInput)e.preventDefault();}
  if(e.repeat)return;
  if(screen==='game'&&/^(Digit|Numpad)[1-4]$/.test(e.code)&&isSpec()){specSet(+e.code.slice(-1)-1);return;}   /* 관전: 숫자로 시점 바로 선택 */
  if(screen==='game'&&AKEYS.has(e.code)){e.preventDefault();sendA();return;}
  if(HOW_ON&&DIRK[e.code]&&(DIRK[e.code]===2||DIRK[e.code]===4)){howFlip(DIRK[e.code]===2?1:-1);return;}
  if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();onOK();}
  else if(e.code==='Escape'){e.preventDefault();onBack();}
  else if(e.code==='Space'&&!inInput)e.preventDefault();});
addEventListener('keyup',e=>{if(DIRK[e.code]){held.delete(DIRK[e.code]);dirUp();}});
addEventListener('contextmenu',e=>e.preventDefault());   /* 마우스 오른쪽 메뉴 막기 */
addEventListener('blur',()=>{held.clear();});
let padPrev={};
function pollPad(){const P=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean)[0];if(!P)return;
  const b=i=>P.buttons[i]&&P.buttons[i].pressed,ax=P.axes||[];
  const now={u:b(12)||ax[1]<-.5,d:b(13)||ax[1]>.5,l:b(14)||ax[0]<-.5,r:b(15)||ax[0]>.5,a:b(0)||b(2),b:b(1),s:b(9)};
  const map={u:1,r:2,d:3,l:4};
  for(const k in map){if(now[k]&&!padPrev[k]){held.delete(map[k]);held.add(map[k]);onDir(map[k]);AU.init();}if(!now[k]&&padPrev[k]){held.delete(map[k]);dirUp();}}
  if(now.a&&!padPrev.a){AU.init();if(screen==='game')sendA();else onOK();}if(now.s&&!padPrev.s&&screen!=='game')onOK();if(now.b&&!padPrev.b)onBack();padPrev=now;}
/* 터치: 십자 패드 · A 버튼 · 스와이프 */
if('ontouchstart' in window||navigator.maxTouchPoints>0)document.body.classList.add('touch');
document.querySelectorAll('#pad div').forEach(el=>{const d=+el.dataset.d;
  const on=e=>{e.preventDefault();AU.init();held.delete(d);held.add(d);el.classList.add('on');onDir(d);},off=e=>{e.preventDefault();held.delete(d);el.classList.remove('on');dirUp();};
  el.addEventListener('touchstart',on,{passive:false});el.addEventListener('touchend',off,{passive:false});el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);});
{const A=$('abtn');const on=e=>{e.preventDefault();AU.init();A.classList.add('on');sendA();},off=e=>{e.preventDefault();A.classList.remove('on');};
  A.addEventListener('touchstart',on,{passive:false});A.addEventListener('touchend',off,{passive:false});A.addEventListener('mousedown',on);A.addEventListener('mouseup',off);}
let sw=null;
gc.addEventListener('touchstart',e=>{const t=e.touches[0];sw={x:t.clientX,y:t.clientY};},{passive:true});
gc.addEventListener('touchend',()=>{sw=null;if(GDEF&&GDEF.controls.dir==='hold'){held.clear();dirUp();}},{passive:true});
gc.addEventListener('touchmove',e=>{if(!sw||!GDEF||!GDEF.controls.dir||GDEF.controls.dir==='bits')return;const t=e.touches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;if(Math.hypot(dx,dy)>24){const d=Math.abs(dx)>Math.abs(dy)?(dx>0?2:4):(dy>0?3:1);held.clear();held.add(d);onDir(d);sw={x:t.clientX,y:t.clientY};}},{passive:true});
/* ---------- 서버 연결 ---------- */
/* 방 = Realtime 채널 'kyb-room-코드'
   · 접속자 목록: Presence (먼저 들어온 플레이어가 방장)
   · 방장 → 모두: 채널 Broadcast (화면 상태 초당 10번)
   · 참가자 → 방장: 'kyb-in-코드' 채널에 REST로 보냄 (방장만 받음 → 메시지 수 절약) */
let SBC=null;
function rt(){if(window.__FAKE_RT)return window.__FAKE_RT;if(!SBC)SBC=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40}}});return SBC;}
const NET={ch:null,inCh:null,inSend:null,id:'',hostId:'',room:'',role:'player',members:[],on:false,
  connect(room,role,mode){return new Promise((res,rej)=>{this.close();this.room=room;this.role=role;this.id=Math.random().toString(36).slice(2,10);
    let c;try{c=rt();}catch(e){return rej('url');}
    const ch=c.channel('kyb-room-'+room,{config:{broadcast:{self:false,ack:false},presence:{key:this.id}}});this.ch=ch;let done=false;
    const fail=code=>{if(done)return;done=true;clearTimeout(to);this.close();rej(code);};
    const to=setTimeout(()=>fail('timeout'),9000);
    ch.on('broadcast',{event:'m'},({payload})=>{if(!this.on||!payload)return;if(payload.to&&payload.to!==this.id)return;onNet(payload);});
    ch.on('presence',{event:'sync'},()=>{const L=this.readMembers();
      if(!done){if(!L.some(m=>m.id===this.id))return;const others=L.filter(m=>m.id!==this.id);
        if(mode==='create'&&others.length)return fail('exists');
        if(mode==='join'&&!others.length)return fail('noroom');
        if(L.length>12)return fail('full');
        done=true;clearTimeout(to);this.on=true;this.inSend=c.channel('kyb-in-'+room);this.applyMembers(L);res();return;}
      if(this.on)this.applyMembers(L);});
    ch.subscribe(st=>{if(st==='SUBSCRIBED'){ch.track({name:role==='spectator'?'관전':CFG.name||'PLAYER',role,t:Date.now()});}
      else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){if(!done)fail('closed');else if(this.on&&this.ch===ch){this.on=false;onNetLost();}}});});},
  readMembers(){const st=this.ch?this.ch.presenceState():{},L=[];
    for(const k in st){const p=st[k]&&st[k][0];if(p)L.push({id:k,name:badName(p.name)?'PLAYER':String(p.name||'PLAYER').slice(0,10),   /* 다른 기기에서 걸러지지 않은 이름도 방에선 PLAYER 로 */role:p.role==='spectator'?'spectator':'player',t:+p.t||0});}
    return L.sort((a,b)=>a.t-b.t||(a.id<b.id?-1:1));},
  applyMembers(L){const was=this.hostId;this.members=L.map(({id,name,role})=>({id,name,role}));
    const h=L.find(m=>m.role==='player')||L[0];this.hostId=h?h.id:'';   /* 방장 = 가장 먼저 들어온 플레이어 */
    if(this.isHost&&!this.inCh){this.inCh=rt().channel('kyb-in-'+this.room,{config:{broadcast:{self:false}}});this.inCh.on('broadcast',{event:'in'},({payload})=>{if(this.on&&payload)onNet(payload);}).subscribe();}
    onMembers(was);},
  send(o,to){if(!this.on)return;o.from=this.id;if(to)o.to=to;
    try{if(to&&to===this.hostId&&!this.isHost)this.inSend.httpSend('in',o).catch(()=>{});   /* 방장에게만: REST */
      else this.ch.send({type:'broadcast',event:'m',payload:o});}catch(e){}},
  close(){const c=SBC||window.__FAKE_RT;[this.ch,this.inCh].forEach(x=>{if(x)try{x.unsubscribe();c&&c.removeChannel&&c.removeChannel(x);}catch(e){}});this.ch=this.inCh=this.inSend=null;this.on=false;this.members=[];this.hostId='';},
  get isHost(){return !!this.id&&this.id===this.hostId;}};
/* ---------- 화면 전환 · 메뉴 ---------- */
let screen='main',sel=0;
function show(s){screen=s;document.body.classList.toggle('ingame',s==='game');document.querySelectorAll('.scr').forEach(el=>el.classList.toggle('on',el.id==='scr-'+s));sel=0;paintSel();
  const f=document.querySelector('#scr-'+s+' input[autofocus]');if(f&&!document.body.classList.contains('touch'))setTimeout(()=>f.focus(),30);else document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}
/* 화면에 보이는 버튼 위치를 기준으로 상하좌우 가장 가까운 버튼으로 이동 */
function spatialMove(d){const L=btns();if(!L.length)return;const cur=L[sel]||L[0],c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2;let best=-1,bs=1e9;
  L.forEach((b,i)=>{if(i===sel)return;const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;
    const ok=d===1?dy<-4:d===3?dy>4:d===2?dx>4:dx<-4;if(!ok)return;const along=d===1||d===3?Math.abs(dy):Math.abs(dx),side=d===1||d===3?Math.abs(dx):Math.abs(dy);if(side>along*2.5&&(d===2||d===4))return;   /* 좌우는 대각선 너머로 튀지 않게 */
    const sc=along+side*2.2;if(sc<bs){bs=sc;best=i;}});
  if(best<0&&(d===1||d===3)){best=(sel+(d===3?1:-1)+L.length)%L.length;}   /* 세로로 더 갈 곳이 없으면 순서대로 */
  if(best>=0){sel=best;paintSel();AU.sfx('move');const f=document.querySelector('#scr-'+screen+' input');if(f)f.blur();}}
function btns(){return[...document.querySelectorAll('#scr-'+screen+' .btn:not([hidden])')];}
function paintSel(){btns().forEach((b,i)=>b.classList.toggle('sel',i===sel));}
function toast(m,ms=2200){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',ms);}
/* 버튼 누름 효과 (마우스 · 터치 · Enter 모두): 2px 눌렸다가 돌아옴 */
let PRESS=['',0];
function pressFx(b){PRESS=[b.dataset.act,performance.now()];b.classList.remove('press');void b.offsetWidth;b.classList.add('press');clearTimeout(b._pt);b._pt=setTimeout(()=>b.classList.remove('press'),160);}
document.addEventListener('click',e=>{const b=e.target.closest('.btn');if(!b)return;AU.init();const L=btns();sel=Math.max(0,L.indexOf(b));paintSel();pressFx(b);act(b.dataset.act);});
function onOK(){if(screen==='game')return;if(HOW_ON){closeHow();return;}const b=btns()[sel];if(b){AU.sfx('ok');pressFx(b);act(b.dataset.act);}}
function onBack(){if(HOW_ON){closeHow();return;}if(screen==='settings'){AU.sfx('move');closeSettings();}}   /* Esc = 게임 설명 · 설정 닫기만 (나가기는 버튼으로) */
function onDir(d){if(HOW_ON)return;if(screen==='game'){if(isSpec()){if(d===2||d===4)specSet(SPEC_I+(d===2?1:-1));return;}if(GDEF&&GDEF.controls.dir==='bits'){sendBits();return;}if(GDEF&&GDEF.controls.dir)sendDir(d,GDEF.controls.dir==='tap');return;}
  spatialMove(d);}
function act(a){switch(a){
  case 'enter':enterRoom('player');break;
  case 'watch':enterRoom('spectator');break;
  case 'how':openHow();break;
  case 'pick':if(typeof initLocalRoom==='function')initLocalRoom();break;   /* 혼자 연습은 core/test.js 가 있을 때만 메뉴에 나타남 */
  case 'fs':try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}break;
  case 'settings':openSettings();break;
  case 'back':closeSettings();break;
  case 'ready':lobbyReady();break;
  case 'leave':leaveToMain();break;
  case 'home':leaveToMain();break;
  case 'flt':CFG.filter=!CFG.filter;LS.set('filter2',CFG.filter);applyFilter();openSettings(true);break;
  case 'snd':CFG.sound=!CFG.sound;LS.set('sound',CFG.sound);AU.vol();openSettings(true);break;
}}
/* 욕설 방지: 닉네임에 아래 단어가 들어 있으면 사용 불가 (추가는 이 목록에 그대로 적으면 됨)
   공백 · 숫자 · 기호를 빼고 비교 → "씨 1 발", "f.u.c.k" 도 걸러짐 · 영문은 0→o 1→i 3→e 4→a 5→s @→a $→s 로 바꿔서도 비교 */
const BAD_WORDS=['시발','씨발','씨바','씨빨','씨팔','시팔','십팔','쓰발','쓰바','씹','ㅅㅂ','ㅆㅂ','ㅅ발','ㅆ발','시벌','씨벌','싀발',
  '병신','븅신','빙신','병쉰','ㅂㅅ','ㅄ','좆','좃','존나','졸라','존내','ㅈㄴ','개새','개색','개세','개쉐','새끼','새키','섀키','쌔끼','ㅅㄲ',
  '니미','니애미','느금','느개비','ㄴㄱㅁ','애미','애비','에미','엠창','앰창','염병','지랄','ㅈㄹ','미친','미췬','ㅁㅊ','또라이','돌아이','등신','썅','쌍놈','쌍년',
  '걸레','창녀','창년','보지','자지','섹스','야동','딸딸','꼴리','닥쳐','꺼져','엿먹','호로새','호로자','호래자','후장','빠구리','븅','찐따','한남','김치녀','된장녀','일베','메갈','틀딱','짱깨','쪽바리',
  'fuck','fuk','fck','fxck','shit','bitch','biatch','asshole','dick','pussy','cunt','nigger','nigga','faggot','bastard','slut','whore','porn','sex','penis','vagina','wtf','stfu','damn'];
function badName(s){s=String(s||'').toLowerCase();const a=s.replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g,''),b=s.replace(/[0134@$5]/g,c=>({'0':'o','1':'i','3':'e','4':'a','@':'a','$':'s','5':'s'}[c])).replace(/[^a-z]/g,'');
  return BAD_WORDS.some(w=>a.includes(w)||(/^[a-z]+$/.test(w)&&b.includes(w)));}
function needName(){const n=$('nameIn').value.trim().slice(0,10);if(!n){toast('닉네임을 입력해 주세요');$('nameIn').focus();return false;}
  if(badName(n)){toast('사용할 수 없는 단어가 들어 있어요. 다른 닉네임을 입력해 주세요',3000);$('nameIn').value='';$('nameIn').focus();return false;}CFG.name=n;LS.set('name',n);return true;}
/* 크리에이터 무대 시연용: 고정 비밀번호 = 고정 방. 비밀번호가 맞으면 방 코드 없이 모두 같은 방(대기방)으로 바로 입장
   (화면에는 방 코드를 표시하지 않음 — 큰 화면 관전으로 비밀번호가 노출되지 않게) */
const STAGE_PASS='YCC1211',STAGE_ROOM='YCC1211';
function needPass(){const p=$('passIn').value.trim().toUpperCase();if(p===STAGE_PASS)return true;
  toast(p?'비밀번호가 맞지 않습니다':'비밀번호를 입력해 주세요');$('passIn').value='';$('passIn').focus();return false;}
async function enterRoom(role){if(role==='spectator'?!needPass():!needName()||!needPass())return;   /* 관전은 닉네임 없이 비밀번호만 */toast('입장하는 중…',8000);
  try{await NET.connect(STAGE_ROOM,role,'any');$('toast').style.display='none';initLobby();}catch(e){toast(netErr(e),4000);}}
function netErr(e){return{full:'방이 가득 찼습니다',timeout:'서버 응답이 없습니다. 잠시 후 다시 시도해 주세요',url:'서버 주소 설정 오류',closed:'서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요'}[e]||'연결 오류: '+e;}
let SET_BACK='main';
function closeSettings(){show(SET_BACK);if(SET_BACK==='lobby'){renderLobby();focusMain();}}
function openSettings(keep){if(!keep&&screen!=='settings')SET_BACK=screen==='lobby'?'lobby':'main';$('setFlt').textContent='화면 필터: '+(CFG.filter?'켬':'끔');$('setSnd').textContent='사운드: '+(CFG.sound?'켬':'끔');if(!keep)show('settings');}
/* ---------- 대기방 (개인전) · 1P~4P 네 칸 · 칸마다 위에서부터 닉네임 / 캐릭터 / READY
   · 캐릭터는 입장할 때 방장이 남은 캐릭터 중 랜덤으로 정해 고정
   · 사람 모두 READY → 3초 카운트 → 게임 3종 연속 시작 (빈 자리는 AI)
   · 온라인(방장이 관리) / 연습(LOBBY.local, 서버 없이 AI와) ---------- */
const COUNT_SEC=3;
/* ★ 테스트 기간 스위치 ★ TEST_AI = true  → 1명부터 READY 하면 시작 · 빈 자리는 AI가 채움 (테스트 2주 동안, 혼자서도 테스트 가능)
                         TEST_AI = false → 사람 4명이 모두 들어와 READY 해야 시작 · AI 없음 (실제 행사)
   (행사 때 false 로 바꾸면 혼자 실수로 READY 눌러도 시작되지 않음) */
const TEST_AI=true;
const MIN_HUMANS=TEST_AI?1:4;
const needHumans=()=>isLocal()?1:MIN_HUMANS;
let LOBBY=null,CD_END=0,LAST_CD=0;
const isLocal=()=>!!(LOBBY&&LOBBY.local);
const myId=()=>isLocal()?'local':NET.id;
const amHost=()=>isLocal()||NET.isHost;
function initLobby(){show('lobby');CD_END=0;if(NET.isHost){LOBBY={slots:[null,null,null,null],cd:0};syncSlots();pushLobby();}else{LOBBY=null;renderLobby();}focusMain();}
function players(){return NET.members.filter(m=>m.role==='player');}
/* 남은 캐릭터 중 랜덤 (다 쓰였으면 전체 중 랜덤) */
function randChar(used){const all=CHARS.map(c=>c.id),free=all.filter(c=>!used.has(c)),L=free.length?free:all;return L[Math.floor(Math.random()*L.length)];}
function syncSlots(){if(!LOBBY||isLocal())return;const ids=new Set(players().map(m=>m.id));
  LOBBY.slots=LOBBY.slots.map(s=>s&&!s.bot&&!ids.has(s.id)?null:s);
  for(const m of players()){if(LOBBY.slots.some(s=>s&&s.id===m.id))continue;const i=LOBBY.slots.findIndex(s=>!s);
    if(i>=0)LOBBY.slots[i]={id:m.id,name:m.name,ready:false,bot:false,ch:randChar(new Set(LOBBY.slots.filter(Boolean).map(s=>s.ch)))};else NET.send({t:'full'},m.id);}}
function pushLobby(){if(!isLocal()&&NET.isHost)NET.send({t:'lobby',L:LOBBY});renderLobby();}
function charImg(id,k=2){const B=CHS[charOf(id).big];return `<img src="${B.src}" style="width:${B.w*k}px;height:${B.h*k}px">`;}
function renderLobby(){const L=LOBBY,amP=isLocal()||NET.role==='player';
  const hn=L?L.slots.filter(s=>s&&!s.bot).length:0,need=needHumans();
  $('lbInfo').innerHTML=(isLocal()?'연습 모드 · ':NET.role==='spectator'?'관전 중 · ':'')+`입장 <b>${hn} / 4</b> · ${need>=4?'4명이 모두 들어와 ':need>1?`${need}명 이상 들어와 `:''}모두 <b>READY</b> 후 방장이 <b>START</b> 하면 3초 뒤 시작`+(hn<need?` · <b>${need-hn}명</b> 더 기다리는 중`:'');
  for(let i=0;i<4;i++){const el=$('slot'+i),s=L&&L.slots[i],mine=!!(s&&s.id===myId()),hs=!!(s&&s.id===hostSid()),rl=s&&s.ready?(hs?'START!':'READY!'):'';
    el.className='pslot fr'+(mine?' me':'')+(s?'':' empty')+(s&&s.ready?' rd':'');el.style.setProperty('--pc',PCOL[i]);
    el.innerHTML=`<div class="pn"><span class="pp" style="background:${PCOL[i]}">${i+1}P</span><b class="ol2">${s?esc(s.name):'빈 자리'}</b>${mine?'<small>나</small>':''}</div>`+
      `<div class="pc">${mine&&amP?`<img class="arw" src="${CHS.ui_arrow}">`:''}${s?charImg(s.ch):'<span class="q">'+glyphImg('?',4,'#7fe0ff')+'</span>'}</div><div class="pcn">${s?esc(charOf(s.ch).name):'입장 대기 중'}</div>`+
      (mine&&amP?`<div class="btn rdy ${s.ready?'fr-on on':'fr-item'}" data-act="ready">${rl||(hs?'START':'READY')}</div>`:`<div class="rst${rl?' on':''}">${s?rl||'대기 중':''}</div>`);}
  const cd=L&&L.cd||0;$('lbCd').hidden=!cd;if(cd&&$('lbCd').dataset.v!==String(cd)){$('lbCd').dataset.v=cd;$('lbCd').innerHTML=glyphImg(String(cd),9,'#fff419');}if(cd!==LAST_CD){LAST_CD=cd;if(cd>0)AU.sfx('beep');}
  {const rb=document.querySelector('#scr-lobby [data-act=ready]');if(rb&&PRESS[0]==='ready'&&performance.now()-PRESS[1]<120)rb.classList.add('press'),setTimeout(()=>rb.classList.remove('press'),120);}   /* 다시 그려진 READY 버튼에도 누름 효과 이어서 */
  if(!btns()[sel])sel=0;paintSel();}
/* 처음 대기방에 들어오면 내 READY 버튼에 커서 */
function focusMain(){const L=btns(),i=L.findIndex(b=>b.dataset.act==='ready');sel=i<0?0:i;paintSel();}
function lobbyReady(){if(!LOBBY||!(isLocal()||NET.role==='player'))return;if(amHost())hostReady(myId());else NET.send({t:'ready'},NET.hostId);}
/* 방장 칸 = START: 다른 사람이 모두 READY 일 때만 눌림 */
const hostSid=()=>isLocal()?'local':NET.hostId;
function hostReady(id){const s=LOBBY.slots.find(s=>s&&s.id===id);if(!s)return;
  if(id===hostSid()&&!s.ready){const hum=LOBBY.slots.filter(h=>h&&!h.bot);if(hum.length<needHumans()||hum.some(h=>h!==s&&!h.ready)){toast('모두 READY 해야 시작할 수 있습니다');return;}}
  s.ready=!s.ready;pushLobby();}
/* 방장: 모두 READY + 방장 START 인지 매 프레임 확인 → 3초 카운트 (누가 READY 를 풀거나 새로 들어오면 취소) */
function lobbyTick(){if(!(screen==='lobby'||screen==='settings'&&SET_BACK==='lobby')||!LOBBY||GAME||!amHost())return;const hum=LOBBY.slots.filter(s=>s&&!s.bot),all=hum.length>=needHumans()&&hum.every(s=>s.ready),now=performance.now();
  if(!all){CD_END=0;const h=hum.find(s=>s.id===hostSid());if(LOBBY.cd||h&&h.ready){LOBBY.cd=0;if(h)h.ready=false;pushLobby();}return;}   /* 누가 READY 를 풀면 방장 START 도 풀림 */
  if(!CD_END)CD_END=now+COUNT_SEC*1000;
  const c=Math.max(0,Math.ceil((CD_END-now)/1000));if(c!==LOBBY.cd&&c>0){LOBBY.cd=c;pushLobby();}
  if(now>=CD_END){CD_END=0;LOBBY.cd=0;lobbyStart();}}
/* 경기 = 미니게임 3판 연속 (GAMES 순서) → 3판이 모두 끝나면 최종 결과 (게임마다 순위 점수 1위 4 · 2위 3 · 3위 2 · 4위 1) */
let MATCH=null;
function lobbyStart(){if(!amHost())return;const used=new Set(LOBBY.slots.filter(Boolean).map(s=>s.ch));
  const slots=LOBBY.slots.map((s,i)=>{if(s)return{...s};const ch=randChar(used);used.add(ch);return{id:0,name:'AI '+(i+1),bot:true,ready:true,ch};});AU.sfx('start');
  MATCH={order:GAMES.map(G=>G.id),i:0,res:[],slots};startMatchGame();}
const placePts=ps=>ps.map(v=>4-ps.filter(w=>w>v).length);   /* 1위 4점 … 4위 1점 · 같은 점수는 같은 순위 */
function standings(res){const tot=[0,0,0,0],first=[0,0,0,0];res.forEach(R=>placePts(R.ps).forEach((v,i)=>{tot[i]+=v;if(v===4&&R.ps[i]>0)first[i]++;}));return{tot,first};}
function matchInfo(){return{i:MATCH.i,n:MATCH.order.length,tot:standings(MATCH.res).tot};}
function startMatchGame(){const gid=MATCH.order[MATCH.i],slots=MATCH.i>0&&GAME&&GAME.slots?GAME.slots.map(s=>({...s})):MATCH.slots;
  startHost(gid,slots,isLocal());GAME.match=matchInfo();if(!isLocal()){NET.send({t:'start',slots:GAME.slots,gid,M:GAME.match});sendFull();}toGame();}
function toLobby(){GAME=null;RES_AT=0;CD_END=0;AU.bgm(false);if(LOBBY)LOBBY.cd=0;
  if(isLocal()){LOBBY.slots.forEach(s=>{if(s)s.ready=false;});show('lobby');renderLobby();focusMain();return;}
  if(NET.isHost){LOBBY.slots=LOBBY.slots.map(s=>s&&s.bot?null:s);LOBBY.slots.forEach(s=>{if(s)s.ready=false;});syncSlots();pushLobby();}show('lobby');renderLobby();focusMain();}
function backToRoom(){if(isLocal()){toLobby();return;}if(!NET.isHost)return;NET.send({t:'tolobby'});toLobby();}
function leaveToMain(){NET.close();GAME=null;LOBBY=null;MATCH=null;RES_AT=0;CD_END=0;AU.bgm(false);show('main');}
function onMembers(wasHost){
  if(GAME&&!GAME.host&&wasHost&&wasHost!==NET.hostId){toast('방장 연결이 끊겨 게임을 끝냅니다',4000);leaveToMain();return;}
  if(NET.isHost){if(!LOBBY)LOBBY={slots:[null,null,null,null],cd:0};
    if(GAME&&GAME.host){for(const s of GAME.slots)if(s.human&&!s.left&&!NET.members.some(m=>m.id===s.id)){s.bot=true;s.left=true;toast(`${s.name} 님 연결이 끊겨 AI가 대신합니다`,3000);}sendFull();}
    else{syncSlots();pushLobby();}}
  if(screen==='lobby')renderLobby();}
function onNetLost(){toast('서버 연결이 끊겼습니다',4000);if(!(GAME&&GAME.local))leaveToMain();}
function onNet(o){switch(o.t){
  case 'lobby':if(o.from===NET.hostId){const first=!LOBBY;LOBBY=o.L;if(LOBBY.slots.some(s=>s&&s.id===NET.id))NET.role='player';if(screen==='lobby'){renderLobby();if(first)focusMain();}}break;
  case 'ready':if(NET.isHost&&!GAME&&LOBBY)hostReady(o.from);break;
  case 'full':if(NET.role!=='spectator')toast('자리가 꽉 차서 관전으로 들어갑니다',3000);NET.role='spectator';renderLobby();break;
  case 'msg':toast(o.m);break;
  case 'start':if(o.from===NET.hostId){startView(o.gid,o.slots);GAME.match=o.M;toGame();}break;
  case 'F':if(o.from!==NET.hostId)break;if(GAME&&!GAME.host&&o.gid&&o.gid!==GAME.gid&&screen!=='result'){startView(o.gid,o.slots);toGame();}   /* 시작 알림을 놓쳤으면 여기서 따라감 */
    if(GAME&&!GAME.host){if(o.slots)GAME.slots=o.slots;if(GDEF.applyFull)GDEF.applyFull(GAME.pd,o.F);}
    else if(!GAME&&NET.role==='spectator'&&o.slots&&o.gid&&screen!=='result'){startView(o.gid,o.slots);if(GDEF.applyFull)GDEF.applyFull(GAME.pd,o.F);toGame();}break;
  case 's':if(GAME&&!GAME.host&&o.g===GAME.gid){recvSnap(o);}break;   /* 다른 게임의 화면은 무시 */
  case 'in':if(GAME&&GAME.host){const i=GAME.slots.findIndex(s=>!s.bot&&s.id===o.from);if(i>=0)hostInput(i,o.e);}break;
  case 'final':if(o.from===NET.hostId)showFinal(o.F);break;
  case 'tolobby':if(o.from===NET.hostId)toLobby();break;}}
/* ---------- 게임 실행 ---------- */
/* 연결이 끊긴 자리는 그 판이 끝날 때까지 AI가 대신 플레이 */
let GAME=null,GDEF=null,LASTS=null;
/* 진행은 모두 자동 (키 홀드 없음): 게임(시작 카운트다운 3초) → 끝 화면 END_SEC 초 → 다음 게임 … → 최종 결과 RESULT_SEC 초 → 대기방 */
const END_SEC=3,RESULT_SEC=12;
const gdef=id=>GAMES.find(G=>G.id===id)||GAMES[0];
function startHost(gid,slots,local){GDEF=gdef(gid);const sim=GDEF.newSim(slots.map(s=>({...s,human:!s.bot})),{local});GAME={host:true,local,sim,slots:sim.slots||slots,gid:GDEF.id};}
function hostInput(i,e){GAME.sim.input(i,e);}
function startView(gid,slots){GDEF=gdef(gid);GAME={host:false,slots,gid:GDEF.id,pd:GDEF.newView?GDEF.newView():{},buf:[]};}
/* 게임 설명: [조작] [기믹] [승리조건] 세 칸만, 한눈에 */
function howHTML(G){return `<h3 class="ol">${esc(G.title)}</h3><div class="hw"><b>조작</b><ul>${(G.ctrl||[]).map(t=>`<li>${t}</li>`).join('')}</ul></div>`+
  (G.gimmick?`<div class="hw"><b>기믹</b><p>${G.gimmick}</p></div>`:'')+`<div class="hw"><b>승리조건</b><p>${G.win||''}</p></div>`;}
function sendFull(){if(GAME&&GAME.host&&!GAME.local)NET.send({t:'F',F:GDEF.full?GAME.sim.full():null,slots:GAME.slots,gid:GAME.gid});}
function myIndex(){if(!GAME)return-1;return GAME.slots.findIndex(s=>(s.human||!s.bot)&&(GAME.local?s.id==='local':s.id===NET.id));}
/* 관전 시점: 관전자는 ←→ (패드 · 화면 위 ◀▶ · 게임 화면 탭 · 숫자 1~4)로 볼 플레이어를 바꿈
   → 그 플레이어가 "나"처럼 표시됨 (YOU 표시 · 강조 칸 · 점수표 강조) · 입력은 보내지 않음 */
let SPEC_I=0;
const isSpec=()=>!!GAME&&!GAME.local&&!GAME.host&&myIndex()<0;
function viewIndex(){const me=myIndex();return me>=0?me:isSpec()?SPEC_I:-1;}
function specSet(i){if(!isSpec())return;SPEC_I=(i+4)%4;AU.sfx('move');BOARD_T=0;renderSpec();}
function renderSpec(){const el=$('gSpec'),on=isSpec();el.hidden=!on;if(!on)return;const s=GAME.slots[SPEC_I],n=$('gSpecN');
  n.textContent=`${SPEC_I+1}P ${s?s.name:''} 시점`;n.style.color=PCOL[SPEC_I];}
$('gSpec').addEventListener('click',e=>{const b=e.target.closest('[data-sd]');if(b){AU.init();specSet(SPEC_I+(+b.dataset.sd));}});
gc.addEventListener('click',()=>{if(isSpec())specSet(SPEC_I+1);});
/* 입력 보내기: 게임이 prep 을 두면 "내가 본 화면" 기준으로 먼저 판정해서 보냄 (타이밍 게임의 지연 보정) */
function sendInput(e){if(!GAME||screen!=='game')return;const me=myIndex();if(me<0)return;if(GDEF.prep){e=GDEF.prep(e,LASTS,me,GAME.host?GAME.sim:GAME.pd);if(!e)return;}
  if(GAME.host)hostInput(me,e);else if(NET.role==='player')NET.send({t:'in',e},NET.hostId);}
function sendDir(d,tap){sendInput(tap?{d,tap:1}:{d});}
function dirUp(){if(screen==='game'&&GDEF&&GDEF.controls.dir==='hold')sendInput({d:curDir()});if(screen==='game'&&GDEF&&GDEF.controls.dir==='bits')sendBits();}
/* 동시에 누르는 키 상태: ◀=1 ▶=2 ↑=4 ↓=8 */
function sendBits(){let m=0;if(held.has(4))m|=1;if(held.has(2))m|=2;if(held.has(1))m|=4;if(held.has(3))m|=8;sendInput({m});}
function sendA(){if(GDEF&&GDEF.controls.a)sendInput({a:1});}
function recvSnap(o){if(o.ai)o.ai.forEach((v,i)=>{const s=GAME.slots[i];if(s)s.left=v===2;});if(GDEF.applyDelta)GDEF.applyDelta(GAME.pd,o.S);for(const e of o.ev||[])fx(e);o.S._at=performance.now();GAME.buf.push(o.S);if(GAME.buf.length>6)GAME.buf.shift();}
function viewState(){const b=GAME.buf;if(!b.length)return null;if(!GDEF.lerp)return b[b.length-1];const rtm=performance.now()-150;let a=b[0],c=b[b.length-1];
  for(let i=0;i<b.length-1;i++)if(b[i]._at<=rtm&&b[i+1]._at>=rtm){a=b[i];c=b[i+1];break;}
  return GDEF.lerp(a,c,c._at>a._at?clamp((rtm-a._at)/(c._at-a._at),0,1):1);}
/* 효과: 'shake:세기' 'flash' 그 밖에는 소리 이름 */
let SHAKE=0,FLASH=0;
function fx(e){if(e.startsWith('shake')){const[v,who]=e.slice(6).split('@');if(who!=null&&!who.split(',').includes(String(viewIndex())))return;SHAKE=Math.max(SHAKE,+(v||4));return;}   /* '@번호' 가 붙으면 그 플레이어 화면만 흔들림 */if(e==='flash')return;AU.sfx(e);}   /* 섬광 효과는 쓰지 않음 */
function toGame(){show('game');fit();AU.bgm(GDEF.bgm!==false);$('gTitle').textContent='';$('gRoom').textContent=GAME&&GAME.local?'연습 모드':'';$('gHint').innerHTML=GDEF.controls.hint||'';
  document.body.classList.toggle('needA',!!GDEF.controls.a);document.body.classList.toggle('needDir',!!GDEF.controls.dir);buildBoard();
  if(isSpec())$('gHint').innerHTML='<span class="kk">←</span><span class="kk">→</span> 시점 전환 · <span class="kk">1</span>~<span class="kk">4</span> 선택';renderSpec();}
/* ---------- 대기방 게임 설명: 예시 화면(AI 4명 데모) + 설명 ---------- */
let HOW_ON=false,HOW=null;const hc=$('howCv');
let HOW_I=0;
function howFlip(d){HOW_I=(HOW_I+d+GAMES.length)%GAMES.length;AU.sfx('move');openHow(true);}
function openHow(keep){if(!keep)HOW_I=0;const G=GAMES[HOW_I];HOW_ON=true;$('how').hidden=false;$('howBody').innerHTML=`<div class="intro-m"><b class="hf" data-hf="-1">◀</b> ${HOW_I+1} / ${GAMES.length} <b class="hf" data-hf="1">▶</b></div>`+howHTML(G);
  const slots=[0,1,2,3].map(i=>({id:0,name:charOf(CHARS[i%CHARS.length].id).name,bot:true,ch:CHARS[i%CHARS.length].id}));HOW={G,sim:demoSim(G,slots),slots,t:performance.now()};
  const q=SC*(devicePixelRatio||1);HOW.cs=Math.max(1,Math.ceil(640/GW*q-1e-6));hc.width=GW*HOW.cs;hc.height=GH*HOW.cs;hc.style.width='640px';hc.style.height='360px';}
/* 예시 화면은 카운트다운 없이 바로 플레이 장면부터 (demoSkip: 첫 장면이 빌 때 미리 돌려 둘 프레임 수) */
function demoSim(G,slots){const m=G.newSim(slots.map(s=>({...s})),{local:true,demo:true});if(m.ph==='cd')m.t=1;for(let k=0;k<(G.demoSkip||0);k++){m.step();if(m.ev)m.ev.length=0;}return m;}
function closeHow(){HOW_ON=false;HOW=null;$('how').hidden=true;}
/* 게임 설명 창 터치 · 마우스: ◀ ▶ · 이전/다음 · 닫기 버튼, 바깥 어두운 곳 누르면 닫기, 좌우로 밀어서 넘기기 */
{const H=$('how');let sx=null;
  H.addEventListener('click',e=>{if(!HOW_ON)return;AU.init();const f=e.target.closest('[data-hf]');if(f){howFlip(+f.dataset.hf);return;}if(e.target.closest('[data-hx]')||e.target===H){AU.sfx('ok');closeHow();}});
  H.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  H.addEventListener('touchend',e=>{if(sx==null||!HOW_ON)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)howFlip(dx<0?1:-1);},{passive:true});}
function howTick(now){if(!HOW_ON||!HOW)return;let n=Math.min(4,Math.floor((now-HOW.t)/16.67));HOW.t+=n*16.67;const sim=HOW.sim;
  while(n-->0){sim.step();if(sim.ev)sim.ev.length=0;if(sim.done){HOW.sim=demoSim(HOW.G,HOW.slots);break;}}
  const og=g,ocs=CS,oG=GAME,oD=GDEF;g=hc.getContext('2d');CS=HOW.cs;GAME={slots:HOW.slots};GDEF=HOW.G;   /* 같은 그리기 함수를 미리보기 캔버스에 */
  try{g.setTransform(CS,0,0,CS,0,0);g.imageSmoothingEnabled=false;HOW.G.draw(g,HOW.sim.snap(false),HOW.sim.pd||HOW.sim,-1,now/16.67|0);}finally{g=og;CS=ocs;GAME=oG;GDEF=oD;}}
/* ---------- 개인 점수표 (게임 화면 옆): 위에서부터 남은 시간 · 실시간 개인 순위 ---------- */
/* 점수 자릿수가 늘어 칸을 넘으면 글자를 16의 배수(Neo둥근모 도트 크기)로 줄임 */
function fitText(el,max,min){let z=max;el.style.fontSize=z+'px';while(z>min&&el.scrollWidth>el.clientWidth+1){z=Math.max(min,z-16);el.style.fontSize=z+'px';}}   /* 16의 배수로만 */
let BOARD_T=0;
function buildBoard(){$('bdRows').innerHTML=[0,1,2,3].map(i=>`<div class="bd-row" id="bd${i}" style="transform:translateY(${i*62}px)"><b class="rk">${i+1}</b><span class="sw" style="background:${PCOL[i]}"></span><span class="nm">${esc(GAME&&GAME.slots[i]?GAME.slots[i].name:"")}</span><span class="tg"></span><span class="pt"></span></div>`).join('');}
function updBoard(S){if(!S||!S.ps)return;const now=performance.now();if(now-BOARD_T<100)return;BOARD_T=now;const me=viewIndex();
  const order=[0,1,2,3].sort((a,b)=>S.ps[b]-S.ps[a]||a-b);
  order.forEach((i,r)=>{const el=$('bd'+i),s=GAME.slots[i];el.style.transform=`translateY(${r*62}px)`;el.classList.toggle('me',i===me);el.classList.toggle('top',r===0&&S.ps[i]>0);
    const sub=s&&s.left?'연결 끊김 · AI 대행':S.tag?S.tag[i]||'':'';el.classList.toggle('ai',!!(s&&s.left));
    el.querySelector('.rk').textContent=r+1;el.querySelector('.nm').textContent=s?s.name:'';el.querySelector('.tg').textContent=sub;
    const pt=el.querySelector('.pt'),v=S.ps[i];if(pt.dataset.v!==String(v)){pt.dataset.v=v;pt.textContent=v.toLocaleString();fitText(pt,16,16);el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}});
  const sec=Math.max(0,Math.ceil((S.tm||0)/60));$('bdTime').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
/* ---------- 결과 ---------- */
let LAST_RESULT=null,RES_AT=0;
function finishHost(){const R=GAME.sim.result();R.gid=GAME.gid;MATCH.res.push(R);
  if(MATCH.i<MATCH.order.length-1){MATCH.i++;startMatchGame();return;}   /* 다음 게임 (시작 전 설명창에 현재 순위 점수 표시) */
  const F=finalResult();if(!isLocal())NET.send({t:'final',F});showFinal(F);}
/* 최종 결과: 게임마다 순위 점수(1위 4 · 2위 3 · 3위 2 · 4위 1) 합계 → 같으면 1위 횟수 → 마지막 게임 점수 */
function finalResult(){const{tot,first}=standings(MATCH.res),games=MATCH.res.map(R=>({gid:R.gid,ps:R.ps,pl:placePts(R.ps)})),last=games[games.length-1];
  const order=[0,1,2,3].sort((a,b)=>tot[b]-tot[a]||first[b]-first[a]||last.ps[b]-last.ps[a]||a-b);
  return{games,tot,first,order,slots:GAME.slots.map(s=>({name:s.name,ch:s.ch,bot:!s.human})),local:isLocal()};}
function showFinal(F){LAST_RESULT=F;AU.bgm(false);AU.sfx('win');show('result');const w=F.order[0];RES_AT=performance.now();
  $('resTitle').innerHTML=`<span style="color:${PCOL[w]}">${esc(F.slots[w].name)}</span> 우승!`;
  $('resGame').textContent=`미니게임 ${F.games.length}판 · 게임마다 1위 4점 · 2위 3점 · 3위 2점 · 4위 1점`;
  let prev=null,rank=0;
  $('resBox').innerHTML=F.order.map((i,r)=>{const key=F.tot[i]+'/'+F.first[i];if(key!==prev){rank=r+1;prev=key;}
    return `<div class="rrow${rank===1?' win':''}"><b class="rk">${rank}</b><i class="sw" style="background:${PCOL[i]}"></i><span class="ci">${charImg(F.slots[i].ch,1)}</span><span class="nm" style="color:${PCOL[i]}">${esc(F.slots[i].name)}</span>`+
      `<span class="gs">${F.games.map(g=>`${esc(gdef(g.gid).title)} <b>${5-g.pl[i]}위</b>`).join(' · ')}</span><b class="pt">${F.tot[i]}점</b></div>`;}).join('');
  $('resPs').innerHTML=F.games.map(g=>{const t=[0,1,2,3].sort((a,b)=>g.ps[b]-g.ps[a])[0];return g.ps[t]>0?`<span><i style="background:${PCOL[t]}"></i>${esc(gdef(g.gid).title)} 1위 ${esc(F.slots[t].name)}</span>`:'';}).join('');
  $('resNote').textContent=RESULT_SEC+'초 뒤 대기방으로 돌아갑니다';
  if(GAME&&GAME.local)GAME=null;MATCH=null;}
/* 결과 화면: RESULT_SEC 초 뒤 모두 대기방으로 (방장 기기가 판정) */
function resultTick(now){if(screen!=='result'||!RES_AT)return;const left=clamp(Math.ceil(RESULT_SEC-(now-RES_AT)/1000),0,RESULT_SEC);$('resNote').textContent=left+'초 뒤 대기방으로 돌아갑니다';
  if(left<=0&&amHost()){RES_AT=0;backToRoom();}}
/* ---------- 메인 루프 ---------- */
let acc=0,lastT=performance.now(),FR=0;
function loop(now){requestAnimationFrame(loop);pollPad();howTick(now);const dt=Math.min(100,now-lastT);lastT=now;lobbyTick();resultTick(now);if(screen!=='game'||!GAME)return;
  let S;
  if(GAME.host&&GAME.ended){S=GAME.sim.snap(false);LASTS=S;draw(S,GAME.sim.pd||GAME.sim);updBoard(S);if(now-GAME.endAt>=END_SEC*1000&&!GAME.fin){GAME.fin=1;finishHost();}return;}   /* 게임 끝 화면 END_SEC 초 → 다음 게임 */
  if(GAME.host){acc+=dt;while(acc>=1000/60){acc-=1000/60;
      const sim=GAME.sim;sim.step();const ev=sim.ev||[];for(const e of ev)fx(e);
      if(!GAME.local){GAME.evq=(GAME.evq||[]).concat(ev);if(++FR%SNAP_EVERY===0){NET.send({t:'s',g:GAME.gid,S:sim.snap(true),ev:GAME.evq,ai:GAME.slots.map(s=>s.left?2:0)});GAME.evq=[];}}
      if(sim.ev)sim.ev.length=0;
      if(sim.done){GAME.ended=true;GAME.endAt=now;acc=0;if(!GAME.local)NET.send({t:'s',g:GAME.gid,S:sim.snap(true),ev:GAME.evq||[],ai:GAME.slots.map(s=>s.left?2:0)});GAME.evq=[];return;}}
    S=GAME.sim.snap(false);LASTS=S;draw(S,GAME.sim.pd||GAME.sim);}
  else{S=viewState();if(S){LASTS=S;draw(S,GAME.pd);}else{g.setTransform(CS,0,0,CS,0,0);R(0,0,GW,GH,'#000');K('방장의 화면을 받는 중…',GW/2,GH/2,'#fff','center',12);}}
  updBoard(S);}
function draw(S,pd){const f=performance.now()/16.67|0;g.setTransform(CS,0,0,CS,0,0);g.imageSmoothingEnabled=false;
  if(SHAKE>0){g.translate(Math.round((Math.random()*2-1)*SHAKE),Math.round((Math.random()*2-1)*SHAKE));SHAKE=SHAKE>.5?SHAKE*.82:0;}
  GDEF.draw(g,S,pd,viewIndex(),f);}
/* ---------- 시작 ---------- */
$('logoImg').src=LOGO;$('nameIn').value=CFG.name;
applyFilter();fit();show('main');requestAnimationFrame(loop);
setInterval(()=>{$('netst').textContent=NET.on?(NET.role==='spectator'?'관전 중':'ONLINE'):isLocal()&&screen==='lobby'?'연습 모드':'';},500);
