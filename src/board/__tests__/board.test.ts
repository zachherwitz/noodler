import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseScaleAttribute,
  validateWaveform,
  validateTheme,
  parseEffectsAttribute,
  validateNotesCount,
  getNoteIndexFromY,
  getBendFromX,
  triggerHaptic,
} from '../utils.js';

describe('parseScaleAttribute', () => {
  describe('valid inputs', () => {
    it('parses note with m suffix as minor', () => {
      const result = parseScaleAttribute('Am');
      expect(result).toEqual({
        root: 'A',
        type: 'minor',
        octave: 4,
      });
    });

    it('parses note with lowercase m as minor', () => {
      const result = parseScaleAttribute('Em');
      expect(result).toEqual({
        root: 'E',
        type: 'minor',
        octave: 4,
      });
    });

    it('parses note with scale type', () => {
      const result = parseScaleAttribute('A pentatonic-minor');
      expect(result).toEqual({
        root: 'A',
        type: 'pentatonic-minor',
        octave: 4,
      });
    });

    it('parses major scale', () => {
      const result = parseScaleAttribute('G major');
      expect(result).toEqual({
        root: 'G',
        type: 'major',
        octave: 4,
      });
    });

    it('parses sharp notes', () => {
      const result = parseScaleAttribute('C# pentatonic-major');
      expect(result).toEqual({
        root: 'C#',
        type: 'pentatonic-major',
        octave: 4,
      });
    });

    it('parses flat notes by converting to sharps', () => {
      const result = parseScaleAttribute('Db major');
      expect(result).toEqual({
        root: 'C#',
        type: 'major',
        octave: 4,
      });
    });

    it('parses blues scale', () => {
      const result = parseScaleAttribute('E blues');
      expect(result).toEqual({
        root: 'E',
        type: 'blues',
        octave: 4,
      });
    });

    it('parses dorian scale', () => {
      const result = parseScaleAttribute('D dorian');
      expect(result).toEqual({
        root: 'D',
        type: 'dorian',
        octave: 4,
      });
    });

    it('parses mixolydian scale', () => {
      const result = parseScaleAttribute('A mixolydian');
      expect(result).toEqual({
        root: 'A',
        type: 'mixolydian',
        octave: 4,
      });
    });

    it('defaults to pentatonic-minor with just note', () => {
      const result = parseScaleAttribute('A');
      expect(result).toEqual({
        root: 'A',
        type: 'pentatonic-minor',
        octave: 4,
      });
    });

    it('handles lowercase note names', () => {
      const result = parseScaleAttribute('a minor');
      expect(result).toEqual({
        root: 'A',
        type: 'minor',
        octave: 4,
      });
    });

    it('handles extra whitespace', () => {
      const result = parseScaleAttribute('  A   pentatonic-minor  ');
      expect(result).toEqual({
        root: 'A',
        type: 'pentatonic-minor',
        octave: 4,
      });
    });

    it('parses min as minor', () => {
      const result = parseScaleAttribute('A min');
      expect(result).toEqual({
        root: 'A',
        type: 'minor',
        octave: 4,
      });
    });

    it('parses maj as major', () => {
      const result = parseScaleAttribute('A maj');
      expect(result).toEqual({
        root: 'A',
        type: 'major',
        octave: 4,
      });
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseScaleAttribute('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseScaleAttribute('   ')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseScaleAttribute(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseScaleAttribute(undefined as unknown as string)).toBeNull();
    });

    it('returns null for invalid note', () => {
      expect(parseScaleAttribute('X major')).toBeNull();
    });

    it('returns null for invalid scale type', () => {
      expect(parseScaleAttribute('A invalid-scale')).toBeNull();
    });

    it('returns null for number input', () => {
      expect(parseScaleAttribute(123 as unknown as string)).toBeNull();
    });
  });
});

describe('validateWaveform', () => {
  it('returns valid waveforms unchanged', () => {
    expect(validateWaveform('sine')).toBe('sine');
    expect(validateWaveform('square')).toBe('square');
    expect(validateWaveform('sawtooth')).toBe('sawtooth');
    expect(validateWaveform('triangle')).toBe('triangle');
  });

  it('returns sine for null', () => {
    expect(validateWaveform(null)).toBe('sine');
  });

  it('returns sine for invalid waveform', () => {
    expect(validateWaveform('invalid')).toBe('sine');
  });

  it('returns sine for empty string', () => {
    expect(validateWaveform('')).toBe('sine');
  });
});

describe('validateTheme', () => {
  it('returns valid themes unchanged', () => {
    expect(validateTheme('dark')).toBe('dark');
    expect(validateTheme('light')).toBe('light');
    expect(validateTheme('colorful')).toBe('colorful');
  });

  it('returns dark for null', () => {
    expect(validateTheme(null)).toBe('dark');
  });

  it('returns dark for invalid theme', () => {
    expect(validateTheme('invalid')).toBe('dark');
  });

  it('returns dark for empty string', () => {
    expect(validateTheme('')).toBe('dark');
  });
});

describe('parseEffectsAttribute', () => {
  it('parses comma-separated effects', () => {
    expect(parseEffectsAttribute('delay,vibrato')).toEqual(['delay', 'vibrato']);
  });

  it('filters out invalid effects', () => {
    expect(parseEffectsAttribute('delay,invalid,vibrato')).toEqual(['delay', 'vibrato']);
  });

  it('handles all valid effects', () => {
    expect(parseEffectsAttribute('delay,distortion,vibrato,filter,reverb')).toEqual([
      'delay',
      'distortion',
      'vibrato',
      'filter',
      'reverb',
    ]);
  });

  it('returns empty array for null', () => {
    expect(parseEffectsAttribute(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseEffectsAttribute('')).toEqual([]);
  });

  it('trims whitespace', () => {
    expect(parseEffectsAttribute(' delay , vibrato ')).toEqual(['delay', 'vibrato']);
  });

  it('handles case insensitivity', () => {
    expect(parseEffectsAttribute('DELAY,Vibrato')).toEqual(['delay', 'vibrato']);
  });
});

describe('validateNotesCount', () => {
  it('returns default for null', () => {
    expect(validateNotesCount(null, 5)).toBe(5);
  });

  it('returns parsed number for valid string', () => {
    expect(validateNotesCount('8', 5)).toBe(8);
  });

  it('returns default for invalid string', () => {
    expect(validateNotesCount('abc', 5)).toBe(5);
  });

  it('returns default for negative number', () => {
    expect(validateNotesCount('-1', 5)).toBe(5);
  });

  it('returns default for zero', () => {
    expect(validateNotesCount('0', 5)).toBe(5);
  });

  it('clamps to maximum 24', () => {
    expect(validateNotesCount('50', 5)).toBe(24);
  });

  it('allows values up to 24', () => {
    expect(validateNotesCount('24', 5)).toBe(24);
  });
});

describe('getNoteIndexFromY', () => {
  it('returns correct index for evenly divided zones', () => {
    const height = 100;
    const noteCount = 5;

    expect(getNoteIndexFromY(0, height, noteCount)).toBe(0);
    expect(getNoteIndexFromY(19, height, noteCount)).toBe(0);
    expect(getNoteIndexFromY(20, height, noteCount)).toBe(1);
    expect(getNoteIndexFromY(40, height, noteCount)).toBe(2);
    expect(getNoteIndexFromY(60, height, noteCount)).toBe(3);
    expect(getNoteIndexFromY(80, height, noteCount)).toBe(4);
  });

  it('clamps to minimum 0', () => {
    expect(getNoteIndexFromY(-10, 100, 5)).toBe(0);
  });

  it('clamps to maximum noteCount - 1', () => {
    expect(getNoteIndexFromY(150, 100, 5)).toBe(4);
  });

  it('returns 0 for zero height', () => {
    expect(getNoteIndexFromY(50, 0, 5)).toBe(0);
  });

  it('returns 0 for zero note count', () => {
    expect(getNoteIndexFromY(50, 100, 0)).toBe(0);
  });
});

describe('getBendFromX', () => {
  it('returns 0 at center', () => {
    expect(getBendFromX(50, 100)).toBe(0);
  });

  it('returns positive cents for right of center', () => {
    const result = getBendFromX(100, 100);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(200);
  });

  it('returns negative cents for left of center', () => {
    const result = getBendFromX(0, 100);
    expect(result).toBeLessThan(0);
    expect(result).toBe(-200);
  });

  it('scales with custom max cents', () => {
    expect(getBendFromX(100, 100, 100)).toBe(100);
    expect(getBendFromX(0, 100, 100)).toBe(-100);
  });

  it('returns 0 for zero width', () => {
    expect(getBendFromX(50, 0)).toBe(0);
  });

  it('returns rounded values', () => {
    const result = getBendFromX(75, 100, 200);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('triggerHaptic', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    if (originalNavigator) {
      vi.stubGlobal('navigator', originalNavigator);
    } else {
      vi.unstubAllGlobals();
    }
  });

  it('calls navigator.vibrate when available', () => {
    const mockVibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate: mockVibrate });

    triggerHaptic(15);
    expect(mockVibrate).toHaveBeenCalledWith(15);
  });

  it('uses default duration of 10ms', () => {
    const mockVibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate: mockVibrate });

    triggerHaptic();
    expect(mockVibrate).toHaveBeenCalledWith(10);
  });

  it('handles missing vibrate gracefully', () => {
    vi.stubGlobal('navigator', {});
    expect(() => triggerHaptic()).not.toThrow();
  });

  it('handles missing navigator gracefully', () => {
    vi.stubGlobal('navigator', undefined);
    expect(() => triggerHaptic()).not.toThrow();
  });
});

