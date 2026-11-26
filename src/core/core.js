/* ┌─────────────────────────────────────────────────────────
   │ KY 미니게임 배틀 공통 틀 (core)
   │ 메인 · 방 코드 · 대기방(2:2, 방장이 게임 선택) · 게임 화면 + 개인 점수표 · 결과 → 대기방 · 랭킹 · 설정
   │ 게임은 games/*.js 가 regGame({...}) 로 등록합니다 (규칙은 games/README 참고).
   └───────────────────────────────────────────────────────── */
/* GAMES · regGame 은 core/registry.js (게임 파일보다 먼저 로드) */
const GW=480,GH=270;   // 모든 게임 공통 캔버스 도트 크기 (4K 6배 · 1080p 3배)
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem('kyb_'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('kyb_'+k,JSON.stringify(v));}catch(e){}}};
/* 방 연결: Supabase Realtime (KY_Arcade 프로젝트). 바꿀 일이 있으면 이 두 줄만 수정 · 공개용(publishable) 키라 페이지에 넣어도 되는 키 */
const SB_URL='https://bocghvafjcxhgxuwwrts.supabase.co',SB_KEY='sb_publishable_0rgqKtLgUIosom5C8j_SBw_MsgdLSDb';
const SNAP_EVERY=6;   /* 방장 화면 전송 간격(프레임): 6 = 초당 10번 (무료 플랜 초당 메시지 한도 안쪽) */
const CFG={char:LS.get('char','yk'),filter:LS.get('filter',true),sound:LS.get('sound',true),name:LS.get('name','')};
const TEAM=[{name:'SKY',col:'#00ccf3'},{name:'YELLOW',col:'#fff419'}];
const teamOf=i=>i<2?0:1;
/* 맵 색: 진한 색 = 포인트, 연한 색 = 바탕 (logo_yellow · logo_blue · restaurant_floor01/02 · restaurant_wall) */
const MAP={yellow:'#fff419',blue:'#00ccf3',mint:'#a3e4d5',green:'#f6fef3',cream:'#fefcdd',shade:'#f0edc7',hi:'#fffef0',ink:'#2a3a48'};
function wallTiles(x,y,w,h){const t=IMG.tile_wall25;R(x,y,w,h,MAP.cream);if(!t||!t.complete)return;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();for(let yy=y;yy<y+h;yy+=16)for(let xx=x;xx<x+w;xx+=16)g.drawImage(t,xx,yy);g.restore();}
/* 캐릭터: big = 비율 조정한 원본 그림 (선택 화면 · 게임 속 모두 이 그림 하나) */
const CHARS=[{id:'yk',name:'양파쿵야',short:'양',big:'big_yk'},{id:'jm',name:'주먹밥쿵야',short:'주',big:'big_jm'},
  {id:'sk',name:'샐쿵',short:'샐',big:'big_sk'},{id:'mk',name:'무쿵',short:'무',big:'big_mk'},{id:'bk',name:'반계',short:'반',big:'big_bk'}];
const charOf=id=>CHARS.find(c=>c.id===id)||CHARS[0];
/* ---------- 이미지 (core/assets.js 의 CHS) ---------- */
const IMG={};for(const k in CHS){const v=CHS[k],im=new Image();im.src=typeof v==='string'?v:v.src;IMG[k]=im;}
const OUTL={};
/* 테두리(팀 색) + 색 덧칠이 들어간 스프라이트 캐시 */
function outlined(key,sx,sy,w,h,col,tint){const k=[key,sx,sy,w,h,col,tint].join();if(OUTL[k])return OUTL[k];const im=IMG[key];if(!im||!im.complete||!im.naturalWidth)return null;
  const c=document.createElement('canvas');c.width=w+2;c.height=h+2;const x=c.getContext('2d');
  const m=document.createElement('canvas');m.width=w;m.height=h;const mx=m.getContext('2d');mx.drawImage(im,sx,sy,w,h,0,0,w,h);
  if(tint){mx.globalCompositeOperation='source-atop';mx.fillStyle=tint;mx.globalAlpha=.75;mx.fillRect(0,0,w,h);mx.globalAlpha=1;}
  if(col){const s=document.createElement('canvas');s.width=w;s.height=h;const s2=s.getContext('2d');s2.drawImage(im,sx,sy,w,h,0,0,w,h);s2.globalCompositeOperation='source-in';s2.fillStyle=col;s2.fillRect(0,0,w,h);
    for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])x.drawImage(s,dx,dy);}
  x.drawImage(m,1,1);return OUTL[k]=c;}
/* 쿵야 그리기: 모든 게임에서 비율 조정한 원본 그림(big_*)을 1배로 · 팀 색 테두리 · 발 밑 가운데가 (x,y).
   o={tint:덧칠 색, a:투명도, flip} (원본은 프레임이 1장이라 움직임은 위치·다리 모션으로 표현) */
function koongC(i){const sl=GAME&&GAME.slots&&GAME.slots[i];return charOf(sl&&sl.ch||(i%2?'jm':'yk'));}
function koongCv(i,tint){const C=koongC(i),B=CHS[C.big];return outlined(C.big,0,0,B.w,B.h,TEAM[teamOf(i)].col,tint);}
function koongSize(i){const B=CHS[koongC(i).big];return{w:B.w+2,h:B.h+2};}
function koong(i,x,y,o={}){const c=koongCv(i,o.tint);if(!c)return;g.save();if(o.a!=null)g.globalAlpha=o.a;
  if(o.flip){g.translate(Math.round(x),0);g.scale(-1,1);g.drawImage(c,-Math.round(c.width/2),Math.round(y)-c.height);}
  else g.drawImage(c,Math.round(x)-Math.round(c.width/2),Math.round(y)-c.height);g.restore();}
/* 다리 정보: 아래쪽에서 두 발이 갈라져 있는 줄들(top~끝)과 두 발을 나누는 세로 줄(split) — 테두리 그림 기준, 처음 한 번만 계산 */
function legInfo(c){if(c._leg)return c._leg;
  const W=c.width,H=c.height,D=c.getContext('2d').getImageData(0,0,W,H).data,runs=y=>{const R=[];let s=-1;for(let x=0;x<=W;x++){const on=x<W&&D[(y*W+x)*4+3]>0;if(on&&s<0)s=x;if(!on&&s>=0){R.push([s,x]);s=-1;}}return R;};
  let bot=H-1;while(bot>0&&!runs(bot).length)bot--;let top=bot;while(top>0&&runs(top-1).length>=2)top--;
  const r=runs(bot),mid=W/2;let split=Math.round(mid);if(r.length>=2){let best=1e9;for(let k=0;k<r.length-1;k++){const gx=Math.round((r[k][1]+r[k+1][0])/2);if(Math.abs(gx-mid)<best){best=Math.abs(gx-mid);split=gx;}}}
  if(bot-top<2)top=Math.max(0,bot-4);return c._leg={top,bot,split};}
/* 걷는 쿵야: 몸통은 그대로, 다리만 따로 휘청 (CLOP 느낌) — 다리 줄마다 1도트씩만 어긋나게 기울여서 몸통과 다리가 끊어지지 않음.
   sw0·sw1 = 두 발 끝이 앞뒤로 나간 도트 수, st = 다리가 늘어나는 도트 수(몸통이 그만큼 들림) · 모두 정수 */
function koongWalk(i,x,y,sw0,sw1,st,o={}){const c=koongCv(i,o.tint);if(!c)return;const L=legInfo(c),X=Math.round(x)-Math.round(c.width/2),Y=Math.round(y)-c.height,lh=L.bot-L.top+1;
  st=Math.max(0,st|0);g.drawImage(c,0,0,c.width,L.top,X,Y-st,c.width,L.top);   /* 몸통 */
  const n=lh+st;for(let r=0;r<n;r++){const sy=r<st?L.top:L.top+r-st,dy=Y-st+L.top+r,k=n>1?r/(n-1):1;   /* 늘어난 만큼 다리 첫 줄을 반복 */
    for(const[sx,sw,ww]of[[0,sw0,L.split],[L.split,sw1,c.width-L.split]]){const off=Math.round(sw*k*k);g.drawImage(c,sx,sy,ww,1,X+sx+off,dy,ww,1);}}}
