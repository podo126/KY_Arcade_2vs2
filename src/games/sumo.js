/* ┌─────────────────────────────────────────────────────────
   │ ③ 쿵야 씨름 — 둥근 씨름판에서 부딪쳐 상대를 밖으로 밀어내기 (개인전 · 4명 난투)
   │ 방향키 이동 · A 돌진(1초 재사용) · 60초 동안 한 판 (12초부터 씨름판이 줄어듦)
   │ 승리 = 마지막까지 남은 한 명 · 시간이 다 되면 남은 쿵야 중 가운데에 가장 가까운 쿵야 승리
   │ 기믹 아이템: 씨름판 안에 랜덤으로 떨어짐 → 먹으면 발동 (넉백 강화 · 상대 화면 반전 · 씨름판 축소 가속)
   │ 개인 점수: 상대를 떨어뜨림 +300 · 판 승리 +500 · 혼자 떨어짐 -50
   │ (예전 2:2 씨름을 개인전 · 비율 조정한 원본 그림(big_*) 1배 · 정수 좌표로 다시 만듦)
   └───────────────────────────────────────────────────────── */
/* 조절값: SEC 시간 · SHRINK 줄어들기 시작(초)·줄어드는 시간(초) · R0 처음 씨름판 반지름 · R1 최소 · PR 몸 반지름 · ACC 가속 · FRIC 마찰 · MAX 최고 속도 · DASH 돌진 힘 · DCD 돌진 재사용(프레임) · SQ 화면 세로 눌림 */
const SUMO={SEC:60,SHRINK:[12,8],CX:240,CY:150,R0:138,R1:72,PR:17,ACC:.22,FRIC:.9,MAX:2.1,DASH:5.4,DCD:60,SQ:.6,KO:300,WIN:500,SELF:50,
  START:[[172,100],[308,100],[172,200],[308,200]]};
/* 기믹 아이템: FIRST 첫 등장(초) · EVERY 등장 간격(초, ±1) · LIFE 바닥에 남는 시간(초) · MAX 동시에 최대 · 효과 시간(초) PW 넉백 강화 · FLIP 화면 반전 · FAST 축소 가속 · PICK 먹는 거리
   종류 0 넉백 강화(먹은 쿵야가 부딪치면 2배로 날림) · 1 화면 반전(먹은 쿵야를 뺀 모두의 화면이 좌우/상하로 뒤집힘) · 2 축소 가속(바로 줄어들기 시작 + 2.5배 빠르게) */
const SITEM={FIRST:6,EVERY:6,LIFE:9,MAX:2,PW:6,FLIP:5,FAST:4,PICK:24,NAME:['넉백 UP','화면 반전','링 축소'],COL:['#ff5a5a','#a070ff','#ff9a30'],
  ICON:[['....X..','...XX..','..XX...','.XXXXX.','...XX..','..XX...','..X....'],['.X.....','XXXXXX.','.X.....','.......','.....X.','.XXXXXX','.....X.'],['..XXX..','.X...X.','X..X..X','X.XXX.X','X..X..X','.X...X.','..XXX..']]};
