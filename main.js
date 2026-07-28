import { ExperienceApp } from "./scripts/core/ExperienceApp.js";

const canvas = document.querySelector("#experience-canvas");
const entry = document.querySelector("#entry-gate");
const beginButton = document.querySelector("#begin-button");
const ending = document.querySelector("#ending");
const app = new ExperienceApp(
  canvas,
  () => ending.classList.add("is-visible"),
  (progress) => { ending.style.opacity = progress.toFixed(3); },
);
const initialization = app.initialize();

beginButton.addEventListener("click", async () => {
  beginButton.disabled = true;
  beginButton.textContent = "ENTERING";
  try {
    const starting = app.begin();
    entry.classList.add("is-hidden");
    await starting;
  } catch (error) {
    console.error(error);
    beginButton.textContent = "UNAVAILABLE";
  }
});

initialization.then(
  () => {
    beginButton.disabled = false;
    beginButton.textContent = "BEGIN";
  },
  (error) => {
    console.error(error);
    beginButton.disabled = true;
    beginButton.textContent = "UNAVAILABLE";
  },
);
