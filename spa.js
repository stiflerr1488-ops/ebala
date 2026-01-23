/* SPA-lite navigation for NP.Maps (progressive enhancement)
 * Fixes for rapid clicking:
 * - aborts previous in-flight navigation (AbortController)
 * - ignores stale responses (nav sequence id)
 * - small click throttle to avoid UI lockups
 * - optional in-memory cache for fetched pages
 *
 * Behavior:
 * - intercepts same-origin links to pages (with or without .html)
 * - swaps <main id="main-content"> from fetched page
 * - updates <title> and active menu item
 * - emits CustomEvent('np:page', {detail:{url}}) after swap
 */
(function () {
  const MAIN_SELECTOR = '#main-content';
  const MAX_CACHE = 15; // pages
  const CLICK_THROTTLE_MS = 180;

  /** Simple LRU cache */
  const pageCache = new Map(); // url -> { html, title, mainHTML }
  function cacheGet(key) {
    const v = pageCache.get(key);
    if (!v) return null;
    pageCache.delete(key);
    pageCache.set(key, v);
    return v;
  }
  function cacheSet(key, value) {
    if (pageCache.has(key)) pageCache.delete(key);
    pageCache.set(key, value);
    while (pageCache.size > MAX_CACHE) {
      const firstKey = pageCache.keys().next().value;
      pageCache.delete(firstKey);
    }
  }

  
function stripHtmlExt(pathname) {
  if (!pathname) return '/';
  let p = pathname;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (p === '/index') return '/';
  if (p.endsWith('.html')) {
    const base = p.slice(0, -5);
    return base === '' ? '/' : base;
  }
  return p;
}

function toHtmlPath(pathname) {
  const p = stripHtmlExt(pathname);
  if (p === '/' || p === '') return '/index.html';
  if (/\.[a-z0-9]+$/i.test(p)) return p;
  return p + '.html';
}

function shouldInterceptLink(a) {
    if (!a) return false;

    // respect explicit opt-out or download
    if (a.hasAttribute('download')) return false;
    const rel = (a.getAttribute('rel') || '').toLowerCase();
    if (rel.includes('external')) return false;

    const href = a.getAttribute('href');
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

    // target new tab/window -> don't intercept
    const target = (a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return false;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return false;
    }

    if (url.origin !== window.location.origin) return false;

    // intercept html pages and clean URLs without extension
    const path = stripHtmlExt(url.pathname);
    if (path !== '/' && /\.[a-z0-9]+$/i.test(path)) return false;

    return true;
  }

  
function updateActiveLinks() {
  const current = stripHtmlExt(window.location.pathname);
  document.querySelectorAll('a[aria-current="page"]').forEach((a) => a.removeAttribute('aria-current'));
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try { url = new URL(href, window.location.href); } catch { return; }
    if (url.origin !== window.location.origin) return;

    const linkPath = stripHtmlExt(url.pathname);
    if (linkPath === current) a.setAttribute('aria-current', 'page');
  });
}

  let navSeq = 0;
  let controller = null;
  let lastClickAt = 0;

  function setBusy(isBusy) {
    // lightweight indicator for debugging / optional styling
    document.documentElement.toggleAttribute('data-spa-busy', !!isBusy);
  }

  async function fetchPage(url, signal) {
    const cached = cacheGet(url.href);
    if (cached) return cached;

    const res = await fetch(url.href, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Requested-With': 'np-spa' },
      signal,
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = doc.querySelector(MAIN_SELECTOR);

    const payload = {
      html,
      title: (doc.querySelector('title') && doc.querySelector('title').textContent) ? doc.querySelector('title').textContent : document.title,
      mainHTML: nextMain ? nextMain.innerHTML : null,
    };

    cacheSet(url.href, payload);
    return payload;
  }

  async function loadPage(href, pushState = true) {
    const requested = new URL(href, window.location.href);
    const displayUrl = new URL(requested.href);
    displayUrl.pathname = stripHtmlExt(requested.pathname);
    const fetchUrl = new URL(requested.href);
    fetchUrl.pathname = toHtmlPath(displayUrl.pathname);

    // If user clicks current page, do nothing
    if (displayUrl.pathname === stripHtmlExt(window.location.pathname) && displayUrl.search === window.location.search && pushState) return;

    // Abort previous navigation
    if (controller) {
      try { controller.abort(); } catch {}
    }
    controller = new AbortController();

    const seq = ++navSeq;
    setBusy(true);

    try {
      const main = document.querySelector(MAIN_SELECTOR);
      if (!main) throw new Error('No main container');

      const payload = await fetchPage(fetchUrl, controller.signal);
      if (controller.signal.aborted) return;

      // If another navigation started, ignore this one
      if (seq !== navSeq) return;

      if (payload.mainHTML == null) {
        // fallback to full navigation if structure unexpected
        window.location.href = requested.href;
        return;
      }

      // Swap content
      main.innerHTML = payload.mainHTML;

      // Update title
      document.title = payload.title;

      // Update history
      if (pushState) {
        history.pushState({ spa: true }, '', displayUrl.pathname + displayUrl.search + displayUrl.hash);
      } else {
        history.replaceState({ spa: true }, '', displayUrl.pathname + displayUrl.search + displayUrl.hash);
      }

      // Scroll to top
      window.scrollTo(0, 0);

      // Update active links
      updateActiveLinks();

      // Notify scripts to re-bind behavior on new DOM
      try {
        window.dispatchEvent(new CustomEvent('np:page', { detail: { url: displayUrl.href } }));
      } catch {}

    } catch (err) {
      // If aborted, silently ignore
      if (controller && controller.signal && controller.signal.aborted) return;

      // fallback to full navigation
      window.location.href = requested.href;
    } finally {
      if (seq === navSeq) setBusy(false);
    }
  }

  document.addEventListener('click', (e) => {
    // ignore modified clicks (new tab, etc.)
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastClickAt < CLICK_THROTTLE_MS) {
      // prevent hammering (keeps UI responsive)
      e.preventDefault();
      return;
    }

    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!shouldInterceptLink(a)) return;

    lastClickAt = now;
    e.preventDefault();
    loadPage(a.getAttribute('href'), true);
  }, { passive: false });

  window.addEventListener('popstate', () => {
    // when back/forward happens, load current URL content
    loadPage(window.location.href, false);
  });

  // Optional prefetch on hover to make navigation instant
  document.addEventListener('mouseover', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!shouldInterceptLink(a)) return;

    const href = a.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href, window.location.href);
      if (cacheGet(url.href)) return; // already cached (touch already done)
      // put it back if exists
      // (cacheGet moves to end; if null, proceed)
      const prefetchController = new AbortController();
      fetchPage(url, prefetchController.signal).catch(() => {});
    } catch {}
  }, { passive: true });

  // Initial state: mark active menu item
  updateActiveLinks();
})();