/* Phone menu: under 760px the header links are hidden, so add a ☰ button that
   opens them as a drop-down. Desktop is untouched. Works on every page,
   including the home page (which has its own inline styles). */
(function () {
  var header = document.querySelector("header");
  var bar = header && header.querySelector(".nav");
  var links = bar && bar.querySelector("nav");
  if (!links) return;
  var css = document.createElement("style");
  css.textContent =
    ".mnav-btn,.mnav-cta{display:none}" +
    "@media(max-width:760px){" +
    ".mnav-btn{display:inline-flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;margin-left:10px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;cursor:pointer}" +
    ".nav .srch{display:none}" +
    ".nav{gap:12px!important}" +
    ".nav > .btn-primary{display:none!important}" +
    ".mnav-btn{margin-left:auto}" +
    "header.mnav-open .nav nav a.mnav-cta{margin-top:12px;padding:14px 18px;border:0;border-radius:10px;background:#e4012b;text-align:center;font-weight:700}" +
    "header.mnav-open .nav nav{display:flex!important;flex-direction:column;gap:0!important;position:absolute;left:0;right:0;top:100%;margin:0!important;padding:6px 22px 16px;background:#071a33;border-bottom:1px solid rgba(255,255,255,.14);box-shadow:0 18px 30px -12px rgba(0,0,0,.5);z-index:60}" +
    "header.mnav-open .nav nav a{display:block;padding:15px 0;font-size:17px!important;color:#fff!important;border-bottom:1px solid rgba(255,255,255,.08)}" +
    "header.mnav-open .nav nav a:nth-last-child(2){border-bottom:0}" +
    "}" +
    "@media(max-width:380px){.nav .wordmark small{display:none}}";
  document.head.appendChild(css);
  if (getComputedStyle(header).position === "static") header.style.position = "relative";
  if (!links.id) links.id = "site-menu";
  // The header's main button (Try the demo / Take a peek) moves into the menu on phones.
  var cta = bar.querySelector(":scope > .btn-primary");
  if (cta) {
    var copy = document.createElement("a");
    copy.href = cta.getAttribute("href");
    copy.className = "mnav-cta";
    copy.textContent = cta.textContent.replace(/\s+/g, " ").trim();
    links.appendChild(copy);
  }
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mnav-btn";
  btn.setAttribute("aria-label", "Menu");
  btn.setAttribute("aria-controls", links.id);
  btn.setAttribute("aria-expanded", "false");
  var ICON_OPEN = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  btn.innerHTML = ICON_OPEN;
  bar.appendChild(btn);
  function set(open) {
    header.classList.toggle("mnav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.innerHTML = open ? ICON_CLOSE : ICON_OPEN;
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); set(!header.classList.contains("mnav-open")); });
  links.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  document.addEventListener("click", function (e) { if (!header.contains(e.target)) set(false); });
})();
