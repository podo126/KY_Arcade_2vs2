/* ┌─────────────────────────────────────────────────────────
   │ ⑤ 쿵야 서빙 — 팀 2명이 긴 선반을 함께 들고 접시를 테이블까지 배달
   │ 앞사람 = 선반 앞쪽, 뒷사람 = 선반 뒤쪽 · ◀ ▶ 를 번갈아 누르면 한 걸음 (같은 키를 또 누르면 헛발질)
   │ 둘의 속도가 다르면 선반이 출렁여 접시가 떨어지고, 간격이 너무 벌어지거나 붙으면 선반을 놓침
   │ 90초 · 점수 = 이동 거리 + 배달한 접시 + 도착 순위 보너스
   └───────────────────────────────────────────────────────── */
/* 난이도 조절값: STRIDE 한 걸음 힘 · GAP 두 사람 기본 간격 · TOL 놓치는 간격 차이 · WOB 출렁임(속도 차이 · 간격 차이 · 되돌림 · 감쇠) · TRIP 헛발질 출렁임 */
const SRV={SEC:90,LEN:1200,DISH:6,STRIDE:.55,FRIC:.9,TRIP:.35,GAP:84,TOL:28,   /* GAP: 원본 그림(가로 최대 96) 두 명이 겹치지 않는 간격 */
 
  WOB:[.045,.003,.05,.88],TRIPW:.12,
  PUD:[[380,470],[760,850]],PUD_PUSH:.55,PUD_NOISE:.05,   /* 기믹: 물웅덩이 2곳 — 걸음 힘 55%, 선반 출렁임 */
  RESPAWN:90,BOB:6};
class ServeSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.sc=[0,0];this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=150;this.tm=SRV.SEC*60;this.drops=[];this.fin=0;
    this.H=[0,1].map(t=>({x:[40+SRV.GAP,40],v:[0,0],last:[0,0],bob:[0,0],fr:[0,0],w:0,wv:0,dish:SRV.DISH,st:'go',t:0,done:0,rank:0,contrib:[0,0],falls:0,bot:[{n:0,d:2},{n:4,d:2}]}));}
  /* 슬롯 t*2 = 앞사람(k=0), t*2+1 = 뒷사람(k=1) */
  input(i,e){if(!e.tap||(e.d!==2&&e.d!==4)||this.ph!=='play')return;const t=teamOf(i),k=i%2,h=this.H[t];if(h.st!=='go'||h.done)return;
    if(h.last[k]===e.d){h.v[k]*=SRV.TRIP;h.wv+=(k?-1:1)*SRV.TRIPW;h.last[k]=0;return;}   /* 같은 발 또 → 헛발질 */
    const pud=this.inPud(h);h.v[k]+=SRV.STRIDE*(pud?SRV.PUD_PUSH:1);h.last[k]=e.d;h.bob[k]=SRV.BOB;h.fr[k]^=1;h.contrib[k]++;}
  inPud(h){const m=(h.x[0]+h.x[1])/2;return SRV.PUD.some(([a,b])=>m>=a&&m<=b);}
  step(){this.f++;this.drops=this.drops.filter(d=>(d.t++)<50);
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0||this.H.every(h=>h.done))return this.end();
    this.H.forEach((h,t)=>this.team(h,t));}
  team(h,t){if(h.done)return;h.bob=h.bob.map(b=>Math.max(0,b-1));
    if(h.st==='fall'){if(--h.t<=0){Object.assign(h,{st:'go',v:[0,0],w:0,wv:0,last:[0,0]});h.x[1]=h.x[0]-SRV.GAP;}return;}
    [0,1].forEach(k=>{if(this.slots[t*2+k].bot)this.bot(h,t,k);});
    const pud=this.inPud(h);h.pud=pud;
    for(const k of [0,1]){h.x[k]+=h.v[k];h.v[k]*=SRV.FRIC;}
    if(h.x[1]>h.x[0]-12)h.x[1]=h.x[0]-12;   /* 뒷사람이 앞사람을 지나가지 못함 */
    // 선반 출렁임: 둘의 속도 차이 + 간격이 기본에서 벗어난 만큼, 웅덩이에서는 흔들림 추가
    const err=h.x[0]-h.x[1]-SRV.GAP;h.err=err;
    h.wv=(h.wv+(h.v[0]-h.v[1])*SRV.WOB[0]+err*SRV.WOB[1]-h.w*SRV.WOB[2]+(pud?(Math.random()-.5)*SRV.PUD_NOISE:0))*SRV.WOB[3];h.w+=h.wv;
    if(Math.abs(h.w)>1&&h.dish>0){h.dish--;h.w*=.3;h.wv*=.3;this.drops.push({t:0,team:t,x:(h.x[0]+h.x[1])/2,dir:Math.sign(h.w)||1});this.ev.push('ouch','shake:2');}
    if(Math.abs(err)>SRV.TOL){h.st='fall';h.t=SRV.RESPAWN;h.falls++;const lost=Math.min(2,h.dish);h.dish-=lost;for(let k=0;k<lost;k++)this.drops.push({t:0,team:t,x:(h.x[0]+h.x[1])/2,dir:k?1:-1});this.ev.push('big','shake:7');}
    if(h.x[0]>=SRV.LEN){h.x[0]=SRV.LEN;h.done=1;h.rank=++this.fin;const bonus=h.rank===1?1500:300;   /* 1등 도착 보너스가 커서 먼저 도착한 팀이 항상 이김 · 접시는 보너스 */
      this.sc[t]+=h.dish*100+bonus;[0,1].forEach(k=>{this.ps[t*2+k]+=h.dish*50+Math.round(bonus/2);});this.ev.push('win','shake:5');}
    this.scoreDist(h,t);}
  scoreDist(h,t){const d=Math.floor(h.x[0]/5),add=d-(h.dp||0);if(add<=0)return;h.dp=d;this.sc[t]+=add;const tot=h.contrib[0]+h.contrib[1]||1;
    [0,1].forEach(k=>{const i=t*2+k;h['acc'+k]=(h['acc'+k]||0)+add*h.contrib[k]/tot;const g=Math.floor(h['acc'+k]);if(g>0){this.ps[i]+=g;h['acc'+k]-=g;}});h.contrib=[h.contrib[0]*.5,h.contrib[1]*.5];}
  /* AI: 박자를 조금씩 흔들며 번갈아 걷고, 간격을 보고 앞사람은 기다리고 뒷사람은 따라붙음 */
  bot(h,t,k){const B=h.bot[k];if(this.f<B.n)return;const err=h.x[0]-h.x[1]-SRV.GAP;let gap=11+Math.floor(Math.random()*5);
    if(k===0&&err>6)gap+=Math.min(14,err);if(k===1&&err>6)gap-=4;if(k===1&&err<-6)gap+=8;
    B.d=Math.random()<.03?B.d:(B.d===2?4:2);this.input(t*2+k,{tap:1,d:B.d});B.n=this.f+gap;}
  end(){if(this.ph==='end')return;this.ph='end';this.t=160;this.ev.push('win');}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,sc:this.sc,ps:this.ps,drops:this.drops,
    H:this.H.map(h=>({x:h.x.map(v=>Math.round(v*2)/2),d:h.dish,w:Math.round(h.w*100)/100,st:h.st,ft:h.st==='fall'?h.t:0,pud:h.pud?1:0,done:h.done,rank:h.rank,e:Math.round(h.err||0)})),
    tag:[0,1,2,3].map(i=>(i%2?'선반 뒤쪽':'선반 앞쪽'))};}
  result(){return{sc:this.sc,ps:this.ps,lines:[0,1].map(t=>{const h=this.H[t];return `${h.done?h.rank+'등 도착':'도착 못 함 '+Math.floor(h.x[0]/SRV.LEN*100)+'%'} · 접시 ${h.dish}/${SRV.DISH} · 선반 놓침 ${h.falls}`;})};}
}
/* 다리 모션 (화면마다 따로 계산 · 결과엔 영향 없음): 걸은 거리로 발 박자(ph)를 정하고, 속도만큼 휘청임(A)이 커졌다 줄어듦
   a·b = 두 발 끝이 앞뒤로 나간 도트, st = 다리가 늘어나 몸이 들리는 도트, j = 선반 놓쳤을 때 버둥거림 */
const SRVL={f:-1,x:[[0,0],[0,0]],A:[[0,0],[0,0]]};
function srvLegs(t,k,x,fall,f){const V=SRVL;if(f<V.f-5||f>V.f+30){V.x=[[x,x],[x,x]];V.A=[[0,0],[0,0]];}
  if(t===0&&k===0)V.f=f;const sp=Math.abs(x-V.x[t][k]);V.x[t][k]=x;const A=V.A[t][k]=V.A[t][k]+(Math.min(1,sp/.35)-V.A[t][k])*.15;
  if(fall){const q=(f>>2)&1;return{a:q?-5:-3,b:q?4:6,st:0,j:q?1:-1};}   /* 놓쳤을 땐 다리를 쩍 벌리고 버둥 */
  const ph=x*.55+k*1.3,w=Math.sin(ph),wob=Math.sin(ph*2.3+t+k*2);   /* 2.3배 박자로 한 번 더 꺾여서 어설프게 */
  return{a:Math.round(A*(7*w+3*wob)),b:Math.round(A*(-7*w+3*wob)),st:Math.round(A*6*Math.abs(Math.cos(ph))),j:0};}
