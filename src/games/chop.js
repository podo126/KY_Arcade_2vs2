/* ┌─────────────────────────────────────────────────────────
   │ ② 쿵야 주방 난타 — 떨어지는 재료에 맞춰 같은 방향키를 눌러 썰기 (리듬 게임 · 4분할 1vs1vs1vs1)
   │ 4명 모두 같은 악보 · PERFECT 100 · GREAT 60 · GOOD 30 · 콤보 10마다 배율 +0.5 (최대 3배) · 45초
   │ 판정은 각자 기기 화면 기준(prep)으로 하고, 방장은 점수만 합산합니다.
   └───────────────────────────────────────────────────────── */
const KITEM=['kc_carrot','kc_tofu','kc_tomato'];   /* 주방 재료 리소스 20x20 (당근 · 두부 · 토마토) */
const CHOP={PEPPER:.13,PEPPER_FROM:6,   /* 기믹: 6초 뒤부터 재료의 13%가 매운 고추 — 누르면 콤보 끊김 · -50 */
  SEC:45,FALL:80,HITY:100,TOPY:20,WIN:[4,8,12],PTS:[100,60,30],QN:['PERFECT','GREAT','GOOD'],QC:['#fff419','#58d838','#00ccf3'],DIRS:['','↑','→','↓','←'],COL:[0,1,2,3,0]};   /* COL: 방향(1↑ 2→ 3↓ 4←) → 왼쪽부터 칸 번호 (← ↑ → ↓ 순서) */
const chopLX=(i,d)=>qx(i)+10+CHOP.COL[d]*24;   /* 레인 왼쪽 x (4분할 칸 안 왼쪽 절반) */
const chopY=i=>qy(i);
function chopRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function chopChart(seed,start){const r=chopRng(seed),N=[];let t=start+60;const end=start+CHOP.SEC*60-60;
  while(t<end){const p=(t-start)/(CHOP.SEC*60),gap=Math.round(30-10*p),d=1+Math.floor(r()*4),hot=r()<CHOP.PEPPER&&t-start>CHOP.PEPPER_FROM*60;N.push({T:t,d,b:hot?1:0});
    if(r()<.18+.15*p&&t+gap/2<end)N.push({T:t+Math.round(gap/2),d:1+Math.floor(r()*4),b:0});t+=gap;}return N;}
class ChopSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=150;this.tm=CHOP.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.start=150;this.N=chopChart(this.seed,this.start);this.J=[{},{},{},{}];this.combo=[0,0,0,0];this.best=[0,0,0,0];this.fxs=[];this.jn=[[],[],[],[]];this.bq=[[],[],[],[]];this.pos=[0,0,0,0];this.mv=[0,0,0,0];}
  get pd(){return{N:this.N,J:this.J,myJ:this.myJ||(this.myJ={})};}
  mult(c){return Math.min(3,1+Math.floor(c/10)*.5);}
  input(i,e){if(this.ph!=='play'||!e.tap)return;const J=this.J[i];
    if(e.d>=1&&e.d<=4){this.pos[i]=e.d;this.mv[i]=this.f;}if(e.mv)return;   /* 요리사는 누른 키 칸 아래로 이동 */
    if(e.pepper){const n=e.n;if(n!=null&&this.N[n]&&this.N[n].b&&J[n]==null){J[n]=6;this.jn[i].push([n,6]);this.combo[i]=0;this.ps[i]=Math.max(0,this.ps[i]-50);this.fxs.push([i,3,this.f,this.N[n].d]);this.ev.push('ouch','shake:2');}return;}
    if(e.miss){if(e.n!=null&&this.N[e.n]&&J[e.n]==null){J[e.n]=3;this.jn[i].push([e.n,3]);}this.combo[i]=0;return;}
    const n=e.n;if(n==null||!this.N[n]||this.N[n].b||J[n]!=null||Math.abs(this.N[n].T-this.f)>45)return;const q=clamp(e.q|0,0,2);
    J[n]=q;this.jn[i].push([n,q]);this.combo[i]++;this.best[i]=Math.max(this.best[i],this.combo[i]);const pts=Math.round(CHOP.PTS[q]*this.mult(this.combo[i]));
    this.ps[i]+=pts;this.fxs.push([i,q,this.f,this.N[n].d,n]);this.ev.push(q===0?'hit':'tap');if(q===0&&this.combo[i]%10===0)this.ev.push('shake:3','combo');}
  step(){this.f++;this.fxs=this.fxs.filter(x=>this.f-x[2]<16);
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}}
    else if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(this.ph==='play'&&--this.tm<=0){this.ph='end';this.t=150;this.ev.push('win','shake:5');return;}
    // 시간 지난 음표는 놓친 것으로 (인터넷 지연 여유 40프레임)
    this.N.forEach((no,n)=>{if(this.f-no.T===40)for(let i=0;i<4;i++)if(this.J[i][n]==null){if(no.b){this.J[i][n]=5;this.jn[i].push([n,5]);continue;}this.J[i][n]=3;this.jn[i].push([n,3]);this.combo[i]=0;}});   /* 고추는 안 눌러야 정답 */
    this.slots.forEach((s,i)=>{if(!s.bot)return;this.N.forEach((no,n)=>{if(no.T-this.f===18&&this.J[i][n]==null){if(no.b){if(Math.random()<.1)this.bq[i].push([no.T,n,-1]);return;}const off=Math.round((Math.random()*2-1)*(i===1?9:13));this.bq[i].push([no.T+off,n,Math.abs(off)]);}});
      this.bq[i]=this.bq[i].filter(([at,n,dt])=>{if(this.f<at)return true;const d=this.N[n].d;if(dt<0){this.input(i,{tap:1,pepper:1,n,d});return false;}const q=CHOP.WIN.findIndex(w=>dt<=w);if(q>=0)this.input(i,{tap:1,n,q,d});return false;});});}
  snap(send){const jn=this.jn;if(send)this.jn=[[],[],[],[]];return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,ps:this.ps,combo:this.combo,fxs:this.fxs,pos:this.pos,mv:this.mv,jn:send?jn:[],tag:this.combo.map(c=>c?`콤보 ${c}`:'')};}
  full(){return{seed:this.seed,start:this.start};}
  result(){return{ps:this.ps,lines:this.best.map(b=>`최고 콤보 ${b}`)};}
}
/* 재료 그림을 사선(/)으로 나눈 두 조각 + 조각 색표 (터지는 픽셀 색) — 처음 한 번만 만듦 */
const CHOP_HALF={};
function chopHalves(key){if(CHOP_HALF[key])return CHOP_HALF[key];const im=IMG[key];if(!im||!im.complete||!im.naturalWidth)return null;
  const W=20,mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=W;return c;},src=mk(),sx=src.getContext('2d');sx.drawImage(im,0,0);
  const D=sx.getImageData(0,0,W,W),A=mk(),B=mk(),ax=A.getContext('2d'),bx=B.getContext('2d'),da=ax.createImageData(W,W),db=bx.createImageData(W,W),pal=new Set();
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4,T=x+y<W-1?da:db;for(let c=0;c<4;c++)T.data[o+c]=D.data[o+c];
    if(D.data[o+3]>200){const h='#'+[0,1,2].map(c=>D.data[o+c].toString(16).padStart(2,'0')).join('');if(h!=='#000000')pal.add(h);}}
  ax.putImageData(da,0,0);bx.putImageData(db,0,0);return CHOP_HALF[key]={a:A,b:B,pal:[...pal]};}
