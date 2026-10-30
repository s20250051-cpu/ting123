/* ══════════════════════════════════════════════════════════════════
   Game page language bootstrap
   Traditional Chinese is the source language. English is applied to
   static copy before app.js starts; app.js and kitchen.js use window.LT.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const STORAGE_KEY = "threeGates.lang";
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    stored = null;
  }
  const browser = (navigator.language || "zh-Hant").toLowerCase();
  const language = (queryLang && queryLang.toLowerCase().startsWith("en")) ||
    (!queryLang && stored === "en") ||
    (!queryLang && !stored && !browser.startsWith("zh"))
    ? "en" : "zh-Hant";
  const EN = language === "en";

  window.GAME_LANG = language;
  window.LT = (zh, en) => (EN ? en : zh);

  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch (error) {
    /* noop */
  }

  const MAP = {
    "三關謎城 · 答對才過關": "The Three Gates · Only the right answer opens the way",
    "回到城門": "Back to the gates",
    "返回網站": "Back to site",
    "一場合乎好奇心的夜遊": "An evening for the curious",
    "關閉音效": "Mute sound",
    "開啟音效": "Unmute sound",
    "重新開始": "Restart",
    "三關解謎 · 答對才過關": "A three-gate puzzle · Only correct answers open doors",
    "三道門，三種謎。": "Three gates. Three riddles.",
    "走進鐘樓、無聲書房，與一場沒有日期的生日。": "Enter a clock tower, a silent study, and a birthday with no date.",
    "答對，門才會開。": "Only the right answer opens the door.",
    "推開第一道門": "Open the first gate",
    "3 道關卡 · 每局重新出題": "3 chapters · A new puzzle every run",
    "尚未留下通關紀錄": "No completed run yet",
    "三道關卡": "Three chapters",
    "數學題": "Mathematics",
    "齒輪鐘樓": "The Clockwork Tower",
    "密室逃脫": "Escape Room",
    "無聲書房": "The Silent Study",
    "生日謎題": "Birthday Riddle",
    "3D 生日廚房": "3D Birthday Kitchen",
    "謎城開放時間 · 任何你想動腦的時刻": "The city is open · whenever curiosity calls",
    "耳機效果更佳": "Headphones recommended",
    "通關進度": "Progress",
    "缺席的日期": "The Missing Date",
    "用時": "Time",
    "深夜的鐘樓，巨大的齒輪與停擺的鐘面在月光下泛著銅光": "A clock tower at night; huge gears and a stopped clock face glowing in moonlight",
    "第一關 · 數學題": "Chapter I · Mathematics",
    "鐘樓的齒輪室": "The Clockwork Chamber",
    "月光之下，時間停了下來。": "Under the moon, time has stopped.",
    "鐘塔停了。三個符號各自代表一個正整數，齒輪咬合著最後一道算式。": "The tower has stopped. Three symbols stand for three positive integers; the gears are locked around one final equation.",
    "解開它，門鎖才會轉動。": "Solve it, and the lock will turn.",
    "齒輪": "Gear",
    "鑰匙": "Key",
    "蠟燭": "Candle",
    "求": "Solve",
    "蠟燭加齒輪乘以鑰匙": "Candle plus gear times key",
    "寫下你的答案": "Write your answer",
    "解鎖齒輪": "Unlock the gears",
    "同一符號代表同一個數字；答案為整數。": "Each symbol is a positive integer. The answer is an integer.",
    "需要一點提示？": "Need a hint?",
    "一間上鎖的舊書房：左邊是窗，中間是書架，右邊掛著畫與一座鐘，下方是書桌和抽屜": "A locked old study: a window on the left, a bookshelf in the middle, a painting and a clock on the right, and a desk with a drawer below",
    "調查書架": "Inspect the bookshelf",
    "書架": "Bookshelf",
    "調查畫作": "Inspect the painting",
    "畫作": "Painting",
    "調查掛鐘": "Inspect the clock",
    "掛鐘": "Clock",
    "調查抽屜": "Inspect the drawer",
    "抽屜": "Drawer",
    "桌上的紙條": "Note on the desk",
    "書→畫→鐘→抽屜": "Book→Painting→Clock→Drawer",
    "四位數": "Four digits",
    "第二關 · 密室逃脫": "Chapter II · Escape Room",
    "門從外面鎖上了。先調查，再離開。": "The door is locked from outside. Search first, then leave.",
    "你在一間上鎖的書房醒來。桌上留著一張紙條：": "You wake in a locked study. A note waits on the desk: ",
    "四位數。依序是：": "Four digits, in this order: ",
    "書、畫、鐘、抽屜": "Book, Painting, Clock, Drawer",
    "調查筆記": "Investigation notes",
    "尚未調查": "Not yet inspected",
    "點亮場景中的四個放大鏡。密碼順序，以桌上的紙條為準。": "Click the four magnifiers in the scene. The order is on the desk note.",
    "四位數密碼": "Four-digit code",
    "密碼第 1 位": "Code digit 1",
    "密碼第 2 位": "Code digit 2",
    "密碼第 3 位": "Code digit 3",
    "密碼第 4 位": "Code digit 4",
    "轉動門鎖": "Turn the lock",
    "一間佈置好的生日宴會廳，桌上有一座插著未點燃蠟燭的蛋糕、禮物和一只沒有寫日期的信封": "A decorated birthday banquet room with a cake with unlit candles, a gift and an undated envelope",
    "第三關 · 生日謎題": "Chapter III · Birthday Riddle",
    "日期是烤箱的鑰匙；蛋糕，還在等你。": "The date is the key to the oven. The cake is waiting.",
    "宴會廳已經佈置好了，蛋糕卻還只是在食譜裡。": "The banquet room is ready, but the cake is still only a recipe.",
    "邀請函沒有日期，只留下兩行數字。先找出日期，再走進廚房完成蛋糕。": "The invitation has no date—only two lines of numbers. Find the date, then step into the kitchen to finish the cake.",
    "致 解謎的人：": "To the puzzle solver:",
    "我的生日，藏在兩個數字裡。": "My birthday is hidden in two numbers.",
    "月份": "Month",
    "日期": "Day",
    "—— 來不及署名的壽星": "— The birthday person, unsigned",
    "選出那個日子": "Choose the date",
    "選擇月份": "Choose month",
    "選擇日期": "Choose day",
    "寫上日期": "Write the date",
    "日期找到了。": "The date is found. ",
    "。廚房已經亮起，最後一道手續是完成生日蛋糕。": ". The kitchen is lit; the last step is to finish the birthday cake.",
    "走進生日廚房": "Enter the birthday kitchen",
    "三關，皆開。": "All three gates are open.",
    "通關": "CLEAR",
    "你讓鐘塔重新轉動、走出了無聲書房，": "You restarted the clock tower and walked out of the silent study,",
    "也替那場生日找到了日期、完成了蛋糕。": "and found a date for the birthday—then finished the cake.",
    "三道門在你身後，靜靜敞開。": "All three gates stand open behind you.",
    "錯誤": "Mistakes",
    "次": "times",
    "提示": "Hints",
    "本次稱號": "Your title",
    "冷靜的破題者": "The calm solver",
    "答案會遲到，但好奇心不會。": "Answers can be late. Curiosity cannot.",
    "再挑戰一次": "Play again",
    "複製通關成績": "Copy result",
    "做一個生日蛋糕": "Make a birthday cake",
    "先回邀請函": "Back to the invitation",
    "可互動的 3D 生日廚房：鋼盆、烤箱、草莓與蠟燭": "Interactive 3D birthday kitchen: mixing bowl, oven, strawberries and candles",
    "預熱廚房…": "Preheating the kitchen…",
    "3D 場景沒有亮起": "The 3D scene did not start",
    "仍可以用旁邊的按鈕完成蛋糕。": "You can still finish the cake with the buttons beside it.",
    "拖曳可轉動視角 · 點擊場景中的物件": "Drag to look around · Click objects in the scene",
    "煮食步驟": "Cooking steps",
    "攪拌": "Mix",
    "烘焙": "Bake",
    "裝飾": "Decorate",
    "把麵糊拌勻": "Mix the batter",
    "點擊場景中的鋼盆，或按下方按鈕。還需要": "Click the mixing bowl in the scene, or use the button below. Still need",
    "下。": "more.",
    "攪拌一下": "Stir once",
    "送進烤箱": "Into the oven",
    "烤箱已經預熱。點擊烤箱，等蛋糕慢慢膨起。": "The oven is preheated. Click it and wait for the cake to rise.",
    "烤箱溫度 180°C": "Oven 180°C",
    "裝飾生日蛋糕": "Decorate the cake",
    "照著食譜，把草莓與蠟燭放上蛋糕。點擊場景，或使用下方按鈕。": "Follow the recipe and place strawberries and candles on the cake. Click the scene, or use the buttons below.",
    "今日食譜": "Today's recipe",
    "草莓": "Strawberries",
    "＋ 草莓": "+ Strawberry",
    "＋ 蠟燭": "+ Candle",
    "完成蛋糕": "Finish the cake",
    "完成蛋糕，第三道門就會打開。": "Finish the cake to open the third gate.",
    "第一道門，開了": "The first gate is open",
    "下一關 · 密室逃脫": "Next · Escape Room",
    "。": ".",
    "，": ",",
    "、": ", ",
    "：": ":"
  };

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      const translated = MAP[trimmed];
      if (!translated) return;
      const leading = raw.match(/^\s*/)[0];
      const trailing = raw.match(/\s*$/)[0];
      node.nodeValue = leading + translated + trailing;
    });
  }

  function translateAttributes(root) {
    root.querySelectorAll("[aria-label], [title], [alt], [placeholder]").forEach((element) => {
      ["aria-label", "title", "alt", "placeholder"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value && MAP[value.trim()]) {
          element.setAttribute(attribute, MAP[value.trim()]);
        }
      });
    });
  }

  function updateLanguageSwitch() {
    document.querySelectorAll("[data-lang-option]").forEach((link) => {
      const isEnglish = link.dataset.langOption === "en";
      const active = isEnglish === EN;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  document.documentElement.lang = language;
  document.documentElement.dataset.gameLang = EN ? "en" : "zh";
  updateLanguageSwitch();

  if (EN) {
    translateTextNodes(document.body);
    translateAttributes(document.body);
    document.title = "The Three Gates · Only the right answer opens the way";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "The Three Gates: a three-act browser puzzle with a mathematics chamber, an escape room and a Three.js birthday kitchen.");
  }
})();
