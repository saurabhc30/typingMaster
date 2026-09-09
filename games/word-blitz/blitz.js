(() => {
  "use strict";

  const STORAGE_KEY = "typingmeterWordBlitzHistory";
  const BEST_KEY = "typingmeterWordBlitzBest";
  const SETTINGS_KEY = "typingmeterWordBlitzSettings";
  const HISTORY_VERSION = 1;
  const MAX_HISTORY = 100;
  const MAX_INPUT_LENGTH = 32;

  const WORDS = {
    easy: [
      "apple", "bread", "chair", "cloud", "dance", "dream", "earth", "field", "flower", "friend", "green", "happy", "house", "light", "music", "night", "ocean", "paper", "plant", "quick", "river", "school", "smile", "star", "stone", "table", "water", "world", "young", "yellow",
      "animal", "answer", "basket", "better", "button", "camera", "circle", "family", "forest", "garden", "golden", "market", "morning", "orange", "people", "purple", "summer", "travel", "window", "winter", "wonder", "simple", "little", "letter", "number", "planet", "pencil", "rabbit", "rocket"
    ],
    medium: [
      "ability", "balance", "battery", "between", "brother", "capture", "careful", "central", "chapter", "collect", "comfort", "company", "country", "culture", "decide", "develop", "discover", "evening", "example", "exercise", "future", "general", "history", "imagine", "journey", "kitchen", "language", "message", "natural", "picture", "popular", "problem", "promise", "protect", "quality", "reason", "remember", "science", "special", "station", "success", "support", "teacher", "together", "traffic", "weather", "without", "writer", "control", "perfect", "practice", "improve", "creative", "library", "computer", "digital", "energy"
    ],
    hard: [
      "absolutely", "achievement", "adventure", "alternative", "architecture", "atmosphere", "celebration", "communication", "concentration", "consequence", "consideration", "consistent", "conversation", "cooperation", "determination", "environment", "extraordinary", "independent", "information", "inspiration", "intelligence", "interesting", "maintenance", "opportunity", "organization", "performance", "perspective", "possibility", "preparation", "professional", "relationship", "responsibility", "significant", "simultaneously", "technology", "understanding", "university", "vocabulary", "confidence", "coordination", "competition", "development", "experience", "imagination", "motivation", "productivity", "recognition", "requirement", "successful", "transformation", "transportation", "unforgettable", "vulnerable", "achievement", "characteristic"
    ]
  };

  const els = {
    lobby: document.getElementById("blitzLobby"),
    game: document.getElementById("blitzGame"),
    result: document.getElementById("blitzResult"),
    start: document.getElementById("startBtn"),
    quit: document.getElementById("quitBtn"),
    playAgain: document.getElementById("playAgainBtn"),
    changeSettings: document.getElementById("changeSettingsBtn"),
    input: document.getElementById("wordInput"),
    currentWord: document.getElementById("currentWord"),
    wordArea: document.getElementById("wordArea"),
    wordNumber: document.getElementById("wordNumber"),
    difficultyLabel: document.getElementById("difficultyLabel"),
    time: document.getElementById("timeValue"),
    score: document.getElementById("scoreValue"),
    combo: document.getElementById("comboValue"),
    wpm: document.getElementById("wpmValue"),
    accuracy: document.getElementById("accuracyValue"),
    timerFill: document.getElementById("timerFill"),
    lobbyBest: document.getElementById("lobbyBest"),
    lobbyNote: document.getElementById("lobbyNote"),
    resultIcon: document.getElementById("resultIcon"),
    resultTitle: document.getElementById("resultTitle"),
    resultSubtitle: document.getElementById("resultSubtitle"),
    resultScore: document.getElementById("resultScore"),
    resultWpm: document.getElementById("resultWpm"),
    resultAccuracy: document.getElementById("resultAccuracy"),
    resultWords: document.getElementById("resultWords"),
    resultCombo: document.getElementById("resultCombo"),
    resultTime: document.getElementById("resultTime"),
    newBest: document.getElementById("newBest"),
    historyList: document.getElementById("historyList"),
    historyCount: document.getElementById("historyCount"),
    clearHistory: document.getElementById("clearHistoryBtn")
  };

  let settings = loadSettings();
  let game = createInitialState();
  let timerId = null;
  let rafId = null;
  let acceptingInput = false;
  let lastFrame = 0;

  function createInitialState() {
    return {
      phase: "lobby",
      timeLimit: 30,
      difficulty: "easy",
      remainingMs: 30000,
      startedAt: 0,
      elapsedMs: 0,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correctWords: 0,
      wrongWords: 0,
      submittedWords: 0,
      correctChars: 0,
      typedChars: 0,
      currentWord: "",
      wordIndex: 0,
      wordsShown: 0,
      lastWord: ""
    };
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return {
        timeLimit: [30, 60, 120].includes(Number(saved.timeLimit)) ? Number(saved.timeLimit) : 30,
        difficulty: ["easy", "medium", "hard"].includes(saved.difficulty) ? saved.difficulty : "easy"
      };
    } catch (_) {
      return { timeLimit: 30, difficulty: "easy" };
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { }
  }

  function getBestScore() {
    try {
      const raw = Number(localStorage.getItem(BEST_KEY));
      return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    } catch (_) { return 0; }
  }

  function setBestScore(score) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(score)))); } catch (_) { }
  }

  function safeHistoryRead() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
      return items.filter(isValidHistoryItem).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, MAX_HISTORY);
    } catch (_) { return []; }
  }

  function isValidHistoryItem(item) {
    return item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.date === "string" &&
      [30, 60, 120].includes(Number(item.timeLimit)) &&
      ["easy", "medium", "hard"].includes(item.difficulty) &&
      Number.isFinite(Number(item.score));
  }

  function saveHistory(record) {
    const items = safeHistoryRead();
    items.unshift(record);
    const payload = { version: HISTORY_VERSION, items: items.slice(0, MAX_HISTORY) };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (_) { }
    renderHistory();
  }

  function createHistoryId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch (_) { return iso; }
  }

  function renderHistory() {
    const items = safeHistoryRead();
    els.historyCount.textContent = items.length ? `${items.length} saved` : "No games";
    els.historyList.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "blitz-history-empty";
      empty.textContent = "Your completed Word Blitz games will stay saved on this device.";
      els.historyList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "blitz-history-row";
      appendHistoryCell(row, "Date", formatDate(item.date));
      appendHistoryCell(row, "Score", String(item.score));
      appendHistoryCell(row, "WPM", String(item.wpm));
      appendHistoryCell(row, "Accuracy", `${item.accuracy}%`);
      appendHistoryCell(row, "Mode", `${item.difficulty} • ${item.timeLimit}s`);
      fragment.appendChild(row);
    });
    els.historyList.appendChild(fragment);
  }

  function appendHistoryCell(row, label, value) {
    const cell = document.createElement("div");
    const span = document.createElement("span");
    const strong = document.createElement("strong");
    span.textContent = label;
    strong.textContent = value;
    cell.append(span, strong);
    row.appendChild(cell);
  }

  function clearHistory() {
    if (!safeHistoryRead().length) return;
    if (!window.confirm("Clear all Word Blitz history saved on this device?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { }
    renderHistory();
  }

  function applyLobbySettings() {
    document.querySelectorAll("[data-time]").forEach(btn => btn.classList.toggle("is-active", Number(btn.dataset.time) === settings.timeLimit));
    document.querySelectorAll("[data-difficulty]").forEach(btn => btn.classList.toggle("is-active", btn.dataset.difficulty === settings.difficulty));
    els.lobbyBest.textContent = getBestScore().toLocaleString();
  }

  function randomWord() {
    const pool = WORDS[game.difficulty] || WORDS.easy;
    let word = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && word === game.lastWord) word = pool[Math.floor(Math.random() * pool.length)];
    game.lastWord = word;
    return word;
  }

  function prepareNextWord() {
    game.currentWord = randomWord();
    game.wordIndex += 1;
    game.wordsShown += 1;
    els.currentWord.textContent = game.currentWord;
    els.wordNumber.textContent = `Word ${game.wordIndex}`;
    els.difficultyLabel.textContent = game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1);
    els.input.value = "";
    els.input.maxLength = MAX_INPUT_LENGTH;
  }

  function scrollToGameSection() {
    const target = els.game;
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function scrollToResultSection() {
    const target = els.result;
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startGame() {
    stopTimers();
    game = createInitialState();
    game.phase = "countdown";
    game.timeLimit = settings.timeLimit;
    game.difficulty = settings.difficulty;
    game.remainingMs = settings.timeLimit * 1000;

    els.lobby.hidden = true;
    els.result.hidden = true;
    els.game.hidden = false;
    els.time.textContent = String(settings.timeLimit);
    els.score.textContent = "0";
    els.combo.textContent = "0";
    els.wpm.textContent = "0";
    els.accuracy.textContent = "100%";
    els.timerFill.style.transform = "scaleX(1)";
    els.wordArea.classList.remove("is-correct", "is-wrong");
    els.input.disabled = true;
    els.input.value = "";
    els.input.focus();

    prepareNextWord();
    runCountdown();
  }

  function runCountdown() {
    let count = 3;
    const original = els.currentWord.textContent;
    els.currentWord.textContent = String(count);
    els.lobbyNote.textContent = "Get ready…";

    const countdownId = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        els.currentWord.textContent = String(count);
        return;
      }
      window.clearInterval(countdownId);
      els.currentWord.textContent = original;
      beginRunning();
    }, 500);
  }

  function beginRunning() {
    if (game.phase !== "countdown") return;
    game.phase = "running";
    game.startedAt = performance.now();
    game.remainingMs = game.timeLimit * 1000;
    acceptingInput = true;
    els.input.disabled = false;
    els.input.focus();
    els.input.select();
    els.lobbyNote.textContent = "";
    lastFrame = performance.now();
    timerId = window.setInterval(updateTimer, 100);
    rafId = window.requestAnimationFrame(updateLiveStats);
  }

  function updateTimer() {
    if (game.phase !== "running") return;
    const elapsed = performance.now() - game.startedAt;
    game.elapsedMs = Math.min(elapsed, game.timeLimit * 1000);
    game.remainingMs = Math.max(0, game.timeLimit * 1000 - game.elapsedMs);
    renderLiveStats();
    if (game.remainingMs <= 0) finishGame("time");
  }

  function updateLiveStats(now) {
    if (game.phase !== "running") return;
    if (now - lastFrame >= 100) {
      lastFrame = now;
      renderLiveStats();
    }
    rafId = window.requestAnimationFrame(updateLiveStats);
  }

  function renderLiveStats() {
    const seconds = Math.max(game.elapsedMs / 1000, 0.001);
    const minutes = seconds / 60;
    const wpm = Math.round((game.correctChars / 5) / minutes);
    const accuracy = game.typedChars ? Math.round((game.correctChars / game.typedChars) * 100) : 100;
    const remainingSeconds = Math.ceil(game.remainingMs / 1000);
    const fraction = game.timeLimit ? game.remainingMs / (game.timeLimit * 1000) : 0;
    els.time.textContent = String(remainingSeconds);
    els.score.textContent = game.score.toLocaleString();
    els.combo.textContent = String(game.combo);
    els.wpm.textContent = String(Math.max(0, Number.isFinite(wpm) ? wpm : 0));
    els.accuracy.textContent = `${Math.max(0, Math.min(100, accuracy))}%`;
    els.timerFill.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
  }

  function submitWord() {
    if (!acceptingInput || game.phase !== "running") return;
    const typed = els.input.value.trim();
    if (!typed) return;

    game.submittedWords += 1;
    game.typedChars += typed.length;
    els.wordArea.classList.remove("is-correct", "is-wrong");

    if (typed === game.currentWord) {
      game.correctWords += 1;
      game.correctChars += game.currentWord.length;
      game.combo += 1;
      game.bestCombo = Math.max(game.bestCombo, game.combo);
      const comboBonus = Math.min(game.combo - 1, 9);
      game.score += (game.currentWord.length * 10) + (comboBonus * 5);
      els.wordArea.classList.add("is-correct");
      prepareNextWord();
    } else {
      game.wrongWords += 1;
      game.combo = 0;
      els.wordArea.classList.add("is-wrong");
      els.input.select();
      window.setTimeout(() => els.wordArea.classList.remove("is-wrong"), 180);
    }
    renderLiveStats();
  }

  function finishGame(reason) {
    if (game.phase === "result" || game.phase === "lobby") return;
    game.phase = "result";
    acceptingInput = false;
    stopTimers();
    game.elapsedMs = reason === "time" ? game.timeLimit * 1000 : Math.min(performance.now() - game.startedAt, game.timeLimit * 1000);
    game.remainingMs = Math.max(0, game.timeLimit * 1000 - game.elapsedMs);

    const minutes = Math.max(game.elapsedMs / 60000, 1 / 60000);
    const wpm = Math.max(0, Math.round((game.correctChars / 5) / minutes));
    const accuracy = game.typedChars ? Math.round((game.correctChars / game.typedChars) * 100) : 100;
    const oldBest = getBestScore();
    const isNewBest = game.score > oldBest;
    if (isNewBest) setBestScore(game.score);

    els.game.hidden = true;
    els.result.hidden = false;
    els.resultScore.textContent = game.score.toLocaleString();
    els.resultWpm.textContent = String(wpm);
    els.resultAccuracy.textContent = `${Math.max(0, Math.min(100, accuracy))}%`;
    els.resultWords.textContent = String(game.correctWords);
    els.resultCombo.textContent = String(game.bestCombo);
    els.resultTime.textContent = `${game.timeLimit}s`;
    els.newBest.hidden = !isNewBest;
    els.resultIcon.textContent = isNewBest ? "🏆" : (game.score > 0 ? "⚡" : "⌨️");
    els.resultTitle.textContent = isNewBest ? "New Personal Best!" : (game.score > 0 ? "Great Run!" : "Try Again!");
    els.resultSubtitle.textContent = `You typed ${game.correctWords} correct ${game.correctWords === 1 ? "word" : "words"} in ${game.timeLimit} seconds.`;

    saveHistory({
      id: createHistoryId(),
      date: new Date().toISOString(),
      timeLimit: game.timeLimit,
      difficulty: game.difficulty,
      score: game.score,
      wpm,
      accuracy: Math.max(0, Math.min(100, accuracy)),
      words: game.correctWords,
      combo: game.bestCombo
    });

    // Automatically bring the result into view when the run ends.
    scrollToResultSection();
  }

  function stopTimers() {
    if (timerId !== null) { clearInterval(timerId); timerId = null; }
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function quitGame() {
    if (game.phase !== "running" && game.phase !== "countdown") return showLobby();
    if (!window.confirm("Quit this game? Your current run will not be saved.")) return;
    stopTimers();
    showLobby();
  }

  function showLobby() {
    stopTimers();
    acceptingInput = false;
    game = createInitialState();
    game.timeLimit = settings.timeLimit;
    game.difficulty = settings.difficulty;
    els.input.disabled = true;
    els.game.hidden = true;
    els.result.hidden = true;
    els.lobby.hidden = false;
    els.currentWord.textContent = "ready";
    els.lobbyNote.textContent = "Type the displayed word, then press Space or Enter.";
    applyLobbySettings();
  }

  function handleInputKeydown(event) {
    if (!acceptingInput) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      submitWord();
    }
  }

  function blockPaste(event) {
    if (acceptingInput) event.preventDefault();
  }

  function handleTimeChoice(event) {
    const btn = event.target.closest("[data-time]");
    if (!btn) return;
    settings.timeLimit = Number(btn.dataset.time);
    saveSettings();
    applyLobbySettings();
  }

  function handleDifficultyChoice(event) {
    const btn = event.target.closest("[data-difficulty]");
    if (!btn) return;
    settings.difficulty = btn.dataset.difficulty;
    saveSettings();
    applyLobbySettings();
  }

  els.start.addEventListener("click", startGame);
  els.quit.addEventListener("click", quitGame);
  els.playAgain.addEventListener("click", startGame);
  els.changeSettings.addEventListener("click", showLobby);
  els.input.addEventListener("keydown", handleInputKeydown);
  els.input.addEventListener("paste", blockPaste);
  els.input.addEventListener("drop", blockPaste);
  els.input.addEventListener("dragover", event => { if (acceptingInput) event.preventDefault(); });
  els.lobby.addEventListener("click", event => { handleTimeChoice(event); handleDifficultyChoice(event); });
  els.clearHistory.addEventListener("click", clearHistory);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden || game.phase !== "running") return;
    els.input.focus();
  });

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === BEST_KEY) {
      renderHistory();
      applyLobbySettings();
    }
  });

  window.addEventListener("pagehide", stopTimers);

  applyLobbySettings();
  renderHistory();
})();
