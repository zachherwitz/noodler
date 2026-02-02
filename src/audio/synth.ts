import type {
  OscillatorType,
  ADSREnvelope,
  SynthConfig,
  ActiveNote,
  EffectNode,
  EffectsState,
} from './types';
import {
  createDelay,
  createDistortion,
  createVibrato,
  createFilter,
  createReverb,
} from './effects';

const DEFAULT_ENVELOPE: ADSREnvelope = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

const DEFAULT_VOLUME = 0.5;
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

/**
 * A Web Audio synthesizer with oscillators, ADSR envelopes, effects, and mobile optimization.
 *
 * @example
 * ```ts
 * const synth = new Synth({ waveform: 'sawtooth', volume: 0.6 });
 * synth.toggleDelay(true);
 * synth.noteOn(0, 440); // Play A4 with delay
 * synth.noteOff(0);     // Release with envelope
 * synth.destroy();      // Cleanup
 * ```
 */
export class Synth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private effectsInputGain: GainNode | null = null;
  private activeNotes: Map<number, ActiveNote> = new Map();
  private waveform: OscillatorType;
  private envelope: ADSREnvelope;
  private volume: number;
  private destroyed = false;
  private octaveShift = 0;

  private effectsState: EffectsState = {
    delay: false,
    distortion: false,
    vibrato: false,
    filter: false,
    reverb: false,
  };

  private effectNodes: {
    delay: EffectNode | null;
    distortion: EffectNode | null;
    vibrato: (EffectNode & { lfo: OscillatorNode; lfoGain: GainNode }) | null;
    filter: EffectNode | null;
    reverb: EffectNode | null;
  } = {
    delay: null,
    distortion: null,
    vibrato: null,
    filter: null,
    reverb: null,
  };

  /**
   * Creates a new Synth instance.
   * AudioContext is lazily initialized on first noteOn() call.
   */
  constructor(config: SynthConfig = {}) {
    this.waveform = config.waveform ?? 'sine';
    this.envelope = { ...DEFAULT_ENVELOPE, ...config.envelope };
    this.volume = this.clampVolume(config.volume ?? DEFAULT_VOLUME);
  }

  /**
   * Starts playing a note at the given frequency.
   * Initializes AudioContext on first call (browser autoplay policy).
   *
   * @param noteIndex - Unique identifier for this note instance
   * @param frequency - Frequency in Hz (clamped to 20-20000)
   */
  noteOn(noteIndex: number, frequency: number): void {
    if (this.destroyed) return;

    this.ensureAudioContext();
    if (!this.audioContext || !this.effectsInputGain) return;

    // Stop existing note at this index if any
    if (this.activeNotes.has(noteIndex)) {
      this.noteOff(noteIndex);
    }

    // Apply octave shift
    const shiftedFreq = frequency * Math.pow(2, this.octaveShift);
    const clampedFreq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, shiftedFreq));
    const now = this.audioContext.currentTime;

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.setValueAtTime(clampedFreq, now);

    // Connect vibrato LFO if active
    if (this.effectsState.vibrato && this.effectNodes.vibrato) {
      this.effectNodes.vibrato.lfoGain.connect(oscillator.detune);
    }

    // Create gain node for ADSR envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    // Apply attack and decay
    gainNode.gain.linearRampToValueAtTime(1, now + this.envelope.attack);
    gainNode.gain.linearRampToValueAtTime(
      this.envelope.sustain,
      now + this.envelope.attack + this.envelope.decay
    );

    // Connect signal chain: Oscillator -> Gain -> Effects Input
    oscillator.connect(gainNode);
    gainNode.connect(this.effectsInputGain);

    oscillator.start(now);

    this.activeNotes.set(noteIndex, {
      oscillator,
      gainNode,
      frequency: clampedFreq,
    });
  }

  /**
   * Stops a playing note with release envelope.
   *
   * @param noteIndex - The note identifier passed to noteOn()
   */
  noteOff(noteIndex: number): void {
    const note = this.activeNotes.get(noteIndex);
    if (!note || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const { oscillator, gainNode } = note;

    // Disconnect vibrato if active
    if (this.effectsState.vibrato && this.effectNodes.vibrato) {
      try {
        this.effectNodes.vibrato.lfoGain.disconnect(oscillator.detune);
      } catch {
        // Already disconnected
      }
    }

    // Cancel scheduled values and apply release
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + this.envelope.release);

    // Schedule stop after release
    oscillator.stop(now + this.envelope.release + 0.01);

    this.activeNotes.delete(noteIndex);
  }

  /**
   * Stops all currently playing notes.
   */
  stopAll(): void {
    for (const noteIndex of this.activeNotes.keys()) {
      this.noteOff(noteIndex);
    }
  }

  /**
   * Changes the oscillator waveform for future notes.
   * Does not affect currently playing notes.
   *
   * @param type - The waveform type
   */
  setWaveform(type: OscillatorType): void {
    this.waveform = type;
  }

  /**
   * Sets the master volume.
   *
   * @param value - Volume level (0-1, clamped)
   */
  setVolume(value: number): void {
    this.volume = this.clampVolume(value);
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(
        this.volume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Applies pitch bend to a playing note.
   *
   * @param noteIndex - The note identifier
   * @param cents - Pitch adjustment in cents (100 cents = 1 semitone)
   */
  bend(noteIndex: number, cents: number): void {
    const note = this.activeNotes.get(noteIndex);
    if (!note || !this.audioContext) return;

    note.oscillator.detune.setValueAtTime(cents, this.audioContext.currentTime);
  }

  /**
   * Sets the octave shift for all notes.
   *
   * @param octaves - Number of octaves to shift (-2 to +2)
   */
  setOctaveShift(octaves: number): void {
    this.octaveShift = Math.max(MIN_OCTAVE_SHIFT, Math.min(MAX_OCTAVE_SHIFT, octaves));
  }

  /**
   * Returns the current octave shift value.
   */
  getOctaveShift(): number {
    return this.octaveShift;
  }

  /**
   * Toggles the delay effect.
   *
   * @param enabled - Whether to enable the effect
   */
  toggleDelay(enabled: boolean): void {
    if (this.effectsState.delay === enabled) return;
    this.effectsState.delay = enabled;

    if (this.audioContext) {
      this.rebuildEffectChain();
    }
  }

  /**
   * Toggles the distortion effect.
   *
   * @param enabled - Whether to enable the effect
   */
  toggleDistortion(enabled: boolean): void {
    if (this.effectsState.distortion === enabled) return;
    this.effectsState.distortion = enabled;

    if (this.audioContext) {
      this.rebuildEffectChain();
    }
  }

  /**
   * Toggles the vibrato effect.
   *
   * @param enabled - Whether to enable the effect
   */
  toggleVibrato(enabled: boolean): void {
    if (this.effectsState.vibrato === enabled) return;
    this.effectsState.vibrato = enabled;

    if (this.audioContext) {
      this.rebuildEffectChain();

      // Connect/disconnect LFO to active oscillators
      if (this.effectNodes.vibrato) {
        for (const note of this.activeNotes.values()) {
          if (enabled) {
            this.effectNodes.vibrato.lfoGain.connect(note.oscillator.detune);
          } else {
            try {
              this.effectNodes.vibrato.lfoGain.disconnect(note.oscillator.detune);
            } catch {
              // Already disconnected
            }
          }
        }
      }
    }
  }

  /**
   * Toggles the filter effect (auto-wah).
   *
   * @param enabled - Whether to enable the effect
   */
  toggleFilter(enabled: boolean): void {
    if (this.effectsState.filter === enabled) return;
    this.effectsState.filter = enabled;

    if (this.audioContext) {
      this.rebuildEffectChain();
    }
  }

  /**
   * Toggles the reverb effect.
   *
   * @param enabled - Whether to enable the effect
   */
  toggleReverb(enabled: boolean): void {
    if (this.effectsState.reverb === enabled) return;
    this.effectsState.reverb = enabled;

    if (this.audioContext) {
      this.rebuildEffectChain();
    }
  }

  /**
   * Returns the current state of all effects.
   */
  getActiveEffects(): EffectsState {
    return { ...this.effectsState };
  }

  /**
   * Cleans up all resources and closes the AudioContext.
   * The Synth instance cannot be used after calling destroy().
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stopAll();
    this.cleanupAllEffects();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.masterGain = null;
    this.compressor = null;
    this.effectsInputGain = null;
    this.activeNotes.clear();
  }

  /**
   * Returns the current waveform type.
   */
  getWaveform(): OscillatorType {
    return this.waveform;
  }

  /**
   * Returns the current volume level.
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Returns the number of currently active notes.
   */
  getActiveNoteCount(): number {
    return this.activeNotes.size;
  }

  /**
   * Returns whether the synth has been destroyed.
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  private ensureAudioContext(): void {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();

    // Create compressor for mobile optimization (prevents clipping)
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
    this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

    // Create effects input gain
    this.effectsInputGain = this.audioContext.createGain();

    // Build effect chain
    this.rebuildEffectChain();

    // Connect: Master Gain -> Compressor -> Output
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioContext.destination);
  }

  private rebuildEffectChain(): void {
    if (!this.audioContext || !this.effectsInputGain || !this.masterGain) return;

    // Disconnect effects input from everything
    this.effectsInputGain.disconnect();

    // Cleanup existing effect nodes
    this.cleanupAllEffects();

    // Create active effects
    // Order: distortion -> filter -> delay -> reverb
    const activeEffects: EffectNode[] = [];

    if (this.effectsState.distortion) {
      this.effectNodes.distortion = createDistortion(this.audioContext);
      activeEffects.push(this.effectNodes.distortion);
    }

    if (this.effectsState.filter) {
      this.effectNodes.filter = createFilter(this.audioContext);
      activeEffects.push(this.effectNodes.filter);
    }

    if (this.effectsState.vibrato) {
      this.effectNodes.vibrato = createVibrato(this.audioContext);
      // Vibrato doesn't go in audio chain, it modulates oscillator detune directly
    }

    if (this.effectsState.delay) {
      this.effectNodes.delay = createDelay(this.audioContext);
      activeEffects.push(this.effectNodes.delay);
    }

    if (this.effectsState.reverb) {
      this.effectNodes.reverb = createReverb(this.audioContext);
      activeEffects.push(this.effectNodes.reverb);
    }

    // Connect chain
    if (activeEffects.length === 0) {
      // No effects, connect directly to master
      this.effectsInputGain.connect(this.masterGain);
    } else {
      // Connect through effect chain
      const firstEffect = activeEffects[0]!;
      const lastEffect = activeEffects[activeEffects.length - 1]!;

      this.effectsInputGain.connect(firstEffect.input);

      for (let i = 0; i < activeEffects.length - 1; i++) {
        const current = activeEffects[i]!;
        const next = activeEffects[i + 1]!;
        current.output.connect(next.input);
      }

      lastEffect.output.connect(this.masterGain);
    }
  }

  private cleanupAllEffects(): void {
    if (this.effectNodes.delay) {
      this.effectNodes.delay.cleanup();
      this.effectNodes.delay = null;
    }
    if (this.effectNodes.distortion) {
      this.effectNodes.distortion.cleanup();
      this.effectNodes.distortion = null;
    }
    if (this.effectNodes.vibrato) {
      this.effectNodes.vibrato.cleanup();
      this.effectNodes.vibrato = null;
    }
    if (this.effectNodes.filter) {
      this.effectNodes.filter.cleanup();
      this.effectNodes.filter = null;
    }
    if (this.effectNodes.reverb) {
      this.effectNodes.reverb.cleanup();
      this.effectNodes.reverb = null;
    }
  }

  private clampVolume(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
