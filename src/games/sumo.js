/* ┌─────────────────────────────────────────────────────────
   │ ③ 쿵야 씨름 — 둥근 씨름판에서 부딪쳐 상대를 밖으로 밀어내기 (개인전 · 4명 난투)
   │ 방향키 이동 · A 돌진(1초 재사용) · 전체 60초 동안 판을 계속 반복 (판마다 12초부터 씨름판이 줄어듦)
   │ 판 승리 = 마지막까지 남은 한 명 · 전체 시간이 다 되면 그 판은 남은 쿵야 중 가운데에 가장 가까운 쿵야 승리
   │ 개인 점수: 상대를 떨어뜨림 +300 · 판 승리 +500 · 혼자 떨어짐 -50
   │ (예전 2:2 씨름을 개인전 · 비율 조정한 원본 그림(big_*) 1배 · 정수 좌표로 다시 만듦)
   └───────────────────────────────────────────────────────── */
/* 조절값: SEC 전체 시간 · SHRINK 판마다 줄어들기 시작(초)·줄어드는 시간(초) · LAST 남은 시간이 이보다 적으면 새 판 없이 끝 · R0 처음 씨름판 반지름 · R1 최소 · PR 몸 반지름 · ACC 가속 · FRIC 마찰 · MAX 최고 속도 · DASH 돌진 힘 · DCD 돌진 재사용(프레임) · SQ 화면 세로 눌림 */
const SUMO={SEC:60,SHRINK:[12,8],LAST:6,CX:240,CY:150,R0:124,R1:72,PR:17,ACC:.22,FRIC:.9,MAX:2.1,DASH:5.4,DCD:60,SQ:.6,KO:300,WIN:500,SELF:50,
  START:[[180,104],[300,104],[180,196],[300,196]]};
