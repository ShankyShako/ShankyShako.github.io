/*!
 * plane-send.js — paper-plane → chat-bubble → contact-card micro-interaction.
 * Vanilla JS, no dependencies. Works on a scrolling page; nothing is hard-coded
 * to a position: every path is built from live element rects at click time.
 *
 * PlaneSend.init({ ...options })  →  returns { reset(), open(el), destroy() }
 */
(function (global) {
  'use strict';

  var EASE = {
    out: 'cubic-bezier(0.23, 1, 0.32, 1)',
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
    launch: 'cubic-bezier(0.12, 0.72, 0.4, 1)',
    dive: 'cubic-bezier(0.55, 0, 0.85, 0.5)',
    climb: 'cubic-bezier(0.3, 0.5, 0.6, 1)',
    away: 'cubic-bezier(0.5, 0, 0.9, 0.55)'
  };

  /* The two `d` values MUST keep identical command counts (M + 4C + Z) or the
     CSS `d` interpolation snaps instead of morphing. */
  var PLANE_D = 'M 60 36 C 45 29 26 21 12 14 C 16 20 22 26 26 30 C 23 36 19 42 16 48 C 31 44 46 40 60 36 Z';
  var CIRCLE_D = 'M 49 32 C 49 41.39 41.39 49 32 49 C 22.61 49 15 41.39 15 32 C 15 22.61 22.61 15 32 15 C 41.39 15 49 22.61 49 32 Z';

  var PAPER = '#FBFCFC';
  var EDGE = '#A2AFAD';
  var EDGE_CLEAR = 'rgba(162, 175, 173, 0)';
  var CIRCLE_R_UNITS = 17;   // radius of CIRCLE_D inside the 64-unit viewBox
  var NEAR_WIN = 90;         // bright length of the trail, in px of path
  var FAR_WIN = 230;         // faint length behind that

  /* Inbound flight: distance is deliberately uneven against time — 44% of the
     arc in the first 30% of the flight, then the dive, then a slow flare. */
  var DIST = [0, 0.44, 0.76, 1];
  var TIME = [0, 0.3, 0.56, 1];
  var SEG_EASE = [EASE.launch, EASE.dive, EASE.out, undefined];

  /* Outbound: a held climb, then it accelerates out of frame. */
  var EXIT_DIST = [0, 0.2, 1];
  var EXIT_TIME = [0, 0.42, 1];
  var EXIT_EASE = [EASE.climb, EASE.away, undefined];

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function rnd(n) { return Math.round(n * 10) / 10; }
  function el(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function center(node, fx, fy) {
    var r = node.getBoundingClientRect();
    return { x: r.left + r.width * (fx == null ? 0.5 : fx), y: r.top + r.height * (fy == null ? 0.5 : fy) };
  }
  function settle(anim) {
    if (!anim) return;
    anim.finished.then(function () { try { anim.commitStyles(); anim.cancel(); } catch (e) {} }, function () {});
  }
  function canMorphD() {
    return !!(global.CSS && CSS.supports && CSS.supports('d', 'path("M 0 0")'));
  }

  /* Button → bubble. Arc height and apex position scale with the actual gap, so
     a trigger anywhere on the page gets its own path. */
  function buildPath(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var lift = Math.max(110, Math.min(250, Math.hypot(dx, dy) * 0.3));
    var apexY = Math.min(a.y, b.y) - lift;
    var ax = a.x + dx * 0.42;
    var mx = a.x + dx * 0.72;
    var my = apexY + (b.y - apexY) * 0.95 + 34;
    return [
      'M ' + rnd(a.x) + ' ' + rnd(a.y),
      'C ' + rnd(a.x + dx * 0.12) + ' ' + rnd(a.y - lift * 0.62) + ' ' + rnd(ax - dx * 0.14) + ' ' + rnd(apexY) + ' ' + rnd(ax) + ' ' + rnd(apexY),
      'C ' + rnd(ax + dx * 0.16) + ' ' + rnd(apexY + 18) + ' ' + rnd(mx - dx * 0.05) + ' ' + rnd(my - 10) + ' ' + rnd(mx) + ' ' + rnd(my),
      'C ' + rnd(mx + dx * 0.1) + ' ' + rnd(my + 14) + ' ' + rnd(b.x - dx * 0.06) + ' ' + rnd(b.y + Math.max(16, dy * 0.35)) + ' ' + rnd(b.x) + ' ' + rnd(b.y)
    ].join(' ');
  }

  /* Bubble → off the top edge. Bulges outward on the climb, veers back across,
     and leaves the frame at exitFrac of the viewport width. */
  function buildExitPath(a, W, exitFrac) {
    var ex = W * exitFrac, top = -180;
    var rise = a.y - top, swing = a.x - ex;
    var mx = a.x - swing * 0.34, my = a.y - rise * 0.54;
    return [
      'M ' + rnd(a.x) + ' ' + rnd(a.y),
      'C ' + rnd(a.x + Math.max(38, rise * 0.09)) + ' ' + rnd(a.y - rise * 0.2) + ' ' + rnd(mx + Math.max(46, rise * 0.12)) + ' ' + rnd(my + rise * 0.16) + ' ' + rnd(mx) + ' ' + rnd(my),
      'C ' + rnd(mx - Math.max(44, rise * 0.11)) + ' ' + rnd(my - rise * 0.18) + ' ' + rnd(ex + swing * 0.22) + ' ' + rnd(top + rise * 0.3) + ' ' + rnd(ex) + ' ' + rnd(top)
    ].join(' ');
  }

  function PlaneSend(opts) {
    this.o = Object.assign({
      triggers: '[data-plane-send]',      // buttons that fly the plane
      directTriggers: '[data-plane-open]', // buttons that skip the flight
      bindTriggers: true,                  // false: host page owns the clicks (see bind())
      bubble: '#contactBubble',
      card: '#contactCard',
      sendButton: null,                    // e.g. '#contactSend'
      closeButton: null,                   // e.g. '#contactClose'
      staggerSelector: '[data-stagger]',
      accent: '#14707C',
      trailColor: '#7FE3C8',
      planeSize: 34,
      exitAt: 0.75,
      timeScale: 1,
      trail: true,
      zIndex: 9000,
      onSend: null                         // called when the send flight starts
    }, opts || {});

    this.bubble = document.querySelector(this.o.bubble);
    this.card = document.querySelector(this.o.card);
    if (!this.bubble || !this.card) {
      console.warn('[plane-send] bubble or card not found', this.o.bubble, this.o.card);
      return;
    }
    this.flight = [];
    this.cardAnims = [];
    this.timers = [];
    this.token = 0;
    this.hasLanded = false;
    this.isOpen = false;

    this.buildLayers();
    this.bind();
    this.hideBubble();
  }

  PlaneSend.prototype = {

    /* ---------- layers ---------- */

    buildLayers: function () {
      var z = this.o.zIndex;
      var id = 'planeTrailWindow' + (++uid);

      var svg = el('svg', { fill: 'none', 'aria-hidden': 'true' });
      svg.setAttribute('class', 'planesend-trail');
      svg.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:' + z;
      var mask = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -400, y: -400, width: 2400, height: 2000 });
      this.winFar = el('path', { d: 'M 0 0', stroke: '#fff', 'stroke-opacity': 0.32, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' });
      this.winNear = el('path', { d: 'M 0 0', stroke: '#fff', 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' });
      mask.appendChild(this.winFar); mask.appendChild(this.winNear);
      this.trail = el('path', {
        d: 'M 0 0', stroke: this.o.trailColor, 'stroke-width': 2,
        'stroke-dasharray': '5 9', 'stroke-linecap': 'round', fill: 'none', mask: 'url(#' + id + ')'
      });
      this.trail.style.opacity = '0';
      svg.appendChild(mask); svg.appendChild(this.trail);

      var plane = el('svg', { viewBox: '0 0 64 64', width: this.o.planeSize, height: this.o.planeSize,
                              'aria-hidden': 'true' });
      plane.setAttribute('class', 'planesend-plane');
      plane.style.cssText = 'position:fixed;left:0;top:0;opacity:0;overflow:visible;pointer-events:none;' +
        'will-change:transform,opacity;z-index:' + (z + 3);
      plane.style.offsetAnchor = '50% 50%';
      plane.style.offsetRotate = 'auto';
      this.pitch = el('g');
      this.pitch.style.transformBox = 'view-box';
      this.pitch.style.transformOrigin = '32px 32px';
      this.shape = el('path', { d: PLANE_D, fill: PAPER, stroke: EDGE, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      this.fold = el('path', { d: 'M 60 36 L 26 30', fill: 'none', stroke: EDGE, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
      this.pitch.appendChild(this.shape); this.pitch.appendChild(this.fold);
      plane.appendChild(this.pitch);

      document.body.appendChild(svg);
      document.body.appendChild(plane);
      this.svg = svg;
      this.plane = plane;

      this.card.style.willChange = 'transform, clip-path, opacity';
      this.fit();
      this._fit = this.fit.bind(this);
      global.addEventListener('resize', this._fit);
    },

    /* One viewBox unit === one CSS pixel, so no scroll math anywhere. */
    fit: function () {
      var w = global.innerWidth, h = global.innerHeight;
      this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      this.svg.setAttribute('width', w);
      this.svg.setAttribute('height', h);
    },

    bind: function () {
      var self = this;
      this._onFly = function (e) { self.open(e.currentTarget); };
      this._onDirect = function () { self.openDirect(); };
      this._onToggle = function () { self.isOpen ? self.closeCard() : self.openCard(!self.reduced()); };
      this._onSend = function () { self.send(); };
      this._onClose = function () { self.closeCard(); };

      this.flyBtns = [];
      this.directBtns = [];
      /* A host page that already owns these clicks — because it also has a draft, a
         backdrop, a focus trap and ARIA state to keep in step — passes
         bindTriggers:false and calls open()/openDirect()/closeCard() itself. Binding
         in both places is not a double-open, it is a double *flight*: two planes
         launch from the same button on the first click, before isOpen is true. */
      if (this.o.bindTriggers === false) return this.bindButtons();

      this.flyBtns = [].slice.call(document.querySelectorAll(this.o.triggers));
      this.directBtns = [].slice.call(document.querySelectorAll(this.o.directTriggers));
      this.flyBtns.forEach(function (b) { b.addEventListener('click', self._onFly); });
      this.directBtns.forEach(function (b) { b.addEventListener('click', self._onDirect); });
      this.bubble.addEventListener('click', this._onToggle);
      this.bindButtons();
    },

    bindButtons: function () {
      this.sendBtn = this.o.sendButton ? document.querySelector(this.o.sendButton) : null;
      this.closeBtn = this.o.closeButton ? document.querySelector(this.o.closeButton) : null;
      if (this.sendBtn) this.sendBtn.addEventListener('click', this._onSend);
      if (this.closeBtn) this.closeBtn.addEventListener('click', this._onClose);
    },

    destroy: function () {
      var self = this;
      this.killFlight();
      global.removeEventListener('resize', this._fit);
      this.flyBtns.forEach(function (b) { b.removeEventListener('click', self._onFly); });
      this.directBtns.forEach(function (b) { b.removeEventListener('click', self._onDirect); });
      this.bubble.removeEventListener('click', this._onToggle);
      if (this.sendBtn) this.sendBtn.removeEventListener('click', this._onSend);
      if (this.closeBtn) this.closeBtn.removeEventListener('click', this._onClose);
      this.svg.remove(); this.plane.remove();
    },

    /* ---------- helpers ---------- */

    t: function () { return Math.max(0.25, Number(this.o.timeScale) || 1); },
    reduced: function () { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; },
    later: function (fn, ms) { this.timers.push(setTimeout(fn, ms)); },

    killFlight: function () {
      this.token++;
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.flight.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      this.flight = [];
    },

    /* The card grows out of the bubble, so the clip origin is the bubble's
       centre expressed in the card's own box — measured live, so it survives
       any layout the host page has. */
    clip: function (kind) {
      var c = this.card.getBoundingClientRect();
      var b = this.bubble.getBoundingClientRect();
      var x = rnd(b.left + b.width / 2 - c.left);
      var y = rnd(b.top + b.height / 2 - c.top);
      var r = kind === 'open' ? '150%' : (kind === 'seed' ? rnd(b.width / 2) + 'px' : '0px');
      return 'circle(' + r + ' at ' + x + 'px ' + y + 'px)';
    },

    finalScale: function () {
      var b = this.bubble.getBoundingClientRect();
      return (b.width / 2) / (CIRCLE_R_UNITS * this.o.planeSize / 64);
    },

    hideBubble: function () {
      this.bubble.style.opacity = '0';
      this.bubble.style.pointerEvents = 'none';
    },

    resetPlane: function () {
      this.plane.style.opacity = '0';
      this.plane.style.transform = 'none';
      this.shape.setAttribute('d', PLANE_D);
      this.shape.style.fill = PAPER;
      this.shape.style.stroke = EDGE;
      this.fold.style.opacity = '1';
      this.trail.style.opacity = '0';
    },

    reset: function () {
      this.killFlight();
      this.cardAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      this.cardAnims = [];
      this.isOpen = false;
      this.hasLanded = false;
      this.card.style.opacity = '0';
      this.card.style.pointerEvents = 'none';
      this.card.style.clipPath = this.clip('zero');
      this.card.style.transform = 'none';
      [].forEach.call(this.card.querySelectorAll(this.o.staggerSelector), function (n) {
        n.style.opacity = ''; n.style.transform = '';
      });
      this.hideBubble();
      this.resetPlane();
    },

    /* ---------- entry points ---------- */

    open: function (btn) {
      if (this.isOpen) { this.focusCard(); return; }
      if (!btn || this.hasLanded || this.reduced()) { this.showBubble(); this.openCard(!this.reduced()); return; }
      this.fly(btn);
    },

    openDirect: function () {
      if (this.isOpen) { this.focusCard(); return; }
      this.killFlight();
      this.resetPlane();
      this.showBubble();
      this.openCard(!this.reduced());
    },

    focusCard: function () {
      var f = this.card.querySelector('input, textarea, select');
      if (f) f.focus();
    },

    /* ---------- 1. glide in ---------- */

    fly: function (btn) {
      var self = this, tk = ++this.token, t = this.t(), dur = 880 * t;
      var d = buildPath(center(btn, 0.5, 0.42), center(this.bubble));

      this.resetPlane();
      this.plane.style.offsetPath = 'path("' + d + '")';

      var move = this.plane.animate(DIST.map(function (v, i) {
        return { offsetDistance: (v * 100) + '%', offset: TIME[i], easing: SEG_EASE[i] };
      }), { duration: dur, fill: 'both' });
      this.flight.push(move);
      this.flight.push(this.pitch.animate([
        { transform: 'rotate(-7deg)', offset: 0 },
        { transform: 'rotate(-2deg)', offset: 0.3 },
        { transform: 'rotate(6deg)', offset: 0.56 },
        { transform: 'rotate(0deg)', offset: 1 }
      ], { duration: dur, easing: EASE.inOut, fill: 'both' }));
      this.flight.push(this.plane.animate(
        [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 150 * t, easing: EASE.out, fill: 'both' }
      ));

      if (this.o.trail) this.runTrail(d, dur, DIST, TIME, SEG_EASE);
      move.finished.then(function () { if (tk === self.token) self.morph(tk); }, function () {});
    },

    /* The dashed path is drawn once and revealed through a window that trails
       the plane, driven by the flight's own easing — so it can never drift. */
    runTrail: function (d, dur, dist, time, eases) {
      var self = this;
      [this.trail, this.winFar, this.winNear].forEach(function (p) { p.setAttribute('d', d); });
      var L = this.winNear.getTotalLength();
      this.trail.style.opacity = '1';
      [[this.winFar, FAR_WIN], [this.winNear, NEAR_WIN]].forEach(function (pair) {
        pair[0].style.strokeDasharray = pair[1] + ' ' + (L * 2);
        self.flight.push(pair[0].animate(dist.map(function (v, i) {
          return { strokeDashoffset: pair[1] - v * L, offset: time[i], easing: eases[i] };
        }), { duration: dur, fill: 'both' }));
      });
    },

    /* ---------- 2. paper becomes circle ---------- */

    morph: function (tk) {
      var self = this, t = this.t(), dur = 240 * t;

      if (canMorphD()) {
        this.flight.push(this.shape.animate(
          [{ d: 'path("' + PLANE_D + '")' }, { d: 'path("' + CIRCLE_D + '")' }],
          { duration: dur, easing: EASE.inOut, fill: 'forwards' }
        ));
      } else {
        this.shape.setAttribute('d', CIRCLE_D);
      }
      this.flight.push(this.shape.animate(
        [{ fill: PAPER, stroke: EDGE }, { fill: this.o.accent, stroke: EDGE_CLEAR }],
        { duration: dur, easing: EASE.inOut, fill: 'forwards' }
      ));
      this.flight.push(this.fold.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.55, fill: 'forwards' }));
      this.flight.push(this.trail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320 * t, fill: 'forwards' }));
      this.later(function () { if (tk === self.token) self.grow(tk); }, dur);
    },

    /* ---------- 3. circle takes the bubble's size, card grows out of it ---------- */

    grow: function (tk) {
      var self = this, t = this.t(), dur = 230 * t;
      this.flight.push(this.plane.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(' + this.finalScale() + ')' }],
        { duration: dur, easing: EASE.out, fill: 'forwards' }
      ));
      this.later(function () {
        if (tk !== self.token) return;
        self.showBubble();
        self.openCard(true);
      }, dur);
    },

    /* Same position, same diameter, same fill — the swap to the real button is
       invisible, and from here the bubble is an ordinary control. */
    showBubble: function () {
      this.killFlight();
      this.resetPlane();
      this.bubble.style.opacity = '1';
      this.bubble.style.pointerEvents = 'auto';
      if (this.reduced()) return;
      settle(this.bubble.animate(
        [{ transform: 'scale(0.86)' }, { transform: 'scale(1)' }],
        { duration: 200 * this.t(), easing: EASE.out }
      ));
    },

    openCard: function (grow) {
      var self = this, t = this.t(), card = this.card;
      this.cardAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      this.cardAnims = [];
      card.style.pointerEvents = 'auto';
      this.isOpen = true;
      this.hasLanded = true;

      if (!grow) {
        this.cardAnims.push(card.animate([
          { opacity: 0, clipPath: this.clip('open'), transform: 'none' },
          { opacity: 1, clipPath: this.clip('open'), transform: 'none' }
        ], { duration: 180, fill: 'forwards' }));
        return;
      }
      /* Every keyframe states opacity: an omitted property picks up the
         element's underlying value (opacity 0) as the implicit end keyframe. */
      this.cardAnims.push(card.animate([
        { opacity: 0, clipPath: this.clip('seed'), transform: 'scale(0.965)', offset: 0 },
        { opacity: 1, offset: 0.26 },
        { opacity: 1, clipPath: this.clip('open'), transform: 'scale(1)', offset: 1 }
      ], { duration: 300 * t, easing: EASE.out, fill: 'forwards' }));

      [].forEach.call(card.querySelectorAll(this.o.staggerSelector), function (n, i) {
        self.cardAnims.push(n.animate(
          [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }],
          { duration: 220 * t, delay: (70 + i * 30) * t, easing: EASE.out, fill: 'both' }
        ));
      });
    },

    /* Exits the way it entered: back into the bubble it grew out of. */
    closeCard: function (then) {
      var t = this.t(), card = this.card, soft = this.reduced();
      this.cardAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      this.cardAnims = [];
      this.isOpen = false;
      card.style.pointerEvents = 'none';
      var dur = (soft ? 140 : 200) * t;
      this.cardAnims.push(card.animate([
        { opacity: 1, clipPath: this.clip('open'), transform: 'scale(1)' },
        { opacity: 0, clipPath: soft ? this.clip('open') : this.clip('seed'), transform: soft ? 'none' : 'scale(0.975)' }
      ], { duration: dur, easing: EASE.out, fill: 'forwards' }));
      if (then) this.later(then, dur);
    },

    /* ---------- 4. send: the card folds back into paper and leaves ---------- */

    send: function () {
      var self = this;
      if (this.o.onSend) this.o.onSend();
      if (this.reduced()) { this.closeCard(function () { self.afterSend(); }); return; }
      this.closeCard(function () { self.launchAway(); });
    },

    launchAway: function () {
      var self = this;
      this.killFlight();
      var tk = this.token, t = this.t(), unfold = 220 * t;
      var scale = this.finalScale();
      var d = buildExitPath(center(this.bubble), global.innerWidth, this.o.exitAt);

      this.plane.style.offsetPath = 'path("' + d + '")';
      this.plane.style.offsetDistance = '0%';
      this.plane.style.opacity = '1';
      this.plane.style.transform = 'scale(' + scale + ')';
      this.shape.setAttribute('d', CIRCLE_D);
      this.shape.style.fill = this.o.accent;
      this.shape.style.stroke = EDGE_CLEAR;
      this.fold.style.opacity = '0';
      this.hideBubble();

      if (canMorphD()) {
        this.flight.push(this.shape.animate(
          [{ d: 'path("' + CIRCLE_D + '")' }, { d: 'path("' + PLANE_D + '")' }],
          { duration: unfold, easing: EASE.inOut, fill: 'forwards' }
        ));
      } else {
        this.later(function () { self.shape.setAttribute('d', PLANE_D); }, unfold);
      }
      this.flight.push(this.shape.animate(
        [{ fill: this.o.accent, stroke: EDGE_CLEAR }, { fill: PAPER, stroke: EDGE }],
        { duration: unfold, easing: EASE.inOut, fill: 'forwards' }
      ));
      this.flight.push(this.fold.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: unfold, delay: unfold * 0.4, fill: 'forwards' }));
      this.flight.push(this.plane.animate(
        [{ transform: 'scale(' + scale + ')' }, { transform: 'scale(1)' }],
        { duration: unfold, easing: EASE.out, fill: 'forwards' }
      ));

      this.later(function () { if (tk === self.token) self.climbOut(tk, d); }, unfold);
    },

    climbOut: function (tk, d) {
      var self = this, t = this.t(), dur = 1050 * t;
      var climb = this.plane.animate(EXIT_DIST.map(function (v, i) {
        return { offsetDistance: (v * 100) + '%', offset: EXIT_TIME[i], easing: EXIT_EASE[i] };
      }), { duration: dur, fill: 'both' });
      this.flight.push(climb);
      this.flight.push(this.pitch.animate([
        { transform: 'rotate(6deg)', offset: 0 },
        { transform: 'rotate(-4deg)', offset: 0.42 },
        { transform: 'rotate(3deg)', offset: 1 }
      ], { duration: dur, easing: EASE.inOut, fill: 'both' }));

      if (this.o.trail) this.runTrail(d, dur, EXIT_DIST, EXIT_TIME, EXIT_EASE);

      /* Cleanup rides the climb's own completion — the timing curve is
         back-loaded, so any fraction of the duration is still on screen. */
      climb.finished.then(function () {
        if (tk !== self.token) return;
        self.killFlight();
        self.resetPlane();
        self.afterSend();
      }, function () {});
    },

    /* The plane has left the frame and the message is gone with it. The bubble does
       NOT come back here — a corner bubble reappearing behind "Message sent!" has
       nothing left to offer and reads as an invitation to send the same message
       twice. Clearing hasLanded is the other half: the next launcher click is a
       fresh intent, so it replays the full flight rather than the shortcut
       open() takes for an already-landed plane. */
    afterSend: function () {
      this.hasLanded = false;
      this.isOpen = false;
      this.hideBubble();
      this.resetPlane();
    }
  };

  global.PlaneSend = {
    init: function (opts) { return new PlaneSend(opts); },
    PLANE_D: PLANE_D,
    CIRCLE_D: CIRCLE_D
  };
})(window);