/* 배경 창문 간격(도트): 128 = 예전(64)의 절반 빈도 */
const SRV_WIN=128;
/* 도착 테이블 (x = 결승선 화면 좌표, gy = 바닥선): 바닥 체크 결승선 + 흰 식탁보 테이블 · 그 위 꽃병 · 빈 접시 자리 · 뒤에 의자 */
function srvTable(x,gy){if(x>540||x<-120)return;const W='#fff',SH='#d8e4ec',WD='#b07a48',WK='#7a5030',INK=MAP.ink;
  for(let y=gy+2;y<gy+22;y+=4)for(let k=0;k<2;k++)R(x+k*4-4,y,4,4,((y-gy-2)/4+k)%2?INK:W);   /* 결승선 체크 */
  const cx=x+18;   /* 의자 (테이블 뒤) */R(cx+52,gy-38,4,39,WK);R(cx+52,gy-38,14,4,WK);R(cx+62,gy-38,4,39,WK);R(cx+48,gy-16,22,4,WD);R(cx+48,gy-16,22,1,'#d8a878');
  const tx=x+12,tw=64,ty=gy-28;   /* 테이블 */
  R(tx+6,ty+8,4,gy+1-ty-8,WK);R(tx+tw-10,ty+8,4,gy+1-ty-8,WK);R(tx+7,ty+8,1,gy+1-ty-8,WD);R(tx+tw-9,ty+8,1,gy+1-ty-8,WD);   /* 다리 */
  R(tx-1,ty-1,tw+2,10,INK);R(tx,ty,tw,8,W);R(tx,ty,tw,2,'#fff');R(tx,ty+6,tw,2,SH);   /* 상판 + 식탁보 */
  for(let k=0;k<tw;k+=8){R(tx+k,ty+8,8,3,W);R(tx+k+2,ty+11,4,1,W);R(tx+k,ty+8,8,1,MAP.blue);R(tx+k,ty+10,1,1,SH);}R(tx-1,ty+8,1,3,INK);R(tx+tw,ty+8,1,3,INK);   /* 식탁보 물결 끝단 + 파랑 줄 */
  R(tx+8,ty-2,16,2,SH);R(tx+10,ty-3,12,1,W);R(tx+12,ty-2,8,1,MAP.blue);   /* 빈 접시 자리 */
  const vx=tx+44;R(vx,ty-9,6,9,MAP.blue);R(vx+1,ty-8,1,6,MAP.hi);R(vx-1,ty-10,8,1,INK);   /* 꽃병 */
  R(vx+2,ty-16,2,6,'#3a9a48');R(vx-2,ty-19,4,4,'#ff5ad0');R(vx+4,ty-21,4,4,MAP.yellow);R(vx+1,ty-23,4,4,'#ff7a5a');R(vx-1,ty-18,1,1,W);R(vx+5,ty-20,1,1,W);
  R(x+27,gy-64,40,20,INK);R(x+28,gy-63,38,18,MAP.blue);R(x+28,gy-63,38,2,'#7fe0ff');R(x+46,gy-44,2,6,INK);K('도착',x+47,gy-60,'#fff','center',8);}   /* 표지판 */
