/* ┌─────────────────────────────────────────────────────────
   │ ① 쿵야 순발력 — 투 버튼 "두다다다" 접시 나르기 (세로 4분할 · 1vs1vs1vs1 · 하드)
   │ 내 칸에 접시가 높이 쌓여 있음 → 맨 아래 접시가 놓인 쪽 버튼(◀ / ▶)을 두다다다 연타해서 손님에게 휙휙!
   │ 틀리면 와장창 — 0.6초 동안 손이 묶이고 콤보 끊김 · 콤보가 이어질수록 접시당 점수 UP
   │ 하드 기믹: 빨간 "반대 접시"는 반대쪽 버튼 · 황금 접시는 3배 점수
   │ 4명 모두 같은 접시 순서 · 판정은 각자 기기에서 바로(연타가 인터넷 지연에 막히지 않음) · 60초
   └───────────────────────────────────────────────────────── */
/* 조절값: SEC 시간 · STUN 틀렸을 때 멈춤(프레임, 36 = 0.6초) · PTS 접시 점수 · COMBO_STEP 콤보 몇 개마다 +1점 · MISS 틀릴 때 감점
   REV 반대 접시 비율(REV_FROM 번째 접시부터) · GOLD 황금 접시 비율 · SHOW 보이는 접시 수 */
const QK={SEC:60,STUN:36,PTS:10,COMBO_STEP:10,MISS:10,REV:.18,REV_FROM:30,GOLD:.05,SHOW:9,LEN:1500};
const qkPts=(c,gold)=>(QK.PTS+Math.floor(c/QK.COMBO_STEP))*(gold?3:1);   /* 콤보 10마다 +1 · 황금 3배 */
const qkWant=no=>no.r?6-no.d:no.d;   /* 눌러야 할 버튼: 반대 접시는 반대쪽 */
function qkRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 접시 순서표: 모든 기기에서 같은 시드 → 같은 순서 · d = 접시가 놓인 쪽 2(▶) / 4(◀) · r = 반대 접시 · g = 황금 접시 */
function qkChart(seed){const r=qkRng(seed),N=[];for(let k=0;k<QK.LEN;k++){const rv=k>=QK.REV_FROM&&r()<QK.REV;N.push({d:r()<.5?4:2,r:rv?1:0,g:!rv&&k>10&&r()<QK.GOLD?1:0});}return N;}
/* 당근 든 손 (시선 끌기): 플레이어마다 60초 안에 2~3번, 랜덤 시각 · 랜덤 높이에 왼쪽/오른쪽 벽에서 튀어나와 3~4초 흔들고 들어감
   높이는 이름 띠 아래 ~ 화살표 위(y 44~136) → 테이블 · 캐릭터 · 화살표를 가리지 않음 (접시는 손보다 앞 레이어)
   시드로 만들어서 모든 기기에서 같은 타이밍 · [시작 프레임, 길이, 방향 -1 왼쪽 / 1 오른쪽, y] */
function qkArms(seed){return[0,1,2,3].map(i=>{const r=qkRng(seed*7+i*131+1),n=r()<.5?2:3,L=QK.SEC*60/n,A=[];
  for(let k=0;k<n;k++){const dur=180+Math.floor(r()*61);A.push([CD_F+Math.floor(k*L+30+r()*(L-dur-60)),dur,r()<.5?-1:1,44+Math.floor(r()*93)]);}return A;});}
class QuickSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=180;   /* 시작 카운트다운 3초 */
    this.tm=QK.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.N=qkChart(this.seed);this.arm=qkArms(this.seed);this.k=[0,0,0,0];this.combo=[0,0,0,0];this.best=[0,0,0,0];this.miss=[0,0,0,0];this.st=[-99,-99,-99,-99];
    this.fx=[];this.bk=[[],[],[],[]];this.bt=[0,0,0,0];this.my={k:0,stun:-99,fx:[]};}
  get pd(){return{N:this.N,my:this.my,arm:this.arm};}
  /* 입력: {tap,d,k,ok} — k = 그 사람이 처리한 접시 번호 (기기에서 바로 판정해서 보냄) · 소리는 누른 기기에서만 (연타 소리가 겹치지 않게) */
  input(i,e){if(this.ph!=='play'||!e.tap||e.k==null||e.k<this.k[i]||!this.N[e.k])return;this.k[i]=e.k;const no=this.N[e.k];
    if(!e.ok||e.d!==qkWant(no)){this.combo[i]=0;this.miss[i]++;this.bk[i].push(no.g?2:no.r?1:0);this.ps[i]=Math.max(0,this.ps[i]-QK.MISS);this.st[i]=this.f;this.fx.push([i,0,this.f,e.d,0]);return;}
    this.k[i]++;this.combo[i]++;this.best[i]=Math.max(this.best[i],this.combo[i]);this.ps[i]+=qkPts(this.combo[i],no.g);this.fx.push([i,1,this.f,no.d,no.g]);}
  step(){this.f++;this.fx=this.fx.filter(x=>this.f-x[2]<14);
    if(this.ph==='cd'){if(this.t%60===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0){this.ph='end';this.t=150;this.ev.push('win','shake:5');return;}
    // AI: 각자 연타 속도로 두다다다 (가끔 틀림, 반대 접시는 더 자주 틀림)
    this.slots.forEach((s,i)=>{if(!s.bot||this.f<this.bt[i]||this.f-this.st[i]<QK.STUN)return;const no=this.N[this.k[i]];if(!no)return;
      const w=qkWant(no),d=Math.random()<(no.r?.16:.05)?6-w:w;this.input(i,{tap:1,d,k:this.k[i],ok:d===w?1:0});
      this.bt[i]=this.f+[7,8,9,10][i]+Math.floor(Math.random()*5)+(no.r?4:0);});}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,ps:this.ps,k:this.k,bk:this.bk,combo:this.combo,st:this.st,fx:this.fx,tag:this.combo.map(c=>c>=5?`${c}콤보`:'')};}
  full(){return{seed:this.seed};}
  result(){return{ps:this.ps,lines:[0,1,2,3].map(i=>`${this.k[i]}접시 · 최고 ${this.best[i]}콤보 · 와장창 ${this.miss[i]}`)};}
}
/* ---------- 그리기: 세로 4분할 · 칸마다 가운데에 접시 더미(맨 아래가 지금 접시), 양옆 손님 테이블, 맨 아래 쿵야 ---------- */
const QK_BASE=190,QK_STEP=17;   /* 맨 아래 접시 y · 접시 사이 간격 */
const qkPlate=no=>IMG[no.g?'qk_plate_gold':no.r?'qk_plate_red':'qk_plate'];   /* 접시 리소스 32x8 (일반 · 반대 · 황금) */
function qkDish(x,y,no){const im=qkPlate(no);if(im&&im.complete)g.drawImage(im,Math.round(x-16),y-1);else R(Math.round(x-16),y-1,32,8,no.g?MAP.yellow:no.r?'#ff5a5a':'#fff');}
/* 깨진 그릇: 접시 그림을 반으로 나눠 금 간 모양(오른쪽 반 1도트 아래) · 종류 0 일반 / 1 빨강 / 2 황금 */
const QK_BRK={};
function qkBroken(t){if(QK_BRK[t])return QK_BRK[t];const im=IMG[['qk_plate','qk_plate_red','qk_plate_gold'][t]];if(!im||!im.complete||!im.naturalWidth)return null;
  const c=document.createElement('canvas');c.width=34;c.height=10;const x=c.getContext('2d');x.drawImage(im,0,0,16,8,0,1,16,8);x.drawImage(im,16,0,16,8,18,2,16,8);return QK_BRK[t]=c;}
/* 틀릴 때마다 깨진 그릇이 양쪽 벽에 번갈아 불규칙한 산 모양으로 쌓임 (pileMound · 벽 쪽이 높음 · 가장 뒤 레이어) · 위로 갈수록 채도 낮고 투명 */
const QK_MOUND=()=>({SL:4,SW:7,STEP:5,SLOPE:10,MAXH:QH-52-QB-4});
function qkPile(i,S){const B=S.bk&&S.bk[i];if(!B)return;const X=qx(i);
  for(let side=0;side<2;side++){const L=B.filter((_,j)=>(j&1)===side),P=pileMound(L.length,i*2+side+3,QK_MOUND());
    P.forEach((p,k)=>{const src=qkBroken(L[k]);if(!src)return;const im=pileImg(src,'brk'+L[k],p.L);if(!im)return;
      g.globalAlpha=pileAlpha(p.L);g.drawImage(im,side?X+QW-36-p.dx:X+2+p.dx,QH-52-p.h);g.globalAlpha=1;});}}
