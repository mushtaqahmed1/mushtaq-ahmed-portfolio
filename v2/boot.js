// Runs in <head> before first paint: lets CSS know JS is available (kept external so the CSP needs no inline scripts)
document.documentElement.classList.add("js");

// Clickjacking guard: the host can't send X-Frame-Options / frame-ancestors from a static file,
// so refuse to render inside another site's frame and break out to the top window instead.
if (window.self !== window.top) {
  document.documentElement.style.display = "none";
  try { window.top.location = window.self.location.href; } catch (e) {}
}
