const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

// Footer year + Edmonton local time
document.getElementById("year").textContent = new Date().getFullYear();
const timeEl = document.getElementById("local-time");
const fmt = new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Edmonton", timeZoneName: "short" });
const tick = () => { timeEl.textContent = fmt.format(new Date()); };
tick();
setInterval(tick, 30_000);

// Split the about statement into words for the scroll "fill" effect
// Built with DOM nodes rather than innerHTML so text is never parsed as markup
document.querySelectorAll("[data-words]").forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.className = "w";
    span.textContent = w;
    el.append(span, i < words.length - 1 ? " " : "");
  });
});

let lenis = null;

initDrawers();
initNetwork();

if (!hasGsap || reduceMotion) {
  // No animation library (or user prefers less motion): show everything immediately
  document.documentElement.classList.add("no-anim");
} else {
  gsap.registerPlugin(ScrollTrigger);
  initSmoothScroll();
  initReveals();
  initNav();
}

function initSmoothScroll() {
  if (typeof window.Lenis === "undefined") return;
  lenis = new Lenis({ lerp: 0.12 });
  if (document.documentElement.classList.contains("has-drawer")) lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -70, duration: 1.2 });
      // Move keyboard focus with the scroll (skip link, nav), without a second jump
      if (target.matches("main, section, footer")) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  });
}

// Calm, consistent motion: content fades up gently once as it enters the screen.
// fromTo with explicit end states: a plain from() re-reads its end values when the page re-measures
// (resize, drawer open/close) and can freeze an element in its offset start state.
function initReveals() {
  const fadeUp = (targets, trigger, opts = {}) => gsap.fromTo(targets, { y: 24, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.8, ease: "power2.out", stagger: opts.stagger || 0,
    scrollTrigger: { trigger: trigger || targets, start: "top 88%" },
  });

  // Landing area appears on load
  gsap.fromTo([".hero__meta", ".hero__name", ".hero__bottom"], { y: 16, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.9, ease: "power2.out", stagger: 0.12, delay: 0.1,
  });

  gsap.utils.toArray(".section__head .title").forEach((t) => fadeUp(t));
  gsap.utils.toArray(".case").forEach((c) => fadeUp(c));
  [".step", ".skill", ".edu-card", ".cred-feature"].forEach((sel) => fadeUp(sel, sel, { stagger: 0.07 }));
  gsap.utils.toArray(".cred-list").forEach((list) => fadeUp(list.children, list, { stagger: 0.05 }));
  fadeUp(".contact > *", ".contact", { stagger: 0.06 });

  // Statement words fill in as you scroll
  gsap.to(".statement .w", {
    opacity: 1, stagger: 0.05, ease: "none",
    scrollTrigger: { trigger: ".statement", start: "top 80%", end: "bottom 50%", scrub: true },
  });

  // Count-up numbers
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    el.textContent = (0).toFixed(decimals) + suffix;
    gsap.to(obj, {
      v: end, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; },
    });
  });

  // Stats: accent lines draw in
  gsap.utils.toArray(".stats li").forEach((li, i) => {
    ScrollTrigger.create({
      trigger: ".stats", start: "top 85%", once: true,
      onEnter: () => setTimeout(() => li.classList.add("is-in"), i * 120),
    });
  });

  // Process rail fills left to right; each step lights up as the fill reaches it
  const steps = gsap.utils.toArray(".step");
  gsap.to(".rail__fill", {
    scaleX: 1, ease: "none",
    scrollTrigger: {
      trigger: ".steps", start: "top 80%", end: "bottom 55%", scrub: true,
      onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle("is-on", self.progress >= (i + 0.5) / steps.length)),
    },
  });
}

// The nav tucks away while scrolling down and returns when scrolling up
function initNav() {
  const nav = document.querySelector(".nav");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const hide = self.direction === 1 && self.scroll() > window.innerHeight * 0.6;
      gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.4, ease: "power2.out", overwrite: "auto" });
    },
  });
  // Never leave the nav hidden while someone is tabbing through it
  nav.addEventListener("focusin", () => gsap.to(nav, { yPercent: 0, duration: 0.2, overwrite: "auto" }));
}

