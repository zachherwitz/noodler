export type {
  NoteName,
  ScaleType,
  ScaleConfig,
  Note,
  GeneratedScale,
  RomanNumeral,
  ResolvedChord,
} from './types.js';

export {
  NOTE_SEMITONES,
  NOTE_NAMES,
  SCALE_INTERVALS,
  ROMAN_TO_DEGREE,
  MAJOR_SCALE_DEGREES,
} from './intervals.js';

export { noteToFrequency, generateScale } from './generator.js';

export { resolveChord, resolveChordProgression } from './chords.js';
