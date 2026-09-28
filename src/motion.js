// Shared timing for CSS, image transitions and native dialogs.
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const motionEase = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--motion")
    .trim() || "cubic-bezier(0.16, 1, 0.3, 1)";

let observer;
export function revealContent(root = document) {
  observer?.disconnect();
  const pending = root.querySelectorAll(".reveal:not(.is-visible)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    pending.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  observer = new IntersectionObserver(
    (entries, current) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add("is-visible");
        current.unobserve(target);
      }
    },
    { threshold: 0, rootMargin: "0px 0px -24px 0px" },
  );
  pending.forEach((element) => observer.observe(element));
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) revealContent();
});