// Landing-area background: drifting dots joined by lines when close, which also reach out to the pointer
// and drift gently toward it. Pure canvas drawing; pauses off screen and in background tabs; static for reduced motion.
function initNetwork() {
  const canvas = document.querySelector(".hero__network");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const INK = "30, 43, 69", ACCENT = "154, 79, 42"; // navy and copper from the palette
  let w = 0, h = 0, dpr = 1, dots = [], raf = 0, running = false, visible = true;
  let linkDist = 140, mouseDist = 200;
  const mouse = { x: -9999, y: -9999, active: false };

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const small = w < 760;
    linkDist = small ? 110 : 140;
    mouseDist = small ? 150 : 200;
    // Density scales with screen area, capped so the line checks stay cheap
    const count = Math.min(small ? 50 : 100, Math.round((w * h) / (small ? 10000 : 15000)));
    dots = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 1.1 + Math.random() * 1.2,
      accent: i % 10 === 0,
    }));
  }

  function step() {
    for (const d of dots) {
      if (mouse.active) {
        const dx = mouse.x - d.x, dy = mouse.y - d.y;
        const dist = Math.hypot(dx, dy);
        // Gentle pull toward the pointer, strongest when near
        if (dist < mouseDist && dist > 1) {
          const f = (1 - dist / mouseDist) * 0.015;
          d.vx += (dx / dist) * f; d.vy += (dy / dist) * f;
        }
      }
      d.vx *= 0.985; d.vy *= 0.985;
      // Keep a minimum idle drift so the field never freezes
      const speed = Math.hypot(d.vx, d.vy);
      if (speed < 0.1) { d.vx += (Math.random() - 0.5) * 0.04; d.vy += (Math.random() - 0.5) * 0.04; }
      if (speed > 1.2) { d.vx *= 1.2 / speed; d.vy *= 1.2 / speed; }
      d.x += d.vx; d.y += d.vy;
      if (d.x < -20) d.x = w + 20; else if (d.x > w + 20) d.x = -20;
      if (d.y < -20) d.y = h + 20; else if (d.y > h + 20) d.y = -20;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > linkDist || Math.abs(dy) > linkDist) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < linkDist) {
          ctx.strokeStyle = `rgba(${INK}, ${(1 - dist / linkDist) * 0.14})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      if (mouse.active) {
        const dist = Math.hypot(mouse.x - a.x, mouse.y - a.y);
        if (dist < mouseDist) {
          ctx.strokeStyle = `rgba(${ACCENT}, ${(1 - dist / mouseDist) * 0.4})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }
    for (const d of dots) {
      ctx.fillStyle = d.accent ? `rgba(${ACCENT}, 0.7)` : `rgba(${INK}, 0.32)`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop() { step(); draw(); raf = requestAnimationFrame(loop); }
  function start() { if (!running && visible && !document.hidden && !reduceMotion) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  build(); draw();
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); draw(); }, 150);
  }).observe(hero);
  if (reduceMotion) return; // a still constellation only

  // Pointer position relative to the landing area (it scrolls with the page)
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { mouse.active = false; });
  window.addEventListener("blur", () => { mouse.active = false; });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
}

// Case study drawers: native <dialog> for focus trapping, Esc and screen reader support
function initDrawers() {
  let lastTrigger = null;

  const open = (dialog, trigger) => {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || null;
    document.documentElement.classList.add("has-drawer");
    if (lenis) lenis.stop();
    dialog.scrollTop = 0;
    dialog.showModal();
    history.replaceState(null, "", "#" + dialog.id);
  };

  // Runs on the dialog's "close" event, so it fires however the drawer closed — including when the
  // browser closes it directly (e.g. Chrome ignores preventDefault on Esc before any user click)
  const cleanup = (dialog) => {
    dialog.classList.remove("is-closing");
    if (document.querySelector("dialog.drawer[open]")) return;
    document.documentElement.classList.remove("has-drawer");
    if (lenis) lenis.start();
    history.replaceState(null, "", location.pathname + location.search);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  };

  const close = (dialog) => {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    if (reduceMotion) return dialog.close();
    dialog.classList.add("is-closing");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeEventListener("animationend", onEnd);
      if (dialog.open) dialog.close();
    };
    // Only the drawer's own slide-out ends the close (its contents also animate)
    const onEnd = (e) => { if (e.target === dialog) finish(); };
    dialog.addEventListener("animationend", onEnd);
    setTimeout(finish, 700); // fallback if the animation event never arrives
  };

  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => open(document.getElementById(btn.dataset.open), btn));
  });

  document.querySelectorAll("dialog.drawer").forEach((dialog) => {
    dialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => close(dialog)));
    dialog.addEventListener("close", () => cleanup(dialog));
    // Esc: run the animated close instead of the instant default
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(dialog); });
    // Clicking the dimmed backdrop (the dialog element itself, outside its content) closes it
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(dialog); });
  });

  // Deep link: index.html#case-cwb opens that case study directly
  // Escape only the id (not the leading "#") so arbitrary hash text can never alter the selector
  const fromHash = location.hash.length > 1 && document.querySelector(`dialog.drawer#${CSS.escape(location.hash.slice(1))}`);
  if (fromHash) {
    const trigger = document.querySelector(`[data-open="${fromHash.id}"]`);
    open(fromHash, trigger);
  }
}