/* 4분할 그리기: 칸마다 왼쪽 = 레인 4줄 + 도마, 오른쪽 = 요리사 쿵야(썰 때마다 들썩) · 콤보 */
function chopDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);const HY=CHOP.HITY,TY=CHOP.TOPY;
  for(let i=0;i<4;i++){const X=qx(i),Y=chopY(i);R(X,Y,QW,QH,i===me?MAP.hi:MAP.green);R(X+112,Y+13,QW-112,QH-13,MAP.cream);wallTiles(X+112,Y+13,QW-113,QH-46);R(X+112,Y+QH-33,QW-113,32,MAP.mint);R(X+112,Y+QH-33,QW-113,2,MAP.blue);   /* 왼쪽 레인 · 오른쪽 주방 */
    for(let d=1;d<=4;d++){const lx=chopLX(i,d);R(lx+9,Y+TY,2,HY-TY,MAP.shade);}
    R(X+6,Y+HY+13,100,18,MAP.mint);R(X+6,Y+HY+13,100,3,'#fff');R(X+6,Y+HY+29,100,2,MAP.blue);   // 도마 (민트)
    for(let d=1;d<=4;d++){const lx=chopLX(i,d);R(lx-1,Y+HY-11,22,22,MAP.blue);R(lx,Y+HY-10,20,20,MAP.cream);K(CHOP.DIRS[d],lx+10,Y+HY-6,MAP.blue,'center',9);}   /* 판정 칸 (재료 크기 20) */
    const hit=S.fxs.some(x=>x[0]===i&&S.f-x[2]<8&&x[1]!==3),bob=hit?0:(((f>>5)+i)%2?-1:0);koongWalk(i,X+176,Y+QH-4+bob,hit?-3:0,hit?3:0,hit?3:0);   /* 요리사: 썰 때 다리 벌리고 들썩 */
    const c=S.combo[i];if(c>=2)K(`${c} COMBO`,X+176,Y+18,c>=30?'#fff419':'#fff','center',c>=30?11:9);}
  // 떨어지는 재료
  if(pd.N)for(let n=0;n<pd.N.length;n++){const no=pd.N[n],dt=no.T-S.f;if(dt>CHOP.FALL||dt<-14)continue;const yl=HY-dt/CHOP.FALL*(HY-TY);
    for(let i=0;i<4;i++){if(pd.J[i]&&pd.J[i][n]!=null||i===me&&pd.myJ&&pd.myJ[n]!=null)continue;const lx=chopLX(i,no.d),y=chopY(i)+yl,im=IMG[KITEM[n%3]];
      if(y<chopY(i)+14)continue;   /* 이름 띠 위로는 안 그림 */
      if(no.b){const yy=Math.round(y)-9,X=lx+3;R(X+6,yy,4,3,'#3a8a28');R(X+7,yy-2,2,2,'#3a8a28');R(X+3,yy+3,10,9,'#e83a2a');R(X+4,yy+12,8,3,'#e83a2a');R(X+6,yy+15,4,2,'#c82a1a');R(X+4,yy+4,2,4,'#ff9a8a');continue;}   /* 매운 고추 (도트) */
      if(im&&im.complete)g.drawImage(im,lx,Math.round(y)-10);else R(lx,Math.round(y)-10,20,20,'#e8a040');}}
  // 썰기 효과: 사선으로 반 갈라져 튀는 재료 + 1픽셀 조각
  for(const[i,q,at,d,nn]of S.fxs){const k=S.f-at,lx=chopLX(i,d),Y=chopY(i),tx=qx(i)+176;
    if(q===3){K('매워! 콤보 끊김',tx,Y+36-Math.floor(k/3),'#ff5a5a','center',10);R(lx+2-k,Y+HY-6,4,4,'#e83a2a');R(lx+14+k,Y+HY-6,4,4,'#e83a2a');continue;}
    const y0=Y+HY-10,HV=chopHalves(KITEM[(nn!=null?nn:at)%3]),fl=Math.round(k*k*.07),dx=Math.round(k*1.3);
    if(HV){g.drawImage(HV.a,lx-dx,y0-Math.round(k*.9)+fl);g.drawImage(HV.b,lx+dx,y0+Math.round(k*.4)+fl);}   /* 사선(/)으로 갈라진 두 조각 · 정수 좌표 */
    if(k<4)for(let j=-4;j<=23;j++)R(lx+19-j,y0+j,1,1,'#fff');   /* 썰리는 순간 흰 사선 */
    {const r=chopRng((nn!=null?nn:at)*7919+i*131),pal=HV?HV.pal:['#fff'],n=[14,10,6][q];   /* 터지는 1픽셀 조각 (모든 기기에서 같은 모양) */
      for(let p=0;p<n;p++){const an=r()*6.283,sp=.7+r()*1.6,life=9+r()*7,c=r()<.25?'#fff':pal[Math.floor(r()*pal.length)];if(k>life)continue;
        R(Math.round(lx+10+Math.cos(an)*sp*k),Math.round(y0+10+Math.sin(an)*sp*k+k*k*.05),1,1,c);}}
    if(k<12)K(CHOP.QN[q],tx,Y+36-Math.floor(k/3),CHOP.QC[q],'center',q===0?12:10);}
  for(let i=0;i<4;i++)quadFrame(i,S,me);
  const sec=Math.max(0,Math.ceil(S.tm/60));R(222,116,36,18,MAP.ink);txt(String(sec),240,121,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',10);
  if(S.ph==='cd'){R(90,90,300,90,'rgba(42,58,72,.92)');K('주방 난타!',240,98,'#fff419','center',16);K('재료가 선에 닿을 때 같은 방향키!',240,122,'#fff','center',11);txt(String(Math.max(1,Math.ceil(S.t/50))),240,150,'#fff','center',14);}
  if(S.ph==='end'){R(100,112,280,46,'rgba(42,58,72,.92)');K('그만! 영업 종료',240,124,'#fff419','center',16);}}
