import { describe, it, expect } from 'vitest';
import { PROGRESSIONS } from '../progressions.js';
import { resolveChordProgression } from '../chords.js';

describe('PROGRESSIONS', () => {
  it('exports all expected progressions', () => {
    expect(PROGRESSIONS.BLUES_12_BAR).toBeDefined();
    expect(PROGRESSIONS.POP_FOUR).toBeDefined();
    expect(PROGRESSIONS.JAZZ_251).toBeDefined();
    expect(PROGRESSIONS.FIFTIES).toBeDefined();
    expect(PROGRESSIONS.CANON).toBeDefined();
    expect(PROGRESSIONS.ROCK_BASIC).toBeDefined();
    expect(PROGRESSIONS.MINOR_NATURAL).toBeDefined();
    expect(PROGRESSIONS.ANDALUSIAN).toBeDefined();
  });

  it('BLUES_12_BAR has 12 chords', () => {
    expect(PROGRESSIONS.BLUES_12_BAR).toHaveLength(12);
  });

  it('POP_FOUR has 4 chords', () => {
    expect(PROGRESSIONS.POP_FOUR).toHaveLength(4);
  });

  it('JAZZ_251 has 3 chords', () => {
    expect(PROGRESSIONS.JAZZ_251).toHaveLength(3);
  });

  it('all progressions contain valid roman numerals', () => {
    const keys = Object.keys(PROGRESSIONS) as (keyof typeof PROGRESSIONS)[];
    for (const key of keys) {
      const progression = PROGRESSIONS[key];
      expect(() => {
        resolveChordProgression([...progression], 'C');
      }).not.toThrow();
    }
  });

  it('BLUES_12_BAR resolves correctly in key of A', () => {
    const resolved = resolveChordProgression(
      [...PROGRESSIONS.BLUES_12_BAR],
      'A'
    );
    expect(resolved[0]!.symbol).toBe('A');
    expect(resolved[4]!.symbol).toBe('D');
    expect(resolved[8]!.symbol).toBe('E');
  });

  it('POP_FOUR resolves correctly (I-V-vi-IV)', () => {
    const resolved = resolveChordProgression([...PROGRESSIONS.POP_FOUR], 'G');
    expect(resolved[0]!.symbol).toBe('G');
    expect(resolved[1]!.symbol).toBe('D');
    expect(resolved[2]!.symbol).toBe('Em');
    expect(resolved[3]!.symbol).toBe('C');
  });

  it('JAZZ_251 resolves correctly (ii-V-I)', () => {
    const resolved = resolveChordProgression([...PROGRESSIONS.JAZZ_251], 'C');
    expect(resolved[0]!.symbol).toBe('Dm');
    expect(resolved[1]!.symbol).toBe('G');
    expect(resolved[2]!.symbol).toBe('C');
  });

  it('MINOR_NATURAL contains all minor chords', () => {
    const resolved = resolveChordProgression(
      [...PROGRESSIONS.MINOR_NATURAL],
      'A'
    );
    expect(resolved[0]!.isMajor).toBe(false);
    expect(resolved[1]!.isMajor).toBe(false);
    expect(resolved[2]!.isMajor).toBe(false);
  });

  it('ANDALUSIAN resolves correctly (i-VII-VI-V)', () => {
    const resolved = resolveChordProgression([...PROGRESSIONS.ANDALUSIAN], 'A');
    expect(resolved[0]!.symbol).toBe('Am');
    expect(resolved[1]!.symbol).toBe('G#');
    expect(resolved[2]!.symbol).toBe('F#');
    expect(resolved[3]!.symbol).toBe('E');
  });
});
