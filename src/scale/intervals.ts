import type { NoteName, ScaleType } from './types.js';

/**
 * Mapping of note names to their semitone offset from C (0-11).
 */
export const NOTE_SEMITONES: Record<NoteName, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

/**
 * Array of all note names in chromatic order.
 */
export const NOTE_NAMES: NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * Scale intervals defined as semitone offsets from the root.
 * Each array contains the semitone steps that make up the scale.
 */
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/**
 * Roman numeral to scale degree mapping (1-indexed).
 */
export const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
};

/**
 * Semitone intervals for major scale degrees (used for chord resolution).
 */
export const MAJOR_SCALE_DEGREES: number[] = [0, 2, 4, 5, 7, 9, 11];
