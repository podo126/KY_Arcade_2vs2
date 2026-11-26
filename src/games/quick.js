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
class QuickSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=300;   /* 시작 카운트다운 5초 */
    this.tm=QK.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.N=qkChart(this.seed);this.k=[0,0,0,0];this.combo=[0,0,0,0];this.best=[0,0,0,0];this.miss=[0,0,0,0];this.st=[-99,-99,-99,-99];
    this.fx=[];this.bt=[0,0,0,0];this.my={k:0,stun:-99,fx:[]};}
  get pd(){return{N:this.N,my:this.my};}
  /* 입력: {tap,d,k,ok} — k = 그 사람이 처리한 접시 번호 (기기에서 바로 판정해서 보냄) · 소리는 누른 기기에서만 (연타 소리가 겹치지 않게) */
  input(i,e){if(this.ph!=='play'||!e.tap||e.k==null||e.k<this.k[i]||!this.N[e.k])return;this.k[i]=e.k;const no=this.N[e.k];
    if(!e.ok||e.d!==qkWant(no)){this.combo[i]=0;this.miss[i]++;this.ps[i]=Math.max(0,this.ps[i]-QK.MISS);this.st[i]=this.f;this.fx.push([i,0,this.f,e.d,0]);return;}
    this.k[i]++;this.combo[i]++;this.best[i]=Math.max(this.best[i],this.combo[i]);this.ps[i]+=qkPts(this.combo[i],no.g);this.fx.push([i,1,this.f,no.d,no.g]);}
  step(){this.f++;this.fx=this.fx.filter(x=>this.f-x[2]<14);
    if(this.ph==='cd'){if(this.t%60===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0){this.ph='end';this.t=150;this.ev.push('win','shake:5');return;}
    // AI: 각자 연타 속도로 두다다다 (가끔 틀림, 반대 접시는 더 자주 틀림)
    this.slots.forEach((s,i)=>{if(!s.bot||this.f<this.bt[i]||this.f-this.st[i]<QK.STUN)return;const no=this.N[this.k[i]];if(!no)return;
      const w=qkWant(no),d=Math.random()<(no.r?.16:.05)?6-w:w;this.input(i,{tap:1,d,k:this.k[i],ok:d===w?1:0});
      this.bt[i]=this.f+[7,8,9,10][i]+Math.floor(Math.random()*5)+(no.r?4:0);});}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,ps:this.ps,k:this.k,combo:this.combo,st:this.st,fx:this.fx,tag:this.combo.map(c=>c>=5?`${c}콤보`:'')};}
  full(){return{seed:this.seed};}
  result(){return{ps:this.ps,lines:[0,1,2,3].map(i=>`${this.k[i]}접시 · 최고 ${this.best[i]}콤보 · 와장창 ${this.miss[i]}`)};}
}
/* ---------- 그리기: 세로 4분할 · 칸마다 가운데에 접시 더미(맨 아래가 지금 접시), 양옆 손님 테이블, 맨 아래 쿵야 ---------- */
const QK_BASE=190,QK_STEP=17;   /* 맨 아래 접시 y · 접시 사이 간격 */
function qkDish(x,y,no,cur){const w=cur?32:24,c=no.g?MAP.yellow:no.r?'#ff5a5a':'#fff',e=no.g?'#c8a000':no.r?'#b02a2a':'#a8b8c8';
  R(x-w/2-1,y-1,w+2,8,MAP.ink);R(x-w/2,y,w,6,c);R(x-w/2+2,y+4,w-4,2,e);R(x-w/2+3,y+1,w-6,1,'#fff');
  const sd=no.d===4?-1:1,lx=x+sd*(w/2+(no.r?14:8));   /* 표시는 접시 바깥쪽 옆 (같은 높이) */
  if(no.r)K('반대',lx,y-4,'#ff5a5a','center',8);else K(no.d===4?'◀':'▶',lx,y-4,no.g?'#c8a000':MAP.blue,'center',8);}
function quickDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);const N=pd.N;
  for(let i=0;i<4;i++){const X=qx(i),cx=X+QW/2,mine=i===me&&pd.my;
    R(X,QB,QW,QH-QB,i===me?MAP.hi:MAP.green);R(X,QH-42,QW,42,MAP.mint);R(X,QH-42,QW,2,MAP.blue);   /* 바닥 */
    for(const sx of [X+12,X+QW-12]){R(sx-9,QH-64,18,4,MAP.ink);R(sx-8,QH-63,16,2,'#fff');R(sx-1,QH-60,2,20,MAP.ink);}   /* 양옆 손님 테이블 */
    const k=mine?Math.max(S.k[i],pd.my.k):S.k[i],stun=S.f-(mine?pd.my.stun:S.st[i])<QK.STUN;   /* 내 칸 멈춤은 내 기기 기준만 (방장 확인을 기다리면 멈춤이 길어짐) */
    // 접시 더미: 맨 아래 = 지금 접시 (놓인 쪽으로 치우침)
    if(N)for(let n=QK.SHOW-1;n>=0;n--){const no=N[k+n];if(!no)continue;const side=no.d===4?-1:1,x=cx+side*(n?10:16)+(stun&&!n?((f>>1)&1?2:-2):0),y=QK_BASE-n*QK_STEP;
      if(y-12<QB+2)continue;qkDish(x,y,no,!n);}
    // 날아가는 접시 (내 칸은 내 기기 기준으로 바로)
    const fxs=(mine?pd.my.fx:S.fx).filter(x=>x[0]===i&&S.f-x[2]>=0&&S.f-x[2]<14);
    for(const[ii,ok,at,d,gold]of fxs){const t=S.f-at,side=d===4?-1:1;
      if(ok){const x=Math.round(cx+side*(16+t*4)),y=Math.round(QK_BASE+t*t*.3);R(x-10,y,20,5,gold?MAP.yellow:'#fff');R(x-10,y+5,20,1,MAP.ink);}
      else if(t<12){for(let p=0;p<6;p++)R(Math.round(cx+side*12+(p-3)*t),Math.round(QK_BASE+4+t*t*.12-(p%2)*t),3,2,p%2?'#fff':'#a8b8c8');}}   /* 와장창 조각 */
    // 쿵야: 두다다다 — 누를 때마다 누른 쪽으로 몸이 쏠리고 다리가 번갈아 뻗음 · 틀리면 빨갛게
    const last=fxs.length?fxs[fxs.length-1]:null,lt=last?S.f-last[2]:99,lean=lt<6?(last[3]===4?-5:5):0;
    koongWalk(i,cx+lean,QH-4,lean?(lean<0?-4:3):0,lean?(lean<0?3:-4):0,lt<4?2:0,stun?{tint:'#ff8a8a'}:{});
    const c=S.combo[i];if(c>=5)K(`${c} COMBO`,cx,QB+2,c>=50?'#fff419':'#fff','center',9);
    if(stun)K('와장창!',cx,QB+20,'#ff5a5a','center',10);
    quadFrame(i,S,me);}
  if(S.ph==='cd')banner([['쿵야 순발력!','#fff419',16],['맨 아래 접시가 놓인 쪽 버튼을 두다다다!','#fff',11],['빨간 반대 접시는 반대쪽 · 틀리면 와장창 멈춤','#ffb0b0',10],[Math.max(1,Math.ceil(S.t/60)),'#fff',24,false]]);
  if(S.ph==='end')banner([['Time Out!','#fff419',24,false]]);}
regGame({id:'quick',title:'쿵야 순발력',icon:'①',
  ctrl:['버튼 두 개: <b>◀ 왼쪽 · ▶ 오른쪽</b>','맨 아래 접시가 놓인 쪽을 <b>두다다다</b> 연타!','틀리면 와장창 — 0.6초 멈추고 콤보 끊김'],
  gimmick:'<b>빨간 반대 접시</b> — 반대쪽 버튼! · <b>황금 접시</b> 3배 점수',
  win:'60초 동안 개인 점수 1위! (4명 모두 같은 접시 순서 · 콤보가 길수록 접시당 점수 UP)',
  desc:'맨 아래 접시가 놓인 쪽 버튼을 두다다다 연타!<br>세로 4분할 개인전 · 60초',
  controls:{dir:'tap',a:false,label:'◀ ▶ 두 버튼',hint:'<span class="kk">◀</span><span class="kk">▶</span> 맨 아래 접시 쪽을 두다다다! · 빨간 반대 접시는 반대쪽'},
  demoSkip:20,
  newSim:(s,c)=>new QuickSim(s,c),
  newView:()=>({N:null,my:{k:0,stun:-99,fx:[]}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=qkChart(F.seed);pd.my={k:0,stun:-99,fx:[]};}},
  /* 내 기기에서 바로 판정: 멈춤 중이면 무시 · 맞으면 다음 접시로 · 틀리면 멈춤 (◀ ▶ 만 사용) */
  prep(e,S,me,pd){if(!e.tap||(e.d!==2&&e.d!==4))return null;if(!S||!pd.N||S.ph!=='play')return null;const M=pd.my,f=S.f;
    if(f-M.stun<QK.STUN)return null;const k=Math.max(M.k,S.k[me]),no=pd.N[k];if(!no)return null;
    const ok=e.d===qkWant(no);M.fx=M.fx.filter(x=>f-x[2]<14);M.fx.push([me,ok?1:0,f,ok?no.d:e.d,no.g]);if(ok)M.k=k+1;else{M.k=k;M.stun=f;}
    AU.sfx(ok?(no.g?'pickup':'tap'):'ouch');if(!ok)SHAKE=Math.max(SHAKE,2);return{tap:1,d:e.d,k,ok:ok?1:0};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:quickDraw});
