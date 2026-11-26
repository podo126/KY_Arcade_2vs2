/* ┌─────────────────────────────────────────────────────────
   │ ③ 쿵야 펀치 — 왕복하는 게이지를 A로 멈춰 가운데를 맞히면 상대 팀 체력이 깎임
   │ PERFECT(±4) 120 · GREAT(±12) 70 · GOOD(±24) 35 · MISS = 1초 기절 · 60초 또는 체력 0이면 끝
   │ 판정은 "내 화면에 보인 게이지" 기준(prep)이라 인터넷 지연이 있어도 공정합니다.
   └───────────────────────────────────────────────────────── */
const PUN={SEC:60,HP:1500,GOLD_AT:12,GOLD_EVERY:15,GOLD_LEN:4,   /* 기믹: 12초부터 15초마다 4초간 황금 펀치 타임(데미지 2배) */
  ZONES:[[4,'PERFECT',120,'#fff419'],[12,'GREAT',70,'#58d838'],[24,'GOOD',35,'#00ccf3']]};
const punCur=(G,f)=>{const p=(((f-G.s0)*G.sp+G.o)%200+200)%200;return p<100?p:200-p;};
class PunchSim{
  constructor(slots,ctx){this.slots=slots;this.local=ctx.local;this.f=0;this.sc=[0,0];this.ps=[0,0,0,0];this.ev=[];this.done=false;this.hp=[PUN.HP,PUN.HP];
    this.ph='cd';this.t=150;this.tm=PUN.SEC*60;this.G=[0,1,2,3].map(()=>({st:'wait',s0:0,sp:1.6,o:0,cd:0,last:'',lt:0}));this.pop=[];this.pid=0;this.anim=[0,0,0,0];this.hurt=[0,0];this.gold=0;this.nextGold=PUN.GOLD_AT*60;}
  spd(){return 1.5+1.6*(1-this.tm/(PUN.SEC*60));}   // 시간이 갈수록 게이지가 빨라짐
  aim(i){Object.assign(this.G[i],{st:'aim',s0:this.f,sp:this.spd(),o:Math.random()*100,want:0});}
  input(i,e){if(!e.a||this.ph!=='play')return;const G=this.G[i];if(G.st!=='aim')return;
    const d=clamp(typeof e.dist==='number'?e.dist:Math.abs(punCur(G,this.f)-50),0,50),z=PUN.ZONES.find(z=>d<=z[0]);
    if(!z){Object.assign(G,{st:'stun',cd:60,last:'MISS',lt:this.f});this.ev.push('ouch');this.popup(i,'MISS','#ff5a5a');return;}
    const t=teamOf(i),dmg=z[2]*(this.gold>0?2:1);this.hp[1-t]=Math.max(0,this.hp[1-t]-dmg);this.sc[t]+=dmg;this.ps[i]+=dmg+(z[1]==='PERFECT'?30:0);
    Object.assign(G,{st:'cool',cd:30,last:z[1],lt:this.f});this.anim[i]=12;this.hurt[1-t]=10;
    if(z[1]==='PERFECT')this.ev.push('big','shake:8');else this.ev.push('hit',z[1]==='GREAT'?'shake:4':'shake:2');
    this.popup(i,`${z[1]} -${dmg}`,z[3]);if(this.hp[1-t]<=0)this.end();}
  popup(i,txt,col){this.pop.push({id:++this.pid,i,txt,col,t:0});}
  step(){this.f++;this.pop.forEach(p=>p.t++);this.pop=this.pop.filter(p=>p.t<45);
    for(let k=0;k<4;k++)if(this.anim[k]>0)this.anim[k]--;for(const t of [0,1])if(this.hurt[t]>0)this.hurt[t]--;
    if(this.ph==='cd'){if(this.t%50===0&&this.t>0)this.ev.push('beep');if(--this.t<=0){this.ph='play';this.ev.push('go');for(let i=0;i<4;i++)this.aim(i);}return;}
    if(this.ph==='end'){if(--this.t<=0)this.done=true;return;}
    if(--this.tm<=0)return this.end();
    const el=PUN.SEC*60-this.tm;if(this.gold>0)this.gold--;else if(el>=this.nextGold){this.gold=PUN.GOLD_LEN*60;this.nextGold+=PUN.GOLD_EVERY*60;this.ev.push('power','shake:3');}
    this.G.forEach((G,i)=>{if(G.st!=='aim'){if(--G.cd<=0)this.aim(i);}else if(this.slots[i].bot)this.bot(i);});}
  bot(i){const G=this.G[i];if(!G.want)G.want=[2,5,9,14,20,30][Math.floor(Math.random()*6)];if(Math.abs(punCur(G,this.f)-50)<=G.want&&Math.random()<.3)this.input(i,{a:1});}
  end(){if(this.ph==='end')return;this.ph='end';this.t=150;this.ev.push('win','shake:6');}
  snap(){return{gold:this.gold,f:this.f,ph:this.ph,t:this.t,tm:this.tm,sc:this.sc,ps:this.ps,hp:this.hp,pop:this.pop,anim:this.anim,hurt:this.hurt,
    G:this.G.map(G=>({st:G.st,s0:G.s0,sp:G.sp,o:G.o,last:G.last,lt:G.lt})),tag:this.G.map(G=>G.last)};}
  result(){return{sc:this.sc,ps:this.ps,lines:[0,1].map(t=>`남은 체력 ${this.hp[t]} / ${PUN.HP}`)};}
}
function punDraw(g,S,pd,me,f){
  wallTiles(0,0,480,168);for(let i=0;i<5;i++)for(let y=44;y<168;y+=4){const w=20+Math.round((y-44)*.55/4)*4;R(80+i*80-w/2-(y-44)*.2,y,w,4,'rgba(255,244,25,.10)');}   /* 벽 + 노란 조명(4도트 계단) */
  R(0,168,480,30,MAP.mint);R(0,168,480,2,MAP.blue);R(60,164,360,6,MAP.blue);R(60,164,360,2,'#fff');   /* 민트 바닥 · 파랑 무대 */
  if(S.gold>0){R(0,0,480,190,'rgba(255,244,25,.22)');for(let x=(f*2)%40-40;x<480;x+=40)R(x,186,20,4,'#fff419');   /* 황금 펀치 타임 */
    if((f>>3)&1)K('황금 펀치 타임! 데미지 ×2',240,50,'#fff419','center',12);}
  // 체력 바
  for(const t of [0,1]){const x=t?250:10,w=220,v=S.hp[t]/PUN.HP;R(x-1,21,w+2,12,MAP.ink);R(x,22,w,10,MAP.shade);R(t?x+w-w*v:x,22,w*v,10,S.hurt[t]&&(f&2)?'#fff':TEAM[t].col);
    txt(TEAM[t].name,t?x+w:x,10,TEAM[t].col,t?'right':'left',8);txt(String(S.hp[t]),t?x+w:x,35,'#fff',t?'right':'left',8);}
  const sec=Math.max(0,Math.ceil(S.tm/60));txt(String(sec),240,12,sec<=10&&S.ph==='play'&&(f&16)?'#ff5a5a':'#fff','center',16);
  // 선수 (원본 그림 1배) · 때리면 앞으로 튀어나감 · 맞은 팀은 흔들림
  const POS=[[162,1],[82,1],[318,0],[398,0]];   /* 샐쿵(가로 94)도 옆 사람과 겹치지 않는 간격 */
  /* 모션: 예비 동작(뒤로 3도트) → 펀치(앞으로 최대 16도트, 다리가 뒤로 끌림) → 복귀 · 맞은 팀은 뒤로 밀리며 하얗게 번쩍 · 대기 중엔 1도트 숨쉬기 */
  POS.forEach(([x,face],i)=>{const t=teamOf(i),a=S.anim[i],h=S.hurt[t],dir=face?1:-1,G=S.G[i];
    let off=0,fr=0,bob=((f>>5)+i)%2?-1:0;
    if(a>9)off=-3;else if(a>4)off=Math.round(16*Math.sin((10-a)/6*Math.PI/2));else if(a>0)off=Math.round(16*a/5);
    if(a>0){fr=a>9?0:3;bob=0;}
    if(h>0&&!(a>0)){off=-(h>5?5:Math.round(h));fr=h>4?5:0;bob=0;}
    if(G.st==='stun'){fr=5;off+=((f>>3)&1)?1:-1;bob=0;}
    const tint=(fr===5&&(f&4))?'#ffffff':G.st==='stun'?'#8a9ab0':null,leg=a>0&&a<=9?-dir*Math.round(off/4):h>0&&!(a>0)?dir*2:0;   /* 다리는 몸통 반대쪽으로 끌림 */
    koongWalk(i,x+dir*off,166+bob,leg,leg,0,{tint});
    if(i===me)meMark(x,96);K(GAME.slots[i]?GAME.slots[i].name.slice(0,6):'',x,172,TEAM[t].col,'center',8);});
  if(S.anim.some(a=>a>3&&a<10)){const cx=240,cy=120,r=(f>>1)%2?28:24;R(cx-10,cy-10,20,20,MAP.yellow);R(cx-6,cy-6,12,12,MAP.blue);   /* POW: 도트 격자 별 (노랑 + 파랑) */
    for(let k=1;k<=Math.round(r/4);k++){const d=10+k*4-4,sz=Math.max(2,8-k*2);R(cx-sz/2,cy-d-4,sz,4,'#fff419');R(cx-sz/2,cy+d,sz,4,'#fff419');R(cx-d-4,cy-sz/2,4,sz,'#fff419');R(cx+d,cy-sz/2,4,sz,'#fff419');
      if(k<4){const e=6+k*4;R(cx-e-4,cy-e-4,4,4,'#fff419');R(cx+e,cy-e-4,4,4,'#fff419');R(cx-e-4,cy+e,4,4,'#fff419');R(cx+e,cy+e,4,4,'#fff419');}}
    K('POW!',cx,cy-6,'#e83a3a','center',12);}
  /* 판정 글자: 사람마다 최신 2개만, 겹치지 않게 위로 쌓음 */
  [0,1,2,3].forEach(i=>{const L=S.pop.filter(p=>p.i===i).slice(-2);L.forEach((p,k)=>{const[x]=POS[i];K(p.txt,x,80-(L.length-1-k)*14-Math.round(p.t*.5),p.col,'center',p.txt.startsWith('PERFECT')?14:11);});});
  // 개인 게이지 4개
  for(let i=0;i<4;i++){const x=6+i*119,y=198,G=S.G[i],t=teamOf(i);R(x,y,113,66,i===me?MAP.yellow:MAP.ink);R(x+2,y+2,109,62,MAP.green);
    K(GAME.slots[i]?GAME.slots[i].name.slice(0,7):'',x+6,y+5,TEAM[t].col,'left',8);
    const bx=x+6,by=y+24;R(bx,by,101,14,MAP.shade);for(const[z,,,col]of [...PUN.ZONES].reverse())R(bx+50-z,by,z*2+1,14,col);
    if(G.st==='aim'){const c=punCur(G,S.f);R(bx+Math.round(c)-2,by-5,5,24,MAP.ink);R(bx+Math.round(c)-1,by-4,3,22,'#fff');}
    else if(G.st==='stun'){R(bx,by,101,14,'rgba(232,58,58,.7)');K('기절!',bx+50,by+1,'#fff','center',10);}
    if(G.last&&S.f-G.lt<40)K(G.last,x+56,y+44,G.last==='MISS'?'#ff5a5a':PUN.ZONES.find(z=>z[1]===G.last)[3],'center',10);}
  if(S.ph==='cd'){R(90,70,300,74,'rgba(42,58,72,.85)');K('쿵야 펀치!',240,78,'#fff419','center',16);K('게이지가 가운데 노란 칸에 올 때 A!',240,102,'#fff','center',11);txt(String(Math.max(1,Math.ceil(S.t/50))),240,122,'#fff','center',14);}
  if(S.ph==='end'){const w=S.hp[0]===S.hp[1]?-1:S.hp[0]>S.hp[1]?0:1;R(100,80,280,50,'rgba(42,58,72,.85)');K(w<0?'무승부!':`${TEAM[w].name} 팀 KO 승!`,240,96,w<0?'#fff':TEAM[w].col,'center',18);}}
regGame({id:'punch',title:'쿵야 펀치',icon:'③',
  ctrl:['A 버튼 하나','게이지가 가운데 <b>노란 칸</b>에 올 때 누르면 펀치','빗나가면 1초 기절'],
  gimmick:'<b>황금 펀치 타임</b> — 화면이 금색이면 데미지 2배!',
  win:'상대 팀 체력을 먼저 0으로! (60초 뒤엔 체력이 많은 팀)',
  desc:'왕복하는 게이지가 가운데에 올 때 A를 눌러 펀치!<br>정확할수록 상대 팀 체력이 크게 깎여요 · 60초 또는 KO',
  controls:{dir:false,a:true,label:'A 버튼 하나',hint:'<span class="kk">Z</span><span class="kk">Space</span> 패드 A · 휴대폰 A 버튼 — 가운데에서 딱!'},
  newSim:(s,c)=>new PunchSim(s,c),
  prep(e,S,me){if(!e.a||!S||!S.G||!S.G[me]||S.G[me].st!=='aim')return e;return{a:1,dist:Math.abs(punCur(S.G[me],S.f)-50)};},
  lerp(a,b,k){return{...b,f:a.f+(b.f-a.f)*k};},
  draw:punDraw});
