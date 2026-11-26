/* ┌─────────────────────────────────────────────────────────
   │ ① 쿵야 순발력 — 투 버튼 순발력 아케이드 (세로 4분할 · 1vs1vs1vs1)
   │ 왼쪽 / 오른쪽 테이블에 음식이 "딱" 나타나면 그쪽 버튼(◀ ▶)을 최대한 빨리!
   │ 빠를수록 점수 UP (최대 200) · 반대쪽 -50 · 아무것도 없을 때 누르면 -20 · 폭탄은 누르면 -100
   │ 4명 모두 같은 순서 · 같은 타이밍 · 반응 속도는 각자 기기 화면 기준으로 재서(prep) 인터넷 지연과 무관 · 40초
   └───────────────────────────────────────────────────────── */
/* 조절값: SEC 시간 · WIN 음식이 떠 있는 프레임(60=1초) · GAP 다음 음식까지 간격(처음→끝) · BOMB 폭탄 비율 · RT 판정(프레임) */
const QK={SEC:40,WIN:45,LATE:40,GAP:[95,55],GAPR:30,BOMB:.15,BOMB_FROM:5,RT:[15,26],QN:['PERFECT','GREAT','GOOD'],QC:['#fff419','#58d838','#00ccf3']};
const qkPts=rt=>Math.max(30,200-rt*4);   /* 반응 프레임 → 점수 (0.17초 = 160점) */
function qkRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 음식 순서표: 모든 기기에서 같은 시드 → 같은 순서 · d = 2(▶ 오른쪽) / 4(◀ 왼쪽) · b = 폭탄 */
function qkChart(seed,start){const r=qkRng(seed),N=[];let t=start+50;const end=start+QK.SEC*60-QK.WIN;
  while(t<end){const p=(t-start)/(QK.SEC*60);N.push({T:t,d:r()<.5?4:2,b:r()<QK.BOMB&&t-start>QK.BOMB_FROM*60?1:0});t+=Math.round(QK.GAP[0]+(QK.GAP[1]-QK.GAP[0])*p+r()*QK.GAPR);}return N;}
class QuickSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=150;this.tm=QK.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.start=150;this.N=qkChart(this.seed,this.start);this.J=[{},{},{},{}];this.jn=[[],[],[],[]];this.fxs=[];
    this.streak=[0,0,0,0];this.hits=[0,0,0,0];this.best=[99,99,99,99];this.face=[0,0,0,0];this.ff=[-99,-99,-99,-99];this.bq=[[],[],[],[]];}
  get pd(){return{N:this.N,J:this.J,myJ:this.myJ||(this.myJ={})};}
  mark(i,n,q){this.J[i][n]=q;this.jn[i].push([n,q]);}
  input(i,e){if(this.ph!=='play'||!e.tap)return;if(e.d===2||e.d===4){this.face[i]=e.d;this.ff[i]=this.f;}
    if(e.early){this.ps[i]=Math.max(0,this.ps[i]-20);this.streak[i]=0;this.fxs.push([i,'early',this.f,-1,-20]);this.ev.push('tap');return;}   /* 아무것도 없을 때 누름 */
    const n=e.n,no=this.N[n];if(n==null||!no||this.J[i][n]!=null||this.f<no.T-5||this.f-no.T>QK.WIN+QK.LATE)return;
    if(no.b){this.mark(i,n,4);this.streak[i]=0;this.ps[i]=Math.max(0,this.ps[i]-100);this.fxs.push([i,'boom',this.f,n,-100]);this.ev.push('big','shake:3');return;}
    if(e.d!==no.d){this.mark(i,n,3);this.streak[i]=0;this.ps[i]=Math.max(0,this.ps[i]-50);this.fxs.push([i,'wrong',this.f,n,-50]);this.ev.push('ouch');return;}
    const rt=clamp(e.rt|0,0,QK.WIN),q=rt<=QK.RT[0]?0:rt<=QK.RT[1]?1:2,pts=qkPts(rt);this.mark(i,n,q);
    this.streak[i]++;this.hits[i]++;this.best[i]=Math.min(this.best[i],rt);this.ps[i]+=pts;this.fxs.push([i,q,this.f,n,pts]);this.ev.push(q===0?'hit':'tap');if(this.streak[i]%5===0)this.ev.push('combo');}
  step(){this.f++;this.fxs=this.fxs.filter(x=>this.f-x[2]<30);
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0){this.ph='end';this.t=150;this.ev.push('win','shake:5');return;}
    // 시간이 지난 음식: 안 누른 사람은 놓침 (인터넷 지연 여유 LATE 프레임) · 폭탄은 안 누르면 성공
    this.N.forEach((no,n)=>{if(this.f-no.T===QK.WIN+QK.LATE)for(let i=0;i<4;i++)if(this.J[i][n]==null){this.mark(i,n,no.b?5:6);if(!no.b)this.streak[i]=0;}});
    // AI: 음식이 나타나면 각자 반응 속도로 누름 (가끔 반대쪽 · 폭탄도 가끔 누름)
    this.slots.forEach((s,i)=>{if(!s.bot)return;this.N.forEach((no,n)=>{if(no.T!==this.f)return;
        if(no.b){if(Math.random()<.12)this.bq[i].push([no.T+10+Math.floor(Math.random()*10),n,no.d]);return;}
        const rt=[13,16,19,22][i]+Math.floor(Math.random()*12),d=Math.random()<.04?6-no.d:no.d;this.bq[i].push([no.T+rt,n,d]);});
      this.bq[i]=this.bq[i].filter(([at,n,d])=>{if(this.f<at)return true;this.input(i,{tap:1,n,d,rt:this.f-this.N[n].T});return false;});});}
  snap(send){const jn=this.jn;if(send)this.jn=[[],[],[],[]];return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,ps:this.ps,fxs:this.fxs,face:this.face,ff:this.ff,streak:this.streak,jn:send?jn:[],
    tag:this.streak.map(c=>c>=2?`${c}연속`:'')};}
  full(){return{seed:this.seed,start:this.start};}
  result(){return{ps:this.ps,lines:[0,1,2,3].map(i=>`성공 ${this.hits[i]}회 · 최고 반응 ${this.best[i]<99?Math.round(this.best[i]*16.7)+'ms':'-'}`)};}
}
/* ---------- 그리기: 세로 4분할 · 칸마다 위쪽 = 왼쪽/오른쪽 테이블, 아래쪽 = 가운데 쿵야 ---------- */
const QK_TX=[24,96],QK_ITEM=['kc_carrot','kc_tofu','kc_tomato'],QK_TOP=112,QK_FLOOR=150;   /* 테이블 가운데 x(칸 안) · 테이블 윗면 y · 바닥선 y */
function qkBomb(x,y,f){R(x-6,y-4,12,12,'#2a2a3a');R(x-7,y-2,14,8,'#2a2a3a');R(x-4,y-3,3,3,'#6a6a8a');R(x+2,y-8,2,4,'#a08060');R(x+3,y-10,2,2,(f>>2)&1?'#fff419':'#ff5a5a');
  if((f>>3)&1){R(x-8,y-6,16,1,'#ff5a5a');R(x-8,y+9,16,1,'#ff5a5a');}}
function quickDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);const TT=QK_TOP,FY=QK_FLOOR;
  for(let i=0;i<4;i++){const X=qx(i),cx=X+QW/2;
    wallTiles(X+1,QB,QW-2,FY-QB);R(X+1,FY,QW-2,QH-FY-1,MAP.mint);R(X+1,FY,QW-2,2,MAP.blue);for(let k=0;k<QW-2;k+=32)R(X+1+k,FY+2,16,QH-FY-3,MAP.green);   /* 벽 · 바닥 */
    if(i===me)R(X+1,QB+1,QW-2,2,MAP.yellow);
    for(const t of QK_TX){const x=X+t;R(x-14,TT+7,3,FY+8-TT-7,MAP.ink);R(x+11,TT+7,3,FY+8-TT-7,MAP.ink);R(x-19,TT-1,38,8,MAP.ink);R(x-18,TT,36,6,'#fff');R(x-18,TT+5,36,1,'#d8e4ec');for(let k=0;k<36;k+=6)R(x-18+k,TT+6,6,2,MAP.blue);}   /* 왼쪽 · 오른쪽 테이블 */
    K('◀',X+QK_TX[0],TT+12,MAP.blue,'center',8);K('▶',X+QK_TX[1],TT+12,MAP.blue,'center',8);
    // 떠 있는 음식 (아직 판정 안 된 것 · 내 화면에선 내가 누른 건 바로 사라짐)
    if(pd.N)for(let n=0;n<pd.N.length;n++){const no=pd.N[n],dt=S.f-no.T;if(dt<0||dt>QK.WIN)continue;if(pd.J[i]&&pd.J[i][n]!=null||i===me&&pd.myJ&&pd.myJ[n]!=null)continue;
      const x=X+QK_TX[no.d===4?0:1],pop=dt<4?(4-dt)*2:0,y=TT-20-pop;
      if(no.b)qkBomb(x,y+10,f);else{const im=IMG[QK_ITEM[n%3]];if(im&&im.complete)g.drawImage(im,x-10,y);else R(x-10,y,20,20,'#e8a040');}
      const w=Math.round(28*(1-dt/QK.WIN));R(x-14,y-8,28,4,MAP.ink);R(x-14,y-8,w,4,no.b?'#ff5a5a':dt<QK.RT[0]?MAP.yellow:dt<QK.RT[1]?'#58d838':'#00ccf3');   /* 남은 시간 막대 */
      if(!no.b&&dt<12&&(dt>>1)%2===0)K('!',x,y-24,'#ff5a5a','center',10);}
    // 가운데 쿵야: 누른 쪽으로 몸을 기울이고 다리를 뻗음
    const lean=S.f-S.ff[i]<10?(S.face[i]===4?-6:6):0,hit=S.fxs.some(x=>x[0]===i&&S.f-x[2]<8&&typeof x[1]==='number'),bob=lean?0:(((f>>5)+i)%2?-1:0);
    koongWalk(i,cx+lean,QH-4+bob,lean?Math.sign(lean)*3:0,lean?Math.sign(lean)*3:0,hit?2:0);
    // 효과: 잡은 음식이 쿵야에게 날아옴 · 점수 글자
    for(const[ii,q,at,n,pts]of S.fxs){if(ii!==i)continue;const k=S.f-at;
      if(typeof q==='number'&&n>=0&&k<8&&pd.N){const sx=X+QK_TX[pd.N[n].d===4?0:1],im=IMG[QK_ITEM[n%3]],x=Math.round(sx+(cx-sx)*k/8),y=Math.round(TT-20+k*8);if(im&&im.complete)g.drawImage(im,x-10,y);}
      if(q==='boom'&&k<14&&pd.N){const bx=X+QK_TX[pd.N[n].d===4?0:1];for(let p=0;p<10;p++){const a=p*.628,r=4+k*2;R(Math.round(bx+Math.cos(a)*r),Math.round(TT-10+Math.sin(a)*r*.8),2,2,p%2?'#ff9a3a':'#fff419');}}
      const lab=typeof q==='number'?`${QK.QN[q]}`:q==='boom'?'BOOM!':q==='wrong'?'반대쪽!':'성급해요!',col=typeof q==='number'?QK.QC[q]:'#ff5a5a';
      if(k<24){K(lab,cx,QB+30-Math.floor(k/3),col,'center',typeof q==='number'&&q===0?12:10);txt((pts>0?'+':'')+pts,cx,QB+46-Math.floor(k/3),pts>0?'#fff':'#ff5a5a','center',8);}}
    if(S.streak[i]>=3)K(`${S.streak[i]}연속!`,cx,QB+6,'#fff','center',9);
    quadFrame(i,S,me);}
  if(S.ph==='cd'){R(60,86,360,96,'rgba(42,58,72,.92)');K('쿵야 순발력!',240,94,'#fff419','center',16);K('음식이 나온 쪽 버튼을 최대한 빨리!',240,118,'#fff','center',11);
    K('◀ 왼쪽  ·  ▶ 오른쪽  ·  폭탄은 참기',240,136,'#d4f4ff','center',10);txt(String(Math.max(1,Math.ceil(S.t/50))),240,158,'#fff','center',14);}
  if(S.ph==='end'){R(110,112,260,46,'rgba(42,58,72,.92)');K('그만!',240,124,'#fff419','center',16);}}
