// One image lifecycle for routes, filters, dialogs and uploaded previews.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const states = new WeakMap();
const replacements = new WeakMap();

function finish(image, state) {
  state.animation?.cancel();
  image.classList.remove("image-pending");
}

const viewport = new IntersectionObserver(
  (entries) => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const image = entry.target;
      const state = states.get(image);
      viewport.unobserve(image);
      const delay = Math.min(order++ * 65, 195);
      // Decode first so slow connections never use up the reveal on an empty box.
      image
        .decode()
        .catch(() => {})
        .then(() => {
          if (states.get(image) !== state || !image.isConnected) return;
          image.classList.remove("image-pending");
          if (preference.matches || !image.naturalWidth) return;
          const distance =
            getComputedStyle(image).getPropertyValue("--image-travel").trim() ||
            "24px";
          state.animation = image.animate(
            [
              { opacity: 0, translate: `0 ${distance}` },
              { opacity: 1, translate: "0 0" },
            ],
            {
              duration: 950,
              delay,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "backwards",
            },
          );
        });
    }
  },
  { threshold: 0, rootMargin: "0px 0px -24px 0px" },
);

function prepare(image) {
  const previous = states.get(image);
  if (previous) finish(image, previous);
  viewport.unobserve(image);
  const state = {};
  states.set(image, state);
  if (!image.getAttribute("src") || image.hidden || preference.matches) return;
  image.classList.add("image-pending");
  viewport.observe(image);
}

function imagesIn(node) {
  if (!(node instanceof Element)) return [];
  return [
    ...(node.matches("img") ? [node] : []),
    ...node.querySelectorAll("img"),
  ];
}

new MutationObserver((records) => {
  const changed = new Set();
  for (const record of records) {
    if (record.type === "attributes" && record.target.matches("img"))
      changed.add(record.target);
    for (const node of record.addedNodes)
      imagesIn(node).forEach((image) => changed.add(image));
    for (const node of record.removedNodes) {
      for (const image of imagesIn(node)) {
        if (image.isConnected) continue;
        viewport.unobserve(image);
        const state = states.get(image);
        if (state) finish(image, state);
        states.delete(image);
      }
    }
  }
  changed.forEach((image) => {
    if (image.isConnected) prepare(image);
  });
}).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src", "hidden"],
});

document.querySelectorAll("img").forEach(prepare);
preference.addEventListener("change", () => {
  if (!preference.matches) return;
  viewport.disconnect();
  document.querySelectorAll("img").forEach((image) => {
    const state = states.get(image);
    if (state) finish(image, state);
  });
});

export async function replaceImage(image, src, alt) {
  const request = {};
  replacements.set(image, request);
  const previous = states.get(image);
  if (previous) finish(image, previous);
  const current = () =>
    replacements.get(image) === request && image.isConnected;
  if (image.getAttribute("src") === src) {
    return true;
  }
  // Keep the previous photograph visible while the next one downloads.
  const next = new Image();
  next.src = src;
  try {
    await next.decode();
  } catch {
    return false;
  }
  if (!current()) return false;
  if (!preference.matches) {
    const state = states.get(image);
    if (state) finish(image, state);
    const fade = image.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 160,
      easing: "ease-out",
      fill: "forwards",
    });
    if (state) state.animation = fade;
    await fade.finished.catch(() => {});
    if (!current()) return false;
  }
  image.src = src;
  image.alt = alt;
  return true;
}
