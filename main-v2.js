/**
 * Hero V2: intro onload (fondo + ruido + títulos) + canvas particles + mouse parallax.
 * Luego arranca el scrollytelling original (GSAP + ScrollTrigger + SplitType).
 */
(function () {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.error("GSAP o ScrollTrigger no cargaron.");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function debouncedRefresh() {
    if (debouncedRefresh._t) clearTimeout(debouncedRefresh._t);
    debouncedRefresh._t = setTimeout(function () {
      debouncedRefresh._t = null;
      ScrollTrigger.refresh();
    }, 120);
  }

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  function buildExplosionProps(count, magnitude, seedOffset) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out = [];
    for (let i = 0; i < count; i++) {
      const rnd = seededRandom(seedOffset + i * 9973);
      const angle = rnd() * Math.PI * 2;
      const dist = 0.32 + rnd() * 0.58;
      const tx = Math.cos(angle) * dist * vw * magnitude;
      const ty = Math.sin(angle) * dist * vh * magnitude;
      const rot = (rnd() - 0.5) * 52;
      const blur = 2.5 + rnd() * 10;
      out.push({ x: tx, y: ty, rotation: rot, filter: "blur(" + blur + "px)" });
    }
    return out;
  }

  function computeCoverScale(el) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return 1;
    return Math.max(window.innerWidth / w, window.innerHeight / h) * 1.02;
  }

  function createCanvas(className) {
    const c = document.createElement("canvas");
    c.className = className;
    c.setAttribute("aria-hidden", "true");
    return c;
  }

  function resizeCanvas(canvas) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return { w: w, h: h, dpr: dpr };
    }
    return { w: canvas.width, h: canvas.height, dpr: dpr };
  }

  function initNoise(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    let raf = 0;
    let running = false;

    function frame() {
      raf = 0;
      if (!running) return;

      const info = resizeCanvas(canvas);
      const w = info.w;
      const h = info.h;

      // Malla de ruido (barata): puntos cada 2px aprox
      ctx.clearRect(0, 0, w, h);
      const img = ctx.createImageData(w, h);
      const data = img.data;
      const step = 2;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const v = (Math.random() * 255) | 0;
          const idx = (y * w + x) * 4;
          data[idx] = v;
          data[idx + 1] = v;
          data[idx + 2] = v;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      raf = requestAnimationFrame(frame);
    }

    return {
      start: function () {
        if (running) return;
        running = true;
        if (!raf) raf = requestAnimationFrame(frame);
      },
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      },
    };
  }

  function initParticles(canvas, anchorX, anchorY) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    const count = 120;
    const particles = [];
    const rnd = seededRandom(918273);

    let mouseX = -9999;
    let mouseY = -9999;
    let mouseActive = false;
    let raf = 0;
    let running = false;

    function resetParticles() {
      particles.length = 0;
      const info = resizeCanvas(canvas);
      const w = info.w;
      const h = info.h;
      const ax = anchorX * w;
      const ay = anchorY * h;
      for (let i = 0; i < count; i++) {
        const r = (1 + rnd() * 1.5) * info.dpr; // 1–2.5px
        const op = 0.2 + rnd() * 0.5; // 0.2–0.7
        const angle = rnd() * Math.PI * 2;
        const orbitR = (12 + rnd() * 180) * info.dpr;
        const speedPx = (0.3 + rnd() * 0.5) * info.dpr; // 0.3–0.8 px/frame (aprox)

        // 60% cluster cerca del mic (top-center), 40% dispersas por todo el canvas
        const clustered = rnd() < 0.6;
        const cx = clustered ? ax + (rnd() - 0.5) * (w * 0.22) : rnd() * w;
        const cy = clustered ? ay + (rnd() - 0.5) * (h * 0.18) : rnd() * h;

        // fase y “aplastado” vertical para que se sienta más orgánico
        const squash = 0.55 + rnd() * 0.65;
        const wobble = 0.65 + rnd() * 0.9;

        particles.push({
          x: cx,
          y: cy,
          cx: cx,
          cy: cy,
          a: angle,
          orbitR: orbitR,
          speedPx: speedPx,
          squash: squash,
          wobble: wobble,
          r: r,
          op: op,
          hue: 38 + rnd() * 16,
        });
      }
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      mouseX = (e.clientX - rect.left) * dpr;
      mouseY = (e.clientY - rect.top) * dpr;
      mouseActive = true;
    }

    function onLeave() {
      mouseActive = false;
    }

    function step() {
      raf = 0;
      if (!running) return;

      const info = resizeCanvas(canvas);
      const w = info.w;
      const h = info.h;
      const ax = anchorX * w;
      const ay = anchorY * h;

      ctx.clearRect(0, 0, w, h);

      const influenceR = 150 * info.dpr;
      const lerp = 0.08;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // velocidad expresada en px/frame → convertimos a delta de ángulo estable
        p.a += (p.speedPx / Math.max(p.orbitR, 1)) * 1.12;

        // 60% orbitan cerca del mic (su centro queda alrededor del anchor), 40% orbitan donde nacieron
        const centerLerp = 0.012;
        const wantsMic = Math.abs(p.cx - ax) < w * 0.2 && Math.abs(p.cy - ay) < h * 0.2;
        if (wantsMic) {
          p.cx += (ax - p.cx) * centerLerp;
          p.cy += (ay - p.cy) * centerLerp;
        }

        const bx = p.cx + Math.cos(p.a) * p.orbitR;
        const by =
          p.cy +
          Math.sin(p.a * p.wobble) *
            (p.orbitR * p.squash);

        let tx = bx;
        let ty = by;

        if (mouseActive) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < influenceR * influenceR) {
            // orientar suavemente hacia cursor
            tx = bx + dx * 0.18;
            ty = by + dy * 0.18;
          }
        }

        p.x += (tx - p.x) * lerp;
        p.y += (ty - p.y) * lerp;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ", 92%, 58%, " + p.op + ")";
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    }

    resetParticles();

    return {
      mount: function () {
        canvas.addEventListener("mousemove", onMove, { passive: true });
        canvas.addEventListener("mouseleave", onLeave, { passive: true });
        window.addEventListener(
          "resize",
          function () {
            resetParticles();
          },
          { passive: true }
        );
      },
      start: function () {
        if (running) return;
        running = true;
        if (!raf) raf = requestAnimationFrame(step);
      },
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      },
    };
  }

  function initParallax(imgEl, maxPx) {
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;

    function onMove(e) {
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.5;
      mx = (e.clientX - cx) / Math.max(cx, 1);
      my = (e.clientY - cy) / Math.max(cy, 1);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick() {
      raf = 0;
      // lerp 0.05
      tx += ((mx * maxPx) - tx) * 0.05;
      ty += ((my * maxPx) - ty) * 0.05;
      imgEl.style.transform =
        "translate(-50%, -50%) translate3d(" +
        (tx | 0) +
        "px," +
        (ty | 0) +
        "px,0)";
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
  }

  function runEntryAnimation(opts) {
    const fixedBg = opts.fixedBg;
    const bgImg = opts.bgImg;
    const topEl = opts.topEl;
    const mainEl = opts.mainEl;
    const charsSmall = opts.charsSmall;
    const charsMain = opts.charsMain;
    const heroCta = opts.heroCta;
    const videoLayer = opts.videoLayer;
    const videoShell = opts.videoShell;
    const noiseCanvas = opts.noiseCanvas;
    const noise = opts.noise;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // estado inicial
    gsap.set(bgImg, {
      scale: 1.08,
      filter: "brightness(0) saturate(0.82) contrast(1.02) blur(3px)",
    });
    // En la pantalla de carga V2 NO se ve el video
    if (videoLayer) gsap.set(videoLayer, { opacity: 0 });
    if (videoShell) gsap.set(videoShell, { opacity: 0 });
    gsap.set(noiseCanvas, { opacity: 1 });
    gsap.set([topEl, mainEl], { opacity: 1 });
    gsap.set(charsSmall.concat(charsMain), { y: 20, opacity: 0 });

    // ruido ON
    if (noise) noise.start();

    // background reveal (start 800ms)
    tl.to(
      bgImg,
      {
        duration: 0.6,
        scale: 1,
        filter: "brightness(0.7) saturate(0.82) contrast(1.02) blur(3px)",
        ease: "cubic-bezier(0.16,1,0.3,1)",
      },
      0.8
    );

    // ruido fade out
    tl.to(
      noiseCanvas,
      { duration: 0.8, opacity: 0, ease: "power2.inOut" },
      0.8
    );
    tl.add(function () {
      if (noise) noise.stop();
    }, 1.7);

    // título principal (start 1200ms)
    tl.to(
      charsSmall,
      {
        duration: 0.6,
        y: 0,
        opacity: 1,
        stagger: 0.03,
        ease: "power3.out",
      },
      1.2
    );

    // subtítulo (start 1800ms)
    tl.to(
      charsMain,
      {
        duration: 0.5,
        y: 0,
        opacity: 1,
        stagger: 0.03,
        ease: "power2.out",
      },
      1.8
    );

    // CTA: después del subtítulo, con "delay" 1.4s relativo
    if (heroCta) {
      tl.from(
        heroCta,
        {
          opacity: 0,
          y: 10,
          duration: 0.6,
          ease: "power2.out",
        },
        ">+0.15"
      );
    }

    // al final dejamos el fondo en estado normal del CSS base
    tl.add(function () {
      // mantener el filtro un poco más oscuro para la vibra "observándote"
      try {
        fixedBg.classList.add("hero-v2-ready");
      } catch (e) {}
    });

    return tl;
  }

  function initScrolly(params) {
    const stage = params.stage;
    const fixedBg = params.fixedBg;
    const textLayerBack = params.textLayerBack;
    const textLayerFront = params.textLayerFront;
    const videoLayer = params.videoLayer;
    const videoShell = params.videoShell;
    const heroVideo = params.heroVideo;
    const postUi = params.postUi;
    const closeBtn = params.closeBtn;
    const waFab = params.waFab;
    const charsSmall = params.charsSmall;
    const charsMain = params.charsMain;
    const heroCta = params.heroCta || document.querySelector(".hero-cta");

    let propsSmall = buildExplosionProps(charsSmall.length, 0.4, 11);
    let propsMain = buildExplosionProps(charsMain.length, 1, 9043);
    var coverScale = computeCoverScale(videoShell);

    function refreshTargets() {
      propsSmall = buildExplosionProps(charsSmall.length, 0.4, 11);
      propsMain = buildExplosionProps(charsMain.length, 1, 9043);
      coverScale = computeCoverScale(videoShell);
    }

    function vh() {
      return window.innerHeight;
    }

    gsap.set(fixedBg, { opacity: 1 });
    gsap.set([textLayerBack, textLayerFront], { opacity: 1 });
    gsap.set(videoShell, {
      transformOrigin: "50% 50%",
      borderRadius: 40,
      scale: 1,
      y: vh() * 0.4,
    });
    gsap.set(charsSmall.concat(charsMain), {
      x: 0,
      y: 0,
      rotation: 0,
      filter: "blur(0px)",
      opacity: 1,
    });

    var uiDismissed = false;
    var holdFullScreen = 1.25;

    const master = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: refreshTargets,
        onUpdate: function (self) {
          const p = self.progress;
          var playAt = 0.52;

          if (p >= playAt) {
            if (heroVideo.paused) heroVideo.play().catch(function () {});
          } else {
            heroVideo.pause();
            try {
              if (heroVideo.currentTime > 0.04) {
                heroVideo.currentTime = 0;
              }
            } catch (e) {}
          }

          if (waFab) {
            var pastHero = document.body.classList.contains("hero-out");
            if (pastHero) {
              waFab.classList.remove("is-hidden");
            } else if (!heroVideo.paused && p >= playAt) {
              waFab.classList.add("is-hidden");
            } else {
              waFab.classList.remove("is-hidden");
            }
          }

          if (p > 0.5) {
            videoShell.classList.add("is-full");
          } else {
            videoShell.classList.remove("is-full");
          }
          if (p < 0.75) {
            uiDismissed = false;
          }
          if (p > 0.82) {
            videoLayer.classList.add("is-interactive");
            if (!uiDismissed) {
              postUi.hidden = false;
            }
          } else {
            postUi.hidden = true;
            videoLayer.classList.remove("is-interactive");
          }
        },
      },
    });

    master.fromTo(
      videoShell,
      { y: vh() * 0.4 },
      { y: -vh() * 0.06, duration: 0.26 },
      0
    );

    master.to(
      videoShell,
      {
        scale: coverScale,
        y: 0,
        borderRadius: 0,
        duration: 0.36,
      },
      0.26
    );

    master.to(
      charsSmall,
      {
        duration: 0.36,
        stagger: { each: 0.02, from: "edges" },
        x: function (i) {
          return propsSmall[i].x;
        },
        y: function (i) {
          return propsSmall[i].y;
        },
        rotation: function (i) {
          return propsSmall[i].rotation;
        },
        filter: function (i) {
          return propsSmall[i].filter;
        },
      },
      0.26
    );

    master.to(
      charsMain,
      {
        duration: 0.36,
        stagger: { each: 0.018, from: "center" },
        x: function (i) {
          return propsMain[i].x;
        },
        y: function (i) {
          return propsMain[i].y;
        },
        rotation: function (i) {
          return propsMain[i].rotation;
        },
        filter: function (i) {
          return propsMain[i].filter;
        },
      },
      0.26
    );

    var fadeTargets = charsSmall.concat(charsMain);
    if (heroCta) fadeTargets = fadeTargets.concat([heroCta]);
    master.to(
      fadeTargets,
      {
        opacity: 0,
        duration: 0.18,
      },
      0.46
    );

    master.to({}, { duration: holdFullScreen }, 0.62);
    master.to(fixedBg, { opacity: 0, duration: 0.14 }, 0.62 + holdFullScreen + 0.02);
    master.to([textLayerBack, textLayerFront], { opacity: 0, duration: 0.16 }, 0.62 + holdFullScreen + 0.06);

    ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: "bottom bottom",
      onLeave: function () {
        document.body.classList.add("hero-out");
        try {
          heroVideo.pause();
        } catch (e) {}
        if (waFab) {
          waFab.classList.remove("is-hidden");
        }
      },
      onEnterBack: function () {
        document.body.classList.remove("hero-out");
      },
    });

    if (
      fixedBg &&
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches
    ) {
      gsap.fromTo(
        fixedBg,
        { y: 0 },
        {
          y: function () {
            return -window.innerHeight * 0.075;
          },
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    }

    window.addEventListener(
      "resize",
      function () {
        refreshTargets();
        debouncedRefresh();
      },
      { passive: true }
    );

    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        uiDismissed = true;
        postUi.hidden = true;
        document.body.classList.add("hero-out");
        try {
          heroVideo.pause();
        } catch (e2) {}
        if (waFab) {
          waFab.classList.remove("is-hidden");
        }

        var next = document.getElementById("beneficios");
        if (next && typeof next.scrollIntoView === "function") {
          next.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }

  function init() {
    const stage = document.getElementById("scrolly");
    const fixedBg = document.getElementById("fixedBg");
    const bgImg = fixedBg && fixedBg.querySelector(".fixed-bg__img");
    const textLayerBack = document.getElementById("textLayerBack");
    const textLayerFront = document.getElementById("textLayerFront");
    const videoLayer = document.getElementById("videoLayer");
    const videoShell = document.getElementById("videoShell");
    const heroVideo = document.getElementById("heroVideo");
    const postUi = document.getElementById("postUi");
    const closeBtn = document.getElementById("closeVideoBtn");
    const waFab = document.getElementById("waFab");

    const SplitTypeCtor = window.SplitType;
    const topEl = document.querySelector("[data-hero-back]");
    const line1 = document.querySelector("[data-split-line1]");
    const line2 = document.querySelector("[data-split-line2]");
    const mainEl = document.querySelector("[data-split-algoritmo]");

    if (
      !stage ||
      !fixedBg ||
      !bgImg ||
      !videoShell ||
      !heroVideo ||
      !SplitTypeCtor ||
      !topEl ||
      !line1 ||
      !line2 ||
      !mainEl
    ) {
      console.error("Falta DOM o SplitType.");
      return;
    }

    // Capas V2: canvases
    const noiseCanvas = createCanvas("fixed-bg__canvas fixed-bg__canvas--noise");
    const particlesCanvas = createCanvas("fixed-bg__canvas fixed-bg__canvas--particles");
    fixedBg.appendChild(noiseCanvas);
    fixedBg.appendChild(particlesCanvas);

    const noise = prefersReducedMotion() ? null : initNoise(noiseCanvas);
    const particles = prefersReducedMotion()
      ? null
      : initParticles(particlesCanvas, 0.56, 0.34);
    if (particles) particles.mount();

    // Split una sola vez y reusar (dos renglones = sin cortes feos tipo “…M” + “O”)
    new SplitTypeCtor(line1, { types: "chars" });
    new SplitTypeCtor(line2, { types: "chars" });
    new SplitTypeCtor(mainEl, { types: "chars" });
    const charsSmall = Array.from(line1.querySelectorAll(".char")).concat(
      Array.from(line2.querySelectorAll(".char"))
    );
    const charsMain = Array.from(mainEl.querySelectorAll(".char"));

    // Parallax (solo puntero fino y sin reduced motion)
    if (!prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches) {
      initParallax(bgImg, 15);
    }

    // Partículas empiezan ya (son sutiles)
    if (particles) particles.start();

    if (prefersReducedMotion()) {
      initScrolly({
        stage,
        fixedBg,
        textLayerBack,
        textLayerFront,
        videoLayer,
        videoShell,
        heroVideo,
        postUi,
        closeBtn,
        waFab,
        charsSmall,
        charsMain,
        heroCta: document.querySelector(".hero-cta"),
      });
      return;
    }

    const tl = runEntryAnimation({
      fixedBg,
      bgImg,
      topEl,
      mainEl,
      charsSmall,
      charsMain,
      heroCta: document.querySelector(".hero-cta"),
      videoLayer,
      videoShell,
      noiseCanvas,
      noise,
    });

    tl.eventCallback("onComplete", function () {
      initScrolly({
        stage,
        fixedBg,
        textLayerBack,
        textLayerFront,
        videoLayer,
        videoShell,
        heroVideo,
        postUi,
        closeBtn,
        waFab,
        charsSmall,
        charsMain,
        heroCta: document.querySelector(".hero-cta"),
      });
      // Pantalla de carga igual que antes: mostrar video recién al terminar (sin afectar el TL)
      try {
        if (videoLayer) videoLayer.style.opacity = "1";
        if (videoShell) videoShell.style.opacity = "1";
      } catch (e0) {}
      // Asegurar layout correcto tras la intro
      debouncedRefresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

