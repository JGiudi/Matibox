(function () {
  const mqFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let moveHandler;
  let leaveHandler;

  function shouldEnable() {
    return mqFine.matches && !mqReduce.matches;
  }

  function enable() {
    const root = document.documentElement;
    const el = document.getElementById("customCursor");
    if (!el || root.classList.contains("has-custom-cursor")) return;

    root.classList.add("has-custom-cursor");
    el.removeAttribute("hidden");

    let raf = 0;
    let pendingX = 0;
    let pendingY = 0;

    moveHandler = function (e) {
      pendingX = e.clientX;
      pendingY = e.clientY;
      root.classList.add("custom-cursor--visible");
      if (!raf) {
        raf = requestAnimationFrame(function flush() {
          raf = 0;
          root.style.setProperty("--cursor-x", `${pendingX}px`);
          root.style.setProperty("--cursor-y", `${pendingY}px`);
        });
      }
    };

    leaveHandler = function () {
      root.classList.remove("custom-cursor--visible");
    };

    window.addEventListener("mousemove", moveHandler, { passive: true });
    root.addEventListener("mouseleave", leaveHandler);
  }

  function disable() {
    const root = document.documentElement;
    if (!root.classList.contains("has-custom-cursor")) return;

    root.classList.remove("has-custom-cursor", "custom-cursor--visible");
    root.style.removeProperty("--cursor-x");
    root.style.removeProperty("--cursor-y");

    const el = document.getElementById("customCursor");
    if (el) el.setAttribute("hidden", "");

    if (moveHandler) {
      window.removeEventListener("mousemove", moveHandler);
      moveHandler = null;
    }
    if (leaveHandler) {
      root.removeEventListener("mouseleave", leaveHandler);
      leaveHandler = null;
    }
  }

  function sync() {
    if (shouldEnable()) enable();
    else disable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  mqFine.addEventListener("change", sync);
  mqReduce.addEventListener("change", sync);
})();