function meMark(x,y){R(x-3,y,7,2,'#fff419');R(x-2,y+2,5,1,'#fff419');R(x-1,y+3,3,1,'#fff419');R(x,y+4,1,1,'#fff419');}
/* ---------- 화면 맞춤: 무대 1280x720, 게임 캔버스 960x540 (도트 480x270 → 4K 6배 · 1080p 3배) ---------- */
let CS=4,FS=1;const gc=$('gc');let g=gc.getContext('2d');
/* 화면 맞춤: 항상 화면을 꽉 채움. 표준 해상도(1080p · 1440p · 4K 전체 화면)에서는 배율이 정확히 맞아 도트가 정사각형,
   그 밖의 크기(창 모드 등)는 꽉 채우는 것을 우선 — 3% 이내 차이일 때만 정수 배율로 맞춤 */
let SC=1;
function fit(){const dpr=devicePixelRatio||1,raw=Math.min(innerWidth/1280,innerHeight/720)*dpr,q=Math.floor(raw*2)/2,use=(q>=.5&&raw-q<=raw*.03)?q:raw;SC=use/dpr;
  $('stage').style.transform=`translate(-50%,-50%) scale(${SC})`;CS=Math.max(1,Math.ceil(960/GW*use-1e-6));gc.width=GW*CS;gc.height=GH*CS;g=gc.getContext('2d');g.imageSmoothingEnabled=false;}
addEventListener('resize',fit);
$('stage').addEventListener('scroll',e=>{e.target.scrollLeft=0;e.target.scrollTop=0;});addEventListener('scroll',()=>{if(scrollX||scrollY)scrollTo(0,0);});document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.scrollLeft!=null&&t!==document&&(t.scrollLeft||t.scrollTop)&&!/INPUT|TEXTAREA/.test(t.tagName)){t.scrollLeft=0;t.scrollTop=0;}},true);   /* 포커스 이동으로 화면이 밀리는 것 방지 */
function applyFilter(){$('stage').classList.toggle('nofilter',!CFG.filter);}
/* ---------- 캔버스 글자 ---------- */
function R(x,y,w,h,c){const X=Math.round(x),Y=Math.round(y);g.fillStyle=c;g.fillRect(X,Y,Math.round(x+w)-X,Math.round(y+h)-Y);}   /* 모든 사각형을 도트 격자에 맞춤 */
/* 픽셀 폰트 크기 고정: Press Start 2P 8의 배수, 갈무리9(10px) · 갈무리11(12px)의 정수배 → 글자 도트도 정사각 */
function pxFont(sz,kr,str){if(!kr){const n=sz<12?8:sz<20?16:24;return[n+'px "Press Start 2P",monospace',n];}
  if(/[^\x00-\x7F]/.test(str||'')){return sz<=18?['bold 12px Galmuri11,sans-serif',12]:['bold 24px Galmuri11,sans-serif',24];}   /* 한글: 갈무리11만 (갈무리9에는 한글이 없음) */
  if(sz<=10)return['10px Galmuri9,sans-serif',10];if(sz<=14)return['bold 12px Galmuri11,sans-serif',12];if(sz<=21)return['20px Galmuri9,sans-serif',20];return['bold 24px Galmuri11,sans-serif',24];}
function txt(s,x,y,c='#fff',al='left',sz=8,kr){const[f]=pxFont(sz,kr,String(s));g.font=f;g.textAlign='left';g.textBaseline='top';s=String(s);
  const w=Math.round(g.measureText(s).width),X=Math.round(al==='center'?x-w/2:al==='right'?x-w:x),Y=Math.round(y);   /* 가운데 정렬도 정수 위치에서 시작 */
  g.fillStyle='#000';for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])g.fillText(s,X+dx,Y+dy);g.fillStyle=c;g.fillText(s,X,Y);}
const K=(s,x,y,c,al,sz=12)=>txt(s,x,y,c,al,sz,true);
/* ---------- 소리 ---------- */
const AU=(()=>{let ac=null,master=null,bgmG=null,bgmS=null,want=false;const BUF={};
  function init(){if(ac){if(ac.state==='suspended')ac.resume();return;}try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=CFG.sound?.5:0;master.connect(ac.destination);
    bgmG=ac.createGain();bgmG.gain.value=.35;bgmG.connect(master);
    for(const k in SND){const b=Uint8Array.from(atob(SND[k]),c=>c.charCodeAt(0)).buffer;ac.decodeAudioData(b).then(x=>{BUF[k]=x;if(k==='bgm'&&want)bgm(true);}).catch(()=>{});}}catch(e){}}
  function bgm(on){want=on;if(bgmS){try{bgmS.stop();}catch(e){}bgmS=null;}if(!on||!ac||!BUF.bgm)return;bgmS=ac.createBufferSource();bgmS.buffer=BUF.bgm;bgmS.loop=true;bgmS.connect(bgmG);bgmS.start();}
  function tone(f,d,type='square',v=.06,f2){if(!ac)return;const o=ac.createOscillator(),gg=ac.createGain(),t=ac.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.linearRampToValueAtTime(f2,t+d);
    gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gg);gg.connect(master);o.start(t);o.stop(t+d);}
  function noise(d,v=.15,hp=800){if(!ac)return;const n=ac.sampleRate*d,b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),gg=ac.createGain();f.type='highpass';f.frequency.value=hp;gg.gain.value=v;s.buffer=b;s.connect(f);f.connect(gg);gg.connect(master);s.start();}
  function sample(k,v=.6){if(!ac||!BUF[k])return;const s=ac.createBufferSource(),gg=ac.createGain();gg.gain.value=v;s.buffer=BUF[k];s.connect(gg);gg.connect(master);s.start();}
  let waka=0;
  /* 게임에서 쓰는 소리 이름: 필요하면 여기에 추가 */
  const S={pickup(){waka^=1;tone(waka?520:390,.07,'square',.035);},power(){tone(300,.4,'square',.05,900);},combo(){[600,800,1000,1300].forEach((f,i)=>setTimeout(()=>tone(f,.08),i*50));},
    ouch(){sample('death',.7);},move(){tone(700,.04,'square',.03);},ok(){tone(880,.08);setTimeout(()=>tone(1320,.1),70);},start(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.12),i*110));},
    beep(){tone(660,.12);},go(){tone(990,.3);},end(){[784,659,523,392].forEach((f,i)=>setTimeout(()=>tone(f,.15,'triangle',.08),i*140));},jump(){sample('pjump',.3);},
    hit(){noise(.06,.18,1200);tone(180,.06,'square',.06,90);},big(){noise(.25,.3,300);tone(120,.25,'sawtooth',.1,40);},tap(){tone(1100,.03,'square',.025);},win(){[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.14),i*90));}};
  return{init,bgm,sfx:n=>{if(S[n])S[n]();},vol(){if(master)master.gain.value=CFG.sound?.5:0;}};})();
/* ---------- 입력: 방향(누르고 있는 마지막 방향) + A 버튼(누를 때마다) ---------- */
const DIRK={ArrowUp:1,KeyW:1,ArrowRight:2,KeyD:2,ArrowDown:3,KeyS:3,ArrowLeft:4,KeyA:4};
const AKEYS=new Set(['KeyZ','Space','KeyJ','Enter','NumpadEnter','KeyK']);
const held=new Set();
function curDir(){let d=0;for(const k of held)d=k;return d;}
addEventListener('keydown',e=>{AU.init();const inInput=e.target&&e.target.tagName==='INPUT';
  if(DIRK[e.code]&&!(inInput&&/Key[WASD]/.test(e.code))){held.delete(DIRK[e.code]);held.add(DIRK[e.code]);if(!e.repeat)onDir(DIRK[e.code]);if(!inInput)e.preventDefault();}
  if(e.repeat)return;
  if(HOLD.on&&e.code==='KeyZ'&&!inInput){e.preventDefault();holdPress('k',true);return;}   /* 진행 대기 중: Z 꾹 누르기 */
  if(screen==='game'&&AKEYS.has(e.code)){e.preventDefault();if(GAME&&GAME.intro>0)return;sendA();return;}
  if(HOW_ON&&DIRK[e.code]&&(DIRK[e.code]===2||DIRK[e.code]===4)){howFlip(DIRK[e.code]===2?1:-1);return;}
  if(e.code==='Enter'||e.code==='NumpadEnter'||(e.code==='Space'&&!inInput)||(e.code==='KeyZ'&&!inInput)){e.preventDefault();onOK();}
  else if(e.code==='Escape'||(e.code==='KeyX'&&!inInput)||(e.code==='Backspace'&&!inInput)){e.preventDefault();onBack();}});
