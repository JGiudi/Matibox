/**
 * Resultados: texto con scrub; fotos opacidad escalonada; lightbox al click.
 */
(function () {
  "use strict";

  var root = document.getElementById("resultados");
  if (!root) {
    return;
  }

  var lightbox = document.getElementById("resultadosLightbox");
  var lbImg = lightbox && lightbox.querySelector(".resultados-lightbox__img");
  var lbScrim = lightbox && lightbox.querySelector(".resultados-lightbox__scrim");
  var lbClose = lightbox && lightbox.querySelector(".resultados-lightbox__close");

  function openLightbox(src, alt) {
    if (!lightbox || !lbImg) {
      return;
    }
    lbImg.src = src;
    lbImg.alt = alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (lbClose) {
      lbClose.focus();
    }
  }

  function closeLightbox() {
    if (!lightbox || !lbImg) {
      return;
    }
    lightbox.hidden = true;
    lbImg.removeAttribute("src");
    lbImg.alt = "";
    document.body.style.overflow = "";
  }

  if (lightbox && lbImg) {
    root.querySelectorAll("[data-result-fig] img").forEach(function (img) {
      img.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(img.currentSrc || img.src, img.alt);
      });
    });
    if (lbScrim) {
      lbScrim.addEventListener("click", closeLightbox);
    }
    if (lbClose) {
      lbClose.addEventListener("click", closeLightbox);
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox && !lightbox.hidden) {
        closeLightbox();
      }
    });
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  function debouncedRefresh() {
    if (debouncedRefresh._t) clearTimeout(debouncedRefresh._t);
    debouncedRefresh._t = setTimeout(function () {
      debouncedRefresh._t = null;
      ScrollTrigger.refresh();
    }, 120);
  }

  var lines = root.querySelectorAll("[data-result-line]");
  var eyebrow = root.querySelector(".resultados__eyebrow");
  var sub = root.querySelector(".resultados__sub");

  /* Orden visual de arriba hacia abajo (grid): fila 1 → 5, fila 2 → 1 y 3, fila 3 → 2 y 4 */
  var figSelectorsTopDown = [
    ".resultados__fig--5",
    ".resultados__fig--1",
    ".resultados__fig--3",
    ".resultados__fig--2",
    ".resultados__fig--4",
  ];
  var figsOrdered = figSelectorsTopDown
    .map(function (sel) {
      return root.querySelector(sel);
    })
    .filter(Boolean);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  gsap.set(lines, { opacity: 0, y: 28 });
  if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 12 });
  if (sub) gsap.set(sub, { opacity: 0, y: 12 });

  /* Rotación en el <img> para no pisar transform del <figure> (grid + translateX en --3/--4) */
  var twistIn = [-6, 6, -5, -5.5, 5.5];

  figsOrdered.forEach(function (fig, fi) {
    var img = fig.querySelector("img");
    if (!img) {
      return;
    }
    gsap.set(img, {
      opacity: 0,
      rotation: twistIn[fi] != null ? twistIn[fi] : 5,
      transformOrigin: "50% 50%",
    });
  });

  var tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top 86%",
      end: "bottom bottom",
      scrub: 0.72,
      fastScrollEnd: true,
      invalidateOnRefresh: true,
      onLeave: function () {
        tl.progress(1, false);
      },
    },
  });

  if (eyebrow) {
    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.18 }, 0);
  }
  tl.to(
    lines,
    {
      opacity: 1,
      y: 0,
      duration: 0.32,
      stagger: 0.05,
    },
    0.05
  );
  if (sub) {
    tl.to(sub, { opacity: 1, y: 0, duration: 0.2 }, 0.22);
  }

  /* Más hueco entre capturas en el timeline = más scroll para “bajar” de una a otra */
  var imgStart = 0.44;
  var staggerGap = 0.2;
  var fadeEach = 0.55;

  figsOrdered.forEach(function (fig, i) {
    var img = fig.querySelector("img");
    if (!img) {
      return;
    }
    tl.to(
      img,
      {
        opacity: 1,
        rotation: 0,
        duration: fadeEach,
        ease: "power2.out",
      },
      imgStart + i * staggerGap
    );
  });

  window.addEventListener(
    "resize",
    function () {
      debouncedRefresh();
    },
    { passive: true }
  );
})();
