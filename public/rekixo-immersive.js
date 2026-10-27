/* REKIXO homepage interactions: progressive enhancement, no external dependencies. */
(() => {
  const body = document.body;
  if (!body || !body.classList.contains("rx4-home")) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const canReveal = !reduced.matches && "IntersectionObserver" in window;

  // The shared Rekixo script already observes .rx3-reveal. Only activate the
  // hidden-to-visible presentation when that observer can run.
  if (canReveal) body.classList.add("rx4-ready");

  const workspace = document.querySelector("[data-rx4-workbench]");
  if (workspace) {
    const tabs = Array.from(workspace.querySelectorAll('[role="tab"][data-rx4-tab]'));
    const panels = Array.from(workspace.querySelectorAll('[role="tabpanel"][data-rx4-panel]'));
    const select = (target, moveFocus = false) => {
      const name = target.dataset.rx4Tab;
      tabs.forEach((tab) => {
        const active = tab === target;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.rx4Panel !== name;
      });
      if (moveFocus) target.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (event) => {
        let next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === "Home") next = tabs[0];
        if (event.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        select(next, true);
      });
    });
  }

  // Pointer tilt adds a subtle sense of depth without moving text/links.
  // Never listen on touch, and always reset on pointer exit.
  const editor = document.querySelector(".rx4-editor-shell");
  if (editor && desktopPointer.matches && !reduced.matches) {
    let frame = 0;
    editor.addEventListener("pointermove", (event) => {
      if (frame) return;
      const x = event.clientX;
      const y = event.clientY;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = editor.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (x - r.left - r.width / 2) / Math.max(r.width / 2, 1)));
        const dy = Math.max(-1, Math.min(1, (y - r.top - r.height / 2) / Math.max(r.height / 2, 1)));
        editor.style.transform = "perspective(1400px) rotateX(" + (-dy * 2.5).toFixed(2) +
          "deg) rotateY(" + (dx * 3).toFixed(2) + "deg)";
      });
    }, { passive: true });
    editor.addEventListener("pointerleave", () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      editor.style.transform = "";
    });
  }


  // Authentic LudoPaws board art; a self-contained showcase animation, not an
  // online match. Cropped animal portraits are taken from the same board image.
  const gamePreview = document.querySelector("[data-rx4-ludo-replay]");
  if (gamePreview) {
    const dice = gamePreview.querySelector("[data-rx4-lp-dice]");
    const status = gamePreview.querySelector("[data-rx4-lp-status]");
    const sequence = [
      { id: "dog", face: "⚅", name: "Dog", stops: [[43.33, 90], [43.33, 83.33], [43.33, 76.67], [43.33, 70]] },
      { id: "duck", face: "⚃", name: "Duck", stops: [[56.67, 10], [56.67, 16.67], [56.67, 23.33], [56.67, 30]] },
      { id: "goat", face: "⚄", name: "Goat", stops: [[10, 43.33], [16.67, 43.33], [23.33, 43.33], [30, 43.33]] },
      { id: "cat", face: "⚂", name: "Cat", stops: [[90, 56.67], [83.33, 56.67], [76.67, 56.67], [70, 56.67]] }
    ];
    let turn = 0;
    let busy = false;
    const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const hop = async (animal, x, y, duration) => {
      const left = x + "%";
      const top = y + "%";
      if (!animal.animate || reduced.matches) {
        animal.style.left = left;
        animal.style.top = top;
        return;
      }
      const previousX = animal.style.left || getComputedStyle(animal).left;
      const previousY = animal.style.top || getComputedStyle(animal).top;
      const animation = animal.animate([
        { left: previousX, top: previousY, transform: "translate(-50%,-50%) scale(1)" },
        { left: left, top: top, transform: "translate(-50%,-75%) scale(1.12)", offset: .55 },
        { left, top, transform: "translate(-50%,-50%) scale(1)" }
      ], { duration, easing: "ease-in-out" });
      try { await animation.finished; } catch (_) { /* cancelled / hidden document */ }
      animal.style.left = left;
      animal.style.top = top;
      animation.cancel();
    };
    const playTurn = async () => {
      if (busy) return;
      busy = true;
      gamePreview.setAttribute("aria-busy", "true");
      const step = sequence[turn % sequence.length];
      const animal = gamePreview.querySelector('[data-rx4-lp-pawn="' + step.id + '"]');
      status.textContent = step.name + " rolls the dice";
      try {
        if (!reduced.matches && dice.animate) {
          const roll = dice.animate(
            [{transform:"rotate(-15deg) scale(.88)"},{transform:"rotate(165deg) scale(1.12)"},{transform:"rotate(360deg) scale(1)"}],
            {duration:540,easing:"ease-in-out"}
          );
          try { await roll.finished; } catch (_) { /* reduced motion changed */ }
        }
        dice.textContent = step.face;
        status.textContent = step.name + " moves along the track";
        for (const [x,y] of step.stops) await hop(animal,x,y, reduced.matches ? 0 : 320);
        status.textContent = step.name + " moved · tap to roll again";
        turn++;
      } finally {
        busy = false;
        gamePreview.removeAttribute("aria-busy");
      }
    };
    gamePreview.addEventListener("click", () => { void playTurn(); });
    // Run just one visible preview turn, then stop. No heavy infinite loop.
    if (!reduced.matches && "IntersectionObserver" in window) {
      const once = new IntersectionObserver((entries, observer) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        // A microtask lets a direct click win if it happens first.
        Promise.resolve().then(() => { if (!busy && turn === 0) void playTurn(); });
      }, { threshold: .65 });
      once.observe(gamePreview);
    }
  }

  // If reduced-motion changes while the page is open, remove hidden reveals.
  const showAll = () => {
    if (!reduced.matches) return;
    body.classList.remove("rx4-ready");
    document.querySelectorAll(".rx4-home .rx3-reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
    if (editor) editor.style.transform = "";
  };
  if (typeof reduced.addEventListener === "function") {
    reduced.addEventListener("change", showAll);
  }
  showAll();
})();
