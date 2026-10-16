/* Published content only; no SDK, token, cookies, or frontend build required. */
(() => {
  "use strict";
  const config = window.SPATIUM_GALLERY_CONFIG;
  const grid = document.querySelector(".portfolio-grid");
  if (!grid || !config?.enabled) return;

  const query = `*[_type == "galleryProject" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]
    | order(displayOrder asc, _id asc) {
      _id, title, location, displayOrder,
      photographs[]{_key, alt, caption, "url": asset->url}
    }`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  grid.setAttribute("aria-busy", "true");
  grid.dataset.source = "loading";

  function imageUrl(value) {
    const url = new URL(value);
    const prefix = `/images/${config.projectId}/${config.dataset}/`;
    if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io" ||
        url.port || url.username || url.password || !url.pathname.startsWith(prefix)) {
      throw new Error("Unexpected gallery image URL");
    }
    return url.href;
  }

  function card(project) {
    if (!project || typeof project._id !== "string" || /^(drafts|versions)\./.test(project._id) ||
        typeof project.title !== "string" || !project.title.trim() ||
        typeof project.location !== "string" || !project.location.trim() ||
        !Number.isInteger(project.displayOrder) || project.displayOrder < 0 ||
        !Array.isArray(project.photographs) || !project.photographs.length) {
      throw new Error("Invalid gallery project");
    }
    const photos = project.photographs.map((photo) => {
      if (!photo || typeof photo.alt !== "string" || !photo.alt.trim() ||
          typeof photo.url !== "string" ||
          (photo.caption != null && typeof photo.caption !== "string")) {
        throw new Error("Invalid gallery photograph");
      }
      return {src: imageUrl(photo.url), alt: photo.alt, caption: photo.caption || ""};
    });
    const el = document.createElement("div");
    // Existing class names, structure, dimensions and CSS remain authoritative.
    el.className = "pf-card reveal";
    const frame = document.createElement("div");
    frame.className = "pf-img";
    const image = document.createElement("img");
    image.src = photos[0].src;
    image.alt = photos[0].alt;
    image.loading = "lazy";
    image.width = 800;
    image.height = 600;
    image.setAttribute("role", "button");
    image.tabIndex = 0;
    image.addEventListener("error", () => {
      if (frame.querySelector(".gallery-image-error")) return;
      // Keep the existing thumbnail button usable so other project photos remain reachable.
      frame.style.position = "relative";
      const message = document.createElement("p");
      message.className = "gallery-image-error";
      message.setAttribute("role", "status");
      message.textContent = "Fotografija trenutačno nije dostupna.";
      Object.assign(message.style, {position: "absolute", inset: "0", margin: "0", padding: "16px",
        display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none",
        background: "var(--paper-deep)"});
      frame.append(message);
    });
    // Keep structured metadata outside HTML attributes and HTML parsing.
    image.galleryPhotographs = photos;
    frame.append(image);
    const body = document.createElement("div");
    body.className = "pf-body";
    const tag = document.createElement("span");
    tag.className = "pf-tag";
    tag.textContent = project.location;
    const title = document.createElement("h3");
    title.textContent = project.title;
    body.append(tag, title);
    el.append(frame, body);
    return el;
  }

  async function load() {
    try {
      if (!/^[a-z0-9]+$/.test(config.projectId) || !/^[a-z0-9_-]+$/.test(config.dataset)) {
        throw new Error("Invalid gallery configuration");
      }
      // Direct API avoids CDN staleness after publishing/unpublishing.
      const url = new URL(`https://${config.projectId}.api.sanity.io/v${config.apiVersion}/data/query/${config.dataset}`);
      url.searchParams.set("query", query);
      url.searchParams.set("perspective", "published");
      const response = await fetch(url, {signal: controller.signal, credentials: "omit", cache: "no-store"});
      if (!response.ok) throw new Error(`Gallery API status ${response.status}`);
      const payload = await response.json();
      if (payload.error || !Array.isArray(payload.result)) throw new Error("Invalid gallery response");
      const fragment = document.createDocumentFragment();
      payload.result.forEach((project) => fragment.append(card(project)));
      // Do not detach an active lightbox's trigger or steal keyboard focus.
      const galleryActive = grid.contains(document.activeElement) ||
        document.getElementById("galleryModal")?.getAttribute("aria-hidden") === "false";
      if (payload.result.length && galleryActive) {
        grid.dataset.source = "static";
        return;
      }
      if (!payload.result.length && galleryActive) {
        if (document.getElementById("galleryModal")?.getAttribute("aria-hidden") === "false") {
          document.getElementById("closeGallery")?.click();
        }
        const heading = document.querySelector("#portfolio h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({preventScroll: true});
          heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), {once: true});
        }
      }
      // An authoritative empty result clears the gallery; it is not a failure.
      grid.replaceChildren(fragment);
      window.spatiumObserveGallery?.(grid);
      grid.dataset.source = "sanity";
    } catch (error) {
      // Leave original HTML and local assets intact on failure.
      grid.dataset.source = "fallback";
      console.warn("Gallery unavailable; using the local gallery.");
    } finally {
      clearTimeout(timeout);
      grid.removeAttribute("aria-busy");
    }
  }
  load();
})();
