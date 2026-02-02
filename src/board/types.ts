import type { Note, NoteName, ScaleType } from '../scale/types.js';

/**
 * Theme options for the board appearance.
 */
export type BoardTheme = 'dark' | 'light' | 'colorful';

/**
 * Parsed configuration from the scale attribute.
 */
export interface ParsedScaleConfig {
  root: NoteName;
  type: ScaleType;
  octave: number;
}

/**
 * Configuration for the NoodlerBoard component.
 */
export interface BoardConfig {
  scale: ParsedScaleConfig;
  notes?: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  effects: string[];
  theme: BoardTheme;
}

/**
 * Detail payload for the noteon event.
 */
export interface NoteOnEventDetail {
  note: Note;
  frequency: number;
}

/**
 * Detail payload for the noteoff event.
 */
export interface NoteOffEventDetail {
  note: Note;
}

/**
 * Detail payload for the bend event.
 */
export interface BendEventDetail {
  note: Note;
  cents: number;
}

/**
 * State for tracking active pointer interactions.
 */
export interface PointerState {
  pointerId: number;
  noteIndex: number;
  startX: number;
}

/**
 * Valid effect names that can be toggled.
 */
export type EffectName = 'delay' | 'distortion' | 'vibrato' | 'filter' | 'reverb';

/**
 * Bend mode for horizontal pitch bending behavior.
 *
 * - 'dynamic': Smooth continuous bend (default, ±1 octave max)
 * - 'stepped': Snaps to pentatonic scale intervals
 * - 'direct': 3-state toggle (octave down / original / octave up)
 */
export type BendMode = 'dynamic' | 'stepped' | 'direct';

/**
 * Detail payload for the bendmodechange event.
 */
export interface BendModeChangeEventDetail {
  mode: BendMode;
}
