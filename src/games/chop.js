/* ┌─────────────────────────────────────────────────────────
   │ ④ 쿵야 주방 난타 — 떨어지는 재료에 맞춰 같은 방향키를 눌러 썰기 (리듬 게임)
   │ 4명 모두 같은 악보 · PERFECT 100 · GREAT 60 · GOOD 30 · 콤보 10마다 배율 +0.5 (최대 3배) · 45초
   │ 판정은 각자 기기 화면 기준(prep)으로 하고, 방장은 점수만 합산합니다.
   └───────────────────────────────────────────────────────── */
const KITEM=['kc_carrot','kc_tofu','kc_tomato'];   /* 주방 재료 리소스 20x20 (당근 · 두부 · 토마토) */
const CHOP={PEPPER:.13,PEPPER_FROM:6,   /* 기믹: 6초 뒤부터 재료의 13%가 매운 고추 — 누르면 콤보 끊김 · -50 */
  SEC:45,FALL:80,HITY:212,TOPY:46,WIN:[4,8,12],PTS:[100,60,30],QN:['PERFECT','GREAT','GOOD'],QC:['#fff419','#58d838','#00ccf3'],DIRS:['','↑','→','↓','←']};
function chopRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function chopChart(seed,start){const r=chopRng(seed),N=[];let t=start+60;const end=start+CHOP.SEC*60-60;
  while(t<end){const p=(t-start)/(CHOP.SEC*60),gap=Math.round(30-10*p),d=1+Math.floor(r()*4),hot=r()<CHOP.PEPPER&&t-start>CHOP.PEPPER_FROM*60;N.push({T:t,d,b:hot?1:0});
    if(r()<.18+.15*p&&t+gap/2<end)N.push({T:t+Math.round(gap/2),d:1+Math.floor(r()*4),b:0});t+=gap;}return N;}
class ChopSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.sc=[0,0];this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=150;this.tm=CHOP.SEC*60;
    this.seed=(Math.random()*1e9)|0;this.start=150;this.N=chopChart(this.seed,this.start);this.J=[{},{},{},{}];this.combo=[0,0,0,0];this.best=[0,0,0,0];this.fxs=[];this.jn=[[],[],[],[]];this.bq=[[],[],[],[]];}
  get pd(){return{N:this.N,J:this.J,myJ:this.myJ||(this.myJ={})};}
  mult(c){return Math.min(3,1+Math.floor(c/10)*.5);}
  input(i,e){if(this.ph!=='play'||!e.tap)return;const J=this.J[i];
    if(e.pepper){const n=e.n;if(n!=null&&this.N[n]&&this.N[n].b&&J[n]==null){J[n]=6;this.jn[i].push([n,6]);this.combo[i]=0;this.ps[i]=Math.max(0,this.ps[i]-50);this.sc[teamOf(i)]=Math.max(0,this.sc[teamOf(i)]-50);this.fxs.push([i,3,this.f,this.N[n].d]);this.ev.push('ouch','shake:2');}return;}
    if(e.miss){if(e.n!=null&&this.N[e.n]&&J[e.n]==null){J[e.n]=3;this.jn[i].push([e.n,3]);}this.combo[i]=0;return;}
    const n=e.n;if(n==null||!this.N[n]||this.N[n].b||J[n]!=null||Math.abs(this.N[n].T-this.f)>45)return;const q=clamp(e.q|0,0,2);
    J[n]=q;this.jn[i].push([n,q]);this.combo[i]++;this.best[i]=Math.max(this.best[i],this.combo[i]);const pts=Math.round(CHOP.PTS[q]*this.mult(this.combo[i]));
    this.ps[i]+=pts;this.sc[teamOf(i)]+=pts;this.fxs.push([i,q,this.f,this.N[n].d,n]);this.ev.push(q===0?'hit':'tap');if(q===0&&this.combo[i]%10===0)this.ev.push('shake:3','combo');}
  step(){this.f++;this.fxs=this.fxs.filter(x=>this.f-x[2]<16);
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}}
    else if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(this.ph==='play'&&--this.tm<=0){this.ph='end';this.t=150;this.ev.push('win','shake:5');return;}
    // 시간 지난 음표는 놓친 것으로 (인터넷 지연 여유 40프레임)
    this.N.forEach((no,n)=>{if(this.f-no.T===40)for(let i=0;i<4;i++)if(this.J[i][n]==null){if(no.b){this.J[i][n]=5;this.jn[i].push([n,5]);continue;}this.J[i][n]=3;this.jn[i].push([n,3]);this.combo[i]=0;}});   /* 고추는 안 눌러야 정답 */
    this.slots.forEach((s,i)=>{if(!s.bot)return;this.N.forEach((no,n)=>{if(no.T-this.f===18&&this.J[i][n]==null){if(no.b){if(Math.random()<.1)this.bq[i].push([no.T,n,-1]);return;}const off=Math.round((Math.random()*2-1)*(i===1?9:13));this.bq[i].push([no.T+off,n,Math.abs(off)]);}});
      this.bq[i]=this.bq[i].filter(([at,n,dt])=>{if(this.f<at)return true;if(dt<0){this.input(i,{tap:1,pepper:1,n});return false;}const q=CHOP.WIN.findIndex(w=>dt<=w);if(q>=0)this.input(i,{tap:1,n,q});return false;});});}
  snap(send){const jn=this.jn;if(send)this.jn=[[],[],[],[]];return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,sc:this.sc,ps:this.ps,combo:this.combo,fxs:this.fxs,jn:send?jn:[],tag:this.combo.map(c=>c?`콤보 ${c}`:'')};}
  full(){return{seed:this.seed,start:this.start};}
  result(){return{sc:this.sc,ps:this.ps,lines:[0,1].map(t=>`최고 콤보 ${Math.max(...this.best.filter((b,i)=>teamOf(i)===t))}`)};}
}
const chopX=i=>8+i*118;
function chopDraw(g,S,pd,me,f){R(0,0,480,270,MAP.cream);
  for(let i=0;i<4;i++){const x=chopX(i),t=teamOf(i);R(x,0,110,270,i===me?MAP.hi:MAP.green);R(x,0,110,4,TEAM[t].col);R(x,4,110,1,MAP.ink);R(x+109,0,1,270,MAP.shade);
    K(GAME.slots[i]?GAME.slots[i].name.slice(0,8):'',x+55,8,TEAM[t].col,'center',8);
    for(let d=1;d<=4;d++){const lx=x+8+(d-1)*24;R(lx+9,CHOP.TOPY,2,CHOP.HITY-CHOP.TOPY,MAP.shade);}
    R(x+4,CHOP.HITY+12,102,26,MAP.mint);R(x+4,CHOP.HITY+12,102,3,'#fff');R(x+4,CHOP.HITY+36,102,2,MAP.blue);   // 도마 (민트)
    for(let d=1;d<=4;d++){const lx=x+8+(d-1)*24;R(lx-1,CHOP.HITY-11,22,22,MAP.blue);R(lx,CHOP.HITY-10,20,20,MAP.cream);K(CHOP.DIRS[d],lx+10,CHOP.HITY-6,MAP.blue,'center',9);   /* 판정 칸 (재료 크기 20)*/}
    const c=S.combo[i];if(c>=2)K(`${c} COMBO`,x+55,24,c>=30?'#fff419':'#fff','center',c>=30?11:9);}
  // 떨어지는 재료
  if(pd.N)for(let n=0;n<pd.N.length;n++){const no=pd.N[n],dt=no.T-S.f;if(dt>CHOP.FALL||dt<-14)continue;const y=CHOP.HITY-dt/CHOP.FALL*(CHOP.HITY-CHOP.TOPY);
    for(let i=0;i<4;i++){if(pd.J[i]&&pd.J[i][n]!=null||i===me&&pd.myJ&&pd.myJ[n]!=null)continue;const lx=chopX(i)+8+(no.d-1)*24,im=IMG[KITEM[n%3]];
      if(no.b){const yy=Math.round(y)-9,X=lx+3;R(X+6,yy,4,3,'#3a8a28');R(X+7,yy-2,2,2,'#3a8a28');R(X+3,yy+3,10,9,'#e83a2a');R(X+4,yy+12,8,3,'#e83a2a');R(X+6,yy+15,4,2,'#c82a1a');R(X+4,yy+4,2,4,'#ff9a8a');continue;}   /* 매운 고추 (도트) */
      if(im&&im.complete)g.drawImage(im,lx,Math.round(y)-10);else R(lx,Math.round(y)-10,20,20,'#e8a040');}}
  // 썰기 효과: 칼 + 반으로 갈라져 튀는 재료
  for(const[i,q,at,d,nn]of S.fxs){if(q===3){const k=S.f-at;K('매워! 콤보 끊김',chopX(i)+55,CHOP.HITY-44-k,'#ff5a5a','center',10);R(chopX(i)+8+(d-1)*24+2-k,CHOP.HITY-6,4,4,'#e83a2a');R(chopX(i)+8+(d-1)*24+14+k,CHOP.HITY-6,4,4,'#e83a2a');continue;}const k=S.f-at,lx=chopX(i)+8+(d-1)*24,im=IMG[KITEM[(nn!=null?nn:at)%3]];
    R(lx+2,CHOP.HITY-30+Math.min(k,4)*5,16,3,MAP.ink);R(lx+3,CHOP.HITY-29+Math.min(k,4)*5,14,1,'#e8ecf4');R(lx+16,CHOP.HITY-32+Math.min(k,4)*5,4,6,'#6a4028');
    if(im&&im.complete){const yy=Math.round(CHOP.HITY-6-k*1.2+k*k*.08),dx=Math.round(k*1.6);g.drawImage(im,0,0,10,20,lx-dx,yy-4,10,20);g.drawImage(im,10,0,10,20,lx+10+dx,yy-4,10,20);}   /* 4K: 정수 좌표 */
    if(k<12)K(CHOP.QN[q],chopX(i)+55,CHOP.HITY-44-k,CHOP.QC[q],'center',q===0?12:10);}
  /* 레인 아래 요리사 쿵야: 썰 때마다 팔을 휘두르고 1도트 숙임, 평소엔 숨쉬기 (남은 시간은 오른쪽 점수표에 표시) */
  for(let i=0;i<4;i++){const hit=S.fxs.some(x=>x[0]===i&&S.f-x[2]<8),bob=hit?1:(((f>>5)+i)%2?-1:0);koong(i,chopX(i)+18,268+bob,{s:1,fr:hit?3:0});}
  if(me>=0)meMark(chopX(me)+55,CHOP.HITY+42);
  if(S.ph==='cd'){R(90,90,300,74,'rgba(42,58,72,.88)');K('주방 난타!',240,98,'#fff419','center',16);K('재료가 선에 닿을 때 같은 방향키!',240,122,'#fff','center',11);txt(String(Math.max(1,Math.ceil(S.t/50))),240,142,'#fff','center',14);}
  if(S.ph==='end'){R(100,100,280,44,'rgba(42,58,72,.88)');K('그만! 영업 종료',240,112,'#fff419','center',16);}}