/* 와장창 그림(qk_crash 40x20)을 -14도 기울인 도트 그림 (가장 가까운 도트로 돌려서 번짐 없음) · 처음 한 번만 만듦 */
let QK_CRASH=null;
function qkCrash(){if(QK_CRASH)return QK_CRASH;const im=IMG.qk_crash;if(!im||!im.complete||!im.naturalWidth)return null;
  const w=im.naturalWidth,h=im.naturalHeight,s=document.createElement('canvas');s.width=w;s.height=h;const sx=s.getContext('2d');sx.drawImage(im,0,0);const D=sx.getImageData(0,0,w,h).data;
  const a=-14*Math.PI/180,co=Math.cos(a),si=Math.sin(a),W=Math.ceil(Math.abs(w*co)+Math.abs(h*si)),H=Math.ceil(Math.abs(w*si)+Math.abs(h*co)),c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d'),O=x.createImageData(W,H);for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){const dx=xx+.5-W/2,dy=y+.5-H/2,u=Math.floor(dx*co+dy*si+w/2),v=Math.floor(-dx*si+dy*co+h/2);
    if(u<0||v<0||u>=w||v>=h)continue;const o=(v*w+u)*4,p=(y*W+xx)*4;for(let j=0;j<4;j++)O.data[p+j]=D[o+j];}
  x.putImageData(O,0,0);return QK_CRASH=c;}
function quickDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);const N=pd.N;
  for(let i=0;i<4;i++){const X=qx(i),cx=X+QW/2,mine=i===me&&pd.my,st0=mine?pd.my.stun:S.st[i],stun=S.f-st0<QK.STUN,sk=S.f-st0;   /* 내 칸 멈춤은 내 기기 기준만 (방장 확인을 기다리면 멈춤이 길어짐) */
    g.save();g.beginPath();g.rect(X,QB,QW,QH-QB);g.clip();if(sk>=0&&sk<14)g.translate(((sk>>1)&1?1:-1)*Math.max(1,Math.round(3-sk/5)),sk&1?1:0);   /* 틀리면 그 사람 칸만 살짝 흔들림 (0.23초) */
    R(X-4,QB,QW+8,QH-QB,i===me?MAP.hi:MAP.green);R(X-4,QH-42,QW+8,42,MAP.mint);R(X-4,QH-42,QW+8,2,MAP.blue);   /* 바닥 (흔들려도 빈틈 없게 양옆 4도트 더) */
    qkPile(i,S);
    {const A=IMG.qk_arm,ev=pd.arm&&pd.arm[i].find(([st,d])=>S.f>=st&&S.f<st+d);   /* 당근 든 손: 벽에서 0.2초 동안 튀어나와 흔들다 들어감 (접시 뒤 레이어) */
      if(ev&&A&&A.complete){const[st,d,sd,ay]=ev,t=S.f-st,off=Math.round(t<12?(12-t)/12*41:t>d-12?(t-d+12)/12*41:0),y=ay+[0,-2,-5,-7,-5,-2][(f>>2)%6];
        g.save();g.beginPath();g.rect(X+1,QB,QW-2,QH-QB);g.clip();if(sd>0)g.drawImage(A,X+QW-41+off,y);else{g.translate(X+41-off,y);g.scale(-1,1);g.drawImage(A,0,0);}g.restore();}}
    const k=mine?Math.max(S.k[i],pd.my.k):S.k[i];
    const TB=IMG.qk_table,cur=N&&N[k];for(const sx of [X+15,X+QW-15]){if(TB&&TB.complete)g.drawImage(TB,sx-9,QH-66);else R(sx-9,QH-66,18,4,MAP.ink);}   /* 양옆 손님 테이블 18x24 (바닥선에 맞춤) */
    if(cur&&IMG.ui_arrow.complete)g.drawImage(IMG.ui_arrow,qkWant(cur)===4?X:X+QW-30,QH-96+((f>>4)&1?2:0));   /* 지금 접시가 갈 테이블 위 화살표 (접시보다 아래 레이어) */
    // 접시 더미: 맨 아래 = 지금 접시 (놓인 쪽으로 치우침)
    if(N)for(let n=QK.SHOW-1;n>=0;n--){const no=N[k+n];if(!no)continue;const side=no.d===4?-1:1,x=cx+side*(n?10:16)+(stun&&!n?((f>>1)&1?2:-2):0),y=QK_BASE-n*QK_STEP;
      if(y-12<QB+2)continue;qkDish(x,y,no);}
    // 날아가는 접시 (내 칸은 내 기기 기준으로 바로)
    const fxs=(mine?pd.my.fx:S.fx).filter(x=>x[0]===i&&S.f-x[2]>=0&&S.f-x[2]<14);
    for(const[ii,ok,at,d,gold]of fxs){const t=S.f-at,side=d===4?-1:1;
      if(ok){qkDish(cx+side*(16+t*4),Math.round(QK_BASE+t*t*.3),{g:gold});}
      else if(t<12){for(let p=0;p<6;p++)R(Math.round(cx+side*12+(p-3)*t),Math.round(QK_BASE+4+t*t*.12-(p%2)*t),3,2,p%2?'#fff':'#a8b8c8');}}   /* 와장창 조각 */
    // 쿵야: 두다다다 — 누를 때마다 누른 쪽으로 몸이 쏠리고 다리가 번갈아 뻗음
    const last=fxs.length?fxs[fxs.length-1]:null,lt=last?S.f-last[2]:99,lean=lt<6?(last[3]===4?-5:5):0;
    koongWalk(i,cx+lean,QH-4,lean?(lean<0?-4:3):0,lean?(lean<0?3:-4):0,lt<4?2:0,{});
    if(stun){const CR=qkCrash();if(CR)g.drawImage(CR,X+1,QB+3+(sk<4?-1:0));}   /* 와장창 그림: 왼쪽 위에 비스듬히 (접시 더미를 많이 가리지 않게) */
    g.restore();
    const c=S.combo[i];if(c>=5)K(`${c} COMBO`,cx,QB+2,c>=50?'#fff419':'#fff','center',9);
    quadFrame(i,S,me);}
  cdBanner(S);
  if(S.ph==='end')banner([['Time Out!','#fff419',24,false]]);}