addEventListener('keyup',e=>{if(DIRK[e.code]){held.delete(DIRK[e.code]);dirUp();}if(e.code==='KeyZ')holdPress('k',false);});
addEventListener('blur',()=>{held.clear();holdPress('k',false);});
let padPrev={};
function pollPad(){const P=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean)[0];if(!P)return;
  const b=i=>P.buttons[i]&&P.buttons[i].pressed,ax=P.axes||[];
  const now={u:b(12)||ax[1]<-.5,d:b(13)||ax[1]>.5,l:b(14)||ax[0]<-.5,r:b(15)||ax[0]>.5,a:b(0)||b(2),b:b(1),s:b(9)};
  const map={u:1,r:2,d:3,l:4};
  for(const k in map){if(now[k]&&!padPrev[k]){held.delete(map[k]);held.add(map[k]);onDir(map[k]);AU.init();}if(!now[k]&&padPrev[k]){held.delete(map[k]);dirUp();}}
  if(now.a&&!padPrev.a){AU.init();if(HOLD.on)holdPress('p',true);else if(screen==='game')sendA();else onOK();}if(!now.a&&padPrev.a)holdPress('p',false);if(now.s&&!padPrev.s&&screen!=='game')onOK();if(now.b&&!padPrev.b)onBack();padPrev=now;}
/* 터치: 십자 패드 · A 버튼 · 스와이프 */
if('ontouchstart' in window||navigator.maxTouchPoints>0)document.body.classList.add('touch');
document.querySelectorAll('#pad div').forEach(el=>{const d=+el.dataset.d;
  const on=e=>{e.preventDefault();AU.init();held.delete(d);held.add(d);el.classList.add('on');onDir(d);},off=e=>{e.preventDefault();held.delete(d);el.classList.remove('on');dirUp();};
  el.addEventListener('touchstart',on,{passive:false});el.addEventListener('touchend',off,{passive:false});el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);});
{const A=$('abtn');const on=e=>{e.preventDefault();AU.init();A.classList.add('on');if(HOLD.on)holdPress('t',true);else sendA();},off=e=>{e.preventDefault();A.classList.remove('on');holdPress('t',false);};
  A.addEventListener('touchstart',on,{passive:false});A.addEventListener('touchend',off,{passive:false});A.addEventListener('mousedown',on);A.addEventListener('mouseup',off);}
let sw=null;
gc.addEventListener('touchstart',e=>{const t=e.touches[0];sw={x:t.clientX,y:t.clientY};},{passive:true});
gc.addEventListener('touchend',()=>{sw=null;if(GDEF&&GDEF.controls.dir==='hold'){held.clear();dirUp();}},{passive:true});
gc.addEventListener('touchmove',e=>{if(!sw||!GDEF||!GDEF.controls.dir||GDEF.controls.dir==='bits')return;const t=e.touches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;if(Math.hypot(dx,dy)>24){const d=Math.abs(dx)>Math.abs(dy)?(dx>0?2:4):(dy>0?3:1);held.clear();held.add(d);onDir(d);sw={x:t.clientX,y:t.clientY};}},{passive:true});
/* ---------- 서버 연결 ---------- */
/* 방 = Realtime 채널 'kyb-room-코드'
   · 접속자 목록: Presence (먼저 들어온 플레이어가 방장)
   · 방장 → 모두: 채널 Broadcast (화면 상태 초당 10번)
   · 참가자 → 방장: 'kyb-in-코드' 채널에 REST로 보냄 (방장만 받음 → 메시지 수 절약) */
let SBC=null;
function rt(){if(window.__FAKE_RT)return window.__FAKE_RT;if(!SBC)SBC=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40}}});return SBC;}
const NET={ch:null,inCh:null,inSend:null,id:'',hostId:'',room:'',role:'player',members:[],on:false,
  connect(room,role,mode){return new Promise((res,rej)=>{this.close();this.room=room;this.role=role;this.id=Math.random().toString(36).slice(2,10);
    let c;try{c=rt();}catch(e){return rej('url');}
    const ch=c.channel('kyb-room-'+room,{config:{broadcast:{self:false,ack:false},presence:{key:this.id}}});this.ch=ch;let done=false;
    const fail=code=>{if(done)return;done=true;clearTimeout(to);this.close();rej(code);};
    const to=setTimeout(()=>fail('timeout'),9000);
    ch.on('broadcast',{event:'m'},({payload})=>{if(!this.on||!payload)return;if(payload.to&&payload.to!==this.id)return;onNet(payload);});
    ch.on('presence',{event:'sync'},()=>{const L=this.readMembers();
      if(!done){if(!L.some(m=>m.id===this.id))return;const others=L.filter(m=>m.id!==this.id);
        if(mode==='create'&&others.length)return fail('exists');
        if(mode==='join'&&!others.length)return fail('noroom');
        if(L.length>12)return fail('full');
        done=true;clearTimeout(to);this.on=true;this.inSend=c.channel('kyb-in-'+room);this.applyMembers(L);res();return;}
      if(this.on)this.applyMembers(L);});
    ch.subscribe(st=>{if(st==='SUBSCRIBED'){ch.track({name:CFG.name||'PLAYER',role,t:Date.now()});}
      else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){if(!done)fail('closed');else if(this.on&&this.ch===ch){this.on=false;onNetLost();}}});});},
  readMembers(){const st=this.ch?this.ch.presenceState():{},L=[];
    for(const k in st){const p=st[k]&&st[k][0];if(p)L.push({id:k,name:String(p.name||'PLAYER').slice(0,10),role:p.role==='spectator'?'spectator':'player',t:+p.t||0});}
    return L.sort((a,b)=>a.t-b.t||(a.id<b.id?-1:1));},
  applyMembers(L){const was=this.hostId;this.members=L.map(({id,name,role})=>({id,name,role}));
    const h=L.find(m=>m.role==='player')||L[0];this.hostId=h?h.id:'';   /* 방장 = 가장 먼저 들어온 플레이어 */
    if(this.isHost&&!this.inCh){this.inCh=rt().channel('kyb-in-'+this.room,{config:{broadcast:{self:false}}});this.inCh.on('broadcast',{event:'in'},({payload})=>{if(this.on&&payload)onNet(payload);}).subscribe();}
    onMembers(was);},
  send(o,to){if(!this.on)return;o.from=this.id;if(to)o.to=to;
    try{if(to&&to===this.hostId&&!this.isHost)this.inSend.httpSend('in',o).catch(()=>{});   /* 방장에게만: REST */
      else this.ch.send({type:'broadcast',event:'m',payload:o});}catch(e){}},
  close(){const c=SBC||window.__FAKE_RT;[this.ch,this.inCh].forEach(x=>{if(x)try{x.unsubscribe();c&&c.removeChannel&&c.removeChannel(x);}catch(e){}});this.ch=this.inCh=this.inSend=null;this.on=false;this.members=[];this.hostId='';},
  get isHost(){return !!this.id&&this.id===this.hostId;}};
/* ---------- 화면 전환 · 메뉴 ---------- */
let screen='main',sel=0;
function show(s){screen=s;document.body.classList.toggle('ingame',s==='game');document.querySelectorAll('.scr').forEach(el=>el.classList.toggle('on',el.id==='scr-'+s));sel=0;paintSel();
  const f=document.querySelector('#scr-'+s+' input[autofocus]');if(f&&!document.body.classList.contains('touch'))setTimeout(()=>f.focus(),30);else document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}
/* 화면에 보이는 버튼 위치를 기준으로 상하좌우 가장 가까운 버튼으로 이동 */
function spatialMove(d){const L=btns();if(!L.length)return;const cur=L[sel]||L[0],c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2;let best=-1,bs=1e9;
  L.forEach((b,i)=>{if(i===sel)return;const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;
    const ok=d===1?dy<-4:d===3?dy>4:d===2?dx>4:dx<-4;if(!ok)return;const along=d===1||d===3?Math.abs(dy):Math.abs(dx),side=d===1||d===3?Math.abs(dx):Math.abs(dy);if(side>along*2.5&&(d===2||d===4))return;   /* 좌우는 대각선 너머로 튀지 않게 */
    const sc=along+side*2.2;if(sc<bs){bs=sc;best=i;}});
  if(best<0&&(d===1||d===3)){best=(sel+(d===3?1:-1)+L.length)%L.length;}   /* 세로로 더 갈 곳이 없으면 순서대로 */
  if(best>=0){sel=best;paintSel();AU.sfx('move');const f=document.querySelector('#scr-'+screen+' input');if(f)f.blur();}}
