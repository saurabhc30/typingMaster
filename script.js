document.addEventListener("DOMContentLoaded", function () {

  const textBox = document.getElementById("text");
  const retryBtn = document.getElementById("retryBtn");
  const restartMainBtn = document.getElementById("restartMainBtn");
  const resultScreen = document.getElementById("resultScreen");
  const typingBox = document.querySelector(".typing-box");

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

    clone.play().catch(() => {
      // Ignore browser autoplay/audio restrictions
    });
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
    if (typeof passages === "undefined") {
      console.error("passages is not defined.");
      return;
    }

    const list = passages[difficulty];

    if (!list || list.length === 0) {
      console.error("No passages found for difficulty:", difficulty);
      return;
    }

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

    // Always start passage from the top
    textBox.scrollTop = 0;
  }


  /* ================= FOCUS MODE ================= */

  function enableFocusMode() {

    focusEnabled = true;

    /*
      IMPORTANT:
      Difficulty and Mode must remain visible while typing.

      Previously this code added:
      hide-during-typing

      which made the controls invisible.

      We intentionally do NOT hide the controls now.
    */

    document.body.classList.add("typing-active");
  }


  function disableFocusMode() {

    focusEnabled = false;

    clearTimeout(mouseTimer);

    // Make absolutely sure controls remain visible
    modePanel?.classList.remove("hide-during-typing");

    document.body.classList.remove("typing-active");
  }

  /* ================= PERSONAL BEST ================= */

  const PERSONAL_BEST_KEY = "typing_personal_best";

  function loadPersonalBest() {
    const best = parseInt(localStorage.getItem(PERSONAL_BEST_KEY)) || 25;
    document.getElementById("personalBest").innerText = `${best} WPM`;
  }

  function savePersonalBest(currentWPM) {
    const best = parseInt(localStorage.getItem(PERSONAL_BEST_KEY)) || 25;

    if (currentWPM > best) {
      localStorage.setItem(PERSONAL_BEST_KEY, currentWPM);
      document.getElementById("personalBest").innerText = `${currentWPM} WPM`;
    } else {
      document.getElementById("personalBest").innerText = `${best} WPM`;
    }
  }


  /* ================= MOUSE MOVE ================= */

  /*
    Controls are intentionally NOT hidden when the mouse moves.

    This section used to hide Difficulty + Mode after 2 seconds.
    It has been removed so the controls stay visible during typing.
  */


  /* ================= CARET ================= */

  function updateCaret(chars) {

    chars.forEach(c => {
      c.classList.remove("active");
    });

    if (chars[charIndex]) {
      chars[charIndex].classList.add("active");
    }
  }


  /* ================= AUTO SCROLL ================= */

  /* =========================================================
   SMOOTH TYPING SCROLL
========================================================= */

  let lastScrollLine = -1;
  let scrollLocked = false;
  /* ================= AUTO SCROLL ================= */


  function scrollActiveCharIntoView(isBackspace = false) {

    if (!typingBox) return;

    const chars =
      textBox.querySelectorAll("span");

    const activeChar =
      chars[charIndex];

    if (!activeChar) return;


    const boxRect =
      typingBox.getBoundingClientRect();

    const charRect =
      activeChar.getBoundingClientRect();


    /*
       Position of character inside the visible
       typing box.
    */

    const top =
      charRect.top - boxRect.top;

    const bottom =
      charRect.bottom - boxRect.top;


    /*
       Visible area.

       We don't scroll immediately when a character
       is typed. We wait until the LINE actually
       reaches the lower area.
    */

    const topLimit = 35;

    const bottomLimit =
      typingBox.clientHeight - 45;


    /* ================= BACKSPACE ================= */

    if (isBackspace) {

      if (top < topLimit) {

        typingBox.scrollBy({
          top: top - topLimit - 20,
          behavior: "smooth"
        });
      }

      return;
    }


    /* ================= NORMAL TYPING ================= */

    /*
       Character is comfortably visible.
       Do nothing.
    */

    if (
      top >= topLimit &&
      bottom <= bottomLimit
    ) {
      return;
    }


    /*
       Only scroll when character is below the
       visible typing area.
    */

    if (bottom > bottomLimit) {

      const amount =
        bottom -
        bottomLimit +
        20;

      typingBox.scrollBy({
        top: amount,
        behavior: "smooth"
      });

      return;
    }


    /*
       Scroll upward only when necessary.
    */

    if (top < topLimit) {

      const amount =
        top -
        topLimit -
        20;

      typingBox.scrollBy({
        top: amount,
        behavior: "smooth"
      });
    }
  }


  /* ================= SMOOTH SCROLL ================= */

  function smoothScrollTo(target) {

    if (!typingBox) return;

    const start = typingBox.scrollTop;
    const distance = target - start;

    /*
       Don't animate tiny movements.
    */

    if (Math.abs(distance) < 2) {
      typingBox.scrollTop = target;
      return;
    }

    const duration = 220;
    const startTime = performance.now();

    function animate(currentTime) {

      const elapsed = currentTime - startTime;

      const progress =
        Math.min(elapsed / duration, 1);

      /*
         Ease-out movement.
         Starts smoothly and slows down near the end.
      */

      const eased =
        1 - Math.pow(1 - progress, 3);

      typingBox.scrollTop =
        start + distance * eased;

      if (progress < 1) {

        requestAnimationFrame(animate);

      } else {

        typingBox.scrollTop = target;
        scrollLocked = false;
      }
    }

    if (!scrollLocked) {

      scrollLocked = true;

      requestAnimationFrame(animate);
    }
  }


  function animateTypingScroll() {

    if (scrollAnimationFrame !== null) {
      cancelAnimationFrame(scrollAnimationFrame);
    }

    const start = textBox.scrollTop;
    const target = scrollTarget;

    if (target === null) {
      return;
    }

    const distance = target - start;

    if (Math.abs(distance) < 1) {
      textBox.scrollTop = target;
      scrollTarget = null;
      scrollAnimationFrame = null;
      return;
    }

    const duration = 180;
    const startTime = performance.now();

    function step(currentTime) {

      const elapsed =
        currentTime - startTime;

      const progress =
        Math.min(elapsed / duration, 1);

      /*
         Smooth ease-out.
      */

      const eased =
        1 - Math.pow(1 - progress, 3);

      textBox.scrollTop =
        start + distance * eased;

      if (progress < 1) {

        scrollAnimationFrame =
          requestAnimationFrame(step);

      } else {

        textBox.scrollTop = target;

        scrollAnimationFrame = null;
        scrollTarget = null;
      }
    }

    scrollAnimationFrame =
      requestAnimationFrame(step);
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

    timeEl.innerText =
      min + ":" + (sec < 10 ? "0" + sec : sec);
  }


  /* ================= SHOW RESULT ================= */

  function showResult() {

    clearInterval(timer);

    disableFocusMode();

    started = false;


    let minutes =
      (mode === "timed")
        ? (selectedTime - timeLeft) / 60
        : elapsedSeconds / 60;


    if (minutes <= 0) {
      minutes = 1 / 60;
    }


    const wpm =
      Math.round((correct / 5) / minutes);

    savePersonalBest(wpm);

    const accuracy =
      Math.round((correct / totalTyped) * 100) || 0;


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


    updateTimeDisplay(
      mode === "timed"
        ? selectedTime
        : 0
    );


    syncModeUI();


    resultScreen.style.display = "none";

    document.querySelector(".typing-box").style.display = "block";

    document.querySelector(".restart-wrapper").style.display = "block";


    loadText();


    // Reset passage scroll position
    textBox.scrollTop = 0;

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


  /* ================= DIFFICULTY ================= */

  diffButtons.forEach(btn => {

    btn.addEventListener("click", () => {

      diffButtons.forEach(b => {
        b.classList.remove("active");
      });


      btn.classList.add("active");


      difficulty = btn.dataset.diff;


      resetTest();

    });

  });


  /* ================= MOBILE DROPDOWN LOGIC ================= */

  document
    .querySelectorAll(".custom-dropdown")
    .forEach(dropdown => {

      const btn =
        dropdown.querySelector(".dropdown-btn");

      const list =
        dropdown.querySelector(".dropdown-list");


      if (!btn || !list) {
        return;
      }


      btn.addEventListener("click", (e) => {

        e.stopPropagation();


        // Close other dropdowns
        document
          .querySelectorAll(".dropdown-list")
          .forEach(l => {

            if (l !== list) {
              l.classList.remove("show");
            }

          });


        list.classList.toggle("show");

      });


      list
        .querySelectorAll("li")
        .forEach(item => {

          item.addEventListener("click", () => {

            const value =
              item.getAttribute("data-value");


            btn.innerHTML =
              `${item.innerText} <span class="arrow">▼</span>`;


            // Visual selection
            list
              .querySelectorAll("li")
              .forEach(li => {
                li.classList.remove("selected");
              });


            item.classList.add("selected");


            // Logic assignment
            if (dropdown.id === "timeDropdown") {

              mode = "timed";

              selectedTime = parseInt(value);

            }

            else if (dropdown.id === "modeDropdown") {

              /*
                Mode dropdown values:
                timed / passage
              */

              if (value === "passage") {

                mode = "passage";

              }

              else {

                mode = "timed";

              }

            }


            list.classList.remove("show");

            resetTest();

          });

        });

    });


  /* ================= CLOSE DROPDOWNS ================= */

  window.addEventListener("click", () => {

    document
      .querySelectorAll(".dropdown-list")
      .forEach(l => {
        l.classList.remove("show");
      });

  });


  /* ================= UI SYNC ================= */

  function syncModeUI() {

    // Desktop Logic

    if (mode === "passage") {

      passageBtn?.classList.add("active");

      timeSelect?.classList.remove("active-mode");

    }

    else {

      passageBtn?.classList.remove("active");

      timeSelect?.classList.add("active-mode");

    }


    // Mobile Mode Dropdown

    document
      .querySelectorAll("#modeDropdown .dropdown-list li")
      .forEach(li => {

        const value =
          li.getAttribute("data-value");


        let isSelected = false;


        if (mode === "passage") {

          isSelected =
            value === "passage";

        }

        else {

          // Any timed option represents timed mode
          isSelected =
            value !== "passage";

        }


        li.classList.toggle(
          "selected",
          isSelected
        );

      });


    // Update mobile mode button text

    const modeDropdown =
      document.getElementById("modeDropdown");


    if (modeDropdown) {

      const modeButton =
        modeDropdown.querySelector(".dropdown-btn");


      if (modeButton) {

        if (mode === "passage") {

          modeButton.innerHTML =
            `Passage <span class="arrow">▼</span>`;

        }

        else {

          modeButton.innerHTML =
            `Timed <span class="arrow">▼</span>`;

        }

      }

    }


    // Update mobile time dropdown selection

    const timeDropdown =
      document.getElementById("timeDropdown");


    if (timeDropdown) {

      const timeButton =
        timeDropdown.querySelector(".dropdown-btn");


      const timeList =
        timeDropdown.querySelector(".dropdown-list");


      if (timeButton && timeList) {

        let timeText = "Timed (60s)";


        if (selectedTime === 180) {
          timeText = "Timed (3m)";
        }

        else if (selectedTime === 300) {
          timeText = "Timed (5m)";
        }


        timeButton.innerHTML =
          `${timeText} <span class="arrow">▼</span>`;


        timeList
          .querySelectorAll("li")
          .forEach(li => {

            const value =
              parseInt(
                li.getAttribute("data-value")
              );


            li.classList.toggle(
              "selected",
              value === selectedTime
            );

          });

      }

    }

  }


  /* ================= TYPING ================= */

  /* ================= TYPING ================= */

  textBox.addEventListener("keydown", function (e) {

    /* ================= SPACE ================= */

    if (e.key === " ") {
      e.preventDefault();
    }


    /* ================= IGNORE SPECIAL KEYS ================= */

    if (
      e.key.length > 1 &&
      e.key !== "Backspace" &&
      e.key !== " "
    ) {
      return;
    }


    /* ================= START TEST ================= */

    if (!started) {

      started = true;

      enableFocusMode();

      if (mode === "timed") {
        startCountdown();
      } else {
        startCountUp();
      }
    }


    const chars =
      textBox.querySelectorAll("span");


    /* =====================================================
       BACKSPACE

       THIS IS BASED ON YOUR ORIGINAL WORKING LOGIC
    ===================================================== */

    if (e.key === "Backspace") {

      if (charIndex > 0) {

        charIndex--;

        /*
           Remove BOTH correct and incorrect.

           This means if the previous character was
           typed incorrectly and is RED, Backspace
           removes the red color.
        */

        chars[charIndex].classList.remove(
          "correct",
          "incorrect"
        );

        /*
           Move caret back to this character.
        */

        chars[charIndex].classList.add("active");

        updateCaret(chars);

        /*
           Scroll only if the previous line has moved
           outside the visible area.
        */

        requestAnimationFrame(() => {
          scrollActiveCharIntoView(true);
        });
      }

      return;
    }



    /* ================= NO MORE CHARACTERS ================= */

    if (!chars[charIndex]) {
      // Passage completed
      if (chars.length > 0) {
        chars[chars.length - 1].classList.add("active");
      }

      // Show result after the final character is processed
      setTimeout(() => {
        showResult();
      }, 150);

      return;
    }


    /* ================= COUNT TYPED ================= */

    totalTyped++;

    playKeySound();


    /* ================= CHECK CHARACTER ================= */

    if (
      e.key === chars[charIndex].innerText
    ) {

      chars[charIndex]
        .classList
        .add("correct");

      correct++;

    } else {

      chars[charIndex]
        .classList
        .add("incorrect");
    }


    /* ================= MOVE CARET ================= */

    chars[charIndex]
      .classList
      .remove("active");

    charIndex++;

    updateCaret(chars);


    /* ================= AUTO SCROLL ================= */

    if (chars[charIndex]) {

      chars[charIndex]
        .classList
        .add("active");

      requestAnimationFrame(() => {
        scrollActiveCharIntoView(false);
      });

    } else {

      if (chars.length > 0) {

        chars[chars.length - 1]
          .classList
          .add("active");
      }
      showResult();
    }


    /* ================= ACCURACY ================= */

    accEl.innerText =
      Math.round(
        (correct / totalTyped) * 100
      ) + "%";

  });

  /* ================= BUTTON LISTENERS ================= */

  retryBtn?.addEventListener(
    "click",
    resetTest
  );


  restartMainBtn?.addEventListener(
    "click",
    resetTest
  );


  /* ================= INITIALIZE ================= */

  loadPersonalBest();
  resetTest();

});