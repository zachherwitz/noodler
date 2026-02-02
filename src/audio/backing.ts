import type {
  BackingStyle,
  BackingInstrument,
  BackingConfig,
  OscillatorType,
  ADSREnvelope,
} from './types';
import type { NoteName, ResolvedChord } from '../scale/types';
import { resolveChordProgression } from '../scale/chords';
import { noteToFrequency } from '../scale/generator';

const DEFAULT_TEMPO = 120;
const DEFAULT_STYLE: BackingStyle = 'quarter';
const DEFAULT_INSTRUMENT: BackingInstrument = 'bass';
const DEFAULT_BARS = 1;
const DEFAULT_SWING = 0;
const DEFAULT_KEY: NoteName = 'C';

const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;

const INSTRUMENT_CONFIG: Record<
  BackingInstrument,
  { waveform: OscillatorType; envelope: ADSREnvelope; octaveOffset: number }
> = {
  bass: {
    waveform: 'triangle',
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
    octaveOffset: -1,
  },
  pad: {
    waveform: 'sine',
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.5 },
    octaveOffset: 0,
  },
  pluck: {
    waveform: 'sawtooth',
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.3 },
    octaveOffset: 0,
  },
  keys: {
    waveform: 'square',
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.25 },
    octaveOffset: 0,
  },
};

interface ScheduledNote {
  time: number;
  frequency: number;
  duration: number;
}

/**
 * Manages backing track playback with chord progressions and rhythm patterns.
 *
 * @example
 * ```ts
 * const ctx = new AudioContext();
 * const backing = new BackingTrack(ctx, {
 *   tempo: 100,
 *   style: 'quarter',
 *   chords: ['I', 'IV', 'V', 'I'],
 * });
 * backing.play();
 * backing.stop();
 * backing.destroy();
 * ```
 */
export class BackingTrack {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode;

  private tempo: number;
  private style: BackingStyle;
  private instrument: BackingInstrument;
  private resolvedChords: ResolvedChord[];
  private bars: number;
  private swing: number;
  private key: NoteName;

  private isPlaying = false;
  private destroyed = false;
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private currentBeat = 0;
  private currentChordIndex = 0;
  private beatsPerChord = 0;
  private activeOscillators: Set<OscillatorNode> = new Set();

