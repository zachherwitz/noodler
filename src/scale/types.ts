/**
 * All 12 chromatic note names in Western music.
 */
export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

/**
 * Supported scale types.
 */
export type ScaleType =
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'mixolydian';

/**
 * Configuration for generating a scale.
 */
export interface ScaleConfig {
  /** Root note of the scale */
  root: NoteName;
  /** Type of scale to generate */
  type: ScaleType;
  /** Starting octave (default: 4) */
  octave?: number;
}

/**
 * A single note with its frequency and position.
 */
export interface Note {
  /** Note name (e.g., 'A4', 'C#5') */
  name: string;
  /** Frequency in Hz */
  frequency: number;
  /** Index in the generated scale (0-based) */
  index: number;
}

/**
 * Result of generating a scale.
 */
export interface GeneratedScale {
  /** Array of notes in the scale */
  notes: Note[];
  /** Root note name */
  root: NoteName;
  /** Scale type */
  type: ScaleType;
  /** Number of notes in the scale */
  noteCount: number;
}

/**
 * Roman numeral chord notation (uppercase = major, lowercase = minor).
 */
export type RomanNumeral =
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI'
  | 'VII'
  | 'i'
  | 'ii'
  | 'iii'
  | 'iv'
  | 'v'
  | 'vi'
  | 'vii';

/**
 * A resolved chord from roman numeral notation.
 */
export interface ResolvedChord {
  /** Root note name */
  root: NoteName;
  /** Whether the chord is major (true) or minor (false) */
  isMajor: boolean;
  /** Chord symbol (e.g., 'Am', 'G') */
  symbol: string;
  /** Frequency of the root note in Hz */
  frequency: number;
}
