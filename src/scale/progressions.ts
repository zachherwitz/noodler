/**
 * Predefined chord progressions for common musical styles.
 *
 * All progressions use roman numeral notation where uppercase indicates
 * major chords and lowercase indicates minor chords.
 *
 * @example
 * ```ts
 * import { PROGRESSIONS } from 'noodler/scale';
 *
 * const backing = new BackingTrack(ctx, {
 *   chords: PROGRESSIONS.BLUES_12_BAR,
 * });
 * ```
 */
export const PROGRESSIONS = {
  /** 12-bar blues progression */
  BLUES_12_BAR: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],

  /** Pop/rock four-chord progression (I-V-vi-IV) */
  POP_FOUR: ['I', 'V', 'vi', 'IV'],

  /** Jazz ii-V-I turnaround */
  JAZZ_251: ['ii', 'V', 'I'],

  /** 1950s doo-wop progression */
  FIFTIES: ['I', 'vi', 'IV', 'V'],

  /** Pachelbel's Canon progression */
  CANON: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],

  /** Basic rock progression */
  ROCK_BASIC: ['I', 'IV', 'V', 'IV'],

  /** Minor key natural progression (i-iv-v) */
  MINOR_NATURAL: ['i', 'iv', 'v'],

  /** Andalusian cadence (flamenco) */
  ANDALUSIAN: ['i', 'VII', 'VI', 'V'],
} as const;

/**
 * Names of available predefined progressions.
 */
export type ProgressionName = keyof typeof PROGRESSIONS;
