/* ┌─────────────────────────────────────────────────────────
   │ 테스트 기능 (언제든 삭제 가능) — 이 파일을 빼고 빌드하면 아래 기능이 모두 사라집니다
   │   python3 build.py --release   → 이 파일 없이 빌드
   │ 1) 혼자 연습: 서버 없이 이 기기에서 AI 3명과 대기방·게임 진행 (메인 메뉴에 버튼 추가)
   │ 2) 오프라인 방 테스트: 주소 뒤에 ?fakert=1 → Supabase 대신 같은 브라우저의 탭끼리 연결 (localhost로 열어야 함)
   │ ※ 실제 행사에서 혼자 하기는 "대기방 만들기 → 혼자 시작"(빈 자리 AI)으로 본 게임 안에서 됩니다
   └───────────────────────────────────────────────────────── */
(function(){
  const menu=document.querySelector('#scr-main .menu'),at=menu&&menu.querySelector('[data-act="settings"]');
  if(at){const b=document.createElement('div');b.className='btn fr-item';b.dataset.act='pick';b.textContent='혼자 연습 (서버 없이 · 테스트)';menu.insertBefore(b,at);}
})();
function initLocalRoom(){if(!needName())return;NET.close();LOBBY={local:true,cd:0,slots:[{id:'local',name:CFG.name,ready:false,bot:false,ch:randChar(new Set())},null,null,null]};show('lobby');renderLobby();focusMain();}   /* 캐릭터는 랜덤 고정 · READY 누르면 3초 뒤 AI 3명과 시작 */
/* 오프라인 방 테스트용 가짜 Realtime (?fakert=1): Supabase 채널과 같은 모양의 함수만 흉내 — 같은 브라우저의 탭끼리 BroadcastChannel로 주고받음 */
if(new URLSearchParams(location.search).get('fakert')){
  const bc=new BroadcastChannel('kyb-fake-rt'),chans=new Set();
  bc.onmessage=({data:m})=>{for(const c of chans)if(c.topic===m.topic&&c.joined)c._recv(m);};
  class FakeCh{
    constructor(topic,opts){this.topic=topic;this.key=opts&&opts.config&&opts.config.presence?opts.config.presence.key:null;this.h=[];this.peers={};this.me=null;this.joined=false;chans.add(this);}
    on(type,f,cb){this.h.push({type,f,cb});return this;}
    subscribe(cb){setTimeout(()=>{this.joined=true;cb&&cb('SUBSCRIBED');this._ask();},30);
      this.beat=setInterval(()=>{if(this.me)bc.postMessage({k:'p',topic:this.topic,key:this.key,meta:this.me});const n=Date.now();let ch=false;
        for(const k in this.peers)if(n-this.peers[k].at>12000){delete this.peers[k];ch=true;}if(ch)this._sync();},400);return this;}
    _ask(){bc.postMessage({k:'ask',topic:this.topic});}
    track(meta){this.me=meta;bc.postMessage({k:'p',topic:this.topic,key:this.key,meta});setTimeout(()=>this._sync(),250);return Promise.resolve('ok');}
    presenceState(){const s={};for(const k in this.peers)s[k]=[this.peers[k].meta];if(this.me&&this.key)s[this.key]=[this.me];return s;}
    _sync(){this.h.filter(x=>x.type==='presence').forEach(x=>x.cb({}));}
    _recv(m){if(m.k==='p'){const had=!!this.peers[m.key];this.peers[m.key]={meta:m.meta,at:Date.now()};if(!had)this._sync();}
      else if(m.k==='leave'){if(this.peers[m.key]){delete this.peers[m.key];this._sync();}}
      else if(m.k==='ask'){if(this.me)bc.postMessage({k:'p',topic:this.topic,key:this.key,meta:this.me});}
      else if(m.k==='b')this.h.filter(x=>x.type==='broadcast'&&x.f.event===m.event).forEach(x=>x.cb({payload:m.payload}));}
    send(o){bc.postMessage({k:'b',topic:this.topic,event:o.event,payload:o.payload});return Promise.resolve('ok');}
    httpSend(event,payload){bc.postMessage({k:'b',topic:this.topic,event,payload});return Promise.resolve({success:true});}
    unsubscribe(){if(this.key)bc.postMessage({k:'leave',topic:this.topic,key:this.key});this.joined=false;clearInterval(this.beat);chans.delete(this);return Promise.resolve('ok');}
  }
  window.__FAKE_RT={channel:(t,o)=>new FakeCh(t,o),removeChannel:c=>{try{c.unsubscribe();}catch(e){}}};
  addEventListener('beforeunload',()=>{for(const c of chans)c.unsubscribe();});
}
