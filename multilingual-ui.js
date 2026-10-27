/* Monkeytype-inspired language picker with live passage switching.
   Runs after passages.js and before script.js; does not replace the typing engine. */
(function () {
  "use strict";
  const data = window.TypingWebsiteLanguageData;
  if (!data) return;

  const STORAGE_KEY = "typingwebsite_practice_language_v1";
  const trigger = document.getElementById("twLanguageTrigger");
  const menu = document.getElementById("twLanguageMenu");
  const search = document.getElementById("twLanguageSearch");
  const options = document.getElementById("twLanguageOptions");
  const currentLabel = document.getElementById("twCurrentLanguageLabel");
  if (!trigger || !menu || !search || !options || !currentLabel) return;

  const languageByCode = new Map(data.languages.map(language => [language.code, language]));
  let selected = "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (languageByCode.has(saved)) selected = saved;
  } catch (_) {}

  // passages.js is loaded immediately before this file. Preserve its English corpus,
  // then replace the difficulty lists with the selected language's real sample text.
  let passageSource = null;
  let originalPassages = null;
  let originalAdaptivePassages = null;
  try {
    if (typeof passages !== "undefined" && passages && typeof passages === "object") {
      passageSource = passages;
      originalPassages = {
        easy: Array.isArray(passages.easy) ? passages.easy.slice() : [],
        medium: Array.isArray(passages.medium) ? passages.medium.slice() : [],
        hard: Array.isArray(passages.hard) ? passages.hard.slice() : []
      };
    } else if (window.passages && typeof window.passages === "object") {
      passageSource = window.passages;
      originalPassages = {
        easy: Array.isArray(passageSource.easy) ? passageSource.easy.slice() : [],
        medium: Array.isArray(passageSource.medium) ? passageSource.medium.slice() : [],
        hard: Array.isArray(passageSource.hard) ? passageSource.hard.slice() : []
      };
    }
    if (window.adaptivePassages && typeof window.adaptivePassages === "object") {
      originalAdaptivePassages = {
        easy: Array.isArray(window.adaptivePassages.easy) ? window.adaptivePassages.easy.slice() : [],
        medium: Array.isArray(window.adaptivePassages.medium) ? window.adaptivePassages.medium.slice() : [],
        hard: Array.isArray(window.adaptivePassages.hard) ? window.adaptivePassages.hard.slice() : []
      };
    }
  } catch (_) {}

  function setOpen(open) {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      search.value = "";
      renderOptions("");
      requestAnimationFrame(() => search.focus());
    }
  }

  function renderOptions(query) {
    const q = String(query || "").trim().toLocaleLowerCase();
    options.replaceChildren();
    data.languages
      .filter(language => [language.name, language.native, language.code].some(value =>
        value.toLocaleLowerCase().includes(q)))
      .forEach(language => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tw-language-option";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(language.code === selected));
        button.innerHTML = '<span class="tw-language-native"></span><span class="tw-language-english"></span>';
        button.querySelector(".tw-language-native").textContent = language.native;
        button.querySelector(".tw-language-english").textContent = language.name;
        button.addEventListener("click", () => chooseLanguage(language.code));
        options.appendChild(button);
      });
    if (!options.children.length) {
      const empty = document.createElement("div");
      empty.className = "tw-language-hint";
      empty.textContent = "No matching languages.";
      options.appendChild(empty);
    }
  }

  function applyPassageLanguage(code) {
    if (!passageSource || !originalPassages) return;
    if (code === "en") {
      ["easy", "medium", "hard"].forEach(level => {
        passageSource[level] = originalPassages[level].slice();
      });
      if (window.adaptivePassages && originalAdaptivePassages) {
        ["easy", "medium", "hard"].forEach(level => {
          window.adaptivePassages[level] = originalAdaptivePassages[level].slice();
        });
      }
      return;
    }

    const languagePassages = data.passages && data.passages[code];
    if (!languagePassages) return;
    ["easy", "medium", "hard"].forEach(level => {
      const levelPassages = languagePassages[level];
      // Keep levels distinct; fall back to the site's existing list if a level is missing.
      passageSource[level] = Array.isArray(levelPassages) && levelPassages.length
        ? levelPassages.slice()
        : originalPassages[level].slice();
    });
    // Avoid mixing English adaptive text into non-English tests.
    if (window.adaptivePassages) {
      ["easy", "medium", "hard"].forEach(level => {
        window.adaptivePassages[level] = [];
      });
    }
  }

  function restartForLanguageChange() {
    // The existing engine owns its reset logic. Clicking its existing restart control
    // refreshes the passage without duplicating or overriding its scoring state.
    const restart = document.getElementById("restartMainBtn") || document.getElementById("retryBtn");
    if (restart) restart.click();
    window.dispatchEvent(new CustomEvent("typingwebsite:languagechange", {
      detail: { code: selected, locale: languageByCode.get(selected).locale, dir: languageByCode.get(selected).dir }
    }));
  }

  function chooseLanguage(code) {
    if (!languageByCode.has(code)) return;
    const changed = selected !== code;
    selected = code;
    const language = languageByCode.get(code);
    currentLabel.textContent = language.native;
    document.documentElement.lang = language.locale;
    document.documentElement.dir = language.dir;
    document.getElementById("text")?.setAttribute("lang", language.locale);
    document.getElementById("text")?.setAttribute("dir", language.dir);
    applyPassageLanguage(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch (_) {}
    renderOptions(search.value);
    setOpen(false);
    trigger.setAttribute("aria-label", "Typing language: " + language.name + ". Change language");
    if (changed) restartForLanguageChange();
  }

  trigger.addEventListener("click", () => setOpen(menu.hidden));
  search.addEventListener("input", () => renderOptions(search.value));
  document.addEventListener("pointerdown", event => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });

  // Apply the saved/default language before script.js initializes its first passage.
  chooseLanguage(selected);
})();
