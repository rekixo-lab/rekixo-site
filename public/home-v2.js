(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealItems = document.querySelectorAll('.rx-reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('show');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px' });

    revealItems.forEach((item, index) => {
      if (!reduceMotion) item.style.transitionDelay = String(Math.min((index % 4) * 55, 165)) + 'ms';
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('show'));
  }

  function setupSlider(root, options) {
    if (!root) return;
    const slides = Array.from(root.querySelectorAll(options.slide));
    const dots = Array.from(root.querySelectorAll(options.dot));
    const prev = root.querySelector(options.prev);
    const next = root.querySelector(options.next);
    const counter = root.querySelector(options.counter);
    const track = options.track ? root.querySelector(options.track) : null;
    let index = 0;
    let timer = 0;
    let pointerStartX = null;

    const render = (nextIndex, userInitiated) => {
      index = (nextIndex + slides.length) % slides.length;
      if (track) {
        track.style.transform = 'translate3d(-' + String(index * 100) + '%,0,0)';
      } else {
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      }
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        if (track) slide.toggleAttribute('inert', !active);
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      if (counter) {
        counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      }
      if (userInitiated) restart();
    };

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      if (reduceMotion || slides.length < 2 || timer) return;
      timer = window.setInterval(() => render(index + 1, false), options.interval || 5200);
    };

    const restart = () => {
      stop();
      start();
    };

    if (prev) prev.addEventListener('click', () => render(index - 1, true));
    if (next) next.addEventListener('click', () => render(index + 1, true));
    dots.forEach((dot, i) => dot.addEventListener('click', () => render(i, true)));

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', (event) => {
      if (!root.contains(event.relatedTarget)) start();
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        render(index - 1, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        render(index + 1, true);
      }
    });

    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      pointerStartX = event.clientX;
    }, { passive: true });

    root.addEventListener('pointerup', (event) => {
      if (pointerStartX === null) return;
      const delta = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(delta) < 42) return;
      render(index + (delta < 0 ? 1 : -1), true);
    }, { passive: true });

    root.addEventListener('pointercancel', () => {
      pointerStartX = null;
    }, { passive: true });

    render(0, false);
    start();
  }

  setupSlider(document.querySelector('[data-live-showcase]'), {
    slide: '[data-live-slide]',
    dot: '[data-live-dot]',
    prev: '[data-live-prev]',
    next: '[data-live-next]',
    counter: '[data-live-counter]',
    interval: 4800
  });

  setupSlider(document.querySelector('[data-product-slider]'), {
    slide: '[data-product-slide]',
    dot: '[data-product-dot]',
    prev: '[data-product-prev]',
    next: '[data-product-next]',
    counter: '[data-product-counter]',
    track: '[data-product-track]',
    interval: 5600
  });
})();