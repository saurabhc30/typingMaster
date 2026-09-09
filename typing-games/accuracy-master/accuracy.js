(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const screens = ["lobby", "waiting", "ready", "battle", "result"];
  const PASSAGES = window.ACCURACY_MASTER_PASSAGES || [];

  function getRoundTime(text) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(60, Math.min(120, Math.ceil(words / 4)));
  }

  let roundTime = 60;
  let peer = null;
  let conn = null;
  let matchmakingSocket = null;
  let playerName = "";
  let opponentName = "Opponent";
  let opponentPeerId = "";
  let roomCode = "";
  let isHost = false;
  let quickMatch = false;
  let connected = false;
  let localReady = false;
  let opponentReady = false;
  let rematchMode = false;
  let battleText = "";
  let startedAt = 0;
  let timer = null;
  let battleOver = false;
  let finishSent = false;
  let opponentFinished = false;
  let localFinished = false;
  let localFinishStats = null;
  let finishWindowTimer = null;
  let finishWindowEndsAt = 0;
  let awaitingFinalResult = false;
  let finalResultTimer = null;
  const FINISH_WINDOW_MS = 5000;
  let roundId = 0;

  // Typing state is index based. The passage itself is never edited by the
  // browser; this prevents wrong characters from appearing in the passage.
  let typedIndex = 0;
  let correctTyped = 0;
  let errorTyped = 0;
  let localHp = 100;
  let opponentHp = 100;
  let localStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0};
  let opponentStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0, hp:100, progress:0};
  let lastKeyProcessed = "";
  let lastKeyProcessedAt = 0;
  let idlePenaltyTimer = null;
  let lastTypedAt = 0;
  let idlePenaltyStep = 0;
  let nextIdlePenaltyAt = 0;
  const IDLE_PENALTY_INTERVAL_MS = 6000;

  function showScreen(name) {
    screens.forEach(id => $(id).classList.toggle("active", id === name));
  }

  function setMessage(text) {
    $("lobbyMessage").textContent = text || "";
  }

  function safeName() {
    playerName = ($("playerName").value.trim() || "Player").slice(0, 20);
    $("playerName").value = playerName;
    try { localStorage.setItem("typingmeter_accuracy_name", playerName); } catch (_) {}
  }

  function matchmakingUrl() {
    return window.TYPINGMETER_MATCHMAKING_URL || "";
  }

  function send(data) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  function closeMatchmaking() {
    if (!matchmakingSocket) return;
    try { matchmakingSocket.send(JSON.stringify({ type: "cancel" })); } catch (_) {}
    try { matchmakingSocket.close(); } catch (_) {}
    matchmakingSocket = null;
  }

  function destroyPeer() {
    if (conn) {
      try { conn.close(); } catch (_) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }
    connected = false;
  }

  function resetState() {
    localReady = false;
    opponentReady = false;
    rematchMode = false;
    opponentFinished = false;
    localFinished = false;
    localFinishStats = null;
    finishWindowEndsAt = 0;
    clearTimeout(finishWindowTimer);
    finishWindowTimer = null;
    finishSent = false;
    battleOver = false;
    clearInterval(timer);
    timer = null;
    clearInterval(idlePenaltyTimer);
    idlePenaltyTimer = null;
    typedIndex = 0;
    correctTyped = 0;
    errorTyped = 0;
    localStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0};
    opponentStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0, hp:100, progress:0};
    awaitingFinalResult = false;
    clearTimeout(finalResultTimer);
    finalResultTimer = null;
    localHp = 100;
    opponentHp = 100;
    battleText = "";
    const prompt = $("prompt");
    if (prompt) {
      prompt.textContent = "";
      prompt.contentEditable = "false";
      prompt.scrollTop = 0;
    }
  }

  function setupPeer() {
    peer = new Peer(undefined, { debug: 1 });

    peer.on("open", id => {
      console.log("Accuracy Master PeerJS open:", id);
      if (quickMatch) queueQuick(id);
    });

    peer.on("connection", incoming => {
      console.log("Accuracy Master incoming connection:", incoming.peer);
      const allowed = quickMatch && isHost;
      if (!allowed) {
        try { incoming.close(); } catch (_) {}
        return;
      }
      setupConnection(incoming);
    });

    peer.on("error", err => {
      console.error("Accuracy Master PeerJS error:", err);
      if ($("waiting").classList.contains("active")) {
        $("waitingText").textContent = "Connection error. Please return to the lobby and try again.";
      }
    });

    peer.on("disconnected", () => {
      if (peer && !peer.destroyed) {
        try { peer.reconnect(); } catch (_) {}
      }
    });
  }

  function setupConnection(c) {
    if (!c) return;

    if (conn && conn !== c) {
      try { conn.close(); } catch (_) {}
    }

    conn = c;

    c.on("open", () => {
      connected = true;
      $("opConnectionStatus").textContent = "ONLINE";
      $("opConnectionStatus").className = "connection-status online";
      $("waitingTitle").textContent = "Opponent Connected!";
      $("waitingText").textContent = "Get ready to battle.";

      send({ type: "player-info", name: playerName });

      $("meReadyName").textContent = playerName;
      $("opReadyName").textContent = opponentName || "Opponent";
      $("meReadyStatus").textContent = "NOT READY";
      $("opReadyStatus").textContent = "NOT READY";
      $("readyStatus").textContent = "Both players must press I'm Ready.";
      $("readyBtn").disabled = false;
      $("readyBtn").textContent = "I'm Ready";
      showScreen("ready");
    });

    c.on("data", handleData);

    c.on("close", () => {
      connected = false;
      if (!battleOver) {
        $("opConnectionStatus").textContent = "DISCONNECTED";
        $("opConnectionStatus").className = "connection-status left";
        if ($("battle").classList.contains("active")) {
          finishBattle(false, "Opponent disconnected.");
        } else if (!$("lobby").classList.contains("active")) {
          $("readyStatus").textContent = "Opponent disconnected.";
        }
      }
    });

    c.on("error", err => console.error("Accuracy Master connection error:", err));
  }

  function handleData(data) {
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "player-info":
        opponentName = String(data.name || "Opponent").slice(0, 20);
        $("opReadyName").textContent = opponentName;
        $("opName").textContent = opponentName;
        $("opConnectionStatus").textContent = "ONLINE";
        $("opConnectionStatus").className = "connection-status online";
        return;

      case "ready":
        opponentReady = true;
        $("opReadyStatus").textContent = "READY ✓";
        $("readyStatus").textContent = localReady
          ? "Both players are ready. Starting…"
          : "Opponent is ready. Press I'm Ready.";
        maybeStart();
        return;

      case "start":
      case "rematch-start":
        if (!data.text) return;
        battleText = String(data.text);
        rematchMode = data.type === "rematch-start" ? false : rematchMode;
        startBattle(Number(data.roundId) || Date.now());
        return;

      case "progress": {
        const hp = Number(data.hp);
        opponentHp = Number.isFinite(hp) ? Math.max(0, Math.min(100, hp)) : opponentHp;
        opponentStats = normalizeRemoteStats({
          correct: data.correct,
          errors: data.errors,
          typed: data.typed,
          accuracy: data.accuracy,
          wpm: data.wpm,
          hp: opponentHp
        });
        $("opHp").textContent = String(opponentHp);
        $("opHpBar").style.width = opponentHp + "%";
        updateLiveStatsUI();
        return;
      }

      case "round-end": {
        opponentStats = normalizeRemoteStats(data);
        opponentHp = opponentStats.hp;
        opponentFinished = true;
        updateHpUI();
        updateLiveStatsUI();
        if (!battleOver) {
          localFinishStats = localFinishStats || calculateStats();
          if (awaitingFinalResult) {
            awaitingFinalResult = false;
            clearTimeout(finalResultTimer);
            finalResultTimer = null;
            showFinalResult(data.reason || "Round time ended. Final performance score decides the winner.");
          }
        }
        return;
      }

      case "finish":
        opponentStats = normalizeRemoteStats(data);
        const finalHp = Number(data.hp);
        if (Number.isFinite(finalHp)) {
          opponentHp = Math.max(0, Math.min(100, finalHp));
          updateHpUI();
        }
        opponentFinished = true;
        updateLiveStatsUI();
        if (battleOver && $("result").classList.contains("active")) return;
        if (localFinished) {
          awaitingFinalResult = false;
          clearTimeout(finalResultTimer);
          finalResultTimer = null;
          showFinalResult("Both players completed the round.");
        } else {
          beginFinishWindow("Opponent completed the passage. Finish within 5 seconds or the final score will decide.");
        }
        return;

      case "rematch-ready":
        rematchMode = true;
        opponentReady = false;
        localReady = false;
        $("meReadyName").textContent = playerName;
        $("opReadyName").textContent = opponentName;
        $("meReadyStatus").textContent = "NOT READY";
        $("opReadyStatus").textContent = "NOT READY";
        $("readyStatus").textContent = "Opponent requested a rematch. Press I'm Ready.";
        $("readyBtn").disabled = false;
        $("readyBtn").textContent = "I'm Ready";
        showScreen("ready");
        return;

      case "winner":
        // Legacy compatibility: an older client may still send winner.
        // Treat it as a completed-finish packet, not an instant defeat.
        opponentStats = normalizeRemoteStats(data);
        opponentFinished = true;
        updateLiveStatsUI();
        if (localFinished) {
          awaitingFinalResult = false;
          clearTimeout(finalResultTimer);
          finalResultTimer = null;
          showFinalResult("Both players completed the passage.");
        } else {
          beginFinishWindow("Opponent completed the passage.");
        }
        return;

      case "defeat":
        opponentHp = 0;
        updateHpUI();
        if (!battleOver) {
          battleOver = true;
          clearInterval(timer);
          timer = null;
          lockTypingSurface();
          $("resultIcon").textContent = "🏆";
          $("resultTitle").textContent = "Victory!";
          $("resultText").textContent = "Your opponent ran out of HP.";
          setResultValues();
          showScreen("result");
        }
        return;

      case "leave":
        $("opConnectionStatus").textContent = "LEFT MATCH";
        $("opConnectionStatus").className = "connection-status left";
        if (!battleOver) finishBattle(false, "Opponent left the match.");
        return;
    }
  }

  function queueQuick(peerId) {
    const url = matchmakingUrl();
    if (!url) {
      setMessage("Matchmaking server URL is missing.");
      return;
    }

    let socket;
    try { socket = new WebSocket(url); }
    catch (_) {
      setMessage("Could not connect to matchmaking server.");
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
      $("waitingText").textContent = "Waiting for another player…";
    });

    socket.addEventListener("message", event => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (_) { return; }

      if (msg.type === "queued") {
        $("waitingTitle").textContent = "Finding Opponent…";
        $("waitingText").textContent = "Waiting for another player…";
        return;
      }

      if (msg.type === "match") {
        const myId = String(peer?.id || "");
        const ids = Array.isArray(msg.peerIds) ? msg.peerIds.map(String) : [];
        isHost = msg.role === "host";
        opponentPeerId = isHost
          ? (ids.find(id => id !== myId) || "")
          : String(msg.hostPeerId || "");
        opponentName = String(msg.opponentName || "Opponent").slice(0, 20);
        roomCode = "QUICK";
        closeMatchmaking();

        if (!opponentPeerId) {
          $("waitingText").textContent = "Opponent found, but connection information is missing. Please try again.";
          return;
        }

        if (isHost) {
          $("waitingTitle").textContent = "Opponent Found!";
          $("waitingText").textContent = "Waiting for opponent to connect…";
        } else {
          $("waitingTitle").textContent = "Opponent Found!";
          $("waitingText").textContent = "Connecting to host…";
          try {
            setupConnection(peer.connect(opponentPeerId, {
              reliable: true,
              serialization: "json"
            }));
          } catch (error) {
            console.error("Peer connection failed:", error);
            $("waitingText").textContent = "Could not connect to host. Please try again.";
          }
        }
        return;
      }

      if (msg.type === "error") {
        $("waitingTitle").textContent = "Matchmaking Error";
        $("waitingText").textContent = msg.message || "Matchmaking error. Please try again.";
      }
    });

    socket.addEventListener("error", error => {
      console.error("Matchmaking WebSocket error:", error);
      if (quickMatch) {
        $("waitingTitle").textContent = "Connection Error";
        $("waitingText").textContent = "Could not reach the matchmaking server. Please try again.";
      }
    });
  }

  function startQuick() {
    safeName();
    quickMatch = true;
    isHost = false;
    resetState();
    closeMatchmaking();
    destroyPeer();

    showScreen("waiting");
    $("waitingTitle").textContent = "Finding Opponent...";
    $("waitingText").textContent = "Connecting to matchmaking...";
    $("roomCodeDisplay").textContent = "AUTO";

    setupPeer();
  }

  function createPrivateRoom() {
    safeName();
    quickMatch = false;
    isHost = true;
    resetState();
    closeMatchmaking();
    destroyPeer();

    roomCode = Math.random().toString(36).slice(2,8).toUpperCase();

    showScreen("waiting");
    $("waitingTitle").textContent = "Private Room Created";
    $("waitingText").textContent = "Share this room code with your opponent.";
    $("roomCodeDisplay").textContent = roomCode;

    peer = new Peer("typingmeter-accuracy-" + roomCode, {debug:1});

    peer.on("open", () => {
      $("waitingText").textContent = "Room ready. Share the code with your opponent.";
    });

    peer.on("connection", incoming => setupConnection(incoming));

    peer.on("error", err => {
      console.error(err);
      $("waitingText").textContent = "Could not create room. Try another code.";
    });
  }

  function joinPrivateRoom() {
    safeName();
    const code = $("roomCode").value.trim().toUpperCase();

    if (!/^[A-Z0-9]{4,6}$/.test(code)) {
      setMessage("Enter a valid 4–6 character room code.");
      return;
    }

    quickMatch = false;
    isHost = false;
    resetState();
    closeMatchmaking();
    destroyPeer();

    roomCode = code;
    showScreen("waiting");
    $("waitingTitle").textContent = "Joining Private Room";
    $("waitingText").textContent = "Connecting to host...";
    $("roomCodeDisplay").textContent = roomCode;

    peer = new Peer(undefined, {debug:1});

    peer.on("open", () => {
      try {
        setupConnection(peer.connect("typingmeter-accuracy-" + roomCode, {
          reliable:true,
          serialization:"json"
        }));
      } catch (_) {
        $("waitingText").textContent = "Could not join room.";
      }
    });

    peer.on("error", err => {
      console.error(err);
      $("waitingText").textContent = "Room not found or host is offline.";
    });
  }

  function ready() {
    if (!connected || localReady) return;
    localReady = true;
    $("readyBtn").disabled = true;
    $("readyBtn").textContent = "Ready ✓";
    $("meReadyStatus").textContent = "READY ✓";
    $("readyStatus").textContent = opponentReady
      ? "Both players are ready. Starting…"
      : "Waiting for opponent to be ready…";
    send({ type: "ready" });
    maybeStart();
  }

  function maybeStart() {
    if (!isHost || !localReady || !opponentReady || !connected) return;

    // IMPORTANT: only the host chooses the passage. The exact same string is
    // sent to the guest, so both players always type the identical paragraph.
    const nextPassage = typeof window.getNextAccuracyMasterPassage === "function"
      ? window.getNextAccuracyMasterPassage()
      : PASSAGES[0] || "Accuracy and control are the foundation of reliable typing.";

    battleText = String(nextPassage);
    const id = Date.now();
    const packetType = rematchMode ? "rematch-start" : "start";

    send({ type: packetType, text: battleText, roundId: id });
    rematchMode = false;
    startBattle(id);
  }

  function normalizeRemoteStats(data) {
    return {
      correct: Math.max(0, Number(data?.correct) || 0),
      errors: Math.max(0, Number(data?.errors) || 0),
      typed: Math.max(0, Number(data?.typed) || 0),
      accuracy: Number.isFinite(Number(data?.accuracy)) ? Math.max(0, Math.min(100, Number(data.accuracy))) : 100,
      wpm: Math.max(0, Number(data?.wpm) || 0),
      hp: Number.isFinite(Number(data?.hp)) ? Math.max(0, Math.min(100, Number(data.hp))) : 100,
      progress: battleText.length ? Math.max(0, Math.min(100, ((Number(data?.typed) || 0) / battleText.length) * 100)) : 0
    };
  }

  function getProgressPercent(stats) {
    return battleText.length ? Math.max(0, Math.min(100, (stats.typed / battleText.length) * 100)) : 0;
  }

  function beginFinishWindow(message) {
    if (battleOver || localFinished || opponentFinished && finishWindowTimer) return;
    clearTimeout(finishWindowTimer);
    finishWindowEndsAt = performance.now() + FINISH_WINDOW_MS;
    $("battleMessage").textContent = message || "Opponent finished. You have 5 seconds to finish.";
    finishWindowTimer = setTimeout(() => {
      finishWindowTimer = null;
      if (!battleOver && !localFinished) {
        finishBattle(false, "Finish window expired. Final performance score decides the winner.");
      }
    }, FINISH_WINDOW_MS);
  }

  function updateFinishWindowMessage() {
    if (!finishWindowTimer || battleOver || localFinished) return;
    const remaining = Math.max(0, Math.ceil((finishWindowEndsAt - performance.now()) / 1000));
    $("battleMessage").textContent = `Opponent finished. Finish window: ${remaining}s`;
  }

  function updateLiveStatsUI() {
    $("meTyped").textContent = String(localStats.typed);
    $("meCorrect").textContent = String(localStats.correct);
    $("meErrors").textContent = String(localStats.errors);
    $("meWpm").textContent = String(localStats.wpm);
    $("opTyped").textContent = String(opponentStats.typed);
    $("opCorrect").textContent = String(opponentStats.correct);
    $("opErrors").textContent = String(opponentStats.errors);
    $("opWpm").textContent = String(opponentStats.wpm);
  }

  function updateHpUI() {
    localHp = Math.max(0, Math.min(100, Number(localHp) || 0));
    opponentHp = Math.max(0, Math.min(100, Number(opponentHp) || 0));
    $("meHp").textContent = String(localHp);
    $("opHp").textContent = String(opponentHp);
    $("meHpBar").style.width = localHp + "%";
    $("opHpBar").style.width = opponentHp + "%";
  }

  function renderPassage() {
    const box = $("prompt");
    if (!box) return;

    box.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < battleText.length; i++) {
      const span = document.createElement("span");
      span.className = "passage-char";
      span.dataset.index = String(i);
      span.textContent = battleText[i];
      fragment.appendChild(span);
    }

    box.appendChild(fragment);
    requestAnimationFrame(() => {
      setCaretAt(typedIndex, true);
    });
  }

  function getCharNode(index) {
    const box = $("prompt");
    if (!box) return null;
    return box.querySelector(`.passage-char[data-index="${index}"]`);
  }

  function setCaretAt(index, forceScroll = false) {
    const box = $("prompt");
    if (!box || !box.isContentEditable) return;

    const safeIndex = Math.max(0, Math.min(Number(index) || 0, battleText.length));
    let node = null;
    let offset = 0;

    if (safeIndex < battleText.length) {
      const char = getCharNode(safeIndex);
      if (!char || !char.firstChild) return;
      node = char.firstChild;
      offset = 0;
    } else {
      const last = getCharNode(battleText.length - 1);
      if (last && last.firstChild) {
        node = last.firstChild;
        offset = last.firstChild.nodeValue.length;
      } else {
        node = box;
        offset = box.childNodes.length;
      }
    }

    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);

    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);

    keepCaretVisible(range, forceScroll);
  }

  let targetScrollTop = 0;
  let scrollFrame = 0;

  function animatePromptScroll() {
    const box = $("prompt");
    if (!box) {
      scrollFrame = 0;
      return;
    }

    const current = box.scrollTop;
    const diff = targetScrollTop - current;
    if (Math.abs(diff) < 0.5) {
      box.scrollTop = targetScrollTop;
      scrollFrame = 0;
      return;
    }

    box.scrollTop = current + diff * 0.22;
    scrollFrame = requestAnimationFrame(animatePromptScroll);
  }

  function smoothPromptScrollTo(top) {
    const box = $("prompt");
    if (!box) return;

    const max = Math.max(0, box.scrollHeight - box.clientHeight);
    targetScrollTop = Math.max(0, Math.min(top, max));

    if (!scrollFrame) scrollFrame = requestAnimationFrame(animatePromptScroll);
  }

  function keepCaretVisible(range, forceScroll = false) {
    const box = $("prompt");
    if (!box || !range) return;

    const rect = range.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(box).lineHeight) || 32;
    const topSafe = boxRect.top + lineHeight * 0.55;
    const bottomSafe = boxRect.bottom - lineHeight * 0.55;

    let desired = box.scrollTop;

    if (rect.bottom > bottomSafe) {
      desired += rect.bottom - bottomSafe;
    } else if (rect.top < topSafe) {
      desired -= topSafe - rect.top;
    } else if (forceScroll) {
      desired = Math.max(0, box.scrollTop);
    }

    smoothPromptScrollTo(desired);
  }

  function updatePassageCharacter(index, correct) {
    const node = getCharNode(index);
    if (!node) return;
    node.classList.remove("correct", "wrong");
    node.classList.add(correct ? "correct" : "wrong");
  }

  function startBattle(id) {
    roundId = id;
    roundTime = getRoundTime(battleText);
    battleOver = false;
    finishSent = false;
    opponentFinished = false;
    localFinished = false;
    localFinishStats = null;
    finishWindowEndsAt = 0;
    clearTimeout(finishWindowTimer);
    finishWindowTimer = null;
    typedIndex = 0;
    correctTyped = 0;
    errorTyped = 0;
    localStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0};
    opponentStats = {correct:0, errors:0, typed:0, accuracy:100, wpm:0, hp:100, progress:0};
    awaitingFinalResult = false;
    clearTimeout(finalResultTimer);
    finalResultTimer = null;
    localHp = 100;
    opponentHp = 100;
    startedAt = performance.now();
    lastKeyProcessed = "";
    lastKeyProcessedAt = 0;
    targetScrollTop = 0;
    lastTypedAt = performance.now();
    idlePenaltyStep = 0;
    nextIdlePenaltyAt = lastTypedAt + 5000;
    clearInterval(idlePenaltyTimer);
    idlePenaltyTimer = setInterval(checkIdlePenalty, 100);

    $("meName").textContent = playerName;
    $("opName").textContent = opponentName || "Opponent";
    updateLiveStatsUI();
    $("progressBar").style.width = "0%";
    $("battleMessage").textContent = "Type directly in the passage. Backspace and Delete are disabled.";
    $("opConnectionStatus").textContent = "ONLINE";
    $("opConnectionStatus").className = "connection-status online";

    const prompt = $("prompt");
    prompt.contentEditable = "true";
    prompt.setAttribute("aria-label", "Type directly in the Accuracy Master passage");
    prompt.setAttribute("aria-disabled", "false");
    prompt.classList.remove("typing-disabled");
    prompt.scrollTop = 0;
    renderPassage();
    updateHpUI();

    showScreen("battle");

    const seconds = roundTime;
    $("timer").textContent = String(seconds);

    clearInterval(timer);
    let remaining = seconds;
    timer = setInterval(() => {
      remaining--;
      $("timer").textContent = String(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        clearInterval(idlePenaltyTimer);
        idlePenaltyTimer = null;
        finishBattle(false);
      }
    }, 1000);

    requestAnimationFrame(() => {
      prompt.focus({ preventScroll: true });
      setCaretAt(0, true);
    });
  }

  function calculateStats(endAt = null) {
    const typed = typedIndex;
    const correct = correctTyped;
    const errors = errorTyped;
    const stopAt = Number.isFinite(endAt) ? endAt : performance.now();
    const elapsed = Math.max((stopAt - startedAt) / 60000, 1 / 60);
    const wpm = Math.max(0, Math.round((correct / 5) / elapsed));
    const accuracy = typed ? (correct / typed) * 100 : 100;
    return { correct, errors, typed, wpm, accuracy, hp: localHp, progress: getProgressPercent({typed}) };
  }

  function resetIdlePenaltyCycle() {
    lastTypedAt = performance.now();
    idlePenaltyStep = 0;
    nextIdlePenaltyAt = lastTypedAt + 5000;
  }

  function checkIdlePenalty() {
    if (battleOver || !$("battle").classList.contains("active") || typedIndex >= battleText.length) return;

    const now = performance.now();
    updateFinishWindowMessage();
    if (now < nextIdlePenaltyAt) return;

    const penalty = Math.min(100, 5 * (idlePenaltyStep + 1));
    localHp = Math.max(0, localHp - penalty);
    idlePenaltyStep += 1;
    nextIdlePenaltyAt += IDLE_PENALTY_INTERVAL_MS;

    updateHpUI();
    const stats = calculateStats();
    $("battleMessage").textContent = `Idle penalty: -${penalty} HP. Type a character to reset the penalty cycle.`;
    send({
      type: "progress",
      correct: stats.correct,
      errors: stats.errors,
      typed: stats.typed,
      accuracy: stats.accuracy,
      wpm: stats.wpm,
      hp: localHp,
      progress: getProgressPercent(stats)
    });

    if (localHp <= 0) {
      battleOver = true;
      clearInterval(timer);
      timer = null;
      clearInterval(idlePenaltyTimer);
      idlePenaltyTimer = null;
      lockTypingSurface();
      send({ type: "defeat" });
      $("resultIcon").textContent = "🎯";
      $("resultTitle").textContent = "Defeat";
      $("resultText").textContent = "Your HP reached 0 because you stopped typing.";
      setResultValues(stats);
      showScreen("result");
    }
  }

  function processTypedCharacter(ch) {
    if (battleOver || !$("battle").classList.contains("active")) return;
    if (typeof ch !== "string" || ch.length !== 1) return;
    if (typedIndex >= battleText.length) return;

    // Any actual typed character immediately resets the inactivity penalty.
    resetIdlePenaltyCycle();

    const expected = battleText[typedIndex];
    const currentIndex = typedIndex;
    typedIndex += 1;

    const isCorrect = ch === expected;
    updatePassageCharacter(currentIndex, isCorrect);

    if (isCorrect) {
      correctTyped += 1;
    } else {
      errorTyped += 1;
      // One accepted wrong character = exactly 5 HP damage.
      localHp = Math.max(0, localHp - 5);
    }

    const stats = calculateStats();
    localStats = stats;
    updateLiveStatsUI();
    updateHpUI();

    const pct = battleText.length
      ? Math.min(100, (typedIndex / battleText.length) * 100)
      : 0;
    $("progressBar").style.width = pct.toFixed(1) + "%";
    $("battleMessage").textContent = stats.errors === 0
      ? "🔥 Perfect so far!"
      : "Stay focused. Each wrong key costs 5 HP.";

    setCaretAt(typedIndex);

    send({
      type: "progress",
      correct: stats.correct,
      errors: stats.errors,
      typed: stats.typed,
      accuracy: stats.accuracy,
      wpm: stats.wpm,
      hp: localHp,
      progress: getProgressPercent(stats)
    });

    if (localHp <= 0) {
      battleOver = true;
      clearInterval(timer);
      timer = null;
      clearInterval(idlePenaltyTimer);
      idlePenaltyTimer = null;
      lockTypingSurface();
      send({ type: "defeat" });
      $("resultIcon").textContent = "🎯";
      $("resultTitle").textContent = "Defeat";
      $("resultText").textContent = "Your HP reached 0. Every wrong key costs 5 HP.";
      setResultValues(stats);
      showScreen("result");
      return;
    }

    // Completing the passage is NOT an instant victory. It starts a short
    // finish window so the opponent can finish too; then final performance
    // score decides the result. This prevents a tiny timing advantage from
    // overriding a much faster/cleaner opponent.
    if (typedIndex >= battleText.length) {
      finishBattle(true, "You completed the passage.");
    }
  }

  function blockEditing(e) {
    if (battleOver || !$("battle").classList.contains("active")) {
      e.preventDefault();
      return;
    }

    if (e.type === "beforeinput") {
      const type = e.inputType || "";

      if (/delete|historyUndo|historyRedo|insertFromPaste|insertFromDrop|insertReplacementText|format/i.test(type)) {
        e.preventDefault();
        $("battleMessage").textContent = "Backspace, Delete, paste and corrections are disabled.";
        setCaretAt(typedIndex);
        return;
      }

      if (type === "insertText" && typeof e.data === "string" && e.data.length) {
        e.preventDefault();
        const now = performance.now();
        if (!(e.data === lastKeyProcessed && now - lastKeyProcessedAt < 80)) {
          // beforeinput can be the only text event on virtual keyboards.
          for (const ch of e.data) processTypedCharacter(ch);
          lastKeyProcessed = e.data;
          lastKeyProcessedAt = now;
        }
        return;
      }

      e.preventDefault();
      return;
    }

    if (e.type === "keydown") {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        $("battleMessage").textContent = "Backspace and Delete are disabled. Type the next character carefully.";
        setCaretAt(typedIndex);
        return;
      }

      if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        setCaretAt(typedIndex);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
        e.preventDefault();
        const now = performance.now();
        const duplicate = e.key === lastKeyProcessed && (now - lastKeyProcessedAt) < 80;
        if (!duplicate) {
          processTypedCharacter(e.key);
          lastKeyProcessed = e.key;
          lastKeyProcessedAt = now;
        }
      }
    }
  }

  function blockPasteAndDrop(e) {
    e.preventDefault();
    $("battleMessage").textContent = "Paste and drop are disabled. Type directly in the passage.";
    setCaretAt(typedIndex);
  }

  function lockTypingSurface() {
    const prompt = $("prompt");
    if (prompt) {
      prompt.contentEditable = "false";
      prompt.setAttribute("aria-disabled", "true");
    }
  }

  function scoreBreakdown(stats) {
    const accuracy = Math.max(0, Math.min(100, Number(stats?.accuracy) || 0));
    const progress = Number.isFinite(Number(stats?.progress))
      ? Math.max(0, Math.min(100, Number(stats.progress)))
      : getProgressPercent(stats || {typed:0});
    const wpm = Math.max(0, Number(stats?.wpm) || 0);
    const hp = Math.max(0, Math.min(100, Number(stats?.hp ?? 100)));
    const wpmScore = Math.max(0, Math.min(100, (wpm / 120) * 100));
    const accuracyPoints = accuracy * 0.45;
    const progressPoints = progress * 0.30;
    const wpmPoints = wpmScore * 0.15;
    const hpPoints = hp * 0.10;
    const total = accuracyPoints + progressPoints + wpmPoints + hpPoints;
    return {
      accuracy, progress, wpm, hp, wpmScore,
      accuracyPoints, progressPoints, wpmPoints, hpPoints,
      total: Math.round(total * 10) / 10
    };
  }

  function score(stats) {
    return Math.round(scoreBreakdown(stats).total);
  }

  function setBar(id, points, maxPoints) {
    const el = $(id);
    if (el) el.style.width = Math.max(0, Math.min(100, (points / maxPoints) * 100)) + "%";
  }

  function setResultValues(stats = null) {
    const mine = stats || localFinishStats || calculateStats();
    const op = opponentStats || {correct:0, errors:0, typed:0, accuracy:100, wpm:0, hp:100, progress:0};
    const me = scoreBreakdown(mine);
    const them = scoreBreakdown(op);

    $("resultMeName").textContent = playerName || "YOU";
    $("resultOpName").textContent = opponentName || "OPPONENT";
    $("resultMeHeading").textContent = playerName || "YOU";
    $("resultOpHeading").textContent = opponentName || "OPPONENT";

    $("resultScore").textContent = me.total.toFixed(1);
    $("opResultScore").textContent = them.total.toFixed(1);

    $("resultAccuracy").textContent = me.accuracy.toFixed(1) + "%";
    $("resultWpm").textContent = String(Math.round(me.wpm));
    $("resultErrors").textContent = String(Math.round(mine.errors || 0));
    $("resultTyped").textContent = String(Math.round(mine.typed || 0));
    $("resultCorrect").textContent = String(Math.round(mine.correct || 0));
    $("resultProgress").textContent = me.progress.toFixed(1) + "%";
    $("resultHp").textContent = String(Math.round(me.hp));

    $("opResultAccuracy").textContent = them.accuracy.toFixed(1) + "%";
    $("opResultWpm").textContent = String(Math.round(them.wpm));
    $("opResultErrors").textContent = String(Math.round(op.errors || 0));
    $("opResultTyped").textContent = String(Math.round(op.typed || 0));
    $("opResultCorrect").textContent = String(Math.round(op.correct || 0));
    $("opResultProgress").textContent = them.progress.toFixed(1) + "%";
    $("opResultHp").textContent = String(Math.round(them.hp));

    $("meChartAccuracy").textContent = me.accuracy.toFixed(1) + "%";
    $("opChartAccuracy").textContent = them.accuracy.toFixed(1) + "%";
    $("meChartProgress").textContent = me.progress.toFixed(1) + "%";
    $("opChartProgress").textContent = them.progress.toFixed(1) + "%";
    $("meChartWpm").textContent = String(Math.round(me.wpm));
    $("opChartWpm").textContent = String(Math.round(them.wpm));
    $("meChartHp").textContent = Math.round(me.hp) + "%";
    $("opChartHp").textContent = Math.round(them.hp) + "%";

    $("meCalcAccuracy").textContent = me.accuracyPoints.toFixed(1) + " / 45";
    $("opCalcAccuracy").textContent = them.accuracyPoints.toFixed(1) + " / 45";
    $("meCalcProgress").textContent = me.progressPoints.toFixed(1) + " / 30";
    $("opCalcProgress").textContent = them.progressPoints.toFixed(1) + " / 30";
    $("meCalcWpm").textContent = me.wpmPoints.toFixed(1) + " / 15";
    $("opCalcWpm").textContent = them.wpmPoints.toFixed(1) + " / 15";
    $("meCalcHp").textContent = me.hpPoints.toFixed(1) + " / 10";
    $("opCalcHp").textContent = them.hpPoints.toFixed(1) + " / 10";

    $("meArithmetic").textContent = `${(me.accuracyPoints).toFixed(1)} + ${(me.progressPoints).toFixed(1)} + ${(me.wpmPoints).toFixed(1)} + ${(me.hpPoints).toFixed(1)} = ${me.total.toFixed(1)}`;
    $("opArithmetic").textContent = `${(them.accuracyPoints).toFixed(1)} + ${(them.progressPoints).toFixed(1)} + ${(them.wpmPoints).toFixed(1)} + ${(them.hpPoints).toFixed(1)} = ${them.total.toFixed(1)}`;

    setBar("meBarAccuracy", me.accuracyPoints, 45); setBar("opBarAccuracy", them.accuracyPoints, 45);
    setBar("meBarProgress", me.progressPoints, 30); setBar("opBarProgress", them.progressPoints, 30);
    setBar("meBarWpm", me.wpmPoints, 15); setBar("opBarWpm", them.wpmPoints, 15);
    setBar("meBarHp", me.hpPoints, 10); setBar("opBarHp", them.hpPoints, 10);
  }

  function sendRoundEnd(reason) {
    const stats = calculateStats();
    localFinishStats = stats;
    send({
      type: "round-end",
      reason: reason || "Round time ended.",
      correct: stats.correct,
      errors: stats.errors,
      typed: stats.typed,
      accuracy: stats.accuracy,
      wpm: stats.wpm,
      hp: stats.hp,
      progress: stats.progress
    });
  }

  function finishBattle(completed = false, reason = null) {
    if (battleOver) return;

    if (completed) {
      localFinished = true;
      localFinishStats = calculateStats();
      if (!finishSent) {
        finishSent = true;
        const stats = localFinishStats;
        send({
          type: "finish",
          correct: stats.correct,
          errors: stats.errors,
          typed: stats.typed,
          accuracy: stats.accuracy,
          wpm: stats.wpm,
          hp: stats.hp,
          progress: stats.progress
        });
      }

      if (opponentFinished) {
        showFinalResult("Both players completed the round.");
      } else {
        beginFinishWindow("You finished! Your opponent has 5 seconds to finish. Final score decides the winner.");
      }
      return;
    }

    // Timer/forced end: exchange final stats, then wait briefly for the
    // opponent's final packet before comparing both players.
    if (!finishSent) {
      finishSent = true;
      sendRoundEnd(reason || "Round time ended.");
    }

    if (reason === "Opponent disconnected." || reason === "Opponent left the match.") {
      showFinalResult(reason);
      return;
    }

    // Do not calculate a result until the opponent's final stats arrive.
    // This keeps both clients on the exact same two-player result.
    awaitingFinalResult = true;
    clearTimeout(finalResultTimer);
    finalResultTimer = setTimeout(() => {
      if (!battleOver && awaitingFinalResult) {
        awaitingFinalResult = false;
        showFinalResult(reason || "Round time ended. Final performance score decides the winner.");
      }
    }, 3000);
  }

  function showFinalResult(reason = null) {
    if (battleOver) return;
    battleOver = true;
    clearInterval(timer);
    timer = null;
    clearInterval(idlePenaltyTimer);
    idlePenaltyTimer = null;
    clearTimeout(finishWindowTimer);
    finishWindowTimer = null;
    awaitingFinalResult = false;
    clearTimeout(finalResultTimer);
    finalResultTimer = null;
    lockTypingSurface();

    const mine = localFinishStats || calculateStats();
    const myScore = score(mine);
    const opponentScore = score(opponentStats);

    let title = "Draw!";
    let icon = "🤝";
    let text = reason || "Round complete.";

    if (reason === "Opponent disconnected." || reason === "Opponent left the match.") {
      title = "Victory!";
      icon = "🏆";
      text = reason;
    } else if (myScore > opponentScore) {
      title = "Victory!";
      icon = "🏆";
      text = `You win with ${myScore} points vs ${opponentScore}.`;
    } else if (myScore < opponentScore) {
      title = "Defeat";
      icon = "🎯";
      text = `${opponentName || "Your opponent"} wins with ${opponentScore} points vs ${myScore}.`;
    } else {
      text = `Perfect tie: both players scored ${myScore} points.`;
    }

    $("resultIcon").textContent = icon;
    $("resultTitle").textContent = title;
    $("resultText").textContent = text;
    setResultValues(mine);
    showScreen("result");
  }

  function requestRematch() {
    if (!connected) {
      showScreen("lobby");
      return;
    }

    rematchMode = true;
    localReady = false;
    opponentReady = false;
    $("readyBtn").disabled = false;
    $("readyBtn").textContent = "I'm Ready";
    $("meReadyStatus").textContent = "NOT READY";
    $("opReadyStatus").textContent = "NOT READY";
    $("readyStatus").textContent = "Rematch requested. Both players must press I'm Ready.";
    $("meReadyName").textContent = playerName;
    $("opReadyName").textContent = opponentName || "Opponent";
    showScreen("ready");
    send({ type: "rematch-ready" });
  }

  function leave() {
    let sent = false;
    try { sent = send({ type: "leave" }); } catch (_) {}

    const cleanup = () => {
      closeMatchmaking();
      destroyPeer();
      resetState();
      showScreen("lobby");
      setMessage("");
    };

    if (sent) setTimeout(cleanup, 150);
    else cleanup();
  }

  $("quickBtn").addEventListener("click", startQuick);
  $("createBtn").addEventListener("click", createPrivateRoom);
  $("joinBtn").addEventListener("click", joinPrivateRoom);
  $("cancelBtn").addEventListener("click", leave);
  $("readyLeaveBtn").addEventListener("click", leave);
  $("battleLeaveBtn").addEventListener("click", leave);
  $("readyBtn").addEventListener("click", ready);

  const prompt = $("prompt");
  prompt.addEventListener("keydown", blockEditing);
  prompt.addEventListener("beforeinput", blockEditing);
  prompt.addEventListener("paste", blockPasteAndDrop);
  prompt.addEventListener("drop", blockPasteAndDrop);
  prompt.addEventListener("cut", e => {
    e.preventDefault();
    $("battleMessage").textContent = "Cut and corrections are disabled.";
    setCaretAt(typedIndex);
  });
  prompt.addEventListener("contextmenu", e => e.preventDefault());
  prompt.addEventListener("click", () => {
    if (!battleOver) {
      prompt.focus({ preventScroll: true });
      setCaretAt(typedIndex);
    }
  });
  prompt.addEventListener("focus", () => {
    if (!battleOver) setCaretAt(typedIndex);
  });
  prompt.addEventListener("blur", () => {
    if (!battleOver && $("battle").classList.contains("active")) {
      requestAnimationFrame(() => {
        prompt.focus({ preventScroll: true });
        setCaretAt(typedIndex);
      });
    }
  });

  $("rematchBtn").addEventListener("click", requestRematch);
  $("homeBtn").addEventListener("click", leave);
  $("playerName").value = localStorage.getItem("typingmeter_accuracy_name") || "";
})();