  /**
   * Creates a new BackingTrack instance.
   *
   * @param audioContext - The AudioContext to use for audio output
   * @param config - Configuration options
   */
  constructor(audioContext: AudioContext, config: BackingConfig = {}) {
    this.audioContext = audioContext;
    this.tempo = config.tempo ?? DEFAULT_TEMPO;
    this.style = config.style ?? DEFAULT_STYLE;
    this.instrument = config.instrument ?? DEFAULT_INSTRUMENT;
    this.bars = config.bars ?? DEFAULT_BARS;
    this.swing = Math.max(0, Math.min(100, config.swing ?? DEFAULT_SWING));
    this.key = DEFAULT_KEY;

    this.resolvedChords = this.resolveChords(config.chords ?? ['I']);

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);

    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-20, this.audioContext.currentTime);
    this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.audioContext.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioContext.destination);

    this.updateBeatsPerChord();
  }

  /**
   * Starts playback.
   */
  play(): void {
    if (this.isPlaying || this.destroyed) return;

    this.isPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime;
    this.currentBeat = 0;
    this.currentChordIndex = 0;

    this.schedulerInterval = setInterval(() => {
      this.schedule();
    }, SCHEDULER_INTERVAL_MS);
  }

  /**
   * Stops playback.
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.schedulerInterval !== null) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeOscillators.clear();
  }

  /**
   * Sets the tempo in BPM.
   *
   * @param bpm - Tempo in beats per minute
   */
  setTempo(bpm: number): void {
    this.tempo = Math.max(20, Math.min(300, bpm));
    this.updateBeatsPerChord();
  }

  /**
   * Returns the current tempo.
   */
  getTempo(): number {
    return this.tempo;
  }

  /**
   * Sets the chord progression.
   *
   * @param progression - Array of roman numerals or chord symbols
   * @param key - Optional key for roman numeral resolution
   */
  setChords(progression: string[], key?: NoteName): void {
    if (key) {
      this.key = key;
    }
    this.resolvedChords = this.resolveChords(progression);
    this.currentChordIndex = 0;
  }

  /**
   * Returns the current resolved chords.
   */
  getChords(): ResolvedChord[] {
    return [...this.resolvedChords];
  }

  /**
   * Sets the rhythm style.
   *
   * @param style - The rhythm pattern to use
   */
  setStyle(style: BackingStyle): void {
    this.style = style;
    this.updateBeatsPerChord();
  }

  /**
   * Returns the current style.
   */
  getStyle(): BackingStyle {
    return this.style;
  }

  /**
   * Sets the swing percentage.
   *
   * @param swing - Swing amount (0-100)
   */
  setSwing(swing: number): void {
    this.swing = Math.max(0, Math.min(100, swing));
  }

  /**
   * Returns the current swing percentage.
   */
  getSwing(): number {
    return this.swing;
  }

  /**
   * Sets the instrument sound.
   *
   * @param instrument - The instrument to use
   */
  setInstrument(instrument: BackingInstrument): void {
    this.instrument = instrument;
  }

  /**
   * Returns the current instrument.
   */
  getInstrument(): BackingInstrument {
    return this.instrument;
  }

  /**
   * Returns whether the backing track is currently playing.
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Returns whether the backing track has been destroyed.
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Cleans up resources.
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stop();

    this.masterGain.disconnect();
    this.compressor.disconnect();
  }

  private schedule(): void {
    const lookaheadEnd = this.audioContext.currentTime + LOOKAHEAD_SECONDS;

    while (this.nextNoteTime < lookaheadEnd) {
      const notes = this.getNotesForCurrentBeat();
      for (const note of notes) {
        this.playNote(note.frequency, this.nextNoteTime + note.time, note.duration);
      }

      this.advanceBeat();
    }
  }

  private getNotesForCurrentBeat(): ScheduledNote[] {
    const chord = this.resolvedChords[this.currentChordIndex];
    if (!chord) return [];

    const instrumentConfig = INSTRUMENT_CONFIG[this.instrument];
    const baseOctave = 4 + instrumentConfig.octaveOffset;
    const rootFreq = noteToFrequency(chord.root, baseOctave);
    const beatDuration = 60 / this.tempo;

    const notes: ScheduledNote[] = [];

    switch (this.style) {
      case 'drone':
        if (this.currentBeat === 0) {
          notes.push({
            time: 0,
            frequency: rootFreq,
            duration: beatDuration * this.beatsPerChord * 0.95,
          });
        }
        break;

      case 'quarter':
        notes.push({
          time: 0,
          frequency: rootFreq,
          duration: beatDuration * 0.8,
        });
        break;

      case 'eighth': {
        notes.push({
          time: 0,
          frequency: rootFreq,
          duration: beatDuration * 0.4,
        });
        const swingOffset = (this.swing / 100) * (beatDuration / 3);
        notes.push({
          time: beatDuration / 2 + swingOffset,
          frequency: rootFreq,
          duration: beatDuration * 0.35,
        });
        break;
      }

      case 'blues': {
        notes.push({
          time: 0,
          frequency: rootFreq,
          duration: beatDuration * 0.5,
        });
        const shuffleSwing = beatDuration * (2 / 3);
        notes.push({
          time: shuffleSwing,
          frequency: rootFreq,
          duration: beatDuration * 0.25,
        });
        break;
      }

      case 'arpeggio': {
        const chordTones = this.getChordTones(chord, baseOctave);
        const noteIndex = this.currentBeat % chordTones.length;
        notes.push({
          time: 0,
          frequency: chordTones[noteIndex]!,
          duration: beatDuration * 0.8,
        });
        break;
      }
    }

    return notes;
  }

  private getChordTones(chord: ResolvedChord, octave: number): number[] {
    const root = noteToFrequency(chord.root, octave);
    const thirdSemitones = chord.isMajor ? 4 : 3;
    const fifth = root * Math.pow(2, 7 / 12);
    const third = root * Math.pow(2, thirdSemitones / 12);
    return [root, third, fifth];
  }

  private playNote(frequency: number, startTime: number, duration: number): void {
    const instrumentConfig = INSTRUMENT_CONFIG[this.instrument];
    const { waveform, envelope } = instrumentConfig;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, startTime);

    const attackEnd = startTime + envelope.attack;
    const decayEnd = attackEnd + envelope.decay;
    const releaseStart = startTime + duration;
    const releaseEnd = releaseStart + envelope.release;

    gainNode.gain.linearRampToValueAtTime(1, attackEnd);
    gainNode.gain.linearRampToValueAtTime(envelope.sustain, decayEnd);
    gainNode.gain.setValueAtTime(envelope.sustain, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, releaseEnd);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(startTime);
    oscillator.stop(releaseEnd + 0.01);

    this.activeOscillators.add(oscillator);
    oscillator.onended = () => {
      this.activeOscillators.delete(oscillator);
    };
  }

  private advanceBeat(): void {
    const beatDuration = 60 / this.tempo;
    this.nextNoteTime += beatDuration;
    this.currentBeat++;

    if (this.currentBeat >= this.beatsPerChord) {
      this.currentBeat = 0;
      this.currentChordIndex = (this.currentChordIndex + 1) % this.resolvedChords.length;
    }
  }

  private updateBeatsPerChord(): void {
    const beatsPerBar = 4;
    this.beatsPerChord = beatsPerBar * this.bars;
  }

  private resolveChords(progression: string[]): ResolvedChord[] {
    if (progression.length === 0) {
      return resolveChordProgression(['I'], this.key);
    }
    return resolveChordProgression(progression, this.key);
  }
}
