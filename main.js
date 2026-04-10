/**
 * Scrollytelling: GSAP + ScrollTrigger + SplitType.
 * Matter.js omitido a propósito: prioridad = texto roto alrededor del video (sin física por ahora).
 */
(function () {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.error("GSAP o ScrollTrigger no cargaron.");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  function debouncedRefresh() {
    if (debouncedRefresh._t) {
      clearTimeout(debouncedRefresh._t);
    }
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

  function init() {
    const stage = document.getElementById("scrolly");
    const fixedBg = document.getElementById("fixedBg");
    const textLayerBack = document.getElementById("textLayerBack");
    const textLayerFront = document.getElementById("textLayerFront");
    const videoLayer = document.getElementById("videoLayer");
    const videoShell = document.getElementById("videoShell");
    const heroVideo = document.getElementById("heroVideo");
    const postUi = document.getElementById("postUi");
    const closeBtn = document.getElementById("closeVideoBtn");
    const waFab = document.getElementById("waFab");

    var SplitTypeCtor = window.SplitType;
    if (!stage || !videoShell || !heroVideo || !SplitTypeCtor) {
      console.error("Falta DOM o SplitType.");
      return;
    }

    const topEl = document.querySelector("[data-split-top]");
    const mainEl = document.querySelector("[data-split-algoritmo]");
    new SplitTypeCtor(topEl, { types: "chars" });
    new SplitTypeCtor(mainEl, { types: "chars" });

    const charsSmall = Array.from(topEl.querySelectorAll(".char"));
    const charsMain = Array.from(mainEl.querySelectorAll(".char"));

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

    /* true = el usuario cerró la cruz; no volver a mostrarla hasta que baje el progreso del scroll */
    var uiDismissed = false;
    /* “Hold” real del video en fullscreen: más duración = más scroll necesario para pasarlo */
    var holdFullScreen = 1.25;

    const master = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "bottom bottom",
        /* true = animación acoplada al scroll (sin retraso “elástico”) */
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

    /* Terminar de sacar las letras: después del impacto se apagan (sin quedar flotando) */
    master.to(
      charsSmall.concat(charsMain),
      {
        opacity: 0,
        duration: 0.18,
      },
      0.46
    );

    /* Tramo donde el video ya está “a pantalla completa” y queda fijo un rato */
    master.to({}, { duration: holdFullScreen }, 0.62);

    /* Cierre (fondo + textos) DESPUÉS del hold */
    master.to(fixedBg, { opacity: 0, duration: 0.14 }, 0.62 + holdFullScreen + 0.02);
    master.to([textLayerBack, textLayerFront], { opacity: 0, duration: 0.16 }, 0.62 + holdFullScreen + 0.06);

    /* Al salir de la sección hero (scroll hacia abajo): ocultar capas fijas sin tocar la timeline.
       Al volver a entrar en la sección: restaurar visibilidad — la animación sigue ligada al scroll. */
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

    /* Profundidad: el fondo se mueve un poco más lento (parallax) que texto/video fijos.
       No usamos perspective en ancestros: evita romper position:fixed del hero. */
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
