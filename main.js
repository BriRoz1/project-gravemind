// Project Gravemind - site script (pages built by tools/web_pages.py): language switch, background video, screenshot
// viewer, reveal on scroll.

(function () {
  const root = document.documentElement;
  root.classList.add("js"); // .reveal sections start hidden only when this script runs

  // language: ?lang=en|es (links, previews), else the saved choice, else the browser's (Spanish or English)
  let lang = "";
  try { lang = new URLSearchParams(location.search).get("lang") || ""; } catch (e) { lang = ""; }
  if (lang !== "en" && lang !== "es") { try { lang = localStorage.getItem("lang") || ""; } catch (e) { lang = ""; } }
  if (lang !== "en" && lang !== "es") lang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const setLang = (l, save) => {
    root.dataset.lang = l;
    root.lang = l;
    document.querySelectorAll("[data-set-lang]").forEach((b) => {
      b.classList.toggle("on", b.dataset.setLang === l);
      b.setAttribute("aria-pressed", b.dataset.setLang === l ? "true" : "false");
    });
    if (save) { try { localStorage.setItem("lang", l); } catch (e) { /* private mode */ } }
  };
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.setLang, true)));
  setLang(lang, true);

  // the moving background: the launcher's menu flyover. Only on wide screens, without reduced motion or data saver;
  // everyone else keeps the still poster (the .bg element's own background).
  const video = document.querySelector(".bg video");
  if (video) {
    const conn = navigator.connection || {};
    const still = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || conn.saveData ||
      /(^|-)2g$/.test(conn.effectiveType || "") || window.innerWidth < 760;
    if (!still) {
      [["media/hero.webm", "video/webm"], ["media/hero.mp4", "video/mp4"]].forEach(([src, type]) => {
        const s = document.createElement("source"); s.src = src; s.type = type; video.appendChild(s);
      });
      video.addEventListener("playing", () => video.classList.add("ready"), { once: true });
      video.load();
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* autoplay refused: the poster stays */ });
      // pause while the tab is hidden
      document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); else video.play().catch(() => {}); });
    } else {
      video.remove();
    }
  }

  // the home page's background dims once the hero is scrolled past
  if (document.body.classList.contains("home")) {
    const hero = document.querySelector(".hero");
    const onScroll = () => document.body.classList.toggle("scrolled", window.scrollY > (hero ? hero.offsetHeight * 0.6 : 400));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // screenshots open full size
  const viewer = document.getElementById("viewer");
  if (viewer) {
    const big = viewer.querySelector("img");
    let opener = null;
    const close = () => { if (!viewer.classList.contains("open")) return; viewer.classList.remove("open"); if (opener) opener.focus(); };
    document.querySelectorAll(".shot button").forEach((b) => b.addEventListener("click", () => {
      const img = b.querySelector("img");
      opener = b; big.src = img.src; big.alt = img.alt; viewer.classList.add("open"); viewer.focus();
    }));
    viewer.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  // sections slide in as they come into view
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: 0.06, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => {
      // what is already on screen shows at once
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in"); else io.observe(el);
    });
  } else {
    items.forEach((el) => el.classList.add("in"));
  }
})();
