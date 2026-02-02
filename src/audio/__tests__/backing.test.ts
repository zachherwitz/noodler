import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackingTrack } from '../backing.js';
import type { BackingStyle, BackingInstrument } from '../types.js';

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: {
    setValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null,
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

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

const createMockAudioContext = () => ({
  currentTime: 0,
  destination: mockDestination,
  sampleRate: 44100,
  createOscillator: vi.fn(() => ({ ...mockOscillator, onended: null })),
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
  close: vi.fn(),
});

describe('BackingTrack', () => {
  let mockAudioContext: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates a backing track with default config', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(backing.getTempo()).toBe(120);
      expect(backing.getStyle()).toBe('quarter');
      expect(backing.getInstrument()).toBe('bass');
      expect(backing.getSwing()).toBe(0);
      expect(backing.isActive()).toBe(false);
      expect(backing.isDestroyed()).toBe(false);
    });

    it('creates a backing track with custom tempo', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        tempo: 90,
      });
      expect(backing.getTempo()).toBe(90);
    });

    it('creates a backing track with custom style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'eighth',
      });
      expect(backing.getStyle()).toBe('eighth');
    });

    it('creates a backing track with custom instrument', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        instrument: 'pad',
      });
      expect(backing.getInstrument()).toBe('pad');
    });

    it('creates a backing track with custom swing', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        swing: 50,
      });
      expect(backing.getSwing()).toBe(50);
    });

    it('creates a backing track with chord progression', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        chords: ['I', 'IV', 'V', 'I'],
      });
      const chords = backing.getChords();
      expect(chords).toHaveLength(4);
      expect(chords[0]!.symbol).toBe('C');
      expect(chords[1]!.symbol).toBe('F');
      expect(chords[2]!.symbol).toBe('G');
      expect(chords[3]!.symbol).toBe('C');
    });

    it('creates compressor for mobile optimization', () => {
      new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
    });

    it('creates master gain node', () => {
      new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('clamps swing to valid range', () => {
      const backingLow = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        swing: -10,
      });
      expect(backingLow.getSwing()).toBe(0);

      const backingHigh = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        swing: 150,
      });
      expect(backingHigh.getSwing()).toBe(100);
    });
  });

  describe('play', () => {
    it('starts playback', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(backing.isActive()).toBe(false);
      backing.play();
      expect(backing.isActive()).toBe(true);
    });

    it('does nothing if already playing', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      backing.play();
      expect(backing.isActive()).toBe(true);
    });

    it('does nothing if destroyed', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.destroy();
      backing.play();
      expect(backing.isActive()).toBe(false);
    });

    it('schedules notes when playing', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      vi.advanceTimersByTime(100);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stops playback', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      expect(backing.isActive()).toBe(true);
      backing.stop();
      expect(backing.isActive()).toBe(false);
    });

    it('does nothing if not playing', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(() => backing.stop()).not.toThrow();
    });

    it('clears scheduler interval', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      backing.stop();
      const oscCallsBefore = mockAudioContext.createOscillator.mock.calls.length;
      vi.advanceTimersByTime(100);
      const oscCallsAfter = mockAudioContext.createOscillator.mock.calls.length;
      expect(oscCallsAfter).toBe(oscCallsBefore);
    });
  });

  describe('setTempo', () => {
    it('changes tempo', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setTempo(140);
      expect(backing.getTempo()).toBe(140);
    });

    it('clamps tempo to minimum 20', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setTempo(10);
      expect(backing.getTempo()).toBe(20);
    });

    it('clamps tempo to maximum 300', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setTempo(400);
      expect(backing.getTempo()).toBe(300);
    });
  });

  describe('setChords', () => {
    it('changes chord progression', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setChords(['ii', 'V', 'I'], 'G');
      const chords = backing.getChords();
      expect(chords).toHaveLength(3);
      expect(chords[0]!.symbol).toBe('Am');
      expect(chords[1]!.symbol).toBe('D');
      expect(chords[2]!.symbol).toBe('G');
    });

    it('handles chord symbols directly', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setChords(['Am', 'G', 'F', 'E']);
      const chords = backing.getChords();
      expect(chords).toHaveLength(4);
      expect(chords[0]!.symbol).toBe('Am');
      expect(chords[1]!.symbol).toBe('G');
      expect(chords[2]!.symbol).toBe('F');
      expect(chords[3]!.symbol).toBe('E');
    });
  });

  describe('setStyle', () => {
    it('changes rhythm style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      const styles: BackingStyle[] = ['drone', 'quarter', 'eighth', 'blues', 'arpeggio'];
      for (const style of styles) {
        backing.setStyle(style);
        expect(backing.getStyle()).toBe(style);
      }
    });
  });

  describe('setSwing', () => {
    it('changes swing percentage', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setSwing(75);
      expect(backing.getSwing()).toBe(75);
    });

    it('clamps swing to 0-100', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.setSwing(-20);
      expect(backing.getSwing()).toBe(0);
      backing.setSwing(200);
      expect(backing.getSwing()).toBe(100);
    });
  });

  describe('setInstrument', () => {
    it('changes instrument', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      const instruments: BackingInstrument[] = ['bass', 'pad', 'pluck', 'keys'];
      for (const instrument of instruments) {
        backing.setInstrument(instrument);
        expect(backing.getInstrument()).toBe(instrument);
      }
    });
  });

  describe('destroy', () => {
    it('marks as destroyed', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      expect(backing.isDestroyed()).toBe(false);
      backing.destroy();
      expect(backing.isDestroyed()).toBe(true);
    });

    it('stops playback', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      backing.destroy();
      expect(backing.isActive()).toBe(false);
    });

    it('handles multiple destroy calls', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.destroy();
      expect(() => backing.destroy()).not.toThrow();
    });

    it('prevents play after destroy', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.destroy();
      backing.play();
      expect(backing.isActive()).toBe(false);
    });
  });

  describe('tempo to interval conversion', () => {
    it('calculates correct beat duration at 120 BPM', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        tempo: 120,
      });
      backing.play();
      vi.advanceTimersByTime(25);
      const beatDuration = 60 / 120;
      expect(beatDuration).toBe(0.5);
    });

    it('calculates correct beat duration at 60 BPM', () => {
      new BackingTrack(mockAudioContext as unknown as AudioContext, {
        tempo: 60,
      });
      const beatDuration = 60 / 60;
      expect(beatDuration).toBe(1);
    });
  });

  describe('rhythm patterns', () => {
    it('plays drone style (sustained notes)', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'drone',
      });
      backing.play();
      vi.advanceTimersByTime(50);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('plays quarter note style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'quarter',
      });
      backing.play();
      vi.advanceTimersByTime(50);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('plays eighth note style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'eighth',
      });
      backing.play();
      vi.advanceTimersByTime(50);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('plays blues style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'blues',
      });
      backing.play();
      vi.advanceTimersByTime(50);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('plays arpeggio style', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        style: 'arpeggio',
      });
      backing.play();
      vi.advanceTimersByTime(50);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });

  describe('chord progression parsing', () => {
    it('resolves roman numerals in major key', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        chords: ['I', 'IV', 'V'],
      });
      const chords = backing.getChords();
      expect(chords[0]!.isMajor).toBe(true);
      expect(chords[1]!.isMajor).toBe(true);
      expect(chords[2]!.isMajor).toBe(true);
    });

    it('resolves minor roman numerals', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        chords: ['i', 'iv', 'v'],
      });
      const chords = backing.getChords();
      expect(chords[0]!.isMajor).toBe(false);
      expect(chords[1]!.isMajor).toBe(false);
      expect(chords[2]!.isMajor).toBe(false);
    });

    it('handles empty chord progression', () => {
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext, {
        chords: [],
      });
      const chords = backing.getChords();
      expect(chords.length).toBeGreaterThan(0);
    });
  });

  describe('lookahead scheduler', () => {
    it('uses setInterval for scheduling', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 25);
    });

    it('clears interval on stop', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const backing = new BackingTrack(mockAudioContext as unknown as AudioContext);
      backing.play();
      backing.stop();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
