import {
  EXPERIENCE_DURATION_SECONDS,
  getConstantRailDistance,
  getTunnelProfileAt,
  STAGES,
  TUNNEL_CONFIG,
  TUNNEL_TRAVEL_DURATION_SECONDS,
  WHITE_ROOM_SUCTION_DURATION_SECONDS,
} from "../core/config.js";
import { clamp } from "../utils/math.js";

/**
 * A deterministic master clock. The rail uses a linear position function for
 * the whole tunnel, so the physical locomotion never accelerates or decelerates.
 * Only the deliberately brief White Room release exceeds that fixed velocity.
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
    const whiteTransitionProgress = clamp(
      (elapsed - TUNNEL_TRAVEL_DURATION_SECONDS) / WHITE_ROOM_SUCTION_DURATION_SECONDS,
      0,
      1,
    );
    const isWhiteTransition = elapsed >= TUNNEL_TRAVEL_DURATION_SECONDS && whiteTransitionProgress < 1;
    const isWhiteRoom = elapsed >= TUNNEL_TRAVEL_DURATION_SECONDS + WHITE_ROOM_SUCTION_DURATION_SECONDS;
    const suction = 1 - Math.pow(1 - whiteTransitionProgress, 4);
    const distance = isWhiteTransition || isWhiteRoom
      ? TUNNEL_CONFIG.length + TUNNEL_CONFIG.whiteRoomSuctionDistance * suction
      : getConstantRailDistance(elapsed);

    if (elapsed >= EXPERIENCE_DURATION_SECONDS) this.finished = true;

    return Object.freeze({
      elapsed,
      normalized: elapsed / EXPERIENCE_DURATION_SECONDS,
      stage,
      stageProgress,
      distance,
      tunnelProfile: getTunnelProfileAt(distance),
      isWhiteTransition,
      whiteTransitionProgress,
      isWhiteRoom,
      isComplete: this.finished,
    });
  }
}
