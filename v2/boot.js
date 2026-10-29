// Runs in <head> before first paint: lets CSS know JS is available (kept external so the CSP needs no inline scripts)
document.documentElement.classList.add("js");