function btns(){return[...document.querySelectorAll('#scr-'+screen+' .btn:not([hidden])')];}
function paintSel(){btns().forEach((b,i)=>b.classList.toggle('sel',i===sel));}
function toast(m,ms=2200){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',ms);}
document.addEventListener('click',e=>{const b=e.target.closest('.btn');if(!b)return;AU.init();const L=btns();sel=Math.max(0,L.indexOf(b));paintSel();act(b.dataset.act);});
function onOK(){if(screen==='game')return;if(screen==='char'){confirmChar();return;}if(HOW_ON){closeHow();return;}if(screen==='lobby'&&document.activeElement.tagName!=='INPUT'){lobbyOK();return;}const b=btns()[sel];if(b){AU.sfx('ok');act(b.dataset.act);}}
function onBack(){if(HOW_ON){closeHow();return;}if(screen==='main')return;if(screen==='char'){show('main');return;}if(screen==='game'){if(GAME&&GAME.local)backToRoom();return;}if(screen==='lobby'||screen==='result'){if(screen==='lobby'&&document.activeElement.tagName==='INPUT'){document.activeElement.blur();return;}leaveToMain();return;}AU.sfx('move');show('main');}
function onDir(d){if(screen==='char'){if(d===2||d===4)pickChar(charSel+(d===2?1:-1));return;}if(HOW_ON)return;if(screen==='game'){if(GDEF&&GDEF.controls.dir==='bits'){sendBits();return;}if(GDEF&&GDEF.controls.dir)sendDir(d,GDEF.controls.dir==='tap');return;}
  if(screen==='rank'&&(d===2||d===4))return;
  if(screen==='lobby'&&document.activeElement.tagName==='INPUT')return;
  if(screen!=='rank'){spatialMove(d);return;}
  if(d===1||d===3){const L=btns();if(!L.length)return;sel=(sel+(d===3?1:-1)+L.length)%L.length;paintSel();AU.sfx('move');const f=document.querySelector('#scr-'+screen+' input');if(f)f.blur();}}
function act(a){switch(a){
  case 'create':openChar('create');break;
  case 'join':openChar('join');break;
  case 'how':openHow();break;
  case 'pick':openChar('local');break;   /* 혼자 연습은 core/test.js 가 있을 때만 메뉴에 나타남 */
  case 'col0':cycleCol(0);break;
  case 'col1':cycleCol(1);break;
  case 'fs':try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}break;
  case 'settings':openSettings();break;
  case 'joinGo':joinRoom('player');break;
  case 'watch':joinRoom('spectator');break;
  case 'back':show('main');break;
  case 'team':lobbyTeam();break;
  case 'ready':lobbyReady();break;
  case 'start':lobbyStart();break;
  case 'leave':leaveToMain();break;
  case 'home':leaveToMain();break;
  case 'flt':CFG.filter=!CFG.filter;LS.set('filter',CFG.filter);applyFilter();openSettings(true);break;
  case 'snd':CFG.sound=!CFG.sound;LS.set('sound',CFG.sound);AU.vol();openSettings(true);break;
}}
/* 캐릭터 선택: 메인 → (닉네임) → 캐릭터 고르기 → 대기방 만들기 / 방 코드 입장 / 혼자 연습 */
let CHAR_NEXT=null,charSel=0;
function openChar(next){if(!needName())return;CHAR_NEXT=next;charSel=Math.max(0,CHARS.findIndex(c=>c.id===CFG.char));show('char');renderChar();}
function renderChar(){$('charList').innerHTML=CHARS.map((c,i)=>{const B=CHS[c.big];return `<div class="ch ${i===charSel?'fr-on on':'fr-item'}" data-i="${i}"><div class="chimg"><img src="${B.src}" style="width:${B.w*2}px;height:${B.h*2}px"></div><b class="ol2">${esc(c.name)}</b></div>`;}).join('');}
function pickChar(i){charSel=(i+CHARS.length)%CHARS.length;AU.sfx('move');renderChar();}
function confirmChar(){CFG.char=CHARS[charSel].id;LS.set('char',CFG.char);AU.sfx('ok');const n=CHAR_NEXT;CHAR_NEXT=null;
  if(n==='create')createRoom();else if(n==='join'){show('join');$('codeIn').value='';}else if(n==='local'&&typeof initLocalRoom==='function')initLocalRoom();}
document.addEventListener('click',e=>{const c=e.target.closest('#charList .ch');if(c){AU.init();charSel=+c.dataset.i;renderChar();confirmChar();}});
function needName(){const n=$('nameIn').value.trim().slice(0,10);if(!n){toast('닉네임을 입력해 주세요');$('nameIn').focus();return false;}CFG.name=n;LS.set('name',n);return true;}
const CODECH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function createRoom(){if(!needName())return;toast('방을 만드는 중…',8000);
  for(let i=0;i<4;i++){const code=Array.from({length:4},()=>CODECH[Math.floor(Math.random()*CODECH.length)]).join('');
    try{await NET.connect(code,'player','create');toast('방을 만들었습니다: '+code);initLobby();return;}catch(e){if(e!=='exists'){toast(netErr(e),4000);return;}}}
  toast('방 코드를 만들지 못했습니다. 다시 시도해 주세요');}
async function joinRoom(role){if(!needName())return;const code=$('codeIn').value.trim().toUpperCase();
  if(!/^[A-Z0-9]{4}$/.test(code)){toast('방 코드 4자리를 입력해 주세요');$('codeIn').focus();return;}
  toast('접속하는 중…',8000);try{await NET.connect(code,role,'join');toast(role==='spectator'?'관전으로 입장했습니다':'입장했습니다');initLobby();}catch(e){toast(netErr(e),4000);}}
function netErr(e){return{noroom:'방을 찾을 수 없습니다. 코드를 확인해 주세요',full:'방이 가득 찼습니다',exists:'같은 코드의 방이 있어 다시 만듭니다',timeout:'서버 응답이 없습니다. 잠시 후 다시 시도해 주세요',url:'서버 주소 설정 오류',closed:'서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요'}[e]||'연결 오류: '+e;}
function openSettings(keep){$('setFlt').textContent='화면 필터: '+(CFG.filter?'켬':'끔');$('setSnd').textContent='사운드: '+(CFG.sound?'켬':'끔');if(!keep)show('settings');}
/* ---------- 대기방 · 0·1번 = 팀 1, 2·3번 = 팀 2 · 온라인(방장이 관리) / 연습(LOBBY.local, 서버 없이 AI와) ---------- */
const TEAM_COLORS=['#00ccf3','#fff419','#ff5ad0','#58d838','#ff9a3a','#b48aff','#ff5a5a','#ffffff'];
const DEF_TEAMS=()=>[{name:'SKY',col:'#00ccf3'},{name:'YELLOW',col:'#fff419'}];
let LOBBY=null;const MEMCH={};   /* 접속자별 고른 캐릭터 */
const isLocal=()=>!!(LOBBY&&LOBBY.local);
const myId=()=>isLocal()?'local':NET.id;
const amHost=()=>isLocal()||NET.isHost;
function applyTeams(T){if(!T)return;[0,1].forEach(t=>{TEAM[t].name=T[t].name;TEAM[t].col=T[t].col;});}
function initLobby(){show('lobby');if(!NET.isHost)NET.send({t:'me',ch:CFG.char},NET.hostId);if(NET.isHost){LOBBY={slots:[null,null,null,null],game:0,teams:DEF_TEAMS()};syncSlots();pushLobby();}else{LOBBY=null;renderLobby();}focusMain();}
function players(){return NET.members.filter(m=>m.role==='player');}
function syncSlots(){if(!LOBBY||isLocal())return;const ids=new Set(players().map(m=>m.id));
  LOBBY.slots=LOBBY.slots.map(s=>s&&!s.bot&&!ids.has(s.id)?null:s);
  for(const m of players()){if(LOBBY.slots.some(s=>s&&s.id===m.id))continue;
    const c=[0,1].map(t=>LOBBY.slots.filter((s,i)=>s&&teamOf(i)===t).length),t=c[0]<=c[1]?0:1;
    let i=LOBBY.slots.findIndex((s,i)=>!s&&teamOf(i)===t);if(i<0)i=LOBBY.slots.findIndex(s=>!s);
    if(i>=0)LOBBY.slots[i]={id:m.id,name:m.name,ready:m.id===NET.hostId,bot:false,ch:m.id===NET.id?CFG.char:(MEMCH[m.id]||'yk')};else NET.send({t:'full'},m.id);}
  for(const s of LOBBY.slots)if(s&&s.id===NET.hostId)s.ready=true;}
