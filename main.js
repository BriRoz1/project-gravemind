// Project Gravemind - site script (pages built by tools/web_pages.py): language switch, screenshot viewer, reveal.

(function () {
  // language: saved choice, else the browser's (Spanish or English)
  const root = document.documentElement;
  let lang = "en";
  try { lang = localStorage.getItem("lang") || ""; } catch (e) { lang = ""; }
  if (lang !== "en" && lang !== "es") lang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const setLang = (l) => {
    root.dataset.lang = l;
    root.lang = l;
    document.querySelectorAll("[data-set-lang]").forEach((b) => b.classList.toggle("on", b.dataset.setLang === l));
    try { localStorage.setItem("lang", l); } catch (e) { /* private mode */ }
  };
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.setLang)));
  setLang(lang);

  // screenshots open full size
  const viewer = document.getElementById("viewer");
  const big = viewer.querySelector("img");
  document.querySelectorAll(".shot img").forEach((img) =>
    img.addEventListener("click", () => { big.src = img.src; big.alt = img.alt; viewer.classList.add("open"); }));
  viewer.addEventListener("click", () => viewer.classList.remove("open"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") viewer.classList.remove("open"); });

  // sections slide in as they come into view
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }
})();