regGame({id:'quick',title:'순발력 테스트',icon:'①',
  ctrl:['버튼 두 개: <b>◀ 왼쪽 · ▶ 오른쪽</b>','맨 아래 접시가 놓인 쪽을 <b>두다다다</b> 연타!','틀리면 와장창 — 0.6초 멈추고 콤보 끊김'],
  gimmick:'<b>빨간 반대 접시</b> — 반대쪽 버튼! · <b>황금 접시</b> 3배 점수',
  win:'60초 동안 개인 점수 1위! (4명 모두 같은 접시 순서 · 콤보가 길수록 접시당 점수 UP)',
  desc:'맨 아래 접시가 놓인 쪽 버튼을 두다다다 연타!<br>세로 4분할 개인전 · 60초',
  controls:{dir:'tap',a:false,label:'◀ ▶ 두 버튼',hint:'<span class="kk">◀</span><span class="kk">▶</span> 접시 보내기'},
  demoSkip:20,
  newSim:(s,c)=>new QuickSim(s,c),
  newView:()=>({N:null,arm:null,my:{k:0,stun:-99,fx:[]}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=qkChart(F.seed);pd.arm=qkArms(F.seed);pd.my={k:0,stun:-99,fx:[]};}},
  /* 내 기기에서 바로 판정: 멈춤 중이면 무시 · 맞으면 다음 접시로 · 틀리면 멈춤 (◀ ▶ 만 사용) */
  prep(e,S,me,pd){if(!e.tap||(e.d!==2&&e.d!==4))return null;if(!S||!pd.N||S.ph!=='play')return null;const M=pd.my,f=S.f;
    if(f-M.stun<QK.STUN)return null;const k=Math.max(M.k,S.k[me]),no=pd.N[k];if(!no)return null;
    const ok=e.d===qkWant(no);M.fx=M.fx.filter(x=>f-x[2]<14);M.fx.push([me,ok?1:0,f,ok?no.d:e.d,no.g]);if(ok)M.k=k+1;else{M.k=k;M.stun=f;}
    AU.sfx(ok?(no.g?'pickup':'tap'):'ouch');return{tap:1,d:e.d,k,ok:ok?1:0};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:quickDraw});
