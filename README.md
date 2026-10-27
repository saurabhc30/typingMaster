# TypingWebsite multilingual language selector (fixed test package)

This package updates your uploaded original `index.html` and adds three isolated files. It does not modify `/style.css`, the page URLs, SEO metadata, or the existing typing-engine source.

## Files
- `index.html` — original page with the language selector moved into the directly above the typing passage, outside the control bar (Monkeytype-inspired placement).
- `multilingual-ui.css` — isolated styles for the language tab and searchable dropdown.
- `multilingual-ui.js` — language selection, persistence, passage-list switching, and restart through the existing restart control.
- `multilingual-language-data.js` — 11 languages with separate Easy, Medium, and Hard passage lists (two starter passages per level for non-English languages). English restores the complete existing `passages.js` corpus. This is a bundled starter dataset, not an automatic internet passage feed.
- `script.js-integration.patch.txt` — notes about the remaining IME/scoring limitation; no patch is required for basic passage switching.

## Install on a test branch first
Upload the updated `index.html` and the three `multilingual-*` files to the website root. Keep the existing `style.css`, `passages.js`, `script.js`, and all other files as they are.

The scripts must remain in this order near the bottom of `index.html`:
1. `/weak-key-trainer.js`
2. `passages.js`
3. `/multilingual-language-data.js`
4. `/multilingual-ui.js`
5. `script.js`

Selecting a language replaces the available passage lists with that language’s Easy, Medium, and Hard passages, then uses the existing restart control to refresh the passage. Difficulty continues to use the existing Easy/Medium/Hard mode selection. Selecting English restores the original passage lists. The chosen language is saved in localStorage.

## Important limitations
The language dropdown and passage switching are implemented, but the existing typing engine compares `KeyboardEvent.key` one key at a time. Japanese and Chinese IME composition, Hindi combining characters, and reliable grapheme-level WPM/accuracy scoring still require dedicated input-engine work and testing. Arabic right-to-left scoring/layout should also be regression-tested. This package has not been deployed to your live site.


## How multilingual passages are supplied
The current build uses the local `multilingual-language-data.js` corpus. That makes language changes immediate and avoids an external API dependency, but it contains two starter passages per difficulty for each non-English language. To provide a large rotating corpus, add legally reusable text to per-language JSON files (for example `/passages/es.json`, `/passages/hi.json`) and load those files with `fetch()`; keep a local fallback for offline/API failures. Use public-domain or explicitly open-licensed text, record the source/license, normalize Unicode, and split into sensible passage lengths. Do not scrape Monkeytype or copy copyrighted books/articles without permission.
