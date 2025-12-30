const revealItems = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.25 }
);

revealItems.forEach((item) => observer.observe(item));

const cinematicSection = document.querySelector(".scroll-cinematic");
let cinematicTicking = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateCinematic = () => {
  if (!cinematicSection) return;
  const rect = cinematicSection.getBoundingClientRect();
  const viewport = window.innerHeight || 0;
  const total = rect.height + viewport;
  const progress = total > 0 ? (viewport - rect.top) / total : 0;
  const clamped = clamp(progress, 0, 1);
  const phaseOne = clamp(clamped * 1.2, 0, 1);
  const phaseTwo = clamp((clamped - 0.25) * 1.35, 0, 1);
  const phaseThree = clamp((clamped - 0.55) * 1.4, 0, 1);
  cinematicSection.style.setProperty("--p", clamped.toFixed(3));
  cinematicSection.style.setProperty("--p1", phaseOne.toFixed(3));
  cinematicSection.style.setProperty("--p2", phaseTwo.toFixed(3));
  cinematicSection.style.setProperty("--p3", phaseThree.toFixed(3));
};

const onScroll = () => {
  if (cinematicTicking) return;
  cinematicTicking = true;
  window.requestAnimationFrame(() => {
    updateCinematic();
    cinematicTicking = false;
  });
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
updateCinematic();
