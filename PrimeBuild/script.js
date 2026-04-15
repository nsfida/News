/* ============================================================
   PRIME BUILD — SHARED SCRIPT
   ============================================================ */

/* ── PAGE ORDER (for scroll-to-page nav) ─────────────────── */
const PAGE_ORDER = [
  'index.html',
  'About.html',
  'Who.html',
  'Services.html',
  'faq.html',
  'contact.html'
];

/* ── UTILITIES ───────────────────────────────────────────── */
function currentPage() {
  const path = window.location.pathname;
  const parts = path.split('/');
  const file = parts[parts.length - 1] || 'index.html';
  return file || 'index.html';
}

function navigateTo(url) {
  document.body.classList.add('page-out');
  setTimeout(() => { window.location.href = url; }, 420);
}

/* ── PAGE TRANSITION IN ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-in');
  setTimeout(() => document.body.classList.remove('page-in'), 500);

  initCursor();
  initHeader();
  initNav();
  initScrollProgress();
  initReveal();
  initScrollToPage();
  initFAQ();
  initCounters();
  initHamburger();
  markActiveNav();
});

/* ── CUSTOM CURSOR ───────────────────────────────────────── */
function initCursor() {
  const outer = document.querySelector('.cursor-outer');
  const inner = document.querySelector('.cursor-inner');
  if (!outer || !inner) return;

  let mx = -100, my = -100;
  let ox = -100, oy = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    inner.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  });

  function animateOuter() {
    ox += (mx - ox) * .12;
    oy += (my - oy) * .12;
    outer.style.transform = `translate(${ox}px,${oy}px) translate(-50%,-50%)`;
    requestAnimationFrame(animateOuter);
  }
  animateOuter();

  document.querySelectorAll('a, button, .card, .faq-trigger, .supplier-card, .contact-card').forEach(el => {
    el.addEventListener('mouseenter', () => outer.classList.add('expand'));
    el.addEventListener('mouseleave', () => outer.classList.remove('expand'));
  });
}

/* ── HEADER SCROLL STATE ─────────────────────────────────── */
function initHeader() {
  const header = document.querySelector('header');
  if (!header) return;

  function update() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
      header.classList.remove('at-top');
    } else {
      header.classList.remove('scrolled');
      header.classList.add('at-top');
    }
  }
  update();
  window.addEventListener('scroll', update, { passive:true });
}

/* ── NAV LINKS WITH TRANSITION ───────────────────────────── */
function initNav() {
  document.querySelectorAll('nav a, .nav-drawer a, .btn[href], a.btn').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel')) return;
      if (href === window.location.pathname || href === currentPage()) return;
      e.preventDefault();
      navigateTo(href);
    });
  });
}

/* ── MARK ACTIVE NAV ─────────────────────────────────────── */
function markActiveNav() {
  const page = currentPage();
  document.querySelectorAll('nav a, .nav-drawer a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ── HAMBURGER MENU ──────────────────────────────────────── */
function initHamburger() {
  const btn = document.querySelector('.hamburger');
  const drawer = document.querySelector('.nav-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    drawer.classList.toggle('open');
  });

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      drawer.classList.remove('open');
    });
  });
}

/* ── SCROLL PROGRESS BAR ─────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive:true });
}

/* ── SCROLL REVEAL ───────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        obs.unobserve(e.target);
      }
    });
  }, { threshold:.12, rootMargin:'0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));
}

/* ── SCROLL-TO-PAGE ──────────────────────────────────────── */
function initScrollToPage() {
  const page = currentPage();
  const idx  = PAGE_ORDER.findIndex(p => p === page || (page === '' && p === 'index.html'));
  if (idx === -1) return;

  let locked = false;
  let lastY  = window.scrollY;

  window.addEventListener('scroll', () => {
    if (locked) return;

    const cur  = window.scrollY;
    const win  = window.innerHeight;
    const doc  = document.documentElement.scrollHeight;
    const down = cur > lastY;
    const up   = cur < lastY;

    // Scroll down at bottom → next page
    if (down && cur + win >= doc - 4 && idx < PAGE_ORDER.length - 1) {
      locked = true;
      navigateTo(PAGE_ORDER[idx + 1]);
    }

    // Scroll up at top → prev page
    if (up && cur <= 2 && idx > 0) {
      locked = true;
      navigateTo(PAGE_ORDER[idx - 1]);
    }

    lastY = cur <= 0 ? 0 : cur;
  }, { passive:true });
}

/* ── FAQ ACCORDION ───────────────────────────────────────── */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const body    = item.querySelector('.faq-body');
    if (!trigger || !body) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      items.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-body');
        if (b) b.style.maxHeight = '0';
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

/* ── COUNTER ANIMATION ───────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el      = e.target;
      const target  = parseFloat(el.dataset.count);
      const suffix  = el.dataset.suffix || '';
      const duration = 1600;
      const steps   = 60;
      let current   = 0;

      const inc = target / steps;
      const timer = setInterval(() => {
        current += inc;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
      }, duration / steps);

      obs.unobserve(el);
    });
  }, { threshold:.6 });

  counters.forEach(c => obs.observe(c));
}

/* ── HEADER COMMON MARKUP HELPER ─────────────────────────── */
// This is injected per-page in HTML (no DOM injection to keep pages
// self-contained and work from file:// or any server)
