/**
 * Beneficios: pin + scroll horizontal; el video de fondo sigue el scroll.
 * Hacia adelante: play() + playbackRate (flujo normal del decodificador, menos pixelado).
 * Hacia atrás: seek puntual (inevitablemente más brusco).
 */
(function () {
  "use strict";

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

  function initBeneficios() {
    var root = document.getElementById("beneficios");
    var track = document.getElementById("beneficiosTrack");
    var walkVideo = document.getElementById("beneficiosWalkVideo");

    if (!root || !track) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    function viewportWidth() {
      var vp = root.querySelector(".beneficios__viewport");
      return vp && vp.clientWidth > 0 ? vp.clientWidth : window.innerWidth;
    }

    function scrollDistance() {
      return Math.max(0, track.scrollWidth - viewportWidth());
    }

    var videoTargetTime = 0;
    var chaseRaf = null;
    var pinIsActive = false;
    var smoothedPlaybackRate = 1;

    function clampTime(t, duration) {
      if (!duration || isNaN(duration)) {
        return 0;
      }
      if (t >= duration) {
        return duration - 0.03;
      }
      if (t < 0) {
        return 0;
      }
      return t;
    }

    function stopChaseLoop() {
      if (chaseRaf !== null) {
        cancelAnimationFrame(chaseRaf);
        chaseRaf = null;
      }
      if (walkVideo) {
        try {
          walkVideo.pause();
          walkVideo.playbackRate = 1;
        } catch (e) {}
      }
      smoothedPlaybackRate = 1;
    }

    function chaseLoop() {
      chaseRaf = null;
      if (!pinIsActive || !walkVideo) {
        return;
      }

      if (walkVideo.readyState < 2) {
        chaseRaf = requestAnimationFrame(chaseLoop);
        return;
      }

      var d = walkVideo.duration;
      if (!d || isNaN(d)) {
        chaseRaf = requestAnimationFrame(chaseLoop);
        return;
      }

      var target = clampTime(videoTargetTime, d);
      var cur = walkVideo.currentTime;
      var diff = target - cur;

      try {
        if (diff > 0.028) {
          /* Progreso del scroll ya va suavizado (scrub alto); acá solo perseguimos con rate estable */
          var desired = Math.min(
            3.4,
            Math.max(0.88, 1 + Math.pow(Math.min(diff, 2.5), 0.72) * 1.65)
          );
          smoothedPlaybackRate += (desired - smoothedPlaybackRate) * 0.26;
          walkVideo.playbackRate = smoothedPlaybackRate;
          walkVideo.play().catch(function () {});
        } else if (diff < -0.055) {
          walkVideo.pause();
          smoothedPlaybackRate = 1;
          walkVideo.currentTime = target;
        } else {
          walkVideo.pause();
          smoothedPlaybackRate = 1;
          walkVideo.playbackRate = 1;
          if (Math.abs(cur - target) > 0.006) {
            walkVideo.currentTime = target;
          }
        }
      } catch (e2) {}

      cur = walkVideo.currentTime;
      var stillPlaying = !walkVideo.paused;
      var stillFar = Math.abs(clampTime(videoTargetTime, d) - cur) > 0.03;
      if (stillPlaying || stillFar) {
        chaseRaf = requestAnimationFrame(chaseLoop);
      }
    }

    function startChaseLoop() {
      if (chaseRaf === null) {
        chaseRaf = requestAnimationFrame(chaseLoop);
      }
    }

    function ensureLayout(cb) {
      var d = scrollDistance();
      if (d > 8) {
        cb();
        return;
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (scrollDistance() > 8) {
            cb();
          }
        });
      });
    }

    if (walkVideo) {
      try {
        walkVideo.pause();
        walkVideo.playsInline = true;
        walkVideo.muted = true;
      } catch (e0) {}
      walkVideo.addEventListener(
        "loadedmetadata",
        function () {
          ScrollTrigger.refresh();
        },
        { passive: true }
      );
    }

    ensureLayout(function () {
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: function () {
            return "+=" + scrollDistance();
          },
          pin: true,
          scrub: 0.48,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: function (self) {
            pinIsActive = self.isActive;
            if (pinIsActive) {
              startChaseLoop();
            } else {
              stopChaseLoop();
            }
          },
          onUpdate: function (self) {
            if (!walkVideo || walkVideo.readyState < 1) {
              return;
            }
            var dur = walkVideo.duration;
            if (!dur || isNaN(dur)) {
              return;
            }
            videoTargetTime = self.progress * dur;
            if (pinIsActive) {
              startChaseLoop();
            }
          },
        },
      });

      tl.to(
        track,
        {
          x: function () {
            return -scrollDistance();
          },
          ease: "none",
          duration: 1,
        },
        0
      );

      window.addEventListener(
        "resize",
        function () {
          debouncedRefresh();
        },
        { passive: true }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBeneficios);
  } else {
    initBeneficios();
  }
})();
