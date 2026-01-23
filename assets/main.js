(function () {
      const root = document.documentElement;
      const body = document.body;
      const btn = document.getElementById("themeToggle");
      const progressBar = document.querySelector(".scroll-progress__bar");
      const backToTop = document.getElementById("backToTop");
      const header = document.querySelector(".site-header");
      const toast = document.getElementById("toast");
      const nav = document.getElementById("siteNav");
      const navToggle = document.getElementById("navToggle");
      const navBackdrop = document.getElementById("navBackdrop");
      const NAV_OPEN_ATTR = "data-nav-open";
      const prefersReducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

      const storageKey = "theme"; // "light" | "dark"

      function getSystemTheme() {
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      function getSavedTheme() {
        try { return localStorage.getItem(storageKey); } catch { return null; }
      }

      function applyThemeAttribute(theme) {
        // Всегда держим явную тему на html (и на body для совместимости),
        // чтобы кнопка и стили не "пропадали" после инициализации.
        const t = theme === "light" || theme === "dark" ? theme : getSystemTheme();
        [root, body].forEach((node) => {
          if (!node) return;
          node.setAttribute("data-theme", t);
        });
        return t;
      }

      function updateThemeArt(activeTheme) {
        try {
          document.querySelectorAll('img[data-src-dark][data-src-light]').forEach((img) => {
            const next = activeTheme === "dark" ? img.getAttribute("data-src-dark") : img.getAttribute("data-src-light");
            if (next && img.getAttribute("src") !== next) img.setAttribute("src", next);
          });
        } catch {}
      }

      function setTheme(theme, { save = true } = {}) {
        const active = applyThemeAttribute(theme);
        if (btn) {
          btn.setAttribute("aria-pressed", active === "dark" ? "true" : "false");
        }

        if (save) {
          try {
            if (theme) localStorage.setItem(storageKey, theme);
            else localStorage.removeItem(storageKey);
          } catch {}
        }

        // (необязательно) цвет адресной строки на мобилках
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", active === "dark" ? "#0c0f16" : "#fbf7f1");

        // Переключаем иллюстрации (dark/light) одним src, чтобы не было "двойных" картинок.
        updateThemeArt(active);
      }

      // 1) Старт: если есть сохранённая — применяем. Иначе система.
      const saved = getSavedTheme();
      if (saved === "light" || saved === "dark") setTheme(saved, { save: false });
      else setTheme(getSystemTheme(), { save: false });

      // 2) Клик по кнопке: переключаем относительно текущего
      if (btn) {
        btn.addEventListener("click", () => {
          const current = root.getAttribute("data-theme") || getSystemTheme();
          const next = current === "dark" ? "light" : "dark";
          setTheme(next);
        });
      }

      // 3) Если пользователь не выбирал тему, а системная изменилась — обновляем UI-иконку/состояние
      const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
      if (mq) {
        mq.addEventListener("change", () => {
          if (!root.hasAttribute("data-theme")) setTheme(null, { save: false });
        });
      }

      window.addEventListener("storage", (event) => {
        if (event.key !== storageKey) return;
        const nextTheme = event.newValue;
        if (nextTheme === "light" || nextTheme === "dark") {
          setTheme(nextTheme, { save: false });
        } else {
          setTheme(null, { save: false });
        }
      });

      function setNavOpen(isOpen) {
        if (!nav || !navToggle || !navBackdrop) return;
        if (isOpen) {
          body.setAttribute(NAV_OPEN_ATTR, "true");
          navBackdrop.hidden = false;
          navToggle.setAttribute("aria-expanded", "true");
          const behaviorLock = prefersReducedMotion && prefersReducedMotion.matches ? "auto" : "smooth";
          // фокус в меню (без агрессии)
          const firstLink = nav.querySelector('a[href^="#"]');
          if (firstLink) firstLink.focus({ preventScroll: true });
          // блокируем скролл подложки
          body.style.overflow = "hidden";
          // компенсируем прыжок от исчезновения scrollbar
          const scrollBar = window.innerWidth - document.documentElement.clientWidth;
          if (scrollBar > 0) body.style.paddingRight = scrollBar + "px";
        } else {
          body.removeAttribute(NAV_OPEN_ATTR);
          navBackdrop.hidden = true;
          navToggle.setAttribute("aria-expanded", "false");
          body.style.overflow = "";
          body.style.paddingRight = "";
          navToggle.focus({ preventScroll: true });
        }
      }

      function isNavOpen() {
        return body.getAttribute(NAV_OPEN_ATTR) === "true";
      }

      function toggleNav() {
        setNavOpen(!isNavOpen());
      }

      if (navToggle && nav && navBackdrop) {
        navToggle.addEventListener("click", toggleNav);
        navBackdrop.addEventListener("click", () => setNavOpen(false));

        nav.addEventListener("click", (e) => {
          const t = e.target;
          if (t && t.matches && t.matches('a[href^="#"]')) setNavOpen(false);
        });

        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape") setNavOpen(false);
        });

        window.addEventListener("resize", () => {
          // если перешли на десктоп — закрываем меню
          if (window.matchMedia && window.matchMedia("(min-width: 1025px)").matches) setNavOpen(false);
        });
      }

      let toastTimeout;

      function showToast(message) {
        if (!toast) return;
        const label = toast.querySelector(".toast__message");
        if (label) label.textContent = message;
        toast.dataset.visible = "true";
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          toast.dataset.visible = "false";
        }, 1200);
      }

      function updateProgress() {
        if (!progressBar) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
      }

      function updateBackToTop() {
        if (!backToTop) return;
        const show = window.scrollY > 480;
        backToTop.dataset.visible = show ? "true" : "false";
      }

      function updateHeaderState() {
        if (!header) return;
        const shouldBeScrolled = window.scrollY > 60;
        header.classList.toggle("is-scrolled", shouldBeScrolled);
      }

      function onScroll() {
        updateProgress();
        updateBackToTop();
        updateHeaderState();
      }


      if (backToTop) {
        backToTop.addEventListener("click", () => {
          const behavior = prefersReducedMotion && prefersReducedMotion.matches ? "auto" : "smooth";
          window.scrollTo({ top: 0, behavior });
        });
      }

      let scrollTicking = false;

      function onScrollRaf() {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(() => {
          onScroll();
          scrollTicking = false;
        });
      }

      window.addEventListener("scroll", onScrollRaf, { passive: true });
      window.addEventListener("load", onScroll);
      window.addEventListener("resize", updateProgress);

      const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
	      const spySections = ["plan", "pricing", "services", "process", "faq"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

      function setActiveSection(id) {
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${id}`;
          if (isActive) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      }

      if (spySections.length) {
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActiveSection(visible.target.id);
          },
          {
            rootMargin: "-35% 0px -55% 0px",
            threshold: [0.2, 0.4, 0.6],
          }
        );

        spySections.forEach((section) => observer.observe(section));
        setActiveSection(spySections[0].id);
      }

      const spotlightQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
      const reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
      const cards = Array.from(document.querySelectorAll(".card"));
      const spotlightFrames = new WeakMap();
      const magneticFrames = new WeakMap();
      const MAX_MAGNETIC_SHIFT = 3;

      function updateCardSpotlight(card, clientX, clientY) {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const mx = ((clientX - rect.left) / rect.width) * 100;
        const my = ((clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mx", `${mx}%`);
        card.style.setProperty("--my", `${my}%`);
      }

      function onSpotlightMove(event) {
        const card = event.currentTarget;
        if (spotlightFrames.has(card)) return;
        const { clientX, clientY } = event;
        const frame = window.requestAnimationFrame(() => {
          updateCardSpotlight(card, clientX, clientY);
          spotlightFrames.delete(card);
        });
        spotlightFrames.set(card, frame);
      }

      function resetSpotlight(event) {
        const card = event.currentTarget;
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      }

      function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
      }

      function updateMagnetic(card, clientX, clientY) {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clamp((clientX - centerX) / rect.width, -1, 1);
        const dy = clamp((clientY - centerY) / rect.height, -1, 1);
        card.style.setProperty("--tx", `${(dx * MAX_MAGNETIC_SHIFT).toFixed(2)}px`);
        card.style.setProperty("--ty", `${(dy * MAX_MAGNETIC_SHIFT).toFixed(2)}px`);
      }

      function onMagneticMove(event) {
        const card = event.currentTarget;
        if (magneticFrames.has(card)) return;
        const { clientX, clientY } = event;
        const frame = window.requestAnimationFrame(() => {
          updateMagnetic(card, clientX, clientY);
          magneticFrames.delete(card);
        });
        magneticFrames.set(card, frame);
      }

      function resetMagnetic(event) {
        const card = event.currentTarget;
        card.style.setProperty("--tx", "0px");
        card.style.setProperty("--ty", "0px");
      }

      function setupSpotlight() {
        const shouldEnable = spotlightQuery && spotlightQuery.matches && !(reduceMotionQuery && reduceMotionQuery.matches);
        cards.forEach((card) => {
          if (!shouldEnable) {
            resetSpotlight({ currentTarget: card });
            return;
          }
          if (card.dataset.spotlightBound === "true") return;
          card.dataset.spotlightBound = "true";
          card.addEventListener("pointermove", onSpotlightMove, { passive: true });
          card.addEventListener("pointerleave", resetSpotlight, { passive: true });
        });
      }

      setupSpotlight();

      function setupMagnetic() {
        const shouldEnable = spotlightQuery && spotlightQuery.matches && !(reduceMotionQuery && reduceMotionQuery.matches);
        cards.forEach((card) => {
          if (!shouldEnable) {
            resetMagnetic({ currentTarget: card });
            return;
          }
          if (card.dataset.magneticBound === "true") return;
          card.dataset.magneticBound = "true";
          card.addEventListener("pointermove", onMagneticMove, { passive: true });
          card.addEventListener("pointerleave", resetMagnetic, { passive: true });
        });
      }

      setupMagnetic();

      if (spotlightQuery) spotlightQuery.addEventListener("change", setupSpotlight);
      if (reduceMotionQuery) reduceMotionQuery.addEventListener("change", setupSpotlight);
      if (spotlightQuery) spotlightQuery.addEventListener("change", setupMagnetic);
      if (reduceMotionQuery) reduceMotionQuery.addEventListener("change", setupMagnetic);

      const rippleReduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
      const rippleElements = Array.from(document.querySelectorAll(".btn, .card"));

      function createRipple(event) {
        if (rippleReduceMotion && rippleReduceMotion.matches) return;
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.35;
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.setProperty("--ripple-size", `${size}px`);
        ripple.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
        ripple.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
        target.appendChild(ripple);

        const remove = () => ripple.remove();
        ripple.addEventListener("animationend", remove, { once: true });
        setTimeout(remove, 500);
      }

      rippleElements.forEach((element) => {
        element.addEventListener("pointerdown", createRipple);
      });

      function revealCards() {
        if (reduceMotionQuery && reduceMotionQuery.matches) {
          cards.forEach((card) => card.classList.add("is-revealed"));
          return;
        }
        if (!("IntersectionObserver" in window)) {
          cards.forEach((card) => card.classList.add("is-revealed"));
          return;
        }
        const observer = new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-revealed");
              obs.unobserve(entry.target);
            });
          },
          { threshold: 0.18 }
        );
        cards.forEach((card) => observer.observe(card));
      }

      revealCards();

      const tiltQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
      const tiltTimeouts = new WeakMap();

      function clearCardTilt(card) {
        card.classList.remove("is-pressed");
        card.style.setProperty("--press-translate-x", "0px");
        card.style.setProperty("--press-translate-y", "0px");
        card.style.setProperty("--press-rotate-x", "0deg");
        card.style.setProperty("--press-rotate-y", "0deg");
      }

      function applyCardTilt(event) {
        if (!(tiltQuery && tiltQuery.matches)) return;
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = Math.max(-1, Math.min(1, (event.clientX - cx) / rect.width));
        const dy = Math.max(-1, Math.min(1, (event.clientY - cy) / rect.height));
        const rotateX = (-dy * 2).toFixed(2);
        const rotateY = (dx * 2).toFixed(2);
        const translateX = (dx * 1.5).toFixed(2);
        const translateY = (dy * 1.5).toFixed(2);
        card.classList.add("is-pressed");
        card.style.setProperty("--press-translate-x", `${translateX}px`);
        card.style.setProperty("--press-translate-y", `${translateY}px`);
        card.style.setProperty("--press-rotate-x", `${rotateX}deg`);
        card.style.setProperty("--press-rotate-y", `${rotateY}deg`);
        if (tiltTimeouts.has(card)) clearTimeout(tiltTimeouts.get(card));
        const timeout = setTimeout(() => {
          clearCardTilt(card);
          tiltTimeouts.delete(card);
        }, 160);
        tiltTimeouts.set(card, timeout);
      }

      cards.forEach((card) => {
        card.addEventListener("pointerdown", applyCardTilt);
        card.addEventListener("pointerleave", () => clearCardTilt(card));
        card.addEventListener("pointerup", () => clearCardTilt(card));
      });

      function flashSection(section) {
        if (!section) return;
        section.classList.remove("flash");
        void section.offsetWidth;
        section.classList.add("flash");
        setTimeout(() => section.classList.remove("flash"), 1100);
      }

      function handleHashChange() {
        const id = window.location.hash.replace("#", "");
        if (!id) return;
        flashSection(document.getElementById(id));
      }

      navLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
          const href = event.currentTarget.getAttribute("href");
          if (!href || !href.startsWith("#")) return;
          const target = document.querySelector(href);
          if (target) {
            window.requestAnimationFrame(() => flashSection(target));
          }
        });
      });

      window.addEventListener("hashchange", handleHashChange);
      window.addEventListener("load", handleHashChange);

      const copyTargets = Array.from(document.querySelectorAll("[data-copy]"));
      if (copyTargets.length && navigator.clipboard) {
        copyTargets.forEach((target) => {
          target.addEventListener("click", () => {
            const value = target.getAttribute("data-copy");
            if (!value) return;
            navigator.clipboard.writeText(value).then(
              () => showToast("Скопировано"),
              () => showToast("Не удалось скопировать")
            );
          });
        });
      }
    

      // --- Micro-анимации секций (аккуратно) ---
      (function initRevealAnimations() {
        const reduce = reduceMotionQuery && reduceMotionQuery.matches;
        const targets = Array.from(document.querySelectorAll('.section > .container, .site-footer .container'));
        if (!targets.length) return;

        targets.forEach((el, idx) => {
          // чтобы не ломать уже существующие эффекты
          el.classList.add('reveal');
          if (idx < 6) el.classList.add('reveal--early');
        });

        if (reduce || !('IntersectionObserver' in window)) {
          targets.forEach((el) => el.classList.add('in-view'));
          return;
        }

        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('in-view');
              io.unobserve(entry.target);
            });
          },
          { root: null, threshold: 0.14, rootMargin: '0px 0px -10% 0px' }
        );

        targets.forEach((el) => io.observe(el));
      })();

      // --- Floating CTA (FAB) ---
      (function initFloatingCta() {
        const wrap = document.getElementById('floatingCta');
        if (!wrap) return;
        const fab = wrap.querySelector('a');
        if (!fab) return;

        const reduce = prefersReducedMotion && prefersReducedMotion.matches;
        const ctaSection = document.getElementById('cta');
        let ctaVisible = false;

        if (ctaSection && 'IntersectionObserver' in window) {
          const io = new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              ctaVisible = !!(entry && entry.isIntersecting);
              update();
            },
            { threshold: 0.22 }
          );
          io.observe(ctaSection);
        }

        function shouldShow() {
          if (ctaVisible) return false;
          if (isNavOpen && isNavOpen()) return false;
          return window.scrollY > 520;
        }

        function update() {
          const want = shouldShow();
          wrap.dataset.visible = want ? 'true' : 'false';
          wrap.setAttribute('aria-hidden', want ? 'false' : 'true');
        }

        const rafUpdate = () => window.requestAnimationFrame(update);
        window.addEventListener('scroll', rafUpdate, { passive: true });
        window.addEventListener('resize', rafUpdate);
        update();

        if (!reduce && 'MutationObserver' in window) {
          const obs = new MutationObserver(() => {
            if (wrap.dataset.visible === 'true') {
              fab.classList.add('fab--pop');
              setTimeout(() => fab.classList.remove('fab--pop'), 260);
            }
          });
          obs.observe(wrap, { attributes: true, attributeFilter: ['data-visible'] });
        }
      })();

      // --- Telegram prefill form (без бэкенда) ---
(function initTelegramPrefill() {
  const form = document.getElementById('tgForm');
  const btn = document.getElementById('tgSend');
  const status = document.getElementById('formStatus');
  if (!form || !btn) return;

  const tgLinkEl = document.querySelector('a[href="https://t.me/np_maps"], a[data-copy="https://t.me/np_maps"], a[href^="https://t.me/np_maps"]');
  const tgHref = tgLinkEl ? tgLinkEl.getAttribute('href') : 'https://t.me/np_maps';
  const tgUser = (tgHref || '')
    .replace('https://t.me/', '')
    .replace('http://t.me/', '')
    .replace('https://telegram.me/', '')
    .split('?')[0]
    .replace('@', '')
    .trim() || 'np_maps';

  function setStatus(msg, isError) {
    if (!status) return;
    status.textContent = msg || '';
    status.dataset.error = isError ? 'true' : 'false';
  }

  function readForm() {
    const nameEl = document.getElementById('tgName');
    const nicheEl = document.getElementById('tgNiche');

    const name = nameEl ? nameEl.value.trim() : '';
    const niche = nicheEl ? nicheEl.value.trim() : '';

    return { name, niche, nameEl, nicheEl };
  }

  function validate(data) {
    if (!data.name) {
      setStatus('Нужно имя — чтобы нормально обратиться.', true);
      data.nameEl && data.nameEl.focus();
      return false;
    }
    if (!data.niche) {
      setStatus('Нужна ниша — чтобы сразу понять контекст.', true);
      data.nicheEl && data.nicheEl.focus();
      return false;
    }
    setStatus('', false);
    return true;
  }

  function buildMessage(data) {
    const parts = [];
    parts.push('Привет! Хочу разбор карточки на Картах.');
    parts.push('Имя: ' + data.name);
    parts.push('Ниша: ' + data.niche);
    parts.push('Ссылку на карточку пришлю в ответ.');
    parts.push('');
    parts.push('Можете подсказать 3–5 точек роста и с чего начать?');
    return parts.join('
');
  }

  btn.addEventListener('click', () => {
    const data = readForm();
    if (!validate(data)) return;

    const message = buildMessage(data);
    const tgUrl = 'https://t.me/' + encodeURIComponent(tgUser) + '?text=' + encodeURIComponent(message);

    setStatus('Открываю Telegram…', false);
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => setStatus('Если окно не открылось — напишите вручную в @' + tgUser + '.', false), 900);
  });
})();

// --- Tracking hooks (data-track) ---
      (function initTracking() {
        document.addEventListener(
          'click',
          (e) => {
            const el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
            if (!el) return;
            const tag = el.getAttribute('data-track');
            if (!tag) return;

            try {
            } catch {}

            // Yandex Metrika (если подключена)
            try {
              if (window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', tag);
            } catch {}

            // gtag (если подключен)
            try {
              if (window.gtag) window.gtag('event', tag, { event_category: 'cta', event_label: tag });
            } catch {}
          },
          { passive: true }
        );
      })();

})();
