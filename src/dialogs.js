import { motionEase, reducedMotion } from "./motion.js";

const transitions = new Map();
const closing = new Set();

export function showDialog(dialog) {
  transitions.get(dialog)?.cancel();
  closing.delete(dialog);
  dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector(".dialog-close")?.focus({ preventScroll: true });
  if (reducedMotion.matches) return;
  transitions.set(
    dialog,
    dialog.animate(
      [
        { opacity: 0, translate: "0 18px" },
        { opacity: 1, translate: "0 0" },
      ],
      { duration: 480, easing: motionEase() },
    ),
  );
}

export async function dismissDialog(dialog) {
  if (!dialog?.open || closing.has(dialog)) return;
  closing.add(dialog);
  transitions.get(dialog)?.cancel();
  if (!reducedMotion.matches) {
    const transition = dialog.animate(
      [
        { opacity: 1, translate: "0 0" },
        { opacity: 0, translate: "0 10px" },
      ],
      { duration: 200, easing: motionEase(), fill: "forwards" },
    );
    transitions.set(dialog, transition);
    await transition.finished.catch(() => {});
  }
  if (closing.has(dialog)) dialog.close();
}

for (const dialog of document.querySelectorAll("dialog")) {
  let pressedOutside = false;
  const outside = (event) => {
    const box = dialog.getBoundingClientRect();
    return (
      event.target === dialog &&
      (event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom)
    );
  };
  dialog.addEventListener("pointerdown", (event) => {
    pressedOutside = outside(event);
  });
  dialog.addEventListener("click", (event) => {
    if (pressedOutside && outside(event)) dismissDialog(dialog);
    pressedOutside = false;
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissDialog(dialog);
  });
  dialog.addEventListener("close", () => {
    transitions.get(dialog)?.cancel();
    transitions.delete(dialog);
    closing.delete(dialog);
    pressedOutside = false;
  });
}

reducedMotion.addEventListener("change", () => {
  if (!reducedMotion.matches) return;
  for (const [dialog, animation] of transitions) {
    animation.cancel();
    if (closing.has(dialog)) dialog.close();
  }
});
