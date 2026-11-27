/* ┌─────────────────────────────────────────────────────────
   │ ② 주방 난타 — 떨어지는 재료가 화살표 칸에 닿을 때 같은 방향키를 눌러 썰기 (리듬 게임 · 세로 4분할 1vs1vs1vs1)
   │ 4명 모두 같은 악보 · PERFECT 100 · GREAT 60 · GOOD 30 · 콤보 10마다 배율 +0.5 (최대 3배) · 60초
   │ 판정은 각자 기기 화면 기준(prep)으로 하고, 방장은 점수만 합산합니다.
   └───────────────────────────────────────────────────────── */
const KITEM=['kc_carrot','kc_pimento','kc_tomato'];   /* 주방 재료 리소스 20x20 (당근 · 피망 · 토마토) */
const CHOP={PEPPER:.13,PEPPER_FROM:4,   /* 기믹: 4초 뒤부터 재료의 13%가 돌(kc_stone) — 누르면 콤보 끊김 · -50 (변수 이름은 예전 고추 그대로) */
  SEC:60,FALL:65,HITY:188,TOPY:40,WIN:[4,8,12],PTS:[100,60,30],QN:['PERFECT','GREAT','GOOD'],QC:['#fff419','#58d838','#00ccf3'],DIRS:['','↑','→','↓','←'],COL:[0,1,2,3,0]};   /* COL: 방향(1↑ 2→ 3↓ 4←) → 왼쪽부터 칸 번호 (← ↑ → ↓ 순서) */
const chopX=i=>qx(i)+5;   /* 세로 칸 안 레인 영역 왼쪽 (너비 110) */
const chopLX=(i,d)=>chopX(i)+8+CHOP.COL[d]*24;   /* 레인 왼쪽 x */
function chopRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function chopChart(seed,start){const r=chopRng(seed),N=[];let t=start+60;const end=start+CHOP.SEC*60-60;
  while(t<end){const p=(t-start)/(CHOP.SEC*60),gap=Math.round(22-8*p),d=1+Math.floor(r()*4),hot=r()<CHOP.PEPPER&&t-start>CHOP.PEPPER_FROM*60;N.push({T:t,d,b:hot?1:0});
    if(r()<.25+.2*p&&t+gap/2<end)N.push({T:t+Math.round(gap/2),d:1+Math.floor(r()*4),b:0});t+=gap;}return N;}
class ChopSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=180;this.tm=CHOP.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.start=180;   /* 악보 시작 = 카운트다운(3초) 끝 */
    this.N=chopChart(this.seed,this.start);this.J=[{},{},{},{}];this.combo=[0,0,0,0];this.best=[0,0,0,0];this.fxs=[];this.jn=[[],[],[],[]];this.bq=[[],[],[],[]];this.pos=[0,0,0,0];this.mv=[0,0,0,0];}
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
    if(this.ph==='cd'){if(this.t%60===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}}
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
/* 요리사 위치·파티클은 화면마다 따로 계산 (보이는 것만, 결과에 영향 없음) */
const CHEF={f:-1,x:[],tx:[],pt:[]};
function chopChefs(S,pd,me,f){const C=CHEF;if(S.f<C.f-5||C.f<0){C.x=[];C.pt=[];}const n=C.f<0?1:clamp(Math.round(S.f-C.f),0,4);C.f=S.f;
  for(let i=0;i<4;i++){const{w}=koongSize(i),x0=chopX(i),m=Math.min(Math.ceil(w/2)-2,30),lo=x0+m,hi=x0+110-m;   /* 큰 캐릭터(샐쿵)는 옆 칸으로 조금 넘어가도 이동이 보이게 */
    let d=S.pos?S.pos[i]:0;if(i===me&&pd.myJ&&pd.myJ.d&&pd.myJ.df>=(S.mv?S.mv[i]:0)-20)d=pd.myJ.d;
    const tx=clamp(d?chopLX(i,d)+10:x0+55,lo,hi);if(C.x[i]==null)C.x[i]=tx;
    if(C.tx[i]!==tx&&C.tx[i]!=null){const dir=Math.sign(tx-C.x[i]);for(let k=0;k<6;k++)C.pt.push({x:C.x[i]-dir*(4+k*2),y:266-(k%3),vx:-dir*(.2+k*.12),vy:-.25-(k%3)*.18,t:0,l:10+k*2,c:k%2?'#fff':MAP.shade});}   /* 출발할 때 발밑 먼지 */
    C.tx[i]=tx;let moving=0;for(let k=0;k<n;k++){const dx=tx-C.x[i];if(dx){C.x[i]+=Math.sign(dx)*Math.min(Math.abs(dx),dx*dx>64?4:2);moving=Math.sign(dx);}}
    if(moving&&(S.f&3)===0)C.pt.push({x:C.x[i]-moving*6,y:267,vx:-moving*.3,vy:-.3,t:0,l:8,c:'#fff'});
    const hit=S.fxs.some(x=>x[0]===i&&S.f-x[2]<8),bob=moving||hit?0:(((f>>5)+i)%2?-1:0),leg=moving?-moving*3:0;
    koongWalk(i,C.x[i],268+bob,leg,leg,0);}
  for(let k=0;k<n;k++)C.pt.forEach(p=>{p.t++;p.x+=p.vx;p.y+=p.vy;});C.pt=C.pt.filter(p=>p.t<p.l);
  for(const p of C.pt)R(Math.round(p.x),Math.round(p.y),1,1,p.c);}