function pushLobby(){if(!isLocal()&&NET.isHost)NET.send({t:'lobby',L:LOBBY});renderLobby();}
function myTeam(){const i=LOBBY?LOBBY.slots.findIndex(s=>s&&s.id===myId()):-1;return i<0?-1:teamOf(i);}
const canEditTeam=t=>amHost()||myTeam()===t;
function renderLobby(){const L=LOBBY,T=(L&&L.teams)||DEF_TEAMS();
  const hm=NET.members.find(m=>m.id===NET.hostId);
  $('lbMembers').innerHTML=isLocal()?'연습 모드 · 서버 없이 이 기기에서 AI 3명과 진행 · 빈 자리는 AI가 채웁니다':hm?'방장: '+esc(hm.name):'';
  for(const t of [0,1]){const inp=$('tn'+t);if(document.activeElement!==inp)inp.value=T[t].name;inp.disabled=!canEditTeam(t);inp.style.color=T[t].col;
    $('tc'+t).innerHTML=TEAM_COLORS.map(c=>`<i data-t="${t}" data-c="${c}" class="${c===T[t].col?'on':''}${c===T[1-t].col?' x':''}" style="background:${c}"></i>`).join('');
    $('tc'+t).classList.toggle('ro',!canEditTeam(t));$('tcb'+t).hidden=!canEditTeam(t);}
  $('gCard').innerHTML=`<div><div class="gt ol">미니게임 ${GAMES.length}종</div></div><div class="gn">게임 설명 버튼에서<br>←→로 3개 모두 보기</div>`;
  for(let i=0;i<4;i++){const el=$('slot'+i),s=L&&L.slots[i];el.className='slot '+(s&&s.id===myId()?'fr-on me':'fr-item')+(s?'':' empty');
    el.innerHTML=s?`<span class="sw" style="background:${T[teamOf(i)].col}"></span><span class="nm">${esc(s.name)}${s.id===myId()?' (나)':''} <small class="chn">${esc(charOf(s.ch).name)}</small></span><span class="st ${s.ready?'ok':'wait'}">${isLocal()?'':s.ready?'준비 완료':'대기 중'}</span>`:'Empty';}
  const host=amHost(),amP=isLocal()||NET.role==='player';$('bTeam').hidden=!amP;$('bReady').hidden=!amP||host;$('bStart').hidden=!host;
  const me=L&&L.slots.find(s=>s&&s.id===myId());$('bReady').textContent=me&&me.ready?'준비 해제':'준비';
  $('lbHint').innerHTML='<span class="kk">↑</span><span class="kk">↓</span><span class="kk">←</span><span class="kk">→</span> 버튼 이동 · <span class="kk">Enter</span> 결정'+(amP?' · 팀은 "팀 바꾸기" 버튼으로':'')+(host?' · 팀 이름 칸을 눌러 이름 입력':'');
  if(!btns()[sel])sel=0;paintSel();}
/* 처음 대기방에 들어오면 방장은 "게임 시작", 참가자는 "준비"에 커서 */
function focusMain(){const L=btns(),i=L.findIndex(b=>b.id===(amHost()?'bStart':'bReady'));sel=i<0?0:i;paintSel();}
function lobbyTeam(){if(!(isLocal()||NET.role==='player'))return;AU.sfx('move');if(amHost())hostTeam(myId());else NET.send({t:'team'},NET.hostId);}
function hostTeam(id){const i=LOBBY.slots.findIndex(s=>s&&s.id===id);if(i<0)return;const t=1-teamOf(i),j=LOBBY.slots.findIndex((s,k)=>!s&&teamOf(k)===t);
  if(j<0){if(myId()===id)toast('상대 팀 자리가 꽉 찼습니다');else NET.send({t:'msg',m:'상대 팀 자리가 꽉 찼습니다'},id);return;}LOBBY.slots[j]=LOBBY.slots[i];LOBBY.slots[i]=null;pushLobby();}
function lobbyReady(){if(NET.role!=='player'||amHost())return;AU.sfx('ok');NET.send({t:'ready'},NET.hostId);}
function lobbyOK(){const b=btns()[sel];if(b){AU.sfx('ok');act(b.dataset.act);}}
/* 팀 이름·색: 방장은 두 팀 모두, 참가자는 자기 팀만 */
function setTeam(t,o,from){const T=LOBBY.teams;if(o.col&&(o.col===T[1-t].col||!TEAM_COLORS.includes(o.col)))return;
  if(o.name!=null){o.name=String(o.name).trim().slice(0,8);if(!o.name)return;}Object.assign(T[t],o);pushLobby();}
function reqTeam(t,o){if(!LOBBY||!canEditTeam(t))return;if(amHost())setTeam(t,o);else NET.send({t:'tset',k:t,o},NET.hostId);}
function cycleCol(t){const T=LOBBY.teams;let k=TEAM_COLORS.indexOf(T[t].col);for(let n=0;n<TEAM_COLORS.length;n++){k=(k+1)%TEAM_COLORS.length;if(TEAM_COLORS[k]!==T[1-t].col)break;}AU.sfx('move');reqTeam(t,{col:TEAM_COLORS[k]});}
[0,1].forEach(t=>{const inp=$('tn'+t);inp.addEventListener('change',()=>reqTeam(t,{name:inp.value}));inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();inp.blur();reqTeam(t,{name:inp.value});}});
  $('tc'+t).addEventListener('click',e=>{const c=e.target.dataset&&e.target.dataset.c;if(c)reqTeam(t,{col:c});});});
/* 경기 = 미니게임 3판 연속 (GAMES 순서) → 3판이 모두 끝나면 최종 결과 */
let MATCH=null;
function lobbyStart(){if(!amHost())return;const nr=LOBBY.slots.filter(s=>s&&!s.bot&&!s.ready);
  if(!isLocal()&&nr.length){toast(nr.map(s=>s.name).join(', ')+' 님이 아직 준비하지 않았습니다');return;}
  const used=new Set(LOBBY.slots.filter(Boolean).map(s=>s.ch)),free=CHARS.map(c=>c.id).filter(c=>!used.has(c));
  const slots=LOBBY.slots.map((s,i)=>s||{id:0,name:'AI '+(i+1),bot:true,ready:true,ch:free.shift()||CHARS[i%2].id});applyTeams(LOBBY.teams);AU.sfx('start');
  MATCH={order:GAMES.map(G=>G.id),i:0,res:[],slots};startMatchGame();}
function matchInfo(){const w=[0,0];MATCH.res.forEach(R=>{const t=R.sc[0]===R.sc[1]?-1:R.sc[0]>R.sc[1]?0:1;if(t>=0)w[t]++;});const last=MATCH.res[MATCH.res.length-1];
  return{i:MATCH.i,n:MATCH.order.length,wins:w,last:last?{gid:last.gid,w:last.sc[0]===last.sc[1]?-1:last.sc[0]>last.sc[1]?0:1}:null};}
function startMatchGame(){const gid=MATCH.order[MATCH.i],slots=MATCH.i>0&&GAME&&GAME.slots?GAME.slots.map(s=>({...s})):MATCH.slots;
  startHost(gid,slots,isLocal());GAME.match=matchInfo();if(!isLocal()){NET.send({t:'start',slots:GAME.slots,gid,teams:LOBBY.teams,M:GAME.match});sendFull();}toGame();}
function toLobby(){GAME=null;closeHold();AU.bgm(false);if(isLocal()){show('lobby');renderLobby();focusMain();return;}
  if(NET.isHost){LOBBY.slots=LOBBY.slots.map(s=>s&&s.bot?null:s);LOBBY.slots.forEach(s=>{if(s)s.ready=s.id===NET.hostId;});syncSlots();pushLobby();}show('lobby');renderLobby();focusMain();}
function backToRoom(){if(isLocal()){toLobby();return;}if(!NET.isHost)return;NET.send({t:'tolobby'});toLobby();}
function leaveToMain(){NET.close();closeHold();GAME=null;LOBBY=null;AU.bgm(false);show('main');}
function onMembers(wasHost){
  if(GAME&&!GAME.host&&wasHost&&wasHost!==NET.hostId){toast('방장 연결이 끊겨 게임을 끝냅니다',4000);leaveToMain();return;}
  if(NET.isHost){if(!LOBBY)LOBBY={slots:[null,null,null,null],game:0,teams:DEF_TEAMS()};if(!LOBBY.teams)LOBBY.teams=DEF_TEAMS();
    if(GAME&&GAME.host){for(const s of GAME.slots)if(s.human&&!s.left&&!NET.members.some(m=>m.id===s.id)){s.bot=true;s.left=true;toast(`${s.name} 님 연결이 끊겨 AI가 대신합니다`,3000);}sendFull();}
    else{syncSlots();pushLobby();}}
  if(screen==='lobby')renderLobby();}
