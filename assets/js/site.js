/* BookSeed Learning & Co : interaction layer */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var header = $('.site-header');
  var progress = $('.progress');
  var wa = $('.wa');
  var footer = $('.site-footer');
  var lastY = 0;

  /* ---------------------------------------------------------
     Scroll lock.
     body{overflow:hidden} does not hold on iOS Safari, so we pin
     the body and restore the exact offset on release.
  --------------------------------------------------------- */
  var lockedAt = 0;
  var lockDepth = 0;

  function lockScroll(on) {
    var de = document.documentElement;
    if (on) {
      if (lockDepth++ > 0) return;
      lockedAt = window.scrollY || window.pageYOffset || 0;
      de.style.setProperty('scroll-behavior', 'auto', 'important');
      document.body.style.position = 'fixed';
      document.body.style.top = (-lockedAt) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      if (--lockDepth > 0) return;
      lockDepth = 0;
      if (document.body.style.position !== 'fixed') return;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedAt);
      de.style.removeProperty('scroll-behavior');
    }
  }

  /* ---------------------------------------------------------
     Focus containment for the drawer and the lightbox
  --------------------------------------------------------- */
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  var trapped = [];
  var trapHandler = null;
  var returnFocusTo = null;

  function trapFocus(container, restoreTo) {
    releaseFocus(true);
    returnFocusTo = restoreTo || document.activeElement;
    $$('body > *').forEach(function (n) {
      if (n === container || n.tagName === 'SCRIPT') return;
      n.setAttribute('aria-hidden', 'true');
      trapped.push(n);
    });
    trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      var f = $$(FOCUSABLE, container).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler);
  }

  function releaseFocus(silent) {
    trapped.forEach(function (n) { n.removeAttribute('aria-hidden'); });
    trapped = [];
    if (trapHandler) document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
    if (!silent && returnFocusTo && returnFocusTo.focus) returnFocusTo.focus();
    returnFocusTo = null;
  }

  /* ---------------------------------------------------------
     Header state, progress bar, floating WhatsApp
  --------------------------------------------------------- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      var hero = $('.hero, .page-hero');
      var threshold = hero ? Math.min(hero.offsetHeight - 90, 420) : 40;
      header.classList.toggle('is-stuck', y > threshold);
      if (hero) header.setAttribute('data-mode', y > threshold ? 'solid' : 'over');
      var drawerOpen = drawer && drawer.classList.contains('is-open');
      header.classList.toggle('is-hidden', y > lastY && y > threshold + 220 && !drawerOpen);
    }

    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }

    /* step aside rather than sit on top of the footer content */
    if (wa) {
      var nearFooter = footer && footer.getBoundingClientRect().top < window.innerHeight - 90;
      wa.classList.toggle('show', y > 500 && !nearFooter);
    }

    lastY = y;
  }

  /* ---------------------------------------------------------
     Parallax.
     Measured against the untransformed container : reading the
     <picture> wrapper fed the element's own output back into the
     next frame's input and made the value oscillate.
  --------------------------------------------------------- */
  var parallaxEls = $$('[data-parallax]');
  var pxTimer = null;

  function onParallax() {
    if (reduce || !parallaxEls.length) return;
    var vh = window.innerHeight;
    var reads = [];

    parallaxEls.forEach(function (el) {
      var host = el.closest('.hero-media, .band-media');
      if (!host) return;
      var r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      reads.push({ el: el, r: r, host: host });
    });

    reads.forEach(function (o) {
      /* 0 as the band enters from the bottom, 1 as it leaves past the top */
      var p = (vh - o.r.top) / (vh + o.r.height);
      p = Math.max(0, Math.min(1, p));
      /* the image is taller than its frame : that surplus is all the travel we have,
         and consuming it top-down keeps the frame covered at every position */
      var headroom = o.el.offsetHeight - o.host.offsetHeight;
      var factor = Math.min(1, (parseFloat(o.el.getAttribute('data-parallax')) || 0.15) * 5);
      o.el.style.transform = 'translate3d(0,' + (-p * headroom * factor).toFixed(2) + 'px,0)';
    });

    document.documentElement.classList.add('js-px');
    clearTimeout(pxTimer);
    pxTimer = setTimeout(function () {
      document.documentElement.classList.remove('js-px');
    }, 260);
  }

  /* ---------------------------------------------------------
     Reveal on scroll.
     A deterministic sweep rather than IntersectionObserver alone :
     an observer can miss elements that cross the viewport between
     two ticks (fast flick, or an anchor jump like #formules that
     skips whole sections) and they would stay hidden for good.
  --------------------------------------------------------- */
  var pending = [];

  function sweepReveals() {
    if (!pending.length) return;
    var trigger = window.innerHeight * 0.92;
    var still = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      if (el.getBoundingClientRect().top < trigger) el.classList.add('in');
      else still.push(el);
    }
    pending = still;
  }

  var ticking = false;
  function raf() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      onParallax();
      sweepReveals();
      ticking = false;
    });
  }
  window.addEventListener('scroll', raf, { passive: true });
  window.addEventListener('resize', raf, { passive: true });

  /* ---------------------------------------------------------
     Mobile drawer
  --------------------------------------------------------- */
  var burger = $('.burger');
  var drawer = $('.drawer');

  function setDrawer(open) {
    if (!drawer || !burger) return;
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    lockScroll(open);
    if (open) {
      if (header) header.classList.remove('is-hidden');
      trapFocus(drawer, burger);
      /* the burger lives in the header, which the trap just hid : keep it reachable */
      if (header) header.removeAttribute('aria-hidden');
    } else {
      releaseFocus();
    }
  }

  if (burger) {
    burger.addEventListener('click', function () {
      setDrawer(burger.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (drawer) {
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lb && lb.classList.contains('is-open')) closeLightbox();
    else if (drawer && drawer.classList.contains('is-open')) setDrawer(false);
  });

  /* ---------------------------------------------------------
     Animated counters
  --------------------------------------------------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    if (isNaN(target)) return;
    if (reduce) { el.textContent = prefix + target + suffix; return; }

    var dur = 1600, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  var counters = $$('[data-count]');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          animateCount(e.target);
          cio.unobserve(e.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------------------------------------------------------
     Accordion.
     A closed panel is only height:0, so its links stayed in the
     tab order inside a zero-height box : inert removes them from
     both focus and the accessibility tree.
  --------------------------------------------------------- */
  $$('.acc-item').forEach(function (item, i) {
    var q = $('.acc-q', item);
    var a = $('.acc-a', item);
    if (!q || !a) return;

    var qid = 'acc-q-' + i, pid = 'acc-panel-' + i;
    q.id = qid;
    a.id = pid;
    a.setAttribute('role', 'region');
    a.setAttribute('aria-labelledby', qid);
    a.setAttribute('inert', '');
    q.setAttribute('aria-controls', pid);
    q.setAttribute('aria-expanded', 'false');

    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      var group = item.closest('.acc');

      if (group) {
        $$('.acc-item.open', group).forEach(function (o) {
          o.classList.remove('open');
          var oa = $('.acc-a', o);
          oa.style.height = '0px';
          oa.setAttribute('inert', '');
          $('.acc-q', o).setAttribute('aria-expanded', 'false');
        });
      }

      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.removeAttribute('inert');
        a.style.height = a.firstElementChild.offsetHeight + 'px';
      }
    });
  });

  window.addEventListener('resize', function () {
    $$('.acc-item.open').forEach(function (o) {
      var a = $('.acc-a', o);
      if (a) a.style.height = a.firstElementChild.offsetHeight + 'px';
    });
  }, { passive: true });

  /* ---------------------------------------------------------
     Lightbox
  --------------------------------------------------------- */
  var lb = $('.lb');
  var lbImg = lb && $('img', lb);
  var lbCap = lb && $('.lb-cap', lb);
  var figures = $$('.gal figure');
  var current = 0;

  function openLightbox(i) {
    if (!lb || !figures.length) return;
    var wasClosed = !lb.classList.contains('is-open');
    current = (i + figures.length) % figures.length;
    var fig = figures[current];
    var img = $('img', fig);
    var cap = $('figcaption', fig);
    if (!img) return;

    lbImg.src = img.getAttribute('data-full') || img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lbCap.textContent = cap ? cap.textContent : '';
    lb.classList.add('is-open');

    if (wasClosed) {
      lockScroll(true);
      trapFocus(lb, fig);
      /* focus only lands once visibility has actually flipped */
      window.requestAnimationFrame(function () {
        var x = $('.lb-x', lb);
        if (x) x.focus();
      });
    }
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    lockScroll(false);
    releaseFocus();
  }

  figures.forEach(function (fig, i) {
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.addEventListener('click', function () { openLightbox(i); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  if (lb) {
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    var xBtn = $('.lb-x', lb), pBtn = $('.lb-prev', lb), nBtn = $('.lb-next', lb);
    if (xBtn) xBtn.addEventListener('click', closeLightbox);
    if (pBtn) pBtn.addEventListener('click', function () { openLightbox(current - 1); });
    if (nBtn) nBtn.addEventListener('click', function () { openLightbox(current + 1); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') openLightbox(current - 1);
      if (e.key === 'ArrowRight') openLightbox(current + 1);
    });
  }

  /* ---------------------------------------------------------
     Magnetic CTAs (fine pointer only)
  --------------------------------------------------------- */
  if (!reduce && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' +
          (e.clientX - r.left - r.width / 2) * 0.16 + 'px,' +
          ((e.clientY - r.top - r.height / 2) * 0.16 - 3) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     Marquee.
     Duplicating the track twice only loops seamlessly when one
     copy is already wider than the viewport. It was not, so a bare
     gold band appeared on every screen from 1024px up.
  --------------------------------------------------------- */
  function buildMarquee(track) {
    if (!track.dataset.unit) {
      track.dataset.html = track.innerHTML;
      track.dataset.unit = String(Math.max(1, Math.round(track.getBoundingClientRect().width)));
    }
    var unit = parseFloat(track.dataset.unit);
    var copies = Math.max(2, Math.ceil(window.innerWidth / unit) + 1);
    track.innerHTML = new Array(copies).fill(track.dataset.html).join('');
    /* shift by exactly one copy, so the seam never shows */
    track.style.setProperty('--marq-shift', (100 / copies).toFixed(4) + '%');
  }

  var marquees = $$('.marquee-track');
  marquees.forEach(buildMarquee);

  var mqTimer;
  window.addEventListener('resize', function () {
    clearTimeout(mqTimer);
    mqTimer = setTimeout(function () { marquees.forEach(buildMarquee); }, 200);
  }, { passive: true });

  /* ---------------------------------------------------------
     Headline word reveal.
     Wrap each word so it can rise out of a mask. Tags are kept
     intact, only text between them is split.
  --------------------------------------------------------- */
  if (!reduce) {
    $$('.hero h1, .page-hero h1, .head h2').forEach(function (h) {
      if (h.querySelector('.wordmask')) return;
      h.innerHTML = h.innerHTML.replace(/(<[^>]+>)|([^\s<]+)/g, function (m, tag, word) {
        return tag ? tag : '<span class="wordmask"><span>' + word + '</span></span>';
      });
      $$('.wordmask > span', h).forEach(function (sp, i) {
        sp.style.transitionDelay = (i * 0.045) + 's';
      });
      h.classList.remove('rv');
      h.classList.add('rv-words');
    });
  }

  /* ---------------------------------------------------------
     Stagger every grid automatically
  --------------------------------------------------------- */
  $$('.grid-4,.grid-3,.grid-2,.stats,.steps,.prices,.gal').forEach(function (g) {
    $$('.rv,.rv-img', g).forEach(function (el, i) {
      if (!el.hasAttribute('data-d')) el.style.setProperty('--d', (i * 0.085) + 's');
    });
  });

  /* ---------------------------------------------------------
     Boot the reveal queue once the DOM has been rewritten above
  --------------------------------------------------------- */
  pending = $$('.rv, .rv-img, .rule, .rv-words');
  if (reduce) {
    pending.forEach(function (el) { el.classList.add('in'); });
    pending = [];
  }
  sweepReveals();
  raf();

  /* ---------------------------------------------------------
     Current year
  --------------------------------------------------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
