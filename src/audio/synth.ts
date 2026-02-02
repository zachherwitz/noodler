import type {
  OscillatorType,
  ADSREnvelope,
  SynthConfig,
  ActiveNote,
} from './types';

const DEFAULT_ENVELOPE: ADSREnvelope = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

const DEFAULT_VOLUME = 0.5;
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;

/**
 * A Web Audio synthesizer with oscillators, ADSR envelopes, and mobile optimization.
 *
 * @example
 * ```ts
 * const synth = new Synth({ waveform: 'sawtooth', volume: 0.6 });
 * synth.noteOn(0, 440); // Play A4
 * synth.noteOff(0);     // Release with envelope
 * synth.destroy();      // Cleanup
 * ```
 */
export class Synth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeNotes: Map<number, ActiveNote> = new Map();
  private waveform: OscillatorType;
  private envelope: ADSREnvelope;
  private volume: number;
  private destroyed = false;

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
    if (!this.audioContext || !this.masterGain) return;

    // Stop existing note at this index if any
    if (this.activeNotes.has(noteIndex)) {
      this.noteOff(noteIndex);
    }

    const clampedFreq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, frequency));
    const now = this.audioContext.currentTime;

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.setValueAtTime(clampedFreq, now);

    // Create gain node for ADSR envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    // Apply attack and decay
    gainNode.gain.linearRampToValueAtTime(1, now + this.envelope.attack);
    gainNode.gain.linearRampToValueAtTime(
      this.envelope.sustain,
      now + this.envelope.attack + this.envelope.decay
    );

    // Connect signal chain: Oscillator -> Gain -> Master
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

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
   * Cleans up all resources and closes the AudioContext.
   * The Synth instance cannot be used after calling destroy().
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stopAll();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.masterGain = null;
    this.compressor = null;
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

    // Connect: Master Gain -> Compressor -> Output
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioContext.destination);
  }

  private clampVolume(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