/* 근경 레이어: 카메라보다 빠르게(1.6배) 지나가는 화분 · 의자 등받이 · 손님 테이블 — 바닥 아래쪽에 걸쳐 캐릭터 발 앞을 지나감 */
const SRV_FRONT=[[0,'plant'],[150,'chair'],[310,'plant'],[420,'tbl'],[600,'chair'],[760,'plant'],[900,'tbl'],[1080,'chair'],[1230,'plant'],[1400,'tbl'],[1580,'plant'],[1740,'chair'],[1900,'tbl']];
function srvFront(cam,oy,gy){const b=oy+134,P=1.6;
  for(const[x0,k]of SRV_FRONT){const x=Math.round(x0-cam*P+40);if(x<-60||x>500)continue;
    if(k==='plant'){R(x,b-12,16,12,'#c86a3a');R(x-1,b-13,18,3,'#e08850');R(x,b-10,16,1,'#8a4020');   /* 화분 */
      R(x+2,b-22,4,9,'#3a9a48');R(x+7,b-27,4,14,'#58b858');R(x+11,b-21,4,8,'#3a9a48');R(x+5,b-25,2,2,'#8ad878');R(x+12,b-20,2,2,'#8ad878');}
    else if(k==='chair'){R(x,b-26,4,26,'#7a5030');R(x+20,b-26,4,26,'#7a5030');R(x,b-26,24,4,'#b07a48');R(x,b-26,24,1,'#d8a878');R(x+4,b-17,16,3,'#b07a48');}   /* 의자 등받이 */
    else{R(x,b-18,40,6,'#fff');R(x,b-18,40,1,MAP.ink);R(x,b-13,40,1,'#d8e4ec');for(let k2=0;k2<40;k2+=8)R(x+k2,b-12,8,2,MAP.blue);R(x+4,b-10,4,10,'#7a5030');R(x+32,b-10,4,10,'#7a5030');   /* 손님 테이블 + 접시 */
      R(x+10,b-21,12,3,'#fff');R(x+12,b-22,8,1,'#e84a3a');R(x+26,b-24,5,6,MAP.blue);R(x+27,b-23,1,4,MAP.hi);}}}
