/* ══════════════════════════════════════════════════════════════════
   三關謎城 · The Three Gates — commercial site behaviour
   Bilingual copy, navigation, reveal animations and FAQ.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const STORAGE_KEY = "threeGates.lang";
  const zh = "zh-Hant";
  const en = "en";

  const titleZh = "三關謎城 · 三道門，三種謎｜The Three Gates";
  const titleEn = "The Three Gates · A three-act browser puzzle";
  const descZh = "三關謎城：一場約 5–10 分鐘的瀏覽器解謎體驗。數學題、密室逃脫、Three.js 3D 生日廚房。三道門，三種謎，答對才過關。";
  const descEn = "The Three Gates: a five-to-ten-minute browser puzzle with mathematics, an escape room and a real-time Three.js birthday kitchen. Only the right answer opens the way.";

  const header = document.getElementById("site-header");
  const navToggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  const langButtons = Array.from(document.querySelectorAll("[data-lang]"));
  const playLinks = Array.from(document.querySelectorAll("[data-play-link]"));
  const records = new Map();

  function readStoredLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === en || stored === zh) return stored;
    } catch (error) {
      /* Local storage can be blocked; the site still works. */
    }
    return null;
  }

  function browserLanguage() {
    const language = (navigator.language || "zh-Hant").toLowerCase();
    return language.startsWith("zh") ? zh : en;
  }

  function languageFromUrl() {
    const value = new URLSearchParams(window.location.search).get("lang");
    if (!value) return null;
    return value.toLowerCase().startsWith("en") ? en : zh;
  }

  function storeLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      /* noop */
    }
  }

  function captureSourceCopy() {
    document.querySelectorAll("[data-en], [data-en-html], [data-en-alt]").forEach((element) => {
      records.set(element, {
        text: element.textContent,
        html: element.innerHTML,
        alt: element.getAttribute("alt")
      });
    });
  }

  function applyPlayLinks(language) {
    const suffix = language === en ? en : zh;
    playLinks.forEach((link) => {
      const base = (link.getAttribute("href") || "play.html").split("?")[0] || "play.html";
      link.setAttribute("href", `${base}?lang=${encodeURIComponent(suffix)}`);
    });
  }

  function applyLanguage(language) {
    const isEnglish = language === en;

    records.forEach((source, element) => {
      if (isEnglish) {
        if (element.hasAttribute("data-en-html")) {
          element.innerHTML = element.getAttribute("data-en-html");
        } else if (element.hasAttribute("data-en")) {
          element.textContent = element.getAttribute("data-en");
        }
        if (element.hasAttribute("data-en-alt")) {
          element.setAttribute("alt", element.getAttribute("data-en-alt"));
        }
      } else {
        element.innerHTML = source.html;
        if (source.alt !== null) element.setAttribute("alt", source.alt);
      }
    });

    document.documentElement.lang = isEnglish ? en : zh;
    document.documentElement.dataset.lang = isEnglish ? "en" : "zh";
    document.title = isEnglish ? titleEn : titleZh;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", isEnglish ? descEn : descZh);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", isEnglish ? "The Three Gates · A three-act browser puzzle" : "三關謎城 · The Three Gates");
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", isEnglish ? descEn : descZh);
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", isEnglish ? "The Three Gates" : "三關謎城 · The Three Gates");
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute("content", isEnglish ? descEn : descZh);

    langButtons.forEach((button) => {
      const active = button.dataset.lang === (isEnglish ? "en" : "zh");
      button.setAttribute("aria-pressed", String(active));
    });

    if (navToggle) {
      navToggle.setAttribute("aria-label", isEnglish ? "Open menu" : "開啟選單");
    }

    applyPlayLinks(language);
    storeLanguage(language);
  }

  function setLanguage(language) {
    applyLanguage(language);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language === en ? en : zh);
      window.history.replaceState({}, "", url);
    } catch (error) {
      /* noop */
    }
    closeMenu();
  }

  function closeMenu() {
    if (!header || !navToggle) return;
    header.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", document.documentElement.lang === en ? "Open menu" : "開啟選單");
  }

  function toggleMenu() {
    if (!header || !navToggle) return;
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen
      ? (document.documentElement.lang === en ? "Close menu" : "關閉選單")
      : (document.documentElement.lang === en ? "Open menu" : "開啟選單"));
  }

  function initNavigation() {
    if (navToggle) {
      navToggle.addEventListener("click", toggleMenu);
    }
    if (nav) {
      nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu();
      });
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  function initHeader() {
    if (!header) return;
    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initLanguage() {
    captureSourceCopy();
    const initial = languageFromUrl() || readStoredLanguage() || browserLanguage();
    applyLanguage(initial);

    langButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setLanguage(button.dataset.lang === "en" ? en : zh);
      });
    });
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach((item) => observer.observe(item));
  }

  function initFaq() {
    const details = Array.from(document.querySelectorAll(".faq-item"));
    details.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        details.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  function init() {
    initLanguage();
    initNavigation();
    initHeader();
    initReveal();
    initFaq();
  }

  init();
})();
