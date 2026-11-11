// Mushtaq Ahmed — portfolio (DevSync-style layout). No dependencies; CSP-safe (no inline code, no innerHTML).
"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Year + Edmonton local time
function initClock() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
  const el = document.getElementById("local-time");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Edmonton" });
  const tick = () => { el.textContent = fmt.format(new Date()) + " MT"; };
  tick();
  setInterval(tick, 30000);
}

// Full-screen menu
function initMenu() {
  const btn = document.getElementById("burger");
  const menu = document.getElementById("menu");
  if (!btn || !menu) return;
  const label = btn.querySelector(".nav__menu-label");
  const set = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("menu-open", open);
    if (label) label.textContent = open ? "Close" : "Menu";
  };
  btn.addEventListener("click", () => set(menu.hidden));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => set(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) { set(false); btn.focus(); }
  });
}

// Nav background once scrolled
function initNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

// Count-up numbers: data-count, data-prefix, data-suffix, data-decimals
function runCounter(el) {
  const target = parseFloat(el.dataset.count);
  if (Number.isNaN(target)) return;
  const dec = parseInt(el.dataset.decimals || "0", 10);
  const pre = el.dataset.prefix || "";
  const suf = el.dataset.suffix || "";
  const render = (v) => { el.textContent = pre + v.toFixed(dec) + suf; };
  if (reduceMotion) return render(target);
  const dur = 1400;
  let t0 = null;
  const step = (t) => {
    if (t0 === null) t0 = t;
    const p = Math.min((t - t0) / dur, 1);
    render(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Scroll reveals + counters
function initReveals() {
  const reveals = document.querySelectorAll("[data-reveal]");
  const counters = document.querySelectorAll("[data-count]");
  if (!("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
    counters.forEach(runCounter);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.hasAttribute("data-reveal")) el.classList.add("is-in");
      if (el.hasAttribute("data-count")) runCounter(el);
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  reveals.forEach((el) => io.observe(el));
  counters.forEach((el) => io.observe(el));
}

// "Read more" drawers: native <dialog> for focus trapping, Esc and screen reader support
function initDrawers() {
  let lastTrigger = null;

  const open = (dialog, trigger) => {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || null;
    document.documentElement.classList.add("has-drawer");
    dialog.scrollTop = 0;
    dialog.showModal();
    history.replaceState(null, "", "#" + dialog.id);
  };

  const cleanup = (dialog) => {
    dialog.classList.remove("is-closing");
    if (document.querySelector("dialog.drawer[open]")) return;
    document.documentElement.classList.remove("has-drawer");
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
    const onEnd = (e) => { if (e.target === dialog) finish(); };
    dialog.addEventListener("animationend", onEnd);
    setTimeout(finish, 700);
  };

  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => open(document.getElementById(btn.dataset.open), btn));
  });

  document.querySelectorAll("dialog.drawer").forEach((dialog) => {
    dialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => close(dialog)));
    dialog.addEventListener("close", () => cleanup(dialog));
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(dialog); });
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(dialog); });
  });

  // Deep link: #case-cwb opens that drawer. Escape only the id so hash text can't alter the selector.
  const fromHash = location.hash.length > 1 && document.querySelector(`dialog.drawer#${CSS.escape(location.hash.slice(1))}`);
  if (fromHash) open(fromHash, document.querySelector(`[data-open="${fromHash.id}"]`));
}

initClock();
initMenu();
initNav();
initReveals();
initDrawers();