const SUMO_DX=[0,0,1,0,-1],SUMO_DY=[0,-1,0,1,0];
class SumoSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.ps=[0,0,0,0];this.ko=[0,0,0,0];this.ev=[];this.done=false;this.dir=[0,0,0,0];this.tm=SUMO.SEC*60;this.round();}
  round(){this.ph='cd';this.t=180;this.rt=0;this.R=SUMO.R0;this.rw=-1;this.dir=[0,0,0,0];   /* 카운트다운 3초 · 한 판 */
    this.P=SUMO.START.map(([x,y],i)=>({x,y,vx:0,vy:0,fx:i%2?-1:1,fy:0,st:'in',t:0,dash:0,cd:0,last:-1,lt:-999,sq:0,pw:0}));
    this.it=[];this.nextIt=SITEM.FIRST*60;this.flip=null;this.fast=0;this.pop=[];}
  /* 아이템: 씨름판 안 빈 곳에 떨어뜨림 · 먹으면 발동 */
  items(){const I=SITEM;this.it=this.it.filter(o=>++o.a<I.LIFE*60);
    if(--this.nextIt<=0){this.nextIt=(I.EVERY-1+Math.random()*2)*60;
      if(this.it.length<I.MAX)for(let k=0;k<12;k++){const an=Math.random()*6.283,d=Math.sqrt(Math.random())*this.R*.7,x=SUMO.CX+Math.cos(an)*d,y=SUMO.CY+Math.sin(an)*d;
        if(this.P.every(p=>p.st!=='in'||Math.hypot(p.x-x,p.y-y)>40)){this.it.push({x,y,k:Math.floor(Math.random()*3),a:0});this.ev.push('tap');break;}}}
    this.it=this.it.filter(o=>{const i=this.P.findIndex(p=>p.st==='in'&&Math.hypot(p.x-o.x,p.y-o.y)<I.PICK);if(i<0)return true;
      if(o.k===0)this.P[i].pw=I.PW*60;else if(o.k===1)this.flip={by:i,t:I.FLIP*60,ax:Math.random()<.5?0:1};else this.fast=I.FAST*60;
      this.pop.push([i,o.k,this.f]);this.ev.push('combo');return false;});
    this.pop=this.pop.filter(x=>this.f-x[2]<60);if(this.flip&&--this.flip.t<=0)this.flip=null;}
  input(i,e){if('d' in e)this.dir[i]=e.d;if(e.a&&this.ph==='play'){const p=this.P[i];if(p.st==='in'&&p.cd<=0){p.vx+=p.fx*SUMO.DASH;p.vy+=p.fy*SUMO.DASH;p.dash=14;p.cd=SUMO.DCD;this.ev.push('tap');}}}
  step(){this.f++;
    if(this.ph==='cd'){if(this.t%60===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    this.tm--;this.rt++;const sp0=(SUMO.R0-SUMO.R1)/(SUMO.SHRINK[1]*60);   // 12초부터 8초 동안 줄어듦 · 축소 가속 중이면 바로 + 2.5배
    if(this.fast>0){this.fast--;this.R-=sp0*2.5;}else if(this.rt>SUMO.SHRINK[0]*60)this.R-=sp0;this.R=Math.max(SUMO.R1,this.R);
    this.items();
    this.P.forEach((p,i)=>{if(p.st!=='in')return;if(this.slots[i].bot)this.bot(i);const d=this.dir[i];
      if(d){p.vx+=SUMO_DX[d]*SUMO.ACC;p.vy+=SUMO_DY[d]*SUMO.ACC;p.fx=SUMO_DX[d];p.fy=SUMO_DY[d];}
      p.vx*=SUMO.FRIC;p.vy*=SUMO.FRIC;const sp=Math.hypot(p.vx,p.vy),mx=p.dash>0?9:SUMO.MAX;if(sp>mx){p.vx*=mx/sp;p.vy*=mx/sp;}
      p.x+=p.vx;p.y+=p.vy;if(p.dash>0)p.dash--;if(p.cd>0)p.cd--;if(p.sq>0)p.sq--;if(p.pw>0)p.pw--;});
    // 부딪힘: 서로 밀어내고 속도를 주고받음 · 돌진 중이면 1.8배로 날려 버림 · 마지막으로 민 사람을 기억(KO 점수)
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){const A=this.P[a],B=this.P[b];if(A.st!=='in'||B.st!=='in')continue;let dx=B.x-A.x,dy=B.y-A.y,dd=Math.hypot(dx,dy)||.01;
      if(dd>=SUMO.PR*2)continue;const nx=dx/dd,ny=dy/dd,ov=SUMO.PR*2-dd;A.x-=nx*ov/2;A.y-=ny*ov/2;B.x+=nx*ov/2;B.y+=ny*ov/2;
      const rv=(A.vx-B.vx)*nx+(A.vy-B.vy)*ny;if(rv<=0)continue;const ka=(B.dash>0?1.8:1)*(B.pw>0?2:1),kb=(A.dash>0?1.8:1)*(A.pw>0?2:1),imp=rv*1.15;
      A.vx-=nx*imp*ka;A.vy-=ny*imp*ka;B.vx+=nx*imp*kb;B.vy+=ny*imp*kb;A.sq=B.sq=8;A.last=b;A.lt=this.f;B.last=a;B.lt=this.f;
      const pow=rv*Math.max(ka,kb);this.ev.push(pow>3?'big':'hit',`shake:${Math.min(8,Math.round(pow*1.5))}@${a},${b}`);}   /* 부딪힌 두 사람 화면만 흔들림 */
    // 씨름판 밖으로
    this.P.forEach((p,i)=>{if(p.st==='in'&&Math.hypot(p.x-SUMO.CX,p.y-SUMO.CY)>this.R+4){p.st='fall';p.t=40;this.ev.push('ouch',`shake:6@${i}`);   /* 떨어진 사람 화면만 */
        if(p.last>=0&&this.f-p.lt<150){this.ps[p.last]+=SUMO.KO;this.ko[p.last]++;}else this.ps[i]=Math.max(0,this.ps[i]-SUMO.SELF);}
      if(p.st==='fall'){p.x+=p.vx*.5;p.y+=p.vy*.5;if(--p.t<=0)p.st='out';}});
    const alive=[0,1,2,3].filter(i=>this.P[i].st==='in');
    if(alive.length<=1)this.endRound(alive.length?alive[0]:-1);
    else if(this.tm<=0)this.endRound(alive.sort((a,b)=>Math.hypot(this.P[a].x-SUMO.CX,this.P[a].y-SUMO.CY)-Math.hypot(this.P[b].x-SUMO.CX,this.P[b].y-SUMO.CY))[0]);}   /* 시간 끝: 가운데에 가장 가까운 쿵야 */
  endRound(w){this.ph='end';this.t=160;this.rw=w;this.flip=null;if(w>=0)this.ps[w]+=SUMO.WIN;this.ev.push('win');}
  /* AI: 가장 가까운 상대에게 다가가 가까우면 돌진 · 가장자리면 가운데로 돌아옴 */
  bot(i){const p=this.P[i],foes=this.P.map((q,k)=>({q,k})).filter(o=>o.k!==i&&o.q.st==='in');if(!foes.length){this.dir[i]=0;return;}
    const dc=Math.hypot(p.x-SUMO.CX,p.y-SUMO.CY),toward=(tx,ty)=>Math.abs(tx-p.x)>Math.abs(ty-p.y)?(tx>p.x?2:4):(ty>p.y?3:1);let tx,ty;
    if(dc>this.R-24){tx=SUMO.CX;ty=SUMO.CY;}else{const o=foes.sort((a,b)=>Math.hypot(a.q.x-p.x,a.q.y-p.y)-Math.hypot(b.q.x-p.x,b.q.y-p.y))[0].q;tx=o.x;ty=o.y;
      if(Math.hypot(tx-p.x,ty-p.y)<50&&p.cd<=0&&Math.random()<.07){this.dir[i]=toward(tx,ty);p.fx=SUMO_DX[this.dir[i]];p.fy=SUMO_DY[this.dir[i]];this.input(i,{a:1});return;}}
    if(this.f%8===i*2)this.dir[i]=toward(tx,ty);}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,R:this.R,ps:this.ps,rw:this.rw,fast:this.fast,
    P:this.P.map(p=>[Math.round(p.x*2)/2,Math.round(p.y*2)/2,p.st,p.t,p.dash,p.sq,p.fx,p.cd,p.pw]),it:this.it.map(o=>[Math.round(o.x),Math.round(o.y),o.k,o.a]),
    flip:this.flip&&[this.flip.by,this.flip.ax,this.flip.t],pop:this.pop,tag:this.ko.map(k=>k?`KO ${k}`:'')};}
  result(){return{ps:this.ps,lines:[0,1,2,3].map(i=>`${this.rw===i?'승리 · ':''}KO ${this.ko[i]}`)};}
}
/* 픽셀 타원 (회전·안티앨리어싱 없이 줄 단위 사각형으로) */
function pxEllipse(cx,cy,rx,ry,col){for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y/ry)*(y/ry))));R(cx-w,cy+y,w*2,1,col);}}
function sumoIcon(x,y,k,f,a){const I=SITEM,bob=(f>>4)&1;if(a>(I.LIFE-2)*60&&(f&4))return;y-=bob;   /* 기믹 아이템 아이콘 · 사라지기 2초 전부터 깜빡임 */
  pxEllipse(x,y+9,6,2,'rgba(42,58,72,.25)');pxEllipse(x,y,8,8,MAP.ink);pxEllipse(x,y,7,7,I.COL[k]);R(x-4,y-6,6,1,'rgba(255,255,255,.5)');
  I.ICON[k].forEach((row,yy)=>{for(let xx=0;xx<7;xx++)if(row[xx]==='X')R(x-3+xx,y-3+yy,1,1,'#fff');});}
