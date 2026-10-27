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



  // Classic game geometry is copied from codex/ludopaws-work:
  // LudoPawsFxBoardGeometry.kt START_OFFSETS, TRACK and axisBoundary().
  // The complete user-supplied artwork stays visible; one small portrait-based token moves after each roll.
  // This optional demo is a local visual preview, not an online multiplayer match.
  const gamePreview = document.querySelector("[data-rx4-ludo-replay]");
  if (gamePreview) {
    const dice = gamePreview.querySelector("[data-rx4-lp-dice]");
    const status = gamePreview.querySelector("[data-rx4-lp-status]");
    const TRACK = [
      [6,1],[6,2],[6,3],[6,4],[6,5],
      [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
      [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],
      [6,11],[6,12],[6,13],[6,14],[7,14],
      [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
      [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
      [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],
      [8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
    ];
    const START_OFFSETS = { goat:0, duck:13, cat:26, dog:39 };
    // Recreated square artwork has three equal-width regions: 6 + 3 + 6
    // logical columns. Use its actual percentage-based grid for pawn centers.
    const axisBoundary = (index) =>
      index <= 6 ? index * (100 / 18) :
      index <= 9 ? (100 / 3) + (index - 6) * (100 / 9) :
      (200 / 3) + (index - 9) * (100 / 18);
    const center = ([row, col]) => [
      (axisBoundary(col) + axisBoundary(col + 1)) / 2,
      (axisBoundary(row) + axisBoundary(row + 1)) / 2
    ];
    const sequence = [
      { id:"dog",face:"⚂",roll:3,name:"Dog" },
      { id:"duck",face:"⚃",roll:4,name:"Duck" },
      { id:"goat",face:"⚄",roll:5,name:"Goat" },
      { id:"cat",face:"⚁",roll:2,name:"Cat" }
    ];
    const positions = { dog:0,duck:0,goat:0,cat:0 };
    let turn=0;
    let busy=false;
    const setCenter = (animal, point) => {
      animal.style.left=point[0].toFixed(2)+"%";
      animal.style.top=point[1].toFixed(2)+"%";
    };
    const move = async (animal, nextPoint) => {
      const left=nextPoint[0].toFixed(2)+"%";
      const top=nextPoint[1].toFixed(2)+"%";
      if (!animal.animate || reduced.matches) {
        setCenter(animal,nextPoint);
        return;
      }
      const priorLeft=animal.style.left||getComputedStyle(animal).left;
      const priorTop=animal.style.top||getComputedStyle(animal).top;
      const animation=animal.animate([
        {left:priorLeft,top:priorTop,transform:"translate(-50%,-50%) scale(1)"},
        {left,top,transform:"translate(-50%,-78%) scale(1.15)",offset:.52},
        {left,top,transform:"translate(-50%,-50%) scale(1)"}
      ],{duration:280,easing:"ease-in-out"});
      try { await animation.finished; } catch (_) { /* hidden tab or animation cancelled */ }
      setCenter(animal,nextPoint);
      animation.cancel();
    };
    const playTurn=async () => {
      if(busy)return;
      busy=true;
      gamePreview.setAttribute("aria-busy","true");
      const step=sequence[turn%sequence.length];
      const animal=gamePreview.querySelector('[data-rx4-lp-pawn="'+step.id+'"]');
      animal.setAttribute("data-rx4-active","true");
      status.textContent=step.name+" rolling…";
      try {
        if (!reduced.matches && dice.animate) {
          const spin=dice.animate([
            {transform:"rotate(-15deg) scale(.9)"},
            {transform:"rotate(180deg) scale(1.1)"},
            {transform:"rotate(360deg) scale(1)"}
          ],{duration:500,easing:"ease-in-out"});
          try {await spin.finished;}catch(_){}
        }
        dice.textContent=step.face;
        status.textContent=step.name+" moving · "+step.roll+" steps";
        for(let n=0;n<step.roll;n++){
          positions[step.id]=(positions[step.id]+1)%TRACK.length;
          const cell=TRACK[(START_OFFSETS[step.id]+positions[step.id])%TRACK.length];
          await move(animal,center(cell));
        }
        status.textContent=step.name+" moved · tap to play next";
        turn++;
      }finally{
        busy=false;
        gamePreview.removeAttribute("aria-busy");
      }
    };
    gamePreview.addEventListener("click",()=>{void playTurn()});
    // One short preview is shown when first seen; no continuous match or server calls.
    if(!reduced.matches && "IntersectionObserver" in window){
      const once=new IntersectionObserver((entries,observer)=>{
        if(!entries.some(entry=>entry.isIntersecting))return;
        observer.disconnect();
        Promise.resolve().then(()=>{if(!busy && turn===0)void playTurn()});
      },{threshold:.65});
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
