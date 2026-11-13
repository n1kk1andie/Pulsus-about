/* Pulsus product pages: tabs, gentle reveals and the KRI explainer.
   Everything here is an enhancement. With no script the page shows every view
   in turn and every section at once. */
(function () {
  "use strict";
  var doc = document;

  // ── Tabs (WAI-ARIA tabs pattern, automatic activation) ──────────────────
  Array.prototype.forEach.call(doc.querySelectorAll("[role=tablist]"), function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=tab]"));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = doc.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      if (tab.scrollIntoView && list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: tab.offsetLeft - 20, behavior: "smooth" });
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t, false); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowDown" || k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        else if (k === "ArrowUp" || k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === "Home") n = tabs[0];
        else if (k === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    select(tabs[0], false);
  });

  // ── Phone menu: close once a link in it is followed ──────────────────────
  Array.prototype.forEach.call(doc.querySelectorAll("details.menu"), function (m) {
    m.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".sheet a")) m.open = false; });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && m.open) { m.open = false; m.querySelector("summary").focus(); } });
  });

  // ── Reveal on scroll ─────────────────────────────────────────────────────
  var items = doc.querySelectorAll(".rv");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduce) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  // ── KRI explainer (Risk) ─────────────────────────────────────────────────
  // A loss indicator, where lower is better: at or under target is on target,
  // then within limit, then below limit (past the limit, inside tolerance),
  // then breach. These are the bands and labels the product uses.
  var kri = doc.getElementById("kri");
  if (kri) {
    var input = kri.querySelector("input[type=range]");
    var out = kri.querySelector("[data-val]");
    var chip = kri.querySelector("[data-band]");
    var T = +kri.getAttribute("data-target"), L = +kri.getAttribute("data-limit"), X = +kri.getAttribute("data-tolerance");
    var BANDS = [
      { max: T, cls: "b-target", label: "On / Ahead of Target" },
      { max: L, cls: "b-limit", label: "Within Limit" },
      { max: X, cls: "b-tol", label: "Below Limit" },
      { max: Infinity, cls: "b-breach", label: "Breach" }
    ];
    var update = function () {
      var v = +input.value, b = BANDS.filter(function (x) { return v <= x.max; })[0];
      out.textContent = "$" + v.toLocaleString("en-US");
      chip.className = "bandchip " + b.cls;
      chip.textContent = b.label;
      input.setAttribute("aria-valuetext", "$" + v.toLocaleString("en-US") + ", " + b.label);
    };
    input.addEventListener("input", update);
    update();
  }
})();