regGame({id:'chop',title:'쿵야 주방 난타',icon:'④',
  ctrl:['내 이름이 적힌 레인','재료가 <b>화살표 칸</b>에 닿을 때 같은 방향키','콤보가 이어질수록 점수 UP'],
  gimmick:'<b>매운 고추</b> — 고추는 누르지 마세요! 누르면 콤보 끊김',
  win:'45초 동안 팀 점수가 높은 팀!',
  desc:'떨어지는 재료가 선에 닿을 때 같은 방향키로 썰기!<br>4명 모두 같은 악보 · 콤보가 이어질수록 점수 배율 UP · 45초',
  controls:{dir:'tap',a:false,label:'방향키 4개',hint:'<span class="kk">↑</span><span class="kk">→</span><span class="kk">↓</span><span class="kk">←</span> 재료가 선에 닿을 때 같은 방향!'},
  newSim:(s,c)=>new ChopSim(s,c),
  newView:()=>({N:null,J:[{},{},{},{}],myJ:{}}),
  full:true,
  applyFull(pd,F){if(F){pd.N=chopChart(F.seed,F.start);pd.J=[{},{},{},{}];pd.myJ={};}},
  applyDelta(pd,S){(S.jn||[]).forEach((L,i)=>L.forEach(([n,q])=>{pd.J[i][n]=q;}));},
  /* 내 화면 기준 판정: 가까운 같은 방향 재료를 찾아 품질까지 정해서 보냄 */
  prep(e,S,me,pd){if(!e.tap||!S||!pd.N)return e;const J=pd.J[me],M=pd.myJ,done=n=>J[n]!=null||M[n]!=null;let best=-1,bd=99;   /* M = 내가 이미 누른 재료(화면에서 바로 사라지게) */
    pd.N.forEach((no,n)=>{if(done(n))return;const dt=Math.abs(no.T-S.f);if(dt<=CHOP.WIN[2]&&no.d===e.d&&dt<bd){bd=dt;best=n;}});
    if(best>=0&&pd.N[best].b){M[best]=6;return{tap:1,pepper:1,n:best};}
    if(best>=0){const q=CHOP.WIN.findIndex(w=>bd<=w);M[best]=q;return{tap:1,n:best,q};}
    let wrong=-1;pd.N.forEach((no,n)=>{if(!done(n)&&!no.b&&Math.abs(no.T-S.f)<=CHOP.WIN[1]&&wrong<0)wrong=n;});
    if(wrong>=0){M[wrong]=3;return{tap:1,miss:1,n:wrong};}return null;},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:chopDraw});