function onNetLost(){toast('서버 연결이 끊겼습니다',4000);if(!(GAME&&GAME.local))leaveToMain();}
function onNet(o){switch(o.t){
  case 'lobby':if(o.from===NET.hostId){const first=!LOBBY;LOBBY=o.L;if(screen==='lobby'){renderLobby();if(first)focusMain();}}break;
  case 'team':if(NET.isHost&&!GAME)hostTeam(o.from);break;
  case 'me':MEMCH[o.from]=charOf(o.ch).id;if(NET.isHost&&LOBBY){const s=LOBBY.slots.find(s=>s&&s.id===o.from);if(s){s.ch=MEMCH[o.from];pushLobby();}}break;
  case 'tset':if(NET.isHost&&!GAME&&LOBBY){const i=LOBBY.slots.findIndex(s=>s&&s.id===o.from);if(i>=0&&teamOf(i)===o.k)setTeam(o.k,o.o||{});}break;
  case 'ready':if(NET.isHost&&!GAME){const s=LOBBY.slots.find(s=>s&&s.id===o.from);if(s){s.ready=!s.ready;pushLobby();}}break;
  case 'full':toast('자리가 꽉 차서 관전으로 들어갑니다',3000);NET.role='spectator';renderLobby();break;
  case 'msg':toast(o.m);break;
  case 'start':if(o.from===NET.hostId){applyTeams(o.teams);startView(o.gid,o.slots);GAME.match=o.M;toGame();}break;
  case 'go':if(GAME&&!GAME.host)endIntro();break;
  case 'F':if(o.from!==NET.hostId)break;if(GAME&&!GAME.host&&o.gid&&o.gid!==GAME.gid&&screen!=='result'){applyTeams(o.teams);startView(o.gid,o.slots);toGame();}   /* 시작 알림을 놓쳤으면 여기서 따라감 */
    if(GAME&&!GAME.host){if(o.slots)GAME.slots=o.slots;if(GDEF.applyFull)GDEF.applyFull(GAME.pd,o.F);}
    else if(!GAME&&NET.role==='spectator'&&o.slots&&o.gid&&screen!=='result'){applyTeams(o.teams);startView(o.gid,o.slots);if(GDEF.applyFull)GDEF.applyFull(GAME.pd,o.F);toGame();}break;
  case 's':if(GAME&&!GAME.host&&o.g===GAME.gid){if(GAME.intro>0)endIntro();recvSnap(o);}break;   /* 다른 게임의 화면은 무시 */
  case 'in':if(GAME&&GAME.host){const i=GAME.slots.findIndex(s=>!s.bot&&s.id===o.from);if(i>=0)hostInput(i,o.e);}break;
  case 'final':if(o.from===NET.hostId)showFinal(o.F);break;
  case 'tolobby':if(o.from===NET.hostId)toLobby();break;
  case 'hk':if(NET.isHost&&HOLD.on){if(o.on)HOLD.ids.add(o.from);else HOLD.ids.delete(o.from);}break;   /* 참가자 → 방장: 꾹 누름 상태 */
  case 'hold':if(o.from===NET.hostId&&!HOLD.on&&o.k==='end'&&GAME&&!GAME.host&&screen==='game'&&!(GAME.intro>0))openHold('end');   /* 게임 끝 화면: 방장이 멈추면 따라서 대기 */
    if(o.from===NET.hostId&&HOLD.on&&o.k===HOLD.kind){HOLD.ids=new Set(o.ids||[]);HOLD.list=o.L||[];HOLD.p=+o.p||0;renderHold();}break;}}
/* ---------- 게임 실행 ---------- */
/* 연결이 끊긴 자리는 그 판이 끝날 때까지 AI가 대신 플레이 */
let GAME=null,GDEF=null,LASTS=null;
/* 게임 시작 전 설명창: 시간제한 없음 · MC 진행 후 모두 또는 방장이 Z(패드 A)를 꾹 누르면 시작 (GAME.intro>0 = 설명창 표시 중) */   // 방장: {host:true, sim, slots, local}  ·  다른 기기: {host:false, slots, pd, buf}
const gdef=id=>GAMES.find(G=>G.id===id)||GAMES[0];
function startHost(gid,slots,local){GDEF=gdef(gid);const sim=GDEF.newSim(slots.map(s=>({...s,human:!s.bot})),{local});GAME={host:true,local,sim,slots:sim.slots||slots,gid:GDEF.id,intro:1};}
function hostInput(i,e){GAME.sim.input(i,e);}
function startView(gid,slots){GDEF=gdef(gid);GAME={host:false,slots,gid:GDEF.id,pd:GDEF.newView?GDEF.newView():{},buf:[],intro:1};}
/* 설명창 내용: 게임별 howto · 조작 · 점수 */
/* 게임 설명: [조작] [기믹] [승리조건] 세 칸만, 한눈에 */
function howHTML(G){return `<h3 class="ol">${esc(G.title)}</h3><div class="hw"><b>조작</b><ul>${(G.ctrl||[]).map(t=>`<li>${t}</li>`).join('')}</ul></div>`+
  (G.gimmick?`<div class="hw"><b>기믹</b><p>${G.gimmick}</p></div>`:'')+`<div class="hw"><b>승리조건</b><p>${G.win||''}</p></div>`;}
function showIntro(){$('intro').hidden=false;const M=GAME&&GAME.match;
  const head=M?`<div class="intro-m">게임 ${M.i+1} / ${M.n}${M.last?` · 지난 게임 ${M.last.w<0?'무승부':esc(TEAM[M.last.w].name)+' 승'}`:''} · 현재 <b style="color:${TEAM[0].col}">${esc(TEAM[0].name)} ${M.wins[0]}</b> : <b style="color:${TEAM[1].col}">${M.wins[1]} ${esc(TEAM[1].name)}</b></div>`:'';
  $('introBody').innerHTML=head+howHTML(GDEF);openHold('intro');}
function endIntro(){if(!GAME||GAME.intro<=0)return;GAME.intro=0;$('intro').hidden=true;if(HOLD.kind==='intro')closeHold();if(GAME.host&&!GAME.local)NET.send({t:'go'});}
function sendFull(){if(GAME&&GAME.host&&!GAME.local)NET.send({t:'F',F:GDEF.full?GAME.sim.full():null,slots:GAME.slots,gid:GAME.gid,teams:[{...TEAM[0]},{...TEAM[1]}]});}
function myIndex(){if(!GAME)return-1;return GAME.slots.findIndex(s=>(s.human||!s.bot)&&(GAME.local?s.id==='local':s.id===NET.id));}
/* 입력 보내기: 게임이 prep 을 두면 "내가 본 화면" 기준으로 먼저 판정해서 보냄 (타이밍 게임의 지연 보정) */
function sendInput(e){if(!GAME||screen!=='game')return;const me=myIndex();if(me<0)return;if(GDEF.prep){e=GDEF.prep(e,LASTS,me,GAME.host?GAME.sim:GAME.pd);if(!e)return;}
  if(GAME.host)hostInput(me,e);else if(NET.role==='player')NET.send({t:'in',e},NET.hostId);}
function sendDir(d,tap){sendInput(tap?{d,tap:1}:{d});}
function dirUp(){if(screen==='game'&&GDEF&&GDEF.controls.dir==='hold')sendInput({d:curDir()});if(screen==='game'&&GDEF&&GDEF.controls.dir==='bits')sendBits();}
/* 동시에 누르는 키 상태: ◀=1 ▶=2 ↑=4 ↓=8 */
function sendBits(){let m=0;if(held.has(4))m|=1;if(held.has(2))m|=2;if(held.has(1))m|=4;if(held.has(3))m|=8;sendInput({m});}
function sendA(){if(GAME&&GAME.intro>0)return;if(GDEF&&GDEF.controls.a)sendInput({a:1});}
function recvSnap(o){if(o.ai)o.ai.forEach((v,i)=>{const s=GAME.slots[i];if(s)s.left=v===2;});if(GDEF.applyDelta)GDEF.applyDelta(GAME.pd,o.S);for(const e of o.ev||[])fx(e);o.S._at=performance.now();GAME.buf.push(o.S);if(GAME.buf.length>6)GAME.buf.shift();}
function viewState(){const b=GAME.buf;if(!b.length)return null;if(!GDEF.lerp)return b[b.length-1];const rtm=performance.now()-150;let a=b[0],c=b[b.length-1];
  for(let i=0;i<b.length-1;i++)if(b[i]._at<=rtm&&b[i+1]._at>=rtm){a=b[i];c=b[i+1];break;}
  return GDEF.lerp(a,c,c._at>a._at?clamp((rtm-a._at)/(c._at-a._at),0,1):1);}
