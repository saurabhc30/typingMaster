/* TypingMeter Speed Rush - 2 to 10 player multiplayer word-by-word competition. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const lobby=$('lobby'),waiting=$('waiting'),ready=$('ready'),battle=$('battle'),result=$('result');
  const playerNameInput=$('playerName'),roomInput=$('roomInput'),createBtn=$('createBtn'),quickBtn=$('quickBtn'),joinBtn=$('joinBtn'),cancelBtn=$('cancelBtn'),copyBtn=$('copyBtn');
  const lobbyStatus=$('lobbyStatus'),waitingStatus=$('waitingStatus'),roomCodeEl=$('roomCode'),readyRoomCode=$('readyRoomCode'),readyYou=$('readyYou'),readyDuration=$('readyDuration'),readyBtn=$('readyBtn'),readyStatus=$('readyStatus'),readyPlayers=$('readyPlayers');
  const timeEl=$('time'),wpmEl=$('wpm'),accuracyEl=$('accuracy'),scoreEl=$('score'),progressEl=$('progress'),liveStatus=$('liveStatus'),targetEl=$('target'),inputEl=$('input'),youNameEl=$('youName'),leaderboardTime=$('leaderboardTime'),liveLeaderboard=$('liveLeaderboard');
  const resultTitle=$('resultTitle'),resultSubtitle=$('resultSubtitle'),finalWpm=$('finalWpm'),finalAccuracy=$('finalAccuracy'),finalScore=$('finalScore'),finalOpponentWpm=$('finalOpponentWpm'),rematchBtn=$('rematchBtn'),exitBtn=$('exitBtn'),resultLeaderboard=$('resultLeaderboard');

  const DEFAULT_DURATION=30, DEFAULT_PLAYERS=2, MAX_PLAYERS=10;
  const NAME_KEY='typingmeterSpeedRushPlayerName';
  let duration=DEFAULT_DURATION, playerCount=DEFAULT_PLAYERS;
  let playerName=localStorage.getItem(NAME_KEY)||'';
  let peer=null, isHost=false, quickMatch=false, matchmakingSocket=null, roomCode='';
  let hostPeerId='', localPeerId='', connections=new Map(), players=new Map();
  let localReady=false, running=false, finished=false, startAt=0,endAt=0,raf=0,timer=null,progressSendTimer=null;
  let currentRoundId='', currentRoundPacket=null, startWatchdog=null;
  let wordList=[], currentWordIndex=0, currentWord='', correctChars=0, errors=0, score=0, wordsTyped=0, attemptedWords=0, correctWords=0;
  let localProgress={wpm:0,accuracy:100,score:0,words:0,finished:false};
  let localRematch=false;

  if(playerNameInput) playerNameInput.value=playerName;
  function show(panel){[lobby,waiting,ready,battle,result].forEach(x=>x.hidden=x!==panel)}
  function safeName(v){return String(v||'Player').replace(/\s+/g,' ').trim().slice(0,20)||'Player'}
  function getName(){playerName=safeName(playerNameInput.value);localStorage.setItem(NAME_KEY,playerName);return playerName}
  function setStatus(text){lobbyStatus.textContent=text}
  function randomCode(){return Math.random().toString(36).slice(2,8).toUpperCase()}
  function matchmakingUrl(){return String(window.TYPINGMETER_MATCHMAKING_URL||'').trim()}
  function urlForSocket(raw){const u=new URL(raw);u.protocol=u.protocol==='https:'?'wss:':'ws:';return u.toString()}
  function cleanupMatchmaking(){try{matchmakingSocket?.close()}catch(_){}matchmakingSocket=null}
  function sendTo(peerId,data){const c=connections.get(peerId);try{if(c?.open)c.send(data)}catch(_) {}}
  function broadcast(data,except=''){for(const [id,c] of connections){if(id!==except)try{if(c?.open)c.send(data)}catch(_) {}}}
  function cleanupPeer(){clearTimeout(startWatchdog);startWatchdog=null;for(const c of connections.values()){try{c.close()}catch(_) {}}connections.clear();try{peer?.destroy()}catch(_){}peer=null;cleanupMatchmaking();players.clear();hostPeerId='';localPeerId='';isHost=false;localReady=false;currentRoundId='';currentRoundPacket=null;}

  // Fixed word sequences. Every round uses a deterministic sequence; players in
  // the same round receive the exact same array from the host.
  const SPEED_RUSH_WORDS = {
    easy: [
      "apple", "book", "chair", "table", "house", "water", "light", "green", "happy", "smile", "music", "phone", "school", "friend", "family", "window", "garden", "morning", "summer", "simple", "quick", "clean", "small", "large", "young", "world", "people", "place", "work", "play", "game", "time", "day", "night", "road", "river", "strong", "basic", "common", "little", "right", "left", "open", "close", "start", "finish", "learn", "type", "word", "speed", "focus", "practice", "keyboard", "finger", "hand", "eye", "read", "write", "tree", "cloud", "rain", "bread", "coffee", "paper", "pencil", "desk", "room", "door", "street", "city", "train", "car", "bus", "beach", "mountain", "forest", "animal", "bird", "cat", "dog", "fish", "ball", "jump", "run", "walk", "talk", "listen", "watch", "think", "learn", "teach", "help", "kind", "bright", "dark", "warm", "cool", "fast", "slow", "early", "late", "today", "tomorrow", "yesterday", "family", "friend", "teacher", "student", "parent", "child", "color", "red", "blue", "yellow", "orange", "purple", "white", "black", "brown"
    ],
    medium: [
      "accuracy", "rhythm", "control", "improve", "keyboard", "practice", "consistent", "movement", "attention", "concentration", "challenge", "familiar", "difficult", "pattern", "correct", "mistake", "steady", "progress", "confidence", "technique", "efficient", "posture", "natural", "reliable", "performance", "transfer", "assignment", "document", "message", "sentence", "vocabulary", "competition", "opponent", "strategy", "result", "measure", "session", "habit", "ability", "develop", "respond", "visual", "processing", "coordination", "memory", "punctuation", "number", "uncommon", "gradually", "maintain", "pressure", "recover", "hesitate", "repeated", "comfortable", "shoulders", "wrists", "foundation", "dependable", "discover", "analyze", "target", "weakness", "adapt", "material", "varied", "sequence", "timing", "precision", "reaction", "focus", "clarity", "balance", "control", "response", "fluent", "flexible", "deliberate", "complex", "context", "estimate", "compare", "identify", "organize", "review", "improve", "monitor", "adjust", "stable", "accurate", "smooth", "deliberate", "frequent", "occasional", "demanding", "advanced", "capable", "skilled", "effort", "patience", "learning", "progress", "typing", "reading", "writing", "editing", "communication", "computer", "interface", "cursor", "shortcut", "command", "browser", "content", "research", "system", "process", "project", "method", "result", "quality", "speed", "error", "correction"
    ],
    hard: [
      "algorithm", "architecture", "asynchronous", "benchmark", "complexity", "concurrency", "abstraction", "optimization", "deterministic", "synchronization", "latency", "throughput", "encryption", "validation", "resilience", "distributed", "protocol", "compiler", "recursion", "iteration", "serialization", "database", "transaction", "virtualized", "infrastructure", "interoperability", "cryptography", "typography", "semantics", "precision", "consistency", "implementation", "deployment", "configuration", "dependency", "observability", "telemetry", "authorization", "authentication", "scalability", "maintainability", "modularity", "encapsulation", "polymorphism", "inheritance", "heuristic", "probabilistic", "computational", "linguistic", "neurological", "coordination", "methodology", "quantitative", "qualitative", "analytical", "experimental", "theoretical", "empirical", "algorithmic", "computational", "structural", "architectural", "concurrent", "parallelization", "serialization", "deserialization", "microservices", "orchestration", "virtualization", "containerization", "compiler", "runtime", "middleware", "bandwidth", "throughput", "reliability", "faulttolerance", "consistency", "availability", "partitioning", "replication", "sharding", "indexing", "query", "optimizer", "cryptographic", "hashing", "signatures", "certificates", "protocol", "negotiation", "serialization", "parsing", "lexical", "grammatical", "semantic", "syntactic", "morphology", "phonetics", "cognitive", "perception", "attention", "reaction", "calibration", "instrumentation", "telemetry", "diagnostics", "profiling", "benchmarking", "regression", "refactoring", "dependency", "injection", "abstraction", "interface", "inheritance", "composition", "generics", "concurrency", "locking", "deadlock", "starvation", "scheduling", "memory", "allocation", "garbage", "collection", "compilation", "interpretation", "optimization", "numerical", "statistical", "deterministic", "reproducible", "verification", "testing", "validation", "integration", "automation", "deployment", "observability"
    ],
  };

  function chooseWords(){
    const level = window.speedRushDifficulty || 'easy';
    const source = SPEED_RUSH_WORDS[level] || SPEED_RUSH_WORDS.easy;
    // Deterministic: never shuffle or randomly choose a source. Every round
    // of the same level starts with exactly the same word #1, #2, #3...
    // and all players receive this exact array from the host.
    const out = [];
    for (let i = 0; i < 180; i++) out.push(source[i % source.length]);
    return out;
  }
  function setCurrentWord(){
    currentWord=wordList[currentWordIndex]||'finish';
    targetEl.textContent=currentWord;
    inputEl.value='';
    inputEl.focus();
  }
  function resetStats(){
    correctChars=0;errors=0;score=0;wordsTyped=0;attemptedWords=0;correctWords=0;currentWordIndex=0;currentWord='';localProgress={wpm:0,accuracy:0,score:0,words:0,finished:false};
    inputEl.value='';timeEl.textContent=duration;wpmEl.textContent='0';accuracyEl.textContent='0%';scoreEl.textContent='0';progressEl.style.width='100%';
  }
  function metrics(now=Date.now()){
    const elapsed=Math.max(.001,(now-startAt)/1000);
    const wpm=Math.round((correctChars/5)/(elapsed/60));
    const accuracy=attemptedWords?Math.round((correctWords/attemptedWords)*100):0;
    return {wpm:Number.isFinite(wpm)?wpm:0,accuracy,elapsed};
  }
  function updateLocal(now=Date.now()){
    if(!running)return;
    const remain=Math.max(0,endAt-now),m=metrics(now);
    localProgress={...localProgress,wpm:m.wpm,accuracy:m.accuracy,score,words:wordsTyped};
    const me=players.get(localPeerId); if(me) Object.assign(me,localProgress,{name:playerName});
    timeEl.textContent=Math.ceil(remain/1000);leaderboardTime.textContent=Math.ceil(remain/1000)+'s';wpmEl.textContent=m.wpm;accuracyEl.textContent=m.accuracy+'%';scoreEl.textContent=score;
    progressEl.style.width=Math.max(0,remain/(duration*1000)*100)+'%';
    renderLeaderboards();
  }
  function sendProgress(){
    const me=players.get(localPeerId);if(me)Object.assign(me,localProgress);
    broadcast({type:'progress',peerId:localPeerId,name:playerName,wpm:localProgress.wpm,accuracy:localProgress.accuracy,score:localProgress.score,words:localProgress.words||0,finished:localProgress.finished});
  }
  function sortedPlayers(){return [...players.values()].sort((a,b)=>(b.wpm||0)-(a.wpm||0)||(b.accuracy||0)-(a.accuracy||0))}
  function renderPlayerList(){
    const list=sortedPlayers();
    readyPlayers.innerHTML=list.map((p,i)=>`<div class="player-chip"><span>${i+1}</span><strong>${escapeHtml(p.name)}${p.peerId===localPeerId?' <em>YOU</em>':''}</strong><small>${p.ready?'Ready':'Waiting'}</small></div>`).join('');
    readyStatus.textContent=list.length<playerCount?`Waiting for players: ${list.length}/${playerCount} connected.`:(list.every(p=>p.ready)?'Everyone is ready — starting…':`${list.filter(p=>p.ready).length}/${list.length} players are ready.`);
  }
  function renderLeaderboards(){
    const list=sortedPlayers();
    liveLeaderboard.innerHTML=list.map((p,i)=>`<div class="leader-row ${p.peerId===localPeerId?'me':''}"><span><b>#${i+1}</b> ${escapeHtml(p.name)}${p.peerId===localPeerId?' <em>YOU</em>':''}</span><strong>${p.wpm||0} WPM · ${p.words||0} words</strong></div>`).join('');
  }
  function renderResult(){
    const list=sortedPlayers(),mine=players.get(localPeerId)||localProgress,rank=Math.max(1,list.findIndex(p=>p.peerId===localPeerId)+1);
    finalWpm.textContent=mine.wpm||0;finalAccuracy.textContent=(mine.accuracy??0)+'%';finalScore.textContent=mine.score||0;
    finalOpponentWpm.textContent=list.find(p=>p.peerId!==localPeerId)?.wpm||0;
    if(rank===1) resultTitle.textContent='🏆 You Win!'; else resultTitle.textContent=`#${rank} — Speed Rush Complete`;
    resultSubtitle.textContent=list.length>1?`${list.length} players competed. Higher WPM ranks first; accuracy breaks ties.`:'Round complete.';
    resultLeaderboard.innerHTML=list.map((p,i)=>`<div class="leader-row ${p.peerId===localPeerId?'me':''}"><span><b>#${i+1}</b> ${escapeHtml(p.name)}${p.peerId===localPeerId?' <em>YOU</em>':''}</span><strong>${p.wpm||0} WPM · ${p.words||0} words · ${p.accuracy??0}%</strong></div>`).join('');
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function prepareRound(text,roundDuration,startTimestamp,roundId=''){
    if(roundId && currentRoundId===roundId && (running || battle.hidden===false)) return;
    if(roundId) currentRoundId=roundId;
    clearTimeout(startWatchdog);startWatchdog=null;
    duration=Number(roundDuration)||DEFAULT_DURATION;
    wordList=Array.isArray(text)&&text.length?text:chooseWords();
    startAt=Number(startTimestamp)||Date.now()+4000;
    endAt=startAt+duration*1000;
    resetStats();setCurrentWord();show(battle);inputEl.disabled=true;
    liveStatus.textContent='Get ready…';
    requestAnimationFrame(waitForStart);
  }
  function waitForStart(){
    if(!wordList.length) return;
    const now=Date.now();
    if(now>=startAt){
      running=true; finished=false; inputEl.disabled=false; inputEl.focus();
      liveStatus.textContent='GO! Keep your speed high.'; startTimers(); return;
    }
    liveStatus.textContent='Starting in '+Math.max(1,Math.ceil((startAt-now)/1000))+'…';
    raf=requestAnimationFrame(waitForStart);
  }
  function startTimers(){clearInterval(timer);clearInterval(progressSendTimer);timer=setInterval(()=>{const now=Date.now();updateLocal(now);if(now>=endAt)finishRound()},50);progressSendTimer=setInterval(sendProgress,150);updateLocal()}
  function finishRound(){if(!running&&!finished)return;
    // A partially typed current word counts as an attempted word but is not
    // a correct word. If no word was completed, accuracy is therefore 0%.
    if(inputEl.value && inputEl.value!==currentWord) attemptedWords++;
    running=false;finished=true;clearInterval(timer);clearInterval(progressSendTimer);cancelAnimationFrame(raf);inputEl.disabled=true;const m=metrics(endAt);localProgress={...localProgress,wpm:m.wpm,accuracy:m.accuracy,score,finished:true};const me=players.get(localPeerId);if(me)Object.assign(me,localProgress);sendProgress();timeEl.textContent='0';leaderboardTime.textContent='0s';progressEl.style.width='0%';renderResult();show(result)}

  function setRoundDuration(v){if(![30,60,120].includes(v))return;duration=v;document.querySelectorAll('#timeOptions .option-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.time)===duration));readyDuration.textContent=duration+' seconds'}
  function setPlayerCount(v){v=Math.max(2,Math.min(MAX_PLAYERS,Number(v)||2));playerCount=v;document.querySelectorAll('#playerOptions .option-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.players)===playerCount));}
  function rosterPayload(){return{type:'roster',players:[...players.values()].map(p=>({peerId:p.peerId,name:p.name,ready:!!p.ready,wpm:p.wpm||0,accuracy:p.accuracy??0,score:p.score||0,words:p.words||0,finished:!!p.finished}))}}
  function broadcastRoster(){renderPlayerList();broadcast(rosterPayload())}
  function addPlayer(peerId,name,readyState=false){
    if(!peerId)return;
    const existing=players.get(peerId);
    if(existing){
      existing.name=safeName(name||existing.name);
      if(readyState) existing.ready=true;
    }else{
      players.set(peerId,{peerId,name:safeName(name),ready:!!readyState,wpm:0,accuracy:0,score:0,words:0,finished:false,rematch:false});
    }
    renderPlayerList();renderLeaderboards();
  }

  function setupHostConnection(c,peerIdHint=''){
    const pid=peerIdHint||c.peer;
    if(!pid)return;
    if(connections.size>=playerCount-1){try{c.close()}catch(_){}return}
    connections.set(pid,c);
    c.on('open',()=>{
      // Register the connection immediately. The guest's hello can arrive a
      // little later, so never depend on hello timing to count the player.
      addPlayer(pid, 'Player', false);
      sendTo(pid,{type:'hello',hostPeerId:localPeerId,playerCount,duration,name:playerName});
      sendTo(pid,rosterPayload());
      readyRoomCode.textContent=roomCode||'QUICK';
      show(ready);
      waitingStatus.textContent=`${players.size}/${playerCount} players connected.`;
      broadcastRoster();
      if(allReady()) startRound();
    });
    c.on('data',msg=>handleHostMessage(pid,msg));
    c.on('close',()=>{connections.delete(pid);players.delete(pid);if(!finished){readyStatus.textContent=`A player left. ${players.size}/${playerCount} connected.`;broadcastRoster()} });
    c.on('error',()=>{});
  }
  function handleHostMessage(pid,msg){if(!msg||typeof msg!=='object')return;
    if(msg.type==='hello'){
      addPlayer(pid,msg.name,false);
      sendTo(pid,rosterPayload());
      if(currentRoundPacket) sendTo(pid,currentRoundPacket);
      broadcastRoster();
      return;
    }
    if(msg.type==='ready'){
      let p=players.get(pid);
      if(!p){ addPlayer(pid,msg.name||'Player',true); p=players.get(pid); }
      if(p) p.ready=true;
      broadcastRoster();
      if(allReady()) startRound();
      return;
    }
    if(msg.type==='start-request'){if(currentRoundPacket)sendTo(pid,currentRoundPacket);else if(allReady())startRound();return}
    if(msg.type==='progress'){const p=players.get(pid);if(p){p.wpm=Number(msg.wpm)||0;p.accuracy=Number(msg.accuracy)||0;p.score=Number(msg.score)||0;p.finished=!!msg.finished;p.words=Number(msg.words)||0}broadcast({type:'progress',...msg,peerId:pid});renderLeaderboards();if(msg.finished)maybeShowResults();return}
    if(msg.type==='rematch'){const p=players.get(pid);if(p)p.rematch=true;broadcastRoster();if(allRematch())startRound();return}
    if(msg.type==='leave'){try{connections.get(pid)?.close()}catch(_){}connections.delete(pid);players.delete(pid);broadcastRoster()}
  }
  function handleGuestMessage(msg){if(!msg||typeof msg!=='object')return;
    if(msg.type==='hello'){hostPeerId=msg.hostPeerId;playerCount=Number(msg.playerCount)||2;duration=Number(msg.duration)||duration;addPlayer(localPeerId,playerName,localReady);setRoundDuration(duration);setPlayerCount(playerCount);readyRoomCode.textContent=roomCode||'QUICK';show(ready);sendTo(hostPeerId,{type:'hello',name:playerName});clearTimeout(startWatchdog);startWatchdog=setTimeout(()=>{if(!running&&!finished&&hostPeerId)sendTo(hostPeerId,{type:'start-request'})},5000);return}
    if(msg.type==='roster'){players.clear();for(const p of msg.players||[])players.set(p.peerId,{...p,name:safeName(p.name)});renderPlayerList();renderLeaderboards();return}
    if(msg.type==='start'){if(msg.roundId&&currentRoundId===msg.roundId&&(running||!battle.hidden))return;currentRoundPacket=msg;prepareRound(msg.text,msg.duration,msg.startAt,msg.roundId||'');return}
    if(msg.type==='progress'){const p=players.get(msg.peerId);if(p)Object.assign(p,{wpm:Number(msg.wpm)||0,accuracy:Number(msg.accuracy)||0,score:Number(msg.score)||0,finished:!!msg.finished,words:Number(msg.words)||0,name:safeName(msg.name||p.name)});renderLeaderboards();if(msg.finished)maybeShowResults();return}
  }
  function allReady(){return players.size===playerCount&&[...players.values()].every(p=>p.ready)}
  function allRematch(){return players.size===playerCount&&[...players.values()].every(p=>p.rematch)}
  function startRound(){
    if(!isHost || players.size!==playerCount || !allReady()) return;
    for(const p of players.values()){
      p.ready=false; p.rematch=false; p.finished=false;
      p.wpm=0; p.accuracy=0; p.score=0; p.words=0;
    }
    const text=chooseWords();
    const start=Date.now()+4000;
    const roundId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random());
    currentRoundId=roundId;
    currentRoundPacket={type:'start',roundId,text,duration,startAt:start};
    prepareRound(text,duration,start,roundId);
    broadcast(currentRoundPacket);
    setTimeout(()=>{if(isHost&&!running&&!finished&&currentRoundPacket?.roundId===roundId)broadcast(currentRoundPacket)},700);
    setTimeout(()=>{if(isHost&&!running&&!finished&&currentRoundPacket?.roundId===roundId)broadcast(currentRoundPacket)},1800);
  }
  function maybeShowResults(){if(!running)return;if([...players.values()].filter(p=>p.finished).length>=players.size){running=false;renderResult();show(result)}}

  function createPrivate(){
    getName();quickMatch=false;cleanupPeer();isHost=true;localReady=false;finished=false;running=false;roomCode=randomCode();setPlayerCount(playerCount);show(waiting);waitingStatus.textContent=`Waiting for players… 1/${playerCount}`;setStatus(`Private room created for ${playerCount} players.`);
    peer=new Peer(roomCode.toLowerCase(),{debug:1});
    peer.on('connection',incoming=>{setupHostConnection(incoming,incoming.peer)});
    peer.on('open',id=>{localPeerId=id;roomCode=id.toUpperCase();roomCodeEl.textContent=roomCode;addPlayer(localPeerId,playerName,false);readyRoomCode.textContent=roomCode;waitingStatus.textContent=`Share this code. 1/${playerCount} players connected.`});
    peer.on('error',err=>{if(err.type==='unavailable-id'){roomCode=randomCode();try{peer.destroy()}catch(_){}createPrivate();return}setStatus('Could not create room. Please try again.')});
  }
  function joinPrivate(){
    getName();isHost=false;localReady=false;finished=false;running=false;const code=String(roomInput.value||'').trim().toLowerCase();if(!/^[a-z0-9]{6}$/.test(code)){setStatus('Enter a valid 6-character room code.');return}quickMatch=false;cleanupPeer();roomCode=code.toUpperCase();show(waiting);waitingStatus.textContent='Connecting to room…';setStatus('Joining Speed Rush room…');
    peer=new Peer(undefined,{debug:1});peer.on('open',id=>{localPeerId=id;const c=peer.connect(code,{reliable:true});connections.set(code,c);c.on('open',()=>{sendTo(code,{type:'hello',name:playerName});waitingStatus.textContent='Connected. Waiting for the host…'});c.on('data',handleGuestMessage);c.on('close',()=>setStatus('Host disconnected. Please try again.'));c.on('error',()=>setStatus('Room connection failed.'))});peer.on('error',()=>setStatus('Could not join that room. Check the code and try again.'));
  }
  function quickMatchStart(){
    getName();isHost=false;localReady=false;finished=false;running=false;const url=matchmakingUrl();if(!url){setStatus('Quick Match is not configured yet.');return}quickMatch=true;cleanupPeer();show(waiting);waitingStatus.textContent=`Finding ${playerCount} players…`;setStatus(`Searching for a ${playerCount}-player Speed Rush match…`);
    peer=new Peer(undefined,{debug:1});
    peer.on('connection',incoming=>{
      if(isHost) setupHostConnection(incoming,incoming.peer);
      else { try{incoming.close()}catch(_){} }
    });
    peer.on('open',id=>{localPeerId=id;openMatchSocket(id)});
    peer.on('error',()=>setStatus('Could not start Quick Match. Please try again.'));
  }
  function openMatchSocket(peerId){try{matchmakingSocket=new WebSocket(urlForSocket(matchmakingUrl()))}catch(_){setStatus('Could not connect to Quick Match.');return}
    matchmakingSocket.addEventListener('open',()=>{
      matchmakingSocket.send(JSON.stringify({type:'queue',peerId,name:playerName,playerCount}));
      waitingStatus.textContent=`Finding ${playerCount} players… 1/${playerCount}`;
    });
    matchmakingSocket.addEventListener('message',event=>{let msg;try{msg=JSON.parse(event.data)}catch(_){return}
      if(msg.type==='queued'){waitingStatus.textContent=`Finding ${playerCount} players… ${msg.count||1}/${playerCount}`}
      if(msg.type==='match'){
        cleanupMatchmaking();
        roomCode='QUICK';
        roomCodeEl.textContent='AUTO';
        playerCount=Number(msg.playerCount)||playerCount;
        setPlayerCount(playerCount);

        if(msg.role==='host'){
          isHost=true;
          hostPeerId=localPeerId;
          addPlayer(localPeerId,playerName,false);
          show(waiting);
          waitingStatus.textContent=`Match found. Waiting for players… 1/${playerCount}`;
        }else{
          isHost=false;
          hostPeerId=String(msg.hostPeerId||'');
          if(!hostPeerId){
            setStatus('Match found, but the host connection is unavailable. Please try Quick Match again.');
            waitingStatus.textContent='Host connection information was missing.';
            try{peer.destroy()}catch(_){}
            return;
          }
          show(waiting);
          waitingStatus.textContent='Match found. Connecting to host…';
          const c=peer.connect(hostPeerId,{reliable:true});
          connections.set(hostPeerId,c);
          c.on('open',()=>{
            waitingStatus.textContent='Connected to host. Waiting for players…';
            sendTo(hostPeerId,{type:'hello',name:playerName});clearTimeout(startWatchdog);startWatchdog=setTimeout(()=>{if(!running&&!finished&&hostPeerId)sendTo(hostPeerId,{type:'start-request'})},5000);
          });
          c.on('data',handleGuestMessage);
          c.on('close',()=>setStatus('Host disconnected. Please try again.'));
          c.on('error',()=>setStatus('Could not connect to host. Please try Quick Match again.'));
        }
      }
      if(msg.type==='error'){waitingStatus.textContent=msg.message||'Quick Match failed.'}
    });
    matchmakingSocket.addEventListener('error',()=>{
      waitingStatus.textContent='Quick Match connection failed. Please try again.';
      setStatus('Quick Match server connection failed.');
    });
    matchmakingSocket.addEventListener('close',()=>{
      if(quickMatch && !hostPeerId && !running && !finished){
        if(waitingStatus.textContent.startsWith('Finding')) waitingStatus.textContent='Quick Match disconnected. Please try again.';
      }
    });
  }

  window.speedRushDifficulty = 'easy';
  document.querySelectorAll('#difficultyOptions .option-btn').forEach(b=>b.addEventListener('click',()=>{
    if(connections.size)return;
    window.speedRushDifficulty=b.dataset.difficulty||'easy';
    document.querySelectorAll('#difficultyOptions .option-btn').forEach(x=>x.classList.toggle('active',x===b));
  }));

  document.querySelectorAll('#timeOptions .option-btn').forEach(b=>b.addEventListener('click',()=>{if(connections.size)return;setRoundDuration(Number(b.dataset.time))}));
  document.querySelectorAll('#playerOptions .option-btn').forEach(b=>b.addEventListener('click',()=>{if(connections.size)return;setPlayerCount(Number(b.dataset.players))}));
  createBtn.addEventListener('click',createPrivate);joinBtn.addEventListener('click',joinPrivate);quickBtn.addEventListener('click',quickMatchStart);
  readyBtn.addEventListener('click',()=>{
    if(isHost){
      const me=players.get(localPeerId);
      if(me) me.ready=true;
      localReady=true;
      readyBtn.disabled=true;
      readyBtn.textContent='Ready ✓';
      broadcastRoster();
      if(allReady()) startRound();
    }else{
      localReady=true;
      const me=players.get(localPeerId);
      if(me) me.ready=true;
      readyBtn.disabled=true;
      readyBtn.textContent='Ready ✓';
      sendTo(hostPeerId,{type:'ready',name:playerName});
      readyStatus.textContent=`Waiting for the other ${playerCount-1} players…`;
      // Retry once in case the first ready packet crosses the connection
      // before the host has finished registering this player.
      setTimeout(()=>{ if(!running&&!finished&&hostPeerId) sendTo(hostPeerId,{type:'ready',name:playerName}); },800);
      setTimeout(()=>{ if(!running&&!finished&&hostPeerId) sendTo(hostPeerId,{type:'ready',name:playerName}); },1800);
    }
  });
  cancelBtn.addEventListener('click',()=>{broadcast({type:'leave'});cleanupPeer();show(lobby);setStatus('Match cancelled.')});
  copyBtn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(roomCodeEl.textContent.trim());copyBtn.textContent='Copied!';setTimeout(()=>copyBtn.textContent='Copy',1200)}catch(_) {}});
  inputEl.addEventListener('input',()=>{
    if(!running)return;
    const value=inputEl.value;
    if(value.length>currentWord.length){inputEl.value=currentWord;return}
    const expected=currentWord.slice(0,value.length);
    if(value!==expected){
      errors++;
      inputEl.value=value.slice(0,-1);
      liveStatus.textContent='Miss! Correct the word and keep rushing.';
      updateLocal();sendProgress();
      return;
    }
    if(value===currentWord){
      // One completed word = one accuracy attempt, and it is correct only
      // when the complete target word was typed.
      attemptedWords++;
      correctWords++;
      correctChars+=currentWord.length+1;
      wordsTyped++;
      score+=10+(Math.floor(wordsTyped/10)*2);
      currentWordIndex++;
      liveStatus.textContent=wordsTyped%10===0?'🔥 Great pace!':'Next word!';
      if(currentWordIndex>=wordList.length){ currentWordIndex=0; }
      setCurrentWord();
      updateLocal();sendProgress();
    }else{
      updateLocal();
    }
  });
  inputEl.addEventListener('paste',e=>e.preventDefault());inputEl.addEventListener('drop',e=>e.preventDefault());
  rematchBtn.addEventListener('click',()=>{localRematch=true;rematchBtn.disabled=true;const me=players.get(localPeerId);if(me)me.rematch=true;if(isHost){broadcastRoster();if(allRematch())startRound()}else{sendTo(hostPeerId,{type:'rematch'});resultSubtitle.textContent='Waiting for everyone to choose Rematch…'}});
  exitBtn.addEventListener('click',()=>{broadcast({type:'leave'});cleanupPeer();show(lobby);setStatus('Ready for another Speed Rush.')});

  setRoundDuration(DEFAULT_DURATION);setPlayerCount(DEFAULT_PLAYERS);readyYou.textContent=playerName||'Player';youNameEl.textContent=playerName||'You';show(lobby);
})();