regGame({id:'quick',title:'쿵야 순발력',icon:'①',
  ctrl:['버튼 두 개: <b>◀ 왼쪽 · ▶ 오른쪽</b>','음식이 나타난 쪽 버튼을 최대한 빨리!','빠를수록 점수 UP · 반대쪽 / 미리 누르기는 감점'],
  gimmick:'<b>폭탄</b> — 폭탄이 나오면 꾹 참기! 누르면 -100',
  win:'40초 동안 개인 점수 1위! (4명 모두 같은 순서 · 같은 타이밍)',
  desc:'왼쪽 / 오른쪽에 음식이 나오면 그쪽 버튼을 최대한 빨리!<br>세로 4분할 개인전 · 40초',
  controls:{dir:'tap',a:false,label:'◀ ▶ 두 버튼',hint:'<span class="kk">◀</span><span class="kk">▶</span> 음식이 나온 쪽을 최대한 빨리! · 폭탄은 누르지 마세요'},
  demoSkip:110,
  newSim:(s,c)=>new QuickSim(s,c),
  newView:()=>({N:null,J:[{},{},{},{}],myJ:{}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=qkChart(F.seed,F.start);pd.J=[{},{},{},{}];pd.myJ={};}},
  applyDelta(pd,S){(S.jn||[]).forEach((L,i)=>L.forEach(([n,q])=>{pd.J[i][n]=q;}));},
  /* 내 화면 기준 판정: 지금 내 화면에 떠 있는 음식을 찾아 반응 프레임(rt)까지 재서 보냄 (◀ ▶ 만 사용) */
  prep(e,S,me,pd){if(!e.tap||(e.d!==2&&e.d!==4))return null;if(!S||!pd.N)return e;const J=pd.J[me],M=pd.myJ,f=S.f;let n=-1;
    pd.N.forEach((no,k)=>{if(n<0&&J[k]==null&&M[k]==null&&f>=no.T&&f-no.T<=QK.WIN)n=k;});
    if(n<0)return{tap:1,early:1,d:e.d};M[n]=1;return{tap:1,n,d:e.d,rt:Math.round(f-pd.N[n].T)};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:quickDraw});
