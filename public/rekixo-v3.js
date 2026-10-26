(() => {
  const body = document.body;
  if (!body || !body.classList.contains("rx-v3-page")) return;

  const THEME_KEY = "rekixo-theme";
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  const preferredTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return systemTheme.matches ? "dark" : "light";
  };

  const syncThemeControls = () => {
    const active = root.dataset.theme === "dark" ? "dark" : "light";
    document.querySelectorAll("[data-rx3-theme-toggle]").forEach((button) => {
      const next = active === "dark" ? "light" : "dark";
      button.setAttribute("aria-label", "Switch to " + next + " mode");
      button.setAttribute("title", "Switch to " + next + " mode");
      button.setAttribute("aria-pressed", active === "dark" ? "true" : "false");
      const icon = button.querySelector("[data-rx3-theme-icon]");
      if (icon) icon.textContent = active === "dark" ? "☀" : "☾";
      const text = button.querySelector("[data-rx3-theme-text]");
      if (text) text.textContent = active === "dark" ? "Light mode" : "Dark mode";
    });
  };

  const applyTheme = (theme, persist) => {
    const next = theme === "dark" ? "dark" : "light";
    root.dataset.theme = next;
    root.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#07111f" : "#ffffff");
    document.querySelectorAll("[data-rx3-brand-logo]").forEach((logo) => {
      logo.setAttribute("src", next === "dark" ? "rekixo-logo-static.svg" : "rekixo-logo-light.svg");
    });
    if (persist) localStorage.setItem(THEME_KEY, next);
    syncThemeControls();
  };

  applyTheme(root.dataset.theme || preferredTheme(), false);

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const shellless = page === "business-card.html";
  const homeHref = page === "index.html" || page === "" ? "#top" : "index.html";
  const productsHref = page === "index.html" || page === "" ? "#products" : "index.html#products";
  const solutionsHref = page === "index.html" || page === "" ? "#solutions" : "index.html#solutions";

  const header = document.createElement("header");
  header.className = "rx3-header";
  header.innerHTML =
    '<div class="rx3-nav">' +
      '<a class="rx3-brand" href="' + homeHref + '" aria-label="Rekixo home">' +
        '<img data-rx3-brand-logo src="rekixo-logo-light.svg" alt="Rekixo" width="148" height="35" />' +
      '</a>' +
      '<nav class="rx3-navlinks" aria-label="Main navigation">' +
        '<a href="' + productsHref + '">Products</a>' +
        '<a href="' + solutionsHref + '">Solutions</a>' +
        '<a href="portfolio.html">Portfolio</a>' +
        '<a href="about.html">About</a>' +
        '<a href="contact.html">Contact</a>' +
      '</nav>' +
      '<button class="rx3-theme-toggle" type="button" data-rx3-theme-toggle aria-label="Switch theme" aria-pressed="false"><span class="rx3-theme-icon" data-rx3-theme-icon aria-hidden="true">☾</span></button>' +
      '<a class="rx3-navcta" href="contact.html">Get in touch</a>' +
      '<button class="rx3-menu-btn" type="button" aria-label="Open menu" aria-expanded="false" data-rx3-menu-btn>☰</button>' +
    '</div>' +
    '<div class="rx3-mobile-menu" data-rx3-mobile-menu>' +
      '<div class="rx3-mobile-menu-inner">' +
        '<a href="' + productsHref + '">Products</a>' +
        '<a href="' + solutionsHref + '">Solutions</a>' +
        '<a href="portfolio.html">Portfolio</a>' +
        '<a href="about.html">About</a>' +
        '<a href="contact.html">Contact</a>' +
        '<a href="contact.html">Get in touch →</a>' +
      '</div>' +
    '</div>';

  const existingHeader = document.querySelector("body > header");
  if (!shellless) {
    if (existingHeader) existingHeader.replaceWith(header);
    else body.prepend(header);
  }

  const menuBtn = header.querySelector("[data-rx3-menu-btn]");
  const mobileMenu = header.querySelector("[data-rx3-mobile-menu]");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.textContent = open ? "×" : "☰";
    });
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        mobileMenu.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.textContent = "☰";
      }
    });
  }

  document.querySelectorAll("[data-rx3-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  });
  syncThemeControls();

  const onSystemThemeChange = (event) => {
    if (localStorage.getItem(THEME_KEY)) return;
    applyTheme(event.matches ? "dark" : "light", false);
  };
  if (typeof systemTheme.addEventListener === "function") {
    systemTheme.addEventListener("change", onSystemThemeChange);
  } else if (typeof systemTheme.addListener === "function") {
    systemTheme.addListener(onSystemThemeChange);
  }

  const footer = document.createElement("footer");
  footer.className = "rx3-footer";
  footer.innerHTML =
    '<div class="rx3-footer-main">' +
      '<div class="rx3-footer-brand">' +
        '<img data-rx3-brand-logo src="rekixo-logo-light.svg" alt="Rekixo" width="140" height="33" />' +
        '<p>Digital products, apps, web platforms, dashboards and business software built with clear ownership and production-ready delivery.</p>' +
      '</div>' +
      '<div class="rx3-footer-links">' +
        '<div><strong>Products</strong>' +
          '<a href="https://finworkar.rekixo.com" target="_blank" rel="noopener">FinWorkar</a>' +
          '<a href="rekixo-ar3d.html">Rekixo AR3D</a>' +
          '<a href="portfolio.html">Portfolio</a>' +
        '</div>' +
        '<div><strong>Solutions</strong>' +
          '<a href="android-app-development.html">Android Apps</a>' +
          '<a href="web-app-development.html">Web Apps</a>' +
          '<a href="dashboard-development.html">Dashboards</a>' +
          '<a href="custom-software-development.html">Custom Software</a>' +
        '</div>' +
        '<div><strong>Company</strong>' +
          '<a href="about.html">About</a>' +
          '<a href="contact.html">Contact</a>' +
          '<a href="business-info.html">Business Info</a>' +
        '</div>' +
        '<div><strong>Legal</strong>' +
          '<a href="privacy-policy.html">Privacy Policy</a>' +
          '<a href="terms-and-conditions.html">Terms &amp; Conditions</a>' +
          '<a href="refund-cancellation-policy.html">Refund &amp; Cancellation</a>' +
          '<a href="delivery-policy.html">Delivery Policy</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="rx3-footer-bottom">' +
      '<div class="rx3-footer-bottom-inner">' +
        '<span>© 2026 Rekixo. All rights reserved.</span>' +
        '<span>Apps · Web Apps · Dashboards · Custom Software</span>' +
      '</div>' +
    '</div>';

  const existingFooter = document.querySelector("body > footer");
  if (!shellless) {
    if (existingFooter) existingFooter.replaceWith(footer);
    else body.append(footer);
    document.querySelectorAll("[data-rx3-brand-logo]").forEach((logo) => {
      logo.setAttribute("src", root.dataset.theme === "dark" ? "rekixo-logo-static.svg" : "rekixo-logo-light.svg");
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slider = document.querySelector("[data-rx3-product-slider]");
  if (slider) {
    const track = slider.querySelector("[data-rx3-slider-track]");
    const slides = Array.from(slider.querySelectorAll("[data-rx3-slide]"));
    const dots = Array.from(slider.querySelectorAll("[data-rx3-dot]"));
    const prev = slider.querySelector("[data-rx3-prev]");
    const next = slider.querySelector("[data-rx3-next]");
    let index = 0;
    let timer = 0;
    let pointerStartX = null;

    const render = (nextIndex, restart) => {
      index = (nextIndex + slides.length) % slides.length;
      if (track) track.style.transform = "translate3d(-" + String(index * 100) + "%,0,0)";
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        slide.toggleAttribute("inert", !active);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === index);
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
      if (restart) {
        stop();
        start();
      }
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      if (reduceMotion || slides.length < 2 || timer) return;
      timer = window.setInterval(() => render(index + 1, false), 5600);
    };

    if (prev) prev.addEventListener("click", () => render(index - 1, true));
    if (next) next.addEventListener("click", () => render(index + 1, true));
    dots.forEach((dot, i) => dot.addEventListener("click", () => render(i, true)));

    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", start);
    slider.addEventListener("focusin", stop);
    slider.addEventListener("focusout", (event) => {
      if (!slider.contains(event.relatedTarget)) start();
    });
    slider.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        render(index - 1, true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        render(index + 1, true);
      }
    });
    slider.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      pointerStartX = event.clientX;
    }, { passive: true });
    slider.addEventListener("pointerup", (event) => {
      if (pointerStartX === null) return;
      const delta = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(delta) < 44) return;
      render(index + (delta < 0 ? 1 : -1), true);
    }, { passive: true });
    slider.addEventListener("pointercancel", () => {
      pointerStartX = null;
    }, { passive: true });

    render(0, false);
    start();
  }

  const gallery = document.querySelector("[data-rx3-gallery]");
  if (gallery) {
    const prev = document.querySelector("[data-rx3-gallery-prev]");
    const next = document.querySelector("[data-rx3-gallery-next]");
    const step = () => Math.max(280, Math.min(gallery.clientWidth * 0.78, 430));
    if (prev) prev.addEventListener("click", () => gallery.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
    if (next) next.addEventListener("click", () => gallery.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
  }

  const revealItems = Array.from(document.querySelectorAll(".rx3-reveal"));
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px" });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();