/* 세로 4분할 그리기: 칸마다 위 = 레인 4줄 + 판정 칸 + 도마, 아래 = 누른 칸 아래로 이동하는 요리사 쿵야 */
function chopDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);const HY=CHOP.HITY,TY=CHOP.TOPY,LY=HY+14,CROSS=14*CHOP.FALL/(HY-TY);   /* LY = 재료 구간 / 요리사 구간 경계 · CROSS = 재료 가운데가 경계에 닿는 프레임(판정 시각 뒤) */
  for(let i=0;i<4;i++){const X=qx(i),x=chopX(i);R(X,0,QW,QH,i===me?MAP.hi:MAP.green);R(X,LY,QW,QH-LY,'#efe6c4');R(X,LY,QW,2,'#d9cfa4');   /* 아래 요리사 구간: 바닥 색 따로 + 경계선 */
    for(let d=1;d<=4;d++){const lx=chopLX(i,d);R(lx+9,TY,2,HY-TY,MAP.shade);}
    for(let d=1;d<=4;d++){const lx=chopLX(i,d);R(lx-1,HY-11,22,22,MAP.blue);R(lx,HY-10,20,20,MAP.cream);K(CHOP.DIRS[d],lx+10,HY-6,MAP.blue,'center',9);}   /* 판정 칸 (재료 크기 20) */
    const c=S.combo[i];if(c>=2)K(`${c} COMBO`,X+QW/2,QB+2,c>=30?'#fff419':'#fff','center',9);}
  // 떨어지는 재료
  if(pd.N)for(let n=0;n<pd.N.length;n++){const no=pd.N[n],dt=no.T-S.f;if(dt>CHOP.FALL||dt<-CROSS-14)continue;const y=HY-dt/CHOP.FALL*(HY-TY);
    for(let i=0;i<4;i++){if(pd.J[i]&&pd.J[i][n]!=null||i===me&&pd.myJ&&pd.myJ[n]!=null)continue;const lx=chopLX(i,no.d),im=IMG[KITEM[n%3]];
      if(y>LY){const k=Math.floor(-dt-CROSS);if(k<0||k>=14)continue;   /* 경계를 넘으면 터지며 사라짐: 흰 김 + 재료 색 조각(1~2도트)이 위·옆으로 튐 (모든 기기에서 같은 모양) */
        const HV=chopHalves(no.b?'kc_stone':KITEM[n%3]),pal=HV?HV.pal:['#fff'],r=chopRng(n*7919+i*131+77);if(k<3){const w=14+k*4;R(lx+10-w/2,LY-7-k,w,4+k,'rgba(255,255,255,.85)');}   /* 퍽: 흰 김 */
        for(let p=0;p<16;p++){const an=-Math.PI*(.05+r()*.9),sp=1+r()*1.6,c=r()<.2?'#fff':pal[Math.floor(r()*pal.length)],z=p%3?2:1;if(k>8+p%6)continue;
          R(Math.round(lx+10+Math.cos(an)*sp*k),Math.round(LY-6+Math.sin(an)*sp*k+k*k*.07),z,z,c);}continue;}
      const st=no.b?IMG.kc_stone:im,Y=Math.round(y)-10,h=Math.min(20,LY-Y);if(h<=0)continue;if(st&&st.complete)g.drawImage(st,0,0,20,h,lx,Y,20,h);else R(lx,Y,20,h,no.b?'#525252':'#e8a040');}}   /* 경계선 아래는 잘라서 그림 (경계로 가라앉다가 터짐) */   /* 돌 = 누르면 안 되는 기믹 */
  // 썰기 효과: 사선으로 반 갈라져 튀는 재료 + 1픽셀 조각
  for(const[i,q,at,d,nn]of S.fxs){const k=S.f-at,lx=chopLX(i,d),tx=qx(i)+QW/2;
    if(q===3){K('Miss!',tx,HY-44-k,'#ff5a5a','center',10);const sh=IMG.kc_stone_hit;if(sh&&sh.complete)g.drawImage(sh,lx+(k<4?(k&1?1:-1):0),HY-10);continue;}   /* 돌을 내리침: 반짝이는 돌 */
    const y0=HY-10,HV=chopHalves(KITEM[(nn!=null?nn:at)%3]),fl=Math.round(k*k*.07),dx=Math.round(k*1.3);
    if(HV){g.drawImage(HV.a,lx-dx,y0-Math.round(k*.9)+fl);g.drawImage(HV.b,lx+dx,y0+Math.round(k*.4)+fl);}   /* 사선(/)으로 갈라진 두 조각 · 정수 좌표 */
    if(k<4)for(let j=-4;j<=23;j++)R(lx+19-j,y0+j,1,1,'#fff');   /* 썰리는 순간 흰 사선 */
    {const r=chopRng((nn!=null?nn:at)*7919+i*131),pal=HV?HV.pal:['#fff'],n=[14,10,6][q];   /* 터지는 1픽셀 조각 (모든 기기에서 같은 모양) */
      for(let p=0;p<n;p++){const an=r()*6.283,sp=.7+r()*1.6,life=9+r()*7,c=r()<.25?'#fff':pal[Math.floor(r()*pal.length)];if(k>life)continue;
        R(Math.round(lx+10+Math.cos(an)*sp*k),Math.round(y0+10+Math.sin(an)*sp*k+k*k*.05),1,1,c);}}
    if(k<12)K(CHOP.QN[q],tx,HY-44-k,CHOP.QC[q],'center',q===0?12:10);}
  chopChefs(S,pd,me,f);   /* 도마 아래 요리사: 누른 키 칸 아래로 미끄러지듯 이동 + 발밑 먼지 */
  for(let i=0;i<4;i++)quadFrame(i,S,me);
  cdBanner(S);
  if(S.ph==='end')banner([['Time Out!','#fff419',24,false]]);}
