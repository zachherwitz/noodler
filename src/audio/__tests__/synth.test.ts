import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Synth } from '../synth.js';
import type { OscillatorType, SynthConfig } from '../types.js';

// Mock Web Audio API
const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: {
    setValueAtTime: vi.fn(),
  },
  detune: {
    setValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockCompressor = {
  threshold: { setValueAtTime: vi.fn() },
  knee: { setValueAtTime: vi.fn() },
  ratio: { setValueAtTime: vi.fn() },
  attack: { setValueAtTime: vi.fn() },
  release: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockDestination = {};

const createMockAudioContext = () => ({
  currentTime: 0,
  destination: mockDestination,
  sampleRate: 44100,
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createDynamicsCompressor: vi.fn(() => ({ ...mockCompressor })),
  createDelay: vi.fn(() => ({
    delayTime: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createWaveShaper: vi.fn(() => ({
    curve: null,
    oversample: '4x',
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: 'lowpass',
    frequency: { setValueAtTime: vi.fn(), connect: vi.fn() },
    Q: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createConvolver: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(44100)),
  })),
  close: vi.fn(),
});

describe('Synth', () => {
  let mockAudioContext: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => mockAudioContext)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('creates a synth with default config', () => {
      const synth = new Synth();
      expect(synth.getWaveform()).toBe('sine');
      expect(synth.getVolume()).toBe(0.5);
      expect(synth.isDestroyed()).toBe(false);
    });

    it('creates a synth with custom waveform', () => {
      const synth = new Synth({ waveform: 'sawtooth' });
      expect(synth.getWaveform()).toBe('sawtooth');
    });

    it('creates a synth with custom volume', () => {
      const synth = new Synth({ volume: 0.8 });
      expect(synth.getVolume()).toBe(0.8);
    });

    it('creates a synth with all options', () => {
      const config: SynthConfig = {
        waveform: 'square',
        volume: 0.3,
        envelope: {
          attack: 0.05,
          decay: 0.2,
          sustain: 0.6,
          release: 0.5,
        },
      };
      const synth = new Synth(config);
      expect(synth.getWaveform()).toBe('square');
      expect(synth.getVolume()).toBe(0.3);
    });
  });

  describe('volume clamping', () => {
    it('clamps volume below 0 to 0', () => {
      const synth = new Synth({ volume: -0.5 });
      expect(synth.getVolume()).toBe(0);
    });

    it('clamps volume above 1 to 1', () => {
      const synth = new Synth({ volume: 1.5 });
      expect(synth.getVolume()).toBe(1);
    });

    it('accepts volume at boundaries', () => {
      const synthZero = new Synth({ volume: 0 });
      expect(synthZero.getVolume()).toBe(0);

      const synthOne = new Synth({ volume: 1 });
      expect(synthOne.getVolume()).toBe(1);
    });
  });

  describe('lazy AudioContext initialization', () => {
    it('does not create AudioContext on construction', () => {
      new Synth();
      expect(AudioContext).not.toHaveBeenCalled();
    });

    it('creates AudioContext on first noteOn', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });

    it('does not create multiple AudioContexts', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.noteOn(1, 880);
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('noteOn', () => {
    it('creates oscillator and gain nodes', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('tracks active notes', () => {
      const synth = new Synth();
      expect(synth.getActiveNoteCount()).toBe(0);
      synth.noteOn(0, 440);
      expect(synth.getActiveNoteCount()).toBe(1);
      synth.noteOn(1, 880);
      expect(synth.getActiveNoteCount()).toBe(2);
    });

    it('replaces note at same index', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.noteOn(0, 880);
      expect(synth.getActiveNoteCount()).toBe(1);
    });

    it('clamps frequency to minimum 20Hz', () => {
      const synth = new Synth();
      synth.noteOn(0, 10);
      const osc = mockAudioContext.createOscillator();
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(
        20,
        expect.any(Number)
      );
    });

    it('clamps frequency to maximum 20000Hz', () => {
      const synth = new Synth();
      synth.noteOn(0, 25000);
      const osc = mockAudioContext.createOscillator();
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(
        20000,
        expect.any(Number)
      );
    });

    it('does nothing if synth is destroyed', () => {
      const synth = new Synth();
      synth.destroy();
      synth.noteOn(0, 440);
      expect(synth.getActiveNoteCount()).toBe(0);
    });
  });

  describe('noteOff', () => {
    it('removes note from active notes', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(synth.getActiveNoteCount()).toBe(1);
      synth.noteOff(0);
      expect(synth.getActiveNoteCount()).toBe(0);
    });

    it('handles noteOff for non-existent note gracefully', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(() => synth.noteOff(999)).not.toThrow();
    });

    it('does nothing if AudioContext not initialized', () => {
      const synth = new Synth();
      expect(() => synth.noteOff(0)).not.toThrow();
    });
  });

  describe('stopAll', () => {
    it('stops all active notes', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.noteOn(1, 880);
      synth.noteOn(2, 1760);
      expect(synth.getActiveNoteCount()).toBe(3);
      synth.stopAll();
      expect(synth.getActiveNoteCount()).toBe(0);
    });

    it('handles empty active notes', () => {
      const synth = new Synth();
      expect(() => synth.stopAll()).not.toThrow();
    });
  });

  describe('setWaveform', () => {
    it('changes waveform type', () => {
      const synth = new Synth({ waveform: 'sine' });
      expect(synth.getWaveform()).toBe('sine');
      synth.setWaveform('square');
      expect(synth.getWaveform()).toBe('square');
      synth.setWaveform('sawtooth');
      expect(synth.getWaveform()).toBe('sawtooth');
      synth.setWaveform('triangle');
      expect(synth.getWaveform()).toBe('triangle');
    });
  });

  describe('setVolume', () => {
    it('changes volume level', () => {
      const synth = new Synth({ volume: 0.5 });
      synth.setVolume(0.8);
      expect(synth.getVolume()).toBe(0.8);
    });

    it('clamps volume to 0-1 range', () => {
      const synth = new Synth();
      synth.setVolume(-1);
      expect(synth.getVolume()).toBe(0);
      synth.setVolume(2);
      expect(synth.getVolume()).toBe(1);
    });

    it('updates master gain when AudioContext exists', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.setVolume(0.7);
      expect(synth.getVolume()).toBe(0.7);
    });
  });

  describe('bend', () => {
    it('applies pitch bend to active note', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(() => synth.bend(0, 100)).not.toThrow();
    });

    it('handles bend for non-existent note gracefully', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(() => synth.bend(999, 100)).not.toThrow();
    });

    it('handles bend before AudioContext initialized', () => {
      const synth = new Synth();
      expect(() => synth.bend(0, 100)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('marks synth as destroyed', () => {
      const synth = new Synth();
      expect(synth.isDestroyed()).toBe(false);
      synth.destroy();
      expect(synth.isDestroyed()).toBe(true);
    });

    it('stops all active notes', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.noteOn(1, 880);
      expect(synth.getActiveNoteCount()).toBe(2);
      synth.destroy();
      expect(synth.getActiveNoteCount()).toBe(0);
    });

    it('closes AudioContext', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.destroy();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('handles destroy without AudioContext', () => {
      const synth = new Synth();
      expect(() => synth.destroy()).not.toThrow();
    });

    it('handles multiple destroy calls gracefully', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      synth.destroy();
      expect(() => synth.destroy()).not.toThrow();
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('signal chain', () => {
    it('creates compressor for mobile optimization', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
    });

    it('creates master gain node', () => {
      const synth = new Synth();
      synth.noteOn(0, 440);
      // createGain is called twice: once for master, once for note envelope
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
  });

  describe('integration with Scale API', () => {
    it('accepts Note-like objects with index and frequency', () => {
      const synth = new Synth();
      const note = { name: 'A4', frequency: 440, index: 0 };
      synth.noteOn(note.index, note.frequency);
      expect(synth.getActiveNoteCount()).toBe(1);
      synth.noteOff(note.index);
      expect(synth.getActiveNoteCount()).toBe(0);
    });

    it('handles multiple notes from a scale', () => {
      const synth = new Synth();
      const notes = [
        { name: 'A4', frequency: 440, index: 0 },
        { name: 'B4', frequency: 493.88, index: 1 },
        { name: 'C#5', frequency: 554.37, index: 2 },
      ];
      notes.forEach((note) => synth.noteOn(note.index, note.frequency));
      expect(synth.getActiveNoteCount()).toBe(3);
    });
  });

  describe('effects', () => {
    describe('getActiveEffects', () => {
      it('returns default effects state (all disabled)', () => {
        const synth = new Synth();
        const effects = synth.getActiveEffects();
        expect(effects).toEqual({
          delay: false,
          distortion: false,
          vibrato: false,
          filter: false,
          reverb: false,
        });
      });
    });

    describe('toggleDelay', () => {
      it('enables delay effect', () => {
        const synth = new Synth();
        synth.toggleDelay(true);
        expect(synth.getActiveEffects().delay).toBe(true);
      });

      it('disables delay effect', () => {
        const synth = new Synth();
        synth.toggleDelay(true);
        synth.toggleDelay(false);
        expect(synth.getActiveEffects().delay).toBe(false);
      });

      it('does not rebuild chain if state unchanged', () => {
        const synth = new Synth();
        synth.toggleDelay(false);
        expect(synth.getActiveEffects().delay).toBe(false);
      });
    });

    describe('toggleDistortion', () => {
      it('enables distortion effect', () => {
        const synth = new Synth();
        synth.toggleDistortion(true);
        expect(synth.getActiveEffects().distortion).toBe(true);
      });

      it('disables distortion effect', () => {
        const synth = new Synth();
        synth.toggleDistortion(true);
        synth.toggleDistortion(false);
        expect(synth.getActiveEffects().distortion).toBe(false);
      });
    });

    describe('toggleVibrato', () => {
      it('enables vibrato effect', () => {
        const synth = new Synth();
        synth.toggleVibrato(true);
        expect(synth.getActiveEffects().vibrato).toBe(true);
      });

      it('disables vibrato effect', () => {
        const synth = new Synth();
        synth.toggleVibrato(true);
        synth.toggleVibrato(false);
        expect(synth.getActiveEffects().vibrato).toBe(false);
      });
    });

    describe('toggleFilter', () => {
      it('enables filter effect', () => {
        const synth = new Synth();
        synth.toggleFilter(true);
        expect(synth.getActiveEffects().filter).toBe(true);
      });

      it('disables filter effect', () => {
        const synth = new Synth();
        synth.toggleFilter(true);
        synth.toggleFilter(false);
        expect(synth.getActiveEffects().filter).toBe(false);
      });
    });

    describe('toggleReverb', () => {
      it('enables reverb effect', () => {
        const synth = new Synth();
        synth.toggleReverb(true);
        expect(synth.getActiveEffects().reverb).toBe(true);
      });

      it('disables reverb effect', () => {
        const synth = new Synth();
        synth.toggleReverb(true);
        synth.toggleReverb(false);
        expect(synth.getActiveEffects().reverb).toBe(false);
      });
    });

    describe('effect chain with AudioContext', () => {
      it('creates effect nodes when AudioContext is active', () => {
        const synth = new Synth();
        synth.noteOn(0, 440);
        synth.toggleDelay(true);
        expect(mockAudioContext.createDelay).toHaveBeenCalled();
      });

      it('creates multiple effects in correct order', () => {
        const synth = new Synth();
        synth.noteOn(0, 440);
        synth.toggleDistortion(true);
        synth.toggleFilter(true);
        synth.toggleDelay(true);
        synth.toggleReverb(true);

        expect(mockAudioContext.createWaveShaper).toHaveBeenCalled();
        expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
        expect(mockAudioContext.createDelay).toHaveBeenCalled();
        expect(mockAudioContext.createConvolver).toHaveBeenCalled();
      });
    });
  });

  describe('octave shift', () => {
    describe('setOctaveShift', () => {
      it('sets octave shift within valid range', () => {
        const synth = new Synth();
        synth.setOctaveShift(1);
        expect(synth.getOctaveShift()).toBe(1);
      });

      it('clamps octave shift to minimum -2', () => {
        const synth = new Synth();
        synth.setOctaveShift(-5);
        expect(synth.getOctaveShift()).toBe(-2);
      });

      it('clamps octave shift to maximum 2', () => {
        const synth = new Synth();
        synth.setOctaveShift(5);
        expect(synth.getOctaveShift()).toBe(2);
      });

      it('defaults to 0', () => {
        const synth = new Synth();
        expect(synth.getOctaveShift()).toBe(0);
      });
    });
  });
});
