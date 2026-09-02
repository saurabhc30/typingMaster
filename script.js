document.addEventListener("DOMContentLoaded", function () {

  const textBox = document.getElementById("text");
  const retryBtn = document.getElementById("retryBtn");
  const restartMainBtn = document.getElementById("restartMainBtn"); // Added
  const resultScreen = document.getElementById("resultScreen");

  const wpmEl = document.getElementById("wpm");
  const accEl = document.getElementById("accuracy");
  const timeEl = document.getElementById("time");

  const resWpm = document.getElementById("resWpm");
  const resAcc = document.getElementById("resAcc");
  const resChar = document.getElementById("resChar");

  const timeSelect = document.getElementById("timeSelect");
  const passageBtn = document.getElementById("passageBtn");
  const diffButtons = document.querySelectorAll(".diff-btn");

  const modePanel = document.querySelector(".buttons");

  /* ================= SOUND ================= */

  const keySound = new Audio("typing.mp3");
  keySound.volume = 0.4;
  keySound.preload = "auto";

  function playKeySound() {
    const clone = keySound.cloneNode();
    clone.volume = 0.4;
    clone.play();
  }

  /* ================= VARIABLES ================= */

  let difficulty = "easy";
  let mode = "timed";
  let selectedTime = 60;

  let currentText = "";
  let charIndex = 0;
  let correct = 0;
  let totalTyped = 0;

  let timer = null;
  let timeLeft = 0;
  let elapsedSeconds = 0;

  let started = false;
  let focusEnabled = false;
  let mouseTimer = null;

  /* ================= LOAD TEXT ================= */

  function loadText() {
    // Safety check for passages global variable
    if (typeof passages === 'undefined') return;
    const list = passages[difficulty];
    currentText = list[Math.floor(Math.random() * list.length)];

    textBox.innerHTML = "";

    currentText.split("").forEach(char => {
      const span = document.createElement("span");
      span.innerText = char;
      textBox.appendChild(span);
    });

    if (textBox.children.length > 0) {
      textBox.children[0].classList.add("active");
    }
  }

  /* ================= FOCUS MODE ================= */

  function enableFocusMode() {
    focusEnabled = true;
    modePanel?.classList.add("hide-during-typing");
    document.body.classList.add("typing-active");
  }

  function disableFocusMode() {
    focusEnabled = false;
    clearTimeout(mouseTimer);
    modePanel?.classList.remove("hide-during-typing");
    document.body.classList.remove("typing-active");
  }

  /* ================= MOUSE MOVE ================= */

  document.addEventListener("mousemove", () => {
    if (!started || !focusEnabled) return;

    modePanel?.classList.remove("hide-during-typing");
    document.body.classList.remove("typing-active");

    clearTimeout(mouseTimer);

    mouseTimer = setTimeout(() => {
      if (!started) return;
      modePanel?.classList.add("hide-during-typing");
      document.body.classList.add("typing-active");
    }, 2000);
  });

  /* ================= CARET ================= */

  function updateCaret(chars) {
    chars.forEach(c => c.classList.remove("active"));

    if (chars[charIndex]) {
      chars[charIndex].classList.add("active");
    }
  }

  /* ================= TIMER ================= */

  function startCountdown() {
    timeLeft = selectedTime;
    updateTimeDisplay(timeLeft);

    timer = setInterval(() => {
      timeLeft--;
      updateTimeDisplay(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timer);
        showResult();
      }
    }, 1000);
  }

  function startCountUp() {
    elapsedSeconds = 0;
    updateTimeDisplay(elapsedSeconds);

    timer = setInterval(() => {
      elapsedSeconds++;
      updateTimeDisplay(elapsedSeconds);
    }, 1000);
  }

  function updateTimeDisplay(seconds) {
    let min = Math.floor(seconds / 60);
    let sec = seconds % 60;
    timeEl.innerText = min + ":" + (sec < 10 ? "0" + sec : sec);
  }

  /* ================= SHOW RESULT ================= */

  function showResult() {
    clearInterval(timer);
    disableFocusMode();
    started = false;

    let minutes = (mode === "timed")
      ? (selectedTime - timeLeft) / 60
      : elapsedSeconds / 60;

    if (minutes <= 0) minutes = 1 / 60;

    const wpm = Math.round((correct / 5) / minutes);
    const accuracy = Math.round((correct / totalTyped) * 100) || 0;

    resWpm.innerText = wpm;
    resAcc.innerText = accuracy + "%";
    resChar.innerText = totalTyped;

    document.querySelector(".typing-box").style.display = "none";
    document.querySelector(".restart-wrapper").style.display = "none";
    resultScreen.style.display = "block";
  }

  /* ================= RESET ================= */

  function resetTest() {
    clearInterval(timer);
    disableFocusMode();

    charIndex = 0;
    correct = 0;
    totalTyped = 0;
    elapsedSeconds = 0;
    started = false;

    wpmEl.innerText = 0;
    accEl.innerText = "100%";

    updateTimeDisplay(mode === "timed" ? selectedTime : 0);

    syncModeUI();

    resultScreen.style.display = "none";
    document.querySelector(".typing-box").style.display = "block";
    document.querySelector(".restart-wrapper").style.display = "block"; // Added

    loadText();
    textBox.focus();
  }

  /* ================= MODE SWITCH (DESKTOP) ================= */

  timeSelect?.addEventListener("change", () => {
    mode = "timed";
    selectedTime = parseInt(timeSelect.value);
    resetTest();
  });

  passageBtn?.addEventListener("click", () => {
    mode = "passage";
    resetTest();
  });

  diffButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      diffButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      difficulty = btn.dataset.diff;
      resetTest();
    });
  });

  /* ================= MOBILE DROPDOWN LOGIC (NEW) ================= */

  document.querySelectorAll(".custom-dropdown").forEach(dropdown => {
    const btn = dropdown.querySelector(".dropdown-btn");
    const list = dropdown.querySelector(".dropdown-list");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close other dropdowns first
      document.querySelectorAll(".dropdown-list").forEach(l => {
        if (l !== list) l.classList.remove("show");
      });
      list.classList.toggle("show");
    });

    list.querySelectorAll("li").forEach(item => {
      item.addEventListener("click", () => {
        const value = item.getAttribute("data-value");
        btn.innerHTML = `${item.innerText} <span class="arrow">▼</span>`;

        // Visual Selection
        list.querySelectorAll("li").forEach(li => li.classList.remove("selected"));
        item.classList.add("selected");

        // Logic Assignment
        if (dropdown.id === "timeDropdown") {
          mode = "timed";
          selectedTime = parseInt(value);
        } else if (dropdown.id === "modeDropdown") {
          mode = value; // "timed" or "passage"
        }

        list.classList.remove("show");
        resetTest();
      });
    });
  });

  // Close dropdowns when clicking outside
  window.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-list").forEach(l => l.classList.remove("show"));
  });

  /* ================= UI SYNC: ACTIVE CLASSES ================= */
  function syncModeUI() {
    // Desktop Logic
    if (mode === "passage") {
      passageBtn?.classList.add("active");
      timeSelect?.classList.remove("active-mode");
    } else {
      passageBtn?.classList.remove("active");
      timeSelect?.classList.add("active-mode");
    }

    // Mobile Dropdown Logic (Syncing the radio selection circles)
    document.querySelectorAll("#modeDropdown .dropdown-list li").forEach(li => {
      const isSelected = li.getAttribute("data-value") === mode ||
        (li.getAttribute("data-value") !== "passage" && mode === "timed");
      li.classList.toggle("selected", isSelected);
    });
  }

  /* ================= MODE SWITCH (DESKTOP) ================= */
  timeSelect?.addEventListener("change", () => {
    mode = "timed";
    selectedTime = parseInt(timeSelect.value);
    resetTest();
  });

  passageBtn?.addEventListener("click", () => {
    mode = "passage";
    resetTest();
  });

  /* ================= TYPING ================= */

  textBox.addEventListener("keydown", function (e) {
    if (e.key === " ") {
      e.preventDefault();
    }

    if (e.key.length > 1 && e.key !== "Backspace" && e.key !== " ") return;

    if (!started) {
      started = true;
      enableFocusMode();
      if (mode === "timed") startCountdown();
      else startCountUp();
    }

    const chars = textBox.querySelectorAll("span");

    if (e.key === "Backspace") {
      if (charIndex > 0) {
        charIndex--;
        chars[charIndex].classList.remove("correct", "incorrect");
        chars[charIndex].classList.add("active");
        updateCaret(chars);
      }
      return;
    }

    if (!chars[charIndex]) return;

    totalTyped++;
    playKeySound();

    if (e.key === chars[charIndex].innerText) {
      chars[charIndex].classList.add("correct");
      correct++;
    } else {
      chars[charIndex].classList.add("incorrect");
    }

    chars[charIndex].classList.remove("active");
    charIndex++;
    updateCaret(chars);

    if (chars[charIndex]) {
      chars[charIndex].classList.add("active");
    } else {
      showResult();
    }

    accEl.innerText = Math.round((correct / totalTyped) * 100) + "%";
  });

  /* ================= BUTTON LISTENERS ================= */

  retryBtn?.addEventListener("click", resetTest);
  restartMainBtn?.addEventListener("click", resetTest); // Added for restart button

  resetTest();

});