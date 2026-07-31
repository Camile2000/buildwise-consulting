/* BookSeed Learning & Co : interaction layer */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     Header : shadow on scroll, hide on scroll-down
  --------------------------------------------------------- */
  var header = $('.site-header');
  var progress = $('.progress');
  var wa = $('.wa');
  var lastY = 0;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      var hero = $('.hero, .page-hero');
      var threshold = hero ? Math.min(hero.offsetHeight - 90, 420) : 40;
      header.classList.toggle('is-stuck', y > threshold);
      if (hero) header.setAttribute('data-mode', y > threshold ? 'solid' : 'over');
      var goingDown = y > lastY && y > threshold + 220;
      header.classList.toggle('is-hidden', goingDown && !$('.drawer.is-open'));
    }

    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }

    if (wa) wa.classList.toggle('show', y > 500);

    lastY = y;
  }

  /* ---------------------------------------------------------
     Parallax : transform-based, smooth on iOS
  --------------------------------------------------------- */
  var parallaxEls = $$('[data-parallax]');

  function onParallax() {
    if (reduce || !parallaxEls.length) return;
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var wrapEl = el.parentElement;
      var r = wrapEl.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      var progressVal = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (progressVal * speed * 100).toFixed(2) + 'px,0)';
    });
  }

  var ticking = false;
  function raf() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      onParallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', raf, { passive: true });
  window.addEventListener('resize', raf, { passive: true });
  raf();

  /* ---------------------------------------------------------
     Mobile drawer
  --------------------------------------------------------- */
  var burger = $('.burger');
  var drawer = $('.drawer');

  function setDrawer(open) {
    if (!drawer || !burger) return;
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) header && header.classList.remove('is-hidden');
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
    if (e.key === 'Escape') { setDrawer(false); closeLightbox(); }
  });

  /* ---------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------- */
  var revealEls = $$('.rv, .rv-img, .rule, .wordmask');

  if (!('IntersectionObserver' in window) || reduce) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

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
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
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
     Accordion
  --------------------------------------------------------- */
  $$('.acc-item').forEach(function (item) {
    var q = $('.acc-q', item);
    var a = $('.acc-a', item);
    if (!q || !a) return;

    q.setAttribute('aria-expanded', 'false');

    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      var group = item.closest('.acc');

      if (group) {
        $$('.acc-item.open', group).forEach(function (o) {
          o.classList.remove('open');
          $('.acc-a', o).style.height = '0px';
          $('.acc-q', o).setAttribute('aria-expanded', 'false');
        });
      }

      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
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
    current = (i + figures.length) % figures.length;
    var fig = figures[current];
    var img = $('img', fig);
    var cap = $('figcaption', fig);
    if (!img) return;
    lbImg.src = img.getAttribute('data-full') || img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lbCap.textContent = cap ? cap.textContent : '';
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var x = $('.lb-x', lb);
    if (x) x.focus();
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
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
    lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLightbox();
    });
    var xBtn = $('.lb-x', lb);
    var pBtn = $('.lb-prev', lb);
    var nBtn = $('.lb-next', lb);
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
     Magnetic CTAs (pointer-fine only)
  --------------------------------------------------------- */
  if (!reduce && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + mx * 0.16 + 'px,' + (my * 0.16 - 3) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     Marquee : duplicate track for a seamless loop
  --------------------------------------------------------- */
  $$('.marquee-track').forEach(function (track) {
    track.innerHTML = track.innerHTML + track.innerHTML;
  });

  /* ---------------------------------------------------------
     Current year
  --------------------------------------------------------- */
  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
