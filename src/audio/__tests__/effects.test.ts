import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDelay,
  createDistortion,
  createVibrato,
  createFilter,
  createReverb,
} from '../effects.js';

const createMockAudioContext = () => ({
  currentTime: 0,
  sampleRate: 44100,
  createGain: vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createDelay: vi.fn(() => ({
    delayTime: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createWaveShaper: vi.fn(() => ({
    curve: null as Float32Array | null,
    oversample: '4x' as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: 'lowpass',
    frequency: { setValueAtTime: vi.fn() },
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
    getChannelData: vi.fn(() => new Float32Array(44100 * 2)),
  })),
});

describe('Effects', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createDelay', () => {
    it('creates delay effect with default config', () => {
      const effect = createDelay(mockCtx as unknown as AudioContext);

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
      expect(effect.cleanup).toBeInstanceOf(Function);
      expect(mockCtx.createDelay).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it('creates delay with custom config', () => {
      const effect = createDelay(mockCtx as unknown as AudioContext, {
        time: 0.5,
        feedback: 0.6,
        mix: 0.7,
      });

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
    });

    it('cleanup disconnects all nodes', () => {
      const effect = createDelay(mockCtx as unknown as AudioContext);
      effect.cleanup();

      const gainNodes = mockCtx.createGain.mock.results;
      for (const result of gainNodes) {
        expect(result.value.disconnect).toHaveBeenCalled();
      }
    });
  });

  describe('createDistortion', () => {
    it('creates distortion effect with default config', () => {
      const effect = createDistortion(mockCtx as unknown as AudioContext);

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
      expect(effect.cleanup).toBeInstanceOf(Function);
      expect(mockCtx.createWaveShaper).toHaveBeenCalled();
    });

    it('creates distortion with custom amount', () => {
      const effect = createDistortion(mockCtx as unknown as AudioContext, {
        amount: 80,
      });

      expect(effect.input).toBeDefined();
    });

    it('sets waveshaper curve', () => {
      createDistortion(mockCtx as unknown as AudioContext);

      const waveshaper = mockCtx.createWaveShaper.mock.results[0]!.value;
      expect(waveshaper.curve).not.toBeNull();
      expect(waveshaper.oversample).toBe('4x');
    });

    it('cleanup disconnects all nodes', () => {
      const effect = createDistortion(mockCtx as unknown as AudioContext);
      effect.cleanup();

      const waveshaper = mockCtx.createWaveShaper.mock.results[0]!.value;
      expect(waveshaper.disconnect).toHaveBeenCalled();
    });
  });

  describe('createVibrato', () => {
    it('creates vibrato effect with default config', () => {
      const effect = createVibrato(mockCtx as unknown as AudioContext);

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
      expect(effect.cleanup).toBeInstanceOf(Function);
      expect(effect.lfo).toBeDefined();
      expect(effect.lfoGain).toBeDefined();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('starts LFO oscillator', () => {
      createVibrato(mockCtx as unknown as AudioContext);

      const lfo = mockCtx.createOscillator.mock.results[0]!.value;
      expect(lfo.start).toHaveBeenCalled();
    });

    it('creates vibrato with custom config', () => {
      const effect = createVibrato(mockCtx as unknown as AudioContext, {
        rate: 8,
        depth: 50,
      });

      expect(effect.lfo).toBeDefined();
    });

    it('cleanup stops LFO oscillator', () => {
      const effect = createVibrato(mockCtx as unknown as AudioContext);
      effect.cleanup();

      const lfo = mockCtx.createOscillator.mock.results[0]!.value;
      expect(lfo.stop).toHaveBeenCalled();
      expect(lfo.disconnect).toHaveBeenCalled();
    });
  });

  describe('createFilter', () => {
    it('creates filter effect with default config', () => {
      const effect = createFilter(mockCtx as unknown as AudioContext);

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
      expect(effect.cleanup).toBeInstanceOf(Function);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('starts LFO for auto-wah', () => {
      createFilter(mockCtx as unknown as AudioContext);

      const lfo = mockCtx.createOscillator.mock.results[0]!.value;
      expect(lfo.start).toHaveBeenCalled();
    });

    it('creates filter with custom config', () => {
      const effect = createFilter(mockCtx as unknown as AudioContext, {
        type: 'highpass',
        frequency: 2000,
        Q: 10,
        lfoRate: 4,
        lfoDepth: 1000,
      });

      expect(effect.input).toBeDefined();
    });

    it('cleanup stops LFO and disconnects nodes', () => {
      const effect = createFilter(mockCtx as unknown as AudioContext);
      effect.cleanup();

      const lfo = mockCtx.createOscillator.mock.results[0]!.value;
      expect(lfo.stop).toHaveBeenCalled();
      expect(lfo.disconnect).toHaveBeenCalled();

      const filter = mockCtx.createBiquadFilter.mock.results[0]!.value;
      expect(filter.disconnect).toHaveBeenCalled();
    });
  });

  describe('createReverb', () => {
    it('creates reverb effect with default config', () => {
      const effect = createReverb(mockCtx as unknown as AudioContext);

      expect(effect.input).toBeDefined();
      expect(effect.output).toBeDefined();
      expect(effect.cleanup).toBeInstanceOf(Function);
      expect(mockCtx.createConvolver).toHaveBeenCalled();
      expect(mockCtx.createBuffer).toHaveBeenCalled();
    });

    it('creates reverb with custom config', () => {
      const effect = createReverb(mockCtx as unknown as AudioContext, {
        decay: 3,
        mix: 0.5,
      });

      expect(effect.input).toBeDefined();
    });

    it('cleanup disconnects all nodes', () => {
      const effect = createReverb(mockCtx as unknown as AudioContext);
      effect.cleanup();

      const convolver = mockCtx.createConvolver.mock.results[0]!.value;
      expect(convolver.disconnect).toHaveBeenCalled();
    });
  });
});
