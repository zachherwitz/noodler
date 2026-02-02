import { describe, it, expect } from 'vitest';
import {
  xOffsetToCents,
  PIXELS_PER_OCTAVE,
  CENTS_PER_OCTAVE,
  MAX_OCTAVE_OFFSET,
  DIRECT_THRESHOLD_PX,
  STEPPED_INTERVALS,
} from '../bend.js';

describe('bend constants', () => {
  it('has correct PIXELS_PER_OCTAVE', () => {
    expect(PIXELS_PER_OCTAVE).toBe(150);
  });

  it('has correct CENTS_PER_OCTAVE', () => {
    expect(CENTS_PER_OCTAVE).toBe(1200);
  });

  it('has correct MAX_OCTAVE_OFFSET', () => {
    expect(MAX_OCTAVE_OFFSET).toBe(1);
  });

  it('has correct DIRECT_THRESHOLD_PX', () => {
    expect(DIRECT_THRESHOLD_PX).toBe(50);
  });

  it('has correct STEPPED_INTERVALS', () => {
    expect(STEPPED_INTERVALS).toEqual([-700, -400, -200, 0, 200, 400, 700]);
  });
});

describe('xOffsetToCents - dynamic mode', () => {
  it('returns 0 for no offset', () => {
    expect(xOffsetToCents(0, 'dynamic')).toBe(0);
  });

  it('returns positive cents for positive offset', () => {
    expect(xOffsetToCents(75, 'dynamic')).toBe(600);
  });

  it('returns negative cents for negative offset', () => {
    expect(xOffsetToCents(-75, 'dynamic')).toBe(-600);
  });

  it('returns full octave for PIXELS_PER_OCTAVE offset', () => {
    expect(xOffsetToCents(150, 'dynamic')).toBe(1200);
    expect(xOffsetToCents(-150, 'dynamic')).toBe(-1200);
  });

  it('clamps to max octave for large positive offset', () => {
    expect(xOffsetToCents(300, 'dynamic')).toBe(1200);
    expect(xOffsetToCents(500, 'dynamic')).toBe(1200);
  });

  it('clamps to min octave for large negative offset', () => {
    expect(xOffsetToCents(-300, 'dynamic')).toBe(-1200);
    expect(xOffsetToCents(-500, 'dynamic')).toBe(-1200);
  });

  it('returns rounded values', () => {
    expect(xOffsetToCents(1, 'dynamic')).toBe(8);
    expect(xOffsetToCents(10, 'dynamic')).toBe(80);
  });
});

describe('xOffsetToCents - direct mode', () => {
  it('returns 0 for no offset', () => {
    expect(xOffsetToCents(0, 'direct')).toBe(0);
  });

  it('returns 0 within threshold', () => {
    expect(xOffsetToCents(25, 'direct')).toBe(0);
    expect(xOffsetToCents(-25, 'direct')).toBe(0);
    expect(xOffsetToCents(49, 'direct')).toBe(0);
    expect(xOffsetToCents(-49, 'direct')).toBe(0);
  });

  it('returns 0 at threshold boundary', () => {
    expect(xOffsetToCents(50, 'direct')).toBe(0);
    expect(xOffsetToCents(-50, 'direct')).toBe(0);
  });

  it('returns octave up past positive threshold', () => {
    expect(xOffsetToCents(51, 'direct')).toBe(1200);
    expect(xOffsetToCents(100, 'direct')).toBe(1200);
    expect(xOffsetToCents(500, 'direct')).toBe(1200);
  });

  it('returns octave down past negative threshold', () => {
    expect(xOffsetToCents(-51, 'direct')).toBe(-1200);
    expect(xOffsetToCents(-100, 'direct')).toBe(-1200);
    expect(xOffsetToCents(-500, 'direct')).toBe(-1200);
  });
});

describe('xOffsetToCents - stepped mode', () => {
  it('returns 0 for no offset', () => {
    expect(xOffsetToCents(0, 'stepped')).toBe(0);
  });

  it('snaps to 0 for small offsets', () => {
    expect(xOffsetToCents(10, 'stepped')).toBe(0);
    expect(xOffsetToCents(-10, 'stepped')).toBe(0);
  });

  it('snaps to 200 cents for offset around 200 cents', () => {
    const offset200 = (200 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offset200, 'stepped')).toBe(200);
  });

  it('snaps to -200 cents for negative offset', () => {
    const offsetNeg200 = (-200 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offsetNeg200, 'stepped')).toBe(-200);
  });

  it('snaps to 400 cents for offset around 400 cents', () => {
    const offset400 = (400 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offset400, 'stepped')).toBe(400);
  });

  it('snaps to 700 cents for offset around 700 cents', () => {
    const offset700 = (700 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offset700, 'stepped')).toBe(700);
  });

  it('clamps to max interval for large positive offset', () => {
    expect(xOffsetToCents(300, 'stepped')).toBe(700);
    expect(xOffsetToCents(500, 'stepped')).toBe(700);
  });

  it('clamps to min interval for large negative offset', () => {
    expect(xOffsetToCents(-300, 'stepped')).toBe(-700);
    expect(xOffsetToCents(-500, 'stepped')).toBe(-700);
  });

  it('snaps to nearest interval', () => {
    const offset250 = (250 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offset250, 'stepped')).toBe(200);

    const offset350 = (350 / CENTS_PER_OCTAVE) * PIXELS_PER_OCTAVE;
    expect(xOffsetToCents(offset350, 'stepped')).toBe(400);
  });
});

describe('xOffsetToCents - edge cases', () => {
  it('returns 0 for unknown mode', () => {
    expect(xOffsetToCents(100, 'unknown' as never)).toBe(0);
  });

  it('handles floating point offsets', () => {
    expect(xOffsetToCents(75.5, 'dynamic')).toBe(604);
    expect(xOffsetToCents(-75.5, 'dynamic')).toBe(-604);
  });

  it('handles very small offsets', () => {
    expect(xOffsetToCents(0.1, 'dynamic')).toBe(1);
    expect(xOffsetToCents(-0.1, 'dynamic')).toBe(-1);
  });
});
