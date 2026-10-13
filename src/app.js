import { models, sampleBuilds, releases } from "./data.js";
import { replaceImage } from "./image-motion.js";
import { reducedMotion, revealContent } from "./motion.js";
import { showDialog, dismissDialog } from "./dialogs.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{ arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>', check: '<path d="m5 12 4 4L19 6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' }[name] || ""}</svg>`;
const arrow = icon("arrow");
const money = (n) =>
  n == null
    ? "Price not verified"
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(n);
const dateText = (s) =>
  new Date(s + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function load(key, fallback, validate) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
let favourites = load(
  "mechakeep-favourites",
  [],
  (v) => Array.isArray(v) && v.every((id) => models.some((m) => m.id === id)),
);
let userBuilds = load(
  "mechakeep-builds",
  [],
  (v) =>
    Array.isArray(v) &&
    v.every(
      (b) =>
        b &&
        typeof b.id === "string" &&
        typeof b.title === "string" &&
        typeof b.builder === "string" &&
        typeof b.description === "string" &&
        models.some((m) => m.id === b.model) &&
        /^data:image\/(jpeg|png|webp);base64,/.test(b.image),
    ),
);
let toastTimer,
  filterTimer,
  routeVersion = 0,
  previewImage = "";
const link = (text, href, cls = "text-link") =>
  `<a class="${cls}" href="#/${href}">${text}${arrow}</a>`;
const modelImage = (m, cls = "", eager = false) =>
  `<img class="${cls}" src="assets/${m.image}.webp" alt="${esc(m.name)} collectible" width="800" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
const heart = (id, full = false) =>
  `<button class="favourite ${favourites.includes(id) ? "is-saved" : ""} ${full ? "button favourite-full" : ""}" data-favourite="${id}" aria-pressed="${favourites.includes(id)}" aria-label="${favourites.includes(id) ? "Remove from" : "Add to"} favourites: ${esc(models.find((m) => m.id === id).name)}">${icon("heart")}${full ? `<span>${favourites.includes(id) ? "Saved to favourites" : "Add to favourites"}</span>` : ""}</button>`;
function toast(message) {
  const el = $("#toast");
  el.innerHTML = `${icon("check", 17)}<span>${esc(message)}</span>`;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3200);
}
function header(route) {
  $("#header").innerHTML =
    `<div class="nav-shell"><a class="brand" href="#/" aria-label="MechaKeep home"><img src="assets/mark.svg" width="29" height="29" alt=""/>MechaKeep<span class="brand-dot">.</span></a><nav aria-label="Main navigation" id="navigation">${[
      ["", "Home"],
      ["models", "Model Library"],
      ["builds", "Photography"],
      ["releases", "Releases"],
    ]
      .map(
        ([p, t]) =>
          `<a href="#/${p}" ${route === p ? 'aria-current="page"' : ""}>${t}</a>`,
      )
      .join(
        "",
      )}</nav><div class="nav-actions"><a class="nav-search" data-library-control="search" href="#/models?focus=search" aria-label="Search models" title="Search models">${icon("search", 17)}</a><a class="nav-search" data-library-control="filters" href="#/models?focus=filters" aria-label="Filter models" title="Filter models"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7h10m4 0h4M3 17h4m4 0h10"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></a><a class="collection-link" href="#/favourites" aria-label="My collection, ${favourites.length} favourites">${icon("heart", 18)}<span>My Collection</span><span class="collection-count">${favourites.length}</span></a><a class="button button-small nav-submit" href="#/submit">Share a build ${icon("plus", 15)}</a><button class="menu-toggle" aria-expanded="false" aria-controls="navigation" aria-label="Open navigation">${icon("menu")}</button></div></div>`;
}
function footer() {
  $("#footer").innerHTML =
    `<div class="container footer-top"><div><a class="brand" href="#/">MechaKeep<span class="brand-dot">.</span></a><p>Hot Toys, Pacific Rim and Gundam collectibles.</p></div><div class="footer-links"><span class="eyebrow">Explore</span><a href="#/models">Model Library</a><a href="#/builds">Photography</a><a href="#/releases">Releases</a></div><div class="footer-info"><span class="eyebrow">About</span><p>Explore the details. Save your favourites.<br>Original photography credits preserved.</p><a href="#/about">About MechaKeep ${icon("arrow", 14)}</a></div></div><div class="container footer-bottom"><span>© 2026 MechaKeep</span><span>Model information for reference only</span></div>`;
}
function modelCard(m, i = 0) {
  return `<article class="model-card reveal" style="--delay:${(i % 3) * 70}ms"><div class="model-image ${m.transparent ? "cutout" : ""} ${m.userPhoto ? "photo-model" : ""}"><a href="#/model/${m.id}" aria-label="View ${esc(m.name)}">${modelImage(m)}</a><span class="image-grade">${m.label === "Master Grade EX" ? "MGEX" : m.grade} <span>${m.scale}</span></span>${heart(m.id)}</div><div class="model-info"><p class="model-code">${m.code}</p><a href="#/model/${m.id}"><h3>${m.name}</h3></a><p>${m.label} <span>·</span> ${m.scale}</p><button type="button" class="flagship-text-link card-spec-trigger" data-open-spec="${m.id}">Gallery & specifications ${arrow}</button><div class="model-bottom"><span>${money(m.price)}</span>${link("View model", "model/" + m.id)}</div></div></article>`;
}
function buildCard(b, i = 0) {
  return `<button class="build-card ${b.sample ? "reference-photo-card" : ""} reveal build-${i % 3}" data-build="${esc(b.id)}" style="--delay:${i * 60}ms"><img src="${esc(b.image)}" alt="${esc(b.title)}" width="800" height="900" loading="lazy"/><span class="build-label">${b.sample ? "PHOTO COLLECTION" : "YOUR BUILD"}</span><span class="build-overlay"><span class="build-title">${esc(b.title)}</span><span class="build-author">${esc(b.builder)} <span>↗</span></span></span></button>`;
}
function photoTile(id, slot, eager = false) {
  const m = models.find((m) => m.id === id);
  const order =
    {
      "bento-iron": 0,
      "bento-cap": 1,
      "bento-spider": 2,
      "bento-thor": 3,
      "photo-wide": 0,
      "photo-tall": 1,
      "photo-medium": 2,
    }[slot] || 0;
  return `<article class="bento-tile photo-tile reveal ${slot}" style="--delay:${order * 95}ms">
    <a class="photo-stage" href="#/model/${m.id}" aria-label="View ${esc(m.name)}">${modelImage(m, "", eager)}</a>
    <div class="photo-tile-copy"><span class="eyebrow">HOT TOYS · ${m.scale}</span>
      <a href="#/model/${m.id}"><h2>${esc(m.name)}</h2></a>
      <span>${esc(m.series)}</span><span class="photo-tile-credit">Photography · ${esc(m.credit)}</span>
      <button type="button" class="flagship-text-link" data-open-spec="${m.id}">Gallery & specifications ${arrow}</button>
    </div></article>`;
}
function discovery() {
  const paths = [
    [
      "01",
      "Model Library",
      "Find your next centrepiece.",
      "Browse verified edition notes, scales and model photography.",
      "models",
      "Explore models",
    ],
    [
      "02",
      "Photography",
      "A different perspective.",
      "Explore collector photographs, then add a build of your own.",
      "builds",
      "View photography",
    ],
    [
      "03",
      "My Collection",
      "Keep what inspires you.",
      "Save favourites to a personal shortlist in this browser.",
      "favourites",
      "Open my collection",
    ],
    [
      "04",
      "Release Calendar",
      "Plan the next addition.",
      "Explore the prototype calendar with clearly marked example dates.",
      "releases",
      "View releases",
    ],
  ];
  return `<section class="container discovery-section" aria-labelledby="discovery-title">
    <div class="discovery-heading reveal"><div><p class="eyebrow">THE COLLECTOR'S DESK</p><h2 id="discovery-title">Where will you start?</h2><p>Discover a model. Study the details. Make it yours.</p></div>
    <form id="discovery-search" role="search"><label for="home-search">Find a figure or kit</label><div class="discovery-search-field">${icon("search", 18)}<input id="home-search" name="q" type="search" placeholder="Try Iron Man, Gundam or MMS783" maxlength="120"/><button class="button" type="submit">Search</button></div></form></div>
    <div class="discovery-categories reveal" aria-label="Explore collections">${["Hot Toys", "Pacific Rim", "Gundam"].map((category) => `<a href="#/models?category=${encodeURIComponent(category)}">${category}<span>${models.filter((m) => m.category === category).length} models</span>${arrow}</a>`).join("")}</div>
    <div class="row g-3 discovery-paths">${paths.map(([number, label, title, description, href, action], i) => `<div class="col-12 col-md-6"><a class="discovery-path reveal" style="--delay:${i * 65}ms" href="#/${href}"><div class="path-label"><span>${label}</span><span>${number}</span></div><h3>${title}</h3><p>${description}</p><span class="path-action">${action}${arrow}</span></a></div>`).join("")}</div>
  </section>`;
}
function spotlight() {
  const ids = ["gipsy-danger", "strike-freedom", "thor"];
  return `<section class="container spotlight-section" aria-labelledby="spotlight-title"><div class="section-heading reveal"><div><p class="eyebrow">THE EDITOR'S SELECTION</p><h2 id="spotlight-title">Beyond the armour.</h2><p class="section-subtitle">Three worlds. A closer look at each.</p></div>${link("Explore the model library", "models")}</div>
    <div class="spotlight-shell reveal" role="region" aria-roledescription="carousel" aria-label="Featured collectibles">
    ${ids
      .map((id, i) => {
        const m = models.find((m) => m.id === id);
        return `<article class="spotlight-slide" data-spotlight-slide="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${ids.length}" ${i ? "hidden" : ""}><div class="spotlight-copy"><p class="eyebrow">${esc(m.manufacturer)} / ${esc(m.label)}</p><h3>${esc(m.name)}</h3><p>${esc(m.description)}</p><dl><div><dt>${m.scale.includes("/") ? "Scale" : "Height"}</dt><dd>${esc(m.scale)}</dd></div><div><dt>Product code</dt><dd>${esc(m.code)}</dd></div></dl>${link("Explore this collectible", "model/" + id, "button")}</div><a class="spotlight-image" href="#/model/${id}" aria-label="View ${esc(m.name)}">${modelImage(m)}</a></article>`;
      })
      .join("")}
    <div class="spotlight-controls"><span id="spotlight-count" role="status" aria-live="polite">01 / 03 · Gipsy Danger</span><div><button type="button" data-spotlight-step="-1" aria-label="Previous collectible">${arrow}</button><button type="button" data-spotlight-step="1" aria-label="Next collectible">${arrow}</button></div></div></div></section>`;
}
function collectorGuide() {
  return `<section class="container collector-guide reveal" aria-labelledby="guide-title"><div><p class="eyebrow">BEFORE YOU EXPLORE</p><h2 id="guide-title">A little guidance.</h2><p>The essentials, in one place.</p>${link("About MechaKeep", "about")}</div><div class="guide-questions"><details><summary>How do I save a model?</summary><p>Open the Model Library and select a heart, or choose Add to favourites on a model page. Your selections appear in My Collection and stay in this browser.</p></details><details><summary>What does 1/6 scale mean?</summary><p>A 1/6 scale figure is approximately one sixth of its subject's full size. Model kits use other scales, such as 1/100. Check each model's specifications for its listed size.</p></details><details><summary>Can I share my own photography?</summary><p>Choose Share a build, add a photograph and select its model. Your build is saved locally on this device; it is not published to a public gallery.</p></details><details><summary>Are the prices and release dates live?</summary><p>No. Prices are illustrative references and the calendar uses example restock dates. Unverified prices are marked. Check the product references for edition information.</p></details></div></section>`;
}
function home() {
  const item = (id) => models.find((m) => m.id === id);
  return `<section class="flagship-hero" aria-labelledby="flagship-title"><div class="flagship-hero-inner container"><div class="flagship-copy reveal"><span class="flagship-label">HOT TOYS · MOVIE MASTERPIECE</span><h1 id="flagship-title">Iron Man.<br>The final armour.</h1><p>Mark LXXXV. Every contour, cast in red and gold.</p><div class="flagship-actions"><a class="button flagship-button" href="#/model/iron-man">Explore the model</a><button class="flagship-text-link" type="button" data-open-spec="iron-man">View technical specifications ${arrow}</button></div></div><div class="flagship-visual reveal" style="--delay:120ms">${modelImage(item("iron-man"), "flagship-image", true)}<span>Photography · ${esc(item("iron-man").credit)}</span></div></div></section>
  ${discovery()}
  <section class="industrial-features container" aria-labelledby="feature-title"><div class="section-heading reveal"><div><p class="eyebrow">ENGINEERED TO BE SEEN</p><h2 id="feature-title">From frame to finish.</h2></div><p class="feature-heading-note">Precision in every detail.</p></div><div class="industrial-grid"><article class="industrial-panel frame-panel reveal"><div class="industrial-panel-copy"><span class="eyebrow">MGEX · INNER FRAME</span><h3>Engineered<br>from within.</h3><p>Explore the inner frame and complete armour.</p></div><img id="frame-photo" src="assets/frame.webp" alt="Strike Freedom Gundam gold inner frame" width="1200" height="900" loading="lazy"/><div class="frame-controls" role="group" aria-label="View frame or armour"><button type="button" data-frame-view="frame" aria-pressed="true">Inner frame</button><button type="button" data-frame-view="freedom" aria-pressed="false">Full armour</button></div><a class="frame-detail-link" href="#/model/strike-freedom">Model details ${arrow}</a></article><a class="industrial-panel macro-panel reveal" style="--delay:90ms" href="#/model/iron-man-mk42"><div class="industrial-panel-copy"><span class="eyebrow">HOT TOYS · MARK XLII</span><h3>A closer look.<br>A finer finish.</h3><p>The metallic finish and layered armour of Mark XLII.</p></div><img src="assets/iron-man-mk42-action.webp" alt="Hot Toys Iron Man Mark XLII armour finish close-up" width="800" height="800" loading="lazy"/></a><div class="industrial-panel spec-panel reveal" style="--delay:160ms"><span class="eyebrow">MARK LXXXV / MMS528D30</span><h3>Small scale.<br>Remarkable detail.</h3><div class="industrial-stats"><div><strong>1/6</strong><span>Scale</span></div><div><strong>32.5 <small>cm</small></strong><span>Approx. height</span></div></div><button type="button" class="flagship-text-link" data-open-spec="iron-man">View all specifications ${arrow}</button></div></div></section>
  <section class="bento-home container" aria-label="Model collection"><div class="bento-grid">
 <div class="bento-intro reveal"><h2>Made to be seen.</h2><p class="intro-caption">Discover Hot Toys, Pacific Rim and Gundam.</p></div>
 ${photoTile("iron-man", "bento-iron", true)}
 ${photoTile("captain-america-stealth", "bento-cap", true)}
 ${photoTile("spider-man-brand-new-day", "bento-spider", true)}
 ${photoTile("moon-knight", "bento-thor", true)}
 <div class="bento-directory reveal" style="--delay:90ms"><h2>Browse collections</h2><a href="#/models?category=Hot%20Toys">Hot Toys <span>${models
   .filter((m) => m.category === "Hot Toys")
   .length.toString()
   .padStart(
     2,
     "0",
   )} →</span></a><a href="#/models?category=Pacific%20Rim">Pacific Rim <span>01 →</span></a><a href="#/models?category=Gundam">Gundam <span>06 →</span></a></div>
 </div><div class="bento-footline reveal"><span>Hot Toys · Pacific Rim · Gundam</span><a href="#/models">Explore all ${models.length} models →</a></div></section>
 <section class="container photography-section" id="featured"><div class="section-heading reveal"><div><h2>Collector photography.</h2><p class="section-subtitle">Iconic characters. Seen through a collector’s lens.</p></div>${link("View all photographs", "builds")}</div><div class="photo-feature-grid">${photoTile("scarlet-witch", "photo-wide")}${photoTile("iron-spider-2", "photo-tall")}${photoTile("iron-man-mk42", "photo-medium")}</div><p class="quiet-note">Collector-supplied photographs. Original watermarks and credits preserved.</p></section>
 ${spotlight()}
 <section class="container collector-notes reveal"><div><h2>Your favourites.<br>All in one place.</h2></div><div><p>See something you like? Save it to your collection, stored in this browser.</p>${link("View my collection", "favourites")}</div></section>
 <section class="container release-preview reveal"><div><h2>Releases</h2><p>Browse models and reference dates by month.</p>${link("View calendar", "releases")}</div><div class="release-preview-list">${releases
   .slice(1, 3)
   .map((r) => releaseRow(r, true))
   .join(
     "",
   )}<span class="quiet-note">Demo calendar · Illustrative dates only</span></div></section>${collectorGuide()}`;
}
function pageHeading(eyebrow, title, description, action = "") {
  return `<div class="page-heading container"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function library(saved = false) {
  return `${pageHeading(saved ? "A SPACE FOR YOUR FAVOURITES" : "THE NEXT ONE STARTS HERE", saved ? "Your collection." : "Model Library.", saved ? "The pieces that caught your eye. All in one place." : "Screen icons. Mechanical wonders. Find your next piece.")}<section class="container library-section"><div class="library-toolbar"><div class="pills" role="group" aria-label="Filter by collection">${["All", "Hot Toys", "Pacific Rim", "Gundam"].map((g, i) => `<button class="pill ${i === 0 ? "active" : ""}" data-grade="${g}" aria-pressed="${i === 0}">${g}</button>`).join("")}</div><div class="library-controls"><label class="search-box">${icon("search", 18)}<input type="search" id="model-search" placeholder="Find a figure or kit" aria-label="Search models" autocomplete="off"/></label><label class="sort-label"><span class="sr-only">Sort models</span><select id="model-sort"><option value="curated">Curated selection</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest releases</option><option value="name">Name: A–Z</option></select></label></div></div><div class="results-meta"><span id="result-count" role="status" aria-live="polite"></span><span>${saved ? "SAVED ON THIS DEVICE" : "EVERY GREAT BUILD STARTS WITH A LITTLE CURIOSITY"}</span></div><div class="model-grid filter-grid" id="model-results"></div><p class="quiet-note">${saved ? "Your favourites are stored in this browser." : "A curated prototype catalogue. Prices are illustrative references, not offers for sale."}</p></section>`;
}
function productGallery(m) {
  const images = m.gallery || [m.image];
  return `<div class="product-gallery"><div class="detail-image ${m.transparent ? "cutout" : ""} ${m.userPhoto ? "photo-detail" : ""}"><img id="product-main-photo" src="assets/${images[0]}.webp" alt="${esc(m.name)} · photograph 1 of ${images.length}" width="1080" height="1620" fetchpriority="high"/></div>${m.credit ? `<p class="photo-credit">Photography · ${esc(m.credit)} <span id="photo-count" aria-live="polite">1 / ${images.length}</span></p>` : ""}${images.length > 1 ? `<div class="photo-thumbnails" role="group" aria-label="Product photographs">${images.map((src, i) => `<button data-photo="${i}" data-photo-model="${m.id}" aria-pressed="${i === 0}" aria-label="View photograph ${i + 1} of ${images.length}"><img src="assets/${src}.webp" alt="" width="72" height="96" loading="lazy"/></button>`).join("")}</div>` : ""}</div>`;
}
function productReferences(m) {
  return m.references
    ? `<details class="product-references"><summary>Product references & edition notes</summary>${m.editionNote ? `<p>${esc(m.editionNote)}</p>` : ""}<p>Product specifications cross-checked against the following retailer listings:</p>${m.references.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)} ↗</a>`).join("")}</details>`
    : "";
}
function detail(id) {
  const m = models.find((m) => m.id === id);
  if (!m) return notFound();
  return `<div class="container breadcrumb"><a href="#/models">Model Library</a><span>/</span><span>${m.name}</span></div><section class="container detail-top">${productGallery(m)}<div class="detail-copy"><p class="eyebrow">${m.code} · ${m.manufacturer}</p><h1>${m.name}</h1><p class="detail-series">${m.series}</p>${m.character ? `<p class="character-line">${esc(m.character)}</p>` : ""}<div class="detail-tags"><span>${m.label}</span><span>${m.scale}${m.scale.includes("/") ? " scale" : " tall"}</span>${m.height ? `<span>Approx. ${m.height}</span>` : ""}</div>${m.price != null ? `<div class="detail-price">${money(m.price)}<span>Illustrative reference price</span></div>` : '<p class="price-unverified">Reference price not verified</p>'}<div class="release-meta"><span>${m.date ? "Original release" : "Product reference"}<strong>${m.date ? dateText(m.date) : m.code}</strong></span><span class="badge available">${m.date ? "Released" : "Catalogue item"}</span></div>${m.editionNote ? '<p class="edition-indicator">Edition details noted in the product references below.</p>' : ""}${heart(m.id, true)}<button type="button" class="flagship-text-link detail-spec-trigger" data-open-spec="${m.id}">Gallery & technical specifications ${arrow}</button><p class="detail-save-note">A little inspiration, saved for later.</p>${productReferences(m)}</div></section><section class="container detail-about reveal"><p class="eyebrow">ABOUT THIS COLLECTIBLE</p><h2>${m.note}</h2><p>${m.description}</p></section><section class="container detail-editorial reveal"><div class="editorial-image ${m.userPhoto ? "photo-editorial" : ""}">${m.id === "strike-freedom" ? '<img src="assets/frame.webp" alt="Strike Freedom gold inner frame" width="1200" height="900" loading="lazy"/>' : modelImage({ ...m, image: m.gallery?.[1] || m.image })}</div><div><p class="eyebrow">LOOK A LITTLE CLOSER</p><h2>Every piece.<br>Part of the story.</h2><p>${m.detail}</p>${m.credit ? `<p class="photo-credit">Photography · ${esc(m.credit)}</p>` : ""}${link("Show us your build", "submit?model=" + m.id)}</div></section><section class="section container"><div class="section-heading reveal"><div><p class="eyebrow">KEEP EXPLORING</p><h2>The next possibility.</h2></div>${link("All models", "models")}</div><div class="model-grid">${models
    .filter((n) => n.id !== m.id)
    .slice(0, 2)
    .map(modelCard)
    .join("")}</div></section>`;
}
function builds() {
  return `${pageHeading("THE ART OF MAKING IT YOURS", "Built. And worth sharing.", "Every build has a story. This is a space for yours.", link("Share a build", "submit", "button"))}<section class="container builds-section">${userBuilds.length ? `<div class="section-heading"><h2>Your workbench.</h2><span class="quiet-note">Saved on this device</span></div><div class="build-grid user-build-grid">${userBuilds.map(buildCard).join("")}</div>` : ""}<div class="builds-intro"><span class="eyebrow">A LITTLE INSPIRATION</span><span>Photo collection · Credits from the supplied photographs</span></div><div class="build-grid">${sampleBuilds.map(buildCard).join("")}</div><div class="build-invitation"><h2>There’s a place for your build.</h2><p>First kit or fiftieth. Straight build or full custom. Make it part of your story.</p>${link("Share what you made", "submit")}</div></section>`;
}
function submitPage(query) {
  const selected = new URLSearchParams(query).get("model");
  return `${pageHeading("FROM YOUR WORKBENCH, WITH PRIDE", "Make it part of the story.", "A few details. Your favourite photograph. A build worth keeping.")}<section class="container submit-layout"><form id="build-form"><label class="upload-zone" for="build-image">${icon("upload", 28)}<strong>Choose your best angle.</strong><span>Click to upload a photograph</span><small>JPG, PNG or WebP · up to 10 MB</small><input id="build-image" type="file" accept="image/jpeg,image/png,image/webp" required/><span id="upload-name"></span></label><div class="field"><label for="build-title">Build title <span>01</span></label><input id="build-title" name="title" maxlength="80" placeholder="Give your build a name" required/></div><div class="field-row"><div class="field"><label for="build-builder">Builder <span>02</span></label><input id="build-builder" name="builder" maxlength="40" placeholder="Your name or handle" required/></div><div class="field"><label for="build-model">Model <span>03</span></label><select id="build-model" name="model" required><option value="">Choose your collectible</option>${models.map((m) => `<option value="${m.id}" ${selected === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select></div></div><div class="field"><label for="build-description">The little details <span>OPTIONAL</span></label><textarea id="build-description" name="description" rows="3" maxlength="1000" placeholder="The finish, the inspiration, the part you’re proud of…"></textarea></div><p class="form-note">Your build is saved in this browser, on this device. It isn’t uploaded to a public community.</p><button class="button" type="submit" id="save-build">Save my build ${arrow}</button><p id="form-error" class="form-error" role="alert"></p></form><aside class="preview-panel"><div class="preview-heading"><span class="eyebrow">LIVE BUILD PREVIEW</span></div><div class="live-preview"><div class="preview-placeholder"><span>A little preview of what’s to come.</span></div><img id="preview-image" alt="Your uploaded build preview" hidden/><div class="preview-caption"><p id="preview-model">YOUR NEXT MASTERPIECE</p><h2 id="preview-title">Your build. Your story.</h2><span id="preview-builder">Made by you</span></div></div><p class="quiet-note">Watch your build come together as you add the details.</p></aside></section>`;
}
function releaseRow(r, compact = false) {
  const m = models.find((m) => m.id === r.model);
  const d = new Date(r.date + "T12:00:00");
  return `<a href="#/model/${m.id}" class="release-row ${compact ? "compact" : ""}"><div class="release-date"><span>${d.toLocaleDateString("en", { month: "short" }).toUpperCase()}</span><strong>${d.getDate().toString().padStart(2, "0")}</strong></div>${!compact ? `<div class="release-thumb">${modelImage(m)}</div>` : ""}<div class="release-name"><span class="badge ${r.status.toLowerCase()}">${r.status}</span><h3>${m.name}</h3><p>${m.label} · ${m.scale} <span>· ${r.type}</span></p></div><span class="release-arrow">${arrow}</span></a>`;
}
function releasePage() {
  return `${pageHeading("A LITTLE ANTICIPATION", "Good things. On the horizon.", "Keep an eye on what’s next. Make room for your next build.")}<section class="container release-section"><div class="calendar-top"><h2>2026<span>Release calendar</span></h2><div class="pills" role="group" aria-label="Filter releases"><button class="pill active" data-release="all" aria-pressed="true">All releases</button><button class="pill" data-release="Upcoming" aria-pressed="false">Upcoming</button><button class="pill" data-release="Available" aria-pressed="false">Available</button></div></div><p class="calendar-note">Prototype calendar — all dates below are illustrative restock dates, not official release announcements.</p><div id="release-results"></div></section>`;
}
function renderReleases(filter = "all") {
  const list = releases.filter((r) => filter === "all" || r.status === filter);
  $("#release-results").innerHTML = ["09", "10", "11"]
    .map((month) => {
      const items = list.filter((r) => r.date.slice(5, 7) === month);
      return items.length
        ? `<div class="timeline-group"><div class="timeline-month"><span class="timeline-dot"></span><h3>${new Date("2026-" + month + "-01T12:00:00").toLocaleDateString("en", { month: "long" })}</h3><span>${items.length} ${items.length === 1 ? "release" : "releases"}</span></div><div>${items.map((r) => releaseRow(r)).join("")}</div></div>`
        : "";
    })
    .join("");
}
function about() {
  return `${pageHeading("A NOTE ABOUT THIS SPACE", "Made for the love of building.", "MechaKeep is an independent web design prototype.")}<section class="container about-content"><h2>A collection tool, thoughtfully considered.</h2><p>Explore a small curated catalogue, save favourite kits, and document your builds. Favourites and build submissions are stored locally in your browser. There are no accounts, public uploads, purchases, or live stock notifications.</p><h2>Demo information.</h2><p>All prices are illustrative GBP references. The release tracker uses fictional 2026 restock dates to demonstrate the calendar. The photo collection includes 12 user-supplied photographs across seven Hot Toys subjects. Credits are transcribed from the images or filenames; these are not represented as uploads by their photographers. Unverified prices and release dates for these entries are left blank.</p><h2>Image credits.</h2><p>User-supplied photographs: B-L, 小宅的晚间播报, Y-N-T / yu_nai_tou, Jun_ / JUN, ALEX_模玩有品, and 森模都玩 / CLOCK IN. Original watermarks are retained. Additional product images: Strike Freedom photographs: <a href="https://en.gundam.info/content/mgex/strikefreedom/" target="_blank" rel="noopener noreferrer">GUNDAM.INFO / Bandai Spirits</a>. Hot Toys photographs: <a href="https://www.toysbuyingagent.com/" target="_blank" rel="noopener noreferrer">Toys Buying Agent</a>. Bandai and other model photographs: <a href="https://www.usagundamstore.com/" target="_blank" rel="noopener noreferrer">USA Gundam Store</a>. Images and associated trademarks belong to their respective owners and are included for this educational design prototype. MechaKeep is not affiliated with or endorsed by these organisations. Public or commercial reuse requires appropriate rights.</p><h2>Your data stays with you.</h2><p>Saved builds and favourites remain on this device. Clearing your browser’s site data removes them. You can remove individual favourites with the heart button and delete your builds from their detail view.</p>${link("Back to the library", "models")}</section>`;
}
function notFound() {
  return `${pageHeading("A PIECE OUT OF PLACE", "This one isn’t in the collection.", "The page or model you’re looking for could not be found.", link("Explore models", "models", "button"))}`;
}

let activeGrade = "All",
  isSavedPage = false;
function renderModels(animate = true) {
  const version = routeVersion;
  const target = $("#model-results");
  if (!target) return;
  const query = $("#model-search").value.trim().toLowerCase();
  const sort = $("#model-sort").value;
  let results = models.filter(
    (m) =>
      (!isSavedPage || favourites.includes(m.id)) &&
      (activeGrade === "All" || m.category === activeGrade) &&
      `${m.name} ${m.code} ${m.series} ${m.grade} ${m.label} ${m.manufacturer} ${m.category} ${m.cnName || ""} ${m.character || ""} ${m.keywords || ""}`
        .toLowerCase()
        .includes(query),
  );
  if (sort === "price-asc")
    results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (sort === "price-desc")
    results.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  if (sort === "newest")
    results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (sort === "name") results.sort((a, b) => a.name.localeCompare(b.name));
  clearTimeout(filterTimer);
  target.classList.toggle("is-filtering", animate && !reducedMotion.matches);
  const update = () => {
    if (version !== routeVersion) return;
    $("#result-count").textContent =
      `${results.length} ${results.length === 1 ? "model" : "models"} ${isSavedPage ? "in your collection" : "to discover"}`;
    target.innerHTML = results.length
      ? results.map(modelCard).join("")
      : `<div class="empty-state"><h2>${isSavedPage && !favourites.length ? "A little room for inspiration." : "No collectibles found. Yet."}</h2><p>${isSavedPage && !favourites.length ? "Save a collectible with the heart button to start your collection." : "Try another name, brand or collection. Your next piece is out there."}</p>${isSavedPage && !favourites.length ? link("Explore models", "models", "button") : '<button class="text-link" id="reset-filters">Reset filters ' + arrow + "</button>"}</div>`;
    target.classList.remove("is-filtering");
    reveal();
  };
  if (animate && !reducedMotion.matches) filterTimer = setTimeout(update, 180);
  else update();
}
function reveal() {
  revealContent();
}
function route() {
  if (location.hash === "#main" || location.hash === "#featured") return;
  routeVersion++;
  clearTimeout(filterTimer);
  const [path, query = ""] = (location.hash.slice(2) || "").split("?");
  const [page, id] = path.split("/");
  $("#build-dialog").close();
  $("#spec-dialog").close();
  document.body.classList.remove("menu-open");
  header(page === "model" ? "models" : page);
  footer();
  previewImage = "";
  activeGrade = "All";
  isSavedPage = page === "favourites";
  const renderers = {
    "": home,
    models: () => library(),
    favourites: () => library(true),
    model: () => detail(id),
    builds,
    submit: () => submitPage(query),
    releases: releasePage,
    about,
  };
  $("#main").innerHTML = (renderers[page] || notFound)();
  document.title = `${{ "": "Hot Toys & Mecha Collectibles", models: "Model Library", favourites: "My Collection", model: models.find((m) => m.id === id)?.name || "Model not found", builds: "Photography", submit: "Share a build", releases: "Releases", about: "About" }[page] || "Page not found"} — MechaKeep`;
  window.scrollTo({ top: 0, behavior: "instant" });
  if (page === "models" || page === "favourites") {
    const category = new URLSearchParams(query).get("category");
    if (["Hot Toys", "Pacific Rim", "Gundam"].includes(category))
      activeGrade = category;
    $$("[data-grade]").forEach((button) => {
      const active = button.dataset.grade === activeGrade;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("#model-search").value = new URLSearchParams(query).get("q") || "";
    renderModels(false);
  }
  if (page === "releases") renderReleases();
  if (page === "submit") setupForm();
  reveal();
  $("#main").focus({ preventScroll: true });
  if (page === "models") {
    const focus = new URLSearchParams(query).get("focus");
    if (focus === "search") $("#model-search")?.focus();
    if (focus === "filters") $("[data-grade].active")?.focus();
  }
}
function toggleFavourite(id) {
  const next = favourites.includes(id)
    ? favourites.filter((n) => n !== id)
    : [...favourites, id];
  try {
    localStorage.setItem("mechakeep-favourites", JSON.stringify(next));
  } catch {
    toast("Your browser could not save this favourite.");
    return;
  }
  favourites = next;
  const saved = favourites.includes(id);
  $$(`[data-favourite="${id}"]`).forEach((b) => {
    b.classList.toggle("is-saved", saved);
    b.classList.remove("heart-pop");
    void b.offsetWidth;
    b.classList.add("heart-pop");
    b.setAttribute("aria-pressed", String(saved));
    b.setAttribute(
      "aria-label",
      `${saved ? "Remove from" : "Add to"} favourites: ${models.find((m) => m.id === id).name}`,
    );
    if ($("span", b))
      $("span", b).textContent = saved
        ? "Saved to favourites"
        : "Add to favourites";
  });
  $(".collection-count").textContent = favourites.length;
  $(".collection-link").setAttribute(
    "aria-label",
    `My collection, ${favourites.length} favourites`,
  );
  toast(saved ? "Added to favourites" : "Removed from favourites");
  if (isSavedPage) renderModels();
}
function openBuild(id) {
  const b = [...userBuilds, ...sampleBuilds].find((b) => b.id === id);
  if (!b) return;
  const m = models.find((m) => m.id === b.model);
  const dialog = $("#build-dialog");
  dialog.innerHTML = `<button class="dialog-close" aria-label="Close build">${icon("close")}</button><img src="${esc(b.image)}" alt="${esc(b.title)}"/><div class="dialog-copy"><p class="eyebrow">${b.sample ? "PHOTO COLLECTION" : "YOUR WORKBENCH"}</p><h2 id="dialog-title">${esc(b.title)}</h2><p>By ${esc(b.builder)} · ${esc(m.name)}</p><p class="build-description">${esc(b.description)}</p>${link("Explore this collectible", "model/" + b.model)}${!b.sample ? `<button class="delete-build" data-delete="${esc(b.id)}">Delete this build</button>` : ""}</div>`;
  showDialog(dialog);
}
function openSpec(id) {
  const m = models.find((item) => item.id === id);
  if (!m) return;
  const images = m.gallery?.length ? m.gallery : [m.image];
  const dialog = $("#spec-dialog");
  dialog.innerHTML = `<button type="button" class="dialog-close" data-close-spec aria-label="Close specifications">${icon("close")}</button><div class="spec-dialog-layout"><div class="spec-dialog-gallery"><img id="spec-main-photo" src="assets/${images[0]}.webp" alt="${esc(m.name)} · View 1" width="800" height="900"/><p class="spec-photo-credit">${m.credit ? `Photography · ${esc(m.credit)}` : esc(m.manufacturer)}<span id="spec-photo-count" aria-live="polite">1 / ${images.length}</span></p><div class="spec-thumbnails" role="group" aria-label="Change model view">${images.map((src, index) => `<button type="button" data-spec-photo="${index}" aria-pressed="${index === 0}" aria-label="View ${index + 1}"><img src="assets/${src}.webp" alt="" width="72" height="72" loading="lazy"/></button>`).join("")}</div></div><div class="spec-dialog-copy"><p class="eyebrow">${esc(m.manufacturer)} / ${esc(m.code)}</p><h2 id="spec-dialog-title">${esc(m.name)}</h2><p>${esc(m.series)}</p><dl class="spec-list"><div><dt>Product code</dt><dd>${esc(m.code)}</dd></div><div><dt>${m.scale.includes("/") ? "Scale" : "Height"}</dt><dd>${esc(m.scale)}</dd></div>${m.height ? `<div><dt>Approx. height</dt><dd>${esc(m.height)}</dd></div>` : ""}<div><dt>Series</dt><dd>${esc(m.label)}</dd></div><div><dt>Manufacturer</dt><dd>${esc(m.manufacturer)}</dd></div></dl><p class="spec-note">${esc(m.detail)}</p>${productReferences(m)}<a class="button flagship-button" href="#/model/${m.id}">Explore this model</a></div></div>`;
  showDialog(dialog);
}
let uploadVersion = 0;
function setupForm() {
  const form = $("#build-form");
  function update() {
    $("#preview-title").textContent =
      $("#build-title").value.trim() || "Your build. Your story.";
    $("#preview-builder").textContent = $("#build-builder").value.trim()
      ? "Made by " + $("#build-builder").value.trim()
      : "Made by you";
    $("#preview-model").textContent =
      models.find((m) => m.id === $("#build-model").value)?.name ||
      "YOUR NEXT MASTERPIECE";
  }
  form.addEventListener("input", update);
  update();
  $("#build-image").addEventListener("change", async (e) => {
    const token = ++uploadVersion,
      version = routeVersion;
    const f = e.target.files[0];
    previewImage = "";
    $("#preview-image").hidden = true;
    $(".preview-placeholder").hidden = false;
    $("#upload-name").textContent = "";
    $("#form-error").textContent = "";
    if (!f) return;
    const fail = (msg) => {
      e.target.value = "";
      $("#form-error").textContent = msg;
    };
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size > 10 * 1024 * 1024
    ) {
      fail("Please choose a JPG, PNG or WebP image under 10 MB.");
      return;
    }
    $("#save-build").disabled = true;
    let bitmap;
    try {
      bitmap = await createImageBitmap(f);
      if (bitmap.width * bitmap.height > 60000000)
        throw new Error("Image too large");
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f5f7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (token !== uploadVersion || version !== routeVersion) return;
      previewImage = canvas.toDataURL("image/jpeg", 0.82);
      const image = $("#preview-image");
      image.src = previewImage;
      image.hidden = false;
      $(".preview-placeholder").hidden = true;
      $("#upload-name").textContent = f.name;
    } catch {
      if (token === uploadVersion && version === routeVersion)
        fail("This image could not be read. Please try another photograph.");
    } finally {
      bitmap?.close();
      if (token === uploadVersion && version === routeVersion)
        $("#save-build").disabled = false;
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#build-title").value.trim(),
      builder = $("#build-builder").value.trim(),
      model = $("#build-model").value;
    if (
      !title ||
      !builder ||
      !models.some((m) => m.id === model) ||
      !previewImage
    ) {
      $("#form-error").textContent =
        "Add a photograph, a title, your name, and a model to continue.";
      return;
    }
    const build = {
      id: crypto.randomUUID(),
      title,
      builder,
      model,
      image: previewImage,
      description: $("#build-description").value.trim(),
      sample: false,
    };
    try {
      localStorage.setItem(
        "mechakeep-builds",
        JSON.stringify([build, ...userBuilds]),
      );
      userBuilds.unshift(build);
      location.hash = "/builds";
      toast("Your build has a new home. Saved on this device.");
    } catch {
      $("#form-error").textContent =
        "Your browser storage is full or unavailable. Remove an older build or try a smaller image.";
    }
  });
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "discovery-search") return;
  e.preventDefault();
  const query = $("#home-search").value.trim();
  location.hash =
    "/models?" + new URLSearchParams({ q: query, focus: "search" });
});
document.addEventListener("click", async (e) => {
  const step = e.target.closest("[data-spotlight-step]");
  if (step) {
    const slides = $$("[data-spotlight-slide]");
    const current = slides.findIndex((slide) => !slide.hidden);
    const next =
      (current + Number(step.dataset.spotlightStep) + slides.length) %
      slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== next;
    });
    $("#spotlight-count").textContent =
      `${String(next + 1).padStart(2, "0")} / 03 · ${$("h3", slides[next]).textContent}`;
  }
  const dialogLink = e.target.closest('dialog a[href^="#/"]');
  if (dialogLink && location.hash === dialogLink.getAttribute("href")) {
    dismissDialog(dialogLink.closest("dialog"));
  }
  const libraryControl = e.target.closest("[data-library-control]");
  if (libraryControl && location.hash === libraryControl.getAttribute("href")) {
    e.preventDefault();
    const selector =
      libraryControl.dataset.libraryControl === "search"
        ? "#model-search"
        : "[data-grade].active";
    $(selector)?.focus();
    return;
  }
  const frameView = e.target.closest("[data-frame-view]");
  if (frameView) {
    const changed = await replaceImage(
      $("#frame-photo"),
      `assets/${frameView.dataset.frameView}.webp`,
      frameView.dataset.frameView === "frame"
        ? "Strike Freedom Gundam gold inner frame"
        : "Strike Freedom Gundam complete armour",
    );
    if (changed)
      $$("[data-frame-view]").forEach((button) =>
        button.setAttribute("aria-pressed", String(button === frameView)),
      );
    return;
  }
  const specTrigger = e.target.closest("[data-open-spec]");
  if (specTrigger) {
    openSpec(specTrigger.dataset.openSpec);
    return;
  }
  if (e.target.closest("[data-close-spec]")) {
    dismissDialog($("#spec-dialog"));
    return;
  }
  const specPhoto = e.target.closest("[data-spec-photo]");
  if (specPhoto) {
    const image = $("#spec-main-photo");
    const src = $("img", specPhoto).getAttribute("src");
    const changed = await replaceImage(
      image,
      src,
      `${$("#spec-dialog-title").textContent} · View ${Number(specPhoto.dataset.specPhoto) + 1}`,
    );
    if (changed && specPhoto.isConnected && $("#spec-dialog").open) {
      const buttons = $$("[data-spec-photo]");
      buttons.forEach((button) =>
        button.setAttribute("aria-pressed", String(button === specPhoto)),
      );
      $("#spec-photo-count").textContent =
        `${Number(specPhoto.dataset.specPhoto) + 1} / ${buttons.length}`;
    }
    return;
  }
  const photo = e.target.closest("[data-photo]");
  if (photo) {
    const m = models.find((m) => m.id === photo.dataset.photoModel);
    const index = Number(photo.dataset.photo);
    if (!m?.gallery?.[index]) return;
    const image = $("#product-main-photo");
    const changed = await replaceImage(
      image,
      `assets/${m.gallery[index]}.webp`,
      `${m.name} · photograph ${index + 1} of ${m.gallery.length}`,
    );
    if (!changed) return;
    $$("[data-photo]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === photo)),
    );
    if ($("#photo-count"))
      $("#photo-count").textContent = `${index + 1} / ${m.gallery.length}`;
    return;
  }

  const fav = e.target.closest("[data-favourite]");
  if (fav) {
    toggleFavourite(fav.dataset.favourite);
    return;
  }
  const grade = e.target.closest("[data-grade]");
  if (grade) {
    activeGrade = grade.dataset.grade;
    $$("[data-grade]").forEach((b) => {
      b.classList.toggle("active", b === grade);
      b.setAttribute("aria-pressed", String(b === grade));
    });
    renderModels();
  }
  if (e.target.closest("#reset-filters")) {
    activeGrade = "All";
    $("#model-search").value = "";
    $$("[data-grade]").forEach((b) => {
      b.classList.toggle("active", b.dataset.grade === "All");
      b.setAttribute("aria-pressed", String(b.dataset.grade === "All"));
    });
    renderModels();
  }
  const filter = e.target.closest("[data-release]");
  if (filter) {
    $$("[data-release]").forEach((b) => {
      b.classList.toggle("active", b === filter);
      b.setAttribute("aria-pressed", String(b === filter));
    });
    renderReleases(filter.dataset.release);
  }
  const build = e.target.closest("[data-build]");
  if (build) openBuild(build.dataset.build);
  if (e.target.closest(".dialog-close"))
    dismissDialog(e.target.closest("dialog"));
  const del = e.target.closest("[data-delete]");
  if (del) {
    if (del.dataset.confirm !== "true") {
      del.dataset.confirm = "true";
      del.textContent = "Confirm delete — this cannot be undone";
      return;
    }
    const next = userBuilds.filter((b) => b.id !== del.dataset.delete);
    try {
      localStorage.setItem("mechakeep-builds", JSON.stringify(next));
      userBuilds = next;
      $("#build-dialog").close();
      route();
      toast("Build removed from this device.");
    } catch {
      toast("Your browser could not remove this build.");
    }
  }
  if (e.target.closest(".menu-toggle")) {
    const isOpen = document.body.classList.toggle("menu-open");
    $(".menu-toggle").setAttribute("aria-expanded", String(isOpen));
    $(".menu-toggle").setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation",
    );
  }
  const anchor = e.target.closest('a[href="#featured"],a[href="#main"]');
  if (anchor) {
    e.preventDefault();
    const target = $(anchor.getAttribute("href"));
    target?.scrollIntoView({
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
    if (target?.id === "main") target.focus({ preventScroll: true });
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "model-search") renderModels();
});
document.addEventListener("change", (e) => {
  if (e.target.id === "model-sort") renderModels();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
    document.body.classList.remove("menu-open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
    $(".menu-toggle").focus();
  }
});
let scrollQueued = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      $("#header").classList.toggle("scrolled", scrollY > 24);
      scrollQueued = false;
    });
  },
  { passive: true },
);
window.addEventListener("hashchange", route);
window.addEventListener("storage", (e) => {
  if (e.key === "mechakeep-favourites") {
    favourites = load(
      e.key,
      [],
      (v) =>
        Array.isArray(v) && v.every((id) => models.some((m) => m.id === id)),
    );
    route();
  }
  if (e.key === "mechakeep-builds") {
    userBuilds = load(
      e.key,
      [],
      (v) =>
        Array.isArray(v) &&
        v.every(
          (b) =>
            b &&
            typeof b.title === "string" &&
            typeof b.builder === "string" &&
            typeof b.description === "string" &&
            models.some((m) => m.id === b.model) &&
            /^data:image\/(jpeg|png|webp);base64,/.test(b.image),
        ),
    );
    route();
  }
});
route();