function sumoDraw(g,S,pd,me,f){const C=SUMO,cx=C.CX,cy=C.CY,sq=C.SQ;
  const fl=S.flip&&S.flip[0]!==me&&S.ph==='play';   /* 화면 반전: 아이템을 먹은 쿵야를 뺀 모두의 화면 (위쪽 띠 · 글자는 그대로) */
  if(fl){g.save();if(S.flip[1]){g.translate(0,270);g.scale(1,-1);}else{g.translate(480,0);g.scale(-1,1);}}
  R(0,0,480,270,MAP.mint);for(let y=0;y<270;y+=16)for(let x=(y/16)%2?16:0;x<480;x+=32)R(x,y,16,16,MAP.green);   // 바닥: 민트 · 연두 바둑판
  pxEllipse(cx,cy+4,C.R0+14,Math.round((C.R0+14)*sq),MAP.ink);pxEllipse(cx,cy+3,C.R0+12,Math.round((C.R0+12)*sq),MAP.shade);   // 바깥 흙
  pxEllipse(cx,cy,C.R0+6,Math.round((C.R0+6)*sq),MAP.cream);
  const r=Math.round(S.R),ry=Math.round(S.R*sq),warn=S.fast>0?(f&4):(S.R<C.R0&&(f&8));pxEllipse(cx,cy,r+2,ry+2,MAP.blue);pxEllipse(cx,cy,r-2,ry-2,MAP.cream);   // 줄어드는 경계 (파랑 4도트 띠)
  if(warn){pxEllipse(cx,cy,r+5,ry+4,'rgba(255,90,90,.35)');pxEllipse(cx,cy,r+2,ry+2,S.fast>0?'#ff9a30':MAP.blue);pxEllipse(cx,cy,r-2,ry-2,MAP.cream);}
  R(cx-34,cy-1,12,2,MAP.yellow);R(cx+22,cy-1,12,2,MAP.yellow);
  for(const[x,y,k,a]of S.it||[])sumoIcon(x,Math.round(cy+(y-cy)*sq),k,f,a);   // 기믹 아이템
  const ord=[0,1,2,3].sort((a,b)=>S.P[a][1]-S.P[b][1]),names=[];
  for(const i of ord){const[x,y,st,t,dash,sq2,fx,cd,pw]=S.P[i];if(st==='out')continue;const X=Math.round(x),py=Math.round(cy+(y-cy)*sq);
    if(st==='in'){if(i===me){pxEllipse(X,py+1,20,6,MAP.ink);pxEllipse(X,py+1,19,5,MAP.yellow);pxEllipse(X,py+1,16,3,MAP.cream);}pxEllipse(X,py+1,15,3,'rgba(42,58,72,.25)');   /* 내 쿵야: 발밑 노란 고리 */
      if(pw>0&&(pw>90||(f&4)))pxEllipse(X,py+1,22,7,'rgba(255,90,90,.45)');}   /* 넉백 강화: 빨간 기운 (끝나기 1.5초 전 깜빡임) */
    if(dash>0)for(let k=1;k<4;k++)koong(i,X-fx*k*7,py,{a:.25,flip:fx<0});   // 돌진 잔상
    if(st==='fall'){if((t>>2)&1)koong(i,X,py+Math.round((40-t)*.6),{flip:fx<0,tint:'#ffffff'});continue;}   // 떨어짐: 하얗게 깜빡이며 내려감 (회전·축소 없이)
    koong(i,X,py+(sq2>4?1:0),pw>0&&(f&8)?{flip:fx<0,tint:'#ff9a9a'}:{flip:fx<0});   // 부딪치면 1도트 눌림
    R(X-11,py+3,22,4,MAP.ink);R(X-10,py+4,Math.round(20*(1-cd/C.DCD)),2,cd>0?MAP.blue:MAP.yellow);   // 돌진 게이지
    names.push([i,X,py]);}
  if(fl)g.restore();
  /* 이름 · YOU · 먹은 효과 이름: 화면이 뒤집혀도 글자는 바로 (위치만 뒤집힘) */
  const mx=x=>fl&&!S.flip[1]?480-x:x,my=y=>fl&&S.flip[1]?270-y:y;
  for(const[i,X,py]of names){const{h}=koongSize(i),x=mx(X),y=my(py),top=fl&&S.flip[1]?y+h+2:y-h;
    if(i===me){meMark(x,top-12);txt('YOU',x,top-24,MAP.yellow,'center',8);}K(GAME.slots[i]?GAME.slots[i].name.slice(0,6):'',x,fl&&S.flip[1]?y-18:y+8,PCOL[i],'center',8);
    for(const[pi,k,at]of S.pop||[])if(pi===i)K(SITEM.NAME[k],x,top-36-Math.round((S.f-at)/6),SITEM.COL[k],'center',10);}
  // 위쪽: 1P~4P 이름 · 가운데 남은 시간
  for(let i=0;i<4;i++){const bx=i<2?6+i*100:280+(i-2)*100;pxBox(bx,4,94,18,MAP.ink,MAP.ink);R(bx+3,7,4,12,PCOL[i]);K(GAME.slots[i]?GAME.slots[i].name.slice(0,6):'',bx+50,5,'#fff','center',8);}
  const sec=Math.max(0,Math.ceil(S.tm/60));pxBox(212,4,56,18,MAP.ink,MAP.ink);txt(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`,240,5,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',10);
  if(fl)K('화면 반전!',240,252,'#a070ff','center',10);else if(S.R<C.R0&&S.ph==='play')K(S.fast>0?'링 축소 가속!':'씨름판이 줄어들어요!',240,252,'#ff5a5a','center',10);
  cdBanner(S,72);
  if(S.ph==='end'){const w=S.rw,nm=w<0?'무승부!':`${GAME.slots[w]?GAME.slots[w].name:''} 승리!`,col=w<0?'#fff':PCOL[w];
    banner([[S.tm<=0?'Time Out!':'Finish!','#fff419',24,false],[nm,col,11]],240,72);}}
regGame({id:'sumo',title:'쿵야 씨름',icon:'③',
  ctrl:['방향키로 이동','A 버튼으로 돌진 (1초마다 한 번)','부딪쳐서 다른 쿵야를 씨름판 밖으로!'],
  gimmick:'<b>줄어드는 씨름판</b> — 12초부터 점점 작아져요 · <b>아이템</b> — 먹으면 넉백 강화 · 상대 화면 반전 · 링 축소 가속',
  win:'마지막까지 남으면 +500 · 밀어내면 +300 · 개인 점수 1위 (한 판 · 60초)',
  desc:'방향키로 움직이고 A로 돌진! 다른 쿵야를 씨름판 밖으로 밀어내세요<br>개인전 · 한 판 · 씨름판이 점점 줄어들어요',
  controls:{dir:'hold',a:true,label:'방향키 + A 버튼',hint:'<span class="kk">↑</span><span class="kk">↓</span><span class="kk">←</span><span class="kk">→</span> 이동 · <span class="kk">Z</span><span class="kk">Space</span> 돌진'},
  newSim:(s,c)=>new SumoSim(s,c),
  lerp(a,b,k){return{...b,P:b.P.map((p,i)=>{const q=a.P[i]||p;return[q[0]+(p[0]-q[0])*k,q[1]+(p[1]-q[1])*k,...p.slice(2)];})};},
  draw:sumoDraw});