const SUMO_DX=[0,0,1,0,-1],SUMO_DY=[0,-1,0,1,0];
class SumoSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ko=[0,0,0,0];this.ev=[];this.done=false;this.wins=[0,0,0,0];this.r=0;this.dir=[0,0,0,0];this.tm=SUMO.SEC*60;this.round();}
  round(){this.ph='cd';this.t=this.r?180:300;this.rt=0;this.R=SUMO.R0;this.rw=-1;this.dir=[0,0,0,0];   /* 남은 전체 시간(tm)은 이어짐 · 첫 판 카운트다운 5초 · 2판부터 3초 */
    this.P=SUMO.START.map(([x,y],i)=>({x,y,vx:0,vy:0,fx:i%2?-1:1,fy:0,st:'in',t:0,dash:0,cd:0,last:-1,lt:-999,sq:0}));}
  input(i,e){if('d' in e)this.dir[i]=e.d;if(e.a&&this.ph==='play'){const p=this.P[i];if(p.st==='in'&&p.cd<=0){p.vx+=p.fx*SUMO.DASH;p.vy+=p.fy*SUMO.DASH;p.dash=14;p.cd=SUMO.DCD;this.ev.push('tap');}}}
  step(){this.f++;
    if(this.ph==='cd'){if(this.t%60===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0){if(this.tm<=SUMO.LAST*60)this.done=true;else{this.r++;this.round();}}return;}
    this.tm--;this.rt++;const s0=SUMO.SHRINK[0]*60;if(this.rt>s0)this.R=Math.max(SUMO.R1,SUMO.R0-(this.rt-s0)*(SUMO.R0-SUMO.R1)/(SUMO.SHRINK[1]*60));   // 판마다 12초부터 8초 동안 줄어듦
    this.P.forEach((p,i)=>{if(p.st!=='in')return;if(this.slots[i].bot)this.bot(i);const d=this.dir[i];
      if(d){p.vx+=SUMO_DX[d]*SUMO.ACC;p.vy+=SUMO_DY[d]*SUMO.ACC;p.fx=SUMO_DX[d];p.fy=SUMO_DY[d];}
      p.vx*=SUMO.FRIC;p.vy*=SUMO.FRIC;const sp=Math.hypot(p.vx,p.vy),mx=p.dash>0?9:SUMO.MAX;if(sp>mx){p.vx*=mx/sp;p.vy*=mx/sp;}
      p.x+=p.vx;p.y+=p.vy;if(p.dash>0)p.dash--;if(p.cd>0)p.cd--;if(p.sq>0)p.sq--;});
    // 부딪힘: 서로 밀어내고 속도를 주고받음 · 돌진 중이면 1.8배로 날려 버림 · 마지막으로 민 사람을 기억(KO 점수)
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){const A=this.P[a],B=this.P[b];if(A.st!=='in'||B.st!=='in')continue;let dx=B.x-A.x,dy=B.y-A.y,dd=Math.hypot(dx,dy)||.01;
      if(dd>=SUMO.PR*2)continue;const nx=dx/dd,ny=dy/dd,ov=SUMO.PR*2-dd;A.x-=nx*ov/2;A.y-=ny*ov/2;B.x+=nx*ov/2;B.y+=ny*ov/2;
      const rv=(A.vx-B.vx)*nx+(A.vy-B.vy)*ny;if(rv<=0)continue;const ka=B.dash>0?1.8:1,kb=A.dash>0?1.8:1,imp=rv*1.15;
      A.vx-=nx*imp*ka;A.vy-=ny*imp*ka;B.vx+=nx*imp*kb;B.vy+=ny*imp*kb;A.sq=B.sq=8;A.last=b;A.lt=this.f;B.last=a;B.lt=this.f;
      const pow=rv*Math.max(ka,kb);this.ev.push(pow>3?'big':'hit',`shake:${Math.min(8,Math.round(pow*1.5))}@${a},${b}`);}   /* 부딪힌 두 사람 화면만 흔들림 */
    // 씨름판 밖으로
    this.P.forEach((p,i)=>{if(p.st==='in'&&Math.hypot(p.x-SUMO.CX,p.y-SUMO.CY)>this.R+4){p.st='fall';p.t=40;this.ev.push('ouch',`shake:6@${i}`);   /* 떨어진 사람 화면만 */
        if(p.last>=0&&this.f-p.lt<150){this.ps[p.last]+=SUMO.KO;this.ko[p.last]++;}else this.ps[i]=Math.max(0,this.ps[i]-SUMO.SELF);}
      if(p.st==='fall'){p.x+=p.vx*.5;p.y+=p.vy*.5;if(--p.t<=0)p.st='out';}});
    const alive=[0,1,2,3].filter(i=>this.P[i].st==='in');
    if(alive.length<=1)this.endRound(alive.length?alive[0]:-1);
    else if(this.tm<=0)this.endRound(alive.sort((a,b)=>Math.hypot(this.P[a].x-SUMO.CX,this.P[a].y-SUMO.CY)-Math.hypot(this.P[b].x-SUMO.CX,this.P[b].y-SUMO.CY))[0]);}   /* 시간 끝: 가운데에 가장 가까운 쿵야 */
  endRound(w){this.ph='end';this.t=160;this.rw=w;if(w>=0){this.wins[w]++;this.ps[w]+=SUMO.WIN;}this.ev.push('win');}
  /* AI: 가장 가까운 상대에게 다가가 가까우면 돌진 · 가장자리면 가운데로 돌아옴 */
  bot(i){const p=this.P[i],foes=this.P.map((q,k)=>({q,k})).filter(o=>o.k!==i&&o.q.st==='in');if(!foes.length){this.dir[i]=0;return;}
    const dc=Math.hypot(p.x-SUMO.CX,p.y-SUMO.CY),toward=(tx,ty)=>Math.abs(tx-p.x)>Math.abs(ty-p.y)?(tx>p.x?2:4):(ty>p.y?3:1);let tx,ty;
    if(dc>this.R-24){tx=SUMO.CX;ty=SUMO.CY;}else{const o=foes.sort((a,b)=>Math.hypot(a.q.x-p.x,a.q.y-p.y)-Math.hypot(b.q.x-p.x,b.q.y-p.y))[0].q;tx=o.x;ty=o.y;
      if(Math.hypot(tx-p.x,ty-p.y)<50&&p.cd<=0&&Math.random()<.07){this.dir[i]=toward(tx,ty);p.fx=SUMO_DX[this.dir[i]];p.fy=SUMO_DY[this.dir[i]];this.input(i,{a:1});return;}}
    if(this.f%8===i*2)this.dir[i]=toward(tx,ty);}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,r:this.r,R:this.R,ps:this.ps,wins:this.wins,rw:this.rw,
    P:this.P.map(p=>[Math.round(p.x*2)/2,Math.round(p.y*2)/2,p.st,p.t,p.dash,p.sq,p.fx,p.cd]),tag:this.ko.map((k,i)=>[this.wins[i]?`${this.wins[i]}승`:'',k?`KO ${k}`:''].filter(Boolean).join(' · '))};}
  result(){return{ps:this.ps,lines:[0,1,2,3].map(i=>`판 승리 ${this.wins[i]}회 · KO ${this.ko[i]}`)};}
}
/* 픽셀 타원 (회전·안티앨리어싱 없이 줄 단위 사각형으로) */
function pxEllipse(cx,cy,rx,ry,col){for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y/ry)*(y/ry))));R(cx-w,cy+y,w*2,1,col);}}
function sumoDraw(g,S,pd,me,f){const C=SUMO,cx=C.CX,cy=C.CY,sq=C.SQ;
  R(0,0,480,270,MAP.mint);for(let y=0;y<270;y+=16)for(let x=(y/16)%2?16:0;x<480;x+=32)R(x,y,16,16,MAP.green);   // 바닥: 민트 · 연두 바둑판
  pxEllipse(cx,cy+4,C.R0+14,Math.round((C.R0+14)*sq),MAP.ink);pxEllipse(cx,cy+3,C.R0+12,Math.round((C.R0+12)*sq),MAP.shade);   // 바깥 흙
  pxEllipse(cx,cy,C.R0+6,Math.round((C.R0+6)*sq),MAP.cream);
  const r=Math.round(S.R),ry=Math.round(S.R*sq);pxEllipse(cx,cy,r+2,ry+2,MAP.blue);pxEllipse(cx,cy,r-2,ry-2,MAP.cream);   // 줄어드는 경계 (파랑 4도트 띠)
  if(S.R<C.R0&&(f&8)){pxEllipse(cx,cy,r+5,ry+4,'rgba(255,90,90,.35)');pxEllipse(cx,cy,r+2,ry+2,MAP.blue);pxEllipse(cx,cy,r-2,ry-2,MAP.cream);}
  R(cx-34,cy-1,12,2,MAP.yellow);R(cx+22,cy-1,12,2,MAP.yellow);
  const ord=[0,1,2,3].sort((a,b)=>S.P[a][1]-S.P[b][1]);
  for(const i of ord){const[x,y,st,t,dash,sq2,fx,cd]=S.P[i];if(st==='out')continue;const X=Math.round(x),py=Math.round(cy+(y-cy)*sq);
    if(st==='in'){if(i===me){pxEllipse(X,py+1,20,6,MAP.ink);pxEllipse(X,py+1,19,5,MAP.yellow);pxEllipse(X,py+1,16,3,MAP.cream);}pxEllipse(X,py+1,15,3,'rgba(42,58,72,.25)');}   /* 내 쿵야: 발밑 노란 고리 */
    if(dash>0)for(let k=1;k<4;k++)koong(i,X-fx*k*7,py,{a:.25,flip:fx<0});   // 돌진 잔상
    if(st==='fall'){if((t>>2)&1)koong(i,X,py+Math.round((40-t)*.6),{flip:fx<0,tint:'#ffffff'});continue;}   // 떨어짐: 하얗게 깜빡이며 내려감 (회전·축소 없이)
    koong(i,X,py+(sq2>4?1:0),{flip:fx<0});   // 부딪치면 1도트 눌림
    R(X-11,py+3,22,4,MAP.ink);R(X-10,py+4,Math.round(20*(1-cd/C.DCD)),2,cd>0?MAP.blue:MAP.yellow);   // 돌진 게이지
    const{h}=koongSize(i);if(i===me){meMark(X,py-h-12);txt('YOU',X,py-h-24,MAP.yellow,'center',8);}K(GAME.slots[i]?GAME.slots[i].name.slice(0,6):'',X,py+8,PCOL[i],'center',8);}
  // 위쪽: 1P~4P 판 승리 수 · 가운데 남은 시간
  for(let i=0;i<4;i++){const bx=i<2?6+i*100:280+(i-2)*100;R(bx,3,94,20,MAP.ink);R(bx+2,5,6,16,PCOL[i]);K(GAME.slots[i]?GAME.slots[i].name.slice(0,3):'',bx+11,5,'#fff','left',8);
    K(`${S.wins[i]}승`,bx+90,5,S.wins[i]?MAP.yellow:'#8a9aa8','right',8);}
  const sec=Math.max(0,Math.ceil(S.tm/60));R(206,3,68,20,MAP.ink);txt(`R${S.r+1} ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`,240,5,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',10);
  if(S.R<C.R0&&S.ph==='play')K('씨름판이 줄어들어요!',240,252,'#ff5a5a','center',10);
  if(S.ph==='cd')banner([[`ROUND ${S.r+1} · 쿵야 씨름`,MAP.yellow,16],['방향키로 움직이고 A로 돌진! 밖으로 밀어내기','#fff',10],[Math.max(1,Math.ceil(S.t/60)),'#fff',24,false]],240,72);
  if(S.ph==='end'){const w=S.rw,nm=w<0?'무승부!':`${GAME.slots[w]?GAME.slots[w].name:''} 승리!`,col=w<0?'#fff':PCOL[w];
    banner(S.tm<=SUMO.LAST*60?[['Time Out!','#fff419',24,false],[`이번 판 ${nm}`,col,11]]:[[nm,col,16],['다음 판 준비…','#fff',11]],240,72);}}   /* 마지막 판이 끝나면 Time Out! */
regGame({id:'sumo',title:'쿵야 씨름',icon:'③',
  ctrl:['방향키로 이동','A 버튼으로 돌진 (1초마다 한 번)','부딪쳐서 다른 쿵야를 씨름판 밖으로!'],
  gimmick:'<b>줄어드는 씨름판</b> — 판마다 12초부터 씨름판이 점점 작아져요',
  win:'60초 동안 4명 난투를 계속! 마지막까지 남으면 판 승리 +500 · 밀어내면 +300 · 개인 점수 1위',
  desc:'방향키로 움직이고 A로 돌진! 다른 쿵야를 씨름판 밖으로 밀어내세요<br>개인전 · 60초 동안 판 반복 · 판마다 씨름판이 점점 줄어들어요',
  controls:{dir:'hold',a:true,label:'방향키 + A 버튼',hint:'<span class="kk">↑</span><span class="kk">↓</span><span class="kk">←</span><span class="kk">→</span> 이동 · <span class="kk">Z</span><span class="kk">Space</span> 돌진'},
  newSim:(s,c)=>new SumoSim(s,c),
  lerp(a,b,k){return{...b,P:b.P.map((p,i)=>{const q=a.P[i]||p;return[q[0]+(p[0]-q[0])*k,q[1]+(p[1]-q[1])*k,...p.slice(2)];})};},
  draw:sumoDraw});
