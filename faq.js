/**
 * FAQ: magnetic hover en preguntas, “decode” al abrir, línea dorada animada.
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

  function isFinePointer() {
    return window.matchMedia("(pointer: fine)").matches;
  }

  var SCRAMBLE_CHARSET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnñóíúáé0123456789¿?#·@$%";

  function randomChar() {
    return SCRAMBLE_CHARSET[(Math.random() * SCRAMBLE_CHARSET.length) | 0];
  }

  function scrambleText(element, finalText, durationMs, genRef, myGen, done) {
    var len = finalText.length;
    var start = performance.now();

    function frame(now) {
      if (genRef.value !== myGen) return;
      var t = Math.min(1, (now - start) / durationMs);
      var out = "";
      for (var i = 0; i < len; i++) {
        var c = finalText.charAt(i);
        if (c === " " || c === "\n" || c === "\t") {
          out += c;
          continue;
        }
        var revealPoint = len <= 1 ? 0.5 : (i / (len - 1)) * 0.88;
        if (t > revealPoint) {
          out += c;
        } else {
          out += randomChar();
        }
      }
      element.textContent = out;
      if (t < 1 && genRef.value === myGen) {
        requestAnimationFrame(frame);
      } else if (genRef.value === myGen) {
        element.textContent = finalText;
        if (done) done();
      }
    }
    requestAnimationFrame(frame);
  }

  function initMagnetic(root) {
    if (prefersReducedMotion() || !isFinePointer()) return;

    var summaries = root.querySelectorAll(".faq__summary");
    for (var s = 0; s < summaries.length; s++) {
      (function (summary) {
        var text = summary.querySelector(".faq__summary-text");
        if (!text) return;

        var maxPx = 5;

        function onMove(e) {
          var rect = summary.getBoundingClientRect();
          var cx = rect.left + rect.width * 0.5;
          var cy = rect.top + rect.height * 0.5;
          var nx = (e.clientX - cx) / Math.max(rect.width * 0.5, 1);
          var ny = (e.clientY - cy) / Math.max(rect.height * 0.5, 1);
          if (nx < -1) nx = -1;
          if (nx > 1) nx = 1;
          if (ny < -1) ny = -1;
          if (ny > 1) ny = 1;
          text.style.transform =
            "translate3d(" + nx * maxPx + "px," + ny * maxPx + "px,0)";
        }

        function onLeave() {
          text.style.transform = "";
        }

        summary.addEventListener("mousemove", onMove, { passive: true });
        summary.addEventListener("mouseleave", onLeave, { passive: true });
      })(summaries[s]);
    }
  }

  function initScramble(root) {
    if (prefersReducedMotion()) return;

    var items = root.querySelectorAll(".faq__item");
    for (var i = 0; i < items.length; i++) {
      (function (details) {
        var p = details.querySelector(".faq__body p");
        if (!p) return;
        var plain = p.textContent.trim();
        p.setAttribute("data-faq-plain", plain);

        var genRef = { value: 0 };

        details.addEventListener("toggle", function () {
          if (!details.open) {
            genRef.value++;
            p.textContent = p.getAttribute("data-faq-plain") || plain;
            return;
          }
          if (prefersReducedMotion()) return;

          var target = details.querySelector(".faq__body p");
          if (!target) return;
          var text = target.getAttribute("data-faq-plain") || plain;
          genRef.value++;
          var myGen = genRef.value;
          scrambleText(target, text, 300, genRef, myGen, null);
        });
      })(items[i]);
    }
  }

  function initLineDraw(root) {
    if (prefersReducedMotion()) return;

    var items = root.querySelectorAll(".faq__item");
    for (var i = 0; i < items.length; i++) {
      (function (details) {
        details.addEventListener("toggle", function () {
          if (!details.open) return;
          var line = details.querySelector(".faq__body-line");
          if (!line) return;
          line.style.transition = "none";
          line.style.transform = "scaleX(0.22)";
          line.style.opacity = "0.55";
          void line.offsetWidth;
          line.style.transition = "";
          line.style.transform = "";
          line.style.opacity = "";
        });
      })(items[i]);
    }
  }

  function boot() {
    var root = document.getElementById("faq");
    if (!root) return;
    initMagnetic(root);
    initScramble(root);
    initLineDraw(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
