(function () {
    "use strict";

    const STORAGE_KEY = "typingwebsite_weak_keys_v1";
    const WORDS = (
        "letter little level people apple paper proper purple " +
        "practice progress prepare improve simple sample summer " +
        "system skill still skillful quick quiet quite question " +
        "write wrong world word work wonder window winner " +
        "friend fresh free freeze green great group grow " +
        "think three there their these those other another " +
        "speed space special success sentence accurate action " +
        "keyboard typing training reading learning running " +
        "jump enjoy just judge knowledge known kind key " +
        "happy help hello house mouse music number moment " +
        "focus finish fast first forest future flower follow"
    ).split(/\s+/);

    const LETTERS = "abcdefghijklmnopqrstuvwxyz";


    function calculateFingerBalance(text) {
        const leftHand = new Set("qwertasdfgzxcvb");
        const rightHand = new Set("yuiophjklnm");

        let leftCount = 0;
        let rightCount = 0;

        for (const char of String(text || "").toLowerCase()) {
            if (leftHand.has(char)) leftCount++;
            else if (rightHand.has(char)) rightCount++;
        }

        const total = leftCount + rightCount;

        if (!total) {
            return {
                left: 0,
                right: 0,
                score: 0,
                label: "Not enough typing data"
            };
        }

        const leftPercent = Math.round(leftCount / total * 100);
        const rightPercent = 100 - leftPercent;

        // 100 = perfectly balanced; 0 = all typing on one hand.
        const score = Math.round(
            100 - Math.abs(leftPercent - rightPercent)
        );

        return {
            left: leftPercent,
            right: rightPercent,
            score,
            label: score >= 80
                ? "Well balanced"
                : score >= 60
                    ? "Moderately balanced"
                    : "Uneven hand distribution"
        };
    }

    window.calculateFingerBalance = calculateFingerBalance;

    let stats = loadStats();
    let panel;
    let exercise = "";
    let exerciseStarted = false;

    function loadStats() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && saved.keys && typeof saved.keys === "object") {
                return saved;
            }
        } catch (_) { }

        return { keys: {}, sessions: 0 };
    }

    function saveStats() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        } catch (_) {
            // The trainer still works for this session if storage is unavailable.
        }
    }

    function validLetter(value) {
        return typeof value === "string" && value.length === 1 && value.trim() !== "";
    }

    // Call this from your existing typing engine.
    // Pass the same correctness result your test already calculates.
    function record(expected, actual, isCorrect) {
        if (!validLetter(expected) || !validLetter(actual)) return;

        const key = expected.toLowerCase();


        if (!stats.keys[key]) {
            stats.keys[key] = {
                attempts: 0,
                errors: 0,
                recent: []
            };
        }

        // Support existing saved data created by older versions.
        if (!Array.isArray(stats.keys[key].recent)) {
            stats.keys[key].recent = [];
        }


        stats.keys[key].attempts++;

        if (typeof isCorrect === "boolean") {
            if (!isCorrect) stats.keys[key].errors++;
        } else if (actual.toLowerCase() !== key) {
            stats.keys[key].errors++;
        }

        // ADD THIS NEW CODE HERE
        stats.keys[key].recent.push(
            typeof isCorrect === "boolean"
                ? isCorrect
                : actual.toLowerCase() === key
        );

        stats.keys[key].recent =
            stats.keys[key].recent.slice(-20);

        saveStats();
    }


    function getWeakKeys() {
        return Object.entries(stats.keys)
            .filter(([, value]) => value.attempts >= 2)
            .map(([key, value]) => {
                const recent = Array.isArray(value.recent)
                    ? value.recent
                    : [];

                const recentAttempts = recent.length;
                const recentCorrect = recent.filter(Boolean).length;

                return {
                    key,
                    attempts: value.attempts,
                    errors: value.errors,
                    accuracy: 1 - value.errors / value.attempts,
                    recentAttempts,
                    recentAccuracy: recentAttempts
                        ? recentCorrect / recentAttempts
                        : null
                };
            })
            .sort((a, b) =>
                a.accuracy - b.accuracy ||
                b.attempts - a.attempts
            );
    }


    function makeExercise() {
        const weak = getWeakKeys()
            .slice(0, 5)
            .map(item => item.key.toLowerCase());

        // No recorded weak keys: keep the existing beginner-friendly exercise.
        if (!weak.length) {
            return {
                text: "the quick brown fox jumps over the lazy dog",
                weak: []
            };
        }

        const matching = WORDS.filter(word =>
            [...word.toLowerCase()].some(letter => weak.includes(letter))
        );

        const normal = WORDS.filter(word =>
            ![...word.toLowerCase()].some(letter => weak.includes(letter))
        );

        const selected = [];
        const used = new Set();

        function pickWord(pool) {
            const available = pool.filter(word => !used.has(word));

            if (!available.length) return null;

            const word = available[
                Math.floor(Math.random() * available.length)
            ];

            used.add(word);
            return word;
        }

        // 60% weak-key words, 40% normal words.
        for (let i = 0; i < 30; i++) {
            const preferWeak = Math.random() < 0.6;
            let word = preferWeak
                ? pickWord(matching)
                : pickWord(normal);

            // Fall back when one pool runs out.
            if (!word) {
                word = pickWord(preferWeak ? normal : matching);
            }

            // If both pools are exhausted, allow a repeated word.
            if (!word) {
                const pool = preferWeak ? matching : normal;
                const fallback = pool.length ? pool : WORDS;
                word = fallback[Math.floor(Math.random() * fallback.length)];
            }

            selected.push(word);
        }

        return {
            text: selected.join(" "),
            weak
        };
    }

    function addStyles() {
        if (document.getElementById("wkt-styles")) return;

        const style = document.createElement("style");
        style.id = "wkt-styles";
        style.textContent = `
      
#wkt-launch {
  position: fixed;
  right: 18px;
  bottom: 24px;
  z-index: 9990;
  border: 1px solid #c9922e;
  border-radius: 10px;
  padding: 12px 16px;
  background: #171719;
  color: #f4c86a;
  font: 600 14px/1.3 system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 18px #0003;
  transition: bottom 180ms ease, background 180ms ease,
    box-shadow 180ms ease;
}

#wkt-launch:hover {
  background: #262326;
  box-shadow: 0 6px 22px #0005;
}

/* Lift the launcher when the footer enters the viewport. */
#wkt-launch.wkt-above-footer {
  bottom: var(--wkt-footer-offset, 120px);
}


.wkt-finger-balance {
    margin: 14px 0;
    padding: 14px 16px;
    border: 1px solid rgba(201, 146, 46, 0.25);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.025);
}

.wkt-finger-balance-heading,
.wkt-finger-balance-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.wkt-finger-balance-heading strong {
    color: #f3f3f3;
    font-size: 14px;
}

.wkt-finger-balance-heading > span {
    color: #c9922e;
    font-weight: 700;
}

.wkt-finger-balance-bar {
    display: flex;
    height: 8px;
    margin: 12px 0 8px;
    overflow: hidden;
    border-radius: 99px;
    background: #29292d;
}

.wkt-finger-balance-bar span:first-child {
    background: #c9922e;
}

.wkt-finger-balance-bar span:last-child {
    background: #579b87;
}

.wkt-finger-balance-details {
    color: #b9b9bd;
    font-size: 12px;
}

.wkt-finger-balance small {
    display: block;
    margin-top: 9px;
    color: #929298;
    font-size: 12px;
}

@media (max-width: 480px) {
  #wkt-launch {
    right: 12px;
    bottom: 14px;
    padding: 11px 13px;
  }

  #wkt-launch.wkt-above-footer {
    bottom: var(--wkt-footer-offset, 110px);
  }
}
      #wkt-launch:hover { background: #262326; }
      #wkt-overlay {
        position: fixed;
        inset: 0;
        z-index: 9991;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: #000b;
      }
      #wkt-overlay.wkt-open { display: flex; }
      #wkt-panel {
        width: min(560px, 100%);
        max-height: 90vh;
        overflow: auto;
        box-sizing: border-box;
        padding: 22px;
        border: 1px solid #343438;
        border-radius: 16px;
        background: #111113;
        color: #f2f2f2;
        font: 14px/1.6 system-ui, sans-serif;
        box-shadow: 0 20px 70px #0008;
      }
      #wkt-panel * { box-sizing: border-box; }
      #wkt-panel button, #wkt-panel input { font: inherit; }
      .wkt-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .wkt-head h2 { margin: 0; font-size: 21px; }
      .wkt-muted { color: #aaaab3; font-size: 13px; }
      .wkt-close {
        border: 0; background: transparent; color: #ddd;
        font-size: 24px; cursor: pointer;
      }
      .wkt-keys {
        display: flex; flex-wrap: wrap; gap: 8px;
        margin: 16px 0;
      }
      .wkt-key {
        min-width: 60px; padding: 8px;
        border: 1px solid #414148; border-radius: 8px;
        background: #202024; text-align: center;
      }

      
      .wkt-keyboard-map {
        margin-top: 18px;
      }

      .wkt-keyboard-map h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }

      .wkt-map-row {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 5px;
        margin: 5px 0;
      }

      .wkt-map-key {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 29px;
        height: 34px;
        padding: 0 6px;
        border: 1px solid #414148;
        border-radius: 6px;
        background: #252529;
        color: #e5e5e7;
        font: 600 12px/1 system-ui, sans-serif;
      }

      .wkt-map-key.wkt-level-neutral {
        background: #252529;
        border-color: #414148;
      }

      .wkt-map-key.wkt-level-good {
        background: #173b2c;
        border-color: #347a52;
        color: #a8efc1;
      }

      .wkt-map-key.wkt-level-medium {
        background: #493719;
        border-color: #a87928;
        color: #ffdb91;
      }

      .wkt-map-key.wkt-level-weak {
        background: #4a2225;
        border-color: #b94a52;
        color: #ffb6bb;
      }

      .wkt-map-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
        color: #b8b8c0;
        font-size: 11px;
      }

      .wkt-map-legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .wkt-map-dot {
        width: 9px;
        height: 9px;
        border-radius: 3px;
        display: inline-block;
      }

      .wkt-recovery-insights {
    margin: 14px 0;
    padding: 14px 16px;
    border: 1px solid rgba(201, 146, 46, 0.28);
    border-radius: 12px;
    background: rgba(201, 146, 46, 0.07);
}

.wkt-recovery-insights strong {
    display: block;
    margin-bottom: 6px;
    color: #c9922e;
    font-size: 14px;
}

.wkt-recovery-insights p {
    margin: 6px 0;
    color: #f3f3f3;
}

.wkt-recovery-insights small {
    color: #a5a5a8;
    font-size: 12px;
    line-height: 1.5;
}

.wkt-recovery-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 7px;
    border-radius: 7px;
    background: rgba(46, 160, 90, 0.18);
    border: 1px solid rgba(46, 160, 90, 0.45);
    color: #75dfa0;
    font-weight: 700;
}

      @media (max-width: 480px) {
        .wkt-map-row {
          gap: 4px;
        }

        .wkt-map-key {
          min-width: 25px;
          height: 31px;
          padding: 0 4px;
        }
      }
      .wkt-key strong { display: block; color: #f4c86a; font-size: 18px; }
      .wkt-key small { color: #b8b8c0; }
      #wkt-passage {
        margin: 14px 0; padding: 14px;
        border: 1px solid #35353b; border-radius: 10px;
        background: #19191d; overflow-wrap: anywhere;
        letter-spacing: .25px;
      }
      #wkt-input {
        width: 100%; min-height: 48px; padding: 12px;
        border: 1px solid #555560; border-radius: 9px;
        background: #09090b; color: #fff; outline: none;
      }
      #wkt-input:focus { border-color: #c9922e; }
      .wkt-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 12px; }
      .wkt-action {
        padding: 9px 13px; border: 1px solid #414148;
        border-radius: 8px; background: #242428; color: #f5f5f5;
        cursor: pointer;
      }
      .wkt-action-primary {
        background: #c9922e; color: #16120a;
        border-color: #c9922e; font-weight: 700;
      }
      #wkt-feedback { min-height: 24px; margin-top: 8px; color: #f4c86a; }
      #wkt-progress { color: #aaaab3; font-size: 12px; margin-top: 6px; }
      @media (max-width: 480px) {
        #wkt-launch { right: 10px; bottom: 10px; }
        #wkt-panel { padding: 16px; }
      }
    `;
        document.head.appendChild(style);
    }

    function createPanel() {
        if (panel) return;

        addStyles();

        const launch = document.createElement("button");
        launch.id = "wkt-launch";
        launch.type = "button";
        launch.textContent = "⌨ Improve My Typing";
        launch.title = "Find and practise your weakest keys";
        launch.setAttribute("aria-label", "Open Weak-Key Trainer");
        launch.setAttribute("aria-haspopup", "dialog");
        launch.addEventListener("click", open);
        document.body.appendChild(launch);

        // Keep the floating launcher clear of the site footer.
        const siteFooter = document.querySelector(".site-footer");

        if (siteFooter && "IntersectionObserver" in window) {
            const footerObserver = new IntersectionObserver((entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    const footerHeight = Math.ceil(entry.boundingClientRect.height);
                    const offset = Math.min(footerHeight + 24, window.innerHeight * 0.65);

                    launch.style.setProperty("--wkt-footer-offset", `${offset}px`);
                    launch.classList.add("wkt-above-footer");
                } else {
                    launch.classList.remove("wkt-above-footer");
                }
            });

            footerObserver.observe(siteFooter);
        }

        const overlay = document.createElement("div");
        overlay.id = "wkt-overlay";
        overlay.innerHTML = `
      <section id="wkt-panel" role="dialog"
        aria-modal="true" aria-labelledby="wkt-title">
        <div class="wkt-head">
          <h2 id="wkt-title">Weak-Key Trainer</h2>
          <button type="button" class="wkt-close"
            id="wkt-close" aria-label="Close trainer">×</button>
        </div>
        <p class="wkt-muted">
          Practice the letters you mistype most. Your key statistics
          are saved in this browser.
        </p>
        <div id="wkt-summary"></div>
        <div id="wkt-passage"></div>
        <input id="wkt-input" type="text" autocomplete="off"
          autocapitalize="off" spellcheck="false"
          placeholder="Type the passage above…" aria-label="Type the practice passage">
        <div id="wkt-progress">0 characters typed</div>
        <div id="wkt-feedback" aria-live="polite"></div>
        <div class="wkt-actions">
          <button class="wkt-action wkt-action-primary"
            id="wkt-new" type="button">New exercise</button>
          <button class="wkt-action" id="wkt-reset"
            type="button">Reset key data</button>
        </div>
        <p class="wkt-muted">
          Key data is stored locally and is not sent to a server.
        </p>
      </section>
    `;

        document.body.appendChild(overlay);
        panel = overlay;

        document.getElementById("wkt-close").addEventListener("click", close);
        document.getElementById("wkt-new").addEventListener("click", newExercise);
        document.getElementById("wkt-reset").addEventListener("click", resetStats);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) close();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && panel.classList.contains("wkt-open")) {
                close();
            }
        });

        document.getElementById("wkt-input").addEventListener("input", onPracticeInput);
    }


    function renderSummary() {
        const fingerBalance = calculateFingerBalance(exercise);
        const summary = document.getElementById("wkt-summary");
        if (!summary) return;

        const weak = getWeakKeys().slice(0, 5);

        const rows = [
            ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
            ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
            ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
            ["z", "x", "c", "v", "b", "n", "m"],
            ["-", "=", "[", "]", "\\", ";", "'", ",", ".", "/"]
        ];



        function renderMapKey(key) {
            const stat = stats.keys[key.toLowerCase()];
            let level = "neutral";
            let title = "Not enough attempts recorded";
            let trendHtml = "";

            if (stat && stat.attempts >= 2) {
                const errorRate = stat.errors / stat.attempts;
                const recent = Array.isArray(stat.recent)
                    ? stat.recent
                    : [];

                const recentAccuracy = recent.length
                    ? recent.filter(Boolean).length / recent.length
                    : null;

                const recentHalf = recent.slice(-10);
                const previousHalf = recent.slice(-20, -10);

                const recentHalfAccuracy = recentHalf.length
                    ? recentHalf.filter(Boolean).length / recentHalf.length
                    : null;

                const previousHalfAccuracy = previousHalf.length
                    ? previousHalf.filter(Boolean).length / previousHalf.length
                    : null;

                if (
                    recentHalf.length >= 5 &&
                    previousHalf.length >= 5
                ) {
                    const difference =
                        recentHalfAccuracy - previousHalfAccuracy;

                    if (difference >= 0.1) {
                        trendHtml = " ↑ Improving";
                    } else if (difference <= -0.1) {
                        trendHtml = " ↓ Needs practice";
                    } else {
                        trendHtml = " → Stable";
                    }
                }

                if (recent.length >= 10 && recentAccuracy >= 0.95) {
                    level = "good";
                    title = "Recovering: at least 95% recent accuracy";
                } else if (errorRate >= 0.4) {
                    level = "weak";
                    title = `${stat.errors} errors in ${stat.attempts} attempts`;
                } else if (errorRate >= 0.2) {
                    level = "medium";
                    title = `${stat.errors} errors in ${stat.attempts} attempts`;
                } else if (errorRate === 0) {
                    level = "good";
                    title = `${stat.attempts} attempts with no errors`;
                } else {
                    level = "medium";
                    title = `${stat.errors} errors in ${stat.attempts} attempts`;
                }

                title += trendHtml ? ` | Trend:${trendHtml}` : "";
            }

            return `
        <span
            class="wkt-map-key wkt-level-${level}"
            title="${title}"
            aria-label="${key} key"
        >${key}</span>
    `;
        }

        const recoveryKeys = getWeakKeys().filter(key =>
            key.recentAttempts >= 10 &&
            key.recentAccuracy !== null &&
            key.recentAccuracy >= 0.95
        );

        const recoveryInsights = recoveryKeys.length
            ? `
        <div class="wkt-recovery-insights">
            <strong>Keys recovering</strong>
            <p>
                ${recoveryKeys.map(item =>
                `<span class="wkt-recovery-key">${item.key.toUpperCase()}</span>`
            ).join(" ")}
            </p>
            <small>At least 95% accuracy across the last 10 recorded attempts.</small>
        </div>
    `
            : `
        <div class="wkt-recovery-insights">
            <strong>Recovery progress</strong>
            <p>Keep practicing to identify the keys you're improving.</p>
            <small>Keys appear here after 10 recent attempts at 95% accuracy or higher.</small>
        </div>
    `;

        const keyboardMap = `
        <div class="wkt-keyboard-map">
            <h3>Keyboard Weakness Map</h3>

            ${rows.map(row => `
                <div class="wkt-map-row">
                    ${row.map(renderMapKey).join("")}
                </div>
            `).join("")}

            <div class="wkt-map-legend">
                <span>
                    <i class="wkt-map-dot" style="background:#b94a52"></i>
                    Frequent errors
                </span>
                <span>
                    <i class="wkt-map-dot" style="background:#a87928"></i>
                    Some errors
                </span>
                <span>
                    <i class="wkt-map-dot" style="background:#347a52"></i>
                    No errors recorded
                </span>
                <span>
                    <i class="wkt-map-dot" style="background:#414148"></i>
                    Not enough data
                </span>
            </div>
        </div>
    `;

        const weakSummary = weak.length
            ? `
            <p><strong>Your focus keys</strong></p>
            <div class="wkt-keys">
                ${weak.map(item => `
                    <div class="wkt-key">
                        <strong>${item.key.toUpperCase()}</strong>
                        <small>${Math.round(item.accuracy * 100)}% accuracy</small>
                        <small>${item.errors} errors / ${item.attempts} tries</small>
                    </div>
                `).join("")}
            </div>
        `
            : `
            <p class="wkt-muted">
                Your keyboard map will become more useful as you
                complete typing tests and the trainer records key attempts.
            </p>
        `;


        const fingerBalanceHtml = `
    <div class="wkt-finger-balance">
        <div class="wkt-finger-balance-heading">
            <strong>Finger Balance</strong>
            <span>${fingerBalance.score}/100</span>
        </div>

        <div class="wkt-finger-balance-bar">
            <span style="width: ${fingerBalance.left}%"></span>
            <span style="width: ${fingerBalance.right}%"></span>
        </div>

        <div class="wkt-finger-balance-details">
            <span>Left hand ${fingerBalance.left}%</span>
            <span>Right hand ${fingerBalance.right}%</span>
        </div>

        <small>${fingerBalance.label}</small>
    </div>
`;

        summary.innerHTML =
            weakSummary + recoveryInsights + fingerBalanceHtml + keyboardMap;
    }

    function newExercise() {
        const result = makeExercise();
        exercise = result.text;
        exerciseStarted = false;

        document.getElementById("wkt-passage").textContent = exercise;
        document.getElementById("wkt-input").value = "";
        document.getElementById("wkt-input").disabled = false;
        document.getElementById("wkt-progress").textContent = "0 characters typed";
        document.getElementById("wkt-feedback").textContent = result.weak.length
            ? "Focus keys: " + result.weak.join(", ").toUpperCase()
            : "Complete a regular test first to discover your weak keys.";

        renderSummary();
    }

    function onPracticeInput(event) {
        const input = event.target;
        const typed = input.value;

        if (!exerciseStarted && typed.length) {
            exerciseStarted = true;
            stats.sessions++;
            saveStats();
        }

        // Only record newly entered characters; don't count the same
        // prefix again on every input event.
        const previousLength = Number(input.dataset.previousLength || 0);

        if (typed.length > previousLength) {
            for (let i = previousLength; i < typed.length; i++) {
                if (i < exercise.length && validLetter(exercise[i]) && validLetter(typed[i])) {
                    record(exercise[i], typed[i], exercise[i].toLowerCase() === typed[i].toLowerCase());
                }
            }
        }

        input.dataset.previousLength = String(typed.length);

        const correct = [...typed].reduce((total, char, index) => {
            return total + (index < exercise.length && char.toLowerCase() === exercise[index].toLowerCase() ? 1 : 0);
        }, 0);

        document.getElementById("wkt-progress").textContent =
            `${typed.length} / ${exercise.length} characters · ${correct} correct`;

        if (typed.length >= exercise.length) {
            input.disabled = true;
            document.getElementById("wkt-feedback").textContent = "Exercise complete! Select New exercise to continue.";
            renderSummary();
        }
    }

    function open() {
        createPanel();
        panel.classList.add("wkt-open");
        newExercise();
        document.getElementById("wkt-input").focus();
    }

    function close() {
        if (panel) panel.classList.remove("wkt-open");
    }

    function resetStats() {
        if (!window.confirm("Reset all saved weak-key statistics in this browser?")) {
            return;
        }

        stats = { keys: {}, sessions: 0 };
        saveStats();
        newExercise();
    }

    // Public API for the existing typing test.
    window.WeakKeyTrainer = {
        record,
        getWeakKeys,
        open,
        close,
        reset: resetStats,
    };

    // Add the launcher only after the document is ready.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createPanel, { once: true });
    } else {
        createPanel();
    }
})();
