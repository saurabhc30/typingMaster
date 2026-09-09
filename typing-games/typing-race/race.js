/* =========================================================
   TYPINGMETER TYPING RACE - PHASE 1
   WebRTC via PeerJS. No TypingMeter database is required.
   PeerJS's public signaling service is used only to establish
   the P2P connection; race progress is sent browser-to-browser.
   ========================================================= */
(function initTypingRace() {
  const $ = id => document.getElementById(id);

  const section = $("typingRaceSection");
  if (!section) return;

  const lobby = $("raceLobby");
  const waiting = $("raceWaiting");
  const readyPanel = $("raceReady");
  const battle = $("raceBattle");
  const result = $("raceResult");

  const createBtn = $("createRaceBtn");
  const quickMatchBtn = $("quickMatchBtn");
  const joinBtn = $("joinRaceBtn");
  const quickMatchCancelBtn = $("quickMatchCancelBtn");
  const raceTimerEl = $("raceTimer");
  const raceHistoryEl = $("raceHistory");
  const codeInput = $("raceCodeInput");
  const playerNameInput = $("racePlayerName");
  const roomCodeEl = $("raceRoomCode");
  const copyBtn = $("copyRaceCodeBtn");
  const cancelBtn = $("cancelRaceBtn");
  const readyBtn = $("raceReadyBtn");
  const leaveBtn = $("raceLeaveBtn");
  const rematchBtn = $("raceRematchBtn");
  const closeBtn = $("raceCloseBtn");
  const resultCloseBtn = $("raceResultCloseBtn");
  const statusEl = $("raceConnectionStatus");
  const readyNote = $("raceReadyNote");

  const countdownEl = $("raceCountdown");
  const raceTextEl = $("raceTypingText");
  const raceWordCountEl = $("raceWordCount");
  const raceAccuracyHint = $("raceAccuracyHint");
  const raceInput = $("raceInput");
  const yourNameEl = $("raceYourName");
  const opponentNameEl = $("raceOpponentName");
  const youLabelEl = $("raceYouLabel");
  const opponentLabelEl = $("raceOpponentLabel");

  const youProgress = $("raceYouProgress");
  const opponentProgress = $("raceOpponentProgress");
  const youPercent = $("raceYouPercent");
  const opponentPercent = $("raceOpponentPercent");
  const youWpm = $("raceYouWpm");
  const opponentWpm = $("raceOpponentWpm");
  const liveStatus = $("raceLiveStatus");

  const resultIcon = $("raceResultIcon");
  const resultTitle = $("raceResultTitle");
  const resultSubtitle = $("raceResultSubtitle");
  const resultYourWpm = $("raceResultYourWpm");
  const resultYourAccuracy = $("raceResultYourAccuracy");
  const resultOpponentWpm = $("raceResultOpponentWpm");
  const resultTime = $("raceResultTime");
  const resultPlayerYou = $("raceResultPlayerYou");
  const resultPlayerOpponent = $("raceResultPlayerOpponent");
  const resultPlayerYouStatus = $("raceResultPlayerYouStatus");
  const resultPlayerOpponentStatus = $("raceResultPlayerOpponentStatus");

  let peer = null;
  let conn = null;
  let isHost = false;
  let roomCode = "";
  let connected = false;
  let localReady = false;
  let remoteReady = false;
  let raceStarted = false;
  let raceFinished = false;
  let raceStartMs = 0;
  let countdownTimer = null;
  let progressTimer = null;
  let remoteProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
  let localProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
  let raceText = "";
  let playerName = localStorage.getItem("typingmeterRacePlayerName") || "";
  let opponentName = "Opponent";
  let quickMatch = false;
  let matchmakingSocket = null;
  let matchmakingQueued = false;
  let quickMatchOpponentPeerId = "";
  let localRematchRequested = false;
  let remoteRematchRequested = false;
  let raceDeadlineMs = 0;
  let suppressDisconnect = false;
  const RACE_TIME_LIMIT_SECONDS = 120;
  const FALLBACK_RACE_TEXT = "Typing practice helps you build speed accuracy and confidence. Focus on keeping a steady rhythm while reading ahead and correcting mistakes calmly. The goal is not only to type quickly but also to maintain consistent accuracy throughout the race. Stay relaxed keep your hands positioned correctly and let each sentence flow naturally. With regular practice your timing coordination and control will improve.";
  const RACE_HISTORY_KEY = "typingmeterRaceHistory";
  const RACE_HISTORY_VERSION = 1;
  const MAX_RACE_HISTORY = 200;

  function clearRaceDeadlineTimer() {
    if (window.__typingRaceDeadlineTimer) {
      clearTimeout(window.__typingRaceDeadlineTimer);
      window.__typingRaceDeadlineTimer = null;
    }
  }

  if (playerNameInput) playerNameInput.value = playerName;

  function getPlayerName() {
    const name = String(playerNameInput?.value || "").trim().replace(/\s+/g, " ");
    playerName = (name || (isHost ? "Player 1" : "Player 2")).slice(0, 20);
    try { localStorage.setItem("typingmeterRacePlayerName", playerName); } catch (_) { }
    if (yourNameEl) yourNameEl.textContent = playerName;
    if (youLabelEl) youLabelEl.textContent = playerName.toUpperCase();
    return playerName;
  }

  function setOpponentName(name) {
    opponentName = String(name || "Opponent").trim().slice(0, 20) || "Opponent";
    if (opponentNameEl) opponentNameEl.textContent = opponentName;
    if (opponentLabelEl) opponentLabelEl.textContent = opponentName.toUpperCase();
  }

  function getMatchmakingUrl() {
    return String(window.TYPINGMETER_MATCHMAKING_URL || "").trim();
  }

  function setQuickMatchStatus(text) {
    const el = $("quickMatchStatus");
    if (el) el.textContent = text;
  }

  function closeMatchmakingSocket() {
    matchmakingQueued = false;
    try { matchmakingSocket?.close(); } catch (_) { }
    matchmakingSocket = null;
  }

  function createHistoryId() {
    try {
      if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch (_) { }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function readRaceHistory() {
    try {
      const raw = localStorage.getItem(RACE_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);

      // Migrate the previous array-only format automatically.
      const items = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.items) ? parsed.items : []);

      return items
        .filter(item => item && typeof item === "object")
        .map(item => ({
          id: String(item.id || createHistoryId()),
          date: String(item.date || new Date().toISOString()),
          mode: String(item.mode || "Typing Race"),
          you: String(item.you || playerName || "Player"),
          opponent: String(item.opponent || "Opponent"),
          outcome: String(item.outcome || "timeout"),
          yourWpm: Number(item.yourWpm) || 0,
          yourAccuracy: Number(item.yourAccuracy) || 0,
          opponentWpm: Number(item.opponentWpm) || 0,
          time: Number(item.time) || 0
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_RACE_HISTORY);
    } catch (_) {
      return [];
    }
  }

  function writeRaceHistory(history) {
    try {
      localStorage.setItem(RACE_HISTORY_KEY, JSON.stringify({
        version: RACE_HISTORY_VERSION,
        items: history.slice(0, MAX_RACE_HISTORY)
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function saveRaceHistory(outcome) {
    const item = {
      id: createHistoryId(),
      date: new Date().toISOString(),
      mode: quickMatch ? "Quick Match" : "Private Race",
      you: playerName,
      opponent: opponentName,
      outcome,
      yourWpm: Number(localProgress.wpm) || 0,
      yourAccuracy: Number(localProgress.accuracy) || 0,
      opponentWpm: Number(remoteProgress.wpm) || 0,
      time: Number(localProgress.elapsed) || 0
    };

    const history = readRaceHistory();
    history.unshift(item);
    writeRaceHistory(history);
    renderRaceHistory();
  }

  function renderRaceHistory() {
    if (!raceHistoryEl) return;
    const history = readRaceHistory();
    const countEl = $("raceHistoryCount");
    if (countEl) countEl.textContent = history.length ? `${history.length} saved` : "No races";

    if (!history.length) {
      raceHistoryEl.innerHTML = '<p class="race-history-empty">Your completed races will stay saved on this device.</p>';
      return;
    }

    raceHistoryEl.innerHTML = history.map(item => {
      const date = new Date(item.date);
      const validDate = !Number.isNaN(date.getTime());
      const label = item.outcome === "win" ? "🏆 Win"
        : item.outcome === "loss" ? "⚡ Loss"
          : item.outcome === "draw" ? "🤝 Draw"
            : item.outcome === "disconnect" ? "📡 Opponent Left"
              : "⏱ Time Up";
      const dateText = validDate ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
      return `<div class="race-history-item">
        <div class="race-history-main">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(item.mode)} · vs ${escapeHtml(item.opponent)}</span>
          <small>${escapeHtml(dateText)}</small>
        </div>
        <div class="race-history-stats">
          <strong>${Number(item.yourWpm) || 0} WPM</strong>
          <span>${Number(item.yourAccuracy) || 0}% accuracy · ${Number(item.time) > 0 ? `${Number(item.time).toFixed(2)}s` : "DNF"}</span>
          <small>Opponent: ${Number(item.opponentWpm) || 0} WPM</small>
        </div>
      </div>`;
    }).join("");
  }

  function clearRaceHistory() {
    if (!readRaceHistory().length) return;
    if (!window.confirm("Clear all saved Typing Race history from this device?")) return;
    try {
      localStorage.removeItem(RACE_HISTORY_KEY);
    } catch (_) { }
    renderRaceHistory();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function showPanel(name) {
    [lobby, waiting, readyPanel, battle, result].forEach(p => { if (p) p.hidden = true; });
    const target = ({ lobby, waiting, ready: readyPanel, battle, result })[name];
    if (target) target.hidden = false;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function makeRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function getRacePassagePool() {
    const pools = [];

    if (typeof passages !== "undefined" && passages && typeof passages === "object") {
      Object.keys(passages).forEach(key => {
        const list = Array.isArray(passages[key]) ? passages[key] : [];
        list.forEach(item => {
          const raw = typeof item === "string"
            ? item
            : (item?.text || item?.passage || "");
          const clean = String(raw || "").trim().replace(/\s+/g, " ");
          if (clean) pools.push(clean);
        });
      });
    }

    // Turn long source passages into separate 50–100 word race passages.
    // This gives the game many unique passages even when the main dataset
    // contains only a few long passages.
    const candidates = [];
    const seen = new Set();

    function addCandidate(value) {
      const clean = String(value || "").trim().replace(/\s+/g, " ");
      const count = clean.split(/\s+/).filter(Boolean).length;
      if (count >= 50 && count <= 100 && !seen.has(clean)) {
        seen.add(clean);
        candidates.push(clean);
      }
    }

    pools.forEach(sourceText => {
      addCandidate(sourceText);

      const sentences = sourceText.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [];
      let chunk = [];

      for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/).filter(Boolean);
        if (!words.length) continue;

        if (chunk.length && chunk.length + words.length > 100) {
          if (chunk.length >= 50) addCandidate(chunk.join(" "));
          chunk = [];
        }

        if (words.length > 100) {
          for (let i = 0; i < words.length; i += 80) {
            const part = words.slice(i, i + 80);
            if (part.length >= 50) addCandidate(part.join(" "));
          }
          continue;
        }

        chunk.push(...words);
        if (chunk.length >= 50) {
          addCandidate(chunk.join(" "));
          chunk = [];
        }
      }

      if (chunk.length >= 50) addCandidate(chunk.join(" "));
    });

    // Small built-in backup pool. It is used only when the site's passage
    // dataset does not contain enough 50–100 word passages.
    const backup = [
      "Good typing is built on accuracy, rhythm, and relaxed hands. Keep your eyes on the words ahead instead of staring at every key. When you make a mistake, slow down, correct it, and continue with a steady pace. Regular practice helps your fingers remember common patterns and makes difficult words easier to type without hesitation.",
      "A useful typing routine does not need to be long. Ten focused minutes each day can improve control and confidence over time. Start at a comfortable speed, concentrate on accurate keystrokes, and gradually increase your pace. Consistent practice is more valuable than rushing through a test and repeating the same mistakes again and again.",
      "Fast typing comes from efficient movement rather than pressing keys as hard as possible. Keep your wrists comfortable, use the correct fingers, and avoid unnecessary hand movement. Read slightly ahead of your current position so your brain can prepare the next words. With patience, accuracy becomes automatic and speed can increase naturally.",
      "Typing tests are most useful when they help you understand your habits. A high speed with frequent errors may not be as valuable as a slightly lower speed with excellent accuracy. Track both numbers after each session and look for patterns in your mistakes. Over time, this information can guide practice toward the areas that need the most attention.",
      "Before starting a typing race, take a moment to settle your hands and focus on the passage. Do not begin by trying to type at maximum speed. Build a smooth rhythm during the first few seconds, then increase your pace when the text feels familiar. Staying calm after a mistake can prevent one small error from becoming a long chain of errors.",
      "Reading while typing is an important skill because your eyes can prepare information before your fingers need it. Try to look at several words ahead without losing your current position. This reduces pauses and makes punctuation and longer words easier to handle. The more you practice this habit, the more naturally your eyes and hands work together.",
      "Accuracy is a foundation for reliable typing speed. If you constantly stop to repair mistakes, your overall pace becomes uneven. Practice difficult letter combinations slowly and repeat them until the movement feels comfortable. Once accuracy is stable, increase speed in small steps. The goal is controlled typing that remains dependable even when the timer is running.",
      "A multiplayer typing race should reward both speed and precision. Every player receives the same passage so that the result depends on typing performance rather than text difficulty. Watch the progress bar, keep your attention on the next words, and correct mistakes before continuing. The first player to complete the passage accurately reaches the finish line.",
      "Your keyboard does not need to be expensive for you to improve your typing. What matters most is learning consistent finger positions and developing good habits. Keep your posture comfortable and avoid unnecessary tension in your shoulders and hands. A relaxed setup makes it easier to practice for longer periods without becoming distracted by discomfort.",
      "When learning touch typing, avoid looking down at the keyboard for every key. Instead, use the small bumps on the home-row keys to help position your hands. Practice common words and short combinations until the movements become familiar. At first the process may feel slower, but consistent practice can gradually make accurate typing much more automatic.",
      "A steady typing rhythm can make a large difference during a timed test. Sudden bursts of speed often lead to skipped spaces, repeated letters, and punctuation errors. Try to keep your keystrokes even while reading the upcoming text. If you make a mistake, correct it calmly and return to the same rhythm rather than trying to make up the lost time immediately.",
      "Improving WPM is a gradual process. Compare results across many sessions instead of judging yourself from a single score. Use accuracy as an important part of the measurement, because speed without control can hide problems. Short practice sessions with different passages can help you develop flexibility and prevent memorizing one familiar text.",
      "Long passages are useful because they test whether your typing habits remain stable over time. A short burst of fast typing may look impressive, but maintaining accuracy for several minutes requires concentration and efficient movement. Practice both short and long texts so that you can develop speed while also learning how to manage fatigue and attention.",
      "If a word contains an unfamiliar pattern, do not panic or repeatedly hit the same incorrect key. Pause briefly, read the word carefully, and type it with deliberate finger movement. After enough repetition, the pattern will become easier to recognize. This approach can improve accuracy while reducing the hesitation that often appears around difficult words.",
      "The best typing practice is challenging without becoming frustrating. Choose passages that are long enough to require concentration but short enough to complete with confidence. As your accuracy improves, introduce punctuation, numbers, and less familiar vocabulary. Changing the material keeps practice interesting and helps your skills transfer to real writing instead of only one memorized passage.",
      "During a typing competition, focus on your own text rather than watching the opponent constantly. Their progress can change quickly, while your best strategy is to maintain a clean and consistent rhythm. Correct mistakes immediately when necessary, then continue reading ahead. A controlled finish is often more effective than a fast start followed by repeated corrections.",
      "Typing practice can also improve familiarity with punctuation and sentence structure. When punctuation is included, pay attention to commas, periods, quotation marks, and other symbols without breaking your rhythm. Reading complete sentences helps you anticipate where these marks will appear. Over time, this can make everyday writing faster and reduce the need to stop and search for keys.",
      "A good typing environment should remove unnecessary distractions. Close unrelated tabs, keep notifications away from the screen, and make sure your keyboard is positioned comfortably. Give the test your full attention for the short period it lasts. Focused practice makes it easier to notice mistakes, measure improvement, and build confidence from one session to the next.",
      "When you correct a typing mistake, think about what caused it. You may have moved too quickly, looked too far ahead, or used the wrong finger. Identifying the cause is more useful than simply trying to type faster. Practice the troublesome pattern slowly, then return to normal speed. This turns errors into information that can guide future improvement.",
      "Typing skill combines memory, coordination, reading, and attention. Your fingers learn repeated movements while your eyes process upcoming text and your brain decides what comes next. Improving one part can help the others, but balance is important. Practice accuracy, speed, and consistency together so that your performance remains dependable across different passages and test lengths.",
      "A typing race becomes more exciting when every round uses a fresh passage. Randomized text prevents players from memorizing the answers and makes each race a new challenge. Different sentence structures and vocabulary also test real typing ability more fairly. Keep practicing with varied passages, and use each race as a chance to improve both speed and accuracy."
    ]

    for (const item of backup) {
      addCandidate(item);
    }

    return candidates;
  }

  function getPassageForRace() {
    const candidates = getRacePassagePool();

    if (!candidates.length) {
      return FALLBACK_RACE_TEXT;
    }

    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem("typingmeterRaceRecentPassages") || "[]");
      if (!Array.isArray(recent)) recent = [];
    } catch (_) {
      recent = [];
    }

    // Avoid the last 20 passages whenever enough unique passages exist.
    const available = candidates.filter(text => !recent.includes(text));
    const pool = available.length ? available : candidates;

    const selected = pool[Math.floor(Math.random() * pool.length)];

    try {
      recent = [selected, ...recent.filter(x => x !== selected)].slice(0, 20);
      localStorage.setItem("typingmeterRaceRecentPassages", JSON.stringify(recent));
    } catch (_) { }

    return selected;
  }

  function prepareRaceText(text) {
    // Phase 1 uses one identical passage. Do not use random numbers/punctuation
    // transformations because both players must type exactly the same text.
    return String(text || "").trim().replace(/\s+/g, " ");
  }

  function renderRaceText(text) {
    raceText = prepareRaceText(text) || FALLBACK_RACE_TEXT;
    raceTextEl.innerHTML = "";
    [...raceText].forEach((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch;
      span.dataset.index = String(i);
      if (i === 0) span.classList.add("race-char-current");
      raceTextEl.appendChild(span);
    });
    raceInput.value = "";
    raceInput.disabled = true;
  }

  function renderLocalRaceText() {
    const chars = raceTextEl.querySelectorAll("span");
    const typed = raceInput.value;
    chars.forEach((span, i) => {
      span.classList.remove("race-char-correct", "race-char-wrong", "race-char-current");
      if (i < typed.length) {
        span.classList.add(typed[i] === raceText[i] ? "race-char-correct" : "race-char-wrong");
      } else if (i === typed.length) {
        span.classList.add("race-char-current");
      }
    });
  }

  function calculateLocalProgress() {
    const typed = raceInput.value;
    let committed = 0;

    // ONLY the continuous correct prefix counts toward progress/WPM.
    // Once a wrong character is typed, the bar freezes at that exact point.
    for (let i = 0; i < typed.length && i < raceText.length; i++) {
      if (typed[i] !== raceText[i]) break;
      committed++;
    }

    let correct = 0;
    for (let i = 0; i < typed.length && i < raceText.length; i++) {
      if (typed[i] === raceText[i]) correct++;
    }

    const total = typed.length;
    const elapsed = raceStartMs
      ? Math.max((Date.now() - raceStartMs) / 1000, 0.1)
      : 0.1;

    const wpm = Math.round((committed / 5) / (elapsed / 60)) || 0;
    const accuracy = total ? Math.round((correct / total) * 100) : 100;
    const finishedExactly = typed === raceText;

    // Never show 100% unless the COMPLETE passage is exactly correct.
    const percent = finishedExactly
      ? 100
      : (raceText.length
        ? Math.min(99, Math.round((committed / raceText.length) * 100))
        : 0);

    return {
      percent,
      wpm,
      accuracy,
      correct,
      committed,
      total,
      elapsed,
      finishedExactly
    };
  }

  function updateRaceUI() {
    const lp = localProgress;
    const rp = remoteProgress;

    if (youProgress) youProgress.style.width = `${lp.percent}%`;
    if (opponentProgress) opponentProgress.style.width = `${rp.percent}%`;
    if (youPercent) youPercent.textContent = `${lp.percent}%`;
    if (opponentPercent) opponentPercent.textContent = `${rp.percent}%`;
    if (youWpm) youWpm.textContent = `${lp.wpm} WPM`;
    if (opponentWpm) opponentWpm.textContent = connected ? `${rp.wpm} WPM` : "Waiting";

    if (raceStarted && !raceFinished) {
      updateRaceTimer();
      liveStatus.textContent = rp.finished
        ? "Opponent finished — finish your passage!"
        : "Race in progress…";
    }
  }

  function updateRaceTimer() {
    if (!raceTimerEl) return;
    const remaining = Math.max(0, raceDeadlineMs - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    raceTimerEl.textContent = `⏱ ${seconds}s`;
    raceTimerEl.classList.toggle("warning", seconds <= 15);
  }

  function handleRaceTimeout() {
    if (!raceStarted || raceFinished) return;
    raceStarted = false;
    clearInterval(progressTimer);
    clearInterval(countdownTimer);
    clearRaceDeadlineTimer();
    raceInput.disabled = true;
    send({ type: "timeout" });
    endRace("timeout", localProgress);
  }

  function send(message) {
    if (conn && conn.open) {
      try { conn.send(message); } catch (_) { }
    }
  }

  function destroyConnection() {
    clearInterval(countdownTimer);
    clearInterval(progressTimer);
    countdownTimer = null;
    progressTimer = null;
    try { conn?.close(); } catch (_) { }
    try { peer?.destroy(); } catch (_) { }
    conn = null;
    peer = null;
    connected = false;
    if (quickMatch) closeMatchmakingSocket();
  }

  function resetRaceState() {
    clearInterval(countdownTimer);
    clearInterval(progressTimer);
    clearRaceDeadlineTimer();
    countdownTimer = null;
    progressTimer = null;
    localReady = false;
    remoteReady = false;
    raceStarted = false;
    raceFinished = false;
    raceStartMs = 0;
    raceDeadlineMs = 0;
    localRematchRequested = false;
    remoteRematchRequested = false;
    if (raceTimerEl) raceTimerEl.textContent = "⏱ 120s";
    remoteProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
    localProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
    if (countdownEl) countdownEl.textContent = "3";
    if (raceInput) {
      raceInput.value = "";
      raceInput.disabled = true;
    }
  }

  function setupConnection(c) {
    if (!c) return;

    const connection = c;

    // Replace any previous connection.
    if (conn && conn !== connection) {
      try {
        conn.close();
      } catch (_) { }
    }

    conn = connection;

    connection.on("open", () => {

      console.log(
        "Typing Race PeerJS connection OPEN",
        {
          peer: connection.peer,
          isHost
        }
      );

      suppressDisconnect = false;
      connected = true;

      if (isHost) {

        setStatus("Opponent connected");

        showPanel("ready");

        if (readyBtn) {
          readyBtn.disabled = false;
          readyBtn.textContent = "I'm Ready";
        }

        readyNote.textContent =
          "You are connected. Both players must be ready.";

        connection.send({
          type: "race-config",
          text: raceText,
          hostName: playerName
        });

      } else {

        send({
          type: "player-info",
          name: playerName
        });

        showPanel("ready");

        if (readyBtn) {
          readyBtn.disabled = false;
          readyBtn.textContent = "I'm Ready";
        }

        readyNote.textContent =
          "You are connected. Both players must be ready.";
      }
    });

    connection.on("data", message => {
      if (!message || typeof message !== "object") return;

      if (message.type === "race-config") {
        setOpponentName(message.hostName || "Player 1");
        raceText = prepareRaceText(message.text) || FALLBACK_RACE_TEXT;
        renderRaceText(raceText);
        // A new passage is a new round. Clear any stale state/timers from the
        // previous round, but keep the live PeerJS connection intact.
        clearInterval(countdownTimer);
        clearInterval(progressTimer);
        clearRaceDeadlineTimer();
        localReady = false;
        remoteReady = false;
        raceStarted = false;
        raceFinished = false;
        localProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
        remoteProgress = { percent: 0, wpm: 0, accuracy: 100, finished: false, elapsed: 0 };
        if (raceInput) { raceInput.value = ""; raceInput.disabled = true; }
        if (readyBtn) { readyBtn.disabled = false; readyBtn.textContent = "I'm Ready"; }
        showPanel("ready");
        readyNote.textContent = "New race ready. Both players must be ready.";
      }

      if (message.type === "player-info") {
        setOpponentName(message.name || "Player 2");
        if (isHost) {
          send({ type: "player-info", name: playerName });
        }
      }

      if (message.type === "ready") {
        remoteReady = true;
        readyNote.textContent = localReady
          ? "Both ready. Starting soon…"
          : "Opponent is ready. Click “I'm Ready”.";
        maybeStartRace();
      }

      if (message.type === "start") {
        raceStartMs = Number(message.startAt) || (Date.now() + 2500);
        startBattleCountdown(raceStartMs);
      }

      if (message.type === "progress") {
        remoteProgress = {
          percent: Number(message.percent) || 0,
          wpm: Number(message.wpm) || 0,
          accuracy: Number(message.accuracy) || 100,
          finished: !!message.finished,
          elapsed: Number(message.elapsed) || 0
        };
        updateRaceUI();
      }

      if (message.type === "finish") {
        const remoteAccuracy = Number(message.accuracy) || 0;

        // A remote player is allowed to win only if they report 100%
        // accuracy. The local client also verifies its own completion.
        if (remoteAccuracy < 100) return;

        remoteProgress = {
          ...remoteProgress,
          percent: 100,
          wpm: Number(message.wpm) || 0,
          accuracy: 100,
          finished: true,
          elapsed: Number(message.elapsed) || 0
        };
        updateRaceUI();
        endRace("remote", remoteProgress);
      }

      if (message.type === "rematch-request") {
        remoteRematchRequested = true;
        readyNote.textContent = localRematchRequested ? "Rematch accepted. Starting…" : `${opponentName} wants a rematch. Click Rematch.`;
        if (localRematchRequested && isHost) beginRematch();
      }

      if (message.type === "timeout") {
        if (!raceFinished) {
          raceStarted = false;
          endRace("timeout", remoteProgress);
        }
      }

      if (message.type === "leave") {
        if (!raceFinished) {
          connected = false;
          raceStarted = false;
          raceInput.disabled = true;
          endRace("disconnect", remoteProgress);
        }
      }
    });

    connection.on("close", () => {
      if (conn !== connection) return;
      connected = false;
      if (suppressDisconnect) return;
      if (!raceFinished) {
        liveStatus.textContent = "Connection closed. Opponent left the race.";
        if (raceStarted) raceInput.disabled = true;
        if (raceStarted || localReady) endRace("disconnect", remoteProgress);
      }
    });

    connection.on("error", err => {
      if (conn !== connection) return;
      console.error("Typing Race data connection error:", err);
      if (suppressDisconnect) return;
      liveStatus.textContent = "Connection error. Please start a new race.";
      if (!raceFinished) endRace("disconnect", remoteProgress);
    });
  }

  function startQuickMatch() {
    getPlayerName();

    const url = getMatchmakingUrl();

    if (!url || /YOUR-MATCHMAKING-SERVER/i.test(url)) {
      setQuickMatchStatus(
        "Quick Match needs the matchmaking server URL in matchmaking-config.js."
      );
      return;
    }

    if (typeof Peer === "undefined") {
      setQuickMatchStatus(
        "Multiplayer library could not load. Please refresh and try again."
      );
      return;
    }

    // =========================================================
    // FULL RESET FOR A NEW QUICK MATCH
    // =========================================================
    suppressDisconnect = false;
    quickMatchOpponentPeerId = "";
    matchmakingQueued = false;

    closeMatchmakingSocket();
    destroyConnection();
    resetRaceState();

    quickMatch = true;
    isHost = false;
    roomCode = "QUICK";

    if (quickMatchCancelBtn) {
      quickMatchCancelBtn.hidden = false;
    }

    showPanel("waiting");

    if (roomCodeEl) {
      roomCodeEl.textContent = "AUTO";
    }

    setStatus("Finding a random opponent…");
    setQuickMatchStatus("Finding a random opponent…");

    // Create a completely NEW PeerJS identity.
    peer = new Peer(undefined, {
      debug: 2
    });

    // =========================================================
    // HOST RECEIVES GUEST CONNECTION
    // =========================================================
    peer.on("connection", incoming => {

      console.log(
        "Quick Match: incoming PeerJS connection",
        incoming?.peer
      );

      if (!quickMatch || !isHost) {
        try {
          incoming.close();
        } catch (_) { }

        return;
      }

      // Ignore an old connection.
      if (conn && conn !== incoming) {
        try {
          conn.close();
        } catch (_) { }

        conn = null;
      }

      setupConnection(incoming);
    });

    // =========================================================
    // PEER DISCONNECTED
    // =========================================================
    peer.on("disconnected", () => {

      console.warn("Quick Match: PeerJS disconnected");

      if (!quickMatch) return;

      try {
        peer.reconnect();
      } catch (err) {
        console.error(
          "Quick Match: PeerJS reconnect failed",
          err
        );
      }
    });

    // =========================================================
    // PEER OPEN
    // =========================================================
    peer.on("open", peerId => {

      console.log(
        "Quick Match: new PeerJS ID:",
        peerId
      );

      if (!quickMatch) return;

      // Safety: never reuse an old matchmaking socket.
      closeMatchmakingSocket();

      let socket;

      try {
        socket = new WebSocket(url);
      } catch (err) {

        console.error(
          "Quick Match WebSocket creation failed:",
          err
        );

        setStatus(
          "Could not connect to matchmaking server."
        );

        setQuickMatchStatus(
          "Could not connect to matchmaking server."
        );

        return;
      }

      matchmakingSocket = socket;

      socket.addEventListener("open", () => {

        if (!quickMatch) {
          try {
            socket.close();
          } catch (_) { }

          return;
        }

        matchmakingQueued = true;
        quickMatchOpponentPeerId = "";

        console.log(
          "Quick Match: joining queue",
          peerId
        );

        socket.send(JSON.stringify({
          type: "queue",
          peerId: String(peerId),
          name: playerName,
          playerCount: 2
        }));

        setStatus(
          "Finding a random opponent…"
        );

        setQuickMatchStatus(
          "Waiting for another player to choose Quick Match…"
        );
      });

      socket.addEventListener("message", event => {

        let message;

        try {
          message = JSON.parse(event.data);
        } catch (_) {
          return;
        }

        console.log(
          "Quick Match server message:",
          message
        );

        // =====================================================
        // QUEUED
        // =====================================================
        if (message.type === "queued") {

          matchmakingQueued = true;

          setStatus(
            "Waiting for a random player…"
          );

          setQuickMatchStatus(
            "Waiting for another player to choose Quick Match…"
          );

          return;
        }

        // =====================================================
        // MATCH FOUND
        // =====================================================
        if (message.type === "match") {

          matchmakingQueued = false;

          const myPeerId = String(peer?.id || "");

          const peerIds = Array.isArray(message.peerIds)
            ? message.peerIds.map(String)
            : [];

          console.log(
            "Quick Match match received:",
            {
              role: message.role,
              myPeerId,
              hostPeerId: message.hostPeerId,
              peerIds
            }
          );

          // Determine opponent PeerJS ID.
          if (message.role === "host") {

            isHost = true;

            quickMatchOpponentPeerId =
              peerIds.find(id => id !== myPeerId) || "";

          } else {

            isHost = false;

            quickMatchOpponentPeerId =
              String(message.hostPeerId || "");
          }

          roomCode = "QUICK";

          setOpponentName(
            message.opponentName ||
            message.name ||
            "Opponent"
          );

          setStatus(
            "Opponent found!"
          );

          setQuickMatchStatus(
            "Opponent found! Connecting…"
          );

          // Matchmaking is finished.
          try {
            socket.close();
          } catch (_) { }

          if (matchmakingSocket === socket) {
            matchmakingSocket = null;
          }

          // ===================================================
          // INVALID PEER ID
          // ===================================================
          if (!quickMatchOpponentPeerId) {

            console.error(
              "Quick Match: missing opponent PeerJS ID",
              message
            );

            setStatus(
              "Opponent found, but connection information is missing."
            );

            setQuickMatchStatus(
              "Connection information missing. Please try Quick Match again."
            );

            return;
          }

          // ===================================================
          // HOST
          // ===================================================
          if (isHost) {

            console.log(
              "Quick Match HOST waiting for:",
              quickMatchOpponentPeerId
            );

            setStatus(
              "Opponent found! Waiting for connection…"
            );

            setQuickMatchStatus(
              "Opponent found! Waiting for the connection…"
            );

            /*
             * IMPORTANT:
             * Host DOES NOT call peer.connect().
             * Host waits for the guest's incoming connection.
             */
            return;
          }

          // ===================================================
          // GUEST
          // ===================================================
          console.log(
            "Quick Match GUEST connecting to:",
            quickMatchOpponentPeerId
          );

          setStatus(
            "Opponent found! Connecting…"
          );

          setQuickMatchStatus(
            "Connecting to host…"
          );

          let outgoing;

          try {

            outgoing = peer.connect(
              quickMatchOpponentPeerId,
              {
                reliable: true,
                serialization: "json"
              }
            );

          } catch (err) {

            console.error(
              "Quick Match peer.connect failed:",
              err
            );

            setStatus(
              "Could not connect to host."
            );

            setQuickMatchStatus(
              "Could not connect to host. Please try Quick Match again."
            );

            return;
          }

          setupConnection(outgoing);

          // ===================================================
          // CONNECTION TIMEOUT
          // ===================================================
          setTimeout(() => {

            if (
              quickMatch &&
              !connected &&
              conn === outgoing
            ) {

              console.warn(
                "Quick Match: connection timeout"
              );

              try {
                outgoing.close();
              } catch (_) { }

              setStatus(
                "Connection timed out."
              );

              setQuickMatchStatus(
                "Connection timed out. Please try Quick Match again."
              );

              if (readyBtn) {
                readyBtn.disabled = false;
                readyBtn.textContent = "I'm Ready";
              }
            }

          }, 15000);

          return;
        }

        // =====================================================
        // SERVER ERROR
        // =====================================================
        if (message.type === "error") {

          console.error(
            "Quick Match server error:",
            message
          );

          setStatus(
            message.message ||
            "Matchmaking error."
          );

          setQuickMatchStatus(
            message.message ||
            "Matchmaking error."
          );
        }
      });

      socket.addEventListener("close", () => {

        console.log(
          "Quick Match matchmaking socket closed"
        );

        if (
          quickMatch &&
          matchmakingQueued
        ) {

          setStatus(
            "Matchmaking connection closed. Try Quick Match again."
          );
        }
      });

      socket.addEventListener("error", error => {

        console.error(
          "Quick Match matchmaking WebSocket error:",
          error
        );

        if (!quickMatch) return;

        setStatus(
          "Could not reach matchmaking server."
        );

        setQuickMatchStatus(
          "Could not reach matchmaking server."
        );
      });
    });

    // =========================================================
    // PEER ERROR
    // =========================================================
    peer.on("error", err => {

      console.error(
        "Quick Match PeerJS error:",
        err
      );

      if (!quickMatch) return;

      if (err?.type === "peer-unavailable") {

        setStatus(
          "Host is no longer available."
        );

        setQuickMatchStatus(
          "Host disconnected. Please start Quick Match again."
        );

      } else {

        setStatus(
          "Could not start Quick Match. Please try again."
        );

        setQuickMatchStatus(
          "Could not establish the connection. Please try again."
        );
      }
    });
  }

  function cancelQuickMatch() {
    suppressDisconnect = true;
    if (matchmakingSocket && matchmakingSocket.readyState === WebSocket.OPEN) {
      try { matchmakingSocket.send(JSON.stringify({ type: "cancel" })); } catch (_) { }
    }
    closeMatchmakingSocket();
    destroyConnection();
    quickMatch = false;
    if (quickMatchCancelBtn) quickMatchCancelBtn.hidden = true;
    resetRaceState();
    showPanel("lobby");
    setQuickMatchStatus("");
  }

  function createRace() {
    getPlayerName();
    if (typeof Peer === "undefined") {
      alert("Multiplayer library could not load. Please refresh and try again.");
      return;
    }

    closeMatchmakingSocket();
    destroyConnection();
    resetRaceState();
    quickMatch = false;
    if (quickMatchCancelBtn) quickMatchCancelBtn.hidden = true;
    isHost = true;
    roomCode = makeRoomCode();
    raceText = prepareRaceText(getPassageForRace());

    showPanel("waiting");
    roomCodeEl.textContent = roomCode;
    setStatus("Creating room…");

    peer = new Peer(roomCode, {
      debug: 2
    });

    peer.on("open", id => {
      roomCode = id;
      roomCodeEl.textContent = id;
      setStatus("Waiting for opponent…");
    });

    peer.on("connection", incoming => {
      if (conn && conn.open) {
        incoming.close();
        return;
      }
      setupConnection(incoming);
    });

    peer.on("error", err => {
      console.error("Typing Race Peer error:", err);
      if (err?.type === "unavailable-id") {
        destroyConnection();
        setStatus("Room code was already taken. Creating another room…");
        setTimeout(createRace, 100);
        return;
      }
      setStatus(`Could not create room (${err?.type || "unknown error"}).`);
    });
  }

  function joinRace() {
    getPlayerName();
    if (typeof Peer === "undefined") {
      alert("Multiplayer library could not load. Please refresh and try again.");
      return;
    }

    const code = String(codeInput?.value || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      alert("Enter the 6-character race room code.");
      return;
    }

    closeMatchmakingSocket();
    destroyConnection();
    resetRaceState();
    quickMatch = false;
    if (quickMatchCancelBtn) quickMatchCancelBtn.hidden = true;
    isHost = false;
    roomCode = code;

    showPanel("waiting");
    roomCodeEl.textContent = code;
    setStatus("Connecting to opponent…");

    peer = new Peer(undefined, { debug: 2 });

    peer.on("open", () => {
      setStatus("PeerJS connected. Connecting to room…");
      const outgoing = peer.connect(code, { reliable: true });
      setupConnection(outgoing);
    });

    peer.on("error", err => {
      console.error("Typing Race Peer error:", err);
      setStatus(`Could not join this room (${err?.type || "unknown error"}).`);
    });
  }

  function maybeStartRace() {
    if (!isHost || !localReady || !remoteReady || !conn?.open) return;
    const startAt = Date.now() + 3600;
    send({ type: "start", startAt });
    startBattleCountdown(startAt);
  }

  function startBattleCountdown(startAt) {
    clearInterval(countdownTimer);
    clearInterval(progressTimer);
    clearRaceDeadlineTimer();
    raceStartMs = startAt;
    raceDeadlineMs = startAt + RACE_TIME_LIMIT_SECONDS * 1000;
    raceStarted = false;
    raceFinished = false;
    showPanel("battle");
    renderRaceText(raceText);

    const tick = () => {
      const remaining = startAt - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownEl.textContent = "GO!";
        raceStarted = true;
        raceInput.disabled = false;
        raceInput.focus();
        liveStatus.textContent = "GO! Type as fast and accurately as you can.";
        progressTimer = setInterval(() => {
          localProgress = calculateLocalProgress();
          updateRaceUI();
          send({
            type: "progress",
            percent: localProgress.percent,
            wpm: localProgress.wpm,
            accuracy: localProgress.accuracy,
            finished: localProgress.finished,
            elapsed: localProgress.elapsed
          });
        }, 100);
        const deadlineTimer = setTimeout(() => {
          if (raceStarted && !raceFinished) handleRaceTimeout();
        }, Math.max(0, raceDeadlineMs - Date.now()));
        // Keep the deadline timer attached to the battle lifecycle.
        window.__typingRaceDeadlineTimer = deadlineTimer;
        setTimeout(() => {
          if (raceStarted && !raceFinished) countdownEl.textContent = "";
        }, 700);
        return;
      }
      const sec = Math.ceil(remaining / 1000);
      countdownEl.textContent = String(Math.max(1, sec));
    };

    tick();
    countdownTimer = setInterval(tick, 100);
  }

  function finishLocal() {
    if (!raceStarted || raceFinished) return;
    localProgress = calculateLocalProgress();
    // A player can finish ONLY when the entire passage matches exactly.
    // This prevents winning with wrong characters / 0% accuracy.
    if (raceInput.value !== raceText) return;

    localProgress.percent = 100;
    localProgress.accuracy = 100;
    localProgress.finished = true;
    endRace("local", localProgress);
    send({
      type: "finish",
      wpm: localProgress.wpm,
      accuracy: localProgress.accuracy,
      elapsed: localProgress.elapsed
    });
  }

  function endRace(winnerSide, winnerData) {
    if (raceFinished) return;

    // Never allow a local player to be declared winner unless the
    // passage was completed exactly and accuracy is 100%.
    if (winnerSide === "local" &&
      (raceInput.value !== raceText || Number(localProgress.accuracy) < 100)) {
      return;
    }

    raceFinished = true;
    raceStarted = false;
    clearInterval(progressTimer);
    clearInterval(countdownTimer);
    clearRaceDeadlineTimer();
    raceInput.disabled = true;

    if (winnerSide === "local") {
      resultIcon.textContent = "🏆";
      resultTitle.textContent = "You Win!";
      resultSubtitle.textContent = `${playerName} reached the finish line first.`;
      if (resultPlayerYouStatus) resultPlayerYouStatus.textContent = "🏆 WINNER";
      if (resultPlayerOpponentStatus) resultPlayerOpponentStatus.textContent = "Finished / DNF";
    } else if (winnerSide === "remote") {
      resultIcon.textContent = "⚡";
      resultTitle.textContent = "You Lost";
      resultSubtitle.textContent = `${opponentName} reached the finish line first.`;
      if (resultPlayerYouStatus) resultPlayerYouStatus.textContent = "DNF";
      if (resultPlayerOpponentStatus) resultPlayerOpponentStatus.textContent = "🏆 WINNER";
    } else if (winnerSide === "timeout") {
      resultIcon.textContent = "⏱";
      resultTitle.textContent = "Time Up";
      resultSubtitle.textContent = "Neither player completed the passage within the time limit.";
      if (resultPlayerYouStatus) resultPlayerYouStatus.textContent = "TIME UP";
      if (resultPlayerOpponentStatus) resultPlayerOpponentStatus.textContent = "TIME UP";
    } else if (winnerSide === "disconnect") {
      resultIcon.textContent = "📡";
      resultTitle.textContent = "Opponent Disconnected";
      resultSubtitle.textContent = "The race ended because the opponent left or lost connection.";
      if (resultPlayerYouStatus) resultPlayerYouStatus.textContent = "WIN";
      if (resultPlayerOpponentStatus) resultPlayerOpponentStatus.textContent = "DISCONNECTED";
    } else {
      resultIcon.textContent = "🤝";
      resultTitle.textContent = "Race Finished";
      resultSubtitle.textContent = "The race has ended.";
    }

    if (resultPlayerYou) resultPlayerYou.textContent = playerName;
    if (resultPlayerOpponent) resultPlayerOpponent.textContent = opponentName;

    resultYourWpm.textContent = String(localProgress.wpm || 0);
    resultYourAccuracy.textContent = `${localProgress.accuracy || 0}%`;
    resultOpponentWpm.textContent = String(remoteProgress.wpm || 0);
    resultTime.textContent = localProgress.finished ? `${localProgress.elapsed.toFixed(2)}s` : "DNF";

    const outcome = winnerSide === "local" ? "win" : winnerSide === "remote" ? "loss" : winnerSide === "timeout" ? "timeout" : "win";
    saveRaceHistory(outcome);
    const card = section.querySelector(".race-card");
    card?.classList.remove("race-win-animation", "race-loss-animation", "race-neutral-animation");
    card?.classList.add(winnerSide === "local" ? "race-win-animation" : winnerSide === "remote" ? "race-loss-animation" : "race-neutral-animation");
    showPanel("result");
  }

  function setReady() {
    if (!connected || !conn?.open) return;
    localReady = true;
    readyBtn.textContent = "✓ Ready";
    readyBtn.disabled = true;
    send({ type: "ready" });

    if (isHost) {
      readyNote.textContent = remoteReady ? "Starting…" : "Waiting for opponent to be ready…";
      maybeStartRace();
    } else {
      readyNote.textContent = remoteReady ? "Both ready. Waiting for start…" : "Waiting for host…";
    }
  }

  function leaveRace() {
    // Stop the current race completely.
    suppressDisconnect = true;

    quickMatch = false;
    matchmakingQueued = false;
    quickMatchOpponentPeerId = "";

    try {
      if (conn?.open) {
        conn.send({ type: "leave" });
      }
    } catch (_) { }

    closeMatchmakingSocket();

    destroyConnection();

    resetRaceState();

    isHost = false;
    roomCode = "";

    if (quickMatchCancelBtn) {
      quickMatchCancelBtn.hidden = true;
    }

    if (codeInput) {
      codeInput.value = "";
    }

    showPanel("lobby");

    setStatus("");

    setQuickMatchStatus("");
  }

  quickMatchBtn?.addEventListener("click", startQuickMatch);
  quickMatchCancelBtn?.addEventListener("click", cancelQuickMatch);
  createBtn?.addEventListener("click", createRace);
  joinBtn?.addEventListener("click", joinRace);
  codeInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") joinRace();
  });
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(roomCodeEl.textContent.trim());
      copyBtn.textContent = "Copied!";
      setTimeout(() => copyBtn.textContent = "Copy", 1200);
    } catch (_) {
      copyBtn.textContent = "Copy code";
    }
  });
  cancelBtn?.addEventListener("click", leaveRace);
  leaveBtn?.addEventListener("click", leaveRace);
  closeBtn?.addEventListener("click", leaveRace);
  resultCloseBtn?.addEventListener("click", leaveRace);

  readyBtn?.addEventListener("click", setReady);

  function beginRematch() {
    if (!connected || !conn?.open) return;
    clearRaceDeadlineTimer();
    resetRaceState();
    localReady = false;
    remoteReady = false;
    localRematchRequested = false;
    remoteRematchRequested = false;
    readyBtn.disabled = false;
    readyBtn.textContent = "I'm Ready";
    rematchBtn.disabled = false;
    rematchBtn.textContent = "🔄 Rematch";
    if (isHost) {
      raceText = prepareRaceText(getPassageForRace()) || FALLBACK_RACE_TEXT;
      renderRaceText(raceText);
      send({ type: "race-config", text: raceText, hostName: playerName });
    }
    showPanel("ready");
    readyNote.textContent = "New race ready. Both players must be ready.";
  }

  rematchBtn?.addEventListener("click", () => {
    if (!connected || !conn?.open) {
      leaveRace();
      return;
    }
    localRematchRequested = true;
    localReady = false;
    remoteReady = false;
    readyBtn.disabled = false;
    readyBtn.textContent = "I'm Ready";
    rematchBtn.disabled = true;
    rematchBtn.textContent = "Waiting for opponent…";
    send({ type: "rematch-request" });
    showPanel("ready");
    readyNote.textContent = remoteRematchRequested ? "Both players accepted the rematch. Starting…" : "Waiting for opponent to accept the rematch…";
    if (remoteRematchRequested && isHost) beginRematch();
  });

  raceInput?.addEventListener("input", () => {
    if (!raceStarted || raceFinished) return;
    renderLocalRaceText();
    localProgress = calculateLocalProgress();
    updateRaceUI();
    if (raceAccuracyHint) {
      raceAccuracyHint.textContent =
        raceInput.value === raceText
          ? "✓ Perfect — you can finish!"
          : (localProgress.committed < raceInput.value.length
            ? "Mistake detected — progress and WPM are frozen until you correct it."
            : "Keep typing. You must complete the entire passage exactly.");
    }
    if (localProgress.finishedExactly) finishLocal();
  });

  raceInput?.addEventListener("paste", e => e.preventDefault());

  $("raceHistoryClear")?.addEventListener("click", clearRaceHistory);
  window.addEventListener("storage", event => {
    if (event.key === RACE_HISTORY_KEY) renderRaceHistory();
  });

  renderRaceHistory();

  // Make the feature discoverable without changing the existing test controls.
  const raceLauncher = document.createElement("button");
  raceLauncher.type = "button";
  raceLauncher.className = "race-launcher";
  raceLauncher.textContent = "⚔️ Typing Race";
  raceLauncher.title = "Play a multiplayer typing race";
  raceLauncher.addEventListener("click", () => {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const controls = document.querySelector(".seo-quick-links");
  if (controls && !document.querySelector(".race-launcher")) {
    controls.appendChild(raceLauncher);
  }

  window.addEventListener("beforeunload", () => {
    try { send({ type: "leave" }); } catch (_) { }
    try { matchmakingSocket?.send(JSON.stringify({ type: "cancel" })); } catch (_) { }
    closeMatchmakingSocket();
    destroyConnection();
  });
})();
