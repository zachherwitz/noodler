import type { NoteName, ResolvedChord, RomanNumeral } from './types.js';
import {
  MAJOR_SCALE_DEGREES,
  NOTE_NAMES,
  NOTE_SEMITONES,
  ROMAN_TO_DEGREE,
} from './intervals.js';
import { noteToFrequency } from './generator.js';

/**
 * Checks if a roman numeral represents a major chord (uppercase).
 *
 * @param roman - Roman numeral string
 * @returns True if major, false if minor
 */
function isMajorChord(roman: string): boolean {
  return roman === roman.toUpperCase();
}

/**
 * Parses a chord symbol (e.g., 'Am', 'G', 'F#m') into its components.
 *
 * @param symbol - Chord symbol
 * @returns Object with root note and major/minor indicator, or null if invalid
 */
function parseChordSymbol(
  symbol: string
): { root: NoteName; isMajor: boolean } | null {
  const match = symbol.match(/^([A-G]#?)m?$/);
  if (!match) return null;

  const root = match[1] as NoteName;
  if (!(root in NOTE_SEMITONES)) return null;

  const isMajor = !symbol.endsWith('m');
  return { root, isMajor };
}

/**
 * Resolves a roman numeral or chord symbol to a chord in the given key.
 *
 * @param chord - Roman numeral (e.g., 'V', 'iv') or chord symbol (e.g., 'Am', 'G')
 * @param key - Key root note (used for roman numeral resolution)
 * @param octave - Octave for the chord root (default: 4)
 * @returns Resolved chord with root, quality, symbol, and frequency
 *
 * @example
 * resolveChord('V', 'A', 4); // { root: 'E', isMajor: true, symbol: 'E', frequency: 329.63 }
 * resolveChord('Am', 'C', 4); // { root: 'A', isMajor: false, symbol: 'Am', frequency: 440 }
 */
export function resolveChord(
  chord: RomanNumeral | string,
  key: NoteName,
  octave: number = 4
): ResolvedChord {
  const upperChord = chord.toUpperCase();
  const degree = ROMAN_TO_DEGREE[upperChord];

  if (degree !== undefined) {
    const keyIndex = NOTE_SEMITONES[key];
    const semitoneOffset = MAJOR_SCALE_DEGREES[degree - 1]!;
    const rootIndex = (keyIndex + semitoneOffset) % 12;
    const root = NOTE_NAMES[rootIndex] as NoteName;
    const isMajor = isMajorChord(chord);
    const symbol: string = isMajor ? root : `${root}m`;
    const frequency = noteToFrequency(root, octave);

    return { root, isMajor, symbol, frequency };
  }

  const parsed = parseChordSymbol(chord);
  if (parsed) {
    const symbol = parsed.isMajor ? parsed.root : `${parsed.root}m`;
    const frequency = noteToFrequency(parsed.root, octave);
    return { ...parsed, symbol, frequency };
  }

  throw new Error(`Invalid chord: ${chord}`);
}

/**
 * Resolves an array of chord symbols or roman numerals to chords.
 *
 * @param progression - Array of roman numerals or chord symbols
 * @param key - Key root note
 * @param octave - Octave for chord roots (default: 4)
 * @returns Array of resolved chords
 *
 * @example
 * resolveChordProgression(['I', 'IV', 'V', 'I'], 'G');
 * // [{ root: 'G', ... }, { root: 'C', ... }, { root: 'D', ... }, { root: 'G', ... }]
 */
export function resolveChordProgression(
  progression: (RomanNumeral | string)[],
  key: NoteName,
  octave: number = 4
): ResolvedChord[] {
  return progression.map((chord) => resolveChord(chord, key, octave));
}
