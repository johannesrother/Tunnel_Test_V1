import { clamp, lerp, smoothstep } from "../utils/math.js";

/** The authored runtime never drifts beyond this exact sixty-second score. */
export const EXPERIENCE_DURATION_SECONDS = 60;
export const TUNNEL_TRAVEL_DURATION_SECONDS = 55;
export const WHITE_ROOM_SUCTION_DURATION_SECONDS = 0.75;

export const STAGES = Object.freeze([
  { id: "calm", label: "CALM", start: 0, end: 8, fog: 0.012, light: 1.0, rhythm: 0.15 },
  { id: "unease", label: "UNEASE", start: 8, end: 18, fog: 0.018, light: 0.74, rhythm: 0.55 },
  { id: "compression", label: "COMPRESSION", start: 18, end: 29, fog: 0.029, light: 0.48, rhythm: 0.9 },
  { id: "acceleration", label: "ACCELERATION", start: 29, end: 40, fog: 0.038, light: 0.62, rhythm: 1.45 },
  { id: "peak", label: "PEAK", start: 40, end: 50, fog: 0.052, light: 0.86, rhythm: 2.4 },
  { id: "crawl", label: "CRAWL", start: 50, end: 55, fog: 0.065, light: 0.12, rhythm: 0.08 },
  { id: "white", label: "WHITE ROOM", start: 55, end: 60, fog: 0, light: 0, rhythm: 0 },
]);

/**
 * The complete shell is traversed at a constant 3.2 m/s. The eye line is the
 * profile centre, allowing the final 1.5 m diameter to surround the visitor
 * without clipping a tracked headset into the ceiling.
 */
export const TUNNEL_CONFIG = Object.freeze({
  length: 176,
  eyeLineHeight: 1.68,
  ringSpacing: 1.1,
  radialSegments: 40,
  displayInset: 0.035,
  displayAngularSpan: 0.34,
  whiteRoomSuctionDistance: 14,
});

/**
 * Diameter is deliberately authored rather than independently scaling width
 * and height. The rounded superellipse preserves an architectural floor/wall
 * transition while guaranteeing a continuous reduction from 3.5 m to 1.5 m.
 */
export const TUNNEL_PROFILE_ANCHORS = Object.freeze([
  { z: 0, diameter: 3.5, roundness: 2.42 },
  { z: 25.6, diameter: 3.38, roundness: 2.5 },
  { z: 57.6, diameter: 3.12, roundness: 2.62 },
  { z: 92.8, diameter: 2.82, roundness: 2.78 },
  { z: 128, diameter: 2.42, roundness: 2.98 },
  { z: 160, diameter: 1.9, roundness: 3.18 },
  { z: 176, diameter: 1.5, roundness: 3.34 },
]);

/** The sole source of truth for profile interpolation across all systems. */
export function getTunnelProfileAt(distance) {
  const clampedDistance = clamp(distance, 0, TUNNEL_CONFIG.length);
  const last = TUNNEL_PROFILE_ANCHORS.at(-1);
  if (clampedDistance >= last.z) return { ...last };

  for (let index = 0; index < TUNNEL_PROFILE_ANCHORS.length - 1; index += 1) {
    const from = TUNNEL_PROFILE_ANCHORS[index];
    const to = TUNNEL_PROFILE_ANCHORS[index + 1];
    if (clampedDistance <= to.z) {
      const progress = smoothstep(from.z, to.z, clampedDistance);
      return {
        z: clampedDistance,
        diameter: lerp(from.diameter, to.diameter, progress),
        roundness: lerp(from.roundness, to.roundness, progress),
      };
    }
  }
  return { ...last };
}

export function getConstantRailDistance(elapsedSeconds) {
  const travelProgress = clamp(elapsedSeconds / TUNNEL_TRAVEL_DURATION_SECONDS, 0, 1);
  return TUNNEL_CONFIG.length * travelProgress;
}

/**
 * Set either value to a relative MP4 path when production footage is ready.
 * Example: "./assets/videos/left-wall.mp4". Leave null for generated panels.
 */
export const VIDEO_SOURCES = Object.freeze({
  left: null,
  right: null,
});
