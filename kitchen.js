/* ══════════════════════════════════════════════════════════════════
   The Birthday Kitchen · a small Three.js cooking game
   Loaded after vendor/three.min.js and before app.js.
   The HTML controls remain usable if WebGL is unavailable.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const EN = window.GAME_LANG === "en";
  const T = (zh, en) => (EN ? en : zh);

  const dom = {
    overlay: document.getElementById("kitchen-overlay"),
    shell: document.querySelector(".kitchen-shell"),
    stage: document.getElementById("kitchen-stage"),
    canvas: document.getElementById("kitchen-canvas"),
    loader: document.getElementById("kitchen-loader"),
    fallback: document.getElementById("kitchen-fallback"),
    closeBtn: document.getElementById("kitchen-close-btn"),
    title: document.getElementById("kitchen-title"),
    dateChip: document.getElementById("kitchen-date"),
    recipeDate: document.getElementById("kitchen-recipe-date"),
    stepper: document.getElementById("kitchen-stepper"),
    chips: Array.from(document.querySelectorAll("[data-kitchen-chip]")),
    panels: Array.from(document.querySelectorAll("[data-kitchen-step]")),
    mixBtn: document.getElementById("mix-btn"),
    bakeBtn: document.getElementById("bake-btn"),
    berryBtn: document.getElementById("berry-btn"),
    candleBtn: document.getElementById("candle-btn"),
    finishBtn: document.getElementById("finish-cake-btn"),
    mixRemaining: document.getElementById("mix-remaining"),
    mixBar: document.getElementById("mix-progress-bar"),
    bakeBar: document.getElementById("bake-progress-bar"),
    bakeNote: document.getElementById("bake-note"),
    berryCount: document.getElementById("berry-count"),
    berryTarget: document.getElementById("berry-target"),
    candleCount: document.getElementById("candle-count"),
    candleTarget: document.getElementById("candle-target"),
    status: document.getElementById("kitchen-status")
  };

  if (!dom.overlay) return;

  const MIX_NEEDED = 5;
  const BAKE_DURATION = 2500;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    open: false,
    started: false,
    step: 1,
    mixTaps: 0,
    berries: 0,
    candles: 0,
    baking: false,
    completing: false,
    complete: false,
    recipe: { berries: 4, candles: 3 },
    recipeKey: "",
    dateLabel: "",
    onComplete: null,
    onClose: null,
    onEvent: null,
    sceneReady: false,
    sceneFailed: false,
    three: null,
    camera: null,
    clock: null,
    raf: 0,
    bakeTimer: 0,
    finishTimer: 0,
    closeTimer: 0,
    previousFocus: null,
    hoverAction: null,
    cameraRig: { theta: 0.04, phi: 1.31, radius: 9.7, targetTheta: 0.04, targetPhi: 1.31 },
    cakeReveal: 0,
    mixPulse: 0,
    lit: false,
    decorations: [],
    candleObjects: [],
    tweens: [],
    confetti: [],
    steam: []
  };

  /* ───────────────────────── tiny helpers ───────────────────────── */

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
  const easeOutBack = (value) => {
    const overshoot = 1.1;
    return 1 + (overshoot + 1) * Math.pow(value - 1, 3) + overshoot * Math.pow(value - 1, 2);
  };

  function emit(type) {
    if (state.open && typeof state.onEvent === "function") state.onEvent(type);
  }

  function setStatus(text, success = false) {
    if (!dom.status) return;
    dom.status.textContent = text;
    dom.status.classList.toggle("is-success", Boolean(success));
  }

  function clearTimers() {
    window.clearTimeout(state.bakeTimer);
    window.clearTimeout(state.finishTimer);
    state.bakeTimer = 0;
    state.finishTimer = 0;
  }

  function updateHud() {
    if (dom.dateChip) dom.dateChip.textContent = state.dateLabel || T("生日蛋糕", "Birthday cake");
    if (dom.recipeDate) dom.recipeDate.textContent = state.dateLabel || "—";

    dom.chips.forEach((chip) => {
      const value = Number(chip.dataset.kitchenChip);
      chip.classList.toggle("is-current", value === state.step);
      chip.classList.toggle("is-done", value < state.step);
    });

    dom.panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.kitchenStep) !== state.step;
    });

    const mixDone = state.mixTaps >= MIX_NEEDED;
    if (dom.mixRemaining) dom.mixRemaining.textContent = String(Math.max(0, MIX_NEEDED - state.mixTaps));
    if (dom.mixBar) dom.mixBar.style.width = `${Math.min(100, (state.mixTaps / MIX_NEEDED) * 100)}%`;
    if (dom.mixBtn) dom.mixBtn.disabled = state.step !== 1 || mixDone || state.completing;

    if (dom.bakeBtn) dom.bakeBtn.disabled = state.step !== 2 || state.baking || state.completing;
    if (dom.bakeNote) {
      if (state.baking) {
        dom.bakeNote.textContent = T("烘焙中 · 180°C", "Baking · 180°C");
        dom.bakeNote.classList.add("is-hot");
      } else {
        dom.bakeNote.textContent = state.step >= 3
          ? T("烘焙完成 · 180°C", "Baked · 180°C")
          : T("烤箱溫度 180°C", "Oven 180°C");
        dom.bakeNote.classList.remove("is-hot");
      }
    }

    if (dom.berryCount) dom.berryCount.textContent = String(state.berries);
    if (dom.candleCount) dom.candleCount.textContent = String(state.candles);
    if (dom.berryTarget) dom.berryTarget.textContent = String(state.recipe.berries);
    if (dom.candleTarget) dom.candleTarget.textContent = String(state.recipe.candles);

    const berryFull = state.berries >= state.recipe.berries;
    const candleFull = state.candles >= state.recipe.candles;
    if (dom.berryCount) dom.berryCount.parentElement.classList.toggle("is-full", berryFull);
    if (dom.candleCount) dom.candleCount.parentElement.classList.toggle("is-full", candleFull);

    if (dom.berryBtn) dom.berryBtn.disabled = state.step !== 3 || berryFull || state.completing;
    if (dom.candleBtn) dom.candleBtn.disabled = state.step !== 3 || candleFull || state.completing;
    if (dom.finishBtn) dom.finishBtn.disabled = state.step !== 3 || !berryFull || !candleFull || state.completing;

    if (dom.closeBtn) dom.closeBtn.disabled = state.completing;
    updateStationAppearance();
  }

  function setStep(step) {
    state.step = step;
    updateHud();
  }

  /* ───────────────────────── public overlay lifecycle ───────────────────────── */

  function showOverlay() {
    window.clearTimeout(state.closeTimer);
    state.previousFocus = document.activeElement;
    dom.overlay.hidden = false;
    dom.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-kitchen-open");
    setBackgroundInert(true);
    dom.overlay.scrollTop = 0;
    requestAnimationFrame(() => dom.overlay.classList.add("is-visible"));
    window.setTimeout(() => {
      if (!state.open) return;
      try {
        dom.title.focus({ preventScroll: true });
      } catch (error) {
        dom.title.focus();
      }
    }, 180);
  }

  function hideOverlay(silent) {
    dom.overlay.classList.remove("is-visible");
    document.body.classList.remove("is-kitchen-open");
    setBackgroundInert(false);
    stopLoop();
    state.open = false;
    state.hoverAction = null;
    window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(() => {
      dom.overlay.hidden = true;
      dom.overlay.setAttribute("aria-hidden", "true");
    }, 380);

    if (!silent) {
      if (typeof state.onClose === "function") state.onClose();
      const previous = state.previousFocus;
      const previousUsable = previous && document.contains(previous) &&
        !previous.disabled && previous.offsetParent !== null;
      const target = previousUsable ? previous : document.getElementById("open-kitchen-btn");
      window.setTimeout(() => {
        if (target && typeof target.focus === "function") {
          try {
            target.focus({ preventScroll: true });
          } catch (error) {
            target.focus();
          }
        }
      }, 120);
    }
    state.previousFocus = null;
  }

  function setBackgroundInert(inert) {
    const background = [document.getElementById("app"), document.querySelector(".topbar")];
    background.forEach((node) => {
      if (!node) return;
      try {
        node.inert = inert;
      } catch (error) {
        /* inert is a progressive enhancement */
      }
    });
  }

  function beginCooking() {
    clearTimers();
    state.started = true;
    state.step = 1;
    state.mixTaps = 0;
    state.berries = 0;
    state.candles = 0;
    state.baking = false;
    state.completing = false;
    state.complete = false;
    state.lit = false;
    state.cakeReveal = 0;
    state.mixPulse = 0;
    state.tweens = [];
    state.confetti = [];
    state.steam = [];
    if (dom.closeBtn) dom.closeBtn.disabled = false;
    if (dom.bakeBar) {
      dom.bakeBar.style.transition = "none";
      dom.bakeBar.style.width = "0%";
    }
    resetThreeScene();
    updateHud();
    setStatus("");
  }

  function open(options = {}) {
    if (!dom.overlay) return;
    const nextRecipe = {
      berries: clamp(Number(options.recipe?.berries) || 4, 1, 8),
      candles: clamp(Number(options.recipe?.candles) || 3, 1, 8)
    };
    const nextKey = `${nextRecipe.berries}-${nextRecipe.candles}`;
    const recipeChanged = state.started && state.recipeKey && state.recipeKey !== nextKey;
    state.recipe = nextRecipe;
    state.dateLabel = options.dateLabel || "";
    state.onComplete = typeof options.onComplete === "function" ? options.onComplete : null;
    state.onClose = typeof options.onClose === "function" ? options.onClose : null;
    state.onEvent = typeof options.onEvent === "function" ? options.onEvent : null;

    if (!state.started || state.complete || recipeChanged) {
      state.recipeKey = nextKey;
      beginCooking();
    } else {
      state.recipeKey = nextKey;
      // A closed kitchen can be resumed exactly where it was left.
      updateHud();
    }

    showOverlay();
    state.open = true;
    ensureScene();
    if (state.sceneReady) {
      startLoop();
      hideLoaderSoon();
    }
  }

  function close(silent = false) {
    if (!state.open) return;
    hideOverlay(Boolean(silent));
  }

  function reset() {
    clearTimers();
    state.started = false;
    state.complete = false;
    state.completing = false;
    state.baking = false;
    state.lit = false;
    state.berries = 0;
    state.candles = 0;
    state.mixTaps = 0;
    state.step = 1;
    state.recipeKey = "";
    state.onComplete = null;
    state.onClose = null;
    state.onEvent = null;
    if (state.open) hideOverlay(true);
    resetThreeScene();
    updateHud();
  }

  /* ───────────────────────── cooking actions ───────────────────────── */

  function mix() {
    if (!state.open || state.step !== 1 || state.completing) return;
    if (state.mixTaps >= MIX_NEEDED) return;
    state.mixTaps += 1;
    state.mixPulse = 0.55;
    emit("mix");
    updateHud();
    setStatus(state.mixTaps >= MIX_NEEDED
      ? T("麵糊拌好了。", "The batter is ready.")
      : T(`再攪拌 ${MIX_NEEDED - state.mixTaps} 下。`, `Stir ${MIX_NEEDED - state.mixTaps} more times.`));
    if (state.mixTaps >= MIX_NEEDED) {
      window.setTimeout(() => {
        if (state.open && !state.complete && state.step === 1) {
          setStep(2);
          setStatus(T("麵糊完成。現在送進烤箱。", "Batter ready. Now into the oven."));
          emit("mixDone");
        }
      }, 420);
    }
  }

  function bake() {
    if (!state.open || state.step !== 2 || state.baking || state.completing) return;
    state.baking = true;
    emit("bake");
    updateHud();
    setStatus(T("烤箱裡傳出甜甜的香氣。", "A sweet smell drifts from the oven."));
    if (dom.bakeBar) {
      dom.bakeBar.style.transition = "none";
      dom.bakeBar.style.width = "0%";
      requestAnimationFrame(() => {
        dom.bakeBar.style.transition = `width ${BAKE_DURATION}ms linear`;
        dom.bakeBar.style.width = "100%";
      });
    }
    window.clearTimeout(state.bakeTimer);
    state.bakeTimer = window.setTimeout(finishBake, BAKE_DURATION);
  }

  function finishBake() {
    state.bakeTimer = 0;
    state.baking = false;
    state.step = 3;
    state.cakeReveal = 0;
    if (state.three && state.three.cakeGroup) {
      state.three.cakeGroup.visible = true;
      state.three.cakeGroup.scale.setScalar(0.02);
    }
    if (state.three && state.three.cakePlate) state.three.cakePlate.visible = true;
    emit("bakeDone");
    spawnSteam();
    updateHud();
    setStatus(T("蛋糕出爐了。照著食譜裝飾它。", "The cake is out. Follow the recipe to decorate it."));
  }

  function addBerry() {
    if (!state.open || state.step !== 3 || state.completing) return;
    if (state.berries >= state.recipe.berries) return;
    state.berries += 1;
    addBerryVisual(state.berries - 1);
    emit("decorate");
    updateHud();
    if (state.berries >= state.recipe.berries && state.candles >= state.recipe.candles) {
      setStatus(T("裝飾完成。可以點燃蠟燭了。", "Decorating done. Time to light the candles."));
    } else if (state.berries >= state.recipe.berries) {
      setStatus(T("草莓放好了。", "Strawberries placed."));
    } else {
      setStatus(T(`再放 ${state.recipe.berries - state.berries} 顆草莓。`, `Add ${state.recipe.berries - state.berries} more strawberries.`));
    }
  }

  function addCandle() {
    if (!state.open || state.step !== 3 || state.completing) return;
    if (state.candles >= state.recipe.candles) return;
    state.candles += 1;
    addCandleVisual(state.candles - 1);
    emit("decorate");
    updateHud();
    if (state.berries >= state.recipe.berries && state.candles >= state.recipe.candles) {
      setStatus(T("裝飾完成。可以點燃蠟燭了。", "Decorating done. Time to light the candles."));
    } else if (state.candles >= state.recipe.candles) {
      setStatus(T("蠟燭插好了。", "Candles placed."));
    } else {
      setStatus(T(`再插 ${state.recipe.candles - state.candles} 根蠟燭。`, `Add ${state.recipe.candles - state.candles} more candles.`));
    }
  }

  function finishCake() {
    if (!state.open || state.step !== 3 || state.completing) return;
    if (state.berries < state.recipe.berries || state.candles < state.recipe.candles) return;
    state.completing = true;
    state.lit = true;
    updateHud();
    setStatus(T("蛋糕完成。第三道門正在打開。", "The cake is finished. The third gate is opening."), true);
    lightCandles();
    spawnThreeConfetti();
    emit("complete");
    state.finishTimer = window.setTimeout(() => {
      state.finishTimer = 0;
      state.complete = true;
      hideOverlay(true);
      const callback = state.onComplete;
      state.onComplete = null;
      if (typeof callback === "function") callback();
    }, 1900);
  }

  /* ───────────────────────── UI events ───────────────────────── */

  dom.mixBtn?.addEventListener("click", mix);
  dom.bakeBtn?.addEventListener("click", bake);
  dom.berryBtn?.addEventListener("click", addBerry);
  dom.candleBtn?.addEventListener("click", addCandle);
  dom.finishBtn?.addEventListener("click", finishCake);
  dom.closeBtn?.addEventListener("click", () => close(false));

  dom.overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!state.completing) {
        event.preventDefault();
        close(false);
      }
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dom.overlay.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ───────────────────────── Three.js scene ───────────────────────── */

  function ensureScene() {
    if (state.sceneReady || state.sceneFailed) {
      if (state.sceneReady) hideLoaderSoon();
      return;
    }
    if (!window.THREE) {
      failScene(T("Three.js 沒有載入。", "Three.js did not load."));
      return;
    }

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: dom.canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.76;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x091418, 13, 30);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
      camera.position.set(0, 3.9, 9.6);

      const three = {
        renderer,
        scene,
        camera,
        cakeGroup: null,
        cakePlate: null,
        mixGroup: null,
        whisk: null,
        batter: null,
        ovenWindowMat: null,
        ovenLight: null,
        cakeLight: null,
        rings: {},
        labels: {},
        hits: [],
        hitActions: new Map(),
        strawberryTargets: [],
        candleTargets: [],
        berryStationPosition: new THREE.Vector3(2.15, 0.65, 1.0),
        candleStationPosition: new THREE.Vector3(2.65, 0.65, -0.42),
        cakeTop: 1.17,
        ovenGroup: null,
        cakePointLight: null,
        resizeObserver: null
      };
      state.three = three;
      state.camera = camera;

      buildScene(scene, three);
      state.sceneReady = true;
      resizeScene();
      renderer.render(scene, camera);
      dom.loader?.classList.add("is-hidden");
      hideLoaderSoon();

      three.resizeObserver = new ResizeObserver(() => resizeScene());
      three.resizeObserver.observe(dom.stage);

      dom.canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        failScene(T("WebGL 圖形中斷。", "WebGL was interrupted."));
      });
    } catch (error) {
      console.warn("BirthdayKitchen:", error);
      failScene(T("這個瀏覽器暫時無法顯示 3D 廚房。", "This browser cannot display the 3D kitchen right now."));
    }
  }

  function failScene(message) {
    state.sceneFailed = true;
    state.sceneReady = false;
    stopLoop();
    if (dom.loader) dom.loader.classList.add("is-hidden");
    if (dom.fallback) {
      dom.fallback.hidden = false;
      const text = dom.fallback.querySelector("span:last-child");
      if (text) text.textContent = T(
        `${message} 仍可以用旁邊的按鈕完成蛋糕。`,
        `${message} You can still finish the cake with the buttons beside it.`
      );
    }
    if (dom.canvas) dom.canvas.style.display = "none";
    if (state.three && state.three.resizeObserver) state.three.resizeObserver.disconnect();
  }

  function hideLoaderSoon() {
    if (!dom.loader) return;
    window.clearTimeout(hideLoaderSoon.timer);
    hideLoaderSoon.timer = window.setTimeout(() => {
      dom.loader.classList.add("is-hidden");
    }, 160);
  }

  function resizeScene() {
    if (!state.three || !state.sceneReady) return;
    const width = Math.max(1, dom.stage.clientWidth);
    const height = Math.max(1, dom.stage.clientHeight);
    const aspect = width / height;
    const { renderer, camera } = state.three;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    state.cameraRig.radius = aspect < 0.95 ? 11.5 : aspect > 1.7 ? 9.1 : 9.7;
    state.cameraRig.targetPhi = aspect < 0.95 ? 1.35 : 1.31;
    updateCamera(1);
    updateStationAppearance();
  }

  /* ───────────────────────── scene building blocks ───────────────────────── */

  function standard(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0,
      ...options
    });
  }

  function addMesh(geometry, material, parent, position, rotation) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function makeLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 88;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(5, 12, 15, .94)";
    ctx.strokeStyle = "rgba(240, 211, 154, .7)";
    ctx.lineWidth = 3;
    const x = 8;
    const y = 8;
    const w = canvas.width - 16;
    const h = canvas.height - 16;
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f8e5bc";
    ctx.font = `600 ${text.length > 8 ? 25 : 33}px "PingFang TC", "Noto Sans TC", sans-serif`;
    ctx.shadowColor = "rgba(0, 0, 0, .45)";
    ctx.shadowBlur = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    const texture = new THREE.CanvasTexture(canvas);
    if ("encoding" in texture) texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = state.three.renderer.capabilities.getMaxAnisotropy();
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.98,
      toneMapped: false,
      fog: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.35, 0.37, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  function makeRing(x, z, radius) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xe7c58c,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.8, radius, 40), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.075, z);
    ring.renderOrder = 2;
    ring.visible = false;
    return ring;
  }

  function makeHitSphere(position, radius, action) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.userData.action = action;
    mesh.renderOrder = -1;
    state.three.hits.push(mesh);
    state.three.hitActions.set(action, mesh);
    return mesh;
  }

  function makeHitBox(position, size, action) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.userData.action = action;
    state.three.hits.push(mesh);
    state.three.hitActions.set(action, mesh);
    return mesh;
  }

  function makeWindowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const arch = new Path2D();
    arch.moveTo(64, 590);
    arch.lineTo(64, 260);
    arch.bezierCurveTo(64, 90, 448, 90, 448, 260);
    arch.lineTo(448, 590);
    arch.closePath();

    const sky = ctx.createLinearGradient(0, 100, 0, 600);
    sky.addColorStop(0, "#081a24");
    sky.addColorStop(0.65, "#0a2028");
    sky.addColorStop(1, "#071116");
    ctx.save();
    ctx.clip(arch);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 640);
    const moonGlow = ctx.createRadialGradient(322, 246, 10, 322, 246, 120);
    moonGlow.addColorStop(0, "rgba(244, 231, 198, .8)");
    moonGlow.addColorStop(1, "rgba(244, 231, 198, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(200, 120, 250, 250);
    ctx.fillStyle = "#f1e4c6";
    ctx.beginPath();
    ctx.arc(322, 246, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 205, 175, .45)";
    ctx.beginPath();
    ctx.arc(310, 238, 8, 0, Math.PI * 2);
    ctx.arc(336, 258, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(242, 230, 200, .8)";
    [[146, 180, 2], [392, 162, 1.5], [410, 378, 2], [138, 430, 1.2], [260, 120, 1.4], [210, 460, 1.8]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = "rgba(157, 128, 84, .55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(256, 96);
    ctx.lineTo(256, 590);
    ctx.moveTo(82, 300);
    ctx.lineTo(430, 300);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "#73532d";
    ctx.lineWidth = 16;
    ctx.stroke(arch);
    ctx.strokeStyle = "rgba(239, 211, 154, .58)";
    ctx.lineWidth = 3;
    ctx.stroke(arch);
    ctx.strokeStyle = "rgba(159, 128, 82, .5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 590);
    ctx.lineTo(64, 260);
    ctx.bezierCurveTo(64, 90, 448, 90, 448, 260);
    ctx.lineTo(448, 590);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    if ("encoding" in texture) texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = state.three.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  function makeBunting(scene) {
    const group = new THREE.Group();
    const points = [
      new THREE.Vector3(-4.6, 4.7, -4.55),
      new THREE.Vector3(-2.3, 4.35, -4.5),
      new THREE.Vector3(0, 4.55, -4.5),
      new THREE.Vector3(2.3, 4.28, -4.5),
      new THREE.Vector3(4.6, 4.62, -4.55)
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const string = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.012, 5, false),
      new THREE.MeshBasicMaterial({ color: 0x9c825b })
    );
    group.add(string);
    const colors = [0xb66f66, 0xd7a85b, 0x5d9e8d, 0xe8d6b6, 0x8f5a52, 0xc3a268, 0x5b8078];
    for (let index = 0; index < 9; index += 1) {
      const t = 0.08 + (index / 8) * 0.84;
      const point = curve.getPoint(t);
      const shape = new THREE.Shape();
      shape.moveTo(-0.17, 0);
      shape.lineTo(0.17, 0);
      shape.lineTo(0, -0.29);
      shape.closePath();
      const flag = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({
          color: colors[index % colors.length],
          side: THREE.DoubleSide
        })
      );
      flag.position.copy(point);
      flag.position.z += 0.02;
      group.add(flag);
    }
    scene.add(group);
  }

  function buildScene(scene, three) {
    const mats = {
      wall: standard(0x0e2026, { roughness: 1 }),
      wallDark: standard(0x0d1b20, { roughness: 1 }),
      trim: standard(0x2a3b38, { roughness: 0.8 }),
      wood: standard(0x3d281c, { roughness: 0.82 }),
      woodDark: standard(0x24170f, { roughness: 0.9 }),
      cloth: standard(0x7e5a3a, { roughness: 0.9 }),
      clothShade: standard(0x5e422b, { roughness: 1 }),
      gold: standard(0xc99c58, { metalness: 0.65, roughness: 0.33 }),
      goldLight: standard(0xefd39e, { metalness: 0.5, roughness: 0.35 }),
      darkMetal: standard(0x0e1b1e, { metalness: 0.42, roughness: 0.5 }),
      ovenGlass: standard(0x110b08, {
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0xff8b42,
        emissiveIntensity: 0.02
      }),
      cream: standard(0xf3e3c7, { roughness: 0.88 }),
      frosting: standard(0xf8ead2, { roughness: 0.9 }),
      blush: standard(0xb65f55, { roughness: 0.9 }),
      sponge: standard(0x5b321d, { roughness: 0.95 }),
      teal: standard(0x47746c, { roughness: 0.64 }),
      tealLight: standard(0x86aaa0, { roughness: 0.55 }),
      strawberry: standard(0x8e1f2b, { roughness: 0.5 }),
      leaf: standard(0x5b8853, { roughness: 0.8 }),
      candleWax: [
        standard(0xd7ad78, { roughness: 0.7 }),
        standard(0xb26862, { roughness: 0.7 }),
        standard(0x528076, { roughness: 0.7 }),
        standard(0xe4c07c, { roughness: 0.7 }),
        standard(0x874f45, { roughness: 0.7 })
      ]
    };

    // background
    addMesh(new THREE.PlaneGeometry(20, 10), mats.wall, scene, [0, 2.6, -4.8]);
    for (let x = -6; x <= 6; x += 2) {
      addMesh(new THREE.BoxGeometry(0.05, 4.6, 0.05), mats.trim, scene, [x, 2.3, -4.72]);
    }
    for (let y = 0.6; y < 4.8; y += 1.2) {
      addMesh(new THREE.BoxGeometry(12, 0.04, 0.04), mats.trim, scene, [0, y, -4.71]);
    }

    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.75, 3.35),
      new THREE.MeshBasicMaterial({
        map: makeWindowTexture(),
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    );
    windowMesh.position.set(1.55, 2.85, -4.69);
    scene.add(windowMesh);

    makeBunting(scene);

    // pendant lamp
    addMesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 8), mats.gold, scene, [0, 5.0, -0.1]);
    const shade = addMesh(
      new THREE.ConeGeometry(0.46, 0.48, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xb9894c,
        metalness: 0.55,
        roughness: 0.38,
        side: THREE.DoubleSide
      }),
      scene,
      [0, 4.42, -0.1]
    );
    shade.rotation.x = Math.PI;
    const bulb = addMesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe1a8 }),
      scene,
      [0, 4.22, -0.1]
    );
    bulb.castShadow = false;
    const lampLight = new THREE.PointLight(0xffc27a, 0.95, 10, 2);
    lampLight.position.set(0, 3.95, 0.2);
    scene.add(lampLight);

    // table
    addMesh(new THREE.CylinderGeometry(3.35, 3.5, 0.3, 64), mats.wood, scene, [0, -0.18, 0]);
    addMesh(new THREE.CylinderGeometry(3.27, 3.27, 0.08, 64), mats.cloth, scene, [0, 0.02, 0]);
    const drape = addMesh(
      new THREE.CylinderGeometry(3.26, 2.95, 0.78, 64, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x563b25,
        roughness: 1,
        side: THREE.DoubleSide
      }),
      scene,
      [0, -0.39, 0]
    );
    drape.castShadow = false;
    const floor = addMesh(new THREE.PlaneGeometry(28, 28), standard(0x070d0f, { roughness: 1 }), scene, [0, -0.62, 0], [-Math.PI / 2, 0, 0]);
    floor.receiveShadow = true;

    // shelves and jars
    const shelf = new THREE.Group();
    shelf.position.set(3.4, 0, -4.45);
    addMesh(new THREE.BoxGeometry(1.9, 0.07, 0.34), mats.gold, shelf, [0, 2.48, 0]);
    addMesh(new THREE.BoxGeometry(1.9, 0.07, 0.34), mats.gold, shelf, [0, 3.5, 0]);
    const jarColors = [0x8f5a52, 0xd7a85b, 0x5d9e8d, 0xe8d6b6];
    for (let index = 0; index < 4; index += 1) {
      const jar = addMesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 12), standard(jarColors[index], { roughness: 0.5 }), shelf, [-0.62 + index * 0.4, 2.68, 0]);
      jar.castShadow = false;
      addMesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 12), mats.gold, shelf, [-0.62 + index * 0.4, 2.86, 0]);
    }
    scene.add(shelf);

    // oven
    const oven = new THREE.Group();
    oven.position.set(-2.9, 1.28, -4.05);
    state.three.ovenGroup = oven;
    addMesh(new THREE.BoxGeometry(2.08, 1.9, 0.8), mats.darkMetal, oven, [0, 0, 0]);
    addMesh(new THREE.BoxGeometry(1.82, 1.5, 0.07), mats.gold, oven, [0, 0.02, 0.43]);
    const ovenWindowMat = mats.ovenGlass;
    state.three.ovenWindowMat = ovenWindowMat;
    addMesh(new THREE.BoxGeometry(1.58, 1.08, 0.045), ovenWindowMat, oven, [0, 0.03, 0.47]);
    addMesh(new THREE.BoxGeometry(1.72, 0.07, 0.08), mats.goldLight, oven, [0, 0.55, 0.48]);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 10), mats.goldLight, oven, [0, 0.26, 0.54], [0, 0, Math.PI / 2]);
    for (let index = 0; index < 3; index += 1) {
      addMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), mats.gold, oven, [-0.55 + index * 0.55, -0.84, 0.49], [Math.PI / 2, 0, 0]);
    }
    const ovenLight = new THREE.PointLight(0xff8b42, 0, 5, 2);
    ovenLight.position.set(0, 0.1, 0.8);
    oven.add(ovenLight);
    state.three.ovenLight = ovenLight;
    scene.add(oven);

    // table station rings
    const mixPos = { x: -2.22, z: 1.03 };
    const berryPos = { x: 2.18, z: 1.0 };
    const candlePos = { x: 2.7, z: -0.42 };
    const mixRing = makeRing(mixPos.x, mixPos.z, 0.78);
    const berryRing = makeRing(berryPos.x, berryPos.z, 0.64);
    const candleRing = makeRing(candlePos.x, candlePos.z, 0.64);
    scene.add(mixRing, berryRing, candleRing);
    three.rings = { mix: mixRing, berry: berryRing, candle: candleRing };

    // mixing bowl
    const mixGroup = new THREE.Group();
    mixGroup.position.set(mixPos.x, 0.06, mixPos.z);
    addMesh(new THREE.CylinderGeometry(0.57, 0.36, 0.34, 28, 1, true), mats.teal, mixGroup, [0, 0.18, 0]);
    addMesh(new THREE.CircleGeometry(0.36, 28), mats.tealLight, mixGroup, [0, 0.015, 0], [-Math.PI / 2, 0, 0]);
    const batter = addMesh(new THREE.CylinderGeometry(0.5, 0.43, 0.06, 28), mats.cream, mixGroup, [0, 0.305, 0]);
    state.three.batter = batter;
    const rim = addMesh(new THREE.TorusGeometry(0.565, 0.022, 8, 36), mats.tealLight, mixGroup, [0, 0.36, 0], [Math.PI / 2, 0, 0]);
    rim.castShadow = false;
    const whisk = new THREE.Group();
    whisk.position.set(0.16, 0.52, 0.04);
    whisk.rotation.z = -0.26;
    addMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), mats.gold, whisk, [0, 0.2, 0]);
    for (let index = 0; index < 3; index += 1) {
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.007, 6, 20, Math.PI * 1.25),
        mats.goldLight
      );
      loop.position.set(0, -0.03, 0);
      loop.rotation.y = (index / 3) * Math.PI;
      loop.rotation.z = Math.PI / 2;
      loop.castShadow = true;
      whisk.add(loop);
    }
    mixGroup.add(whisk);
    state.three.whisk = whisk;
    mixGroup.add(makeLabel(T("鋼盆", "Mixing bowl")));
    mixGroup.children[mixGroup.children.length - 1].position.set(0, 1.15, 0);
    state.three.labels.mix = mixGroup.children[mixGroup.children.length - 1];
    state.three.mixGroup = mixGroup;
    scene.add(mixGroup);

    // strawberries bowl
    const berryGroup = new THREE.Group();
    berryGroup.position.set(berryPos.x, 0.06, berryPos.z);
    addMesh(new THREE.CylinderGeometry(0.53, 0.34, 0.3, 26, 1, true), mats.tealLight, berryGroup, [0, 0.16, 0]);
    addMesh(new THREE.CircleGeometry(0.34, 26), mats.teal, berryGroup, [0, 0.015, 0], [-Math.PI / 2, 0, 0]);
    addMesh(new THREE.TorusGeometry(0.525, 0.02, 8, 32), mats.teal, berryGroup, [0, 0.32, 0], [Math.PI / 2, 0, 0]);
    for (let index = 0; index < 5; index += 1) {
      const berry = makeStrawberry(mats);
      berry.position.set(Math.sin(index * 2.1) * 0.22, 0.38, Math.cos(index * 2.1) * 0.22);
      berry.rotation.set(0.2, index, 0.3);
      berry.scale.setScalar(0.85);
      berryGroup.add(berry);
    }
    berryGroup.add(makeLabel(T("草莓", "Strawberries")));
    berryGroup.children[berryGroup.children.length - 1].position.set(0, 1.12, 0);
    state.three.labels.berry = berryGroup.children[berryGroup.children.length - 1];
    scene.add(berryGroup);

    // candle tray
    const candleGroup = new THREE.Group();
    candleGroup.position.set(candlePos.x, 0.06, candlePos.z);
    addMesh(new THREE.CylinderGeometry(0.58, 0.62, 0.06, 32), mats.gold, candleGroup, [0, 0.04, 0]);
    addMesh(new THREE.TorusGeometry(0.56, 0.016, 6, 32), mats.goldLight, candleGroup, [0, 0.08, 0], [Math.PI / 2, 0, 0]);
    for (let index = 0; index < 5; index += 1) {
      const candle = makeCandle(mats, index);
      const angle = (index / 5) * Math.PI * 2;
      candle.position.set(Math.cos(angle) * 0.3, 0.08, Math.sin(angle) * 0.3);
      candle.scale.setScalar(0.86);
      candleGroup.add(candle);
    }
    candleGroup.add(makeLabel(T("蠟燭", "Candles")));
    candleGroup.children[candleGroup.children.length - 1].position.set(0.12, 1.42, 0);
    state.three.labels.candle = candleGroup.children[candleGroup.children.length - 1];
    scene.add(candleGroup);

    // the cake (hidden until baked)
    const cakePlate = new THREE.Group();
    addMesh(new THREE.CylinderGeometry(1.58, 1.66, 0.09, 48), mats.gold, cakePlate, [0, 0.11, 0]);
    addMesh(new THREE.TorusGeometry(1.56, 0.032, 8, 48), mats.goldLight, cakePlate, [0, 0.17, 0], [Math.PI / 2, 0, 0]);
    cakePlate.visible = false;
    scene.add(cakePlate);
    three.cakePlate = cakePlate;

    const cakeGroup = new THREE.Group();
    cakeGroup.visible = false;
    const layer1 = addMesh(new THREE.CylinderGeometry(1.28, 1.3, 0.52, 40), mats.sponge, cakeGroup, [0, 0.42, 0]);
    const band1 = addMesh(new THREE.CylinderGeometry(1.31, 1.31, 0.16, 40), mats.frosting, cakeGroup, [0, 0.64, 0]);
    band1.castShadow = false;
    const layer2 = addMesh(new THREE.CylinderGeometry(0.91, 0.97, 0.46, 40), mats.blush, cakeGroup, [0, 0.91, 0]);
    const topFrosting = addMesh(new THREE.CylinderGeometry(0.93, 0.93, 0.06, 40), mats.frosting, cakeGroup, [0, 1.16, 0]);
    topFrosting.castShadow = false;
    const ribbon = addMesh(new THREE.TorusGeometry(1.305, 0.022, 8, 48), mats.gold, cakeGroup, [0, 0.42, 0], [Math.PI / 2, 0, 0]);
    ribbon.castShadow = false;
    // colorful sprinkles on the frosted top
    for (let index = 0; index < 22; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.42 + Math.random() * 0.42;
      const sprinkle = addMesh(
        new THREE.SphereGeometry(0.022, 6, 4),
        mats.candleWax[index % mats.candleWax.length],
        cakeGroup,
        [Math.cos(angle) * radius, 1.205, Math.sin(angle) * radius]
      );
      sprinkle.castShadow = false;
    }
    // frosting drips around the lower layer
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const drip = addMesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        mats.frosting,
        cakeGroup,
        [Math.cos(angle) * 1.29, 0.7 - (index % 3) * 0.035, Math.sin(angle) * 1.29]
      );
      drip.scale.set(0.8, 1.4 + (index % 2) * 0.5, 0.8);
      drip.castShadow = false;
    }
    // a few piped rosettes around the top edge
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const rosette = addMesh(
        new THREE.SphereGeometry(0.09, 10, 8),
        mats.frosting,
        cakeGroup,
        [Math.cos(angle) * 0.83, 1.2, Math.sin(angle) * 0.83]
      );
      rosette.scale.set(1, 0.7, 1);
      rosette.castShadow = false;
    }
    scene.add(cakeGroup);
    three.cakeGroup = cakeGroup;
    three.cakeTop = 1.19;

    // steam / candle light
    const cakeLight = new THREE.PointLight(0xffb066, 0, 4, 2);
    cakeLight.position.set(0, 1.8, 0);
    scene.add(cakeLight);
    three.cakeLight = cakeLight;

    // invisible hit areas
    scene.add(makeHitSphere([mixPos.x, 0.5, mixPos.z], 0.82, "mix"));
    scene.add(makeHitBox([-2.9, 1.28, -4.0], [2.4, 2.0, 1.1], "oven"));
    scene.add(makeHitSphere([berryPos.x, 0.5, berryPos.z], 0.76, "berry"));
    scene.add(makeHitSphere([candlePos.x, 0.5, candlePos.z], 0.76, "candle"));

    // labels for the oven and stations
    const ovenLabel = makeLabel(T("烤箱", "Oven"));
    ovenLabel.position.set(-2.9, 2.9, -3.8);
    scene.add(ovenLabel);
    state.three.labels.oven = ovenLabel;

    // lights
    const hemi = new THREE.HemisphereLight(0x9dbab0, 0x20130d, 0.4);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffd0a0, 1.3);
    key.position.set(-3.8, 6.5, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rimLight = new THREE.DirectionalLight(0x6f9e91, 0.38);
    rimLight.position.set(5, 3.4, -4);
    scene.add(rimLight);
    const fill = new THREE.AmbientLight(0x4d372a, 0.16);
    scene.add(fill);

    // gentle foreground shadow catcher
    const catcher = addMesh(
      new THREE.PlaneGeometry(14, 10),
      new THREE.ShadowMaterial({ opacity: 0.32 }),
      scene,
      [0, -0.03, 0],
      [-Math.PI / 2, 0, 0]
    );
    catcher.receiveShadow = true;
    catcher.castShadow = false;

    // a few decorative sparkles
    const glowTexture = makeGlowTexture();
    for (let index = 0; index < 18; index += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: index % 3 === 0 ? 0xe7c58c : 0x9fc3b5,
          transparent: true,
          opacity: 0.2 + Math.random() * 0.35,
          depthWrite: false
        })
      );
      sprite.position.set((Math.random() - 0.5) * 8, 0.8 + Math.random() * 4.5, -2.5 + Math.random() * 4);
      sprite.scale.setScalar(0.08 + Math.random() * 0.15);
      scene.add(sprite);
    }

    three.mats = mats;

    // camera initial
    updateCamera(1);
    updateStationAppearance();
  }

  function makeStrawberry(mats) {
    const group = new THREE.Group();
    const body = addMesh(
      new THREE.SphereGeometry(0.125, 12, 9),
      mats.strawberry,
      group,
      [0, 0.08, 0]
    );
    body.scale.set(1, 1.25, 1);
    const leafMat = mats.leaf;
    for (let index = 0; index < 5; index += 1) {
      const leaf = addMesh(
        new THREE.ConeGeometry(0.04, 0.12, 4),
        leafMat,
        group,
        [Math.cos((index / 5) * Math.PI * 2) * 0.06, 0.185, Math.sin((index / 5) * Math.PI * 2) * 0.06],
        [0.5, (index / 5) * Math.PI * 2, 0.3]
      );
      leaf.castShadow = false;
    }
    const seedMat = standard(0xf1d594, { roughness: 0.75 });
    [[-0.045, 0.06, 0.112], [0.04, 0.11, 0.11], [-0.03, 0.14, 0.105], [0.055, 0.03, 0.105]].forEach((pos) => {
      const seed = addMesh(new THREE.SphereGeometry(0.009, 5, 4), seedMat, group, pos);
      seed.castShadow = false;
    });
    return group;
  }

  function makeCandle(mats, index) {
    const group = new THREE.Group();
    const material = mats.candleWax[index % mats.candleWax.length];
    addMesh(new THREE.CylinderGeometry(0.04, 0.043, 0.42, 10), material, group, [0, 0.21, 0]);
    addMesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6), standard(0x3a2b21), group, [0, 0.45, 0]);
    const flame = addMesh(
      new THREE.ConeGeometry(0.07, 0.21, 8),
      new THREE.MeshBasicMaterial({ color: 0xff973c, toneMapped: false }),
      group,
      [0, 0.56, 0]
    );
    flame.castShadow = false;
    flame.visible = false;
    flame.userData.flame = true;
    const innerFlame = addMesh(
      new THREE.ConeGeometry(0.034, 0.12, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0a8, toneMapped: false }),
      group,
      [0, 0.53, 0.006]
    );
    innerFlame.castShadow = false;
    innerFlame.visible = false;
    group.userData.flame = flame;
    group.userData.innerFlame = innerFlame;
    return group;
  }

  function makeGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 240, 200, .95)");
    gradient.addColorStop(0.4, "rgba(255, 215, 150, .32)");
    gradient.addColorStop(1, "rgba(255, 215, 150, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  /* ───────────────────────── decoration visuals ───────────────────────── */

  function addBerryVisual(index) {
    if (!state.three) return;
    const three = state.three;
    const mats = three.mats;
    const berry = makeStrawberry(mats);
    const start = three.berryStationPosition.clone();
    const angle = (index / Math.max(state.recipe.berries, 1)) * Math.PI * 2 + 0.35;
    const target = new THREE.Vector3(
      Math.cos(angle) * 0.7,
      three.cakeTop - 0.02,
      Math.sin(angle) * 0.7
    );
    berry.position.copy(start);
    berry.scale.setScalar(0.2);
    berry.rotation.set(0.2, Math.random() * Math.PI, 0.2);
    three.scene.add(berry);
    state.decorations.push(berry);
    state.tweens.push({
      object: berry,
      from: start,
      to: target,
      elapsed: 0,
      duration: 0.52,
      arc: 0.55,
      finalScale: 1
    });
  }

  function addCandleVisual(index) {
    if (!state.three) return;
    const three = state.three;
    const candle = makeCandle(three.mats, index);
    const start = three.candleStationPosition.clone();
    const angle = (index / Math.max(state.recipe.candles, 1)) * Math.PI * 2 + 0.8;
    const target = new THREE.Vector3(
      Math.cos(angle) * 0.38,
      three.cakeTop + 0.01,
      Math.sin(angle) * 0.38
    );
    candle.position.copy(start);
    candle.scale.setScalar(0.2);
    three.scene.add(candle);
    state.decorations.push(candle);
    state.candleObjects.push(candle);
    state.tweens.push({
      object: candle,
      from: start,
      to: target,
      elapsed: 0,
      duration: 0.58,
      arc: 0.6,
      finalScale: 1
    });
  }

  function lightCandles() {
    if (!state.three) return;
    const glowTexture = makeGlowTexture();
    state.candleObjects.forEach((candle, index) => {
      if (candle.userData.flame) candle.userData.flame.visible = true;
      if (candle.userData.innerFlame) candle.userData.innerFlame.visible = true;
      if (index < 8 && candle.userData.flame) {
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xffb768,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
          })
        );
        glow.position.copy(candle.userData.flame.position);
        glow.position.y += 0.04;
        glow.scale.setScalar(0.38);
        candle.add(glow);
      }
    });
    if (state.three.cakeLight) state.three.cakeLight.intensity = 1.8;
  }

  function spawnSteam() {
    if (!state.three || state.sceneFailed || REDUCED_MOTION) return;
    const texture = makeGlowTexture();
    for (let index = 0; index < 12; index += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          color: 0xf1dfc3,
          transparent: true,
          opacity: 0.28,
          depthWrite: false
        })
      );
      sprite.position.set((Math.random() - 0.5) * 1.1, 1.25 + Math.random() * 0.4, (Math.random() - 0.5) * 1.1);
      sprite.scale.setScalar(0.22 + Math.random() * 0.22);
      state.three.scene.add(sprite);
      state.steam.push({ sprite, elapsed: 0, life: 1.8 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 0.2 });
    }
  }

  function spawnThreeConfetti() {
    if (!state.three || state.sceneFailed || REDUCED_MOTION) return;
    const colors = [0xd7a85b, 0xf0d39a, 0xb66f66, 0x5d9e8d, 0xf3e8d2, 0x8b6430];
    const geometry = new THREE.PlaneGeometry(0.06, 0.13);
    for (let index = 0; index < 85; index += 1) {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: colors[index % colors.length],
          side: THREE.DoubleSide
        })
      );
      mesh.position.set((Math.random() - 0.5) * 1.5, 1.35 + Math.random() * 0.3, (Math.random() - 0.5) * 1.5);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        1.8 + Math.random() * 1.7,
        (Math.random() - 0.5) * 1.8
      );
      mesh.userData.spin = (Math.random() - 0.5) * 9;
      mesh.userData.life = 2.5 + Math.random() * 1.2;
      state.three.scene.add(mesh);
      state.confetti.push(mesh);
    }
  }

  function resetThreeScene() {
    if (!state.three) return;
    const three = state.three;
    state.decorations.forEach((item) => {
      if (item.parent) item.parent.remove(item);
    });
    state.confetti.forEach((item) => {
      if (item.parent) item.parent.remove(item);
    });
    state.steam.forEach((item) => {
      if (item.sprite.parent) item.sprite.parent.remove(item.sprite);
    });
    state.decorations = [];
    state.candleObjects = [];
    state.confetti = [];
    state.steam = [];
    state.tweens = [];
    state.lit = false;
    state.cakeReveal = 0;
    if (three.cakeGroup) {
      three.cakeGroup.visible = false;
      three.cakeGroup.scale.setScalar(0.02);
    }
    if (three.cakePlate) three.cakePlate.visible = false;
    if (three.cakeLight) three.cakeLight.intensity = 0;
    if (three.ovenLight) three.ovenLight.intensity = 0;
    if (three.ovenWindowMat) three.ovenWindowMat.emissiveIntensity = 0.02;
    if (three.whisk) three.whisk.rotation.set(0, 0, -0.26);
    if (three.batter) three.batter.scale.set(1, 1, 1);
    state.hoverAction = null;
    state.cameraRig.theta = 0.04;
    state.cameraRig.phi = 1.31;
    state.cameraRig.targetTheta = 0.04;
    state.cameraRig.targetPhi = dom.stage && dom.stage.clientWidth < 620 ? 1.35 : 1.31;
    updateCamera(1);
    updateStationAppearance();
  }

  function updateStationAppearance() {
    if (!state.three) return;
    const three = state.three;
    if (state.completing) {
      Object.values(three.rings).forEach((ring) => {
        if (ring) ring.visible = false;
      });
      Object.values(three.labels).forEach((label) => {
        if (label) label.material.opacity = 0;
      });
      return;
    }
    const mixActive = state.step === 1;
    const berryActive = state.step === 3;
    const candleActive = state.step === 3;
    const ovenActive = state.step === 2;
    const hideLabels = state.step === 3 && dom.stage.clientWidth < 620;
    if (three.rings.mix) three.rings.mix.visible = mixActive;
    if (three.rings.berry) three.rings.berry.visible = berryActive;
    if (three.rings.candle) three.rings.candle.visible = candleActive;
    ["mix", "berry", "candle", "oven"].forEach((key) => {
      const label = three.labels[key];
      if (!label) return;
      const active = (key === "mix" && mixActive) || (key === "oven" && ovenActive) ||
        (key === "berry" && berryActive) || (key === "candle" && candleActive);
      label.material.opacity = hideLabels ? 0 : active ? 1 : 0.5;
    });
    if (three.ovenWindowMat) {
      if (state.baking) {
        three.ovenWindowMat.emissiveIntensity = 1.4;
      } else if (ovenActive) {
        three.ovenWindowMat.emissiveIntensity = 0.25;
      } else {
        three.ovenWindowMat.emissiveIntensity = 0.02;
      }
    }
  }

  /* ───────────────────────── camera, hover, animations ───────────────────────── */

  function updateCamera(delta = 0.016) {
    if (!state.camera) return;
    const rig = state.cameraRig;
    const target = new THREE.Vector3(0, 1.5, 0);
    const smoothing = Math.min(1, delta * 7);
    rig.theta += (rig.targetTheta - rig.theta) * smoothing;
    rig.phi += (rig.targetPhi - rig.phi) * smoothing;
    const sinPhi = Math.sin(rig.phi);
    state.camera.position.set(
      target.x + rig.radius * sinPhi * Math.sin(rig.theta),
      target.y + rig.radius * Math.cos(rig.phi),
      target.z + rig.radius * sinPhi * Math.cos(rig.theta)
    );
    state.camera.lookAt(target);
  }

  function setHover(action) {
    if (state.hoverAction === action) return;
    state.hoverAction = action;
    if (dom.canvas) {
      dom.canvas.style.cursor = action ? "pointer" : "grab";
    }
    if (!state.three) return;
    const ring = state.three.rings[action];
    if (ring) ring.scale.setScalar(action ? 1.08 : 1);
  }

  function actionAtEvent(event) {
    if (!state.three || !state.sceneReady) return null;
    const rect = dom.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, state.camera);
    const intersects = raycaster.intersectObjects(state.three.hits, false);
    if (!intersects.length) return null;
    return intersects[0].object.userData.action || null;
  }

  function isActionActive(action) {
    if (action === "mix") return state.step === 1;
    if (action === "oven") return state.step === 2 && !state.baking;
    if (action === "berry") return state.step === 3 && state.berries < state.recipe.berries;
    if (action === "candle") return state.step === 3 && state.candles < state.recipe.candles;
    return false;
  }

  function performSceneAction(action) {
    if (!isActionActive(action)) return;
    if (action === "mix") mix();
    else if (action === "oven") bake();
    else if (action === "berry") addBerry();
    else if (action === "candle") addCandle();
  }

  let dragging = null;

  dom.canvas?.addEventListener("pointerdown", (event) => {
    if (!state.open || !state.sceneReady) return;
    dragging = {
      startX: event.clientX,
      startY: event.clientY,
      baseTheta: state.cameraRig.targetTheta,
      basePhi: state.cameraRig.targetPhi,
      moved: false
    };
    try {
      dom.canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* pointer capture is optional */
    }
    dom.canvas.classList.add("is-grabbing");
  });

  dom.canvas?.addEventListener("pointermove", (event) => {
    if (!state.open || !state.sceneReady) return;
    if (dragging) {
      const dx = event.clientX - dragging.startX;
      const dy = event.clientY - dragging.startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragging.moved = true;
      state.cameraRig.targetTheta = clamp(dragging.baseTheta + dx * 0.0055, -0.55, 0.55);
      state.cameraRig.targetPhi = clamp(dragging.basePhi + dy * 0.0035, 1.12, 1.42);
      return;
    }
    const action = actionAtEvent(event);
    setHover(action && isActionActive(action) ? action : null);
  });

  function endDrag(event) {
    if (!dragging) return;
    const wasClick = !dragging.moved;
    dragging = null;
    dom.canvas?.classList.remove("is-grabbing");
    try {
      if (event && dom.canvas?.hasPointerCapture(event.pointerId)) {
        dom.canvas.releasePointerCapture(event.pointerId);
      }
    } catch (error) {
      /* noop */
    }
    if (wasClick && event) {
      const action = actionAtEvent(event);
      if (action) performSceneAction(action);
    }
  }

  dom.canvas?.addEventListener("pointerup", endDrag);
  dom.canvas?.addEventListener("pointercancel", endDrag);
  dom.canvas?.addEventListener("pointerleave", () => {
    if (!dragging) setHover(null);
  });

  function startLoop() {
    if (!state.sceneReady || !state.open) return;
    stopLoop();
    state.clock = new THREE.Clock();
    const tick = () => {
      if (!state.open || !state.three) {
        state.raf = 0;
        return;
      }
      state.raf = requestAnimationFrame(tick);
      const delta = Math.min(state.clock.getDelta(), 0.05);
      updateCamera(delta);
      updateAnimations(delta);
      state.three.renderer.render(state.three.scene, state.three.camera);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function updateAnimations(delta) {
    const three = state.three;
    if (!three) return;
    const time = performance.now() * 0.001;

    // mixing
    if (three.whisk && state.mixPulse > 0) {
      state.mixPulse = Math.max(0, state.mixPulse - delta);
      three.whisk.rotation.y += delta * 13;
      three.whisk.position.y = 0.52 + Math.sin(time * 24) * 0.03 * state.mixPulse;
      if (three.batter) {
        const pulse = 1 + Math.sin(time * 20) * 0.03 * state.mixPulse;
        three.batter.scale.set(pulse, 1, pulse);
      }
    } else if (three.whisk) {
      three.whisk.position.y += (0.52 - three.whisk.position.y) * Math.min(1, delta * 10);
      if (three.batter) three.batter.scale.set(1, 1, 1);
    }

    // rings
    Object.entries(three.rings).forEach(([key, ring]) => {
      if (!ring.visible) return;
      const base = state.hoverAction === key ? 1.08 : 1;
      const pulse = 1 + Math.sin(time * 3 + key.length) * 0.035;
      ring.scale.setScalar(base * pulse);
      ring.material.opacity = 0.42 + Math.sin(time * 2.2 + key.length) * 0.12;
    });

    // oven glow
    if (three.ovenWindowMat) {
      if (state.baking) {
        three.ovenWindowMat.emissiveIntensity = 1.15 + Math.sin(time * 7) * 0.25;
        if (three.ovenLight) three.ovenLight.intensity = 1.3 + Math.sin(time * 7) * 0.2;
      } else if (state.step === 2) {
        three.ovenWindowMat.emissiveIntensity = 0.22 + Math.sin(time * 2.2) * 0.08;
        if (three.ovenLight) three.ovenLight.intensity = 0.28;
      } else {
        three.ovenWindowMat.emissiveIntensity = 0.02;
        if (three.ovenLight) three.ovenLight.intensity = 0;
      }
    }

    // cake reveal
    if (three.cakeGroup && three.cakeGroup.visible && state.cakeReveal < 1) {
      state.cakeReveal = Math.min(1, state.cakeReveal + delta / 0.85);
      const scale = 0.02 + easeOutBack(state.cakeReveal) * 0.98;
      three.cakeGroup.scale.setScalar(scale);
    }

    // tweens
    state.tweens = state.tweens.filter((tween) => {
      tween.elapsed += delta;
      const t = Math.min(1, tween.elapsed / tween.duration);
      const eased = easeOutCubic(t);
      tween.object.position.lerpVectors(tween.from, tween.to, eased);
      tween.object.position.y += Math.sin(t * Math.PI) * tween.arc;
      tween.object.scale.setScalar(0.2 + (tween.finalScale - 0.2) * easeOutCubic(t));
      if (t >= 1) {
        tween.object.position.copy(tween.to);
        tween.object.scale.setScalar(tween.finalScale);
        return false;
      }
      return true;
    });

    // flames
    state.candleObjects.forEach((candle, index) => {
      const flame = candle.userData.flame;
      if (flame && state.lit) {
        const flicker = 0.9 + Math.sin(time * 14 + index) * 0.12 + Math.random() * 0.04;
        flame.scale.set(flicker, 0.92 + Math.sin(time * 11 + index) * 0.1, flicker);
      }
    });
    if (three.cakeLight && state.lit) {
      three.cakeLight.intensity = 1.15 + Math.sin(time * 6) * 0.13;
    }

    // steam
    state.steam = state.steam.filter((item) => {
      item.elapsed += delta;
      const progress = item.elapsed / item.life;
      item.sprite.position.y += delta * 0.6;
      item.sprite.position.x += item.drift * delta;
      item.sprite.material.opacity = Math.max(0, 0.3 * (1 - progress));
      item.sprite.scale.setScalar(0.18 + progress * 0.3);
      if (progress >= 1) {
        if (item.sprite.parent) item.sprite.parent.remove(item.sprite);
        return false;
      }
      return true;
    });

    // 3D confetti
    state.confetti = state.confetti.filter((piece) => {
      piece.userData.life -= delta;
      piece.userData.velocity.y -= delta * 2.8;
      piece.position.addScaledVector(piece.userData.velocity, delta);
      piece.rotation.x += delta * piece.userData.spin;
      piece.rotation.y += delta * piece.userData.spin * 0.6;
      if (piece.userData.life <= 0) {
        if (piece.parent) piece.parent.remove(piece);
        return false;
      }
      return true;
    });
  }

  /* ───────────────────────── public API ───────────────────────── */

  window.BirthdayKitchen = {
    open,
    close,
    reset,
    isOpen: () => state.open,
    isComplete: () => state.complete
  };
})();
