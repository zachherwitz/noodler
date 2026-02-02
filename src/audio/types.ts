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

/**
 * Available effect types.
 */
export type EffectType = 'delay' | 'distortion' | 'vibrato' | 'filter' | 'reverb';

/**
 * Configuration for the delay effect.
 */
export interface DelayConfig {
  /** Delay time in seconds */
  time: number;
  /** Feedback amount (0-1) */
  feedback: number;
  /** Wet/dry mix (0-1) */
  mix: number;
}

/**
 * Configuration for the distortion effect.
 */
export interface DistortionConfig {
  /** Distortion amount (0-100) */
  amount: number;
}

/**
 * Configuration for the vibrato effect.
 */
export interface VibratoConfig {
  /** LFO frequency in Hz */
  rate: number;
  /** Pitch deviation in cents */
  depth: number;
}

/**
 * Configuration for the filter effect.
 */
export interface FilterConfig {
  /** Filter type */
  type: BiquadFilterType;
  /** Cutoff frequency in Hz */
  frequency: number;
  /** Q factor */
  Q: number;
  /** LFO rate for auto-wah in Hz */
  lfoRate: number;
  /** LFO depth (frequency range in Hz) */
  lfoDepth: number;
}

/**
 * Configuration for the reverb effect.
 */
export interface ReverbConfig {
  /** Reverb decay time in seconds */
  decay: number;
  /** Wet/dry mix (0-1) */
  mix: number;
}

/**
 * Union type for all effect configurations.
 */
export type EffectConfig =
  | { type: 'delay'; config: Partial<DelayConfig> }
  | { type: 'distortion'; config: Partial<DistortionConfig> }
  | { type: 'vibrato'; config: Partial<VibratoConfig> }
  | { type: 'filter'; config: Partial<FilterConfig> }
  | { type: 'reverb'; config: Partial<ReverbConfig> };

/**
 * Return type for effect factory functions.
 */
export interface EffectNode {
  /** The audio node to connect in the signal chain */
  input: AudioNode;
  /** The output node to connect from */
  output: AudioNode;
  /** Cleanup function to stop LFOs and release resources */
  cleanup: () => void;
}

/**
 * State of active effects in the Synth.
 */
export interface EffectsState {
  delay: boolean;
  distortion: boolean;
  vibrato: boolean;
  filter: boolean;
  reverb: boolean;
}

/**
 * Rhythm pattern styles for backing tracks.
 */
export type BackingStyle = 'drone' | 'quarter' | 'eighth' | 'blues' | 'arpeggio';

/**
 * Instrument sounds for backing tracks.
 */
export type BackingInstrument = 'bass' | 'pad' | 'pluck' | 'keys';

/**
 * Configuration for BackingTrack.
 */
export interface BackingConfig {
  /** Tempo in BPM (default: 120) */
  tempo?: number;
  /** Rhythm style (default: 'quarter') */
  style?: BackingStyle;
  /** Instrument sound (default: 'bass') */
  instrument?: BackingInstrument;
  /** Chord progression as roman numerals or note names */
  chords?: string[];
  /** Number of bars per chord (default: 1) */
  bars?: number;
  /** Swing percentage 0-100 (default: 0) */
  swing?: number;
}
