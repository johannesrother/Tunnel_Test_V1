export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function smoothstep(edge0, edge1, value) {
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

export function easeInOutCubic(value) {
  const clamped = clamp(value, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

export function signedPower(value, exponent) {
  return Math.sign(value) * Math.pow(Math.abs(value), exponent);
}
