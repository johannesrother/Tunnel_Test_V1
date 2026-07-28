import { EXPERIENCE_DURATION_SECONDS, STAGES } from "../core/config.js";
import { clamp, easeInOutCubic } from "../utils/math.js";

/** A deterministic master clock. Every system consumes this same frame state. */
export class ExperienceTimeline {
  constructor() {
    this.startedAt = null;
    this.finished = false;
  }

  start(nowMilliseconds = performance.now()) {
    this.startedAt = nowMilliseconds;
    this.finished = false;
  }

  getFrame(nowMilliseconds = performance.now()) {
    const elapsed = this.startedAt === null
      ? 0
      : clamp((nowMilliseconds - this.startedAt) / 1000, 0, EXPERIENCE_DURATION_SECONDS);
    const stage = STAGES.find((candidate) => elapsed >= candidate.start && elapsed < candidate.end) || STAGES.at(-1);
    const stageProgress = clamp((elapsed - stage.start) / (stage.end - stage.start), 0, 1);
    const railProgress = easeInOutCubic(stageProgress);
    const distance = stage.railStart + (stage.railEnd - stage.railStart) * railProgress;

    if (elapsed >= EXPERIENCE_DURATION_SECONDS) this.finished = true;

    return Object.freeze({
      elapsed,
      normalized: elapsed / EXPERIENCE_DURATION_SECONDS,
      stage,
      stageProgress,
      distance,
      isWhiteRoom: stage.id === "white",
      isComplete: this.finished,
    });
  }
}
