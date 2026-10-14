(() => {
    "use strict";
    const root = document.getElementById("typingLessonApp");
    if (!root || root.dataset.tlInit === "1") return;
    root.dataset.tlInit = "1";
    const PROGRESS_KEY = "typingwebsite_typing_lesson_progress_v1";
    const WEAK_KEY = "typingwebsite_weak_keys_v1";
    const GOAL_KEY = "typingwebsite_personal_goal_v1";
    const lessons = [
        {
            id: "home-asdf",
            level: "beginner",
            title: "Home Row: A S D F",
            icon: "⌨",
            minutes: 3,
            goal: 95,
            desc: "Find the home-row keys and practise short, controlled movements.",
            text: "asdf fdsa asdf jkl; jkl; asdf jkl; sad fad ask lad fall",
        },
        {
            id: "home-jkl",
            level: "beginner",
            title: "Home Row: J K L ;",
            icon: "⌨",
            minutes: 3,
            goal: 95,
            desc: "Train the right-hand home-row keys and return your fingers to position.",
            text: "jkl; ;lkj jkl; fj dk sl a; ask fall flask salad",
        },
        {
            id: "home-mix",
            level: "beginner",
            title: "Full Home Row",
            icon: "⌨",
            minutes: 4,
            goal: 95,
            desc: "Combine both hands while keeping your fingers close to the home row.",
            text: "ask a lad; fall as a flask; all dads ask; a sad lass falls",
        },
        {
            id: "top-left",
            level: "beginner",
            title: "Top Row: Q W E R T",
            icon: "↗",
            minutes: 4,
            goal: 93,
            desc: "Reach up with the left hand, then return to the home row.",
            text: "we were here; tree water wear; write a true word; were we there",
        },
        {
            id: "top-right",
            level: "beginner",
            title: "Top Row: Y U I O P",
            icon: "↗",
            minutes: 4,
            goal: 93,
            desc: "Practise the upper-right keys with steady, deliberate movements.",
            text: "you put your input in; our group is up; your typing is yours",
        },
        {
            id: "top-row",
            level: "foundation",
            title: "Complete Top Row",
            icon: "⌘",
            minutes: 4,
            goal: 93,
            desc: "Connect top-row keys into useful combinations and short phrases.",
            text: "type your own words; we write our story; people use your input",
        },
        {
            id: "bottom-left",
            level: "foundation",
            title: "Bottom Row: Z X C V B",
            icon: "⌄",
            minutes: 4,
            goal: 92,
            desc: "Reach down with the left hand and return to a relaxed position.",
            text: "cab vexes bad buzz; brave cats can move; boxes can be vivid",
        },
        {
            id: "bottom-right",
            level: "foundation",
            title: "Bottom Row: N M , . /",
            icon: "⌄",
            minutes: 4,
            goal: 92,
            desc: "Build familiarity with lower-right keys and punctuation.",
            text: "many men name new movies, and many more make notes.",
        },
        {
            id: "all-letters",
            level: "foundation",
            title: "All-Letter Workout",
            icon: "Aa",
            minutes: 5,
            goal: 93,
            desc: "Use every letter in varied words without rushing.",
            text: "quick brown foxes jump over lazy dogs while five wizards mix bright colors",
        },
        {
            id: "common-words",
            level: "foundation",
            title: "Common Words Foundation",
            icon: "Aa",
            minutes: 5,
            goal: 94,
            desc: "Build automatic recognition of frequent English words and smoother transitions between them.",
            text: "the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been being had has did does may might must should can will would could than then them those these where while each much many more very every another few same right big small great old young long high low next last early late never always often sometimes again together different important public private simple easy hard common word words type typing speed accuracy practice progress improve learn today"
                .split(" ")
                .join(" "),
        },
        {
            id: "double-letters",
            level: "intermediate",
            title: "Double Letters",
            icon: "ww",
            minutes: 4,
            goal: 94,
            desc: "Practise repeated letters without adding extra taps or pauses.",
            text: "little coffee, green grass, better letters, common patterns, smooth spelling",
        },
        {
            id: "transitions",
            level: "intermediate",
            title: "Letter Transitions",
            icon: "⇄",
            minutes: 5,
            goal: 94,
            desc: "Train common letter pairs to reduce hesitation between keys.",
            text: "the quick response from their team helped everyone finish the project",
        },
        {
            id: "long-words",
            level: "intermediate",
            title: "Longer Words",
            icon: "Aa",
            minutes: 5,
            goal: 93,
            desc: "Keep a consistent pace through longer words and mixed syllables.",
            text: "communication improves when consistent practice becomes a comfortable daily routine",
        },
        {
            id: "capitals",
            level: "intermediate",
            title: "Capital Letters",
            icon: "⇧",
            minutes: 4,
            goal: 93,
            desc: "Practise Shift-key coordination while keeping the opposite hand relaxed.",
            text: "Monday morning, Sarah opened the notebook and started a fresh chapter.",
        },
        {
            id: "punctuation",
            level: "intermediate",
            title: "Punctuation & Pauses",
            icon: ";:",
            minutes: 5,
            goal: 93,
            desc: "Keep your rhythm when sentences include commas, periods, and questions.",
            text: "Can you type clearly, calmly, and accurately? Practise each sentence; then improve.",
        },
        {
            id: "numbers",
            level: "intermediate",
            title: "Numbers & Symbols",
            icon: "#",
            minutes: 4,
            goal: 92,
            desc: "Practise number-row reaches and common symbols at a controlled pace.",
            text: "Plan 3 tasks, review 12 notes, and finish 2 reports by 4:30 today.",
        },
        {
            id: "accuracy",
            level: "intermediate",
            title: "Accuracy Challenge",
            icon: "◎",
            minutes: 5,
            goal: 98,
            desc: "Prioritize correct keystrokes and smooth corrections over raw speed.",
            text: "Accuracy is a skill you build one careful keystroke at a time. Stay relaxed, read ahead, and trust your practice.",
        },
        {
            id: "speed-control",
            level: "intermediate",
            title: "Speed Control",
            icon: "↗",
            minutes: 5,
            goal: 95,
            desc: "Find a pace you can sustain without sacrificing accuracy.",
            text: "A steady pace is more useful than a fast start followed by repeated mistakes. Keep the rhythm controlled from beginning to end.",
        },
        {
            id: "workplace",
            level: "advanced",
            title: "Workplace Writing",
            icon: "▤",
            minutes: 5,
            goal: 96,
            desc: "Practise realistic workplace messages with professional wording.",
            text: "Hi team, the updated report is ready for review. Please share your feedback by Thursday afternoon so we can finalize the next steps.",
        },
        {
            id: "technical",
            level: "advanced",
            title: "Technical Vocabulary",
            icon: "</>",
            minutes: 5,
            goal: 94,
            desc: "Build confidence with technical words and code-like punctuation.",
            text: "function calculateScore(correctKeys, totalKeys) { return totalKeys ? correctKeys / totalKeys * 100 : 0; }",
        },
        {
            id: "data",
            level: "advanced",
            title: "Data & Number Patterns",
            icon: "123",
            minutes: 5,
            goal: 94,
            desc: "Improve control while typing figures, dates, and short data sequences.",
            text: "Report 2026: 48 tasks completed, 96.5% accuracy, 17 new users, and 3 pending reviews.",
        },
        {
            id: "long-form",
            level: "advanced",
            title: "Long-Form Flow",
            icon: "¶",
            minutes: 6,
            goal: 95,
            desc: "Maintain accuracy and flow through a longer paragraph.",
            text: "Good typing is not only about moving quickly. It is about reading ahead, keeping a comfortable posture, using the right fingers, and making fewer corrections. Short, focused practice sessions can make difficult patterns feel more natural over time.",
        },
        {
            id: "mixed",
            level: "advanced",
            title: "Mixed Skills Challenge",
            icon: "✦",
            minutes: 6,
            goal: 96,
            desc: "Combine capitalization, punctuation, numbers, and varied vocabulary.",
            text: "On October 14, the team reviewed 24 entries, corrected 3 errors, and approved the final draft. Could we improve the result by 5% next week?",
        },
        {
            id: "weak-keys",
            level: "adaptive",
            title: "My Weak-Key Workout",
            icon: "◎",
            minutes: 3,
            goal: 95,
            desc: "A focused drill built from keys you tend to mistype.",
            text: "",
        },
    ];

    const $ = (id) => document.getElementById(id);
    let targetWpm = 35;
    let activeTargetWpm = targetWpm;
    const targetSaved = Number(localStorage.getItem("typingwebsite_lesson_target_wpm_v1"));
    if (Number.isFinite(targetSaved) && targetSaved >= 1 && targetSaved <= 250) targetWpm = targetSaved;
    const ui = {
        tabs: [...root.querySelectorAll(".tl-tabs button")],
        views: {
            lessons: $("tlLessons"),
            practice: $("tlPractice"),
            tools: $("tlTools"),
            goal: $("tlGoalCoach"),
            progress: $("tlProgress"),
        },
        grid: $("tlGrid"),
        filter: $("tlFilter"),
        nextTitle: $("tlNextTitle"),
        nextDesc: $("tlNextDesc"),
        completed: $("tlCompleted"),
        completionSub: $("tlCompletionSub"),
        input: $("tlInput"),
        target: $("tlTarget"),
        wpm: $("tlWpm"),
        rawWpm: $("tlRawWpm"),
        accuracy: $("tlAccuracy"),
        errors: $("tlErrors"),
        percent: $("tlPercent"),
        time: $("tlTime"),
        gap: $("tlTargetGap"),
        feedback: $("tlFeedback"),
        modal: $("tlModal"),
    };
    const parse = (s, fallback) => {
        try {
            return s ? JSON.parse(s) : fallback;
        } catch (_) {
            return fallback;
        }
    };
    function load() {
        const p = parse(localStorage.getItem(PROGRESS_KEY), {});
        return {
            completed: p.completed && typeof p.completed === "object" ? p.completed : {},
            history: Array.isArray(p.history) ? p.history : [],
        };
    }
    let progress = load(),
        current = lessons[0],
        typed = "",
        started = 0,
        finished = false,
        errorKeys = {},
        metricTimer = null;
    const savedGoal = parse(localStorage.getItem(GOAL_KEY), {});
    let personalGoal = {
        current: Math.max(0, Math.min(250, Number(savedGoal.current) || 0)),
        target: Math.max(1, Math.min(250, Number(savedGoal.target) || 25)),
        accuracy: [90, 95, 98].includes(Number(savedGoal.accuracy)) ? Number(savedGoal.accuracy) : 95,
    };
    if (personalGoal.target <= personalGoal.current)
        personalGoal.target = Math.min(250, personalGoal.current + 10) || 25;
    const levelLabel = (l) =>
        ({
            beginner: "Beginner",
            foundation: "Foundation",
            intermediate: "Intermediate",
            advanced: "Advanced",
            adaptive: "Adaptive",
        })[l] || l;
    function save() {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        } catch (_) { }
    }
    function nextLesson() {
        return (
            lessons.find((l) => l.id !== "weak-keys" && !progress.completed[l.id]) ||
            lessons.find((l) => l.id !== "weak-keys") ||
            lessons[0]
        );
    }
    function setView(name) {
        Object.entries(ui.views).forEach(([k, v]) => v.classList.toggle("is-visible", k === name));
        ui.tabs.forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
        if (name === "lessons") renderLessons();
        if (name === "progress") renderProgress();
        if (name === "tools") renderWeakSummary();
        if (name === "goal") renderGoalCoach();
    }
    function renderLessons() {
        const next = nextLesson(),
            count = Object.keys(progress.completed).length;
        ui.nextTitle.textContent = next.title;
        ui.nextDesc.textContent = next.desc;
        ui.completed.textContent = count;
        ui.completionSub.textContent = count
            ? `${count} lesson${count === 1 ? "" : "s"} completed`
            : "Start your first lesson today";
        ui.grid.replaceChildren();
        lessons
            .filter((l) => l.id !== "weak-keys" && (ui.filter.value === "all" || l.level === ui.filter.value))
            .forEach((l) => {
                const result = progress.completed[l.id],
                    b = document.createElement("button");
                b.type = "button";
                b.className = "tl-module" + (result ? " is-complete" : "");
                b.innerHTML = `<div class="tl-module-top"><span class="tl-module-icon">${l.icon}</span><span class="tl-level">${result ? "✓ Completed" : levelLabel(l.level)}</span></div><h3>${String(lessons.indexOf(l) + 1).padStart(2, "0")}. ${l.title}</h3><p>${l.desc}</p><div class="tl-module-bottom"><span>◷ ${l.minutes} min · ${l.goal}% accuracy${l.targetWpm ? ` · ${l.targetWpm} WPM` : ""}</span><b>${result ? "Practise again" : "Start →"}</b></div>`;
                b.addEventListener("click", () => startLesson(l.id));
                ui.grid.appendChild(b);
            });
    }
    function getWeakKeys() {
        const stored = parse(localStorage.getItem(WEAK_KEY), {}),
            keys = stored && stored.keys && typeof stored.keys === "object" ? stored.keys : {};
        return Object.entries(keys)
            .filter(([, v]) => v && Number(v.attempts) >= 2)
            .map(([key, v]) => ({
                key: key.toLowerCase(),
                attempts: Number(v.attempts) || 0,
                errors: Number(v.errors) || 0,
                rate: (Number(v.errors) || 0) / Math.max(1, Number(v.attempts) || 0),
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 6);
    }
    function goalDiagnosis() {
        const recent = progress.history.slice(0, 5),
            weak = getWeakKeys(),
            items = [];
        const avgAcc = recent.length ? recent.reduce((n, r) => n + (Number(r.accuracy) || 0), 0) / recent.length : null;
        const avgWpm = recent.length ? recent.reduce((n, r) => n + (Number(r.wpm) || 0), 0) / recent.length : null;
        if (!recent.length) {
            items.push({
                title: "Start with a baseline",
                desc: "Complete the short diagnostic lesson. The coach needs real typing data before it can identify your personal bottleneck.",
            });
            items.push({
                title: "Build accuracy before speed",
                desc: "If you are new, start with home-row and common-word exercises. Aim for comfortable, correct keystrokes rather than rushing.",
            });
        } else {
            if (avgAcc < personalGoal.accuracy)
                items.push({
                    title: "Accuracy is the first priority",
                    desc: `Your recent average is ${Math.round(avgAcc)}%. Practise slowly and aim for ${personalGoal.accuracy}% accuracy before increasing pace.`,
                });
            if (avgWpm < personalGoal.target)
                items.push({
                    title: "Build toward your target pace",
                    desc: `Your recent average is about ${Math.round(avgWpm)} WPM, with ${Math.max(0, personalGoal.target - Math.round(avgWpm))} WPM to your target. Use short, repeatable drills and compare fresh attempts.`,
                });
            if (avgAcc >= personalGoal.accuracy && avgWpm >= personalGoal.target)
                items.push({
                    title: "Maintain your new level",
                    desc: "Your recent average meets the selected speed and accuracy targets. Confirm it with more fresh passages and keep practising consistency.",
                });
        }
        if (weak.length)
            items.push({
                title: "Train your most error-prone keys",
                desc: `Your saved key history points to ${weak
                    .slice(0, 4)
                    .map((x) => x.key.toUpperCase())
                    .join(", ")}. The personalized drill will include words containing these letters.`,
            });
        if (recent.length >= 2) {
            const wpmValues = recent.map((r) => Number(r.wpm) || 0),
                spread = Math.max(...wpmValues) - Math.min(...wpmValues);
            if (spread >= Math.max(8, personalGoal.target * 0.15))
                items.push({
                    title: "Work on consistency",
                    desc: "Your recent speeds vary noticeably. Practise at a pace you can sustain instead of sprinting at the start.",
                });
        }
        if (!items.length)
            items.push({
                title: "Keep practising deliberately",
                desc: "Complete another lesson to give the coach more evidence. It will adjust recommendations as new results are saved.",
            });
        return items.slice(0, 4);
    }

    const goalTierModules = [
        {
            id: "tier50-common",
            level: "foundation",
            tier: 50,
            targetWpm: 60,
            title: "Common Word Foundations",
            icon: "🌱",
            minutes: 4,
            goal: 95,
            desc: "50 WPM tier · Build even spacing and eliminate stuttering pauses between standard 3- and 4-letter English words.",
            text: "the and for with that have this from they have with make look know take time people year good some could them see other than then now",
        },
        {
            id: "tier50-ngram",
            level: "foundation",
            tier: 50,
            targetWpm: 65,
            title: "Core N-Gram Chunks",
            icon: "▦",
            minutes: 4,
            goal: 95,
            desc: "50 WPM tier · Train common letter groups like ing, tion, ment, and ent into smoother typing chunks.",
            text: "ing tion ment ent able ness less ship inter enter action department statement requirement movement placement development",
        },
        {
            id: "tier70-alternating",
            level: "intermediate",
            tier: 70,
            targetWpm: 80,
            title: "High-Velocity Alternate-Hand Bursts",
            icon: "⇄",
            minutes: 4,
            goal: 96,
            desc: "70 WPM tier · Practise hand-alternating words to improve velocity without losing hand balance.",
            text: "also auto city dial sign panel perform visual key panel skeptic dismantle profuse formal problems generic authentic rival chair proxy shape blend",
        },
        {
            id: "tier70-polysyllabic",
            level: "intermediate",
            tier: 70,
            targetWpm: 85,
            title: "Polysyllabic Vocabulary",
            icon: "🌊",
            minutes: 4,
            goal: 96,
            desc: "70 WPM tier · Maintain momentum across complex, longer words without slowing down.",
            text: "substantially structural counterproductive optimization infrastructure synchronization choreography unprecedented transformation",
        },
        {
            id: "tier90-rolls",
            level: "advanced",
            tier: 90,
            targetWpm: 100,
            title: "High-Speed Finger Rolls",
            icon: "🚀",
            minutes: 5,
            goal: 98,
            desc: "90+ WPM elite tier · Practise adjacent finger-roll patterns such as struct, sch, thra, ngth, and tion.",
            text: "structure strengthen threshold length throughput scheme schedule instruction destruction mathematical strength length dispatch",
        },
        {
            id: "tier90-bigrams",
            level: "advanced",
            tier: 90,
            targetWpm: 100,
            title: "Same-Finger Bigram Eliminator",
            icon: "⚡",
            minutes: 5,
            goal: 98,
            desc: "90+ WPM elite tier · Target awkward same-finger key jumps and difficult letter transitions.",
            text: "deduce offer frame fruit jump juice kick icon decide defer friend frog judge junkyard kitchen kingdom",
        },
    ];

    function buildGoalTasks() {
        const recent = progress.history.slice(0, 5),
            weak = getWeakKeys();
        const avgAcc = recent.length ? recent.reduce((n, r) => n + (Number(r.accuracy) || 0), 0) / recent.length : null;
        const measuredWpm = recent.length ? recent.reduce((n, r) => n + (Number(r.wpm) || 0), 0) / recent.length : null;
        const avgWpm = measuredWpm === null ? personalGoal.current : measuredWpm;

        const currentSpeed = Math.max(0, avgWpm);
        const targetWpm = personalGoal.target;
        const goalAchieved = currentSpeed >= targetWpm && (avgAcc === null || avgAcc >= personalGoal.accuracy);

        const fingerprint = goalPlanFingerprint();
        let state = parse(localStorage.getItem("typingwebsite_goal_task_state_v1"), {});
        if (state.fingerprint !== fingerprint || !state.done || typeof state.done !== "object") {
            state = { fingerprint, done: {}, cycle: 1 };
        }
        const cycle = Number(state.cycle) || 1;

        const generateUniqueUserText = (tierGoal, phase) => {
            const userWeakKeys = weak.length ? weak.map((x) => x.key) : ["e", "t", "a", "o", "i", "n"];
            let pool = [];
            let wordCount = 28 + cycle * 2;

            if (tierGoal < 50) {
                pool = [
                    "the",
                    "and",
                    "for",
                    "cat",
                    "dog",
                    "run",
                    "sat",
                    "ball",
                    "jump",
                    "fast",
                    "slow",
                    "pen",
                    "desk",
                    "book",
                ];
            } else if (tierGoal >= 50 && tierGoal < 70) {
                pool = [
                    "ing",
                    "tion",
                    "ment",
                    "ent",
                    "able",
                    "less",
                    "ship",
                    "enter",
                    "action",
                    "department",
                    "statement",
                    "movement",
                ];
            } else if (tierGoal >= 70 && tierGoal < 90) {
                pool = [
                    "structure",
                    "perform",
                    "visual",
                    "skeptic",
                    "dismantle",
                    "profuse",
                    "formal",
                    "problems",
                    "generic",
                    "authentic",
                    "substantially",
                ];
            } else {
                pool = [
                    "asynchronous",
                    "architectures",
                    "optimize",
                    "throughput",
                    "decoupling",
                    "compute",
                    "threads",
                    "blocking",
                    "operational",
                    "pipelines",
                    "prefetching",
                    "infrastructure",
                ];
            }

            let customizedPool = pool.filter((word) => [...word].some((ch) => userWeakKeys.includes(ch)));
            if (customizedPool.length < 3) customizedPool = pool;

            const uniqueWords = [];
            for (let i = 0; i < wordCount; i++) {
                const randomIndex = Math.floor(Math.random() * customizedPool.length);
                let selectedWord = customizedPool[randomIndex];
                if (i === 0) {
                    selectedWord = selectedWord.charAt(0).toUpperCase() + selectedWord.slice(1);
                } else if (i === wordCount - 1) {
                    selectedWord += ".";
                } else if (i % 6 === 0) {
                    selectedWord += ",";
                }
                uniqueWords.push(selectedWord);
            }
            return uniqueWords.join(" ");
        };

        const tasks = [];
        const add = (task) => tasks.push(task);

        if (goalAchieved) {
            add({
                id: `mastery-validation-${cycle}`,
                kind: "practice",
                minutes: 5,
                tag: "GOAL ACHIEVED · MASTERY VALIDATION",
                title: `${targetWpm} WPM Master Benchmark`,
                why: `You reached your target of ${targetWpm} WPM! Maintain peak performance on complex text.`,
                steps: [`Maintain >${personalGoal.accuracy}% accuracy at or above ${targetWpm} WPM.`],
                customLessonData: {
                    id: "dyn-master-" + Date.now(),
                    level: "advanced",
                    title: `${targetWpm} WPM Benchmark Test`,
                    icon: "🏆",
                    minutes: 5,
                    goal: personalGoal.accuracy,
                    targetWpm: targetWpm,
                    desc: "Goal achieved benchmark test.",
                    text: generateUniqueUserText(targetWpm, "master"),
                },
                button: "Start Mastery Benchmark",
            });

            add({
                id: `mastery-endurance-${cycle}`,
                kind: "practice",
                minutes: 5,
                tag: "GOAL ACHIEVED · ENDURANCE",
                title: "High-Velocity Endurance Flow",
                why: "Sustain speed across longer paragraphs without fatigue.",
                steps: ["Focus on relaxed wrists and consistent cadence."],
                customLessonData: {
                    id: "dyn-endure-" + Date.now(),
                    level: "advanced",
                    title: "Endurance Flow Drill",
                    icon: "🚀",
                    minutes: 5,
                    goal: personalGoal.accuracy,
                    targetWpm: targetWpm,
                    desc: "High-velocity sustained flow drill.",
                    text: generateUniqueUserText(targetWpm, "endurance"),
                },
                button: "Start Endurance Drill",
            });

            add({
                id: `mastery-precision-${cycle}`,
                kind: "practice",
                minutes: 4,
                tag: "GOAL ACHIEVED · ZERO ERRORS",
                title: "Perfect Accuracy Challenge",
                why: "Eliminate all miskeys to make your speed effortless.",
                steps: ["Aim for 100% clean keystrokes."],
                customLessonData: {
                    id: "dyn-perf-" + Date.now(),
                    level: "advanced",
                    title: "Perfect Accuracy Drill",
                    icon: "🎯",
                    minutes: 4,
                    goal: 98,
                    targetWpm: targetWpm,
                    desc: "Zero-error precision challenge.",
                    text: generateUniqueUserText(targetWpm, "precision"),
                },
                button: "Start Precision Challenge",
            });

            add({
                id: `mastery-advance-${cycle}`,
                kind: "action",
                minutes: 2,
                tag: "NEXT STEP · RAISE GOAL",
                title: "Set a Higher Target Goal",
                why: `You have successfully conquered your ${targetWpm} WPM goal.`,
                steps: [
                    'Click "Set Goal" at the top to configure your next target (e.g. ' + (targetWpm + 15) + " WPM).",
                ],
                button: "Ready for next target",
            });

            return tasks;
        }

        const effectiveTierSpeed = Math.min(targetWpm, currentSpeed + (cycle - 1) * 3);
        const speedGap = Math.max(0, targetWpm - currentSpeed);

        add({
            id: `task-tier-c${cycle}`,
            kind: "practice",
            minutes: 4,
            tag:
                cycle > 1
                    ? `CYCLE ${cycle} REASSIGNMENT · TIER ${Math.round(effectiveTierSpeed)} WPM`
                    : `TARGET ${targetWpm} WPM TIER`,
            title: cycle > 1 ? `Phase ${cycle} Velocity Reassignment` : "Target Tier Acceleration Drill",
            why:
                cycle > 1
                    ? `Reassigned drill (Set ${cycle}): Bridging your ${Math.round(speedGap)} WPM gap toward your ${targetWpm} WPM goal.`
                    : `Targeting ${targetWpm} WPM from your baseline of ${Math.round(currentSpeed)} WPM.`,
            steps: ["Process multi-letter sequences without stuttering."],
            customLessonData: {
                id: "dyn-t-" + Date.now(),
                level: "intermediate",
                title: `Cycle ${cycle} Velocity Drill`,
                icon: "⚡",
                minutes: 4,
                goal: personalGoal.accuracy,
                targetWpm: targetWpm,
                desc: `Reassigned set ${cycle} synthesized for your target.`,
                text: generateUniqueUserText(effectiveTierSpeed, "tier"),
            },
            button: cycle > 1 ? `Start Reassigned Drill (Set ${cycle})` : "Start Target Tier Drill",
        });

        if (avgAcc !== null && avgAcc < personalGoal.accuracy) {
            add({
                id: `task-acc-c${cycle}`,
                kind: "practice",
                minutes: 3,
                tag: `CYCLE ${cycle} · ACCURACY REPAIR (${Math.round(avgAcc)}%)`,
                title: "Precision Form Correction",
                why: `Your recent accuracy averages ${Math.round(avgAcc)}%, below your ${personalGoal.accuracy}% target.`,
                steps: ["Slow down slightly to lock in clean keystrokes."],
                customLessonData: {
                    id: "dyn-acc-" + Date.now(),
                    level: "adaptive",
                    title: "Precision Form Correction",
                    icon: "🎯",
                    minutes: 3,
                    goal: personalGoal.accuracy,
                    targetWpm: targetWpm,
                    desc: "Form correction drill.",
                    text: generateUniqueUserText(effectiveTierSpeed, "acc"),
                },
                button: "Start Precision Correction",
            });
        } else {
            add({
                id: `task-rhythm-c${cycle}`,
                kind: "practice",
                minutes: 3,
                tag: `CYCLE ${cycle} · CADENCE PACING`,
                title: "Steady Rhythm & Spacing Drill",
                why: "Eliminate micro-pauses between words to maintain continuous output.",
                steps: ["Keep even timing between all keystrokes."],
                customLessonData: {
                    id: "dyn-rhythm-" + Date.now(),
                    level: "intermediate",
                    title: "Steady Cadence Drill",
                    icon: "⚖",
                    minutes: 3,
                    goal: personalGoal.accuracy,
                    targetWpm: targetWpm,
                    desc: "Rhythm and pacing drill.",
                    text: generateUniqueUserText(effectiveTierSpeed, "rhythm"),
                },
                button: "Start Rhythm Drill",
            });
        }

        if (weak.length) {
            const keys = weak
                .slice(0, 3)
                .map((x) => x.key.toUpperCase())
                .join(", ");
            add({
                id: `task-weak-c${cycle}`,
                kind: "practice",
                minutes: 3,
                tag: `CYCLE ${cycle} · WEAK KEYS (${keys})`,
                title: "Tricky Key Bottleneck Elimination",
                why: `Your telemetry logs show high error rates on: ${keys}.`,
                steps: ["Focus on clean keystrokes for these specific letters."],
                lesson: "weak-keys",
                button: "Practise Tricky Keys",
            });
        } else {
            add({
                id: `task-transition-c${cycle}`,
                kind: "practice",
                minutes: 4,
                tag: `CYCLE ${cycle} · TRANSITION DRILL`,
                title: "Letter Transition & Bigram Flow",
                why: "Smooth out awkward finger jumps on multi-letter patterns.",
                steps: ["Maintain fluid movement across finger reaches."],
                customLessonData: {
                    id: "dyn-trans-" + Date.now(),
                    level: "intermediate",
                    title: "Transition Flow Drill",
                    icon: "⇄",
                    minutes: 4,
                    goal: personalGoal.accuracy,
                    targetWpm: targetWpm,
                    desc: "Letter transition optimization.",
                    text: generateUniqueUserText(effectiveTierSpeed, "trans"),
                },
                button: "Start Transition Drill",
            });
        }

        add({
            id: `task-ladder-c${cycle}`,
            kind: "practice",
            minutes: 4,
            tag: `CYCLE ${cycle} · ACCELERATOR (${Math.round(speedGap)} WPM GAP)`,
            title: "Target Velocity Speed Ladder",
            why: `Closing your remaining ${Math.round(speedGap)} WPM gap to hit ${targetWpm} WPM.`,
            steps: ["Push slightly past comfort zone while staying accurate."],
            customLessonData: {
                id: "dyn-ladder-" + Date.now(),
                level: "advanced",
                title: "Target Velocity Ladder",
                icon: "🚀",
                minutes: 4,
                goal: personalGoal.accuracy,
                targetWpm: targetWpm,
                desc: "Speed ladder sequence.",
                text: generateUniqueUserText(targetWpm, "ladder"),
            },
            button: "Start Speed Ladder Drill",
        });

        const seenLessons = new Set();
        return tasks
            .filter((t) => {
                if (t.lesson && seenLessons.has(t.lesson)) return false;
                if (t.lesson) seenLessons.add(t.lesson);
                return true;
            })
            .slice(0, 4);
    }

    function goalPlanFingerprint() {
        const last = progress.history[0];
        return `${personalGoal.current}:${personalGoal.target}:${personalGoal.accuracy}:${last ? last.completedAt + "-" + last.wpm + "-" + last.accuracy : "no-results"}`;
    }
    function renderGoalTasks() {
        const list = $("tlGoalTaskList");
        if (!list) return;
        const tasks = buildGoalTasks(),
            fingerprint = goalPlanFingerprint();
        let state = parse(localStorage.getItem("typingwebsite_goal_task_state_v1"), {});
        if (state.fingerprint !== fingerprint || !state.done || typeof state.done !== "object")
            state = { fingerprint, done: {}, cycle: 1 };
        const doneCount = tasks.filter((t) => state.done[t.id]).length;
        $("tlGoalTaskCount").textContent = `${doneCount} / ${tasks.length} done`;
        $("tlGoalTaskProgress").style.width = `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%`;
        list.replaceChildren();
        tasks.forEach((task, index) => {
            const card = document.createElement("article");
            card.className = "tl-goal-task" + (state.done[task.id] ? " is-done" : "");
            const top = document.createElement("div");
            top.className = "tl-goal-task-top";
            const num = document.createElement("span");
            num.className = "tl-goal-task-number";
            num.textContent = String(index + 1).padStart(2, "0");
            const titleWrap = document.createElement("div");
            titleWrap.className = "tl-goal-task-title";
            const tag = document.createElement("span");
            tag.className = "tl-goal-task-tag";
            tag.textContent = `${task.tag} · ${task.minutes} MIN`;
            const title = document.createElement("h4");
            title.textContent = task.title;
            titleWrap.append(tag, title);
            const status = document.createElement("span");
            status.className = "tl-goal-task-status";
            status.textContent = state.done[task.id] ? "✓ Done" : task.kind === "practice" ? "Drill" : "Action";
            top.append(num, titleWrap, status);
            const why = document.createElement("p");
            why.className = "tl-goal-task-why";
            why.textContent = task.why;
            const steps = document.createElement("ul");
            steps.className = "tl-goal-task-steps";
            task.steps.forEach((line) => {
                const li = document.createElement("li");
                li.textContent = line;
                steps.appendChild(li);
            });
            const footer = document.createElement("div");
            footer.className = "tl-goal-task-footer";
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tl-btn " + (state.done[task.id] ? "tl-quiet" : "tl-primary");
            button.dataset.goalTask = task.id;
            button.dataset.goalTaskKind = task.kind;
            button.textContent = state.done[task.id] ? "Completed · mark undone" : task.button;
            footer.appendChild(button);
            card.append(top, why, steps, footer);
            list.appendChild(card);
        });
        try {
            localStorage.setItem("typingwebsite_goal_task_state_v1", JSON.stringify(state));
        } catch (_) { }
    }
    function renderGoalCoach() {
        const currentInput = $("tlCurrentGoal"),
            targetInput = $("tlTargetGoal"),
            accuracyInput = $("tlAccuracyGoal");
        if (!currentInput) return;
        currentInput.value = String(personalGoal.current);
        targetInput.value = String(personalGoal.target);
        accuracyInput.value = String(personalGoal.accuracy);
        const recent = progress.history.slice(0, 5),
            recentWpm = recent.length
                ? Math.round(recent.reduce((n, r) => n + (Number(r.wpm) || 0), 0) / recent.length)
                : null;
        const baseline = recentWpm === null ? personalGoal.current : Math.max(personalGoal.current, recentWpm);
        const gap = Math.max(0, personalGoal.target - baseline);
        $("tlGoalGap").textContent = gap;
        $("tlGoalHeadline").textContent =
            baseline === 0 ? "Start with the basics" : gap === 0 ? "Goal range reached" : `${gap} WPM to go`;
        $("tlGoalSummary").textContent =
            recentWpm === null
                ? baseline === 0
                    ? "Your first lesson will measure accuracy and help identify what to practise next."
                    : "Using your entered baseline until you complete lessons."
                : `Based on your latest ${recent.length} lesson${recent.length === 1 ? "" : "s"}, your average is about ${recentWpm} WPM. Recommendations update after each result.`;
        $("tlGoalStartLabel").textContent = `Current: ${baseline} WPM`;
        $("tlGoalEndLabel").textContent = `Target: ${personalGoal.target} WPM`;
        const progressPct =
            personalGoal.target > 0 ? Math.max(0, Math.min(100, (baseline / personalGoal.target) * 100)) : 0;
        $("tlGoalProgressBar").style.width = `${progressPct}%`;
        const list = $("tlDiagnosisList");
        list.replaceChildren();
        goalDiagnosis().forEach((item, i) => {
            const row = document.createElement("div");
            row.className = "tl-diagnosis-item";
            const n = document.createElement("span");
            n.textContent = String(i + 1).padStart(2, "0");
            const body = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = item.title;
            const desc = document.createElement("p");
            desc.textContent = item.desc;
            body.append(title, desc);
            row.append(n, body);
            list.appendChild(row);
        });
        renderGoalTasks();
    }

    function makeGoalLesson() {
        const weak = getWeakKeys(),
            recent = progress.history.slice(0, 5);
        const avgAcc = recent.length ? recent.reduce((n, r) => n + (Number(r.accuracy) || 0), 0) / recent.length : null;
        const avgWpm = recent.length
            ? recent.reduce((n, r) => n + (Number(r.wpm) || 0), 0) / recent.length
            : personalGoal.current;
        let level = "beginner",
            title = "Personalized Focus Drill",
            desc = "Customized drill targeting your specific error patterns.";
        if (avgWpm >= 60) {
            level = "advanced";
            title = `Elite Target Push (${personalGoal.target} WPM)`;
            desc = `High-velocity custom flow targeting your recurring typing bottlenecks at ${personalGoal.target} WPM.`;
        } else if (avgWpm >= 35) {
            level = "intermediate";
            title = `Intermediate Precision Flow (${personalGoal.target} WPM)`;
            desc = `Targeted sequence focused on smoothing out transitions and raising your speed toward ${personalGoal.target} WPM.`;
        } else {
            level = "foundation";
            title = `Foundational Accuracy Drill (${personalGoal.target} WPM)`;
            desc = `Gentle, deliberate pacing designed to stabilize your finger placement and eliminate frequent errors.`;
        }
        if (avgAcc !== null && avgAcc < personalGoal.accuracy) {
            title = "Target Accuracy Repair";
            desc = `Your recent accuracy (${Math.round(avgAcc)}%) is below your ${personalGoal.accuracy}% goal. This drill prioritizes clean keystrokes.`;
        }

        const focusKeys = weak.length ? weak.map((x) => x.key) : ["e", "t", "a", "o", "i", "n"];
        const baseVocabulary = [
            "the",
            "digital",
            "system",
            "process",
            "project",
            "performance",
            "adaptive",
            "velocity",
            "keyboard",
            "practice",
            "progress",
            "improve",
            "typing",
            "speed",
            "accuracy",
            "fluent",
            "sequence",
            "buffer",
            "network",
            "structure",
            "consistent",
            "routine",
            "efficient",
            "focus",
            "syntax",
            "function",
            "variable",
            "method",
            "element",
            "control",
            "output",
            "input",
            "target",
        ];
        let filteredWords = baseVocabulary.filter((word) => [...word].some((ch) => focusKeys.includes(ch)));
        if (filteredWords.length < 5) filteredWords = baseVocabulary;

        const sentenceLength = 35;
        const generatedWords = [];
        for (let i = 0; i < sentenceLength; i++) {
            const randomPoolIndex = Math.floor(Math.random() * filteredWords.length);
            let currentWord = filteredWords[randomPoolIndex];
            if (i === 0) {
                currentWord = currentWord.charAt(0).toUpperCase() + currentWord.slice(1);
            } else if (i === sentenceLength - 1) {
                currentWord += ".";
            } else if (i % 9 === 0) {
                currentWord += ",";
            }
            generatedWords.push(currentWord);
        }
        let text = generatedWords.join(" ");
        return {
            id: "goal-personalized-" + Date.now(),
            level,
            title,
            icon: "🎯",
            minutes: 5,
            goal: personalGoal.accuracy,
            targetWpm: personalGoal.target,
            desc: `${desc} Focus characters: ${focusKeys.map((k) => k.toUpperCase()).join(", ")}.`,
            text,
        };
    }

    function savePersonalGoal() {
        const c = Number($("tlCurrentGoal").value),
            t = Number($("tlTargetGoal").value),
            a = Number($("tlAccuracyGoal").value);
        if (!Number.isFinite(c) || c < 0 || c > 250 || !Number.isFinite(t) || t < 1 || t > 250 || t <= c) {
            alert("Enter a current speed from 0–250 WPM and a target above your current speed (up to 250 WPM).");
            return;
        }
        personalGoal = { current: Math.round(c), target: Math.round(t), accuracy: a };
        try {
            localStorage.setItem(GOAL_KEY, JSON.stringify(personalGoal));
            localStorage.setItem("typingwebsite_lesson_target_wpm_v1", String(personalGoal.target));
        } catch (_) { }
        targetWpm = personalGoal.target;
        renderGoalCoach();
    }
    function weakLesson() {
        const stored = parse(localStorage.getItem(WEAK_KEY), {});
        const keyStats = stored && stored.keys && typeof stored.keys === "object" ? stored.keys : {};
        const keys = Object.entries(keyStats)
            .filter(([, v]) => v && Number(v.attempts) >= 2)
            .map(([k, v]) => ({
                key: k.toLowerCase(),
                attempts: Number(v.attempts) || 0,
                errors: Number(v.errors) || 0,
            }))
            .sort((a, b) => b.errors / Math.max(1, b.attempts) - a.errors / Math.max(1, a.attempts))
            .slice(0, 8)
            .map((x) => x.key);
        const use = keys.length ? keys : ["e", "r", "t", "a", "s", "i"];
        const words = [
            "letter",
            "little",
            "people",
            "practice",
            "progress",
            "improve",
            "simple",
            "sample",
            "system",
            "skill",
            "quick",
            "quiet",
            "question",
            "write",
            "wrong",
            "world",
            "word",
            "work",
            "friend",
            "fresh",
            "green",
            "great",
            "group",
            "think",
            "there",
            "their",
            "these",
            "other",
            "speed",
            "space",
            "success",
            "sentence",
            "accurate",
            "action",
            "keyboard",
            "typing",
            "training",
            "learning",
            "number",
            "focus",
            "finish",
            "fast",
            "first",
        ];
        const matching = words.filter((w) => [...w].some((k) => use.includes(k)));
        const selected = [];
        for (let i = 0; i < 36; i++) {
            const pool = matching.length && Math.random() < 0.7 ? matching : words;
            selected.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        return {
            ...lessons.find((l) => l.id === "weak-keys"),
            text: selected.join(" "),
            desc: `Focused practice based on ${use.join(", ")}. Aim for clean, relaxed keystrokes.`,
        };
    }
    function startLesson(id) {
        clearInterval(metricTimer);
        metricTimer = null;
        current = id && typeof id === "object" ? id : lessons.find((l) => l.id === id) || nextLesson();
        if (current.id === "weak-keys") current = weakLesson();
        activeTargetWpm = Number(current.targetWpm) || targetWpm;
        typed = "";
        started = 0;
        finished = false;
        errorKeys = {};
        ui.input.value = "";
        ui.input.disabled = false;
        const lessonIndex = lessons.findIndex((l) => l.id === current.id);
        $("tlLessonLabel").textContent =
            `${levelLabel(current.level).toUpperCase()} · ${lessonIndex >= 0 ? "LESSON " + String(lessonIndex + 1).padStart(2, "0") : "CUSTOM DRILL"}`;
        $("tlLessonTitle").textContent = current.title;
        $("tlLessonDesc").textContent = current.desc;
        $("tlGoal").textContent = `At least ${current.goal}% accuracy`;
        $("tlTargetMeta").textContent = `${current.text.length} characters · Accuracy first`;
        ui.feedback.className = "tl-feedback";
        ui.feedback.textContent = "Take your time. Accuracy matters more than speed.";
        drawTarget();
        updateMetrics();
        setView("practice");
        ui.input.focus({ preventScroll: true });
    }
    function drawTarget() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < current.text.length; i++) {
            const s = document.createElement("span");
            s.textContent = current.text[i];
            if (i < typed.length) s.className = typed[i] === current.text[i] ? "tl-char-correct" : "tl-char-wrong";
            else if (i === typed.length) s.className = "tl-char-current";
            frag.appendChild(s);
        }
        ui.target.replaceChildren(frag);
    }
    function metrics() {
        let correct = 0,
            errors = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === current.text[i]) correct++;
            else errors++;
        }
        const elapsed = started ? Math.max((Date.now() - started) / 1000, 0) : 0,
            mins = elapsed / 60;
        return {
            correct,
            errors,
            wpm: mins ? Math.round(correct / 5 / mins) : 0,
            rawWpm: mins ? Math.round(typed.length / 5 / mins) : 0,
            elapsed,
            accuracy: typed.length ? Math.round((correct / typed.length) * 100) : 100,
            percent: Math.min(100, Math.round((typed.length / current.text.length) * 100)),
        };
    }
    function updateMetrics() {
        const m = metrics();
        ui.wpm.textContent = m.wpm;
        ui.rawWpm.textContent = m.rawWpm;
        ui.accuracy.textContent = `${m.accuracy}%`;
        ui.errors.textContent = m.errors;
        ui.percent.textContent = `${m.percent}%`;
        ui.time.textContent = `${Math.floor(m.elapsed / 60)}:${String(Math.floor(m.elapsed % 60)).padStart(2, "0")}`;
        const gap = m.wpm - activeTargetWpm;
        ui.gap.textContent = `${gap > 0 ? "+" : ""}${gap}`;
        ui.gap.style.color = gap >= 0 ? "var(--tl-green)" : "var(--tl-muted)";
    }
    function onInput() {
        if (finished) return;
        typed = ui.input.value.slice(0, current.text.length);
        if (typed.length && !started) {
            started = Date.now();
            metricTimer = setInterval(updateMetrics, 1000);
        }
        errorKeys = {};
        for (let i = 0; i < typed.length; i++)
            if (typed[i] !== current.text[i]) {
                const k = (current.text[i] || typed[i] || "").toLowerCase();
                if (/[a-z0-9;,./'!?-]/i.test(k)) errorKeys[k] = (errorKeys[k] || 0) + 1;
            }
        drawTarget();
        updateMetrics();
        const m = metrics();
        if (m.errors === 0 && typed.length) {
            ui.feedback.className = "tl-feedback good";
            ui.feedback.textContent = "Great control — every typed character matches so far.";
        } else if (m.accuracy < 90 && typed.length > 5) {
            ui.feedback.className = "tl-feedback warn";
            ui.feedback.textContent = "Slow down a little and focus on accuracy. Speed comes with repetition.";
        } else {
            ui.feedback.className = "tl-feedback";
            ui.feedback.textContent = "Keep your hands relaxed and look ahead at the next word.";
        }
        if (typed.length === current.text.length) finishLesson(true);
    }
    function saveWeak() {
        const old = parse(localStorage.getItem(WEAK_KEY), {});
        if (!old.keys || typeof old.keys !== "object") old.keys = {};
        if (!Number.isFinite(Number(old.sessions))) old.sessions = 0;
        for (let i = 0; i < typed.length; i++) {
            const expected = (current.text[i] || "").toLowerCase();
            if (!/^[a-z]$/.test(expected)) continue;
            const ok = typed[i] === current.text[i];
            if (!old.keys[expected]) old.keys[expected] = { attempts: 0, errors: 0, recent: [] };
            const stat = old.keys[expected];
            stat.attempts = (Number(stat.attempts) || 0) + 1;
            if (!ok) stat.errors = (Number(stat.errors) || 0) + 1;
            if (!Array.isArray(stat.recent)) stat.recent = [];
            stat.recent.push(ok);
            stat.recent = stat.recent.slice(-20);
        }
        old.sessions = (Number(old.sessions) || 0) + 1;
        try {
            localStorage.setItem(WEAK_KEY, JSON.stringify(old));
        } catch (_) { }
    }
    function finishLesson(auto = false) {
        if (finished) return;
        finished = true;
        clearInterval(metricTimer);
        metricTimer = null;
        const m = metrics(),
            complete = typed.length === current.text.length,
            result = {
                id: current.id,
                title: current.title,
                wpm: m.wpm,
                rawWpm: m.rawWpm,
                accuracy: m.accuracy,
                errors: m.errors,
                completedAt: new Date().toISOString(),
                complete,
            };
        saveWeak();
        const prev = progress.completed[current.id];
        if (complete && (!prev || m.accuracy >= prev.accuracy || m.wpm > prev.wpm))
            progress.completed[current.id] = {
                wpm: Math.max(m.wpm, prev?.wpm || 0),
                accuracy: Math.max(m.accuracy, prev?.accuracy || 0),
                completedAt: result.completedAt,
            };
        progress.history.unshift(result);
        progress.history = progress.history.slice(0, 50);
        save();
        ui.input.disabled = true;
        $("tlResultWpm").textContent = m.wpm;
        $("tlResultRawWpm").textContent = m.rawWpm;
        $("tlResultAccuracy").textContent = `${m.accuracy}%`;
        $("tlResultErrors").textContent = m.errors;
        $("tlResultTitle").textContent = m.accuracy >= current.goal ? "Excellent work!" : "Lesson result";
        $("tlResultMessage").textContent = complete
            ? "You typed the full lesson. Your result has been saved on this device."
            : "Your attempt was recorded. Repeat the lesson to finish the full text.";
        $("tlResultTip").textContent =
            m.accuracy >= current.goal
                ? `You reached the ${current.goal}% accuracy goal. Keep this controlled rhythm as you progress.`
                : `Your goal is ${current.goal}% accuracy. Aim for fewer mistakes before increasing your pace.`;
        const idx = lessons.findIndex((l) => l.id === current.id),
            next = lessons.slice(idx + 1).find((l) => l.id !== "weak-keys");
        $("tlNextLesson").textContent = next ? "Next lesson →" : "Back to lessons →";
        ui.modal.hidden = false;
        renderLessons();
        renderGoalCoach();
        if (auto) ui.feedback.textContent = "Text complete — your result is ready.";
    }
    function closeModal() {
        ui.modal.hidden = true;
    }
    function renderProgress() {
        const hist = progress.history,
            completed = Object.keys(progress.completed).length,
            best = hist.reduce((v, r) => Math.max(v, Number(r.wpm) || 0), 0),
            avg = hist.length
                ? Math.round(hist.reduce((v, r) => v + (Number(r.accuracy) || 0), 0) / hist.length)
                : null;
        $("tlStatCompleted").textContent = completed;
        $("tlStatWpm").textContent = best;
        $("tlStatAccuracy").textContent = avg === null ? "—" : `${avg}%`;
        $("tlHistoryCount").textContent = `${hist.length} result${hist.length === 1 ? "" : "s"}`;
        const box = $("tlHistoryList");
        box.replaceChildren();
        if (!hist.length) {
            const p = document.createElement("p");
            p.className = "tl-empty";
            p.textContent = "Complete a lesson and your results will appear here.";
            box.appendChild(p);
            return;
        }
        hist.slice(0, 12).forEach((r) => {
            const row = document.createElement("div");
            row.className = "tl-history-row";
            const title = document.createElement("strong");
            title.textContent = r.title;
            const w = document.createElement("span");
            w.textContent = `${r.wpm} WPM`;
            const a = document.createElement("span");
            a.textContent = `${r.accuracy}%`;
            const d = document.createElement("span");
            d.textContent = new Date(r.completedAt).toLocaleDateString();
            row.append(title, w, a, d);
            box.appendChild(row);
        });
    }
    function renderWeakSummary() {
        const box = $("tlWeakSummary");
        if (!box) return;
        const stored = parse(localStorage.getItem(WEAK_KEY), {}),
            keys = stored && stored.keys && typeof stored.keys === "object" ? stored.keys : {};
        const weak = Object.entries(keys)
            .filter(([, v]) => v && Number(v.attempts) >= 2)
            .map(([key, v]) => ({ key, attempts: Number(v.attempts) || 0, errors: Number(v.errors) || 0 }))
            .sort((a, b) => b.errors / Math.max(1, b.attempts) - a.errors / Math.max(1, a.attempts))
            .slice(0, 5);
        box.textContent = weak.length
            ? "Your current focus keys: " +
            weak
                .map(
                    (x) =>
                        `${x.key.toUpperCase()} (${Math.round((100 * x.errors) / Math.max(1, x.attempts))}% errors)`
                )
                .join(" · ")
            : "No repeated weak keys recorded yet. Start with a balanced beginner drill; this tool will learn from your attempts.";
    }
    const targetInput = $("tlTargetWpmInput");
    if (targetInput) {
        targetInput.value = String(targetWpm);
        targetInput.addEventListener("change", () => {
            const n = Number(targetInput.value);
            if (Number.isFinite(n) && n >= 1 && n <= 250) {
                targetWpm = Math.round(n);
                activeTargetWpm = Number(current.targetWpm) || targetWpm;
                targetInput.value = String(targetWpm);
                try {
                    localStorage.setItem("typingwebsite_lesson_target_wpm_v1", String(targetWpm));
                } catch (_) { }
                updateMetrics();
            }
        });
    }
    $("tlCommonWords").addEventListener("click", () => startLesson("common-words"));
    $("tlWeakDrillTools").addEventListener("click", () => startLesson("weak-keys"));
    $("tlStartCustom").addEventListener("click", () => {
        const text = $("tlCustomText").value.trim().replace(/\s+/g, " ");
        if (text.length < 10) {
            $("tlCustomText").focus();
            $("tlCustomText").setCustomValidity("Please enter at least 10 characters for a useful drill.");
            $("tlCustomText").reportValidity();
            return;
        }
        $("tlCustomText").setCustomValidity("");
        startLesson({
            id: "custom-drill",
            level: "adaptive",
            title: "Custom Practice",
            icon: "✎",
            minutes: 5,
            goal: 95,
            desc: "Practice text you selected. Target speed: " + targetWpm + " WPM.",
            text: text.slice(0, 1800),
        });
    });

    const customGoalBtn = $("tlCustomGoalGenerator");
    if (customGoalBtn) {
        customGoalBtn.addEventListener("click", () => {
            startLesson(makeGoalLesson());
        });
    }

    ui.tabs.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    ui.filter.addEventListener("change", renderLessons);
    $("tlStartNext").addEventListener("click", () => startLesson(nextLesson().id));
    $("tlAllLessons").addEventListener("click", () => setView("lessons"));
    $("tlRestart").addEventListener("click", () => startLesson(current.id));
    $("tlFinish").addEventListener("click", () => finishLesson(false));
    ui.input.addEventListener("input", onInput);
    ui.input.addEventListener("keydown", (e) => {
        if (e.key === "Tab") e.preventDefault();
    });
    $("tlModalClose").addEventListener("click", closeModal);
    ui.modal.addEventListener("click", (e) => {
        if (e.target === ui.modal) closeModal();
    });
    $("tlTryAgain").addEventListener("click", () => {
        closeModal();
        startLesson(current.id);
    });
    $("tlNextLesson").addEventListener("click", () => {
        const idx = lessons.findIndex((l) => l.id === current.id),
            next = lessons.slice(idx + 1).find((l) => l.id !== "weak-keys");
        closeModal();
        if (next) startLesson(next.id);
        else setView("lessons");
    });
    $("tlResetProgress").addEventListener("click", () => {
        if (!confirm("Reset all Typing Lesson progress and history on this device?")) return;
        progress = { completed: {}, history: [] };
        save();
        renderProgress();
        renderLessons();
    });
    $("tlWeakDrill").addEventListener("click", () => startLesson("weak-keys"));
    $("tlWeakDrill").addEventListener("click", renderWeakSummary);
    $("tlGoalTaskList").addEventListener("click", (e) => {
        const button = e.target.closest("button[data-goal-task]");
        if (!button) return;
        const taskId = button.dataset.goalTask,
            kind = button.dataset.goalTaskKind;
        const activeTasks = buildGoalTasks();
        const task = activeTasks.find((t) => t.id === taskId);
        if (!task) return;

        if (kind === "practice") {
            if (task.customLessonData) {
                startLesson(task.customLessonData);
            } else {
                const foundTierMod = goalTierModules.find((m) => m.id === task.lesson);
                if (foundTierMod) {
                    startLesson(foundTierMod);
                } else if (task.lesson === "goal") {
                    startLesson(makeGoalLesson());
                } else if (task.lesson) {
                    startLesson(task.lesson);
                }
            }
            return;
        }

        const fingerprint = goalPlanFingerprint();
        let state = parse(localStorage.getItem("typingwebsite_goal_task_state_v1"), {});
        if (state.fingerprint !== fingerprint || !state.done || typeof state.done !== "object") {
            state = { fingerprint, done: {}, cycle: 1 };
        }

        state.done[taskId] = !state.done[taskId];

        const allCompleted = activeTasks.every((t) => state.done[t.id]);
        if (allCompleted) {
            state.cycle = (Number(state.cycle) || 1) + 1;
            state.done = {};
        }

        try {
            localStorage.setItem("typingwebsite_goal_task_state_v1", JSON.stringify(state));
        } catch (_) { }
        renderGoalTasks();
    });

    $("tlSaveGoal").addEventListener("click", savePersonalGoal);
    $("tlStartGoalLesson").addEventListener("click", () => startLesson(makeGoalLesson()));
    renderLessons();
    renderProgress();
    renderWeakSummary();
    renderGoalCoach();
})();
