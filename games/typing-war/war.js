(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const screens = {
    lobby: $("lobby"),
    waiting: $("waiting"),
    ready: $("ready"),
    battle: $("battle"),
    result: $("result")
  };

  const playerNameEl = $("playerName");
  const roomInput = $("roomInput");
  const lobbyStatus = $("lobbyStatus");
  const waitingTitle = $("waitingTitle");
  const waitingStatus = $("waitingStatus");
  const roomCodeEl = $("roomCode");
  const cancelBtn = $("cancelBtn");
  const readyBtn = $("readyBtn");
  const readyStatus = $("readyStatus");
  const typingInput = $("typingInput");
  const promptEl = $("prompt");
  const timerEl = $("timer");
  const meHpEl = $("meHp");
  const opHpEl = $("opHp");
  const meHpBar = $("meHpBar");
  const opHpBar = $("opHpBar");
  const meWpmEl = $("meWpm");
  const opWpmEl = $("opWpm");
  const meNameEl = $("meName");
  const opNameEl = $("opName");
  const meReadyName = $("meReadyName");
  const opReadyName = $("opReadyName");
  const progressBar = $("progressBar");
  const comboEl = $("combo");
  const damageEl = $("damage");
  const battleMessage = $("battleMessage");

  // One-word combat makes every successful word a clear attack.
  const WORDS = [
    "focus", "accuracy", "velocity", "battle", "keyboard", "precision",
    "victory", "challenge", "reaction", "power", "warrior", "typing",
    "speed", "concentration", "practice", "mastery", "strategy", "quick",
    "strong", "perfect", "attack", "defense", "combo", "critical", "target",
    "energy", "skill", "momentum", "champion", "legend", "clutch", "control",
    "advance", "finish", "survive", "strike", "rapid", "determination",
    "confidence", "discipline", "reflex", "accuracy", "champion", "combat",
    "rival", "thunder", "rocket", "flash", "unstoppable", "dominate"
  ];

  const BATTLE_TIME = 60;
  const MAX_HP = 100;

  let peer = null;
  let conn = null;
  let matchmakingSocket = null;

  let suppressDisconnect = false;
  let quickMatch = false;
  let isHost = false;
  let connected = false;

  let localReady = false;
  let opponentReady = false;
  let localRematchReady = false;
  let opponentRematchReady = false;
  let rematchMode = false;

  let roomCode = "";
  let opponentPeerId = "";
  let playerName = "";
  let opponentName = "Opponent";

  // Shared battle sequence. Host sends it once; both players type through it
  // independently, so a faster player never resets the slower player's word.
  let battleWords = [];
  let wordIndex = 0;
  let currentWord = "";

  let startedAt = 0;
  let timer = null;
  let lastStatsSent = 0;

  let hp = MAX_HP;
  let opponentHp = MAX_HP;

  let combo = 0;
  let totalTyped = 0;
  let correctTyped = 0;
  let totalDamage = 0;
  let completedWords = 0;

  let battleOver = false;
  let roundId = 0;

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function status(text) {
    lobbyStatus.textContent = text || "";
  }

  function matchmakingUrl() {
    return window.TYPINGMETER_MATCHMAKING_URL || "";
  }

  function safeName() {
    const value = playerNameEl.value.trim().slice(0, 20);
    playerName = value || "Player";
    playerNameEl.value = playerName;
  }

  function send(data) {
    if (conn && conn.open) {
      try {
        conn.send(data);
        return true;
      } catch (_) { }
    }
    return false;
  }

  function closeMatchmaking() {
    if (!matchmakingSocket) return;
    try {
      matchmakingSocket.send(JSON.stringify({ type: "cancel" }));
    } catch (_) { }
    try {
      matchmakingSocket.close();
    } catch (_) { }
    matchmakingSocket = null;
  }

  function destroyPeer() {
    if (conn) {
      try { conn.close(); } catch (_) { }
      conn = null;
    }

    if (peer) {
      try { peer.destroy(); } catch (_) { }
      peer = null;
    }

    connected = false;
  }

  function resetLobbyState() {
    localReady = false;
    opponentReady = false;
    localRematchReady = false;
    opponentRematchReady = false;
    opponentPeerId = "";
    battleOver = false;
    clearInterval(timer);
    timer = null;
  }

  function newPeer() {
    peer = new Peer(undefined, { debug: 1 });

    peer.on("open", id => {
      console.log("Typing War PeerJS open:", id);
      if (quickMatch) joinQuickQueue(id);
    });

    peer.on("connection", incoming => {
      console.log("Typing War incoming connection:", incoming.peer);

      const allowed =
        (quickMatch && isHost) ||
        (!quickMatch && isHost && roomCode);

      if (!allowed) {
        try { incoming.close(); } catch (_) { }
        return;
      }

      setupConnection(incoming);
    });

    peer.on("error", err => {
      console.error("Typing War PeerJS error:", err);

      if (!screens.result.classList.contains("active")) {
        const message = err?.type || "please try again";
        status("Connection error: " + message);
        waitingStatus.textContent = "Connection failed. Return to lobby and try again.";
        readyStatus.textContent = "Connection failed. Return to lobby and try again.";
      }
    });

    peer.on("disconnected", () => {
      if (peer && !peer.destroyed) {
        try { peer.reconnect(); } catch (_) { }
      }
    });
  }

  function setupConnection(c) {
    if (!c) return;

    const connection = c;

    if (conn && conn !== connection) {
      try { conn.close(); } catch (_) { }
    }

    conn = connection;

    connection.on("open", () => {
      if (conn !== connection) return;

      connected = true;
      suppressDisconnect = false;

      console.log("Typing War connection open:", connection.peer);

      showScreen("ready");
      meReadyName.textContent = playerName;
      opReadyName.textContent = opponentName || "Opponent";

      readyStatus.textContent = "Connected. Both players must be ready.";
      readyBtn.disabled = false;
      readyBtn.textContent = "I'm Ready";

      send({ type: "player-info", name: playerName });
    });

    connection.on("data", data => {
      if (conn !== connection || !data) return;
      handleData(data);
    });

    connection.on("close", () => {
      if (conn !== connection) return;

      connected = false;

      if (suppressDisconnect || battleOver) return;

      if (screens.battle.classList.contains("active")) {
        finishBattle(true, "Opponent disconnected.");
      } else {
        readyStatus.textContent = "Opponent disconnected.";
      }
    });

    connection.on("error", err => {
      if (conn !== connection) return;
      console.error("Typing War connection error:", err);
    });
  }

  function handleData(data) {
    switch (data.type) {
      case "player-info":
        opponentName = String(data.name || "Opponent").slice(0, 20);
        opReadyName.textContent = opponentName;
        opNameEl.textContent = opponentName;
        return;

      case "ready":
        opponentReady = true;
        updateReadyUI();
        maybeStartBattle();
        return;

      case "start":
        if (!Array.isArray(data.words) || !data.words.length) return;

        battleWords = data.words.map(w => String(w));
        startBattle(Number(data.roundId) || Date.now());
        return;

      case "stats":
        opponentHp = clamp(Number(data.hp), 0, MAX_HP);
        opWpmEl.textContent = Math.max(0, Math.round(Number(data.wpm) || 0));
        updateHp();
        return;

      case "attack": {
        const damage = clamp(Math.round(Number(data.damage)), 1, 20);

        // IMPORTANT:
        // An incoming attack damages OUR HP.
        // We never subtract attack damage from opponentHp locally.
        hp = clamp(hp - damage, 0, MAX_HP);

        updateHp();
        battleMessage.textContent = `💥 You took ${damage} damage!`;

        if (hp <= 0) {
          send({
            type: "end",
            result: "victory",
            reason: "Your opponent was defeated."
          });
          finishBattle(true, "Your HP reached 0.");
        }
        return;
      }

      case "word-complete": {
        // Host is authoritative: the first player to complete the current
        // word advances the SAME word for both players.
        if (isHost && Number(data.wordIndex) === wordIndex && !battleOver) {
          advanceSharedWord();
        }
        return;
      }

      case "next-word": {
        const nextIndex = Number(data.wordIndex);
        if (!Number.isFinite(nextIndex)) return;

        wordIndex = nextIndex;
        currentWord = String(data.word || battleWords[wordIndex] || "");
        typingInput.value = "";
        typingInput.maxLength = Math.max(1, currentWord.length);
        renderPrompt();
        typingInput.focus();
        battleMessage.textContent = "New word! Type fast.";
        return;
      }

      case "end":
        // The player receiving this message is the ATTACKER/winner.
        // The player who sent it reached 0 HP and already shows Defeat.
        if (!battleOver) {
          finishBattle(false, data.reason || "Your opponent was defeated.");
        }
        return;

      case "leave":
        if (!battleOver) {
          finishBattle(false, "Opponent left the battle.");
        }
        return;

      case "rematch-ready":
        opponentRematchReady = true;
        rematchMode = true;
        localReady = false;
        opponentReady = false;
        battleOver = false;
        meReadyName.textContent = playerName;
        opReadyName.textContent = opponentName || "Opponent";
        readyBtn.disabled = false;
        readyBtn.textContent = "I'm Ready";
        readyStatus.textContent = "Opponent is ready for a rematch. Press I'm Ready.";
        showScreen("ready");
        return;

      case "rematch-start":
        if (Array.isArray(data.words) && data.words.length) {
          battleWords = data.words.map(w => String(w));
        }
        rematchMode = false;
        startBattle(Number(data.roundId) || Date.now());
        return;
    }
  }

  function shuffleWords() {
    const pool = [...WORDS];

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, 30);
  }

  function resetBattleStats() {
    hp = MAX_HP;
    opponentHp = MAX_HP;

    combo = 0;
    totalTyped = 0;
    correctTyped = 0;
    totalDamage = 0;
    completedWords = 0;

    wordIndex = 0;
    currentWord = battleWords[0] || "";

    battleOver = false;
    startedAt = 0;
    lastStatsSent = 0;

    typingInput.value = "";
    typingInput.maxLength = Math.max(1, currentWord.length);

    progressBar.style.width = "0%";
    timerEl.textContent = String(BATTLE_TIME);

    meWpmEl.textContent = "0";
    opWpmEl.textContent = "0";

    comboEl.textContent = "Combo ×0";
    damageEl.textContent = "Damage 0";

    battleMessage.textContent = "Type the word exactly.";
    updateHp();
  }

  function renderPrompt() {
    const value = typingInput.value;
    let html = "";

    for (let i = 0; i < currentWord.length; i++) {
      const ch = currentWord[i];

      if (i < value.length) {
        html += `<span class="${value[i] === ch ? "correct" : "wrong"}">${escapeHtml(ch)}</span>`;
      } else if (i === value.length) {
        html += `<span class="current">${escapeHtml(ch)}</span>`;
      } else {
        html += escapeHtml(ch);
      }
    }

    promptEl.innerHTML = html;

    const progress = currentWord.length
      ? Math.min((value.length / currentWord.length) * 100, 100)
      : 0;

    progressBar.style.width = progress + "%";
  }

  function updateHp() {
    meHpEl.textContent = String(Math.round(hp));
    opHpEl.textContent = String(Math.round(opponentHp));

    meHpBar.style.width = hp + "%";
    opHpBar.style.width = opponentHp + "%";
  }

  function currentWpm() {
    if (!startedAt) return 0;

    const minutes = Math.max(
      (Date.now() - startedAt) / 60000,
      1 / 60000
    );

    return Math.round((correctTyped / 5) / minutes);
  }

  function currentAccuracy() {
    return totalTyped
      ? Math.round((correctTyped / totalTyped) * 100)
      : 100;
  }

  function startBattle(id) {
    if (!connected || battleOver) return;

    roundId = id;

    if (!battleWords.length) {
      battleWords = shuffleWords();
    }

    resetBattleStats();

    showScreen("battle");

    typingInput.disabled = false;
    typingInput.focus();

    startedAt = Date.now();

    clearInterval(timer);

    const endAt = startedAt + BATTLE_TIME * 1000;

    timer = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((endAt - Date.now()) / 1000)
      );

      timerEl.textContent = String(left);
      meWpmEl.textContent = String(currentWpm());

      if (Date.now() - lastStatsSent > 250) {
        lastStatsSent = Date.now();

        send({
          type: "stats",
          hp,
          wpm: currentWpm()
        });
      }

      if (left <= 0) {
        finishByTime();
      }
    }, 100);

    renderPrompt();
  }

  function maybeStartBattle() {
    if (!isHost || !localReady || !opponentReady || !connected) return;

    battleWords = shuffleWords();

    const id = Date.now();

    send({
      type: rematchMode ? "rematch-start" : "start",
      words: battleWords,
      roundId: id
    });

    rematchMode = false;
    startBattle(id);
  }

  function updateReadyUI() {
    if (localReady) {
      readyBtn.textContent = opponentReady
        ? "Ready ✓"
        : "Waiting for opponent…";

      readyBtn.disabled = true;
    } else {
      readyBtn.textContent = "I'm Ready";
      readyBtn.disabled = false;
    }

    readyStatus.textContent =
      `You: ${localReady ? "READY ✓" : "NOT READY"} · ` +
      `${opponentName}: ${opponentReady ? "READY ✓" : "NOT READY"}`;
  }

  function finishByTime() {
    if (battleOver) return;

    const myWpm = currentWpm();
    const theirWpm = Number(opWpmEl.textContent || 0);

    if (hp === opponentHp) {
      if (myWpm === theirWpm) {
        finishBattle(false, "Time is up. Draw!");
      } else {
        finishBattle(
          myWpm < theirWpm,
          myWpm < theirWpm
            ? "Time is up. Opponent wins on WPM."
            : "Time is up. You win on WPM!"
        );
      }
      return;
    }

    finishBattle(
      hp < opponentHp,
      hp < opponentHp
        ? "Time is up. Opponent has more HP."
        : "Time is up. You have more HP."
    );
  }

  function finishBattle(lost, reason) {
    if (battleOver) return;

    battleOver = true;
    clearInterval(timer);
    timer = null;

    typingInput.disabled = true;

    const wpm = currentWpm();
    const accuracy = currentAccuracy();

    if (hp <= 0) lost = true;
    if (opponentHp <= 0) lost = false;

    $("resultIcon").textContent = lost ? "💥" : "🏆";
    $("resultTitle").textContent = lost ? "Defeat" : "Victory!";

    $("resultText").textContent =
      reason ||
      (lost
        ? "Your opponent won the typing war."
        : "You won the typing war!");

    $("resultWpm").textContent = String(wpm);
    $("resultAccuracy").textContent = accuracy + "%";
    $("resultDamage").textContent = String(totalDamage);

    showScreen("result");
  }

  function calculateDamage() {
    // Normal completed word = 5 damage.
    // Combo rewards are controlled so total damage stays meaningful.
    let damage = 5;

    if (combo >= 10) {
      damage = 12; // critical
    } else if (combo >= 7) {
      damage = 9;
    } else if (combo >= 4) {
      damage = 7;
    }

    return clamp(damage, 1, 20);
  }

  function attack() {
    const damage = calculateDamage();

    totalDamage += damage;

    send({
      type: "attack",
      damage
    });

    damageEl.textContent = "Damage " + totalDamage;

    if (damage >= 12) {
      battleMessage.textContent = `💥 CRITICAL HIT! -${damage} HP`;
    } else {
      battleMessage.textContent = `⚔️ HIT! -${damage} HP`;
    }
  }

  function advanceSharedWord() {
    if (battleOver) return;

    wordIndex++;

    if (wordIndex >= battleWords.length) {
      wordIndex = 0;
    }

    currentWord = battleWords[wordIndex] || "";

    // Reset the word for BOTH players together. The player who has not
    // finished the old word also gets the new word immediately.
    typingInput.value = "";
    typingInput.maxLength = Math.max(1, currentWord.length);

    send({
      type: "next-word",
      wordIndex,
      word: currentWord
    });

    renderPrompt();
    typingInput.focus();
    battleMessage.textContent = "New word! Type fast.";
  }

  function onTyping() {
    if (battleOver || !startedAt) return;

    const value = typingInput.value;

    if (!value.length) {
      renderPrompt();
      return;
    }

    const lastPos = value.length - 1;

    totalTyped++;

    if (lastPos >= 0 && lastPos < currentWord.length) {
      if (value[lastPos] === currentWord[lastPos]) {
        correctTyped++;
      } else {
        combo = 0;
        comboEl.textContent = "Combo ×0";
        battleMessage.textContent = "❌ Miss! Combo reset.";
        renderPrompt();
        return;
      }
    }

    renderPrompt();

    // A completed word gives damage only to the player who completed it.
    // Then the host advances the shared word for BOTH players.
    if (value === currentWord) {
      const completedWordIndex = wordIndex;

      completedWords++;
      combo++;

      attack();

      comboEl.textContent = "Combo ×" + combo;

      if (combo >= 10) {
        battleMessage.textContent = "🔥 10× COMBO — CRITICAL!";
      }

      if (isHost) {
        advanceSharedWord();
      } else {
        send({
          type: "word-complete",
          wordIndex: completedWordIndex
        });
      }
    }
  }

  function joinQuickQueue(peerId) {
    const url = matchmakingUrl();

    if (!url) {
      status("Matchmaking server URL is missing.");
      return;
    }

    let socket;

    try {
      socket = new WebSocket(url);
    } catch (_) {
      status("Could not connect to matchmaking server.");
      return;
    }

    matchmakingSocket = socket;

    socket.addEventListener("open", () => {
      if (!quickMatch) return;

      socket.send(JSON.stringify({
        type: "queue",
        peerId: String(peerId),
        name: playerName,
        playerCount: 2
      }));

      waitingStatus.textContent = "Waiting for another player…";
    });

    socket.addEventListener("message", event => {
      let msg;

      try {
        msg = JSON.parse(event.data);
      } catch (_) {
        return;
      }

      if (msg.type === "queued") {
        waitingStatus.textContent = "Waiting for another player…";
        return;
      }

      if (msg.type === "match") {
        const myId = String(peer?.id || "");
        const ids = Array.isArray(msg.peerIds)
          ? msg.peerIds.map(String)
          : [];

        isHost = msg.role === "host";

        opponentPeerId = isHost
          ? (ids.find(id => id !== myId) || "")
          : String(msg.hostPeerId || "");

        opponentName = String(
          msg.opponentName || msg.name || "Opponent"
        ).slice(0, 20);

        roomCode = "QUICK";

        closeMatchmaking();

        if (!opponentPeerId) {
          waitingStatus.textContent =
            "Opponent found, but connection information is missing.";
          return;
        }

        if (isHost) {
          waitingTitle.textContent = "Opponent found!";
          waitingStatus.textContent =
            "Waiting for opponent to connect…";
        } else {
          waitingTitle.textContent = "Opponent found!";
          waitingStatus.textContent = "Connecting to host…";

          try {
            setupConnection(
              peer.connect(opponentPeerId, {
                reliable: true,
                serialization: "json"
              })
            );
          } catch (_) {
            waitingStatus.textContent =
              "Could not connect to host. Try again.";
          }
        }

        return;
      }

      if (msg.type === "error") {
        waitingStatus.textContent =
          msg.message || "Matchmaking error.";
      }
    });

    socket.addEventListener("error", () => {
      if (quickMatch) {
        waitingStatus.textContent =
          "Could not reach matchmaking server.";
      }
    });
  }

  function createPrivateRoom() {
    safeName();

    quickMatch = false;
    resetLobbyState();
    closeMatchmaking();
    destroyPeer();

    roomCode = randomCode();
    isHost = true;
    battleWords = shuffleWords();

    showScreen("waiting");

    waitingTitle.textContent = "Private Room";
    roomCodeEl.textContent = roomCode;
    waitingStatus.textContent =
      "Creating room…";

    peer = new Peer("typingwar-" + roomCode, {
      debug: 1
    });

    peer.on("open", () => {
      waitingStatus.textContent =
        "Room ready. Share the code with your opponent.";
    });

    peer.on("connection", incoming => {
      setupConnection(incoming);
    });

    peer.on("error", err => {
      console.error("Private room error:", err);
      waitingStatus.textContent =
        "Could not create room. Try another code.";
    });
  }

  function joinPrivateRoom() {
    safeName();

    const code = roomInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{4,6}$/.test(code)) {
      status("Enter a valid room code.");
      return;
    }

    quickMatch = false;
    resetLobbyState();
    closeMatchmaking();
    destroyPeer();

    roomCode = code;
    isHost = false;

    showScreen("waiting");

    waitingTitle.textContent = "Joining Private Room";
    roomCodeEl.textContent = roomCode;
    waitingStatus.textContent =
      "Connecting to host…";

    peer = new Peer(undefined, {
      debug: 1
    });

    peer.on("open", () => {
      try {
        const c = peer.connect(
          "typingwar-" + roomCode,
          {
            reliable: true,
            serialization: "json"
          }
        );

        setupConnection(c);
      } catch (_) {
        waitingStatus.textContent =
          "Could not join room.";
      }
    });

    peer.on("error", err => {
      console.error("Private join error:", err);
      waitingStatus.textContent =
        "Room not found or host is offline.";
    });
  }

  function startQuick() {
    safeName();

    const url = matchmakingUrl();

    if (!url || /YOUR-MATCHMAKING-SERVER/i.test(url)) {
      status("Quick Match server URL is not configured.");
      return;
    }

    suppressDisconnect = false;
    quickMatch = true;
    isHost = false;

    resetLobbyState();
    closeMatchmaking();
    destroyPeer();

    showScreen("waiting");

    waitingTitle.textContent = "Finding opponent…";
    waitingStatus.textContent =
      "Connecting to matchmaking…";
    roomCodeEl.textContent = "AUTO";

    newPeer();
  }

  function leave() {
    suppressDisconnect = true;

    try {
      send({ type: "leave" });
    } catch (_) { }

    closeMatchmaking();
    destroyPeer();

    resetLobbyState();

    readyBtn.disabled = false;
    readyBtn.textContent = "I'm Ready";

    showScreen("lobby");
    status("");
  }

  function ready() {
    if (!connected || localReady) return;

    localReady = true;

    updateReadyUI();

    send({
      type: "ready"
    });

    maybeStartBattle();
  }

  function updateRematchStatus() {
    if (!screens.result.classList.contains("active")) return;
    $("resultText").textContent =
      "Both players must press Rematch, then both players must press I'm Ready.";
  }

  function rematch() {
    if (!connected) {
      showScreen("lobby");
      return;
    }

    rematchMode = true;
    localReady = false;
    opponentReady = false;
    localRematchReady = true;
    opponentRematchReady = false;
    battleOver = false;
    clearInterval(timer);
    timer = null;
    hp = MAX_HP;
    opponentHp = MAX_HP;
    updateHp();

    meReadyName.textContent = playerName;
    opReadyName.textContent = opponentName || "Opponent";
    readyBtn.disabled = false;
    readyBtn.textContent = "I'm Ready";
    readyStatus.textContent = "Rematch ready. Both players must press I'm Ready.";
    showScreen("ready");

    send({ type: "rematch-ready" });
  }

  function randomCode() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let out = "";

    for (let i = 0; i < 6; i++) {
      out += chars[
        Math.floor(Math.random() * chars.length)
      ];
    }

    return out;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  $("quickBtn").addEventListener("click", startQuick);
  $("createBtn").addEventListener("click", createPrivateRoom);
  $("joinBtn").addEventListener("click", joinPrivateRoom);

  cancelBtn.addEventListener("click", leave);
  $("readyLeaveBtn").addEventListener("click", leave);
  $("battleLeaveBtn").addEventListener("click", leave);
  $("readyBtn").addEventListener("click", ready);

  $("homeBtn").addEventListener("click", leave);
  $("rematchBtn").addEventListener("click", rematch);

  typingInput.addEventListener("input", onTyping);

  window.addEventListener("beforeunload", () => {
    suppressDisconnect = true;

    try {
      send({ type: "leave" });
    } catch (_) { }

    closeMatchmaking();
    destroyPeer();
  });

  meNameEl.textContent = "You";
  opNameEl.textContent = "Opponent";
  updateHp();
})();
