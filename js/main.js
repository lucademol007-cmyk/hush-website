/* ==========================================================================
   hush — landing page interactions
   Vanilla JS, no dependencies. Every effect respects prefers-reduced-motion,
   and the page stays fully usable without this file.
   ========================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Header: soft background once the page moves ---------- */
  const header = $('[data-header]');
  const onHeaderScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);

  /* ---------- Mobile menu ---------- */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  const toggleLabel = $('.menu-toggle__label', toggle);

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Sluiten' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    header.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      const done = () => { if (toggle.getAttribute('aria-expanded') === 'false') menu.hidden = true; };
      reduceMotion.matches ? done() : setTimeout(done, 400);
    }
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('[data-menu-link]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll reveal ---------- */
  const revealTargets = $$('[data-reveal], [data-unveil]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Active section in the navigation ---------- */
  const navLinks = $$('.site-nav .nav-link');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navLinks.find((a) => a.getAttribute('href') === `#${entry.target.id}`);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        } else if (link.hasAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIO.observe(s));
  }

  /* ---------- Statement: words become clearer as you scroll, like a whisper becoming heard ---------- */
  const whisper = $('[data-whisper]');
  const words = [];
  if (whisper) {
    const wrapWords = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      });
    };
    wrapWords(whisper); // inline spans only: screen readers still read one sentence
  }

  const updateWhisper = () => {
    if (!words.length) return;
    if (reduceMotion.matches) { words.forEach((w) => w.style.removeProperty('--o')); return; }
    const rect = whisper.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the text enters the lower part of the screen, 1 when it reaches the upper-middle
    const progress = clamp((vh * 0.85 - rect.top) / (vh * 0.5), 0, 1);
    const reach = progress * (words.length + 2);
    words.forEach((w, i) => w.style.setProperty('--o', (0.2 + 0.8 * clamp(reach - i, 0, 1)).toFixed(3)));
  };

  /* ---------- Story image: gentle parallax ---------- */
  const parallaxEls = $$('[data-parallax]');
  const updateParallax = () => {
    if (reduceMotion.matches) return;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const centre = rect.top + rect.height / 2 - vh / 2;
      const shift = clamp(-centre * 0.06, -36, 36);
      $('img', el).style.setProperty('--py', `${shift.toFixed(1)}px`);
    });
  };

  /* ---------- One rAF-throttled scroll loop ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onHeaderScroll();
      updateWhisper();
      updateParallax();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Film: plays only while visible; always pausable ---------- */
  const video = $('[data-film]');
  const filmBtn = $('[data-film-toggle]');
  if (video && filmBtn) {
    const filmLabel = $('.film__label', filmBtn);
    let userPaused = false;

    const setFilmState = (playing) => {
      filmBtn.dataset.state = playing ? 'playing' : 'paused';
      filmLabel.textContent = playing ? 'Film pauzeren' : 'Film afspelen';
    };
    const play = () => {
      if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
      const p = video.play();
      if (p && p.catch) p.catch(() => setFilmState(false));
    };

    video.addEventListener('play', () => setFilmState(true));
    video.addEventListener('pause', () => setFilmState(false));

    filmBtn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; play(); }
      else { userPaused = true; video.pause(); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (!userPaused && !reduceMotion.matches) play();
          else if (video.preload === 'none') { video.preload = 'metadata'; video.load(); }
        } else if (!video.paused) {
          video.pause();
        }
      }, { threshold: 0.35 }).observe(video);
    }
  }

  /* ---------- Collection: choose a scent ---------- */
  const stage = $('[data-stage]');
  const scentButtons = $$('[data-scent]');
  const hotspots = $$('[data-scent-hotspot]');
  const hint = $('[data-scent-hint]');
  const names = { amber: 'Amber', iris: 'Iris', sage: 'Sage', noir: 'Noir' };
  let activeScent = null;

  const selectScent = (key, { syncForm = true } = {}) => {
    activeScent = activeScent === key ? null : key;

    scentButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scent === activeScent)));
    hotspots.forEach((h) => h.classList.toggle('is-active', h.dataset.scentHotspot === activeScent));

    if (activeScent) {
      const btn = scentButtons.find((b) => b.dataset.scent === activeScent);
      stage.style.setProperty('--spot-x', btn.dataset.x);
      stage.classList.add('has-active');
      hint.textContent = `Je koos ${names[activeScent]}. We hebben het al aangeduid in het inschrijfformulier hieronder.`;
    } else {
      stage.classList.remove('has-active');
      hint.textContent = 'Nog niet zeker? Dat is ook goed.';
    }

    if (syncForm) {
      const radio = $(`input[name="scent"][value="${activeScent || 'not-sure'}"]`);
      if (activeScent && radio) radio.checked = true;
      if (!activeScent) $$('input[name="scent"]').forEach((r) => { if (r.value !== 'not-sure') r.checked = false; });
    }
  };

  scentButtons.forEach((b) => b.addEventListener('click', () => selectScent(b.dataset.scent)));
  hotspots.forEach((h) => h.addEventListener('click', () => selectScent(h.dataset.scentHotspot)));

  // When someone changes their mind inside the form, keep the collection in step
  $$('input[name="scent"]').forEach((r) => r.addEventListener('change', () => {
    const key = names[r.value] ? r.value : null;
    if (key !== activeScent) {
      if (key) selectScent(key, { syncForm: false });
      else if (activeScent) selectScent(activeScent, { syncForm: false });
    }
  }));

  /* ---------- Newsletter form: front-end validation only ---------- */
  const form = $('[data-signup]');
  const formWrap = $('[data-form-wrap]');
  const success = $('[data-form-success]');
  const successTitle = $('[data-success-title]');
  const resetBtn = $('[data-form-reset]');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const messages = {
    firstName: 'Vul je voornaam in.',
    email: 'Dit e-mailadres lijkt niet helemaal te kloppen. Kijk je het even na?',
    optIn: 'Vink het vakje aan zodat we je onze e-mails mogen sturen.',
  };

  const rules = {
    firstName: (el) => el.value.trim().length > 0,
    email: (el) => EMAIL_RE.test(el.value.trim()),
    optIn: (el) => el.checked,
  };

  const validateField = (el) => {
    const field = el.closest('[data-field]');
    const error = $('[data-error]', field);
    const ok = rules[el.name](el);
    field.classList.toggle('is-invalid', !ok);
    field.classList.toggle('is-valid', ok && el.type !== 'checkbox');
    el.setAttribute('aria-invalid', String(!ok));
    error.textContent = ok ? '' : messages[el.name];
    return ok;
  };

  if (form) {
    const controls = Object.keys(rules).map((name) => form.elements[name]);

    controls.forEach((el) => {
      // validate once someone leaves a field, then keep feedback live while they fix it
      el.addEventListener('blur', () => { if (el.type !== 'checkbox' && el.value.trim()) validateField(el); });
      el.addEventListener('input', () => { if (el.closest('[data-field]').classList.contains('is-invalid')) validateField(el); });
      el.addEventListener('change', () => { if (el.type === 'checkbox') validateField(el); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = controls.map(validateField);
      const firstInvalid = controls[results.indexOf(false)];
      if (firstInvalid) { firstInvalid.focus(); return; }

      // No mailing service is connected: show an honest confirmation, send and store nothing.
      const name = form.elements.firstName.value.trim();
      successTitle.textContent = `Dank je wel, ${name}.`;
      formWrap.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });

    resetBtn.addEventListener('click', () => {
      form.reset();
      controls.forEach((el) => {
        const field = el.closest('[data-field]');
        field.classList.remove('is-invalid', 'is-valid');
        el.removeAttribute('aria-invalid');
        $('[data-error]', field).textContent = '';
      });
      if (activeScent) selectScent(activeScent, { syncForm: false });
      success.hidden = true;
      formWrap.hidden = false;
      form.elements.firstName.focus();
    });
  }
})();
