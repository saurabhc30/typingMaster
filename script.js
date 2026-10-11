document.addEventListener("DOMContentLoaded", function () {
  const textBox = document.getElementById("text");
  const retryBtn = document.getElementById("retryBtn");
  const restartMainBtn = document.getElementById("restartMainBtn");
  const resultScreen = document.getElementById("resultScreen");
  const typingBox = document.querySelector(".typing-box");
  const wpmEl = document.getElementById("wpm");
  const accEl = document.getElementById("accuracy");
  const timeEl = document.getElementById("time");
  const rawWpmEl = document.getElementById("rawWpm");
  const errorsEl = document.getElementById("errors");
  const resWpm = document.getElementById("resWpm");
  const resAcc = document.getElementById("resAcc");
  const resChar = document.getElementById("resChar");
  const resRawWpm = document.getElementById("resRawWpm");
  const resErrors = document.getElementById("resErrors");
  const resConsistency = document.getElementById("resConsistency");
  const resTestType = document.getElementById("resTestType"); // <-- Added this missing DOM binding
  const personalBestEl = document.getElementById("personalBest");
  const wpmGraph = document.getElementById("wpmGraph");
  const topSpeedEl = document.getElementById("topSpeed");
  const timeSelect = document.getElementById("timeSelect");
  const passageBtn = document.getElementById("passageBtn");
  const diffButtons = document.querySelectorAll(".diff-btn");
  const modePanel = document.querySelector(".control-bar");
  const historyToggle = document.getElementById("historyToggle");
  const localHistory = document.getElementById("localHistory");
  const historyList = document.getElementById("historyList");
  const clearHistoryBtn = document.getElementById("clearHistory");
  const punctuationToggle = document.getElementById("punctuationToggle");
  const numbersToggle = document.getElementById("numbersToggle");
  const soundToggle = document.getElementById("soundToggle");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const timedLengths = document.getElementById("timedLengths");
  const wordLengths = document.getElementById("wordLengths");
  const punctuationBtn = document.getElementById("punctuationBtn");
  const numbersBtn = document.getElementById("numbersBtn");
  const soundBtn = document.getElementById("soundBtn");
  const paceCarBtn = document.getElementById("paceCarBtn");
  const customTimeBtn = document.getElementById("customTimeBtn");
  const customWordsBtn = document.getElementById("customWordsBtn");
  const applyCustomTime = document.getElementById("applyCustomTime");
  const applyCustomWords = document.getElementById("applyCustomWords");
  const liveTimeEl = document.getElementById("liveTime");
  const liveWordsEl = document.getElementById("liveWords");
  const focusOverlay = document.getElementById("focusOverlay");
  const minimalTools = document.querySelector(".minimal-tools");
  const footer = document.querySelector(".site-footer");
  const footerThemeSelect = document.getElementById("footerThemeSelect");

  const PB_KEY = "typing_personal_best_v2";
  const HISTORY_KEY = "typing_test_history_v2";
  const SETTINGS_KEY = "typing_test_settings_v2";
  const DEFAULT_PB = 35;

  const keySound = new Audio("/typing.mp3");
  keySound.volume = 0.4;
  keySound.preload = "auto";

  let difficulty = "easy";
  let mode = "timed";
  let selectedTime = 30;
  let wordLimit = 25;
  let customTime = 45;
  let customWords = 25;
  let currentText = "";
  let charIndex = 0;
  let correct = 0;
  let totalTyped = 0;
  let timer = null;
  let timeLeft = 60;
  let elapsedSeconds = 0;
  let started = false;
  let finished = false;
  let finishTimeout = null;
  let sampleTimer = null;
  let testStartMs = 0;

  let wpmSamples = [];
  let rawSamples = [];
  let errorSamples = [];
  let lastRenderedPoints = [];
  let mouseHidden = false;
  let controlsHideTimer = null;

  let graphResizeObserver = null;
  let graphEventsAttached = false;

  let paceCarEnabled = false;
  let paceCarIndex = 0;
  let paceCarTimer = null;

  function getPersonalBest() {
    const stored = Number(localStorage.getItem(PB_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_PB;
  }

  function renderPersonalBest() {
    if (personalBestEl) personalBestEl.innerText = `${getPersonalBest()} WPM`;
  }

  function updatePersonalBest(wpm) {
    const current = getPersonalBest();
    const score = Number(wpm) || 0;
    if (score > current) {
      localStorage.setItem(PB_KEY, String(score));
      renderPersonalBest();
      return true;
    }
    return false;
  }

  function getHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function saveHistory(result) {
    const history = getHistory();
    history.unshift(result);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;
    const history = getHistory();
    historyList.innerHTML = "";
    if (!history.length) {
      const li = document.createElement("li");
      li.innerHTML = "<span>No tests yet.</span>";
      li.style.display = "block";
      historyList.appendChild(li);
      return;
    }
    history.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span><strong>${Number(item.wpm) || 0} WPM</strong></span>
        <span>${Number(item.accuracy) || 0}% acc</span>
        <span>${escapeHtml(item.mode || "Timed")}</span>
        <span>${escapeHtml(item.date || "")}</span>`;
      historyList.appendChild(li);
    });
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (typeof s.punctuation === "boolean" && punctuationToggle) punctuationToggle.checked = s.punctuation;
      if (typeof s.numbers === "boolean" && numbersToggle) numbersToggle.checked = s.numbers;
      if (typeof s.sound === "boolean" && soundToggle) soundToggle.checked = s.sound;
    } catch { }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      punctuation: !!punctuationToggle?.checked,
      numbers: !!numbersToggle?.checked,
      sound: !!soundToggle?.checked
    }));
  }

  function transformText(raw) {
    let words = String(raw || "").trim().split(/\s+/).filter(Boolean);
    if (!punctuationToggle?.checked) {
      words = words.map(w => w.replace(/[.,!?;:"'“”‘’()[\]{}<>—–-]/g, ""));
    }
    if (numbersToggle?.checked) {
      for (let i = 7; i < words.length; i += 8) {
        const n = Math.floor(Math.random() * 900) + 10;
        words[i] = String(n);
      }
    }
    return words.filter(Boolean).join(" ");
  }

  const pressureModeButton = document.getElementById("pressureModeBtn");
  const pressureStats = document.getElementById("pressureStats");

  const pressureMode = {
    enabled: false,
    targetWpm: 45,
    level: 1,
    streak: 0,
    bestStreak: 0,
    maxErrors: 5,
    errors: 0
  };

  function resetPressureState() {
    pressureMode.errors = 0;
    updatePressureStatsDisplay();
  }

  function updatePressureStatsDisplay() {
    if (!pressureStats) return;
    pressureStats.hidden = !pressureMode.enabled;
    if (!pressureMode.enabled) return;

    const target = document.getElementById("pressureTargetWpm");
    const level = document.getElementById("pressureLevel");
    const streak = document.getElementById("pressureStreak");
    const bestStreak = document.getElementById("pressureBestStreak");

    if (target) target.textContent = pressureMode.targetWpm;
    if (level) level.textContent = pressureMode.level;
    if (streak) streak.textContent = pressureMode.streak;
    if (bestStreak) bestStreak.textContent = pressureMode.bestStreak;
  }

  if (pressureModeButton) {
    pressureModeButton.addEventListener("click", () => {
      pressureMode.enabled = !pressureMode.enabled;
      pressureModeButton.classList.toggle("active", pressureMode.enabled);
      pressureModeButton.setAttribute("aria-pressed", String(pressureMode.enabled));

      if (pressureMode.enabled) {
        pressureMode.targetWpm = Math.max(30, getPersonalBest());
        pressureMode.level = 1;
        pressureMode.streak = 0;
        pressureMode.bestStreak = 0;
      }
      resetTest();
    });
  }

  function checkPressureModeRules(liveWpm, errors) {
    if (!pressureMode.enabled || !started || finished) return;

    const elapsed = getElapsedSeconds();

    if (errors > pressureMode.maxErrors) {
      triggerPressureFailure("Too many errors!");
      return;
    }

    if (elapsed > 5 && liveWpm < pressureMode.targetWpm - 10) {
      triggerPressureFailure("Speed dropped below target!");
    }
  }

  function triggerPressureFailure(reason) {
    pressureMode.streak = 0;
    typingBox?.classList.add("pressure-fail-shake");
    setTimeout(() => typingBox?.classList.remove("pressure-fail-shake"), 500);
    finishTest("pressure_failed");
  }

  const ADAPTIVE_HISTORY_KEY = "typingwebsite_adaptive_recent_v1";
  const ADAPTIVE_HISTORY_LIMIT = 12;

  function getAdaptiveWeakKeys() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("typingwebsite_weak_keys_v1") || "{}"
      );
      const keys = saved.keys || {};
      return Object.entries(keys)
        .filter(([key, stat]) => {
          return (
            typeof key === "string" &&
            key.length === 1 &&
            stat &&
            stat.attempts >= 5 &&
            stat.errors > 0
          );
        })
        .map(([key, stat]) => ({
          key,
          rate: stat.errors / stat.attempts
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 6);
    } catch {
      return [];
    }
  }

  function getAdaptiveRecent() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(ADAPTIVE_HISTORY_KEY) || "[]"
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function isAdaptiveTextTooSimilar(candidate, recent) {
    const normalize = text =>
      String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);

    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "to", "of",
      "in", "on", "at", "for", "with", "is", "are",
      "was", "were", "we", "he", "she", "they", "it",
      "this", "that", "as", "by", "from", "after", "before"
    ]);

    const words = normalize(candidate);
    const meaningful = words.filter(word => !stopWords.has(word));
    const opening = meaningful.slice(0, 4).join(" ");

    for (const item of recent) {
      const previousText = typeof item === "string" ? item : item?.text;
      if (!previousText) continue;

      const previousWords = normalize(previousText);
      const previousMeaningful = previousWords.filter(word => !stopWords.has(word));
      const previousOpening = previousMeaningful.slice(0, 4).join(" ");

      if (opening && opening === previousOpening) return true;

      const a = new Set(meaningful);
      const b = new Set(previousMeaningful);
      if (!a.size || !b.size) continue;

      let common = 0;
      for (const word of a) {
        if (b.has(word)) common++;
      }
      const similarity = common / (a.size + b.size - common);
      if (similarity >= 0.45) return true;
    }
    return false;
  }

  function rememberAdaptivePassage(text) {
    try {
      const recent = getAdaptiveRecent();
      const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
      const updated = [
        normalized,
        ...recent.filter(item => item !== normalized)
      ].slice(0, ADAPTIVE_HISTORY_LIMIT);

      localStorage.setItem(ADAPTIVE_HISTORY_KEY, JSON.stringify(updated));
    } catch { }
  }

  function scoreAdaptiveText(text, weakKeys) {
    if (!weakKeys.length) return 0;
    const normalized = text.toLowerCase();
    let score = 0;
    for (const item of weakKeys) {
      const key = item.key.toLowerCase();
      let count = 0;
      for (const char of normalized) {
        if (char === key) count++;
      }
      score += Math.min(count, 8) * Math.min(item.rate, 0.6);
    }
    return score;
  }

  function getBasePassage() {
    const fallback = "The quick brown fox jumps over the lazy dog.";
    const originalList = typeof passages !== "undefined" && Array.isArray(passages[difficulty]) ? passages[difficulty] : [];
    const adaptiveList = window.adaptivePassages && Array.isArray(window.adaptivePassages[difficulty]) ? window.adaptivePassages[difficulty] : [];

    const candidates = [...new Set([...originalList, ...adaptiveList].filter(text => typeof text === "string" && text.trim()))];
    if (!candidates.length) return fallback;

    const recent = getAdaptiveRecent();
    const weakKeys = getAdaptiveWeakKeys();
    const normalizePassage = text => text.toLowerCase().replace(/\s+/g, " ").trim();

    let fresh = candidates.filter(text => {
      const normalized = normalizePassage(text);
      return !recent.includes(normalized) && !isAdaptiveTextTooSimilar(text, recent);
    });

    if (!fresh.length) fresh = candidates.filter(text => !recent.includes(normalizePassage(text)));
    if (!fresh.length) fresh = candidates;

    if (!weakKeys.length) {
      const selected = fresh[Math.floor(Math.random() * fresh.length)];
      rememberAdaptivePassage(selected);
      return selected;
    }

    const scored = fresh.map(text => ({ text, score: scoreAdaptiveText(text, weakKeys) }));
    const maxScore = Math.max(...scored.map(item => item.score));

    let thresholdRatio = 0.65;
    let generalMixChance = 0.35;
    let progress = null;

    try {
      if (typeof getProgressSummary === "function") progress = getProgressSummary();
    } catch { }

    if (progress && progress.tests >= 5) {
      if (progress.averageAccuracy < 85) {
        thresholdRatio = 0.45;
        generalMixChance = 0.55;
      } else if (progress.tests >= 10 && progress.averageAccuracy >= 97 && progress.trend >= 0) {
        thresholdRatio = 0.75;
        generalMixChance = 0.20;
      }
    }

    const threshold = maxScore * thresholdRatio;
    let pool = scored.filter(item => item.score >= threshold);

    if (Math.random() < generalMixChance || !pool.length) pool = scored;

    const selected = pool[Math.floor(Math.random() * pool.length)].text;
    rememberAdaptivePassage(selected);
    return selected;
  }

  function loadText() {
    let raw = getBasePassage();
    let prepared = transformText(raw);
    let words = prepared.split(/\s+/).filter(Boolean);

    if (mode === "words") {
      while (words.length < wordLimit) {
        const extra = transformText(getBasePassage()).split(/\s+/).filter(Boolean);
        words.push(...extra);
      }
      prepared = words.slice(0, wordLimit).join(" ");
    }

    currentText = prepared;
    textBox.innerHTML = "";
    [...currentText].forEach(char => {
      const span = document.createElement("span");
      span.innerText = char;
      textBox.appendChild(span);
    });
    if (textBox.children.length) textBox.children[0].classList.add("active");
    if (typingBox) typingBox.scrollTop = 0;
  }

  function enableFocusMode() {
    document.body.classList.add("typing-active");
    modePanel?.classList.add("hide-during-typing");
    minimalTools?.classList.add("hide-during-typing");
    footer?.classList.add("hide-during-typing");
    document.body.classList.remove("typing-controls-visible");
    clearTimeout(controlsHideTimer);
    focusOverlay?.classList.add("hidden");
    textBox.classList.remove("blur");
  }

  function disableFocusMode() {
    document.body.classList.remove("typing-active");
    modePanel?.classList.remove("hide-during-typing");
    minimalTools?.classList.remove("hide-during-typing");
    footer?.classList.remove("hide-during-typing");
    document.body.classList.remove("typing-controls-visible");
    clearTimeout(controlsHideTimer);
    showMouseCursor();
  }

  function hideMouseCursor() {
    document.body.classList.add("typing-cursor-hidden");
    mouseHidden = true;
  }

  function showMouseCursor() {
    document.body.classList.remove("typing-cursor-hidden");
    mouseHidden = false;
  }

  ["mousemove", "pointermove", "mouseenter"].forEach(evt => {
    document.addEventListener(evt, () => {
      if (mouseHidden) showMouseCursor();
      if (document.body.classList.contains("typing-active")) {
        document.body.classList.add("typing-controls-visible");
        clearTimeout(controlsHideTimer);
        controlsHideTimer = setTimeout(() => {
          document.body.classList.remove("typing-controls-visible");
        }, 2200);
      }
    }, { passive: true });
  });

  function updateCaret(chars) {
    chars.forEach(c => c.classList.remove("active"));
    if (chars[charIndex]) chars[charIndex].classList.add("active");
  }

  function updatePaceCarCaret(chars) {
    chars.forEach(c => c.classList.remove("active-ghost"));
    if (paceCarEnabled && chars[paceCarIndex]) {
      chars[paceCarIndex].classList.add("active-ghost");
    }
  }

  function startPaceCar() {
    if (!paceCarEnabled) return;
    paceCarIndex = 0;
    const targetWpm = Math.max(40, getPersonalBest());
    const charsPerMinute = targetWpm * 5;
    const intervalMs = (60 / charsPerMinute) * 1000;

    clearInterval(paceCarTimer);
    paceCarTimer = setInterval(() => {
      if (!started || finished) return;
      const chars = textBox.querySelectorAll("span");
      if (paceCarIndex < chars.length - 1) {
        paceCarIndex++;
        updatePaceCarCaret(chars);
      } else {
        clearInterval(paceCarTimer);
      }
    }, intervalMs);
  }

  function scrollActiveCharIntoView(isBackspace = false) {
    if (!typingBox || isBackspace) return;
    const active = textBox.querySelectorAll("span")[charIndex];
    if (!active) return;
    const box = typingBox.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(textBox).lineHeight) || 44;
    if (rect.top >= box.top + lineHeight * 1.95) {
      typingBox.scrollTop += lineHeight;
    }
  }

  function startCountdown() {
    clearInterval(timer);
    timeLeft = selectedTime;
    updateTimeDisplay(timeLeft);
    timer = setInterval(() => {
      if (finished) return;
      timeLeft--;
      updateTimeDisplay(Math.max(0, timeLeft));
      updateLiveStats();
      if (timeLeft <= 0) finishTest("time");
    }, 1000);
  }

  function startCountUp() {
    clearInterval(timer);
    elapsedSeconds = 0;
    updateTimeDisplay(0);
    timer = setInterval(() => {
      if (finished) return;
      elapsedSeconds++;
      updateTimeDisplay(elapsedSeconds);
      updateLiveStats();
    }, 1000);
  }

  function startSampling() {
    clearInterval(sampleTimer);

    wpmSamples = [];
    rawSamples = [];
    errorSamples = [];

    let previousCorrect = correct;
    let previousTyped = totalTyped;
    let previousSecond = 0;

    sampleTimer = setInterval(() => {
      if (!started || finished) return;

      const elapsed = getElapsedSeconds();
      const second = Math.floor(elapsed);

      if (second <= previousSecond || second <= 0) return;

      const secondsPassed = second - previousSecond;
      const correctDelta = Math.max(0, correct - previousCorrect);
      const typedDelta = Math.max(0, totalTyped - previousTyped);

      const intervalWpm = Math.round((correctDelta / 5) * (60 / secondsPassed));
      const intervalRawWpm = Math.round((typedDelta / 5) * (60 / secondsPassed));

      for (let i = 0; i < secondsPassed; i++) {
        wpmSamples.push(intervalWpm);
        rawSamples.push(intervalRawWpm);
        errorSamples.push(Math.max(0, totalTyped - correct));
      }

      previousCorrect = correct;
      previousTyped = totalTyped;
      previousSecond = second;

      drawGraph(wpmSamples, rawSamples, errorSamples);
    }, 200);
  }

  function getElapsedSeconds() {
    if (!testStartMs) return 0;
    return Math.max(0, (Date.now() - testStartMs) / 1000);
  }

  function updateTimeDisplay(seconds) {
    const sec = Math.max(0, Math.floor(seconds));
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    const value = `${min}:${rem < 10 ? "0" + rem : rem}`;
    if (timeEl) timeEl.innerText = value;
    if (liveTimeEl) liveTimeEl.innerText = value;
  }

  function getTypedWordCount() {
    if (!currentText || charIndex <= 0) return 0;
    const typedText = currentText.slice(0, charIndex).trim();
    return typedText ? typedText.split(/\s+/).length : 0;
  }

  function updateLiveModeDisplay() {
    if (liveTimeEl) {
      liveTimeEl.hidden = mode !== "timed";
      if (mode === "timed") {
        liveTimeEl.innerText = `${Math.floor(selectedTime / 60)}:${String(selectedTime % 60).padStart(2, "0")}`;
      }
    }

    if (liveWordsEl) {
      liveWordsEl.hidden = false;
      const typedWords = getTypedWordCount();
      if (mode === "words") {
        liveWordsEl.innerText = `${typedWords} / ${wordLimit} ${wordLimit === 1 ? "word" : "words"}`;
      } else {
        liveWordsEl.innerText = `${typedWords} ${typedWords === 1 ? "word" : "words"}`;
      }
    }
  }

  function updateLiveWordsDisplay() {
    if (!liveWordsEl) return;
    const typedWords = getTypedWordCount();
    if (mode === "words") {
      liveWordsEl.innerText = `${typedWords} / ${wordLimit} ${wordLimit === 1 ? "word" : "words"}`;
    } else {
      liveWordsEl.innerText = `${typedWords} ${typedWords === 1 ? "word" : "words"}`;
    }
  }

  function updateLiveStats() {
    const elapsed = getElapsedSeconds() || (mode === "timed" ? selectedTime - timeLeft : elapsedSeconds);
    const minutes = Math.max(elapsed / 60, 1 / 60);
    const liveWpm = Math.round((correct / 5) / minutes) || 0;
    const rawWpm = Math.round((totalTyped / 5) / minutes) || 0;
    const errors = Math.max(0, totalTyped - correct);
    const accuracy = totalTyped ? Math.round((correct / totalTyped) * 100) : 100;

    if (wpmEl) wpmEl.innerText = liveWpm;
    if (rawWpmEl) rawWpmEl.innerText = rawWpm;
    if (errorsEl) errorsEl.innerText = errors;
    if (accEl) accEl.innerText = accuracy + "%";

    updateLiveWordsDisplay();
    checkPressureModeRules(liveWpm, errors);
  }

  function getConsistency(samples) {
    if (!samples.length) return 100;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (!avg) return 100;
    const variance = samples.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / samples.length;
    const sd = Math.sqrt(variance);
    return Math.max(0, Math.min(100, Math.round(100 - (sd / avg) * 100)));
  }

  function drawGraph(wpmValues, rawValues, errors) {
    if (!wpmGraph) return;

    const wrapper = wpmGraph.parentElement;
    const ctx = wpmGraph.getContext("2d");
    if (!ctx || !wrapper) return;

    const wpmArr = Array.isArray(wpmValues)
      ? wpmValues.map(Number).map(v => Number.isFinite(v) ? Math.max(0, v) : 0)
      : [];

    const rawArr = Array.isArray(rawValues)
      ? rawValues.map(Number).map(v => Number.isFinite(v) ? Math.max(0, v) : 0)
      : [];

    const errorArr = Array.isArray(errors) ? errors : [];
    const count = Math.max(wpmArr.length, rawArr.length);

    while (wpmArr.length < count) wpmArr.push(0);
    while (rawArr.length < count) rawArr.push(wpmArr[rawArr.length] || 0);

    const cssW = Math.max(1, wrapper.clientWidth || 800);
    const cssH = Math.max(150, wrapper.clientHeight || 220);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pixelW = Math.round(cssW * dpr);
    const pixelH = Math.round(cssH * dpr);

    if (wpmGraph.width !== pixelW) wpmGraph.width = pixelW;
    if (wpmGraph.height !== pixelH) wpmGraph.height = pixelH;

    wpmGraph.style.width = "100%";
    wpmGraph.style.height = "100%";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { top: 22, right: 16, bottom: 30, left: 38 };
    const plotW = Math.max(1, cssW - pad.left - pad.right);
    const plotH = Math.max(1, cssH - pad.top - pad.bottom);

    const maxSpeed = Math.max(20, ...wpmArr, ...rawArr);
    const axisMax = Math.ceil(maxSpeed / 20) * 20;

    const maxTime = Math.max(1, count);
    const xAt = i => pad.left + (count <= 1 ? plotW / 2 : (i / (maxTime - 1)) * plotW);
    const yAt = value => pad.top + plotH - (Math.min(value, axisMax) / axisMax) * plotH;

    ctx.font = "11px 'Roboto Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const ratio = i / 4;
      const y = pad.top + plotH * ratio;
      const value = Math.round(axisMax * (1 - ratio));

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.moveTo(pad.left, y);
      ctx.lineTo(cssW - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = "#777a80";
      ctx.fillText(String(value), pad.left - 8, y);
    }

    if (count === 0) {
      lastRenderedPoints = [];
      hideGraphTooltip();
      return;
    }

    const wpmPoints = wpmArr.map((v, i) => ({
      x: xAt(i), y: yAt(v), wpm: v, raw: rawArr[i], second: i + 1, errors: Number(errorArr[i]) || 0
    }));
    const rawPoints = rawArr.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    lastRenderedPoints = wpmPoints;

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();

    function drawLine(points, color, lineWidth) {
      if (!points.length) return;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          const prev = points[i - 1];
          const midX = (prev.x + p.x) / 2;
          const midY = (prev.y + p.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          if (i === points.length - 1) ctx.lineTo(p.x, p.y);
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    drawLine(rawPoints, "#7c7c9a", 2);
    drawLine(wpmPoints, "#e2b714", 2.5);

    errorArr.forEach((errCount, i) => {
      const prevErr = i > 0 ? Number(errorArr[i - 1]) || 0 : 0;
      if (errCount > prevErr && wpmPoints[i]) {
        const p = wpmPoints[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ff5555";
        ctx.fill();
      }
    });

    ctx.restore();
  }

  function setupGraphTooltip() {
    if (!wpmGraph || graphEventsAttached) return;
    graphEventsAttached = true;

    wpmGraph.addEventListener("pointermove", event => {
      const tooltip = document.getElementById("graphTooltip");
      const wrapper = wpmGraph.parentElement;
      if (!tooltip || !wrapper || !lastRenderedPoints.length) return;

      const rect = wpmGraph.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      let closest = null;
      let minDistance = Infinity;

      for (const point of lastRenderedPoints) {
        const distance = Math.hypot(point.x - mouseX, point.y - mouseY);
        if (distance < minDistance) {
          minDistance = distance;
          closest = point;
        }
      }

      if (!closest || minDistance > 40) {
        hideGraphTooltip();
        return;
      }

      tooltip.replaceChildren();
      const addLine = (text, color, bold = false) => {
        const line = document.createElement("div");
        line.textContent = text;
        line.style.color = color;
        if (bold) line.style.fontWeight = "700";
        tooltip.appendChild(line);
      };

      addLine(`Second ${closest.second}`, "#d1d0c5");
      addLine(`WPM: ${closest.wpm}`, "#e2b714", true);
      addLine(`Raw: ${closest.raw}`, "#a2a2c0");
      addLine(`Errors: ${closest.errors}`, "#ff7777");

      tooltip.style.display = "block";
      const left = Math.max(4, Math.min(closest.x + 12, wrapper.clientWidth - tooltip.offsetWidth - 4));
      const top = Math.max(4, Math.min(closest.y - tooltip.offsetHeight / 2, wrapper.clientHeight - tooltip.offsetHeight - 4));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    wpmGraph.addEventListener("pointerleave", hideGraphTooltip);
  }

  function hideGraphTooltip() {
    const tooltip = document.getElementById("graphTooltip");
    if (tooltip) tooltip.style.display = "none";
  }

  function finishTest(reason = "manual") {
    if (finished) return;
    finished = true;
    started = false;

    clearInterval(timer);
    clearInterval(sampleTimer);

    let elapsed = getElapsedSeconds();
    if (mode === "timed" && reason === "time") elapsed = selectedTime;
    elapsed = Math.max(elapsed, 1 / 60);

    const minutes = elapsed / 60;
    const wpm = Math.round((correct / 5) / minutes) || 0;
    const rawWpm = Math.round((totalTyped / 5) / minutes) || 0;
    const accuracy = totalTyped ? Math.round((correct / totalTyped) * 100) : 0;
    const errors = Math.max(0, totalTyped - correct);
    const consistency = getConsistency(wpmSamples);

    updatePersonalBest(wpm);

    if (resWpm) resWpm.innerText = wpm;
    if (resRawWpm) resRawWpm.innerText = rawWpm;
    if (resAcc) resAcc.innerText = accuracy + "%";
    if (resChar) resChar.innerText = totalTyped;
    if (resErrors) resErrors.innerText = errors;
    if (resConsistency) resConsistency.innerText = consistency + "%";

    // Dynamically update test type display on result screen based on current mode & length
    if (resTestType) {
      if (mode === "timed") {
        resTestType.innerText = `timed ${selectedTime}`;
      } else if (mode === "words") {
        resTestType.innerText = `words ${wordLimit}`;
      } else {
        resTestType.innerText = `passage`;
      }
    }

    disableFocusMode();
    document.body.classList.add("result-visible");
    if (typingBox) typingBox.style.display = "none";
    const restart = document.querySelector(".restart-wrapper");
    if (restart) restart.style.display = "none";
    if (resultScreen) resultScreen.style.display = "block";

    if (!wpmSamples.length) {
      wpmSamples = [wpm];
      rawSamples = [rawWpm];
      errorSamples = [errors];
    }

    setupGraphTooltip();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawGraph(wpmSamples, rawSamples, errorSamples);
      });
    });

    saveHistory({
      wpm,
      rawWpm,
      accuracy,
      errors,
      consistency,
      characters: totalTyped,
      mode: mode === "timed" ? `timed ${selectedTime}` : mode === "words" ? `words ${wordLimit}` : "passage",
      date: new Date().toLocaleDateString()
    });
  }

  function resetTest() {
    clearInterval(timer);
    clearInterval(sampleTimer);
    clearInterval(paceCarTimer);
    clearTimeout(finishTimeout);
    finished = false;
    started = false;
    charIndex = 0;
    correct = 0;
    totalTyped = 0;
    elapsedSeconds = 0;
    timeLeft = selectedTime;
    testStartMs = 0;
    wpmSamples = [];
    rawSamples = [];
    errorSamples = [];
    paceCarIndex = 0;

    resetPressureState();

    if (topSpeedEl) topSpeedEl.innerText = "0 WPM";
    if (wpmEl) wpmEl.innerText = "0";
    if (rawWpmEl) rawWpmEl.innerText = "0";
    if (errorsEl) errorsEl.innerText = "0";
    if (accEl) accEl.innerText = "100%";
    updateTimeDisplay(mode === "timed" ? selectedTime : 0);

    if (resultScreen) resultScreen.style.display = "none";
    document.body.classList.remove("result-visible");
    if (typingBox) { typingBox.style.display = "block"; typingBox.scrollTop = 0; }
    const restart = document.querySelector(".restart-wrapper");
    if (restart) restart.style.display = "block";

    showMouseCursor();
    syncModeUI();
    loadText();
    renderPersonalBest();
    updateLiveModeDisplay();
    textBox.blur();
    textBox.classList.add("blur");
    focusOverlay?.classList.remove("hidden");
  }

  function setMode(modeName) {
    mode = modeName === "words" ? "words" : modeName === "passage" ? "passage" : "timed";
    resetTest();
  }

  modeButtons.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

  document.querySelectorAll(".difficulty-group .diff-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".difficulty-group .diff-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    difficulty = btn.dataset.diff;
    resetTest();
  }));

  document.querySelectorAll("#timedLengths .length-btn[data-time]").forEach(btn => btn.addEventListener("click", () => {
    selectedTime = Math.max(5, parseInt(btn.dataset.time, 10) || 30);
    mode = "timed";
    resetTest();
  }));

  document.querySelectorAll("#wordLengths .length-btn[data-words]").forEach(btn => btn.addEventListener("click", () => {
    wordLimit = Math.max(1, parseInt(btn.dataset.words, 10) || 25);
    mode = "words";
    resetTest();
  }));

  function openCustom(kind = "time") {
    const timeOption = document.querySelector("#customModal .custom-option.time-custom-option");
    const wordsOption = document.querySelector("#customModal .custom-option.words-custom-option");
    const title = document.querySelector("#customModal .modal-head h2");
    const sub = document.getElementById("customModalSub");

    const isWords = kind === "words";
    if (timeOption) timeOption.hidden = isWords;
    if (wordsOption) wordsOption.hidden = !isWords;
    if (title) title.innerText = isWords ? "Custom Words" : "Custom Time";
    if (sub) sub.innerText = isWords ? "Choose the number of words for this test." : "Choose the duration for this test.";

    openModal("customModal");
    requestAnimationFrame(() => {
      const input = document.getElementById(isWords ? "customWordsInput" : "customTimeInput");
      input?.focus();
      input?.select();
    });
  }

  customTimeBtn?.addEventListener("click", () => openCustom("time"));
  customWordsBtn?.addEventListener("click", () => openCustom("words"));

  function applyCustomTimer() {
    const input = document.getElementById("customTimeInput");
    const value = Math.min(3600, Math.max(5, parseInt(input?.value, 10) || 45));
    customTime = value;
    selectedTime = value;
    mode = "timed";
    closeModal("customModal");
    resetTest();
  }

  function applyCustomWordCount() {
    const input = document.getElementById("customWordsInput");
    const value = Math.min(1000, Math.max(1, parseInt(input?.value, 10) || 25));
    customWords = value;
    wordLimit = value;
    mode = "words";
    closeModal("customModal");
    resetTest();
  }

  applyCustomTime?.addEventListener("click", applyCustomTimer);
  applyCustomWords?.addEventListener("click", applyCustomWordCount);

  function syncFeatureButtons() {
    [[punctuationBtn, punctuationToggle], [numbersBtn, numbersToggle], [soundBtn, soundToggle]].forEach(([btn, input]) => {
      if (!btn || !input) return;
      const on = !!input.checked;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    if (paceCarBtn) {
      paceCarBtn.classList.toggle("is-on", paceCarEnabled);
      paceCarBtn.setAttribute("aria-pressed", String(paceCarEnabled));
    }
  }

  [[punctuationBtn, punctuationToggle], [numbersBtn, numbersToggle], [soundBtn, soundToggle]].forEach(([btn, input]) => {
    btn?.addEventListener("click", () => {
      if (!input) return;
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      syncFeatureButtons();
    });
  });

  paceCarBtn?.addEventListener("click", () => {
    paceCarEnabled = !paceCarEnabled;
    syncFeatureButtons();
    document.body.classList.toggle("pace-car-active", paceCarEnabled);
    if (paceCarEnabled) openPaceGuideModal();
    resetTest();
  });

  function syncModeUI() {
    modeButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.mode === mode));
    if (timedLengths) timedLengths.hidden = mode !== "timed";
    if (wordLengths) wordLengths.hidden = mode !== "words";

    document.querySelectorAll("#timedLengths .length-btn[data-time]").forEach(btn => {
      btn.classList.toggle("is-active", mode === "timed" && Number(btn.dataset.time) === selectedTime);
    });
    if (customTimeBtn) {
      customTimeBtn.classList.toggle("is-active", mode === "timed" && ![15, 30, 60, 120].includes(Number(selectedTime)));
    }
    document.querySelectorAll("#wordLengths .length-btn[data-words]").forEach(btn => {
      btn.classList.toggle("is-active", mode === "words" && Number(btn.dataset.words) === wordLimit);
    });
    if (customWordsBtn) {
      customWordsBtn.classList.toggle("is-active", mode === "words" && ![10, 25, 50, 100].includes(Number(wordLimit)));
    }
    if (timeSelect) timeSelect.value = String(selectedTime);
    if (passageBtn) passageBtn.classList.toggle("is-active", mode === "passage");
    syncFeatureButtons();
    updateLiveModeDisplay();
    updatePressureStatsDisplay();
  }

  const settingsBtn = document.getElementById("settingsBtn");
  const statsBtn = document.getElementById("statsBtn");
  const shortcutsBtn = document.getElementById("shortcutsBtn");
  const themeSelect = document.getElementById("themeSelect");
  const caretSelect = document.getElementById("caretSelect");
  const fontSizeRange = document.getElementById("fontSizeRange");
  const statsGraph = document.getElementById("statsGraph");
  const commandHint = document.getElementById("commandHint");
  const EXTRA_SETTINGS_KEY = "typing_test_ui_settings_v1";

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    document.querySelectorAll(".app-modal.show").forEach(m => {
      if (m !== el) {
        m.classList.remove("show");
        m.setAttribute("aria-hidden", "true");
      }
    });
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".app-modal.show")) document.body.classList.remove("modal-open");
  }

  function closeAllModals() {
    document.querySelectorAll(".app-modal.show").forEach(m => {
      m.classList.remove("show");
      m.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("modal-open");
    closeInfoPanels();
  }

  const infoPanels = document.querySelectorAll(".info-panel");
  const infoOpenButtons = document.querySelectorAll("[data-info-open]");
  const infoCloseButtons = document.querySelectorAll("[data-info-close]");

  function closeInfoPanels() {
    infoPanels.forEach(panel => {
      panel.classList.remove("show");
      panel.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("info-panel-open");
  }

  function openInfoPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    closeAllModals();
    infoPanels.forEach(item => {
      item.classList.remove("show");
      item.setAttribute("aria-hidden", "true");
    });
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("info-panel-open");
    panel.querySelector("[data-info-close]")?.focus();
  }

  infoOpenButtons.forEach(button => {
    button.addEventListener("click", () => openInfoPanel(button.dataset.infoOpen));
  });

  infoCloseButtons.forEach(button => {
    button.addEventListener("click", closeInfoPanels);
  });

  infoPanels.forEach(panel => {
    panel.addEventListener("click", e => {
      if (e.target === panel) closeInfoPanels();
    });
  });

  function applyUISettings() {
    const theme = themeSelect?.value || footerThemeSelect?.value || "dark";
    if (themeSelect) themeSelect.value = theme;
    if (footerThemeSelect) footerThemeSelect.value = theme;
    document.body.classList.remove("theme-midnight", "theme-light");
    if (theme !== "dark") document.body.classList.add(`theme-${theme}`);
    const caret = caretSelect?.value || "line";
    document.body.classList.remove("caret-block", "caret-underline");
    if (caret !== "line") document.body.classList.add(`caret-${caret}`);
    if (fontSizeRange && textBox) {
      textBox.style.fontSize = `${fontSizeRange.value}px`;
      typingBox?.style.setProperty("--typing-font-size", `${fontSizeRange.value}px`);
    }
    localStorage.setItem(EXTRA_SETTINGS_KEY, JSON.stringify({ theme, caret, fontSize: fontSizeRange?.value || 28 }));
  }

  function loadUISettings() {
    try {
      const x = JSON.parse(localStorage.getItem(EXTRA_SETTINGS_KEY) || "{}");
      if (themeSelect && x.theme) themeSelect.value = x.theme;
      if (footerThemeSelect && x.theme) footerThemeSelect.value = x.theme;
      if (caretSelect && x.caret) caretSelect.value = x.caret;
      if (fontSizeRange && x.fontSize) fontSizeRange.value = x.fontSize;
    } catch { }
    applyUISettings();
  }

  function drawStatsGraph() {
    if (!statsGraph) return;
    const h = getHistory().slice().reverse();
    const values = h.map(x => Number(x.wpm) || 0);
    const ctx = statsGraph.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const w = statsGraph.clientWidth || 760, height = 190;
    statsGraph.width = w * dpr; statsGraph.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, height);
    const pad = { l: 38, r: 12, t: 15, b: 25 }, pw = Math.max(1, w - pad.l - pad.r), ph = height - pad.t - pad.b;
    const max = Math.max(20, Math.ceil((Math.max(...values, 0)) / 10) * 10);
    ctx.font = "11px Sora,Arial"; ctx.fillStyle = "#666"; ctx.strokeStyle = "#252525"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) { const y = pad.t + ph * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(String(Math.round(max * (1 - i / 4))), pad.l - 7, y); }
    if (!values.length) { ctx.textAlign = "center"; ctx.fillText("Complete tests to build your statistics.", w / 2, height / 2); return; }
    const pts = values.map((v, i) => ({ x: values.length === 1 ? pad.l + pw / 2 : pad.l + i * pw / (values.length - 1), y: pad.t + ph - (v / max) * ph, v }));
    ctx.strokeStyle = "#2196f3"; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    const peak = Math.max(...values), idx = values.indexOf(peak), p = pts[idx];
    ctx.fillStyle = "#2196f3"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(`${peak} WPM`, p.x, Math.max(8, p.y - 12));
  }

  function updateDashboard() {
    const h = getHistory(), tests = h.length;
    const best = tests ? Math.max(...h.map(x => Number(x.wpm) || 0)) : 0;
    const avg = tests ? Math.round(h.reduce((a, x) => a + (Number(x.wpm) || 0), 0) / tests) : 0;
    const acc = tests ? Math.round(h.reduce((a, x) => a + (Number(x.accuracy) || 0), 0) / tests) : 0;
    const chars = h.reduce((a, x) => a + (Number(x.characters ?? x.chars) || 0), 0);
    const errors = h.reduce((a, x) => a + (Number(x.errors) || 0), 0);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
    set("dashTests", tests); set("dashBest", best); set("dashAvg", avg); set("dashAcc", acc + "%"); set("dashChars", chars); set("dashErrors", errors); drawStatsGraph();
  }

  settingsBtn?.addEventListener("click", () => openModal("settingsModal"));
  statsBtn?.addEventListener("click", () => { updateDashboard(); openModal("statsModal"); });
  shortcutsBtn?.addEventListener("click", () => openModal("shortcutsModal"));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.querySelectorAll(".app-modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModal(m.id); }));
  [themeSelect, caretSelect, fontSizeRange].forEach(e => e?.addEventListener("input", applyUISettings));
  [themeSelect, caretSelect].forEach(e => e?.addEventListener("change", applyUISettings));
  footerThemeSelect?.addEventListener("change", () => {
    if (themeSelect) themeSelect.value = footerThemeSelect.value;
    applyUISettings();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAllModals();
    if (e.key === "/" && document.activeElement !== textBox && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openModal("shortcutsModal"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); resetTest(); }
  });
  window.addEventListener("resize", () => { if (document.getElementById("statsModal")?.classList.contains("show")) drawStatsGraph(); });
  if (commandHint) setTimeout(() => commandHint.remove(), 5000);

  function applySEOPageConfig() {
    const cfg = window.TypingMeterSEOConfig || {};
    if (cfg.difficulty) difficulty = ["easy", "medium", "hard"].includes(cfg.difficulty) ? cfg.difficulty : difficulty;
    if (cfg.mode) mode = ["timed", "words", "passage"].includes(cfg.mode) ? cfg.mode : mode;
    if (Number.isFinite(Number(cfg.time)) && Number(cfg.time) >= 5) selectedTime = Number(cfg.time);
    if (Number.isFinite(Number(cfg.words)) && Number(cfg.words) >= 1) wordLimit = Number(cfg.words);
    if (typeof cfg.punctuation === "boolean" && punctuationToggle) punctuationToggle.checked = cfg.punctuation;
    if (typeof cfg.numbers === "boolean" && numbersToggle) numbersToggle.checked = cfg.numbers;
  }

  loadUISettings();
  applySEOPageConfig();

  textBox.addEventListener("focus", () => {
    if (finished) return;
    focusOverlay?.classList.add("hidden");
    textBox.classList.remove("blur");
  });

  textBox.addEventListener("blur", () => {
    if (!started && !finished) {
      focusOverlay?.classList.remove("hidden");
      textBox.classList.add("blur");
    }
  });

  focusOverlay?.addEventListener("click", () => textBox.focus());
  typingBox?.addEventListener("wheel", e => e.preventDefault(), { passive: false });
  typingBox?.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

  document.addEventListener("keydown", e => {
    if (started || finished) return;
    if (document.querySelector(".app-modal.show")) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab" || e.key === "Escape") return;
    textBox.focus();
  });

  textBox.addEventListener("keydown", function (e) {
    if (finished) return;
    if (e.key === "Tab") return;
    if (e.key === " ") e.preventDefault();
    if (e.key.length > 1 && e.key !== "Backspace" && e.key !== " ") return;

    if (!started) {
      started = true;
      testStartMs = Date.now();
      enableFocusMode();
      hideMouseCursor();
      if (mode === "timed") startCountdown(); else startCountUp();
      startSampling();
      if (paceCarEnabled) startPaceCar();
    }

    const chars = textBox.querySelectorAll("span");
    if (e.key === "Backspace") {
      if (charIndex > 0) {
        charIndex--;
        chars[charIndex].classList.remove("correct", "incorrect");
        chars[charIndex].classList.add("active");
        updateCaret(chars);
        requestAnimationFrame(() => scrollActiveCharIntoView(true));
        updateLiveStats();
      }
      return;
    }
    if (!chars[charIndex]) return;

    totalTyped++;
    if (soundToggle?.checked) { const clone = keySound.cloneNode(); clone.volume = keySound.volume; clone.play().catch(() => { }); }

    const expectedChar = chars[charIndex].innerText;
    const actualChar = e.key;

    if (actualChar === expectedChar) {
      chars[charIndex].classList.add("correct");
      correct++;
    } else {
      chars[charIndex].classList.add("incorrect");
    }

    if (
      window.WeakKeyTrainer &&
      typeof window.WeakKeyTrainer.record === "function" &&
      expectedChar.length === 1 &&
      actualChar.length === 1 &&
      expectedChar.trim() !== "" &&
      actualChar.trim() !== ""
    ) {
      window.WeakKeyTrainer.record(
        expectedChar,
        actualChar,
        actualChar === expectedChar
      );
    }

    if (
      window.WeakKeyTrainer &&
      /^[a-z]$/i.test(expectedChar) &&
      /^[a-z]$/i.test(actualChar)
    ) {
      window.WeakKeyTrainer.record(
        expectedChar.toLowerCase(),
        actualChar.toLowerCase(),
        actualChar.toLowerCase() === expectedChar.toLowerCase()
      );
    }

    chars[charIndex].classList.remove("active");
    charIndex++;
    updateCaret(chars);

    if (chars[charIndex]) {
      chars[charIndex].classList.add("active");
      requestAnimationFrame(() => scrollActiveCharIntoView(false));
    } else {
      chars.forEach(c => c.classList.remove("active"));
      if (chars.length) chars[chars.length - 1].classList.add("active");
      finishTimeout = setTimeout(() => finishTest("passage"), 150);
    }
    updateLiveStats();
  });

  retryBtn?.addEventListener("click", resetTest);
  restartMainBtn?.addEventListener("click", resetTest);
  historyToggle?.addEventListener("click", () => { localHistory?.classList.toggle("show"); renderHistory(); updateDashboard(); });
  clearHistoryBtn?.addEventListener("click", () => { localStorage.removeItem(HISTORY_KEY); renderHistory(); updateDashboard(); });

  [punctuationToggle, numbersToggle, soundToggle].forEach(el => el?.addEventListener("change", () => {
    saveSettings();

    if (el === soundToggle) return;

    if (!started) {
      loadText();
      charIndex = 0;
      correct = 0;
      totalTyped = 0;
      wpmSamples = [];
      rawSamples = [];
      errorSamples = [];
      if (wpmEl) wpmEl.innerText = "0";
      if (rawWpmEl) rawWpmEl.innerText = "0";
      if (errorsEl) errorsEl.innerText = "0";
      if (accEl) accEl.innerText = "100%";
      updateTimeDisplay(mode === "timed" ? selectedTime : 0);
      textBox.focus();
    }
  }));

  const paceGuideModal = document.getElementById("paceGuideModal");
  const closePaceGuideBtn = document.getElementById("closePaceGuide");

  function openPaceGuideModal() {
    paceGuideModal?.classList.add("show");
    paceGuideModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closePaceGuideModal() {
    paceGuideModal?.classList.remove("show");
    paceGuideModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  closePaceGuideBtn?.addEventListener("click", closePaceGuideModal);
  paceGuideModal?.addEventListener("click", (e) => {
    if (e.target === paceGuideModal) closePaceGuideModal();
  });

  loadSettings();
  syncFeatureButtons();
  renderPersonalBest();
  renderHistory();
  resetTest();
});

document.addEventListener("DOMContentLoaded", () => {
  const hideCompletionMessage = () => {
    document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,div,span").forEach(el => {
      const text = el.textContent.trim();
      if (text === "Test Complete!" || text === "Keep practicing and try to beat your best score.") {
        const parent = el.parentElement;
        if (parent && parent.textContent.includes("Test Complete!")) {
          parent.style.display = "none";
        } else {
          el.style.display = "none";
        }
      }
    });
  };

  hideCompletionMessage();
  const observer = new MutationObserver(hideCompletionMessage);
  observer.observe(document.body, { childList: true, subtree: true });
});


document.addEventListener("DOMContentLoaded", function () {
  // Prevent test controls from submitting a form and refreshing the page.
  const controlSelectors = [
    "#restartBtn",
    "#resetBtn",
    "#finishBtn",
    "#passageBtn",
    "#passageBtnEasy",
    "#passageBtnMedium",
    "#passageBtnHard",
    ".restart-btn",
    ".reset-btn",
    ".finish-btn",
    ".passage-btn",
    ".icon-toggle"
  ];

  document.querySelectorAll(controlSelectors.join(",")).forEach(function (button) {
    if (button.tagName === "BUTTON") {
      button.type = "button";
    }
  });

  // Prevent accidental form submission when pressing Enter.
  document.querySelectorAll("form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  });
});
