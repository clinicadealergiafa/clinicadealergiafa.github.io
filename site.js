/* ============================================================================
   Clínica de Alergia Fabrício Afonso · page behaviour
   ----------------------------------------------------------------------------
   The engine (scrollcraft.js) owns acts, cues, reveals and counters. This file
   reads act progress from it and paints what belongs to this page alone:

     chrome   the consultation record (stage rail) and the ground under the bar
     hero     planes at different rates + dust in the sunbeam that flees the hand
     zoom     nested photographs, one level per power of ten, down to the mite
     test     the signature move: scroll is the 15-minute prick-test clock
     dx       exclusive index whose open item shows in the right column
     md       the doctor in front of his own name: planes at different rates
     stamp    the doctor's stamp lands once
     book     the booking dialog with the clinic's online agenda
     map      the address as a live 3D map, loaded only near the end
   ========================================================================== */
(function () {
  'use strict';

  // The close pins only where it fits: on phones, and on desktop windows too
  // short for the copy plus the map card, it flows instead (the clean room
  // keeps its own screen and the card follows), so nothing is ever cut off at
  // the end. Decided before mount, because the engine mounts once.
  var closeAct = document.getElementById('agendar');
  function closeShouldFlow() {
    if (matchMedia('(max-width: 860px)').matches) return true;
    var inner = closeAct.querySelector('.close__inner');
    if (!inner || !inner.firstElementChild) return false;
    // the copy's own height (not its box, which is a full screen when flowing),
    // plus the gap and the map card at its smallest, against the room between
    // the bar and the footer
    var copy = inner.lastElementChild.getBoundingClientRect().bottom - inner.firstElementChild.getBoundingClientRect().top;
    return copy + 24 + 332 > innerHeight - 76 - 56;
  }
  var closeFlows = !!closeAct && closeShouldFlow();
  if (closeFlows) {
    closeAct.setAttribute('data-sc-act', 'flow');
    // flowing, the closing line is page copy, not a cue: it fades itself as it
    // slides under the bar (closeFade, below) instead of crossing the logo
    var closeCopy = closeAct.querySelector('.close__inner');
    if (closeCopy) closeCopy.removeAttribute('data-sc-cue');
  }
  var SC = ScrollCraft.mount(document.body);

  // A window resized across that line reloads at its new size, back on the
  // same act, rather than keeping a layout that no longer fits.
  (function () {
    var KEY = 'fa-resume';
    function store(v) { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) {} }
    var saved = null;
    try { saved = sessionStorage.getItem(KEY); } catch (e) {}
    if (saved) {
      store(null);
      try {
        var at = JSON.parse(saved), el = document.getElementById(at.id);
        if (el) requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          scrollTo(0, Math.max(0, r.top + scrollY + r.height * at.f - innerHeight / 2));
        });
      } catch (e) {}
    }
    if (!closeAct) return;
    var t = 0;
    addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (closeShouldFlow() === closeFlows) return;
        var mid = innerHeight / 2, at = null;
        SC.acts.forEach(function (a) {
          var r = a.el.getBoundingClientRect();
          if (!at && r.top <= mid && r.bottom > mid) at = { id: a.el.id, f: (mid - r.top) / Math.max(r.height, 1) };
        });
        if (at && at.id) store(JSON.stringify(at));
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        location.reload();
      }, 450);
    }, { passive: true });
  })();
  var REDUCE = ScrollCraft.reduce;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)');
  var SMALL = matchMedia('(max-width: 860px)');
  var docEl = document.documentElement;

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var clamp01 = function (x) { return clamp(x, 0, 1); };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var inOut = function (x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var dprOf = function () { return Math.min(devicePixelRatio || 1, 2); };
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function actOf(id) {
    for (var i = 0; i < SC.acts.length; i++) if (SC.acts[i].el.id === id) return SC.acts[i];
    return null;
  }
  function loadImage(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).then(function () { res(im); }, function () { res(im); }); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function setVerify(el, v) { if (el && el.__v !== v) { el.__v = v; el.setAttribute('data-sc-verify-state', v); } }

  // ---- pointer, shared by the hero and the test --------------------------
  var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0, on: false };
  function onPtr(x, y) {
    var now = performance.now();
    if (ptr.on) {
      var dt = Math.max(now - ptr.t, 8) / 1000;
      ptr.vx = lerp(ptr.vx, (x - ptr.x) / dt, 0.5);
      ptr.vy = lerp(ptr.vy, (y - ptr.y) / dt, 0.5);
    }
    ptr.x = x; ptr.y = y; ptr.t = now; ptr.on = true;
  }
  addEventListener('pointermove', function (e) { onPtr(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) onPtr(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', function () { ptr.on = false; }, { passive: true });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) ptr.on = false; });

  // =========================================================== CHROME ====
  var chrome = (function () {
    var grounds = [].slice.call(document.querySelectorAll('[data-ground]'));
    var links = [].slice.call(document.querySelectorAll('.chart a'));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var bar = '', rail = '', stage = -1;
    function groundAt(yv) {
      for (var i = 0; i < grounds.length; i++) {
        var r = grounds[i].getBoundingClientRect();
        if (r.top <= yv && r.bottom > yv) return grounds[i].getAttribute('data-ground');
      }
      return 'light';
    }
    function update() {
      var vh = innerHeight;
      var b = groundAt(34), r = groundAt(vh * 0.5);
      var cur = 0;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= vh * 0.45) cur = i;
      }
      if (b !== bar) { bar = b; docEl.setAttribute('data-bar', b); }
      if (r !== rail) { rail = r; docEl.setAttribute('data-rail', r); }
      if (cur !== stage) {
        stage = cur;
        links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
        docEl.setAttribute('data-stage', targets[cur] ? targets[cur].id : '');
      }
    }
    return { update: update };
  })();

  // ============================================================= HERO ====
  var hero = (function () {
    var a = actOf('queixa');
    if (!a) return null;
    var st = a.el.querySelector('.hero');
    var room = st.querySelector('.hero__room');
    var subject = st.querySelector('.hero__subject');
    var curtain = st.querySelector('.hero__curtain');
    var beam = st.querySelector('.hero__beam');
    var cv = st.querySelector('.hero__dust');
    var ctx = cv.getContext('2d');

    // Composition of the photographs, in stage-normalised coordinates. The beam
    // runs from the window toward the bed; the focus is the bear on the pillow.
    var LAYOUT = {
      d: { beam: [0.03, 0.06, 0.66, 0.52], width: 0.15, focus: [0.84, 0.57], n: 300 },
      m: { beam: [0.02, 0.08, 0.7, 0.5], width: 0.2, focus: [0.62, 0.7], n: 160 }
    };
    var L = LAYOUT.d;
    var W = 0, H = 0, dpr = 1, parts = [], rect = null;
    var px = 0, py = 0, lastP = -1, lastFrame = 0, staticDrawn = false;

    function sprite(size, soft) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      if (soft) {
        grd.addColorStop(0, 'rgba(255,246,228,0.55)');
        grd.addColorStop(0.55, 'rgba(255,244,224,0.32)');
        grd.addColorStop(0.8, 'rgba(255,242,220,0.12)');
        grd.addColorStop(1, 'rgba(255,240,218,0)');
      } else {
        // a sunlit speck: an opaque warm core, then a short glow. Drawn with
        // source-over, because additive light vanishes against a pale wall
        grd.addColorStop(0, 'rgba(255,252,240,1)');
        grd.addColorStop(0.22, 'rgba(255,244,214,0.95)');
        grd.addColorStop(0.42, 'rgba(255,232,186,0.38)');
        grd.addColorStop(1, 'rgba(255,228,180,0)');
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return c;
    }
    var SHARP = sprite(64, false), BOKEH = sprite(128, true);

    function gauss(rnd) { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    function seed() {
      L = SMALL.matches ? LAYOUT.m : LAYOUT.d;
      docEl.style.setProperty('--focus-x', (L.focus[0] * 100).toFixed(1) + '%');
      docEl.style.setProperty('--focus-y', (L.focus[1] * 100).toFixed(1) + '%');
      var rnd = mulberry32(20261012);
      var b = L.beam, ax = b[2] - b[0], ay = b[3] - b[1], len = Math.hypot(ax, ay);
      var nx = -ay / len, ny = ax / len;
      parts = [];
      for (var i = 0; i < L.n; i++) {
        var x, y;
        if (rnd() < 0.78) {
          var t = rnd(), off = gauss(rnd) * L.width * 0.55;
          x = b[0] + ax * t + nx * off;
          y = b[1] + ay * t + ny * off;
        } else { x = rnd(); y = rnd(); }
        var z = Math.pow(rnd(), 1.7);
        parts.push({ x: x, y: y, z: z, ph: rnd() * 6.283, sp: 0.35 + rnd() * 0.9, vx: 0, vy: 0, bokeh: z > 0.86 && rnd() < 0.55 });
      }
    }

    function beamI(x, y) {
      var b = L.beam, ax = b[2] - b[0], ay = b[3] - b[1], len = Math.hypot(ax, ay);
      var d = Math.abs((x - b[0]) * ay - (y - b[1]) * ax) / len;
      var k = d / L.width;
      return 0.07 + 0.93 * Math.exp(-k * k * 1.6);
    }

    function resize() {
      rect = st.getBoundingClientRect();
      dpr = dprOf();
      W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      seed();
      staticDrawn = false;
      lastP = -1;
    }

    function step(dt, now) {
      var t = now / 1000;
      rect = st.getBoundingClientRect();
      var mx = ptr.x - rect.left, my = ptr.y - rect.top;
      var R = SMALL.matches ? 120 : 160, R2 = R * R;
      var near = ptr.on && mx > -R && my > -R && mx < W + R && my < H + R;
      var p = a.p, f = L.focus;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        // ambient drift: a slow wander, mostly sideways, a little rising
        var ambX = Math.sin(t * 0.13 * q.sp + q.ph) * 0.0045 + Math.sin(t * 0.041 + q.ph * 2.1) * 0.0025;
        var ambY = Math.cos(t * 0.11 * q.sp + q.ph * 1.7) * 0.003 - 0.0018 * q.sp;
        if (near) {
          var sx = q.x * W, sy = q.y * H;
          var dx = sx - mx, dy = sy - my, d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1) {
            var d = Math.sqrt(d2), s = 1 - d / R; s *= s;
            var depth = 0.45 + 0.55 * q.z;
            q.vx += ((dx / d) * 240 * s + ptr.vx * 0.42 * s) * depth * dt / W;
            q.vy += ((dy / d) * 240 * s + ptr.vy * 0.42 * s) * depth * dt / H;
          }
        }
        var damp = Math.exp(-dt * 1.4);
        q.vx *= damp; q.vy *= damp;
        q.x += (ambX * dt) + q.vx * dt * 60 * 0.016;
        q.y += (ambY * dt) + q.vy * dt * 60 * 0.016;
        if (q.x < -0.08) q.x += 1.16; else if (q.x > 1.08) q.x -= 1.16;
        if (q.y < -0.08) q.y += 1.16; else if (q.y > 1.08) q.y -= 1.16;
      }
    }

    function draw(now) {
      var t = now / 1000, p = a.p, f = L.focus;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var unit = Math.min(W, H) / 900 * dpr;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        // the camera leans toward the bear: near particles open out faster
        var k = 1 + p * (0.12 + 0.95 * q.z);
        var x = f[0] + (q.x - f[0]) * k, y = f[1] + (q.y - f[1]) * k - p * 0.05 * q.z;
        if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) continue;
        var tw = 0.72 + 0.28 * Math.sin(t * (1.1 + q.sp) + q.ph);
        var I = beamI(x, y);
        var size, alpha, img;
        if (q.bokeh) {
          size = (26 + 40 * q.z) * unit * (1 + p * 0.9);
          alpha = I * 0.2 * tw;
          img = BOKEH;
          ctx.globalCompositeOperation = 'screen';
        } else {
          size = (6 + 13 * q.z * q.z) * unit * (1 + p * 0.6 * q.z);
          alpha = I * (0.35 + 0.65 * q.z) * tw;
          img = SHARP;
          ctx.globalCompositeOperation = 'source-over';
        }
        if (alpha < 0.012) continue;
        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.drawImage(img, x * cv.width - size / 2, y * cv.height - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function update(dt, now) {
      if (!a.live || document.hidden) return;
      var p = a.p;
      // pointer offset for the planes, fine pointers only
      var tx = 0, ty = 0;
      if (FINE.matches && ptr.on && !REDUCE) { tx = (ptr.x / innerWidth - 0.5) * 2; ty = (ptr.y / innerHeight - 0.5) * 2; }
      px = lerp(px, tx, 0.06); py = lerp(py, ty, 0.06);
      if (!REDUCE) {
        room.style.transform = 'translate3d(' + (-px * 10).toFixed(2) + 'px,' + (-py * 6 - p * H * 0.025).toFixed(2) + 'px,0) scale(' + (1 + p * 0.075).toFixed(4) + ')';
        // the bed is nearer than the wall: it travels a little more and grows
        // from where it stands on the floor, so it never lifts off its contact
        subject.style.transform = 'translate3d(' + (-px * 17).toFixed(2) + 'px,' + (-py * 9 - p * H * 0.02).toFixed(2) + 'px,0) scale(' + (1 + p * 0.095).toFixed(4) + ')';
        curtain.style.transform = 'translate3d(' + (px * 28 - p * W * 0.2).toFixed(2) + 'px,' + (py * 10).toFixed(2) + 'px,0) scale(' + (1.02 + p * 0.12).toFixed(4) + ')';
        beam.style.opacity = (0.55 + p * 0.45).toFixed(3);
        step(dt, now);
        draw(now);
      } else if (!staticDrawn) {
        draw(0);
        staticDrawn = true;
      }
      if (Math.abs(p - lastP) > 0.004) { lastP = p; setVerify(st, p.toFixed(2)); }
    }

    resize();
    addEventListener('resize', resize, { passive: true });
    SMALL.addEventListener && SMALL.addEventListener('change', resize);
    return { update: update };
  })();

  // ============================================================= ZOOM ====
  var zoom = (function () {
    var a = actOf('invisivel');
    if (!a) return null;
    var st = a.el.querySelector('.zoom');
    var cv = st.querySelector('.zoom__canvas');
    var ctx = cv.getContext('2d', { alpha: false });
    var magEl = st.querySelector('.zoom__mag');
    var off = document.createElement('canvas');
    var octx = off.getContext('2d');
    var imgs = [], N = 0, F = 1, lastS = -1, lastMag = '', loading = false, wantSmall = null;
    // Level 0 is the bear; the dive goes into its belly, not the frame centre.
    // Every deeper level is centred on that same screen point.
    var focus0 = (cv.getAttribute('data-focus') || '0.5,0.5').split(',').map(parseFloat);
    // Each level is a crop of the one before it, enlarged by its own factor, and
    // the readout starts from level 0's own magnification relative to the room.
    var factors = [];
    var mag0 = parseFloat(cv.getAttribute('data-mag0')) || 1;
    function factorAt(i) { return factors[Math.min(i, factors.length - 1)] || F; }

    function list(small) {
      var s = small && cv.getAttribute('data-levels-m');
      return (s || cv.getAttribute('data-levels')).split(',');
    }
    function load() {
      var small = SMALL.matches;
      if (loading || wantSmall === small) return;
      loading = true; wantSmall = small;
      Promise.all(list(small).map(loadImage)).then(function (r) {
        if (small && r.some(function (x) { return !x; })) return Promise.all(list(false).map(loadImage));
        return r;
      }).then(function (r) {
        imgs = r; N = r.length; F = Math.pow(10, 3 / Math.max(N - 1, 1));
        var fs = (cv.getAttribute('data-factors') || '').split(',').map(parseFloat).filter(function (x) { return x > 1; });
        factors = [];
        for (var i = 0; i < N - 1; i++) factors.push(fs[i] || F);
        loading = false; lastS = -1;
      });
    }
    function resize() {
      var r = st.getBoundingClientRect(), dpr = dprOf();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      lastS = -1;
      wantSmall = null; load();
    }

    // Scroll to zoom exponent. The zoom runs across the stage's whole visible
    // life (vp), so the frame is never a still photograph sliding past: it is
    // already travelling while the stage slides in, reaches the mite inside the
    // pin, and keeps creeping through the exit.
    // The dive rests three quarters of the way into the last step: the mite is
    // whole inside the final circle, with its own fibres still around it.
    // Zoom is logarithmic, so equal scroll per power of ten reads as an even
    // dive. Only the ends are softened (sine, peak 1.57x the mean); a cubic here
    // stacked on the visitor's own scroll easing crammed the whole dive into one
    // second of the middle.
    function sAt(vp) {
      var rest = N - 1 - 0.5, start = 0.08, reach = 0.6;
      if (vp <= start) return 0;
      if (vp <= reach) { var u = (vp - start) / (reach - start); return rest * (0.5 - 0.5 * Math.cos(Math.PI * u)); }
      return rest + 0.1 * ((vp - reach) / (1 - reach));
    }

    // the screen point where level 0's focus sits at z = 1, and how much the
    // deeper levels must grow so that, centred there, they still cover the frame
    // The deeper levels are drawn big enough that, at the handoff, the circle
    // inscribed in them already reaches the farthest screen corner. The fade
    // mask can then always end inside the image, so no square edge is ever on
    // screen, and the frame after the handoff is the frame before it.
    function anchor() {
      var cw = cv.width, ch = cv.height, im = imgs[0];
      if (!im) return { x: cw / 2, y: ch / 2, k: 1 };
      var base = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var ax = cw / 2 + (focus0[0] - 0.5) * im.naturalWidth * base;
      var ay = ch / 2 + (focus0[1] - 0.5) * im.naturalHeight * base;
      var D = Math.max(Math.hypot(ax, ay), Math.hypot(cw - ax, ay), Math.hypot(ax, ch - ay), Math.hypot(cw - ax, ch - ay));
      var cover = Math.min(im.naturalWidth, im.naturalHeight) * base;
      return { x: ax, y: ay, k: Math.max(1, (2 * D) / cover) * 1.01 };
    }

    function drawLevel(k, z, alpha, feather, f) {
      var im = imgs[k];
      if (!im) return;
      var cw = cv.width, ch = cv.height, A = anchor();
      var base = Math.max(cw / im.naturalWidth, ch / im.naturalHeight) * (k ? A.k : 1);
      var w = im.naturalWidth * base * z, h = im.naturalHeight * base * z;
      var fx = k ? 0.5 : focus0[0], fy = k ? 0.5 : focus0[1];
      var x = A.x - fx * w, y = A.y - fy * h;
      if (!feather) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(im, x, y, w, h);
        ctx.globalAlpha = 1;
        return;
      }
      if (off.width !== cw || off.height !== ch) { off.width = cw; off.height = ch; }
      octx.globalCompositeOperation = 'source-over';
      octx.clearRect(0, 0, cw, ch);
      octx.drawImage(im, x, y, w, h);
      // the mask opens as the level grows, so by the handoff it covers the
      // whole screen and the next frame (drawn unmasked) is identical
      var r = Math.min(w, h) / 2;
      var r1 = r * 0.995, r0 = r * (0.5 + 0.46 * smooth(f));
      var g = octx.createRadialGradient(A.x, A.y, r0, A.x, A.y, r1);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.globalCompositeOperation = 'destination-in';
      octx.fillStyle = g;
      octx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = alpha;
      ctx.drawImage(off, 0, 0);
      ctx.globalAlpha = 1;
    }

    function draw(s) {
      ctx.fillStyle = '#0A1116';
      ctx.fillRect(0, 0, cv.width, cv.height);
      if (!N) return;
      var i = Math.min(Math.floor(s), N - 1), f = s - i;
      if (REDUCE) {
        // no travel: the levels dissolve into each other in place
        drawLevel(i, 1, 1, false, 0);
        if (i + 1 < N) { var ar = smooth((f - 0.3) / 0.4); if (ar > 0.001) drawLevel(i + 1, 1, ar, false, 0); }
        return;
      }
      var Fi = factorAt(i);
      var z = Math.pow(Fi, f);
      drawLevel(i, z, 1, false, 0);
      if (i + 1 < N) {
        var al = smooth((f - 0.2) / 0.38);
        if (al > 0.001) drawLevel(i + 1, z / Fi, al, true, f);
      }
    }
    function magAt(s) {
      var i = Math.min(Math.floor(s), N - 1), m = mag0;
      for (var k = 0; k < i; k++) m *= factorAt(k);
      return m * Math.pow(factorAt(i), s - i);
    }

    function update() {
      if (!a.live) return;
      load();
      var s = N ? clamp(sAt(a.vp), 0, N - 1 + 0.2) : 0;
      if (Math.abs(s - lastS) > 0.0004) {
        lastS = s;
        draw(s);
        var mag = N ? magAt(s) : 1;
        // round like an instrument would: whole numbers, then tens, then hundreds
        var r = mag < 20 ? Math.round(mag) : mag < 200 ? Math.round(mag / 5) * 5 : Math.round(mag / 10) * 10;
        var txt = r.toLocaleString('pt-BR') + '×';
        if (txt !== lastMag) { lastMag = txt; magEl.textContent = txt; }
        setVerify(st, s.toFixed(3));
      }
    }

    resize();
    addEventListener('resize', resize, { passive: true });
    return { update: update };
  })();

  // ============================================================= TEST ====
  // The signature move. Scroll is the clock. Drops land, the lancet marks each
  // one, the drops are blotted, and the skin answers on the reactive points.
  var test = (function () {
    var a = actOf('exame');
    if (!a) return null;
    var st = a.el.querySelector('.test');
    var media = st.querySelector('.test__media');
    var img = st.querySelector('.test__arm');
    var cv = st.querySelector('.test__canvas');
    var ctx = cv.getContext('2d');
    var pensBox = st.querySelector('.test__pens');
    var tip = st.querySelector('.test__tip');
    var timeEl = st.querySelector('.test__time');
    var phaseEl = st.querySelector('.test__phase');
    var rows = [].slice.call(st.querySelectorAll('.legend__row'));
    var resultMain = st.querySelector('.test__result-main');
    var segs = [].slice.call(st.querySelectorAll('.seg__btn'));

    var PANELS = {
      inalantes: {
        names: ['Controle negativo', 'Histamina', 'Ácaro <i>D. pteronyssinus</i>', 'Ácaro <i>B. tropicalis</i>', 'Barata', 'Fungos do ar', 'Epitélio de cão', 'Epitélio de gato'],
        plain: ['Controle negativo', 'Histamina', 'Ácaro D. pteronyssinus', 'Ácaro B. tropicalis', 'Barata', 'Fungos do ar', 'Epitélio de cão', 'Epitélio de gato'],
        mm: [0, 6, 8, 5, 0, 0, 0, 0],
        result: 'Leitura (simulação): reação a ácaros da poeira.'
      },
      alimentos: {
        names: ['Controle negativo', 'Histamina', 'Leite de vaca', 'Ovo', 'Amendoim', 'Trigo', 'Camarão', 'Peixe'],
        plain: ['Controle negativo', 'Histamina', 'Leite de vaca', 'Ovo', 'Amendoim', 'Trigo', 'Camarão', 'Peixe'],
        mm: [0, 6, 0, 0, 0, 0, 7, 0],
        result: 'Leitura (simulação): reação a camarão.'
      }
    };

    // Where the eight points sit on each photograph, in image-normalised
    // coordinates, and how many image widths make one millimetre of skin.
    var GEO = {
      // arm.webp: volar forearm from the elbow crease (x 0.17) to the wrist
      // (x 0.64); skin between y 0.38 and 0.64 at mid-forearm; ~6.4 px per mm
      d: { pos: [0.5, 0.5], mmU: 0.00232, spots: [[0.27, 0.44], [0.345, 0.44], [0.42, 0.44], [0.495, 0.44], [0.27, 0.565], [0.345, 0.565], [0.42, 0.565], [0.495, 0.565]] },
      // arm-m.webp: forearm vertical, wrist at y 0.56. Skin measured on the
      // pixels, shaded side included: x 0.377..0.591 at y 0.335 narrowing to
      // 0.403..0.578 at y 0.515 (centre 0.484 to 0.491), about 3.4 px per mm.
      // Each row is centred on the arm and spaced to its width, so the two
      // columns (and the mirrored pen marks) sit in the middle of the forearm.
      m: { pos: [0.5, 0.5], mmU: 0.0026, spots: [[0.453, 0.335], [0.462, 0.395], [0.4635, 0.455], [0.465, 0.515], [0.515, 0.335], [0.518, 0.395], [0.5165, 0.455], [0.517, 0.515]] }
    };
    var geo = GEO.d, panel = 'inalantes', hot = -1, lastKey = '', dpr = 1, box = null, M = null;
    var pens = [];
    var SEEDS = [11, 23, 37, 41, 53, 67, 71, 89];

    function minutesAt(p) {
      if (p < 0.06) return 0;
      if (p < 0.12) return (p - 0.06) / 0.06;
      if (p < 0.16) return 1 + (p - 0.12) / 0.04;
      if (p < 0.86) return 2 + 13 * (p - 0.16) / 0.7;
      return 15;
    }
    function phaseAt(p) {
      return p < 0.06 ? 'Aplicação dos extratos' : p < 0.12 ? 'Puntura com lanceta' : p < 0.16 ? 'Secagem das gotas' : p < 0.86 ? 'Aguardando a reação' : 'Leitura';
    }
    function fmt(min) {
      var m = Math.floor(min + 1e-6), s = Math.floor((min - m) * 60 + 1e-6);
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    function whealMm(i, min) {
      var target = PANELS[panel].mm[i];
      if (!target) return 0;
      var t0 = i === 1 ? 2.2 : 3 + i * 0.12, t1 = i === 1 ? 9.5 : 13.5;
      return target * smooth((min - t0) / (t1 - t0));
    }

    function measure() {
      geo = SMALL.matches ? GEO.m : GEO.d;
      img.style.setProperty('--arm-pos', (geo.pos[0] * 100) + '% ' + (geo.pos[1] * 100) + '%');
      box = media.getBoundingClientRect();
      dpr = dprOf();
      cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
      var iw = img.naturalWidth || 2752, ih = img.naturalHeight || 1536;
      var s = Math.max(box.width / iw, box.height / ih);
      M = {
        s: s, iw: iw, ih: ih,
        ox: (box.width - iw * s) * geo.pos[0],
        oy: (box.height - ih * s) * geo.pos[1],
        mm: geo.mmU * iw * s
      };
      if (!pens.length) {
        for (var i = 0; i < 8; i++) {
          var el = document.createElement('span');
          el.className = 'test__pen';
          el.textContent = String(i + 1);
          pensBox.appendChild(el);
          pens.push(el);
        }
      }
      var fs = clamp(M.mm * 4.6, 15, 26);
      // on phones the pairs sit closer to the middle of the forearm
      var off = SMALL.matches ? Math.max(M.mm * 4, 12.5) : Math.max(M.mm * 5, 16);
      pens.forEach(function (el, i) {
        var c = spotXY(i);
        // phone: the arm is upright with two columns of points, so the pen
        // writes 1-4 to the left of theirs and 5-8 to the right, mirrored, and
        // the marks sit centred on the forearm like the points do
        var mirror = SMALL.matches && i >= 4;
        el.style.left = (mirror ? c[0] + off : c[0] - off).toFixed(1) + 'px';   // the mark is centred on this point (translate -50%)
        el.style.top = (c[1] - Math.max(M.mm * 5.2, 17)).toFixed(1) + 'px';
        el.style.fontSize = fs.toFixed(1) + 'px';
      });
      lastKey = '';
    }
    function spotXY(i) {
      var sp = geo.spots[i];
      return [M.ox + sp[0] * M.iw * M.s, M.oy + sp[1] * M.ih * M.s];
    }

    function blob(x, y, r, seed, wob) {
      var rnd = mulberry32(seed), n = 28, ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, a1 = 0.5 + rnd(), a2 = 0.5 + rnd();
      ctx.beginPath();
      for (var k = 0; k <= n; k++) {
        var th = (k / n) * Math.PI * 2;
        var rr = r * (1 + wob * (Math.sin(th * 3 + ph1) * 0.6 * a1 + Math.sin(th * 5 + ph2) * 0.4 * a2));
        var px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr * 0.92;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    function drawDrop(x, y, r, al) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = al * 0.55;
      var sh = ctx.createRadialGradient(x + r * 0.25, y + r * 0.35, r * 0.4, x + r * 0.25, y + r * 0.35, r * 1.25);
      sh.addColorStop(0, 'rgba(120,96,86,0.0)'); sh.addColorStop(0.7, 'rgba(120,96,86,0.28)'); sh.addColorStop(1, 'rgba(120,96,86,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.35, r * 1.25, 0, 6.283); ctx.fill();
      ctx.globalAlpha = al;
      var rim = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
      rim.addColorStop(0, 'rgba(140,120,110,0)'); rim.addColorStop(0.85, 'rgba(120,100,92,0.28)'); rim.addColorStop(1, 'rgba(110,90,84,0.0)');
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      var body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
      body.addColorStop(0, 'rgba(255,255,255,0.5)'); body.addColorStop(0.6, 'rgba(255,255,255,0.08)'); body.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * al) + ')';
      ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.42, r * 0.2, r * 0.13, -0.6, 0, 6.283); ctx.fill();
      ctx.restore();
    }

    function drawWheal(i, x, y, mmNow, min) {
      var target = PANELS[panel].mm[i];
      var u = M.mm, seed = SEEDS[i] + (panel === 'alimentos' ? 100 : 0);
      var grow = target ? mmNow / target : 0;
      // flare (erythema): a little ahead of the wheal and wider
      var fl = target ? smooth((min - (i === 1 ? 1.8 : 2.6)) / 5) : smooth((min - 2.5) / 4) * 0.25;
      if (fl > 0.005) {
        var rf = (target ? (mmNow * 1.35 + 4.5 * fl) : 1.4) * u;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        var g = ctx.createRadialGradient(x, y, rf * 0.12, x, y, rf);
        var A = target ? 0.85 * fl : 0.3 * fl;
        g.addColorStop(0, 'rgba(206,72,66,' + A + ')');
        g.addColorStop(0.45, 'rgba(214,96,88,' + (A * 0.72) + ')');
        g.addColorStop(0.78, 'rgba(226,132,122,' + (A * 0.3) + ')');
        g.addColorStop(1, 'rgba(232,150,140,0)');
        ctx.fillStyle = g;
        blob(x, y, rf, seed, 0.14);
        ctx.fill();
        ctx.restore();
      }
      if (target && mmNow > 0.2) {
        var rw = mmNow * 0.5 * u;
        ctx.save();
        // blanched raised centre
        ctx.globalCompositeOperation = 'screen';
        var g2 = ctx.createRadialGradient(x - rw * 0.2, y - rw * 0.25, rw * 0.05, x, y, rw * 1.05);
        g2.addColorStop(0, 'rgba(255,238,228,' + (0.75 * grow) + ')');
        g2.addColorStop(0.7, 'rgba(250,220,206,' + (0.48 * grow) + ')');
        g2.addColorStop(1, 'rgba(250,214,200,0)');
        ctx.fillStyle = g2;
        blob(x, y, rw * 1.05, seed + 7, i === 1 ? 0.08 : 0.16);
        ctx.fill();
        // the wheal's rim: a thin, slightly darker edge reads as raised skin
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineWidth = Math.max(rw * 0.12, 1);
        ctx.strokeStyle = 'rgba(176,96,86,' + (0.32 * grow) + ')';
        blob(x, y, rw * 1.0, seed + 7, i === 1 ? 0.08 : 0.16);
        ctx.stroke();
        // relief: shade on the lower right, light on the upper left
        ctx.globalCompositeOperation = 'multiply';
        var g3 = ctx.createRadialGradient(x - rw * 0.4, y - rw * 0.45, rw * 0.7, x - rw * 0.1, y - rw * 0.1, rw * 1.25);
        g3.addColorStop(0, 'rgba(160,96,88,0)');
        g3.addColorStop(0.75, 'rgba(160,96,88,' + (0.3 * grow) + ')');
        g3.addColorStop(1, 'rgba(160,96,88,0)');
        ctx.fillStyle = g3;
        blob(x, y, rw * 1.25, seed + 7, i === 1 ? 0.08 : 0.16);
        ctx.fill();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255,255,255,' + (0.22 * grow) + ')';
        ctx.beginPath();
        ctx.ellipse(x - rw * 0.32, y - rw * 0.38, rw * 0.38, rw * 0.22, -0.5, 0, 6.283);
        ctx.fill();
        ctx.restore();
      }
    }

    function render(p) {
      var min = minutesAt(p);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      var u = M.mm;
      for (var i = 0; i < 8; i++) {
        var c = spotXY(i), x = c[0], y = c[1];
        var mmNow = whealMm(i, min);
        drawWheal(i, x, y, mmNow, min);
        // prick mark
        var pk = smooth((p - (0.062 + i * 0.006)) / 0.006);
        if (pk > 0) {
          ctx.fillStyle = 'rgba(120,40,40,' + (0.55 * pk) + ')';
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.22 * u, 0.9), 0, 6.283); ctx.fill();
        }
        // drop: lands, then is blotted
        var dIn = smooth((p - (0.004 + i * 0.0065)) / 0.008), dOut = 1 - smooth((p - 0.122) / 0.03);
        var dal = dIn * dOut;
        if (dal > 0.01) drawDrop(x, y, 1.45 * u * (0.82 + 0.18 * dIn), dal);
        if (i === hot) {
          ctx.save();
          ctx.strokeStyle = '#1F4FE0';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(x, y, Math.max(6.5 * u, 16), 0, 6.283); ctx.stroke();
          ctx.restore();
        }
      }
      // legend + clock
      timeEl.textContent = fmt(min);
      phaseEl.textContent = phaseAt(p);
      var read = p >= 0.86;
      for (var j = 0; j < rows.length; j++) {
        var mm = whealMm(j, min), tgt = PANELS[panel].mm[j];
        var txt = (min < 2 ? 0 : Math.round(mm)) + ' mm';
        var mmEl = rows[j].__mm || (rows[j].__mm = rows[j].querySelector('.legend__mm'));
        if (mmEl.textContent !== txt) mmEl.textContent = txt;
        rows[j].classList.toggle('is-pos', tgt >= 3 && mm >= 3 && j !== 0);
        rows[j].classList.toggle('is-read', read && j !== 1);
      }
      if (hot > -1) showTip(hot, min);
      setVerify(st, min.toFixed(2) + '|' + panel);
    }

    function showTip(i, min) {
      var c = spotXY(i), mm = Math.round(whealMm(i, min == null ? minutesAt(a.p) : min));
      tip.innerHTML = PANELS[panel].names[i] + ' · <b>' + mm + ' mm</b>';
      tip.style.left = c[0].toFixed(1) + 'px';
      tip.style.top = (c[1] - M.mm * 5).toFixed(1) + 'px';
      tip.hidden = false;
    }
    function setHot(i) {
      if (i === hot) return;
      hot = i;
      rows.forEach(function (r, j) { r.classList.toggle('is-hot', j === i); });
      if (i < 0) tip.hidden = true;
      lastKey = '';
    }
    function pick(clientX, clientY) {
      if (!M) return -1;
      var r = media.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top, best = -1, bd = Infinity;
      for (var i = 0; i < 8; i++) {
        var c = spotXY(i), d = Math.hypot(c[0] - x, c[1] - y);
        if (d < bd) { bd = d; best = i; }
      }
      return bd < Math.max(M.mm * 7, 22) ? best : -1;
    }
    cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') setHot(pick(e.clientX, e.clientY)); });
    cv.addEventListener('pointerleave', function () { setHot(-1); });
    cv.addEventListener('pointerdown', function (e) { setHot(pick(e.clientX, e.clientY)); });
    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { setHot(i); });
      r.addEventListener('mouseleave', function () { setHot(-1); });
      r.addEventListener('focus', function () { setHot(i); });
      r.addEventListener('blur', function () { setHot(-1); });
      r.addEventListener('click', function () { setHot(i); });
    });

    function setPanel(name) {
      if (!PANELS[name] || name === panel) return;
      panel = name;
      segs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-panel') === name)); });
      rows.forEach(function (r, i) {
        var n = r.querySelector('.legend__name');
        n.innerHTML = PANELS[name].names[i];
        r.setAttribute('aria-label', (i + 1) + ', ' + PANELS[name].plain[i]);
      });
      resultMain.textContent = PANELS[name].result;
      lastKey = '';
    }
    segs.forEach(function (b) { b.addEventListener('click', function () { setPanel(b.getAttribute('data-panel')); }); });

    // A keyboard visitor tabbing into the test lands on the panel buttons; park
    // the act where its content is lit, rather than at the edge where the pin
    // is still sliding in.
    st.addEventListener('focusin', function () {
      if (a.p > 0.02 && a.p < 0.98) return;
      var travel = a.height - innerHeight;
      scrollTo({ top: a.top + travel * 0.3, behavior: 'instant' });
    });

    function update() {
      if (!a.live || !M) return;
      var key = a.p.toFixed(4) + panel + hot;
      if (key === lastKey) return;
      lastKey = key;
      render(a.p);
    }

    // The photo is a <picture>: crossing the phone breakpoint swaps the file, and
    // the geometry must be taken from the file actually shown, so measure again
    // whenever a source finishes loading, not only on resize.
    img.addEventListener('load', measure);
    if (img.complete && img.naturalWidth) measure();
    addEventListener('resize', function () { if (img.complete && img.naturalWidth) measure(); }, { passive: true });
    return { update: update };
  })();

  // =============================================================== DX ====
  (function () {
    var items = [].slice.call(document.querySelectorAll('.dx__item'));
    var wide = matchMedia('(min-width: 1000px)');
    items.forEach(function (d) {
      var sum = d.querySelector('summary');
      // exclusive, also where details[name] is not supported
      d.addEventListener('toggle', function () {
        if (d.open) items.forEach(function (o) { if (o !== d && o.open) o.open = false; });
      });
      // on a wide screen the open item is the right column: keep one open
      sum.addEventListener('click', function (e) { if (wide.matches && d.open) e.preventDefault(); });
      sum.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' && wide.matches && !d.open) d.open = true;
      });
    });
  })();

  // =============================================================== MD ====
  // The giant name drifts slower than the doctor standing in front of it, the
  // hero's depth again. On phones the stage is sticky, so only the word moves.
  var md = (function () {
    var sec = document.getElementById('medico');
    var word = sec && sec.querySelector('.md__word'), fig = sec && sec.querySelector('.md__fig');
    if (!word || !fig || REDUCE) return null;
    var last = '';
    return {
      update: function () {
        var r = sec.getBoundingClientRect(), vh = innerHeight;
        if (r.bottom < -100 || r.top > vh + 100) return;
        var t = (vh - r.top) / (vh + r.height) - 0.5;
        var key = t.toFixed(3) + (SMALL.matches ? 's' : 'w');
        if (key === last) return;
        last = key;
        word.style.transform = 'translate3d(0,' + (t * (SMALL.matches ? 70 : 120)).toFixed(1) + 'px,0)';
        fig.style.transform = SMALL.matches ? '' : 'translate3d(0,' + (t * -30).toFixed(1) + 'px,0)';
      }
    };
  })();

  // ============================================================ STAMP ====
  (function () {
    var s = document.querySelector('.stamp');
    if (!s) return;
    if (REDUCE || !('IntersectionObserver' in window)) { s.classList.add('is-stamped'); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { s.classList.add('is-stamped'); io.disconnect(); } });
    // 0.95, not 1: the stamp is rotated, and a rotated box measures 0.99999
    }, { threshold: 0.95, rootMargin: '0px 0px -18% 0px' });
    io.observe(s);
  })();

  // ============================================================= BOOK ====
  (function () {
    var dlg = document.getElementById('book');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var frame = dlg.querySelector('iframe');
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-book]');
      if (!t) return;
      e.preventDefault();
      if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
      dlg.showModal();
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || (e.target.closest && e.target.closest('[data-close]'))) dlg.close();
    });
  })();

  // ============================================================== MAP ====
  // The address becomes a place. As the last act arrives the camera comes down
  // from the island to the clinic's block and tilts into 3D, driven by scroll,
  // so it works with reduced motion too; only the slow orbit after arrival is
  // motion-gated. Cost control: nothing (library, style, tiles, WebGL) loads
  // until the visitor is near the end; weak devices, data saver or no WebGL get
  // a still of the arrived frame; the camera only moves while the card is on
  // screen; MapLibre itself renders on demand, so an idle map costs nothing.
  var map = (function () {
    var el = document.getElementById('map'), sec = document.getElementById('agendar');
    if (!el || !sec || !('IntersectionObserver' in window)) return null;
    var CLINIC = [-46.3369173, -23.952436];          // Av. Dr. Bernardino de Campos, 141 (Google Maps pin)
    // the whole island, then down onto the block, looking along the avenue to the beach
    var Z0 = 12.3, B0 = -18, Z1 = 15.0, Z1_N = 14.7, P1 = 62, B1 = 174, LIFT = 0.4;
    // the clinic's side of the avenue (northbound lanes, OSM), about 600 m around nº 141
    var STREET = [[-46.337478, -23.95562], [-46.33737, -23.954811], [-46.337333, -23.954542], [-46.337277, -23.954068],
                  [-46.337232, -23.953609], [-46.336981, -23.951717], [-46.336836, -23.950331], [-46.336829, -23.950263]];
    var lib = 'vendor/maplibre-gl';
    var gl = null, ready = false, user = false, visible = false, lastQ = -1, orbit = 0, arrivedAt = 0;
    var resetBtn = document.getElementById('mapReset');

    function toStatic() {
      if (gl) { try { gl.remove(); } catch (e) {} gl = null; }
      ready = false;
      el.classList.remove('is-ready');
      el.classList.add('is-static');
      el.setAttribute('aria-label', 'Mapa com a localização da clínica na Av. Dr. Bernardino de Campos, 141, Vila Belmiro, Santos');
    }
    function hasWebGL() {
      try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
    }
    var conn = navigator.connection || {};
    var weak = conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '') ||
               (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

    var near = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      near.disconnect();
      if (weak || !hasWebGL()) { toStatic(); return; }
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = lib + '.css';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = lib + '.js'; js.async = true;
      js.onload = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 60); })(init, { timeout: 900 }); };
      js.onerror = toStatic;
      document.head.appendChild(js);
    }, { rootMargin: '1400px 0px' });
    near.observe(sec);
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) lastQ = -1; else arrivedAt = 0;
    }).observe(el);

    function paint(id, prop, val) { try { if (gl.getLayer(id)) gl.setPaintProperty(id, prop, val); } catch (e) {} }
    function brand() {
      paint('background', 'background-color', '#ECF0EF');
      paint('water', 'fill-color', '#BFD3E3');
      paint('waterway', 'line-color', '#BFD3E3');
      paint('park', 'fill-color', '#DCE7DD');
      paint('landcover_wood', 'fill-color', '#D6E3D7');
      paint('landuse_residential', 'fill-color', '#E6EBEA');
      paint('building', 'fill-color', '#DCE2E1');
      paint('building', 'fill-outline-color', '#CFD7D6');
      paint('highway_minor', 'line-color', '#FFFFFF');
      paint('highway_path', 'line-color', '#F6F8F8');
      paint('highway_major_casing', 'line-color', '#CCD6DD');
      ['highway_major_inner', 'highway_major_subtle'].forEach(function (id) { paint(id, 'line-color', '#FFFFFF'); });
      ['highway_motorway_inner', 'highway_motorway_subtle', 'highway_motorway_bridge_inner'].forEach(function (id) { paint(id, 'line-color', '#DCE4F8'); });
      gl.getStyle().layers.forEach(function (l) {
        if (l.type !== 'symbol') return;
        paint(l.id, 'text-color', '#4A5D68'); paint(l.id, 'text-halo-color', '#F3F6F5');
        // names in Portuguese (the style prefers English: "Bay of Santos")
        if (!/shield/.test(l.id)) { try { gl.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:pt'], ['get', 'name']]); } catch (e) {} }
      });
      var first = gl.getStyle().layers.find(function (l) { return l.type === 'symbol'; });
      var before = first ? first.id : undefined;
      try {
        gl.addLayer({ id: 'fa-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13.5,
          paint: { 'fill-extrusion-color': '#EEF2F1', 'fill-extrusion-opacity': 0.95,
                   'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 7],
                   'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0] } }, before);
      } catch (e) {}
      gl.addSource('fa-street', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: STREET } } });
      gl.addLayer({ id: 'fa-street-glow', type: 'line', source: 'fa-street', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#5B7FF0', 'line-width': 14, 'line-blur': 8, 'line-opacity': 0.4 } }, before);
      gl.addLayer({ id: 'fa-street', type: 'line', source: 'fa-street', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1F4FE0', 'line-width': 4 } }, before);
    }

    function init() {
      if (!window.maplibregl) { toStatic(); return; }
      try {
        gl = new maplibregl.Map({
          container: el, style: 'https://tiles.openfreemap.org/styles/positron',
          center: CLINIC, zoom: Z0, pitch: 0, bearing: B0, maxPitch: 70,
          // mouse: drag to pan and rotate. touch: one finger keeps scrolling the
          // page, two fingers move the map (cooperative gestures, in Portuguese)
          scrollZoom: false, dragPan: true, dragRotate: FINE.matches, touchPitch: false,
          cooperativeGestures: !FINE.matches,
          locale: {
            'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
            'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa',
            'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa'
          },
          attributionControl: { compact: true }, fadeDuration: 0, refreshExpiredTiles: false,
          pixelRatio: Math.min(devicePixelRatio || 1, 1.5)
        });
      } catch (e) { toStatic(); return; }
      el.__map = gl;
      // the style or the tiles never arrive (offline, blocked): fall back to the still
      var guard = setTimeout(function () { if (!ready) toStatic(); }, 10000);
      if (FINE.matches) gl.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      gl.on('load', function () {
        clearTimeout(guard);
        brand();
        var pin = document.createElement('div');
        pin.className = 'map-pin';
        pin.innerHTML = '<span class="map-pin__tag">Clínica · nº 141</span>';
        new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat(CLINIC).addTo(gl);
        // credit stays one tap away instead of covering the card
        var credit = el.querySelector('.maplibregl-ctrl-attrib');
        if (credit) { credit.classList.remove('maplibregl-compact-show'); credit.removeAttribute('open'); }
        ready = true; lastQ = -1;
        el.classList.add('is-ready');
      });
      ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart'].forEach(function (ev) {
        gl.on(ev, function (e) { if (e.originalEvent) { user = true; resetBtn.hidden = false; } });
      });
      resetBtn.addEventListener('click', function () { user = false; resetBtn.hidden = true; lastQ = -1; });
    }

    // Progress runs from the card entering at the bottom of the screen to the
    // page end (or the card near the top), whichever comes first. Pinned on a
    // desktop or flowing on a phone, the flight lands as the page ends.
    function update(now, dt) {
      if (!ready || user || !visible) return;
      var vh = innerHeight, r = el.getBoundingClientRect();
      var remaining = Math.max(0, docEl.scrollHeight - vh - scrollY);
      var endTop = Math.max(r.top - remaining, vh * 0.14);
      var q = clamp01((vh - r.top) / Math.max(vh - endTop, 1));
      var moved = Math.abs(q - lastQ) > 0.0004;
      lastQ = q;
      var orbiting = false;
      if (!REDUCE && q > 0.985) {
        if (!arrivedAt) arrivedAt = now;
        var age = (now - arrivedAt) / 1000;
        if (age < 14) { orbit += dt * 3 * (1 - age / 14); orbiting = true; }   // eases to a stop
      } else if (q < 0.9) { arrivedAt = 0; }
      if (!moved && !orbiting) return;
      // The clinic stays the pivot the whole way, so the pin never leaves the
      // frame; as the camera tilts, the pivot sinks below centre (padding) and
      // the street ahead opens up toward the sea.
      var e = smooth(q);
      gl.jumpTo({
        center: CLINIC, padding: { top: el.clientHeight * LIFT * e, bottom: 0, left: 0, right: 0 },
        zoom: lerp(Z0, el.offsetWidth < 440 ? Z1_N : Z1, e), pitch: lerp(0, P1, e), bearing: lerp(B0, B1, e) + orbit
      });
    }
    return { update: update };
  })();

  // ======================================================= CLOSE FADE ====
  var closeFade = (function () {
    var sec = document.getElementById('agendar');
    var copy = sec && sec.getAttribute('data-sc-act') === 'flow' && sec.querySelector('.close__inner');
    var title = copy && copy.querySelector('.close__title');
    if (!title) return null;
    var barH = 76, last = -1;
    return {
      update: function () {
        var r = title.getBoundingClientRect();
        if (r.bottom < -40 || r.top > innerHeight) return;
        // full at rest (the room filling the screen), gone once the title is
        // more than half under the bar
        var rest = parseFloat(getComputedStyle(copy).paddingTop) || barH + 24;
        var end = barH - 0.6 * r.height;
        var o = smooth((r.top - end) / Math.max(rest - end, 1));
        if (Math.abs(o - last) > 0.004) { last = o; copy.style.opacity = o.toFixed(3); }
      }
    };
  })();

  // ============================================================ FRAME ====
  var lastNow = performance.now(), lastY = -1;
  function frame(now) {
    var dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;
    if (scrollY !== lastY) { lastY = scrollY; SC.read(); chrome.update(); if (closeFade) closeFade.update(); if (md) md.update(); }
    if (hero) hero.update(dt, now);
    if (zoom) zoom.update();
    if (test) test.update();
    if (map) map.update(now, dt);
    ptr.vx *= 0.88; ptr.vy *= 0.88;
    requestAnimationFrame(frame);
  }
  chrome.update();
  addEventListener('resize', function () { chrome.update(); }, { passive: true });
  requestAnimationFrame(frame);
})();
