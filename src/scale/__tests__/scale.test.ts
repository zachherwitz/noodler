import { describe, it, expect } from 'vitest';
import { noteToFrequency, generateScale } from '../generator.js';
import { resolveChord, resolveChordProgression } from '../chords.js';
import {
  NOTE_SEMITONES,
  NOTE_NAMES,
  SCALE_INTERVALS,
  ROMAN_TO_DEGREE,
  MAJOR_SCALE_DEGREES,
} from '../intervals.js';
import type { NoteName, ScaleType, RomanNumeral } from '../types.js';

describe('intervals', () => {
  describe('NOTE_SEMITONES', () => {
    it('maps all 12 chromatic notes to 0-11', () => {
      expect(NOTE_SEMITONES['C']).toBe(0);
      expect(NOTE_SEMITONES['C#']).toBe(1);
      expect(NOTE_SEMITONES['D']).toBe(2);
      expect(NOTE_SEMITONES['D#']).toBe(3);
      expect(NOTE_SEMITONES['E']).toBe(4);
      expect(NOTE_SEMITONES['F']).toBe(5);
      expect(NOTE_SEMITONES['F#']).toBe(6);
      expect(NOTE_SEMITONES['G']).toBe(7);
      expect(NOTE_SEMITONES['G#']).toBe(8);
      expect(NOTE_SEMITONES['A']).toBe(9);
      expect(NOTE_SEMITONES['A#']).toBe(10);
      expect(NOTE_SEMITONES['B']).toBe(11);
    });

    it('has exactly 12 entries', () => {
      expect(Object.keys(NOTE_SEMITONES)).toHaveLength(12);
    });
  });

  describe('NOTE_NAMES', () => {
    it('contains all 12 chromatic notes in order', () => {
      expect(NOTE_NAMES).toEqual([
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
      ]);
    });
  });

  describe('SCALE_INTERVALS', () => {
    it('defines pentatonic-major with correct intervals', () => {
      expect(SCALE_INTERVALS['pentatonic-major']).toEqual([0, 2, 4, 7, 9]);
    });

    it('defines pentatonic-minor with correct intervals', () => {
      expect(SCALE_INTERVALS['pentatonic-minor']).toEqual([0, 3, 5, 7, 10]);
    });

    it('defines blues scale with correct intervals', () => {
      expect(SCALE_INTERVALS['blues']).toEqual([0, 3, 5, 6, 7, 10]);
    });

    it('defines major scale with correct intervals', () => {
      expect(SCALE_INTERVALS['major']).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it('defines minor scale with correct intervals', () => {
      expect(SCALE_INTERVALS['minor']).toEqual([0, 2, 3, 5, 7, 8, 10]);
    });

    it('defines dorian mode with correct intervals', () => {
      expect(SCALE_INTERVALS['dorian']).toEqual([0, 2, 3, 5, 7, 9, 10]);
    });

    it('defines mixolydian mode with correct intervals', () => {
      expect(SCALE_INTERVALS['mixolydian']).toEqual([0, 2, 4, 5, 7, 9, 10]);
    });

    it('has correct number of notes per scale', () => {
      expect(SCALE_INTERVALS['pentatonic-major']).toHaveLength(5);
      expect(SCALE_INTERVALS['pentatonic-minor']).toHaveLength(5);
      expect(SCALE_INTERVALS['blues']).toHaveLength(6);
      expect(SCALE_INTERVALS['major']).toHaveLength(7);
      expect(SCALE_INTERVALS['minor']).toHaveLength(7);
      expect(SCALE_INTERVALS['dorian']).toHaveLength(7);
      expect(SCALE_INTERVALS['mixolydian']).toHaveLength(7);
    });
  });

  describe('ROMAN_TO_DEGREE', () => {
    it('maps uppercase roman numerals to degrees 1-7', () => {
      expect(ROMAN_TO_DEGREE['I']).toBe(1);
      expect(ROMAN_TO_DEGREE['II']).toBe(2);
      expect(ROMAN_TO_DEGREE['III']).toBe(3);
      expect(ROMAN_TO_DEGREE['IV']).toBe(4);
      expect(ROMAN_TO_DEGREE['V']).toBe(5);
      expect(ROMAN_TO_DEGREE['VI']).toBe(6);
      expect(ROMAN_TO_DEGREE['VII']).toBe(7);
    });

    it('maps lowercase roman numerals to degrees 1-7', () => {
      expect(ROMAN_TO_DEGREE['i']).toBe(1);
      expect(ROMAN_TO_DEGREE['ii']).toBe(2);
      expect(ROMAN_TO_DEGREE['iii']).toBe(3);
      expect(ROMAN_TO_DEGREE['iv']).toBe(4);
      expect(ROMAN_TO_DEGREE['v']).toBe(5);
      expect(ROMAN_TO_DEGREE['vi']).toBe(6);
      expect(ROMAN_TO_DEGREE['vii']).toBe(7);
    });
  });

  describe('MAJOR_SCALE_DEGREES', () => {
    it('defines major scale degree semitones', () => {
      expect(MAJOR_SCALE_DEGREES).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });
  });
});

describe('generator', () => {
  describe('noteToFrequency', () => {
    it('returns 440Hz for A4', () => {
      expect(noteToFrequency('A', 4)).toBe(440);
    });

    it('returns 880Hz for A5', () => {
      expect(noteToFrequency('A', 5)).toBe(880);
    });

    it('returns 220Hz for A3', () => {
      expect(noteToFrequency('A', 3)).toBe(220);
    });

    it('calculates middle C (C4) correctly', () => {
      const c4 = noteToFrequency('C', 4);
      expect(c4).toBeCloseTo(261.626, 2);
    });

    it('calculates E4 correctly', () => {
      const e4 = noteToFrequency('E', 4);
      expect(e4).toBeCloseTo(329.628, 2);
    });

    it('handles sharp notes correctly', () => {
      const cSharp4 = noteToFrequency('C#', 4);
      expect(cSharp4).toBeCloseTo(277.183, 2);
    });

    it('handles octave 0', () => {
      const c0 = noteToFrequency('C', 0);
      expect(c0).toBeCloseTo(16.352, 2);
    });

    it('handles octave 8', () => {
      const c8 = noteToFrequency('C', 8);
      expect(c8).toBeCloseTo(4186.009, 2);
    });

    it('uses default octave 4 when not specified', () => {
      expect(noteToFrequency('A')).toBe(440);
    });

    it('maintains correct frequency ratios between semitones', () => {
      const a4 = noteToFrequency('A', 4);
      const aSharp4 = noteToFrequency('A#', 4);
      const ratio = aSharp4 / a4;
      expect(ratio).toBeCloseTo(Math.pow(2, 1 / 12), 6);
    });
  });

  describe('generateScale', () => {
    it('generates A pentatonic-minor scale starting at octave 4', () => {
      const scale = generateScale({
        root: 'A',
        type: 'pentatonic-minor',
        octave: 4,
      });

      expect(scale.root).toBe('A');
      expect(scale.type).toBe('pentatonic-minor');
      expect(scale.noteCount).toBe(5);
      expect(scale.notes).toHaveLength(5);

      const firstNote = scale.notes[0]!;
      expect(firstNote.name).toBe('A4');
      expect(firstNote.frequency).toBe(440);
      expect(firstNote.index).toBe(0);
    });

    it('generates C major scale with correct notes', () => {
      const scale = generateScale({ root: 'C', type: 'major', octave: 4 });

      expect(scale.notes.map((n) => n.name)).toEqual([
        'C4',
        'D4',
        'E4',
        'F4',
        'G4',
        'A4',
        'B4',
      ]);
    });

    it('generates E minor scale with correct notes', () => {
      const scale = generateScale({ root: 'E', type: 'minor', octave: 4 });

      expect(scale.notes.map((n) => n.name)).toEqual([
        'E4',
        'F#4',
        'G4',
        'A4',
        'B4',
        'C5',
        'D5',
      ]);
    });

    it('generates blues scale with 6 notes', () => {
      const scale = generateScale({ root: 'A', type: 'blues', octave: 4 });

      expect(scale.noteCount).toBe(6);
      expect(scale.notes.map((n) => n.name)).toEqual([
        'A4',
        'C5',
        'D5',
        'D#5',
        'E5',
        'G5',
      ]);
    });

    it('handles octave wrapping for notes beyond root octave', () => {
      const scale = generateScale({ root: 'G', type: 'major', octave: 4 });

      expect(scale.notes[0]!.name).toBe('G4');
      expect(scale.notes[6]!.name).toBe('F#5');
    });

    it('uses default octave 4 when not specified', () => {
      const scale = generateScale({ root: 'A', type: 'pentatonic-minor' });

      expect(scale.notes[0]!.name).toBe('A4');
      expect(scale.notes[0]!.frequency).toBe(440);
    });

    it('generates correct frequencies for all notes in scale', () => {
      const scale = generateScale({ root: 'A', type: 'pentatonic-minor' });

      expect(scale.notes[0]!.frequency).toBe(440);
      expect(scale.notes[1]!.frequency).toBeCloseTo(523.251, 2);
      expect(scale.notes[2]!.frequency).toBeCloseTo(587.33, 2);
      expect(scale.notes[3]!.frequency).toBeCloseTo(659.255, 2);
      expect(scale.notes[4]!.frequency).toBeCloseTo(783.991, 2);
    });

    it('generates dorian mode correctly', () => {
      const scale = generateScale({ root: 'D', type: 'dorian', octave: 4 });

      expect(scale.notes.map((n) => n.name)).toEqual([
        'D4',
        'E4',
        'F4',
        'G4',
        'A4',
        'B4',
        'C5',
      ]);
    });

    it('generates mixolydian mode correctly', () => {
      const scale = generateScale({ root: 'G', type: 'mixolydian', octave: 4 });

      expect(scale.notes.map((n) => n.name)).toEqual([
        'G4',
        'A4',
        'B4',
        'C5',
        'D5',
        'E5',
        'F5',
      ]);
    });

    it('handles root notes with sharps', () => {
      const scale = generateScale({
        root: 'F#',
        type: 'pentatonic-minor',
        octave: 4,
      });

      expect(scale.notes[0]!.name).toBe('F#4');
      expect(scale.root).toBe('F#');
    });

    it('assigns sequential indices to all notes', () => {
      const scale = generateScale({ root: 'C', type: 'major' });

      scale.notes.forEach((note, i) => {
        expect(note.index).toBe(i);
      });
    });

    const scaleTypes: ScaleType[] = [
      'pentatonic-major',
      'pentatonic-minor',
      'blues',
      'major',
      'minor',
      'dorian',
      'mixolydian',
    ];

    const noteNames: NoteName[] = [
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

    scaleTypes.forEach((scaleType) => {
      it(`generates ${scaleType} scale for all root notes`, () => {
        noteNames.forEach((root) => {
          const scale = generateScale({ root, type: scaleType });
          expect(scale.notes.length).toBeGreaterThan(0);
          expect(scale.notes[0]!.frequency).toBeGreaterThan(0);
        });
      });
    });
  });
});

describe('chords', () => {
  describe('resolveChord', () => {
    it('resolves V in key of A to E major', () => {
      const chord = resolveChord('V', 'A', 4);

      expect(chord.root).toBe('E');
      expect(chord.isMajor).toBe(true);
      expect(chord.symbol).toBe('E');
      expect(chord.frequency).toBeCloseTo(329.628, 2);
    });

    it('resolves I in key of C to C major', () => {
      const chord = resolveChord('I', 'C', 4);

      expect(chord.root).toBe('C');
      expect(chord.isMajor).toBe(true);
      expect(chord.symbol).toBe('C');
    });

    it('resolves iv in key of A to D minor', () => {
      const chord = resolveChord('iv', 'A', 4);

      expect(chord.root).toBe('D');
      expect(chord.isMajor).toBe(false);
      expect(chord.symbol).toBe('Dm');
    });

    it('resolves vi in key of G to E minor', () => {
      const chord = resolveChord('vi', 'G', 4);

      expect(chord.root).toBe('E');
      expect(chord.isMajor).toBe(false);
      expect(chord.symbol).toBe('Em');
    });

    it('resolves all roman numerals in key of C', () => {
      const expected: Array<[RomanNumeral, string]> = [
        ['I', 'C'],
        ['II', 'D'],
        ['III', 'E'],
        ['IV', 'F'],
        ['V', 'G'],
        ['VI', 'A'],
        ['VII', 'B'],
      ];

      expected.forEach(([numeral, expectedRoot]) => {
        const chord = resolveChord(numeral, 'C');
        expect(chord.root).toBe(expectedRoot);
        expect(chord.isMajor).toBe(true);
      });
    });

    it('resolves lowercase roman numerals as minor chords', () => {
      const chord = resolveChord('ii', 'C');

      expect(chord.root).toBe('D');
      expect(chord.isMajor).toBe(false);
      expect(chord.symbol).toBe('Dm');
    });

    it('resolves chord symbols directly', () => {
      const chord = resolveChord('Am', 'C', 4);

      expect(chord.root).toBe('A');
      expect(chord.isMajor).toBe(false);
      expect(chord.symbol).toBe('Am');
      expect(chord.frequency).toBe(440);
    });

    it('resolves major chord symbols', () => {
      const chord = resolveChord('G', 'C', 4);

      expect(chord.root).toBe('G');
      expect(chord.isMajor).toBe(true);
      expect(chord.symbol).toBe('G');
    });

    it('resolves sharp chord symbols', () => {
      const chord = resolveChord('F#m', 'A', 4);

      expect(chord.root).toBe('F#');
      expect(chord.isMajor).toBe(false);
      expect(chord.symbol).toBe('F#m');
    });

    it('uses default octave 4 when not specified', () => {
      const chord = resolveChord('V', 'A');

      expect(chord.frequency).toBeCloseTo(329.628, 2);
    });

    it('applies octave to frequency calculation', () => {
      const chord3 = resolveChord('I', 'A', 3);
      const chord4 = resolveChord('I', 'A', 4);
      const chord5 = resolveChord('I', 'A', 5);

      expect(chord3.frequency).toBe(220);
      expect(chord4.frequency).toBe(440);
      expect(chord5.frequency).toBe(880);
    });

    it('throws error for invalid chord', () => {
      expect(() => resolveChord('invalid', 'C')).toThrow('Invalid chord');
    });

    it('throws error for invalid chord symbol', () => {
      expect(() => resolveChord('Xm', 'C')).toThrow('Invalid chord');
    });
  });

  describe('resolveChordProgression', () => {
    it('resolves I-IV-V-I progression in G', () => {
      const progression = resolveChordProgression(['I', 'IV', 'V', 'I'], 'G');

      expect(progression).toHaveLength(4);
      expect(progression[0]!.root).toBe('G');
      expect(progression[1]!.root).toBe('C');
      expect(progression[2]!.root).toBe('D');
      expect(progression[3]!.root).toBe('G');
    });

    it('resolves i-iv-v progression in A minor', () => {
      const progression = resolveChordProgression(['i', 'iv', 'v'], 'A');

      expect(progression[0]!.symbol).toBe('Am');
      expect(progression[1]!.symbol).toBe('Dm');
      expect(progression[2]!.symbol).toBe('Em');
    });

    it('resolves mixed roman numerals and chord symbols', () => {
      const progression = resolveChordProgression(['I', 'Am', 'IV', 'G'], 'C');

      expect(progression[0]!.root).toBe('C');
      expect(progression[1]!.root).toBe('A');
      expect(progression[2]!.root).toBe('F');
      expect(progression[3]!.root).toBe('G');
    });

    it('applies octave to all chords', () => {
      const progression = resolveChordProgression(['I', 'V'], 'A', 5);

      expect(progression[0]!.frequency).toBe(880);
      expect(progression[1]!.frequency).toBeCloseTo(659.255, 2);
    });

    it('returns empty array for empty progression', () => {
      const progression = resolveChordProgression([], 'C');

      expect(progression).toEqual([]);
    });

    it('resolves 12-bar blues progression', () => {
      const blues = resolveChordProgression(
        ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
        'A'
      );

      expect(blues).toHaveLength(12);
      expect(blues[0]!.root).toBe('A');
      expect(blues[4]!.root).toBe('D');
      expect(blues[8]!.root).toBe('E');
    });
  });
});
