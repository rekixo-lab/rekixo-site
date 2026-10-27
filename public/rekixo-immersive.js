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