regGame({id:'chop',title:'주방 난타',icon:'②',
  ctrl:['내 이름이 적힌 세로 칸','재료가 <b>화살표 칸</b>에 닿을 때 같은 방향키','콤보가 이어질수록 점수 UP'],
  gimmick:'<b>돌</b> — 돌은 누르지 마세요! 누르면 콤보 끊김',
  win:'60초 동안 개인 점수 1위! (4명 모두 같은 악보)',
  desc:'떨어지는 재료가 화살표에 닿을 때 같은 방향키로 썰기!<br>4명 모두 같은 악보 · 콤보가 이어질수록 점수 배율 UP · 45초',
  controls:{dir:'tap',a:false,label:'방향키 4개',hint:'<span class="kk">←</span><span class="kk">↑</span><span class="kk">→</span><span class="kk">↓</span> 썰기'},
  demoSkip:290,   /* 게임 설명: 열자마자 재료가 떨어지는 장면부터 */
  newSim:(s,c)=>new ChopSim(s,c),
  newView:()=>({N:null,J:[{},{},{},{}],myJ:{}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=chopChart(F.seed,F.start);pd.J=[{},{},{},{}];pd.myJ={};}},
  applyDelta(pd,S){(S.jn||[]).forEach((L,i)=>L.forEach(([n,q])=>{pd.J[i][n]=q;}));},
  /* 내 화면 기준 판정: 가까운 같은 방향 재료를 찾아 품질까지 정해서 보냄 */
  prep(e,S,me,pd){if(!e.tap||!S||!pd.N)return e;const J=pd.J[me],M=pd.myJ,done=n=>J[n]!=null||M[n]!=null;let best=-1,bd=99;   /* M = 내가 이미 누른 재료(화면에서 바로 사라지게) */
    pd.N.forEach((no,n)=>{if(done(n))return;const dt=Math.abs(no.T-S.f);if(dt<=CHOP.WIN[2]&&no.d===e.d&&dt<bd){bd=dt;best=n;}});
    M.d=e.d;M.df=S.f;   /* 내 요리사는 내 화면에서 바로 이동 */
    if(best>=0&&pd.N[best].b){M[best]=6;return{tap:1,pepper:1,n:best,d:e.d};}
    if(best>=0){const q=CHOP.WIN.findIndex(w=>bd<=w);M[best]=q;return{tap:1,n:best,q,d:e.d};}
    let wrong=-1;pd.N.forEach((no,n)=>{if(!done(n)&&!no.b&&Math.abs(no.T-S.f)<=CHOP.WIN[1]&&wrong<0)wrong=n;});
    if(wrong>=0){M[wrong]=3;return{tap:1,miss:1,n:wrong,d:e.d};}return{tap:1,mv:1,d:e.d};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:chopDraw});
