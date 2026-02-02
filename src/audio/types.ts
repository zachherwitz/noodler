/**
 * Oscillator waveform types available in Web Audio.
 */
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/**
 * ADSR envelope configuration for amplitude shaping.
 */
export interface ADSREnvelope {
  /** Attack time in seconds */
  attack: number;
  /** Decay time in seconds */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in seconds */
  release: number;
}

/**
 * Configuration options for the Synth class.
 */
export interface SynthConfig {
  /** Oscillator waveform type */
  waveform?: OscillatorType;
  /** ADSR envelope settings */
  envelope?: Partial<ADSREnvelope>;
  /** Master volume (0-1) */
  volume?: number;
}

/**
 * Internal state for an active note.
 */
export interface ActiveNote {
  /** The oscillator node */
  oscillator: OscillatorNode;
  /** The gain node for ADSR envelope */
  gainNode: GainNode;
  /** Note frequency in Hz */
  frequency: number;
}
