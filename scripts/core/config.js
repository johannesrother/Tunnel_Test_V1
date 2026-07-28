/**
 * Central authored values. Keep timing, spatial progression, and media sources
 * here so the experience remains a single coherent score.
 */
export const EXPERIENCE_DURATION_SECONDS = 60;

export const STAGES = Object.freeze([
  { id: "calm", label: "CALM", start: 0, end: 8, railStart: 0, railEnd: 18, fog: 0.012, light: 1.0, rhythm: 0.15 },
  { id: "unease", label: "UNEASE", start: 8, end: 18, railStart: 18, railEnd: 49, fog: 0.018, light: 0.74, rhythm: 0.55 },
  { id: "compression", label: "COMPRESSION", start: 18, end: 29, railStart: 49, railEnd: 88, fog: 0.029, light: 0.48, rhythm: 0.9 },
  { id: "acceleration", label: "ACCELERATION", start: 29, end: 40, railStart: 88, railEnd: 143, fog: 0.038, light: 0.62, rhythm: 1.45 },
  { id: "peak", label: "PEAK", start: 40, end: 50, railStart: 143, railEnd: 181, fog: 0.052, light: 0.86, rhythm: 2.4 },
  { id: "crawl", label: "CRAWL", start: 50, end: 55, railStart: 181, railEnd: 192, fog: 0.065, light: 0.12, rhythm: 0.08 },
  { id: "white", label: "WHITE ROOM", start: 55, end: 60, railStart: 192, railEnd: 192, fog: 0, light: 0, rhythm: 0 },
]);

/**
 * Longitudinal anchors for the one-piece loft. Width and height are interior
 * metres. `roundness` controls a superellipse: higher values soften the
 * floor/wall/ceiling transition without creating a circular tube.
 */
export const TUNNEL_PROFILE_ANCHORS = Object.freeze([
  { z: 0, width: 8.0, height: 6.0, roundness: 2.45 },
  { z: 18, width: 8.0, height: 6.0, roundness: 2.45 },
  { z: 49, width: 7.2, height: 5.5, roundness: 2.62 },
  { z: 88, width: 6.0, height: 4.8, roundness: 2.82 },
  { z: 143, width: 5.0, height: 4.0, roundness: 3.04 },
  { z: 181, width: 3.8, height: 3.2, roundness: 3.22 },
  { z: 192, width: 3.0, height: 2.8, roundness: 3.36 },
]);

export const TUNNEL_CONFIG = Object.freeze({
  length: 192,
  ringSpacing: 1.5,
  radialSegments: 32,
  displayInset: 0.035,
  displayAngularSpan: 0.34,
});

/**
 * Set either value to a relative MP4 path when production footage is ready.
 * Example: "./assets/videos/left-wall.mp4". Leave null for generated panels.
 */
export const VIDEO_SOURCES = Object.freeze({
  left: null,
  right: null,
});
