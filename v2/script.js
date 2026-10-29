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

const loader = document.querySelector(".loader");
let lenis = null;

initDrawers();

if (!hasGsap || reduceMotion) {
  // No animation library (or user prefers less motion): show everything immediately
  document.documentElement.classList.add("no-anim");
  loader.remove();
} else {
  gsap.registerPlugin(ScrollTrigger);
  initSmoothScroll();
  runIntro();
  initScrollAnimations();
  initCursor();
  initMagnetic();
}

function initSmoothScroll() {
  if (typeof window.Lenis === "undefined") return;
  lenis = new Lenis({ lerp: 0.1 });
  if (document.documentElement.classList.contains("has-drawer")) lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    });
  });
}

function runIntro() {
  const num = document.getElementById("loader-num");
  const counter = { v: 0 };
  gsap.set(".hero__name .line > span", { yPercent: 110 });
  gsap.set([".hero__meta", ".hero__bottom", ".nav"], { opacity: 0 });

  gsap.timeline()
    .to(counter, {
      v: 100, duration: 1.6, ease: "power2.inOut",
      onUpdate: () => { num.textContent = Math.round(counter.v); },
    })
    .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" })
    .add(() => loader.remove())
    .to(".hero__name .line > span", { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.12 }, "-=0.45")
    .to([".nav", ".hero__meta", ".hero__bottom"], { opacity: 1, duration: 0.8, stagger: 0.1 }, "-=0.7")
    .from(".hero__star", { rotate: -180, scale: 0, duration: 1, ease: "back.out(2)" }, "-=1");

  gsap.to(".hero__star", { rotate: 360, duration: 12, ease: "none", repeat: -1, delay: 3 });
}

function initScrollAnimations() {
  // Section titles rise in
  gsap.utils.toArray(".section__head").forEach((el) => {
    gsap.from(el.children, {
      y: 60, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // Case cards: rise and settle
  gsap.utils.toArray(".case").forEach((card) => {
    gsap.from(card, {
      y: 120, rotate: 2, opacity: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: card, start: "top 92%" },
    });
  });

  // Statement words fill in as you scroll
  gsap.to(".statement .w", {
    opacity: 1, stagger: 0.05, ease: "none",
    scrollTrigger: { trigger: ".statement", start: "top 80%", end: "bottom 45%", scrub: true },
  });

  // Count-up numbers
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    el.textContent = (0).toFixed(decimals) + suffix;
    gsap.to(obj, {
      v: end, duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; },
    });
  });

  // Steps, skills and credentials stagger in
  [".step", ".skill", ".edu-card"].forEach((sel) => {
    gsap.from(sel, {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: sel, start: "top 88%" },
    });
  });
  // Each certification/course list animates when it reaches the viewport
  gsap.utils.toArray(".cred-list").forEach((list) => {
    gsap.from(list.children, {
      y: 30, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.06,
      scrollTrigger: { trigger: list, start: "top 88%" },
    });
  });
  gsap.from(".cred-feature", {
    y: 60, scale: 0.94, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.12,
    scrollTrigger: { trigger: ".cert-cards", start: "top 85%" },
  });

  // Marquee: steady loop that speeds up only gently while scrolling, then eases back.
  // Driven by GSAP timeScale (not CSS animation-duration, which makes the strip jump).
  const track = document.querySelector(".marquee__track");
  track.style.animation = "none";
  const loop = gsap.to(track, { xPercent: -50, duration: 45, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 4000, 0.8);
      gsap.to(loop, { timeScale: boost, duration: 0.3, overwrite: true })
        .then(() => gsap.to(loop, { timeScale: 1, duration: 1.2, ease: "power2.out", overwrite: true }));
    },
  });

  // Big contact text slides in
  gsap.from(".contact__big", {
    xPercent: -15, opacity: 0, duration: 1.2, ease: "power3.out",
    scrollTrigger: { trigger: ".contact__big", start: "top 90%" },
  });
}

function initCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const cursor = document.querySelector(".cursor");
  const label = cursor.querySelector(".cursor__label");
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      label.textContent = el.dataset.cursor || "View";
      cursor.classList.add("is-big");
    });
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-big"));
  });
  document.querySelectorAll("a:not([data-cursor]), button:not(.case__open)").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-link"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-link"));
  });
}

// Case study drawers: native <dialog> for focus trapping, Esc and screen reader support
function initDrawers() {
  const cursor = document.querySelector(".cursor");
  let lastTrigger = null;

  const open = (dialog, trigger) => {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || null;
    cursor.classList.remove("is-big", "is-link");
    document.documentElement.classList.add("has-drawer");
    if (lenis) lenis.stop();
    dialog.scrollTop = 0;
    dialog.showModal();
    history.replaceState(null, "", "#" + dialog.id);
  };

  const close = (dialog) => {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    const finish = () => {
      dialog.classList.remove("is-closing");
      dialog.close();
      document.documentElement.classList.remove("has-drawer");
      if (lenis) lenis.start();
      history.replaceState(null, "", location.pathname + location.search);
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    };
    if (reduceMotion) return finish();
    dialog.classList.add("is-closing");
    dialog.addEventListener("animationend", finish, { once: true });
  };

  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => open(document.getElementById(btn.dataset.open), btn));
  });

  document.querySelectorAll("dialog.drawer").forEach((dialog) => {
    dialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => close(dialog)));
    // Esc: run the animated close instead of the instant default
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(dialog); });
    // Clicking the dimmed backdrop (the dialog element itself, outside its content) closes it
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(dialog); });
  });

  // Deep link: index.html#case-cwb opens that case study directly
  const fromHash = location.hash && document.querySelector(`dialog.drawer${CSS.escape(location.hash)}`);
  if (fromHash) {
    const trigger = document.querySelector(`[data-open="${fromHash.id}"]`);
    open(fromHash, trigger);
  }
}

function initMagnetic() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
  });
}
