/* ══════════════════════════════════════════════════════════════════
   三關謎城 · game logic
   Plain JavaScript, no dependencies, works from a local file.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const EN = window.GAME_LANG === "en";
  const T = (zh, en) => (EN ? en : zh);

  const LEVELS = {
    1: { name: "數學題", nameEn: "Mathematics", room: "齒輪鐘樓", roomEn: "The Clockwork Tower", roman: "I", cn: "第一", ordinalEn: "first" },
    2: { name: "密室逃脫", nameEn: "Escape Room", room: "無聲書房", roomEn: "The Silent Study", roman: "II", cn: "第二", ordinalEn: "second" },
    3: { name: "生日謎題", nameEn: "Birthday Riddle", room: "缺席的日期", roomEn: "The Missing Date", roman: "III", cn: "第三", ordinalEn: "third" }
  };

  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const ROOM_SPOTS = ["books", "painting", "clock", "drawer"];
  const ROOM_NAMES = {
    books: { zh: "書", en: "Book" },
    painting: { zh: "畫", en: "Painting" },
    clock: { zh: "鐘", en: "Clock" },
    drawer: { zh: "抽屜", en: "Drawer" }
  };
  const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];

  function roomOrderText(order, separator) {
    return order.map((spot) => (EN ? ROOM_NAMES[spot].en : ROOM_NAMES[spot].zh)).join(separator);
  }

  function formatDateLabel(month, day) {
    return EN ? `${MONTHS_EN[month - 1]} ${day}` : `${month} 月 ${day} 日`;
  }

  function toRoman(value) {
    return ROMAN[value] || String(value);
  }

  /* Each puzzle is generated fresh. The generators accept the previous puzzle
     so a replay never starts with the exact same answer. */
  function makeMathPuzzle(previous = null) {
    let puzzle;
    let attempts = 0;
    do {
      const gear = randInt(4, 9);
      const key = randInt(2, 6);
      const candle = randInt(1, Math.max(1, key - 1));
      puzzle = {
        gear,
        key,
        candle,
        sum1: gear * 3,
        sum2: gear + key * 2,
        diff: key - candle,
        answer: candle + gear * key
      };
      attempts += 1;
    } while (
      previous &&
      puzzle.gear === previous.gear &&
      puzzle.key === previous.key &&
      puzzle.candle === previous.candle &&
      attempts < 12
    );
    return puzzle;
  }

  function shuffleRoomSpots() {
    const spots = [...ROOM_SPOTS];
    for (let index = spots.length - 1; index > 0; index -= 1) {
      const swap = randInt(0, index);
      [spots[index], spots[swap]] = [spots[swap], spots[index]];
    }
    return spots;
  }

  function makeRoomPuzzle(previous = null) {
    let room;
    let attempts = 0;
    do {
      const book = randInt(1, 9);
      const birds = randInt(3, 6);
      const hour = randInt(1, 9);
      const marbles = randInt(1, 4);
      const order = shuffleRoomSpots();
      const values = { books: book, painting: birds, clock: hour, drawer: marbles };
      room = {
        book,
        birds,
        hour,
        marbles,
        order,
        code: order.map((spot) => values[spot]).join("")
      };
      attempts += 1;
    } while (
      attempts < 30 &&
      (new Set([room.book, room.birds, room.hour, room.marbles]).size < 3 ||
        (previous && room.code === previous.code))
    );
    return room;
  }

  function buildRoomClues(room) {
    const roman = toRoman(room.book);
    return {
      books: {
        name: T("書架", "Bookshelf"),
        text: T(
          `第 ${roman} 卷歪了出來，書背是暗紅色的。`,
          `The volume marked ${roman} is sticking out. Its spine is deep red.`
        ),
        toast: T(`找到線索：第 ${roman} 卷歪了出來。`, `Clue found: the volume marked ${roman}.`)
      },
      painting: {
        name: T("畫作", "Painting"),
        text: T(
          `畫中有 ${room.birds} 隻白鴿，朝著窗外的月亮飛。`,
          `${room.birds} white doves fly toward the moon outside the window.`
        ),
        toast: T(`找到線索：畫裡有 ${room.birds} 隻白鴿。`, `Clue found: ${room.birds} white doves.`)
      },
      clock: {
        name: T("掛鐘", "Clock"),
        text: T(
          `時針停在 ${room.hour}，分針指著 12。鐘擺卻還在動。`,
          `The hour hand rests on ${room.hour}; the minute hand points to 12. The pendulum still moves.`
        ),
        toast: T(`找到線索：時針停在 ${room.hour} 點。`, `Clue found: the hour hand rests on ${room.hour}.`)
      },
      drawer: {
        name: T("抽屜", "Drawer"),
        text: T(
          `抽屜裡躺著 ${room.marbles} 顆藍色彈珠。`,
          `${room.marbles} blue marbles lie on the velvet inside the drawer.`
        ),
        toast: T(`找到線索：抽屜裡有 ${room.marbles} 顆彈珠。`, `Clue found: ${room.marbles} blue marbles.`)
      }
    };
  }

  function makeBirthdayPuzzle(previous = null) {
    let birthday;
    let attempts = 0;
    do {
      const month = randInt(1, 12);
      const lastDay = Math.min(daysInMonth(month), 27);
      const day = randInt(13, Math.max(13, lastDay));
      birthday = { month, day, product: month * day, sum: month + day };
      attempts += 1;
    } while (
      previous &&
      birthday.month === previous.month &&
      birthday.day === previous.day &&
      attempts < 20
    );
    return birthday;
  }

  const HINTS = {
    1: [
      () => T(
        `三個齒輪相加是 ${state.math.sum1}，所以一個齒輪是 ${state.math.gear}。從第一行開始，逐一算出每個符號。`,
        `Three gears add up to ${state.math.sum1}, so one gear is ${state.math.gear}. Start with the first row and work out each symbol.`
      ),
      () => T(
        "算出齒輪、鑰匙和蠟燭之後，別忘了：先乘除，後加減。",
        "Once you have the gear, key and candle, remember: multiplication comes before addition."
      )
    ],
    2: [
      () => T(
        `紙條的順序是：${roomOrderText(state.room.order, "、")}。每一個地方只需要一個數字，把它們依序排好。`,
        `The note's order is: ${roomOrderText(state.room.order, ", ")}. Each place gives one digit; line them up in that order.`
      ),
      () => T(
        `書背上的羅馬數字是 ${toRoman(state.room.book)}（${state.room.book}）；畫裡有 ${state.room.birds} 隻白鴿；時針停在 ${state.room.hour}；抽屜裡有 ${state.room.marbles} 顆彈珠。`,
        `The Roman numeral on the book is ${toRoman(state.room.book)} (${state.room.book}); the painting has ${state.room.birds} doves; the hour hand rests on ${state.room.hour}; the drawer holds ${state.room.marbles} marbles.`
      )
    ],
    3: [
      () => T(
        `把 ${state.birthday.product} 拆成兩個整數相乘，再找哪一組相加會等於 ${state.birthday.sum}。`,
        `Factor ${state.birthday.product} into two integers, then find the pair that adds up to ${state.birthday.sum}.`
      ),
      () => T(
        `${state.birthday.month} × ${state.birthday.day} = ${state.birthday.product}，${state.birthday.month} + ${state.birthday.day} = ${state.birthday.sum}。月份是 ${state.birthday.month}，日期是 ${state.birthday.day}。`,
        `${state.birthday.month} × ${state.birthday.day} = ${state.birthday.product}, and ${state.birthday.month} + ${state.birthday.day} = ${state.birthday.sum}. The month is ${state.birthday.month}; the day is ${state.birthday.day}.`
      )
    ]
  };

  const WRONG_MESSAGES = {
    1: [
      T("齒輪沒有咬合。再檢查一次。", "The gears do not mesh. Check again."),
      T("差一點。注意：乘法會比加法先發生。", "So close. Remember: multiplication happens before addition."),
      T("還是不對。三個符號的值，可以從前三行逐一推出來。", "Not yet. Work out the three symbols from the first three rows, one at a time."),
      T("鐘塔沒有動。慢慢來，答案不需要用猜的。", "The tower has not moved. Take your time; guessing is not required.")
    ],
    2: [
      T("門鎖紋絲不動。數字不對。", "The lock does not budge. The digits are wrong."),
      T("沉悶的一聲。再讀一遍線索與桌上的紙條。", "A dull thud. Read the clues and the note again."),
      T("不是這四個數字。紙條上的順序，就是密碼的順序。", "Not those four digits. The order on the note is the order of the code."),
      T("門沒有開。房間裡還有沒被讀清楚的細節。", "The door stays shut. Something in the room has not been read closely enough.")
    ],
    3: [
      T("邀請函上的日期不對。", "The date on the invitation is wrong."),
      T("門沒有動。再想想那兩行數字。", "The gate has not moved. Think about those two lines again."),
      T("不是這一天。符合條件的日期，只有一組。", "Not that day. Only one date fits both clues."),
      T("蠟燭沒有亮。先把邀請函上的乘積拆成兩個數。", "The candles stay dark. Start by factoring the product on the invitation.")
    ]
  };

  const STORAGE = {
    sound: "threeGates.sound.v1",
    best: "threeGates.best.v1"
  };

  const state = {
    level: 1,
    math: null,
    room: null,
    roomClues: null,
    birthday: null,
    solved: { 1: false, 2: false, 3: false },
    attempts: { 1: 0, 2: 0, 3: 0 },
    wrong: 0,
    hints: { 1: 0, 2: 0, 3: 0 },
    discovered: new Set(),
    date: { month: null, day: null },
    dateSolved: false,
    kitchenOpenTimer: 0,
    startTime: 0,
    elapsed: 0,
    timerId: null,
    running: false,
    transitioning: false,
    sound: true,
    best: null,
    confettiRaf: 0,
    toastTimer: 0
  };

  let audioCtx = null;

  const el = {
    screens: {
      landing: $("#screen-landing"),
      game: $("#screen-game"),
      final: $("#screen-final")
    },
    brandBtn: $("#brand-btn"),
    soundBtn: $("#sound-btn"),
    restartBtn: $("#restart-btn"),
    startBtn: $("#start-btn"),
    topbarNote: $("#topbar-note"),
    bestRecord: $("#best-record"),
    timer: $("#timer"),
    lockCount: $("#lock-count"),
    steps: $$(".step"),
    screenGame: $("#screen-game"),
    levels: { 1: $("#level-1"), 2: $("#level-2"), 3: $("#level-3") },
    levelTitles: {
      1: $("#level-1-title"),
      2: $("#level-2-title"),
      3: $("#level-3-title")
    },
    equations: $("#equations"),
    equationCard: $("#equation-card"),
    targetExpression: $("#target-expression"),
    mathForm: $("#math-form"),
    mathInput: $("#math-answer"),
    mathFeedback: $("#math-feedback"),
    mathSubmit: $("#math-form button[type=submit]"),
    hotspots: $$(".hotspot"),
    clueRows: $$("#clue-list li"),
    clueCount: $("#clue-count"),
    notebook: $(".notebook"),
    notebookTip: $("#notebook-tip"),
    roomOrderInline: $("#room-order-inline"),
    roomOrderPaper: $("#room-order-paper"),
    roomBookNumeral: $("#room-book-numeral"),
    roomBirds: $$(".room-bird"),
    roomMarbles: $$(".room-marble"),
    roomHourHand: $("#room-hour-hand"),
    roomForm: $("#room-form"),
    codeInputs: $$("#code-inputs .code-digit"),
    codeInputsWrap: $("#code-inputs"),
    roomFeedback: $("#room-feedback"),
    roomSubmit: $("#room-form button[type=submit]"),
    inviteProduct: $("#invite-product"),
    inviteSum: $("#invite-sum"),
    monthTabs: $("#month-tabs"),
    dayGrid: $("#day-grid"),
    dateForm: $("#date-form"),
    dateFeedback: $("#date-feedback"),
    dateReadout: $("#date-readout"),
    readoutMonth: $("#readout-month"),
    readoutDay: $("#readout-day"),
    dateSubmit: $("#date-form button[type=submit]"),
    level3Panel: $("#level-3 .level-panel"),
    kitchenLaunch: $("#kitchen-launch"),
    kitchenLaunchDate: $("#kitchen-launch-date"),
    openKitchenBtn: $("#open-kitchen-btn"),
    passage: $("#passage"),
    passageKicker: $("#passage-kicker"),
    passageNumeral: $("#passage-numeral"),
    passageTitle: $("#passage-title"),
    passageNext: $("#passage-next"),
    finalTitle: $("#final-title"),
    statTime: $("#stat-time"),
    statWrong: $("#stat-wrong"),
    statHints: $("#stat-hints"),
    finalRank: $("#final-rank"),
    finalBest: $("#final-best"),
    replayBtn: $("#replay-btn"),
    shareBtn: $("#share-btn"),
    confetti: $("#confetti"),
    toast: $("#toast")
  };

  /* ───────────────────────── storage helpers ───────────────────────── */

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* A blocked storage should never interrupt the game. */
    }
  }

  /* ───────────────────────── utilities ───────────────────────── */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatTime(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  }

  function daysInMonth(month) {
    return new Date(2026, month, 0).getDate();
  }

  function totalHints() {
    return state.hints[1] + state.hints[2] + state.hints[3];
  }

  function setFeedback(element, text, tone = "") {
    element.textContent = text;
    element.classList.remove("is-success", "is-warn");
    if (tone) element.classList.add(`is-${tone}`);
  }

  function clearFeedback(element) {
    element.textContent = "";
    element.classList.remove("is-success", "is-warn");
  }

  function shake(element) {
    if (!element) return;
    element.classList.remove("is-shaking");
    // Force a reflow so the animation can be replayed on consecutive mistakes.
    void element.offsetWidth;
    element.classList.add("is-shaking");
  }

  function showToast(message, duration = 3200) {
    window.clearTimeout(state.toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      el.toast.classList.remove("is-visible");
    }, duration);
  }

  function focusTitle(level) {
    const title = el.levelTitles[level];
    if (!title) return;
    try {
      title.focus({ preventScroll: true });
    } catch (error) {
      title.focus();
    }
  }

  /* ───────────────────────── sound ───────────────────────── */

  function ensureAudio() {
    if (!state.sound) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      try {
        audioCtx = new AudioContextClass();
      } catch (error) {
        return null;
      }
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function note(context, frequency, start, duration, volume = 0.032, type = "sine", endFrequency = null) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function playSound(kind) {
    if (!state.sound) return;
    const context = ensureAudio();
    if (!context) return;
    const now = context.currentTime + 0.01;

    switch (kind) {
      case "tap":
        note(context, 420, now, 0.08, 0.018, "sine", 330);
        break;
      case "start":
        note(context, 196, now, 0.6, 0.022);
        note(context, 293.66, now + 0.12, 0.7, 0.018);
        note(context, 392, now + 0.28, 0.9, 0.015);
        break;
      case "found":
        note(context, 523.25, now, 0.34, 0.025);
        note(context, 783.99, now + 0.08, 0.42, 0.018);
        break;
      case "hint":
        note(context, 659.25, now, 0.3, 0.016);
        note(context, 987.77, now + 0.09, 0.34, 0.012);
        break;
      case "wrong":
        note(context, 146.83, now, 0.22, 0.028, "triangle", 110);
        note(context, 92.5, now + 0.04, 0.3, 0.025, "sine");
        break;
      case "success":
        note(context, 392, now, 0.5, 0.024);
        note(context, 523.25, now + 0.1, 0.55, 0.024);
        note(context, 659.25, now + 0.2, 0.65, 0.022);
        note(context, 783.99, now + 0.32, 0.9, 0.018);
        break;
      case "door":
        note(context, 65.41, now, 1.1, 0.04, "sine", 49);
        note(context, 130.81, now + 0.08, 0.8, 0.018, "triangle");
        note(context, 196, now + 0.7, 0.75, 0.014);
        break;
      case "complete":
        note(context, 587.33, now, 0.4, 0.018);
        note(context, 880, now + 0.1, 0.5, 0.016);
        break;
      case "win":
        [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((freq, index) => {
          note(context, freq, now + index * 0.13, 1.15, index === 5 ? 0.017 : 0.022);
        });
        note(context, 1046.5, now + 0.86, 1.5, 0.013);
        break;
      default:
        break;
    }
  }

  function setSound(enabled, announce = false) {
    state.sound = Boolean(enabled);
    document.body.classList.toggle("is-sound-off", !state.sound);
    el.soundBtn.setAttribute("aria-pressed", String(state.sound));
    el.soundBtn.setAttribute("aria-label", T(state.sound ? "關閉音效" : "開啟音效", state.sound ? "Mute sound" : "Unmute sound"));
    el.soundBtn.title = T(state.sound ? "關閉音效" : "開啟音效", state.sound ? "Mute sound" : "Unmute sound");
    storageSet(STORAGE.sound, state.sound);
    if (state.sound && announce) {
      // Resume the context inside the user gesture.
      ensureAudio();
      playSound("tap");
    }
  }

  /* ───────────────────────── screens & timer ───────────────────────── */

  function showScreen(name) {
    Object.entries(el.screens).forEach(([key, node]) => {
      node.hidden = key !== name;
    });
    document.body.dataset.screen = name;
    el.restartBtn.hidden = name !== "game";

    if (name === "landing") {
      el.topbarNote.textContent = T("一場合乎好奇心的夜遊", "An evening for the curious");
      renderBestRecord();
    } else if (name === "game") {
      el.topbarNote.textContent = T(`第 ${state.level} 關 · ${LEVELS[state.level].room}`, `Chapter ${state.level} · ${LEVELS[state.level].roomEn}`);
    } else if (name === "final") {
      el.topbarNote.textContent = T("三道門，皆已開啟", "All three gates are open");
    }
  }

  function startTimer() {
    stopTimer();
    state.startTime = Date.now();
    state.elapsed = 0;
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 500);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimer() {
    state.elapsed = Math.max(0, Date.now() - state.startTime);
    const formatted = formatTime(state.elapsed);
    el.timer.textContent = formatted;
    const totalSeconds = Math.floor(state.elapsed / 1000);
    el.timer.setAttribute(
      "datetime",
      `PT${Math.floor(totalSeconds / 60)}M${totalSeconds % 60}S`
    );
  }

  function showLevel(level) {
    state.level = level;
    Object.entries(el.levels).forEach(([key, node]) => {
      node.hidden = Number(key) !== level;
    });
    el.screenGame.dataset.level = String(level);

    el.steps.forEach((step) => {
      const stepLevel = Number(step.dataset.step);
      const isCurrent = stepLevel === level;
      const isDone = stepLevel < level;
      step.classList.toggle("is-current", isCurrent);
      step.classList.toggle("is-done", isDone);
      if (isCurrent) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });

    el.lockCount.textContent = `${level} / 3`;
    el.topbarNote.textContent = T(`第 ${level} 關 · ${LEVELS[level].room}`, `Chapter ${level} · ${LEVELS[level].roomEn}`);

    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(() => focusTitle(level), 360);
  }

  function openPassage(nextLevel) {
    if (state.transitioning) return;
    state.transitioning = true;

    const from = state.level;
    const info = LEVELS[from];
    el.passageKicker.textContent = `GATE ${info.roman} · OPEN`;
    el.passageNumeral.textContent = info.roman;
    el.passageTitle.textContent = T(`${info.cn}道門，開了`, `The ${info.ordinalEn} gate is open`);
    el.passageNext.textContent = nextLevel
      ? T(`下一關 · ${LEVELS[nextLevel].name}`, `Next · ${LEVELS[nextLevel].nameEn}`)
      : T("終點 · 三關皆開", "Final · All three gates open");

    playSound("door");
    el.passage.classList.remove("is-leaving");
    el.passage.classList.add("is-active");

    window.setTimeout(() => {
      if (nextLevel) {
        showLevel(nextLevel);
      } else {
        finishGame();
      }

      el.passage.classList.add("is-leaving");
      window.setTimeout(() => {
        el.passage.classList.remove("is-active", "is-leaving");
        state.transitioning = false;
      }, 460);
    }, 1680);
  }

  /* ───────────────────────── game lifecycle ───────────────────────── */

  function startGame() {
    stopTimer();
    stopConfetti();
    el.passage.classList.remove("is-active", "is-leaving");
    state.transitioning = false;
    window.clearTimeout(state.kitchenOpenTimer);
    state.kitchenOpenTimer = 0;
    state.dateSolved = false;
    if (el.level3Panel) el.level3Panel.classList.remove("is-date-solved");
    if (el.kitchenLaunch) el.kitchenLaunch.hidden = true;
    if (window.BirthdayKitchen) {
      window.BirthdayKitchen.close(true);
      window.BirthdayKitchen.reset();
    }

    state.math = makeMathPuzzle(state.math);
    state.room = makeRoomPuzzle(state.room);
    state.roomClues = buildRoomClues(state.room);
    applyRoomPuzzle(state.room);
    state.birthday = makeBirthdayPuzzle(state.birthday);
    applyBirthdayPuzzle(state.birthday);
    state.solved = { 1: false, 2: false, 3: false };
    state.attempts = { 1: 0, 2: 0, 3: 0 };
    state.wrong = 0;
    state.hints = { 1: 0, 2: 0, 3: 0 };
    state.discovered = new Set();
    state.date = { month: null, day: null };
    state.running = true;

    renderMathPuzzle();
    resetMathUI();
    resetRoomUI();
    resetDateUI();
    resetHints();

    showScreen("game");
    showLevel(1);
    startTimer();
    playSound("start");
  }

  function returnHome() {
    stopTimer();
    stopConfetti();
    window.clearTimeout(state.kitchenOpenTimer);
    state.kitchenOpenTimer = 0;
    if (window.BirthdayKitchen) window.BirthdayKitchen.close(true);
    state.dateSolved = false;
    if (el.level3Panel) el.level3Panel.classList.remove("is-date-solved");
    if (el.kitchenLaunch) el.kitchenLaunch.hidden = true;
    el.passage.classList.remove("is-active", "is-leaving");
    state.transitioning = false;
    state.running = false;
    showScreen("landing");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function finishGame() {
    stopTimer();
    state.elapsed = Math.max(0, Date.now() - state.startTime);
    state.running = false;

    const hints = totalHints();
    const formatted = formatTime(state.elapsed);
    el.statTime.textContent = formatted;
    el.statWrong.textContent = String(state.wrong);
    el.statHints.textContent = String(hints);
    el.finalRank.textContent = rankFor(state.wrong, hints);

    const previousBest = state.best;
    const isNewBest = !previousBest || !Number.isFinite(previousBest.ms) || state.elapsed < previousBest.ms;

    if (isNewBest) {
      state.best = {
        ms: state.elapsed,
        wrong: state.wrong,
        hints,
        at: new Date().toISOString()
      };
      storageSet(STORAGE.best, state.best);
    }

    el.finalBest.textContent = isNewBest
      ? T(`新紀錄 · ${formatted}`, `New record · ${formatted}`)
      : T(`最佳紀錄 · ${formatTime(state.best.ms)}`, `Best · ${formatTime(state.best.ms)}`);
    if (state.best && state.best.at) {
      const date = new Date(state.best.at);
      if (!Number.isNaN(date.getTime())) {
        const dateText = date.toLocaleDateString(EN ? "en-HK" : "zh-Hant-TW");
        el.finalBest.title = T(`紀錄於 ${dateText}`, `Recorded on ${dateText}`);
      }
    }

    showScreen("final");
    window.scrollTo({ top: 0, behavior: "auto" });
    playSound("win");
    window.setTimeout(() => {
      startConfetti();
      try {
        el.finalTitle.focus({ preventScroll: true });
      } catch (error) {
        el.finalTitle.focus();
      }
    }, 760);
  }

  function rankFor(wrong, hints) {
    if (wrong === 0 && hints === 0) return T("完美破題者", "The flawless solver");
    if (wrong <= 2 && hints <= 1) return T("謎城解謎大師", "Master of the gates");
    if (wrong <= 4 && hints <= 3) return T("冷靜的破題者", "The calm solver");
    return T("堅持到底的旅人", "The persistent wanderer");
  }

  function renderBestRecord() {
    if (state.best && Number.isFinite(state.best.ms)) {
      el.bestRecord.textContent = T(`最佳紀錄 · ${formatTime(state.best.ms)}`, `Best · ${formatTime(state.best.ms)}`);
      const date = state.best.at ? new Date(state.best.at) : null;
      if (date && !Number.isNaN(date.getTime())) {
        const dateText = date.toLocaleDateString(EN ? "en-HK" : "zh-Hant-TW");
        el.bestRecord.title = T(`通關於 ${dateText}`, `Completed on ${dateText}`);
      }
    } else {
      el.bestRecord.textContent = T("尚未留下通關紀錄", "No completed run yet");
      el.bestRecord.removeAttribute("title");
    }
  }

  /* ───────────────────────── level 1 · math ───────────────────────── */

  function iconTerm(icon, label) {
    return `<span class="term" role="img" aria-label="${label}"><svg class="icon" aria-hidden="true"><use href="#i-${icon}"></use></svg></span>`;
  }

  function operator(symbol) {
    return `<span class="op" aria-hidden="true">${symbol}</span>`;
  }

  function equationRow(content, value, accessibleLabel) {
    return `<div class="equation" role="group" aria-label="${accessibleLabel}"><span class="terms">${content}</span><span class="value">${value}</span></div>`;
  }

  function renderMathPuzzle() {
    const puzzle = state.math;
    const gear = iconTerm("gear", T("齒輪", "Gear"));
    const key = iconTerm("key", T("鑰匙", "Key"));
    const candle = iconTerm("candle", T("蠟燭", "Candle"));

    el.equations.innerHTML = [
      equationRow(
        `${gear}${operator("+")}${gear}${operator("+")}${gear}`,
        puzzle.sum1,
        T(`齒輪加齒輪加齒輪等於${puzzle.sum1}`, `Gear plus gear plus gear equals ${puzzle.sum1}`)
      ),
      equationRow(
        `${gear}${operator("+")}${key}${operator("+")}${key}`,
        puzzle.sum2,
        T(`齒輪加鑰匙加鑰匙等於${puzzle.sum2}`, `Gear plus key plus key equals ${puzzle.sum2}`)
      ),
      equationRow(
        `${key}${operator("−")}${candle}`,
        puzzle.diff,
        T(`鑰匙減蠟燭等於${puzzle.diff}`, `Key minus candle equals ${puzzle.diff}`)
      )
    ].join("");

    el.targetExpression.innerHTML = `${candle}${operator("+")}${gear}${operator("×")}${key}`;
    el.targetExpression.setAttribute("aria-label", T("蠟燭加齒輪乘以鑰匙，等於多少", "Candle plus gear times key. What is the result?"));
  }

  function resetMathUI() {
    el.mathInput.value = "";
    el.mathInput.disabled = false;
    el.mathSubmit.disabled = false;
    el.equationCard.classList.remove("is-shaking");
    clearFeedback(el.mathFeedback);
    el.mathForm.classList.remove("is-shaking");
  }

  el.mathInput.addEventListener("input", () => {
    el.mathInput.value = el.mathInput.value.replace(/\D/g, "").slice(0, 4);
  });

  el.mathForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.transitioning || state.solved[1]) return;

    const raw = el.mathInput.value.trim();
    if (!raw) {
      state.attempts[1] += 1;
      setFeedback(el.mathFeedback, T("先寫下一個整數答案，齒輪才會轉動。", "Write an integer answer first; the gears will not turn otherwise."), "warn");
      shake(el.equationCard);
      el.mathInput.focus();
      playSound("wrong");
      return;
    }

    const value = Number(raw);
    if (value === state.math.answer) {
      state.solved[1] = true;
      el.mathInput.disabled = true;
      el.mathSubmit.disabled = true;
      setFeedback(el.mathFeedback, T("齒輪重新咬合。第一道門，開了。", "The gears mesh again. The first gate is open."), "success");
      playSound("success");
      window.setTimeout(() => openPassage(2), 900);
      return;
    }

    state.attempts[1] += 1;
    state.wrong += 1;
    setFeedback(
      el.mathFeedback,
      WRONG_MESSAGES[1][Math.min(state.attempts[1] - 1, WRONG_MESSAGES[1].length - 1)]
    );
    shake(el.equationCard);
    el.mathInput.select();
    el.mathInput.focus();
    playSound("wrong");
  });

  /* ───────────────────────── level 2 · escape room ───────────────────────── */

  function applyRoomPuzzle(room) {
    if (!room) return;
    if (el.roomOrderInline) {
      el.roomOrderInline.textContent = roomOrderText(room.order, EN ? ", " : "、");
    }
    if (el.roomOrderPaper) {
      el.roomOrderPaper.textContent = roomOrderText(room.order, "→");
    }
    if (el.roomBookNumeral) {
      el.roomBookNumeral.textContent = toRoman(room.book);
    }
    el.roomBirds.forEach((bird, index) => {
      bird.style.display = index < room.birds ? "" : "none";
    });
    el.roomMarbles.forEach((marble, index) => {
      marble.style.display = index < room.marbles ? "" : "none";
    });
    if (el.roomHourHand) {
      el.roomHourHand.setAttribute("transform", `rotate(${room.hour * 30} 742 394)`);
    }
  }

  function applyBirthdayPuzzle(birthday) {
    if (!birthday) return;
    if (el.inviteProduct) el.inviteProduct.textContent = String(birthday.product);
    if (el.inviteSum) el.inviteSum.textContent = String(birthday.sum);
  }

  function resetRoomUI() {
    state.discovered.clear();
    el.hotspots.forEach((hotspot) => {
      hotspot.classList.remove("is-found");
      hotspot.setAttribute("aria-pressed", "false");
    });
    el.clueRows.forEach((row) => {
      row.classList.remove("is-found");
      const text = $(".clue-text", row);
      if (text) text.textContent = T("尚未調查", "Not yet inspected");
    });
    el.clueCount.textContent = "0 / 4";
    el.notebook.classList.remove("is-complete");
    el.notebookTip.textContent = T(
      "點亮場景中的四個放大鏡。密碼順序，以桌上的紙條為準。",
      "Click the four magnifiers in the scene. The order is on the desk note."
    );
    el.codeInputs.forEach((input) => {
      input.value = "";
      input.disabled = false;
    });
    el.roomSubmit.disabled = false;
    el.roomForm.classList.remove("is-shaking");
    clearFeedback(el.roomFeedback);
  }

  function updateClueProgress() {
    const found = state.discovered.size;
    el.clueCount.textContent = `${found} / 4`;
    const complete = found === 4;
    el.notebook.classList.toggle("is-complete", complete);

    if (complete) {
      el.notebookTip.textContent = T(
        "四條線索都齊了。桌上的紙條，是最後一把鑰匙。",
        "All four clues are in. The desk note is the last key."
      );
      showToast(T(
        "四條線索都齊了。現在，把數字依序排成四位數。",
        "All four clues are in. Put the digits in order to form the code."
      ), 3800);
      playSound("complete");
    }
  }

  function inspectClue(id) {
    const clue = state.roomClues && state.roomClues[id];
    const hotspot = el.hotspots.find((item) => item.dataset.clue === id);
    if (!clue || !hotspot) return;

    if (state.discovered.has(id)) {
      showToast(`${clue.name}：${clue.text}`, 3600);
      playSound("tap");
      return;
    }

    state.discovered.add(id);
    hotspot.classList.add("is-found");
    hotspot.setAttribute("aria-pressed", "true");
    const row = el.clueRows.find((item) => item.dataset.clueRow === id);
    if (row) {
      row.classList.add("is-found");
      const text = $(".clue-text", row);
      if (text) text.textContent = clue.text;
    }
    showToast(clue.toast, 3400);
    playSound("found");
    updateClueProgress();
  }

  el.hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => inspectClue(hotspot.dataset.clue));
  });

  function fillCode(text, startIndex = 0) {
    const digits = text.replace(/\D/g, "").slice(0, 4 - startIndex);
    digits.split("").forEach((digit, offset) => {
      const input = el.codeInputs[startIndex + offset];
      if (input) input.value = digit;
    });
    const nextEmpty = el.codeInputs.find((input) => !input.value);
    if (nextEmpty) {
      nextEmpty.focus();
    } else {
      el.codeInputs[el.codeInputs.length - 1].focus();
    }
  }

  el.codeInputs.forEach((input, index) => {
    input.addEventListener("focus", () => input.select());

    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "");
      if (!digits) {
        input.value = "";
        return;
      }
      if (digits.length > 1) {
        fillCode(digits, 0);
        return;
      }
      input.value = digits;
      if (input.value && el.codeInputs[index + 1]) {
        el.codeInputs[index + 1].focus();
        el.codeInputs[index + 1].select();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        event.preventDefault();
        const previous = el.codeInputs[index - 1];
        previous.value = "";
        previous.focus();
        previous.select();
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        el.codeInputs[index - 1].focus();
      } else if (event.key === "ArrowRight" && index < el.codeInputs.length - 1) {
        event.preventDefault();
        el.codeInputs[index + 1].focus();
      }
    });
  });

  el.codeInputsWrap.addEventListener("paste", (event) => {
    const clipboard = event.clipboardData || window.clipboardData;
    if (!clipboard) return;
    const text = clipboard.getData("text");
    const digits = text.replace(/\D/g, "");
    if (!digits) return;
    event.preventDefault();
    fillCode(digits, 0);
  });

  el.roomForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.transitioning || state.solved[2]) return;

    const code = el.codeInputs.map((input) => input.value).join("");
    if (code.length < 4) {
      setFeedback(el.roomFeedback, T("門鎖需要四個數字。再把紙條讀一遍。", "The lock needs four digits. Read the note once more."), "warn");
      shake(el.codeInputsWrap);
      const empty = el.codeInputs.find((input) => !input.value);
      if (empty) empty.focus();
      playSound("wrong");
      return;
    }

    if (code === state.room.code) {
      state.solved[2] = true;
      el.codeInputs.forEach((input) => {
        input.disabled = true;
      });
      el.roomSubmit.disabled = true;
      setFeedback(el.roomFeedback, T("鎖芯轉到底。門，開了。", "The lock turns all the way. The door is open."), "success");
      playSound("success");
      window.setTimeout(() => openPassage(3), 900);
      return;
    }

    state.attempts[2] += 1;
    state.wrong += 1;
    setFeedback(
      el.roomFeedback,
      WRONG_MESSAGES[2][Math.min(state.attempts[2] - 1, WRONG_MESSAGES[2].length - 1)]
    );
    shake(el.codeInputsWrap);
    el.codeInputs.forEach((input) => input.select());
    el.codeInputs[0].focus();
    playSound("wrong");
  });

  /* ───────────────────────── level 3 · birthday ───────────────────────── */

  function buildMonthTabs() {
    el.monthTabs.innerHTML = "";
    for (let month = 1; month <= 12; month += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "month-tab";
      button.dataset.month = String(month);
      button.textContent = EN ? MONTHS_SHORT_EN[month - 1] : `${month}月`;
      button.setAttribute("aria-pressed", "false");
      el.monthTabs.appendChild(button);
    }
  }

  function renderMonthTabs() {
    $$(".month-tab", el.monthTabs).forEach((button) => {
      const selected = Number(button.dataset.month) === state.date.month;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderDayGrid() {
    el.dayGrid.innerHTML = "";
    const month = state.date.month;

    if (!month) {
      const empty = document.createElement("p");
      empty.className = "day-empty-state";
      empty.textContent = T("先選一個月份", "Choose a month first");
      el.dayGrid.appendChild(empty);
      return;
    }

    (EN ? WEEKDAYS_EN : ["日", "一", "二", "三", "四", "五", "六"]).forEach((weekday) => {
      const label = document.createElement("span");
      label.className = "day-weekday";
      label.textContent = weekday;
      label.setAttribute("aria-hidden", "true");
      el.dayGrid.appendChild(label);
    });

    const offset = new Date(2026, month - 1, 1).getDay();
    for (let blank = 0; blank < offset; blank += 1) {
      const spacer = document.createElement("span");
      spacer.className = "day-empty";
      spacer.setAttribute("aria-hidden", "true");
      el.dayGrid.appendChild(spacer);
    }

    const total = daysInMonth(month);
    for (let day = 1; day <= total; day += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-btn";
      button.dataset.day = String(day);
      button.textContent = String(day);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", EN ? `${MONTHS_EN[month - 1]} ${day}` : `${month} 月 ${day} 日`);
      button.classList.toggle("is-selected", state.date.day === day);
      button.setAttribute("aria-pressed", String(state.date.day === day));
      el.dayGrid.appendChild(button);
    }
  }

  function updateDateReadout() {
    const { month, day } = state.date;
    el.readoutMonth.textContent = month ? (EN ? MONTHS_EN[month - 1] : String(month)) : "—";
    el.readoutDay.textContent = day ? String(day) : "—";
    el.dateReadout.setAttribute(
      "aria-label",
      EN
        ? month
          ? day
            ? `Selected ${MONTHS_EN[month - 1]} ${day}`
            : `Selected ${MONTHS_EN[month - 1]}, no day chosen`
          : "No date selected"
        : month
          ? day
            ? `已選擇 ${month} 月 ${day} 日`
            : `已選擇 ${month} 月，尚未選日期`
          : "尚未選擇日期"
    );
  }

  function selectMonth(month) {
    state.date.month = month;
    if (state.date.day && state.date.day > daysInMonth(month)) {
      state.date.day = null;
    }
    renderMonthTabs();
    renderDayGrid();
    updateDateReadout();
    clearFeedback(el.dateFeedback);
    playSound("tap");
  }

  function selectDay(day) {
    state.date.day = day;
    $$(".day-btn", el.dayGrid).forEach((button) => {
      const selected = Number(button.dataset.day) === day;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateDateReadout();
    clearFeedback(el.dateFeedback);
    playSound("tap");
  }

  function resetDateUI() {
    state.date = { month: null, day: null };
    $$(".month-tab", el.monthTabs).forEach((button) => {
      button.disabled = false;
    });
    renderMonthTabs();
    renderDayGrid();
    updateDateReadout();
    el.dateSubmit.disabled = false;
    el.dateForm.classList.remove("is-shaking");
    clearFeedback(el.dateFeedback);
  }

  el.monthTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".month-tab");
    if (!button || button.disabled) return;
    selectMonth(Number(button.dataset.month));
  });

  el.dayGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".day-btn");
    if (!button || button.disabled) return;
    selectDay(Number(button.dataset.day));
  });

  el.dateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.transitioning || state.solved[3] || state.dateSolved) return;

    const { month, day } = state.date;
    if (!month || !day) {
      setFeedback(el.dateFeedback, T("先在日曆上選出月份和日期。", "Choose a month and a day first."), "warn");
      shake(el.dateForm);
      playSound("wrong");
      return;
    }

    if (month === state.birthday.month && day === state.birthday.day) {
      state.dateSolved = true;
      $$(".month-tab", el.monthTabs).forEach((button) => {
        button.disabled = true;
      });
      $$(".day-btn", el.dayGrid).forEach((button) => {
        button.disabled = true;
      });
      el.dateSubmit.disabled = true;
      if (el.level3Panel) el.level3Panel.classList.add("is-date-solved");
      if (el.kitchenLaunch) el.kitchenLaunch.hidden = false;
      if (el.kitchenLaunchDate) {
        el.kitchenLaunchDate.textContent = formatDateLabel(state.birthday.month, state.birthday.day);
      }
      setFeedback(el.dateFeedback, T("邀請函上的日期，已經寫好了。", "The date is written on the invitation."), "success");
      playSound("success");
      window.clearTimeout(state.kitchenOpenTimer);
      state.kitchenOpenTimer = window.setTimeout(openKitchen, 1100);
      return;
    }

    state.attempts[3] += 1;
    state.wrong += 1;
    setFeedback(
      el.dateFeedback,
      WRONG_MESSAGES[3][Math.min(state.attempts[3] - 1, WRONG_MESSAGES[3].length - 1)]
    );
    shake(el.dateForm);
    playSound("wrong");
  });

  /* ───────────────────────── level 3 · the birthday kitchen ───────────────────────── */

  function cakeRecipeFor(birthday) {
    return {
      berries: 3 + (birthday.month % 3),
      candles: 3 + (birthday.day % 3)
    };
  }

  function handleKitchenEvent(type) {
    if (type === "mix" || type === "decorate" || type === "bake") {
      playSound("tap");
    } else if (type === "mixDone") {
      playSound("hint");
    } else if (type === "bakeDone" || type === "complete") {
      playSound("success");
    }
  }

  function openKitchen() {
    window.clearTimeout(state.kitchenOpenTimer);
    state.kitchenOpenTimer = 0;
    if (!state.dateSolved || state.solved[3] || state.transitioning) return;
    if (window.BirthdayKitchen && window.BirthdayKitchen.isOpen()) return;

    if (!window.BirthdayKitchen) {
      setFeedback(el.dateFeedback, T("廚房暫時無法載入。日期已找到，正在前往終點。", "The kitchen could not load. The date is found; moving on to the finale."), "warn");
      window.setTimeout(() => openPassage(null), 600);
      return;
    }

    const kitchenDate = formatDateLabel(state.birthday.month, state.birthday.day);
    window.BirthdayKitchen.open({
      recipe: cakeRecipeFor(state.birthday),
      dateLabel: kitchenDate,
      onEvent: handleKitchenEvent,
      onClose: () => {
        showToast(T("蛋糕還沒完成。隨時可以回到廚房。", "The cake is not finished yet. Come back to the kitchen any time."), 3200);
      },
      onComplete: () => {
        state.solved[3] = true;
        setFeedback(el.dateFeedback, T("蛋糕完成。第三道門，開了。", "The cake is finished. The third gate is open."), "success");
        openPassage(null);
      }
    });
  }

  el.openKitchenBtn?.addEventListener("click", openKitchen);

  /* ───────────────────────── hints ───────────────────────── */

  function hintBlock(level) {
    return $(`.hint-block[data-hint-level="${level}"]`);
  }

  function resetHints() {
    [1, 2, 3].forEach((level) => {
      state.hints[level] = 0;
      const block = hintBlock(level);
      if (!block) return;
      const button = $(".hint-toggle", block);
      const drawer = $(".hint-drawer", block);
      const count = $(".hint-count", block);
      if (button) {
        button.disabled = false;
        button.classList.remove("is-exhausted");
        button.setAttribute("aria-expanded", "false");
      }
      if (drawer) {
        drawer.innerHTML = "";
        drawer.hidden = true;
      }
      if (count) count.textContent = "0 / 2";
    });
  }

  [1, 2, 3].forEach((level) => {
    const block = hintBlock(level);
    if (!block) return;
    const button = $(".hint-toggle", block);
    const drawer = $(".hint-drawer", block);
    const count = $(".hint-count", block);

    button.addEventListener("click", () => {
      if (state.hints[level] >= 2 || state.transitioning) return;
      const index = state.hints[level];
      const hint = HINTS[level][index];
      const text = typeof hint === "function" ? hint() : hint;

      state.hints[level] += 1;
      const item = document.createElement("div");
      item.className = "hint-item";
      const label = document.createElement("strong");
      label.textContent = `HINT ${String(index + 1).padStart(2, "0")}`;
      const copy = document.createElement("span");
      copy.textContent = text;
      item.append(label, copy);
      drawer.appendChild(item);
      drawer.hidden = false;
      count.textContent = `${state.hints[level]} / 2`;
      button.setAttribute("aria-expanded", "true");
      playSound("hint");

      if (state.hints[level] >= 2) {
        button.disabled = true;
        button.classList.add("is-exhausted");
      }
    });
  });

  /* ───────────────────────── confetti ───────────────────────── */

  function stopConfetti() {
    if (state.confettiRaf) {
      cancelAnimationFrame(state.confettiRaf);
      state.confettiRaf = 0;
    }
    const context = el.confetti.getContext("2d");
    if (context) context.clearRect(0, 0, el.confetti.width, el.confetti.height);
  }

  function startConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stopConfetti();
    const canvas = el.confetti;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#d7a85b", "#f0d39a", "#b66f66", "#5d9e8d", "#f3e8d2", "#8b6430"];
    const pieces = Array.from({ length: 150 }, () => {
      return {
        x: Math.random() * rect.width,
        y: -20 - Math.random() * rect.height * 0.55,
        vx: (Math.random() - 0.5) * 55,
        vy: 38 + Math.random() * 95,
        width: 3 + Math.random() * 6,
        height: 6 + Math.random() * 10,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        sway: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2
      };
    });

    const startedAt = performance.now();
    const duration = 7000;
    let last = startedAt;

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const progress = now - startedAt;
      const fade = progress > duration - 1200 ? Math.max(0, (duration - progress) / 1200) : 1;
      context.clearRect(0, 0, rect.width, rect.height);
      context.globalAlpha = fade;

      pieces.forEach((piece) => {
        piece.phase += dt * piece.sway;
        piece.x += piece.vx * dt + Math.sin(piece.phase) * 18 * dt;
        piece.y += piece.vy * dt;
        piece.rotation += piece.spin * dt;

        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        context.restore();
      });

      context.globalAlpha = 1;

      if (progress < duration) {
        state.confettiRaf = requestAnimationFrame(frame);
      } else {
        context.clearRect(0, 0, rect.width, rect.height);
        state.confettiRaf = 0;
      }
    }

    state.confettiRaf = requestAnimationFrame(frame);
  }

  /* ───────────────────────── share ───────────────────────── */

  function shareText() {
    const formatted = formatTime(state.elapsed);
    if (EN) {
      return [
        "I completed The Three Gates.",
        `Time ${formatted} · Mistakes ${state.wrong} · Hints ${totalHints()}`,
        "Three gates. Three riddles. Only the right answer opens the way."
      ].join("\n");
    }
    return [
      "我在《三關謎城》通關了。",
      `用時 ${formatted} · 錯誤 ${state.wrong} 次 · 提示 ${totalHints()} 次`,
      "三道門，三種謎。答對，門才會開。"
    ].join("\n");
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  async function copyResult() {
    const text = shareText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast(T("通關成績已複製。去炫耀一下吧。", "Result copied. Go and show it off."), 2800);
        playSound("tap");
        return;
      }
    } catch (error) {
      /* fall through to the older clipboard path */
    }

    if (fallbackCopy(text)) {
      showToast(T("通關成績已複製。去炫耀一下吧。", "Result copied. Go and show it off."), 2800);
    } else {
      showToast(T(
        "複製失敗。成績是：用時 " + formatTime(state.elapsed) + "。",
        "Copy failed. Your result: " + formatTime(state.elapsed) + "."
      ), 4200);
    }
    playSound("tap");
  }

  /* ───────────────────────── events ───────────────────────── */

  el.startBtn.addEventListener("click", () => {
    ensureAudio();
    startGame();
  });

  el.restartBtn.addEventListener("click", () => {
    startGame();
  });

  el.brandBtn.addEventListener("click", () => {
    if (document.body.dataset.screen === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    returnHome();
  });

  el.replayBtn.addEventListener("click", () => {
    startGame();
  });

  el.shareBtn.addEventListener("click", copyResult);

  el.soundBtn.addEventListener("click", () => {
    setSound(!state.sound, true);
  });

  window.addEventListener("resize", () => {
    if (state.confettiRaf) {
      stopConfetti();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.running) {
      updateTimer();
    }
  });

  /* ───────────────────────── boot ───────────────────────── */

  function init() {
    const storedSound = storageGet(STORAGE.sound, true);
    setSound(storedSound !== false, false);

    const best = storageGet(STORAGE.best, null);
    if (best && Number.isFinite(best.ms)) {
      state.best = best;
    }

    state.math = makeMathPuzzle();
    state.room = makeRoomPuzzle();
    state.roomClues = buildRoomClues(state.room);
    applyRoomPuzzle(state.room);
    state.birthday = makeBirthdayPuzzle();
    applyBirthdayPuzzle(state.birthday);

    renderMathPuzzle();
    buildMonthTabs();
    renderMonthTabs();
    renderDayGrid();
    updateDateReadout();
    resetHints();
    renderBestRecord();
    showScreen("landing");
  }

  init();
})();
