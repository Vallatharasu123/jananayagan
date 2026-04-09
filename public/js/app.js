(function () {
  const routeToSection = {
    "/": "hero",
    "/home": "hero",
    "/movie": "hero",
    "/synopsis": "synopsis",
    "/cast": "cast",
    "/gallery": "gallery",
    "/screenshots": "gallery",
    "/downloads": "downloads",
    "/reviews": "reviews",
    "/comments": "reviews",
    "/explore": "explore",
    "/banners": "ad-images",
    "/advertisement": "ad-images",
  };

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const header = document.querySelector(".site-header");
    const offset = header ? header.offsetHeight + 12 : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function applyRoute(pathname) {
    const p = pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
    const id = routeToSection[p] || "hero";
    requestAnimationFrame(() => scrollToId(id));
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyRoute(window.location.pathname);

    document.querySelectorAll("[data-route]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (!href || !href.startsWith("/")) return;
        e.preventDefault();
        window.history.pushState({}, "", href);
        applyRoute(href);
      });
    });
  });

  window.addEventListener("popstate", () => {
    applyRoute(window.location.pathname);
  });
})();