describe('styles', () => {
  describe('createBoardStyles', () => {
    it('creates a CSSStyleSheet', async () => {
      const mockSheet = {
        replaceSync: vi.fn(),
      };
      vi.stubGlobal('CSSStyleSheet', vi.fn(() => mockSheet));

      const { createBoardStyles } = await import('../styles.js');
      const sheet = createBoardStyles();

      expect(CSSStyleSheet).toHaveBeenCalled();
      expect(mockSheet.replaceSync).toHaveBeenCalled();
      expect(sheet).toBe(mockSheet);

      vi.unstubAllGlobals();
    });
  });

  describe('createKeyStyles', () => {
    it('creates a CSSStyleSheet', async () => {
      const mockSheet = {
        replaceSync: vi.fn(),
      };
      vi.stubGlobal('CSSStyleSheet', vi.fn(() => mockSheet));

      const { createKeyStyles } = await import('../styles.js');
      const sheet = createKeyStyles();

      expect(CSSStyleSheet).toHaveBeenCalled();
      expect(mockSheet.replaceSync).toHaveBeenCalled();
      expect(sheet).toBe(mockSheet);

      vi.unstubAllGlobals();
    });
  });

  describe('getNoteColor', () => {
    it('returns hsl color based on index', async () => {
      const { getNoteColor } = await import('../styles.js');

      const color = getNoteColor(0, 12);
      expect(color).toBe('hsl(0, 70%, 50%)');

      const color2 = getNoteColor(6, 12);
      expect(color2).toBe('hsl(180, 70%, 50%)');
    });
  });
});

describe('component registration', () => {
  let mockCustomElements: {
    get: ReturnType<typeof vi.fn>;
    define: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCustomElements = {
      get: vi.fn(),
      define: vi.fn(),
    };
    vi.stubGlobal('customElements', mockCustomElements);
    vi.stubGlobal('CSSStyleSheet', vi.fn(() => ({
      replaceSync: vi.fn(),
    })));
    vi.stubGlobal('HTMLElement', class {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('registerNoodlerKey only registers if not defined', async () => {
    mockCustomElements.get.mockReturnValue(undefined);

    const { registerNoodlerKey } = await import('../noodler-key.js');
    registerNoodlerKey();

    expect(mockCustomElements.get).toHaveBeenCalledWith('noodler-key');
    expect(mockCustomElements.define).toHaveBeenCalledWith('noodler-key', expect.any(Function));
  });

  it('registerNoodlerKey skips if already defined', async () => {
    mockCustomElements.get.mockReturnValue({});

    const { registerNoodlerKey } = await import('../noodler-key.js');
    registerNoodlerKey();

    expect(mockCustomElements.get).toHaveBeenCalledWith('noodler-key');
    expect(mockCustomElements.define).not.toHaveBeenCalled();
  });
});