/* 효과: 'shake:세기' 'flash' 그 밖에는 소리 이름 */
let SHAKE=0,FLASH=0;
function fx(e){if(e.startsWith('shake')){SHAKE=Math.max(SHAKE,+(e.split(':')[1]||4));return;}if(e==='flash')return;AU.sfx(e);}   /* 섬광 효과는 쓰지 않음 */
function toGame(){show('game');fit();showIntro();$('bdN0').textContent=TEAM[0].name;$('bdN1').textContent=TEAM[1].name;$('bdN0').parentNode.style.color=TEAM[0].col;$('bdN1').parentNode.style.color=TEAM[1].col;AU.bgm(GDEF.bgm!==false);$('gTitle').textContent=GDEF.title;$('gRoom').textContent=GAME&&GAME.local?'연습 모드':'ROOM '+NET.room;$('gHint').innerHTML=GDEF.controls.hint||'';
  document.body.classList.toggle('needA',!!GDEF.controls.a);document.body.classList.toggle('needDir',!!GDEF.controls.dir);buildBoard();}
/* ---------- 대기방 게임 설명: 예시 화면(AI 4명 데모) + 설명 ---------- */
let HOW_ON=false,HOW=null;const hc=$('howCv');
let HOW_I=0;
function howFlip(d){HOW_I=(HOW_I+d+GAMES.length)%GAMES.length;AU.sfx('move');openHow(true);}
function openHow(keep){if(!keep)HOW_I=0;const G=GAMES[HOW_I];HOW_ON=true;$('how').hidden=false;$('howBody').innerHTML=`<div class="intro-m">◀ ${HOW_I+1} / ${GAMES.length} ▶ (←→로 넘기기)</div>`+howHTML(G);
  const slots=[0,1,2,3].map(i=>({id:0,name:charOf(CHARS[i%CHARS.length].id).name,bot:true,ch:CHARS[i%CHARS.length].id}));HOW={G,sim:demoSim(G,slots),slots,t:performance.now()};
  const q=SC*(devicePixelRatio||1);HOW.cs=Math.max(1,Math.ceil(640/GW*q-1e-6));hc.width=GW*HOW.cs;hc.height=GH*HOW.cs;hc.style.width='640px';hc.style.height='360px';}
/* 예시 화면은 카운트다운 없이 바로 플레이 장면부터 (demoSkip: 첫 장면이 빌 때 미리 돌려 둘 프레임 수) */
function demoSim(G,slots){const m=G.newSim(slots.map(s=>({...s})),{local:true,demo:true});if(m.ph==='cd')m.t=1;for(let k=0;k<(G.demoSkip||0);k++){m.step();if(m.ev)m.ev.length=0;}return m;}
function closeHow(){HOW_ON=false;HOW=null;$('how').hidden=true;}
function howTick(now){if(!HOW_ON||!HOW)return;let n=Math.min(4,Math.floor((now-HOW.t)/16.67));HOW.t+=n*16.67;const sim=HOW.sim;
  while(n-->0){sim.step();if(sim.ev)sim.ev.length=0;if(sim.done){HOW.sim=demoSim(HOW.G,HOW.slots);break;}}
  const og=g,ocs=CS,oG=GAME,oD=GDEF;g=hc.getContext('2d');CS=HOW.cs;GAME={slots:HOW.slots};GDEF=HOW.G;   /* 같은 그리기 함수를 미리보기 캔버스에 */
  try{g.setTransform(CS,0,0,CS,0,0);g.imageSmoothingEnabled=false;HOW.G.draw(g,HOW.sim.snap(false),HOW.sim.pd||HOW.sim,-1,now/16.67|0);}finally{g=og;CS=ocs;GAME=oG;GDEF=oD;}}
