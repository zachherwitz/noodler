import type { NoteName, ScaleType } from '../scale/types.js';
import type { BoardTheme, EffectName, ParsedScaleConfig } from './types.js';

const VALID_NOTES: Set<string> = new Set([
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]);

const VALID_SCALE_TYPES: Set<string> = new Set([
  'pentatonic-major', 'pentatonic-minor', 'blues',
  'major', 'minor', 'dorian', 'mixolydian',
]);

const VALID_WAVEFORMS: Set<string> = new Set([
  'sine', 'square', 'sawtooth', 'triangle',
]);

const VALID_THEMES: Set<string> = new Set([
  'dark', 'light', 'colorful',
]);

const VALID_EFFECTS: Set<string> = new Set([
  'delay', 'distortion', 'vibrato', 'filter', 'reverb',
]);

const SHORTHAND_SCALE_MAP: Record<string, ScaleType> = {
  m: 'minor',
  min: 'minor',
  maj: 'major',
};

/**
 * Parses a scale string attribute into a ScaleConfig.
 * Supports formats:
 * - "Em" or "Am" (note + m for minor)
 * - "A pentatonic-minor" (note + scale type)
 * - "G major" (note + scale type)
 *
 * @param scaleStr - The scale attribute string
 * @returns Parsed config or null if invalid
 */
export function parseScaleAttribute(scaleStr: string): ParsedScaleConfig | null {
  if (!scaleStr || typeof scaleStr !== 'string') {
    return null;
  }

  const trimmed = scaleStr.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Try to match note at the beginning (e.g., "C#", "A", "Db")
  let root: NoteName | null = null;
  let remaining = trimmed;

  // Check for two-character note first (C#, D#, etc.)
  if (trimmed.length >= 2) {
    const twoChar = trimmed.slice(0, 2).toUpperCase();
    // Handle flats by converting to sharps
    if (twoChar[1] === 'B' && twoChar[0] !== 'A' && twoChar[0] !== 'B') {
      const flatToSharp: Record<string, NoteName> = {
        DB: 'C#', EB: 'D#', GB: 'F#', AB: 'G#', BB: 'A#',
      };
      if (flatToSharp[twoChar]) {
        root = flatToSharp[twoChar];
        remaining = trimmed.slice(2).trim();
      }
    } else if (twoChar[1] === '#' && VALID_NOTES.has(twoChar)) {
      root = twoChar as NoteName;
      remaining = trimmed.slice(2).trim();
    }
  }

  // If no two-char note found, try single character
  if (!root && trimmed.length >= 1) {
    const oneChar = trimmed[0]!.toUpperCase();
    if (VALID_NOTES.has(oneChar)) {
      root = oneChar as NoteName;
      remaining = trimmed.slice(1).trim();
    }
  }

  if (!root) {
    return null;
  }

  // Default to pentatonic-minor if no scale type specified
  let scaleType: ScaleType = 'pentatonic-minor';

  if (remaining.length > 0) {
    const lowerRemaining = remaining.toLowerCase();

    // Check for shorthand (m, min, maj)
    if (SHORTHAND_SCALE_MAP[lowerRemaining]) {
      scaleType = SHORTHAND_SCALE_MAP[lowerRemaining];
    } else if (VALID_SCALE_TYPES.has(lowerRemaining)) {
      scaleType = lowerRemaining as ScaleType;
    } else if (lowerRemaining === 'm' || lowerRemaining.startsWith('m ')) {
      scaleType = 'minor';
    } else {
      // Unknown scale type, return null
      return null;
    }
  }

  return {
    root,
    type: scaleType,
    octave: 4,
  };
}

/**
 * Validates a waveform string.
 *
 * @param waveform - The waveform attribute value
 * @returns Valid waveform or 'sine' as default
 */
export function validateWaveform(
  waveform: string | null
): 'sine' | 'square' | 'sawtooth' | 'triangle' {
  if (waveform && VALID_WAVEFORMS.has(waveform)) {
    return waveform as 'sine' | 'square' | 'sawtooth' | 'triangle';
  }
  return 'sine';
}

/**
 * Validates a theme string.
 *
 * @param theme - The theme attribute value
 * @returns Valid theme or 'dark' as default
 */
export function validateTheme(theme: string | null): BoardTheme {
  if (theme && VALID_THEMES.has(theme)) {
    return theme as BoardTheme;
  }
  return 'dark';
}

/**
 * Parses and validates effects attribute.
 *
 * @param effectsStr - Comma-separated effects string
 * @returns Array of valid effect names
 */
export function parseEffectsAttribute(effectsStr: string | null): EffectName[] {
  if (!effectsStr) {
    return [];
  }

  return effectsStr
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e): e is EffectName => VALID_EFFECTS.has(e));
}

/**
 * Validates a notes count attribute.
 *
 * @param notesStr - The notes attribute value
 * @param defaultCount - Default count if invalid
 * @returns Valid note count (1-24 range)
 */
export function validateNotesCount(notesStr: string | null, defaultCount: number): number {
  if (!notesStr) {
    return defaultCount;
  }

  const parsed = parseInt(notesStr, 10);
  if (isNaN(parsed) || parsed < 1) {
    return defaultCount;
  }

  return Math.min(parsed, 24);
}

/**
 * Calculates which note zone a Y position falls into.
 *
 * @param y - Y coordinate relative to element
 * @param height - Total height of the element
 * @param noteCount - Number of notes
 * @returns Note index (0 to noteCount-1)
 */
export function getNoteIndexFromY(y: number, height: number, noteCount: number): number {
  if (height <= 0 || noteCount <= 0) {
    return 0;
  }

  const zoneHeight = height / noteCount;
  const index = Math.floor(y / zoneHeight);
  return Math.max(0, Math.min(noteCount - 1, index));
}

/**
 * Calculates pitch bend in cents from X position.
 *
 * @param x - X coordinate relative to element
 * @param width - Total width of the element
 * @param maxCents - Maximum bend in cents (default: 200 = 2 semitones)
 * @returns Cents value (-maxCents to +maxCents)
 */
export function getBendFromX(x: number, width: number, maxCents: number = 200): number {
  if (width <= 0) {
    return 0;
  }

  const center = width / 2;
  const offset = x - center;
  const normalized = offset / center;
  return Math.round(normalized * maxCents);
}

/**
 * Triggers haptic feedback if available.
 *
 * @param duration - Vibration duration in ms
 */
export function triggerHaptic(duration: number = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}
