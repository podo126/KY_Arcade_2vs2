/* ┌─────────────────────────────────────────────────────────
   │ ⑤ 쿵야 서빙 — 팀 2명이 말 탈 하나에 들어가 접시를 싣고 테이블까지 배달
   │ 앞사람 = 앞다리 2개, 뒷사람 = 뒷다리 2개 · ◀ ▶ 를 누르고 있으면 다리를 앞으로 들고, 떼면 뒤로 차며 전진
   │ 같은 쌍 다리를 한꺼번에 들면 앞(뒤)이 주저앉고, 몸이 너무 기울거나 네 다리가 다 뜨면 넘어짐
   │ 흔들리면 접시가 떨어짐 · 90초 · 점수 = 이동 거리 + 배달한 접시 + 도착 순위 보너스
   └───────────────────────────────────────────────────────── */
/* 난이도 조절값: PUSH 전진 힘 · TQ 다리를 한꺼번에 들 때 기우는 힘 · PT 앞뒤 힘 차이로 기우는 힘 · FALL 넘어지는 기울기 · AIR 네 다리가 다 뜬 채 버티는 프레임 · WOB 접시 흔들림 */
const SRV={SEC:90,LEN:1400,DISH:6,UP:.8,DOWN:-.55,LSPD:.075,PUSH:.3,FRIC:.94,TQ:.006,PT:.04,REST:.025,DAMP:.93,FALL:.5,AIR:10,
  WOB:[.09,1.1,4,.95],PUD:[[440,540],[880,980]],PUD_PUSH:.55,PUD_NOISE:3,   /* 기믹: 물웅덩이 2곳 — 전진 힘 55%, 흔들림 3배 */
  STEP:.6,RESPAWN:100,NOISE:.006};   /* STEP: 다리를 이만큼 들어 올려야 한 걸음으로 인정 (마구 누르면 헛발질) */
class ServeSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.sc=[0,0];this.ps=[0,0,0,0];this.ev=[];this.done=false;this.ph='cd';this.t=150;this.tm=SRV.SEC*60;this.m=[0,0,0,0];this.drops=[];this.fin=0;
    this.H=[0,1].map(t=>({x:40,vx:0,pv:0,pitch:0,legs:[0,1,2,3].map(k=>({a:k%2?.3:-.3,v:0})),dish:SRV.DISH,w:0,st:'go',t:0,air:0,done:0,rank:0,contrib:[0,0],falls:0,bt:Math.random()*30}));}
  input(i,e){if('m' in e)this.m[i]=e.m|0;}
  step(){this.f++;this.drops=this.drops.filter(d=>(d.t++)<50);
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0||this.H.every(h=>h.done))return this.end();
    this.H.forEach((h,t)=>this.horse(h,t));}
  /* 팀 t의 말: 슬롯 (t*2) = 앞사람(앞다리), (t*2+1) = 뒷사람(뒷다리) */
  horse(h,t){if(h.done)return;
    if(h.st==='fall'){if(--h.t<=0){Object.assign(h,{st:'go',pitch:0,pv:0,vx:0,air:0,w:0});h.legs.forEach((L,k)=>{L.a=k%2?.3:-.3;});}return;}
    const front=t*2,back=t*2+1;[front,back].forEach((i,pair)=>{if(this.slots[i].bot)this.bot(i,h,pair);});
    let push=[0,0],plantF=0,plantB=0;
    h.legs.forEach((L,k)=>{const i=k<2?front:back,bit=k%2?2:1,hold=(this.m[i]&bit)!==0,tg=hold?SRV.UP:SRV.DOWN,old=L.a;
      L.a+=clamp(tg-L.a,-SRV.LSPD,SRV.LSPD);L.v=L.a-old;if(L.a>=SRV.STEP)L.ok=1;const planted=L.v<=.001;
      if(planted){if(k<2)plantF++;else plantB++;if(L.v<0&&L.ok)push[k<2?0:1]+=-L.v;if(L.a<=SRV.DOWN+.01)L.ok=0;}});
    // 전진: 땅을 디딘 다리가 뒤로 찬 만큼
    const pud=SRV.PUD.some(([a,b])=>h.x>=a&&h.x<=b);h.pud=pud;if(pud){push[0]*=SRV.PUD_PUSH;push[1]*=SRV.PUD_PUSH;}
    const pv=h.vx;h.vx=(h.vx+(push[0]+push[1])*SRV.PUSH)*SRV.FRIC;h.x+=h.vx;h.contrib[0]+=push[0];h.contrib[1]+=push[1];
    // 기울기: 앞다리가 다 뜨면 고개가 숙여지고(-) 뒷다리가 다 뜨면 엉덩이가 내려감(+)
    // 앞뒤가 미는 힘이 다르면 몸이 기움 (앞다리만 세게 밀면 머리가 들리고, 뒷다리만 세게 밀면 고꾸라짐)
    const tq=((2-plantB)-(2-plantF))*SRV.TQ+(push[0]-push[1])*SRV.PT+(Math.random()-.5)*SRV.NOISE*(pud?SRV.PUD_NOISE:1);h.pv=(h.pv+tq-h.pitch*SRV.REST)*SRV.DAMP;h.pitch+=h.pv;
    h.air=plantF+plantB===0?h.air+1:0;
    // 접시 흔들림: 기울기·가속에 비례, 한계를 넘으면 맨 위 접시가 떨어짐
    h.w=(h.w+h.pitch*SRV.WOB[0]+h.pv*SRV.WOB[1]+(h.vx-pv)*SRV.WOB[2])*SRV.WOB[3];
    if(Math.abs(h.w)>1&&h.dish>0){h.dish--;h.w*=.3;this.drops.push({t:0,team:t,x:h.x,dir:Math.sign(h.w)||1});this.ev.push('ouch','shake:2');}
    if(Math.abs(h.pitch)>SRV.FALL||h.air>SRV.AIR){h.st='fall';h.t=SRV.RESPAWN;h.falls++;const lost=Math.min(2,h.dish);h.dish-=lost;for(let k=0;k<lost;k++)this.drops.push({t:0,team:t,x:h.x,dir:k?1:-1});this.ev.push('big','shake:7');}
    if(h.x>=SRV.LEN){h.x=SRV.LEN;h.done=1;h.rank=++this.fin;const bonus=h.rank===1?1500:300;   /* 1등 도착 보너스가 커서 먼저 도착한 팀이 항상 이김 · 접시는 보너스 */
      this.sc[t]+=h.dish*100+bonus;[front,back].forEach(i=>{this.ps[i]+=h.dish*50+Math.round(bonus/2);});this.ev.push('win','shake:5');}
    this.scoreDist(h,t);}
  scoreDist(h,t){const d=Math.floor(h.x/5),add=d-(h.dp||0);if(add<=0)return;h.dp=d;this.sc[t]+=add;const tot=h.contrib[0]+h.contrib[1]||1;
    [0,1].forEach(k=>{const i=t*2+k;h['acc'+k]=(h['acc'+k]||0)+add*h.contrib[k]/tot;const g=Math.floor(h['acc'+k]);if(g>0){this.ps[i]+=g;h['acc'+k]-=g;}});h.contrib=[h.contrib[0]*.5,h.contrib[1]*.5];}
  /* AI: 한 쌍의 다리를 번갈아 들고(동시에 들지 않음), 기울면 잠깐 다 내려서 균형 */
  bot(i,h,pair){const B=h['bot'+pair]||(h['bot'+pair]={m:pair?2:1,next:pair*8});   /* 사람처럼 박자가 조금씩 흔들림 */
    if(this.f>=B.next){B.m=B.m===1?2:1;B.next=this.f+16+Math.floor(Math.random()*9);if(Math.random()<.06){B.m=3;B.next=this.f+5;}}
    let m=B.m;if(pair===0&&h.pitch<-.22||pair===1&&h.pitch>.22)m=0;this.m[i]=m;}
  end(){if(this.ph==='end')return;this.ph='end';this.t=160;this.ev.push('win');}
  snap(){return{f:this.f,ph:this.ph,t:this.t,tm:this.tm,sc:this.sc,ps:this.ps,drops:this.drops,
    H:this.H.map(h=>({x:Math.round(h.x*2)/2,p:Math.round(h.pitch*1000)/1000,d:h.dish,w:Math.round(h.w*100)/100,st:h.st,ft:h.st==='fall'?h.t:0,pud:h.pud?1:0,done:h.done,rank:h.rank,L:h.legs.map(L=>Math.round(L.a*100)/100)})),
    tag:[0,1,2,3].map(i=>(i%2?'뒷다리':'앞다리'))};}
  result(){return{sc:this.sc,ps:this.ps,lines:[0,1].map(t=>{const h=this.H[t];return `${h.done?h.rank+'등 도착':'도착 못 함 '+Math.floor(h.x/SRV.LEN*100)+'%'} · 접시 ${h.dish}/${SRV.DISH} · 넘어짐 ${h.falls}`;})};}
}
function srvDraw(g,S,pd,me,f){
  for(const t of [0,1]){const H=S.H[t],oy=t?136:0,cam=clamp(H.x-140,0,SRV.LEN-300),gy=oy+112;
    g.save();g.beginPath();g.rect(0,oy,480,134);g.clip();
    wallTiles(0,oy,480,gy-oy);for(let x=-Math.round(cam*.3%64);x<480;x+=64){R(x+8,oy+18,40,30,MAP.blue);R(x+11,oy+21,34,24,MAP.hi);R(x+11,oy+21,34,3,MAP.blue);R(x+27,oy+21,2,24,MAP.blue);}   // 크림 벽(2.5D 타일) · 파랑 창
    R(0,gy,480,22,MAP.mint);R(0,gy,480,2,MAP.blue);for(let x=-(cam%32);x<480;x+=32){R(x,gy+2,16,20,MAP.green);R(x,gy+2,16,1,'#fff');}   // 바닥: 민트 · 연두 바둑판
    const tx=SRV.LEN-cam+30;R(tx-1,gy-27,62,10,MAP.ink);R(tx,gy-26,60,8,MAP.yellow);R(tx,gy-26,60,2,'#fff');R(tx+6,gy-18,4,18,MAP.ink);R(tx+50,gy-18,4,18,MAP.ink);K('테이블',tx+30,gy-40,MAP.blue,'center',8);   // 도착 테이블
    for(const[a,b2]of SRV.PUD){const px=a-cam;if(px>480||b2-cam<0)continue;const w=b2-a;R(px+4,gy+2,w-8,4,MAP.blue);R(px,gy+4,w,6,MAP.blue);R(px+8,gy+3,10,2,'#fff');R(px+w-30,gy+6,14,2,'#fff');}   /* 물웅덩이 (파랑) */
    for(const d of S.drops)if(d.team===t){const dx=d.x-cam+d.dir*d.t*1.6,dy=gy-58+d.t*d.t*.06;if(dy<gy+10){R(dx-6,dy,12,3,'#fff');R(dx-4,dy-2,8,2,'#e8a040');}}
    // 말 탈 (두 쿵야가 들어간 말)
    const X=Math.round(H.x-cam),fall=H.st==='fall',fk=fall?Math.min(1,(SRV.RESPAWN-H.ft)/18):0,p=fall?H.p+(Math.sign(H.p||1)*.9-H.p)*fk:H.p,col=TEAM[t].col;   /* 넘어질 때 18프레임에 걸쳐 쓰러짐 */
    /* 말: 회전 대신 픽셀 단위로 기울여 그림 (4K에서 계단·번짐 없이) */
    const B=gy-30+Math.round(24*(1-Math.max(...H.L.map(a=>Math.cos(a)))))+(fall?Math.round(fk*6):0),sn=Math.sin(p),yo=x=>-Math.round(x*sn);   /* 다리를 벌리면 몸이 내려감 */
    const leg=(lx,a,dark)=>{const hx=X+lx,hy=B+4+yo(lx),sa=Math.sin(a+p*.3),ca=Math.cos(a+p*.3);let fx=hx,fy=hy;
      for(let k=0;k<=24;k+=1){fx=Math.round(hx+sa*k);fy=Math.round(hy+ca*k);R(fx-2,fy,4,2,dark?'#a08060':'#c8a070');}R(fx-3,fy,6,4,'#3a2a1a');};
    leg(-18,H.L[2],1);leg(14,H.L[0],1);
    for(let x=-30;x<30;x+=2){const o=yo(x+1);R(X+x,B-14+o,2,20,'#c8a070');R(X+x,B-14+o,2,3,'#e8c890');if(x>=-22&&x<22){R(X+x,B-12+o,2,14,col);R(X+x,B-12+o,2,2,'#fff');}}   // 몸통 + 팀 색 천
    {const o=yo(34);R(X+28,B-26+o,14,12,'#c8a070');R(X+38,B-22+o,6,4,'#c8a070');R(X+32,B-28+o,3,4,'#3a2a1a');}   // 말 머리
    leg(-26,H.L[3],0);leg(6,H.L[1],0);
    {const o=yo(0);for(let k=0;k<H.d;k++){const wo=Math.round(H.w*k*1.5);R(X-10+wo,B-17-k*4+o,20,3,'#fff');R(X-8+wo,B-19-k*4+o,16,2,['#e84a3a','#f8d84a','#6ab84a'][k%3]);}}   // 접시 탑
    const bf=H.L[0]>H.L[1]?-1:0,bb=H.L[2]>H.L[3]?-1:0;   /* 다리를 번갈아 들 때마다 머리가 1도트 들썩 */
    koong(t*2,X+30,B-16+yo(30)+bf,{s:1,fr:fall?5:0});koong(t*2+1,X-24,B-10+yo(-24)+bb,{s:1,fr:fall?5:0,flip:true});   // 앞·뒤 쿵야 얼굴
    if(me===t*2||me===t*2+1)meMark(me===t*2?X+30:X-24,gy-76);
    K(`${TEAM[t].name}  ${Math.floor(H.x/SRV.LEN*100)}%  접시 ${H.d}`,8,oy+4,col,'left',9);
    if(H.done)K(`${H.rank}등 도착!`,240,oy+40,'#fff419','center',16);if(fall)K('으악! 넘어졌다',X,gy-92,'#ff8a8a','center',10);else if(H.pud&&(f>>3)&1)K('미끌미끌!',X,gy-92,'#7fd0ff','center',10);
    g.restore();}
  R(0,134,480,2,MAP.blue);
  const sec=Math.max(0,Math.ceil(S.tm/60));R(214,124,52,20,MAP.ink);txt(String(sec),240,129,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',10);
  if(S.ph==='cd'){R(70,70,340,92,'rgba(42,58,72,.88)');K('쿵야 서빙!',240,78,'#fff419','center',16);K('앞사람 = 앞다리 · 뒷사람 = 뒷다리',240,100,'#fff','center',11);
    K('◀ ▶ 누르고 있으면 다리를 들고, 떼면 뒤로 차며 전진',240,116,'#d4f4ff','center',10);txt(String(Math.max(1,Math.ceil(S.t/50))),240,138,'#fff','center',14);}
  if(S.ph==='end'){R(110,110,260,50,'rgba(42,58,72,.88)');K('영업 종료!',240,122,'#fff419','center',16);}}
regGame({id:'serve',title:'쿵야 서빙',icon:'⑤',
  ctrl:['각 플레이어가 <b>앞다리 / 뒷다리</b> 조작 (대기방 위 자리 = 앞)','◀ ▶ 누르면 왼쪽 / 오른쪽 다리 들기, 떼면 전진','두 다리를 한꺼번에 들면 고꾸라져요'],
  gimmick:'<b>물웅덩이</b> — 웅덩이 위에선 미끄러워 잘 안 나가요',
  win:'먼저 도착하는 팀이 우승! (접시는 보너스 점수)',
  desc:'2명이 말 탈 하나에 들어가 접시를 싣고 테이블까지 배달!<br>앞사람은 앞다리, 뒷사람은 뒷다리 · 호흡이 안 맞으면 고꾸라져요 · 90초',
  controls:{dir:'bits',a:false,label:'◀ ▶ 다리 2개',hint:'<span class="kk">◀</span><span class="kk">▶</span> 누르고 있으면 다리 들기 · 떼면 뒤로 차며 전진 (앞사람 앞다리 · 뒷사람 뒷다리)'},
  newSim:(s,c)=>new ServeSim(s,c),
  lerp(a,b,k){return{...b,H:b.H.map((h,i)=>{const q=a.H[i]||h;return{...h,x:q.x+(h.x-q.x)*k,p:q.p+(h.p-q.p)*k,L:h.L.map((v,j)=>q.L[j]+(v-q.L[j])*k)};})};},
  draw:srvDraw});