regGame({id:'chop',title:'쿵야 주방 난타',icon:'②',
  ctrl:['내 이름이 적힌 칸 (4분할)','재료가 <b>화살표 칸</b>에 닿을 때 같은 방향키','콤보가 이어질수록 점수 UP'],
  gimmick:'<b>매운 고추</b> — 고추는 누르지 마세요! 누르면 콤보 끊김',
  win:'45초 동안 개인 점수 1위! (4명 모두 같은 악보)',
  desc:'떨어지는 재료가 선에 닿을 때 같은 방향키로 썰기!<br>4명 모두 같은 악보 · 콤보가 이어질수록 점수 배율 UP · 45초',
  controls:{dir:'tap',a:false,label:'방향키 4개',hint:'<span class="kk">←</span><span class="kk">↑</span><span class="kk">→</span><span class="kk">↓</span> 재료가 선에 닿을 때 같은 방향!'},
  demoSkip:150,   /* 게임 설명: 열자마자 재료가 떨어지는 장면부터 */
  newSim:(s,c)=>new ChopSim(s,c),
  newView:()=>({N:null,J:[{},{},{},{}],myJ:{}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=chopChart(F.seed,F.start);pd.J=[{},{},{},{}];pd.myJ={};}},
  applyDelta(pd,S){(S.jn||[]).forEach((L,i)=>L.forEach(([n,q])=>{pd.J[i][n]=q;}));},
  /* 내 화면 기준 판정: 가까운 같은 방향 재료를 찾아 품질까지 정해서 보냄 */
  prep(e,S,me,pd){if(!e.tap||!S||!pd.N)return e;const J=pd.J[me],M=pd.myJ,done=n=>J[n]!=null||M[n]!=null;let best=-1,bd=99;   /* M = 내가 이미 누른 재료(화면에서 바로 사라지게) */
    pd.N.forEach((no,n)=>{if(done(n))return;const dt=Math.abs(no.T-S.f);if(dt<=CHOP.WIN[2]&&no.d===e.d&&dt<bd){bd=dt;best=n;}});
    if(best>=0&&pd.N[best].b){M[best]=6;return{tap:1,pepper:1,n:best,d:e.d};}
    if(best>=0){const q=CHOP.WIN.findIndex(w=>bd<=w);M[best]=q;return{tap:1,n:best,q,d:e.d};}
    let wrong=-1;pd.N.forEach((no,n)=>{if(!done(n)&&!no.b&&Math.abs(no.T-S.f)<=CHOP.WIN[1]&&wrong<0)wrong=n;});
    if(wrong>=0){M[wrong]=3;return{tap:1,miss:1,n:wrong,d:e.d};}return{tap:1,mv:1,d:e.d};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:chopDraw});
