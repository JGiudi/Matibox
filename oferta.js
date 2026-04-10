/**
 * Oferta: partículas del fondo con interacción (repulsión al mouse).
 * CTA: vórtice al clic y texto con RGB shift por proximidad.
 */
(function () {
  "use strict";

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function safeInvSqrt(n) {
    if (n <= 0) return 0;
    return 1 / Math.sqrt(n);
  }

  function initOfertaCtaChroma() {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var root = document.getElementById("oferta");
    if (!root) return;
    var cta = root.querySelector(".oferta__cta");
    if (!cta) return;

    var maxR = 220;

    var chromaRaf = null;
    var chromaX = 0;
    var chromaY = 0;

    function setFrom(clientX, clientY) {
      var rect = cta.getBoundingClientRect();
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.5;
      var dx = clientX - cx;
      var dy = clientY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var t = Math.max(0, 1 - dist / maxR);
      t = t * t;
      var px = t * 1.35;
      cta.style.setProperty("--cta-chroma", px + "px");
    }

    function flushChroma() {
      chromaRaf = null;
      setFrom(chromaX, chromaY);
    }

    root.addEventListener(
      "mousemove",
      function (e) {
        chromaX = e.clientX;
        chromaY = e.clientY;
        if (chromaRaf === null) chromaRaf = requestAnimationFrame(flushChroma);
      },
      { passive: true }
    );
    root.addEventListener(
      "mouseleave",
      function () {
        cta.style.setProperty("--cta-chroma", "0px");
      },
      { passive: true }
    );
  }

  function initOfertaSpotlight(root) {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var layer = root.querySelector(".oferta__spotlight");
    if (!layer) return;

    var spotRaf = null;
    var spotX = 0;
    var spotY = 0;

    function update() {
      spotRaf = null;
      var r = root.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var x = ((spotX - r.left) / r.width) * 100;
      var y = ((spotY - r.top) / r.height) * 100;
      layer.style.setProperty("--oferta-spot-x", x + "%");
      layer.style.setProperty("--oferta-spot-y", y + "%");
    }

    root.addEventListener(
      "mousemove",
      function (e) {
        spotX = e.clientX;
        spotY = e.clientY;
        if (spotRaf === null) spotRaf = requestAnimationFrame(update);
      },
      { passive: true }
    );
    root.addEventListener(
      "mouseleave",
      function () {
        layer.style.removeProperty("--oferta-spot-x");
        layer.style.removeProperty("--oferta-spot-y");
      },
      { passive: true }
    );
  }

  function initOfertaCtaMagnetic(root) {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var cta = root.querySelector(".oferta__cta");
    var label = root.querySelector(".oferta__cta-text");
    if (!cta || !label) return;

    var maxPx = 6;

    function onMove(e) {
      var rect = cta.getBoundingClientRect();
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.5;
      var nx = (e.clientX - cx) / Math.max(rect.width * 0.5, 1);
      var ny = (e.clientY - cy) / Math.max(rect.height * 0.5, 1);
      if (nx < -1) nx = -1;
      if (nx > 1) nx = 1;
      if (ny < -1) ny = -1;
      if (ny > 1) ny = 1;
      label.style.transform =
        "translate3d(" + nx * maxPx + "px," + ny * maxPx + "px,0)";
    }

    function onLeave() {
      label.style.transform = "";
    }

    cta.addEventListener("mousemove", onMove, { passive: true });
    cta.addEventListener("mouseleave", onLeave, { passive: true });
  }

  function initOfertaParticles() {
    if (prefersReducedMotion()) return;

    var root = document.getElementById("oferta");
    if (!root) return;

    var layer = root.querySelector(".oferta__particles");
    if (!layer) return;

    var cta = root.querySelector(".oferta__cta");

    var nodes = Array.prototype.slice.call(
      layer.querySelectorAll(".oferta__particle")
    );
    if (!nodes.length) return;

    var vortexActive = false;
    var vortexTx = 0;
    var vortexTy = 0;
    var vortexRunning = false;

    var state = nodes.map(function (el, i) {
      var r = 4 + ((i * 7) % 9);
      return {
        el: el,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: r,
      };
    });

    for (var k = 0; k < state.length; k++) {
      var ek = state[k].el;
      ek.style.animation = "none";
      ek.style.left = "0px";
      ek.style.top = "0px";
      ek.style.opacity = "0.6";
      ek.style.willChange = "transform";
      ek.style.transform = "translate3d(0px,0px,0)";
      ek.style.width = state[k].size * 2 + "px";
      ek.style.height = state[k].size * 2 + "px";
    }

    var pointer = { x: 0, y: 0, active: false };
    var lastT = performance.now();
    var raf = null;

    function layout() {
      var rect = layer.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;

      for (var i = 0; i < state.length; i++) {
        var s = state[i];
        if (!s._seeded) {
          var seed = (i * 1103515245 + 12345) >>> 0;
          var rx = (seed % 1000) / 1000;
          var ry = ((seed / 1000) % 1000) / 1000;
          s.x = rx * (w - s.size * 2) + s.size;
          s.y = ry * (h - s.size * 2) + s.size;
          s.vx = (rx - 0.5) * 0.18;
          s.vy = (ry - 0.5) * 0.18;
          s._seeded = true;
        } else {
          s.x = clamp(s.x, s.size, w - s.size);
          s.y = clamp(s.y, s.size, h - s.size);
        }
      }

      return { w: w, h: h, rect: rect };
    }

    var bounds = layout();

    function syncBoundsRect() {
      var rect = layer.getBoundingClientRect();
      bounds.w = rect.width;
      bounds.h = rect.height;
      bounds.rect = rect;
    }

    function onPointerMove(clientX, clientY) {
      syncBoundsRect();
      var rect = bounds.rect;
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.active = true;
      if (raf === null) raf = requestAnimationFrame(tick);
    }

    var pmRaf = null;
    var pmX = 0;
    var pmY = 0;
    function schedulePointerMove() {
      pmRaf = null;
      onPointerMove(pmX, pmY);
    }

    root.addEventListener(
      "mousemove",
      function (e) {
        pmX = e.clientX;
        pmY = e.clientY;
        if (pmRaf === null) pmRaf = requestAnimationFrame(schedulePointerMove);
      },
      { passive: true }
    );
    root.addEventListener(
      "mouseleave",
      function () {
        pointer.active = false;
      },
      { passive: true }
    );
    root.addEventListener(
      "touchmove",
      function (e) {
        if (!e.touches || !e.touches[0]) return;
        pmX = e.touches[0].clientX;
        pmY = e.touches[0].clientY;
        if (pmRaf === null) pmRaf = requestAnimationFrame(schedulePointerMove);
      },
      { passive: true }
    );
    root.addEventListener(
      "touchend",
      function () {
        pointer.active = false;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      function () {
        bounds = layout();
      },
      { passive: true }
    );

    function ctaCenterInLayer() {
      var lr = layer.getBoundingClientRect();
      var cr = cta.getBoundingClientRect();
      return {
        x: cr.left + cr.width * 0.5 - lr.left,
        y: cr.top + cr.height * 0.5 - lr.top,
      };
    }

    function reseedParticles() {
      for (var r = 0; r < state.length; r++) {
        state[r]._seeded = false;
      }
      bounds = layout();
    }

    var ctaLastPrimaryDownAt = 0;

    function armCtaFromPointer(ev) {
      if (ev.pointerType === "touch") {
        ctaLastPrimaryDownAt = 0;
        return;
      }
      if (ev.pointerType === "mouse" || ev.pointerType === "pen") {
        ctaLastPrimaryDownAt = ev.timeStamp || performance.now();
      }
    }

    function armCtaFromMouse(ev) {
      if (typeof ev.button === "number" && ev.button !== 0) return;
      ctaLastPrimaryDownAt = ev.timeStamp || performance.now();
    }

    if (cta) {
      cta.addEventListener("pointerdown", armCtaFromPointer, { passive: true });
      if (typeof window.PointerEvent === "undefined") {
        cta.addEventListener("mousedown", armCtaFromMouse, { passive: true });
      }

      cta.addEventListener(
        "click",
        function (ev) {
          if (vortexRunning) {
            ev.preventDefault();
            return;
          }

          var now = ev.timeStamp || performance.now();
          var fresh = ctaLastPrimaryDownAt && now - ctaLastPrimaryDownAt < 900;
          ctaLastPrimaryDownAt = 0;

          var useVortex = fresh && !prefersReducedMotion();
          if (!useVortex) return;

          ev.preventDefault();
          vortexRunning = true;
          pointer.active = false;

          var p = ctaCenterInLayer();
          vortexTx = p.x;
          vortexTy = p.y;
          vortexActive = true;
          if (raf === null) raf = requestAnimationFrame(tick);

          var href = cta.getAttribute("href");
          var targetAttr = cta.getAttribute("target");

          window.setTimeout(function () {
            vortexActive = false;
            vortexRunning = false;
            reseedParticles();

            if (targetAttr === "_blank") {
              var w = window.open(href, "_blank");
              if (w) {
                w.opener = null;
              } else {
                window.location.href = href;
              }
            } else {
              window.location.href = href;
            }
          }, 520);
        },
        false
      );
    }

    function tick(t) {
      raf = null;
      var dt = clamp((t - lastT) / 16.666, 0.5, 2.2);
      lastT = t;

      var w = bounds.w;
      var h = bounds.h;

      var repelR = Math.min(w, h) * 0.22;
      var repelR2 = repelR * repelR;

      for (var i = 0; i < state.length; i++) {
        var s = state[i];

        if (!vortexActive) {
          s.vx += (Math.sin((t * 0.001 + i) * 0.9) * 0.002) * dt;
          s.vy += (Math.cos((t * 0.0012 + i) * 0.85) * 0.002) * dt;
        }

        if (pointer.active && !vortexActive) {
          var dx = s.x - pointer.x;
          var dy = s.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > 1 && d2 < repelR2) {
            var d = Math.sqrt(d2);
            var nx = dx / d;
            var ny = dy / d;
            var k = 1 - d / repelR;
            var force = 0.9 * k * k * dt;
            s.vx += nx * force;
            s.vy += ny * force;
          }
        }

        if (vortexActive) {
          var ax = vortexTx - s.x;
          var ay = vortexTy - s.y;
          var ad = Math.sqrt(ax * ax + ay * ay) + 0.08;
          var pull = 0.095 * dt;
          s.vx += (ax / ad) * pull * 60;
          s.vy += (ay / ad) * pull * 60;
        }

        s.x += s.vx * 60 * dt;
        s.y += s.vy * 60 * dt;

        var fric = vortexActive ? 0.86 : 0.92;
        s.vx *= Math.pow(fric, dt);
        s.vy *= Math.pow(fric, dt);

        if (s.x < s.size) {
          s.x = s.size;
          s.vx = Math.abs(s.vx) * 0.85;
        } else if (s.x > w - s.size) {
          s.x = w - s.size;
          s.vx = -Math.abs(s.vx) * 0.85;
        }
        if (s.y < s.size) {
          s.y = s.size;
          s.vy = Math.abs(s.vy) * 0.85;
        } else if (s.y > h - s.size) {
          s.y = h - s.size;
          s.vy = -Math.abs(s.vy) * 0.85;
        }

        s.el.style.transform =
          "translate3d(" + (s.x | 0) + "px," + (s.y | 0) + "px,0)";
        if (vortexActive) {
          s.el.style.opacity = "1";
        } else {
          s.el.style.opacity = pointer.active ? "0.9" : "0.65";
        }
      }

      if (!vortexActive) {
        for (var a = 0; a < state.length; a++) {
          for (var b = a + 1; b < state.length; b++) {
            var p = state[a];
            var q = state[b];
            var dx2 = q.x - p.x;
            var dy2 = q.y - p.y;
            var minDist = p.size + q.size + 1.5;
            var minDist2 = minDist * minDist;
            var d2 = dx2 * dx2 + dy2 * dy2;
            if (d2 > 0 && d2 < minDist2) {
              var invD = safeInvSqrt(d2);
              var nx = dx2 * invD;
              var ny = dy2 * invD;
              var dist = 1 / invD;
              var overlap = minDist - dist;

              var push = overlap * 0.5 * dt;
              p.x -= nx * push;
              p.y -= ny * push;
              q.x += nx * push;
              q.y += ny * push;

              var rvx = q.vx - p.vx;
              var rvy = q.vy - p.vy;
              var rel = rvx * nx + rvy * ny;
              if (rel < 0) {
                var e = 0.78;
                var j = (-(1 + e) * rel) / 2;
                p.vx -= j * nx;
                p.vy -= j * ny;
                q.vx += j * nx;
                q.vy += j * ny;
              }

              p.x = clamp(p.x, p.size, w - p.size);
              p.y = clamp(p.y, p.size, h - p.size);
              q.x = clamp(q.x, q.size, w - q.size);
              q.y = clamp(q.y, q.size, h - q.size);
            }
          }
        }
      }

      var moving = pointer.active || vortexActive;
      if (!moving) {
        for (var j = 0; j < state.length; j++) {
          if (Math.abs(state[j].vx) + Math.abs(state[j].vy) > 0.012) {
            moving = true;
            break;
          }
        }
      }
      if (moving) {
        raf = requestAnimationFrame(tick);
      }
    }
  }

  function bootOferta() {
    var root = document.getElementById("oferta");
    if (root) {
      initOfertaSpotlight(root);
      initOfertaCtaMagnetic(root);
    }
    initOfertaParticles();
    initOfertaCtaChroma();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootOferta);
  } else {
    bootOferta();
  }
})();
