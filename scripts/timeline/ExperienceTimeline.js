import {
  EXPERIENCE_DURATION_SECONDS,
  FINAL_ACCELERATION_START_SECONDS,
  getTunnelRailDistance,
  getTunnelProfileAt,
  STAGES,
  TUNNEL_TRAVEL_DURATION_SECONDS,
  WHITE_ROOM_FADE_START_SECONDS,
} from "../core/config.js";
import { clamp, smoothstep } from "../utils/math.js";

/**
 * A deterministic master clock. The rail is steady until its final second,
 * when a continuous acceleration carries the visitor into the White Room.
 */
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
    const finalAccelerationProgress = clamp(
      (elapsed - FINAL_ACCELERATION_START_SECONDS)
        / (TUNNEL_TRAVEL_DURATION_SECONDS - FINAL_ACCELERATION_START_SECONDS),
      0,
      1,
    );
    const isFinalAcceleration = elapsed >= FINAL_ACCELERATION_START_SECONDS
      && elapsed < TUNNEL_TRAVEL_DURATION_SECONDS;
    const isWhiteRoom = elapsed >= TUNNEL_TRAVEL_DURATION_SECONDS;
    const whiteRoomElapsed = Math.max(0, elapsed - TUNNEL_TRAVEL_DURATION_SECONDS);
    const whiteFadeProgress = smoothstep(WHITE_ROOM_FADE_START_SECONDS, EXPERIENCE_DURATION_SECONDS, elapsed);
    const distance = getTunnelRailDistance(elapsed);

    if (elapsed >= EXPERIENCE_DURATION_SECONDS) this.finished = true;

    return Object.freeze({
      elapsed,
      normalized: elapsed / EXPERIENCE_DURATION_SECONDS,
      stage,
      stageProgress,
      distance,
      tunnelProfile: getTunnelProfileAt(distance),
      isFinalAcceleration,
      finalAccelerationProgress,
      isWhiteRoom,
      whiteRoomElapsed,
      whiteFadeProgress,
      isComplete: this.finished,
    });
  }
}
