import type { GeneratedScale, Note, NoteName, ScaleConfig } from './types.js';
import { NOTE_NAMES, NOTE_SEMITONES, SCALE_INTERVALS } from './intervals.js';

/**
 * Reference frequency for A4 in Hz.
 */
const A4_FREQUENCY = 440;

/**
 * MIDI note number for A4.
 */
const A4_MIDI = 69;

/**
 * Converts a note name and octave to its frequency in Hz.
 * Uses 12-TET tuning with A4 = 440Hz.
 *
 * @param note - Note name (e.g., 'A', 'C#')
 * @param octave - Octave number (default: 4)
 * @returns Frequency in Hz
 *
 * @example
 * noteToFrequency('A', 4); // 440
 * noteToFrequency('C', 4); // 261.626...
 */
export function noteToFrequency(note: NoteName, octave: number = 4): number {
  const semitone = NOTE_SEMITONES[note];
  const midi = semitone + (octave + 1) * 12;
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Gets the note name at a given semitone offset from a root note.
 *
 * @param root - Root note name
 * @param semitones - Number of semitones from root
 * @returns The resulting note name
 */
function getNoteAtOffset(root: NoteName, semitones: number): NoteName {
  const rootIndex = NOTE_SEMITONES[root];
  const targetIndex = (rootIndex + semitones) % 12;
  return NOTE_NAMES[targetIndex] as NoteName;
}

/**
 * Calculates the octave for a note given its semitone offset from the root.
 *
 * @param baseOctave - Starting octave
 * @param rootSemitone - Semitone value of the root note
 * @param semitoneOffset - Offset from the root
 * @returns The octave number for the resulting note
 */
function getOctaveForOffset(
  baseOctave: number,
  rootSemitone: number,
  semitoneOffset: number
): number {
  const totalSemitones = rootSemitone + semitoneOffset;
  return baseOctave + Math.floor(totalSemitones / 12);
}

/**
 * Generates a scale based on the provided configuration.
 *
 * @param config - Scale configuration (root, type, octave)
 * @returns Generated scale with notes and metadata
 *
 * @example
 * const scale = generateScale({ root: 'A', type: 'pentatonic-minor' });
 * console.log(scale.notes[0]); // { name: 'A4', frequency: 440, index: 0 }
 */
export function generateScale(config: ScaleConfig): GeneratedScale {
  const { root, type, octave = 4 } = config;
  const intervals = SCALE_INTERVALS[type];
  const rootSemitone = NOTE_SEMITONES[root];

  const notes: Note[] = intervals.map((semitoneOffset, index) => {
    const noteName = getNoteAtOffset(root, semitoneOffset);
    const noteOctave = getOctaveForOffset(octave, rootSemitone, semitoneOffset);
    const frequency = noteToFrequency(noteName, noteOctave);

    return {
      name: `${noteName}${noteOctave}`,
      frequency,
      index,
    };
  });

  return {
    notes,
    root,
    type,
    noteCount: notes.length,
  };
}