/* ---------- 개인 점수표 (게임 화면 옆): 위에서부터 남은 시간 · 팀 점수 · 실시간 개인 순위 ---------- */
/* 점수 자릿수가 늘어 칸을 넘으면 글자를 8의 배수(Press Start 2P 도트 크기)로 줄임 */
function fitText(el,max,min){let z=max;el.style.fontSize=z+'px';while(z>min&&el.scrollWidth>el.clientWidth+1){z=z>16?16:z>12?12:z-2;el.style.fontSize=z+'px';}}
let BOARD_T=0;
function buildBoard(){$('bdRows').innerHTML=[0,1,2,3].map(i=>`<div class="bd-row" id="bd${i}" style="transform:translateY(${i*62}px)"><b class="rk">${i+1}</b><span class="sw" style="background:${TEAM[teamOf(i)].col}"></span><span class="nm">${esc(GAME&&GAME.slots[i]?GAME.slots[i].name:"")}</span><span class="tg"></span><span class="pt"></span></div>`).join('');}
function updBoard(S){if(!S||!S.ps)return;const now=performance.now();if(now-BOARD_T<100)return;BOARD_T=now;const me=myIndex();
  const order=[0,1,2,3].sort((a,b)=>S.ps[b]-S.ps[a]||a-b);
  order.forEach((i,r)=>{const el=$('bd'+i),s=GAME.slots[i];el.style.transform=`translateY(${r*62}px)`;el.classList.toggle('me',i===me);el.classList.toggle('top',r===0&&S.ps[i]>0);
    const sub=s&&s.left?'연결 끊김 · AI 대행':S.tag?S.tag[i]||'':'';el.classList.toggle('ai',!!(s&&s.left));
    el.querySelector('.rk').textContent=r+1;el.querySelector('.nm').textContent=s?s.name:'';el.querySelector('.tg').textContent=sub;
    const pt=el.querySelector('.pt'),v=S.ps[i];if(pt.dataset.v!==String(v)){pt.dataset.v=v;pt.textContent=v.toLocaleString();fitText(pt,14,8);el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}});
  [0,1].forEach(t=>{const el=$('bdT'+t),v=S.sc[t].toLocaleString();if(el.textContent!==v){el.textContent=v;fitText(el,20,8);}});
  const sec=Math.max(0,Math.ceil((S.tm||0)/60));$('bdTime').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
/* ---------- 결과 ---------- */
let LAST_RESULT=null;
function finishHost(){const R=GAME.sim.result();R.gid=GAME.gid;MATCH.res.push(R);
  if(MATCH.i<MATCH.order.length-1){MATCH.i++;startMatchGame();return;}   /* 다음 게임 (시작 전 설명창에 현재 승수 표시) */
  const F=finalResult();if(!isLocal())NET.send({t:'final',F});showFinal(F);}
/* 최종 결과: 게임마다 이긴 팀 1승 · 동점이면 마지막 게임 승자 · MVP = 게임별 개인 1위 횟수 (같으면 마지막 게임 순위) */
function finalResult(){const res=MATCH.res,w=[0,0],first=[0,0,0,0],tot=[0,0];
  const games=res.map(R=>{const t=R.sc[0]===R.sc[1]?-1:R.sc[0]>R.sc[1]?0:1;if(t>=0)w[t]++;tot[0]+=R.sc[0];tot[1]+=R.sc[1];let top=[0,1,2,3].sort((a,b)=>R.ps[b]-R.ps[a])[0];if(!(R.ps[top]>0))top=-1;else first[top]++;   /* 모두 0점이면 1위 없음 */
    return{gid:R.gid,w:t,sc:R.sc,ps:R.ps,top};});
  const last=games[games.length-1];let win=w[0]===w[1]?(last?last.w:-1):w[0]>w[1]?0:1;
  const lastRank=[0,1,2,3].sort((a,b)=>last.ps[b]-last.ps[a]),mvp=[0,1,2,3].sort((a,b)=>first[b]-first[a]||lastRank.indexOf(a)-lastRank.indexOf(b))[0];
  return{games,wins:w,win,first,mvp,tot,teams:[{...TEAM[0]},{...TEAM[1]}],slots:GAME.slots.map(s=>({name:s.name,ch:s.ch,bot:!s.human})),local:isLocal()};}
function showFinal(F){applyTeams(F.teams);LAST_RESULT=F;AU.bgm(false);AU.sfx('win');show('result');const w=F.win;
  $('resTitle').textContent=w<0?'무승부!':`${TEAM[w].name} 팀 우승!`;$('resGame').textContent=`미니게임 ${F.games.length}판 결과 · ${F.wins[0]} : ${F.wins[1]}`;
  $('resBox').innerHTML=[0,1].map(t=>`<div class="tb fr${w===t?'-on win':''} t${t}"><div style="color:${TEAM[t].col}" class="${w===t?'':'ol2'}">${esc(TEAM[t].name)}</div><div class="sc">${F.wins[t]}승</div>
    <div class="nm">${F.slots.filter((s,i)=>teamOf(i)===t).map(s=>esc(s.name)).join(' & ')}</div>
    <div class="rd">${F.games.map(g=>`${esc(gdef(g.gid).title)} ${g.w===t?'승':g.w<0?'무':'패'} (${g.sc[t].toLocaleString()})`).join('<br>')}</div></div>`).join('');
  $('resPs').innerHTML=`<span class="mvp"><i style="background:${TEAM[teamOf(F.mvp)].col}"></i>MVP ${esc(F.slots[F.mvp].name)} · 게임별 1위 ${F.first[F.mvp]}회</span>`+
    F.games.filter(g=>g.top>=0).map(g=>`<span><i style="background:${TEAM[teamOf(g.top)].col}"></i>${esc(gdef(g.gid).title)} 1위 ${esc(F.slots[g.top].name)}</span>`).join('');
  $('resNote').textContent=F.local?'Z · 패드 A 를 꾹 누르면 대기방으로 돌아갑니다':'모두 또는 방장이 Z · 패드 A 를 꾹 누르면 대기방으로 돌아갑니다';
  openHold('result');if(GAME&&GAME.local)GAME=null;MATCH=null;}
/* ---------- 꾹 누르기 진행 (MC 진행 시간 확보): 게임 시작 전 설명창 · 최종 결과 화면
   모두(사람 플레이어 전원) 또는 방장이 Z(패드 A · 터치는 A 버튼/우측 하단 칸)를 HOLD_SEC 초 동안 누르고 있으면 다음으로.
   누르는 사람은 우측 하단에 실시간 표시 · 판정은 방장 기기에서 하고 모두에게 알림 ---------- */
const HOLD_SEC=1.5;
const HOLD={on:false,kind:'',ids:new Set(),list:[],p:0,me:false,src:new Set(),sig:'',sentAt:0,dom:''};
function gateList(){if(GAME&&GAME.slots&&GAME.host)return GAME.slots.filter(s=>s.human&&!s.left).map(s=>({id:s.id,name:s.name}));return HOLD.list;}
function openHold(kind){Object.assign(HOLD,{on:true,kind,ids:new Set(),p:0,me:false,sig:'',sentAt:0,dom:''});HOLD.src.clear();HOLD.list=amHost()?gateList():[];renderHold();}
function closeHold(){HOLD.on=false;HOLD.kind='';HOLD.me=false;HOLD.src.clear();renderHold();}
function holdPress(src,on){if(on)HOLD.src.add(src);else HOLD.src.delete(src);const me=HOLD.src.size>0;if(me===HOLD.me)return;HOLD.me=me;if(!HOLD.on)return;
  if(amHost()){if(me)HOLD.ids.add(myId());else HOLD.ids.delete(myId());}else if(NET.role==='player')NET.send({t:'hk',on:me?1:0},NET.hostId);renderHold();}
function holdTick(dt){if(!HOLD.on||!amHost())return;HOLD.list=gateList();const ids=HOLD.ids,ok=ids.has(myId())||(HOLD.list.length>0&&HOLD.list.every(m=>ids.has(m.id)));
  HOLD.p=ok?HOLD.p+dt/1000/HOLD_SEC:0;
  if(HOLD.p>=1){const k=HOLD.kind;HOLD.p=1;holdSync(true);closeHold();AU.sfx('ok');if(k==='intro')endIntro();else if(k==='end')finishHost();else if(k==='result')backToRoom();return;}
  holdSync(false);renderHold();}
function holdSync(force){if(isLocal()||!NET.on)return;const now=performance.now(),sig=[...HOLD.ids].sort().join()+'|'+HOLD.list.map(m=>m.id).join()+'|'+(HOLD.p>0);
  if(!force&&sig===HOLD.sig&&now-HOLD.sentAt<(HOLD.p>0?120:1000))return;HOLD.sig=sig;HOLD.sentAt=now;NET.send({t:'hold',k:HOLD.kind,ids:[...HOLD.ids],L:HOLD.list,p:Math.round(HOLD.p*100)/100});}
function renderHold(){const el=$('hold');if(!HOLD.on){el.hidden=true;return;}el.hidden=false;$('holdBar').style.width=Math.min(100,HOLD.p*100)+'%';
  const me=myId(),host=isLocal()?'local':NET.hostId,
    h=`<div class="hd-t">${HOLD.kind==='intro'?'게임 시작':HOLD.kind==='end'?(GAME&&GAME.match&&GAME.match.i+1>=GAME.match.n?'최종 결과':'다음 게임'):'대기방으로'} · Z · A 꾹 누르기</div>`+(isLocal()?'':'<div class="hd-s">모두 또는 방장이 누르면 진행</div>')+
      HOLD.list.map(m=>{const on=HOLD.ids.has(m.id)||(m.id===me&&HOLD.me);return `<div class="hl${on?' on':''}"><span class="nm">${esc(m.name)}${m.id===host?' <small>방장</small>':''}${m.id===me?' (나)':''}</span><b>${on?'누르는 중':'대기'}</b></div>`;}).join('');
  if(h!==HOLD.dom){HOLD.dom=h;$('holdList').innerHTML=h;}}
{const el=$('hold'),on=e=>{e.preventDefault();AU.init();holdPress('m',true);},off=()=>holdPress('m',false);
  el.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>el.addEventListener(t,off));}
/* ---------- 메인 루프 ---------- */
let acc=0,lastT=performance.now(),FR=0;
function loop(now){requestAnimationFrame(loop);pollPad();howTick(now);const dt=Math.min(100,now-lastT);lastT=now;holdTick(dt);if(screen!=='game'||!GAME)return;
  let S;
  if(GAME.intro>0){   /* 설명창: 시간제한 없이 꾹 누르기(HOLD)로 시작 */
    const S0=GAME.host?GAME.sim.snap(false):viewState();if(S0){LASTS=S0;draw(S0,GAME.host?(GAME.sim.pd||GAME.sim):GAME.pd);}else{g.setTransform(CS,0,0,CS,0,0);R(0,0,GW,GH,'#000');}return;}
  if(GAME.host&&GAME.ended){S=GAME.sim.snap(false);LASTS=S;draw(S,GAME.sim.pd||GAME.sim);updBoard(S);return;}   /* 게임 끝 화면에서 멈춤 · 꾹 누르기로 다음 */
  if(GAME.host){acc+=dt;while(acc>=1000/60){acc-=1000/60;
      const sim=GAME.sim;sim.step();const ev=sim.ev||[];for(const e of ev)fx(e);
      if(!GAME.local){GAME.evq=(GAME.evq||[]).concat(ev);if(++FR%SNAP_EVERY===0){NET.send({t:'s',g:GAME.gid,S:sim.snap(true),ev:GAME.evq,ai:GAME.slots.map(s=>s.left?2:0)});GAME.evq=[];}}
      if(sim.ev)sim.ev.length=0;
      if(sim.done){GAME.ended=true;acc=0;if(!GAME.local)NET.send({t:'s',g:GAME.gid,S:sim.snap(true),ev:GAME.evq||[],ai:GAME.slots.map(s=>s.left?2:0)});GAME.evq=[];openHold('end');holdSync(true);return;}}
    S=GAME.sim.snap(false);LASTS=S;draw(S,GAME.sim.pd||GAME.sim);}
  else{S=viewState();if(S){LASTS=S;draw(S,GAME.pd);}else{g.setTransform(CS,0,0,CS,0,0);R(0,0,GW,GH,'#000');K('방장의 화면을 받는 중…',GW/2,GH/2,'#fff','center',12);}}
  updBoard(S);}
function draw(S,pd){const f=performance.now()/16.67|0;g.setTransform(CS,0,0,CS,0,0);g.imageSmoothingEnabled=false;
  if(SHAKE>0){g.translate(Math.round((Math.random()*2-1)*SHAKE),Math.round((Math.random()*2-1)*SHAKE));SHAKE=SHAKE>.5?SHAKE*.82:0;}
  GDEF.draw(g,S,pd,myIndex(),f);}
/* ---------- 시작 ---------- */
$('logoImg').src=LOGO;$('nameIn').value=CFG.name;
applyFilter();fit();show('main');requestAnimationFrame(loop);
setInterval(()=>{$('netst').textContent=NET.on?`ROOM ${NET.room}`:isLocal()&&screen==='lobby'?'연습 모드':'';},500);