function srvDraw(g,S,pd,me,f){
  for(const t of [0,1]){const H=S.H[t],oy=t?136:0,mid=(H.x[0]+H.x[1])/2,cam=clamp(mid-150,0,SRV.LEN-300),gy=oy+112;
    g.save();g.beginPath();g.rect(0,oy,480,134);g.clip();
    wallTiles(0,oy,480,gy-oy);for(let x=-Math.round(cam*.3%SRV_WIN);x<480;x+=SRV_WIN){R(x+8,oy+18,40,30,MAP.blue);R(x+11,oy+21,34,24,MAP.hi);R(x+11,oy+21,34,3,MAP.blue);R(x+27,oy+21,2,24,MAP.blue);}   // 크림 벽(2.5D 타일) · 파랑 창 (창 간격 SRV_WIN)
    R(0,gy,480,22,MAP.mint);R(0,gy,480,2,MAP.blue);for(let x=-(cam%32);x<480;x+=32){R(x,gy+2,16,20,MAP.green);R(x,gy+2,16,1,'#fff');}   // 바닥: 민트 · 연두 바둑판
    srvTable(Math.round(SRV.LEN-cam),gy);   // 도착 지점: 결승선 + 손님 테이블
    for(const[a,b2]of SRV.PUD){const px=Math.round(a-cam);if(px>480||b2-cam<0)continue;const w=b2-a;R(px+4,gy+2,w-8,4,MAP.blue);R(px,gy+4,w,6,MAP.blue);R(px+8,gy+3,10,2,'#fff');R(px+w-30,gy+6,14,2,'#fff');}   /* 물웅덩이 (파랑) */
    for(const d of S.drops)if(d.team===t){const dx=Math.round(d.x-cam+d.dir*d.t*1.6),dy=Math.round(gy-80+d.t*d.t*.06);if(dy<gy+10){R(dx-6,dy,12,3,'#fff');R(dx-4,dy-2,8,2,'#e8a040');}}
    const XF=Math.round(H.x[0]-cam),XB=Math.round(H.x[1]-cam),fall=H.st==='fall',col=TEAM[t].col;
    // 두 쿵야: 몸통은 그대로 미끄러지듯 이동, 다리만 휘청휘청 (CLOP 느낌) — 모든 좌표 정수라 도트가 깨지지 않음
    const LG=[0,1].map(k=>srvLegs(t,k,H.x[k],fall,f)),SZ=[koongSize(t*2),koongSize(t*2+1)];
    for(const k of [1,0]){const lg=LG[k];koongWalk(t*2+k,(k?XB:XF)+lg.j,gy+1,lg.a,lg.b,lg.st);}
    // 긴 선반: 두 사람 머리 위에 이고 감 · 출렁임(w)만큼 기울이고, 다리가 늘어나 몸이 들리면 그쪽 끝도 같이 들림
    const x0=XB-Math.floor(SZ[1].w/2)+2,x1=XF+Math.ceil(SZ[0].w/2)-2,len=x1-x0,tilt=fall?0:Math.round(H.w*4);
    const top=k=>gy+1-SZ[k].h-LG[k].st-6,ya=fall?gy-4:top(1)+tilt,yb=fall?gy-4:top(0)-tilt,   /* 각자 머리 꼭대기에 얹힘 (키 차이만큼 기울어짐) */py=x=>Math.round(ya+(yb-ya)*(x-x0)/len);
    for(let x=x0;x<x1;x+=2){const y=py(x);R(x,y-1,2,1,MAP.ink);R(x,y,2,5,'#c8a070');R(x,y,2,1,'#f0d8a8');R(x,y+4,2,1,'#8a6040');R(x,y+5,2,1,col);R(x,y+6,2,1,MAP.ink);}   // 선반 + 팀 색 줄
    // 접시: 세 군데에 쌓고, 출렁이면 미끄러짐
    for(let k=0;k<H.d;k++){const s=k%3,lv=Math.floor(k/3),cx=Math.round(x0+len*(.25+s*.25)+(fall?0:H.w*(3+lv*2))),y=(fall?gy-4:py(cx))-4-lv*4;
      R(cx-7,y,14,3,'#fff');R(cx-7,y+2,14,1,'#a8b8c8');R(cx-5,y-2,10,2,['#e84a3a','#f8d84a','#6ab84a'][k%3]);}
    srvFront(cam,oy,gy);   // 근경 레이어: 캐릭터 앞을 더 빨리 지나가는 소품
    if(me===t*2||me===t*2+1){const k=me===t*2?0:1;meMark(k?XB:XF,gy-Math.max(SZ[0].h,SZ[1].h)-26);}
    K(`${TEAM[t].name}  ${Math.floor(H.x[0]/SRV.LEN*100)}%  접시 ${H.d}`,8,oy+4,col,'left',9);
    if(H.done)K(`${H.rank}등 도착!`,240,oy+40,'#fff419','center',16);
    else if(fall)K('앗! 선반을 놓쳤다',(XF+XB)/2,oy+18,'#ff8a8a','center',10);
    else if(Math.abs(H.e)>SRV.TOL*.55&&(f>>3)&1)K(H.e>0?'너무 멀어요!':'너무 붙었어요!',(XF+XB)/2,oy+18,'#ff8a8a','center',10);
    else if(H.pud&&(f>>3)&1)K('미끌미끌!',(XF+XB)/2,oy+18,'#7fd0ff','center',10);
    g.restore();}
  R(0,134,480,2,MAP.blue);
  const sec=Math.max(0,Math.ceil(S.tm/60));R(214,124,52,20,MAP.ink);txt(String(sec),240,129,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',10);
  if(S.ph==='cd'){R(70,70,340,92,'rgba(42,58,72,.88)');K('쿵야 서빙!',240,78,'#fff419','center',16);K('둘이서 긴 선반을 들고 테이블까지!',240,100,'#fff','center',11);
    K('◀ ▶ 를 번갈아 눌러 한 걸음씩 · 간격을 맞춰요',240,116,'#d4f4ff','center',10);txt(String(Math.max(1,Math.ceil(S.t/50))),240,138,'#fff','center',14);}
  if(S.ph==='end'){R(110,110,260,50,'rgba(42,58,72,.88)');K('영업 종료!',240,122,'#fff419','center',16);}}
regGame({id:'serve',title:'쿵야 서빙',icon:'⑤',
  ctrl:['앞사람 = 선반 앞쪽, 뒷사람 = 선반 뒤쪽 (대기방 위 자리 = 앞)','◀ ▶ 를 <b>번갈아</b> 누르면 한 걸음 (같은 키 연타는 헛발질)','둘의 속도가 다르면 접시가 흔들려 떨어져요'],
  gimmick:'<b>물웅덩이</b> — 웅덩이 위에선 미끄러워 잘 안 나가고 선반이 출렁여요',
  win:'먼저 도착하는 팀이 우승! (접시는 보너스 점수)',
  desc:'2명이 긴 선반에 접시를 올려 들고 테이블까지 배달!<br>◀ ▶ 번갈아 걷기 · 간격이 너무 벌어지거나 붙으면 선반을 놓쳐요 · 90초',
  controls:{dir:'tap',a:false,label:'◀ ▶ 번갈아',hint:'<span class="kk">◀</span><span class="kk">▶</span> 번갈아 눌러 한 걸음씩 · 같은 팀과 간격을 맞춰 걷기 (앞사람 앞쪽 · 뒷사람 뒤쪽)'},
  newSim:(s,c)=>new ServeSim(s,c),
  lerp(a,b,k){return{...b,H:b.H.map((h,i)=>{const q=a.H[i]||h;return{...h,x:h.x.map((v,j)=>q.x[j]+(v-q.x[j])*k)};})};},
  draw:srvDraw});
