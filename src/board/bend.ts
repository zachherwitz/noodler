import type { BendMode } from './types.js';

/**
 * Number of pixels that represents one octave of pitch bend.
 */
export const PIXELS_PER_OCTAVE = 150;

/**
 * Number of cents in one octave.
 */
export const CENTS_PER_OCTAVE = 1200;

/**
 * Maximum octave offset (±1 octave).
 */
export const MAX_OCTAVE_OFFSET = 1;

/**
 * Pixel threshold for direct mode state changes.
 */
export const DIRECT_THRESHOLD_PX = 50;

/**
 * Pentatonic scale intervals in cents for stepped mode.
 * Represents: -P5, -M3, -M2, unison, M2, M3, P5
 */
export const STEPPED_INTERVALS = [-700, -400, -200, 0, 200, 400, 700];

/**
 * Converts an X offset in pixels to pitch bend in cents based on the bend mode.
 *
 * @param xOffset - Horizontal offset from the initial touch position in pixels
 * @param mode - The bend mode to use
 * @returns Pitch bend in cents
 *
 * @example
 * // Dynamic mode: continuous bend
 * xOffsetToCents(75, 'dynamic');  // 600 cents (half octave)
 * xOffsetToCents(-150, 'dynamic'); // -1200 cents (octave down)
 *
 * @example
 * // Direct mode: 3-state toggle
 * xOffsetToCents(-60, 'direct');  // -1200 cents (octave down)
 * xOffsetToCents(0, 'direct');    // 0 cents (original)
 * xOffsetToCents(60, 'direct');   // 1200 cents (octave up)
 *
 * @example
 * // Stepped mode: snaps to scale intervals
 * xOffsetToCents(30, 'stepped');  // 200 cents (nearest interval)
 */
export function xOffsetToCents(xOffset: number, mode: BendMode): number {
  switch (mode) {
    case 'dynamic':
      return dynamicBend(xOffset);
    case 'direct':
      return directBend(xOffset);
    case 'stepped':
      return steppedBend(xOffset);
    default:
      return 0;
  }
}

/**
 * Dynamic bend: continuous pitch bend clamped to ±1 octave.
 */
function dynamicBend(xOffset: number): number {
  const maxCents = MAX_OCTAVE_OFFSET * CENTS_PER_OCTAVE;
  const cents = (xOffset / PIXELS_PER_OCTAVE) * CENTS_PER_OCTAVE;
  return Math.round(Math.max(-maxCents, Math.min(maxCents, cents)));
}

/**
 * Direct bend: 3 discrete states based on threshold.
 */
function directBend(xOffset: number): number {
  if (xOffset < -DIRECT_THRESHOLD_PX) {
    return -CENTS_PER_OCTAVE;
  }
  if (xOffset > DIRECT_THRESHOLD_PX) {
    return CENTS_PER_OCTAVE;
  }
  return 0;
}

/**
 * Stepped bend: snaps to nearest pentatonic interval.
 */
function steppedBend(xOffset: number): number {
  const normalized = xOffset / PIXELS_PER_OCTAVE;
  const targetCents = normalized * CENTS_PER_OCTAVE;
  const clampedCents = Math.max(
    -MAX_OCTAVE_OFFSET * CENTS_PER_OCTAVE,
    Math.min(MAX_OCTAVE_OFFSET * CENTS_PER_OCTAVE, targetCents)
  );

  let closest = STEPPED_INTERVALS[0]!;
  let minDiff = Math.abs(clampedCents - closest);

  for (let i = 1; i < STEPPED_INTERVALS.length; i++) {
    const interval = STEPPED_INTERVALS[i]!;
    const diff = Math.abs(clampedCents - interval);
    if (diff < minDiff) {
      minDiff = diff;
      closest = interval;
    }
  }

  return closest;
}
